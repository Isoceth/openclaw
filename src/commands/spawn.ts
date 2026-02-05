import crypto from "node:crypto";
import type { RuntimeEnv } from "../runtime.js";
import {
  listAgentIds,
  resolveAgentConfig,
  resolveDefaultAgentId,
  resolveAgentDir,
} from "../agents/agent-scope.js";
import { AGENT_LANE_SUBAGENT } from "../agents/lanes.js";
import { buildSubagentSystemPrompt } from "../agents/subagent-announce.js";
import { resolveAgentTimeoutMs } from "../agents/timeout.js";
import { formatThinkingLevels, normalizeThinkLevel } from "../auto-reply/thinking.js";
import { formatCliCommand } from "../cli/command-format.js";
import { loadConfig } from "../config/config.js";
import { resolveAgentMainSessionKey } from "../config/sessions/main-session.js";
import { resolveStorePath } from "../config/sessions/paths.js";
import { loadSessionStore } from "../config/sessions/store.js";
import { callGateway } from "../gateway/call.js";
import { normalizeAgentId } from "../routing/session-key.js";
import { deliveryContextFromSession } from "../utils/delivery-context.js";

// SpawnCliOpts defines all CLI options for the spawn command.
export type SpawnCliOpts = {
  task?: string;
  message?: string;
  agent?: string;
  deliver?: boolean;
  model?: string;
  thinking?: string;
  timeout?: string;
  json?: boolean;
};

// TODO Handle stdin read errors [8big]
// tags: error-handling, review:branch-feature-spawn-command
// Stdin read can fail if the stream is closed or there are read errors.
// Currently errors propagate as unhandled promise rejections without context.
// ---
// readStdin reads all data from stdin and returns it as a UTF-8 string.
async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
  }
  return Buffer.concat(chunks).toString("utf8");
}

// resolveTaskInput determines the task body from the available input sources.
// Validates that exactly one input method is used.
async function resolveTaskInput(opts: SpawnCliOpts): Promise<string> {
  const hasPositional = opts.task !== undefined;
  const hasMessage = opts.message !== undefined;

  // Check for conflicting inputs.
  if (hasPositional && hasMessage) {
    throw new Error("Cannot specify both positional task argument and --message flag");
  }

  // If task is "-", read from stdin.
  if (opts.task === "-") {
    const stdinContent = await readStdin();
    if (!stdinContent.trim()) {
      throw new Error("No input received from stdin");
    }
    return stdinContent.trim();
  }

  // Return positional task if provided.
  if (hasPositional) {
    return opts.task as string;
  }

  // Return --message if provided.
  if (hasMessage) {
    return opts.message as string;
  }

  // No input provided.
  throw new Error(
    `No task specified. Provide a task as an argument, via --message, or from stdin using "-"`,
  );
}

// resolveSpawnAgent resolves which agent to use for spawning a subagent.
// If opts.agent is provided, validates it exists in the configuration.
// If no agent specified, returns the default agent.
// Throws helpful errors if agent not found or no agents configured.
function resolveSpawnAgent(
  opts: SpawnCliOpts,
  cfg: ReturnType<typeof loadConfig>,
): {
  agentId: string;
  agentConfig: ReturnType<typeof resolveAgentConfig>;
} {
  const agentIdRaw = opts.agent?.trim();
  const knownAgents = listAgentIds(cfg);

  // If no agents configured, show helpful guidance.
  if (knownAgents.length === 0) {
    throw new Error(
      `No agents configured. Use "${formatCliCommand("openclaw agents add")}" to configure an agent.`,
    );
  }

  // If agent specified, validate it exists.
  if (agentIdRaw) {
    const agentId = normalizeAgentId(agentIdRaw);
    if (!knownAgents.includes(agentId)) {
      const availableList = knownAgents.map((id) => `  - ${id}`).join("\n");
      throw new Error(
        `Unknown agent id "${agentIdRaw}".\n\nAvailable agents:\n${availableList}\n\nUse "${formatCliCommand("openclaw agents list")}" for more details.`,
      );
    }
    const agentConfig = resolveAgentConfig(cfg, agentId);
    return { agentId, agentConfig };
  }

  // No agent specified, use default.
  const agentId = resolveDefaultAgentId(cfg);
  const agentConfig = resolveAgentConfig(cfg, agentId);
  return { agentId, agentConfig };
}

// SpawnResult is returned by spawnViaGateway for use by wait/result retrieval.
type SpawnResult = {
  runId: string;
  sessionKey: string;
};

/**
 * spawnViaGateway spawns a subagent via the gateway RPC.
 * Generates a unique session key, builds the subagent system prompt,
 * and calls the gateway agent RPC with lane: "subagent".
 */
async function spawnViaGateway(params: {
  agentId: string;
  task: string;
  model?: string;
  thinking?: string;
  timeout?: number;
}): Promise<SpawnResult> {
  const sessionKey = `agent:${params.agentId}:spawn:${crypto.randomUUID()}`;
  const idempotencyKey = crypto.randomUUID();

  // TODO Handle session.patch RPC failure [l5c4]
  // tags: error-handling, review:branch-feature-spawn-command
  // If session.patch fails (invalid model, gateway error), the error propagates
  // without context about which model was requested or that this was the patch step.
  // User sees generic RPC error instead of actionable message.
  // ---
  // Patch session with model override if provided.
  if (params.model) {
    await callGateway({
      method: "sessions.patch",
      params: { key: sessionKey, model: params.model },
      timeoutMs: 10_000,
    });
  }

  // Build the subagent system prompt.
  const systemPrompt = buildSubagentSystemPrompt({
    childSessionKey: sessionKey,
    task: params.task,
  });

  // Normalize thinking level if provided. Validation happens in spawnCommand.
  const thinking = params.thinking ? normalizeThinkLevel(params.thinking) : undefined;

  // TODO Handle agent spawn RPC failure [47dp]
  // tags: error-handling, review:branch-feature-spawn-command
  // If agent RPC fails (no agents available, gateway queue full, auth error),
  // error propagates without actionable context. User sees generic RPC error
  // instead of clear message like "No agents available" or "Gateway overloaded".
  // ---
  // Call gateway agent RPC.
  const response = await callGateway<{ runId: string }>({
    method: "agent",
    params: {
      message: params.task,
      sessionKey,
      idempotencyKey,
      deliver: false,
      lane: AGENT_LANE_SUBAGENT,
      extraSystemPrompt: systemPrompt,
      thinking,
      timeout: params.timeout,
    },
    timeoutMs: 10_000,
  });

  const runId =
    typeof response?.runId === "string" && response.runId ? response.runId : idempotencyKey;

  return { runId, sessionKey };
}

/**
 * WaitResult contains the outcome of waiting for a subagent to complete.
 */
type WaitResult = {
  status: "ok" | "error" | "timeout";
  response?: string;
  error?: string;
  startedAt?: number;
  endedAt?: number;
};

/**
 * waitForSpawnCompletion waits for a spawned subagent to complete and retrieves
 * the final assistant reply from the session.
 *
 * Uses the agent.wait RPC to poll for completion, then calls readLatestAssistantReply
 * to fetch the final response text from chat.history.
 */
async function waitForSpawnCompletion(params: {
  runId: string;
  sessionKey: string;
  timeoutMs: number;
}): Promise<WaitResult> {
  const waitMs = Math.min(params.timeoutMs, 60_000);

  // TODO Handle agent.wait RPC failure [tp3y]
  // tags: error-handling, review:branch-feature-spawn-command
  // If agent.wait RPC fails (gateway disconnected, runId not found), error
  // propagates without context. User won't know if this is a transient network
  // issue vs. the run never started. Should provide session key for recovery.
  // ---
  // Wait for the agent run to complete.
  const wait = await callGateway<{
    status?: string;
    startedAt?: number;
    endedAt?: number;
    error?: string;
  }>({
    method: "agent.wait",
    params: {
      runId: params.runId,
      timeoutMs: waitMs,
    },
    timeoutMs: waitMs + 2000,
  });

  const status =
    wait?.status === "ok" || wait?.status === "error" || wait?.status === "timeout"
      ? wait.status
      : "error";
  const error = typeof wait?.error === "string" ? wait.error : undefined;
  const startedAt = typeof wait?.startedAt === "number" ? wait.startedAt : undefined;
  const endedAt = typeof wait?.endedAt === "number" ? wait.endedAt : undefined;

  // TODO Handle chat.history RPC failure when retrieving response
  // tags: error-handling, review:branch-feature-spawn-command
  // If readLatestAssistantReply fails (chat.history RPC error), the error
  // propagates without context. User won't know if the subagent completed but
  // response retrieval failed, vs. the subagent itself failing.
  // ---
  // If the wait completed successfully, retrieve the final response.
  // Only read on success - during timeout the agent may still be processing.
  let response: string | undefined;
  if (status === "ok") {
    const { readLatestAssistantReply } = await import("../agents/tools/agent-step.js");
    response = await readLatestAssistantReply({ sessionKey: params.sessionKey });
  }

  return { status, response, error, startedAt, endedAt };
}

/**
 * buildTranscriptPath resolves the transcript path for a given session key.
 * Session key format: agent:${agentId}:spawn:${sessionId}
 */
function buildTranscriptPath(sessionKey: string, cfg: ReturnType<typeof loadConfig>): string {
  const parts = sessionKey.split(":");
  const agentId = parts[1] || "default";
  const sessionId = parts[parts.length - 1];
  const agentDir = resolveAgentDir(cfg, agentId);
  return `${agentDir}/sessions/${sessionId}.jsonl`;
}

/**
 * spawnCommand spawns a subagent using an existing configured agent and waits
 * for completion. The subagent runs in its own session and can optionally
 * deliver results back to the agent's chat channel.
 */
export async function spawnCommand(opts: SpawnCliOpts, runtime: RuntimeEnv): Promise<unknown> {
  // Set up cancellation handler.
  let cancelled = false;
  const handleSigint = () => {
    if (cancelled) {
      return;
    }
    cancelled = true;
    runtime.log("Cancelled");
    process.exit(130);
  };
  process.on("SIGINT", handleSigint);

  try {
    // Read configuration to resolve agent and validate inputs.
    const cfg = loadConfig();

    // Resolve task input from positional argument, --message flag, or stdin.
    const taskBody = await resolveTaskInput(opts);

    // Resolve and validate agent ID.
    const { agentId } = resolveSpawnAgent(opts, cfg);

    // TODO Add test for timeout validation logic
    // tags: test-coverage, review:branch-feature-spawn-command
    // Timeout parsing handles user input and validates range. Should test:
    // - Valid numeric timeout strings parse correctly
    // - Non-numeric strings throw helpful error
    // - Negative values are rejected
    // - Fallback to config default when no --timeout provided
    // ---
    // Determine timeout: use opts.timeout (seconds) or config default.
    const timeoutOverrideSeconds = opts.timeout ? Number.parseInt(opts.timeout, 10) : undefined;
    if (
      opts.timeout &&
      (Number.isNaN(timeoutOverrideSeconds) || (timeoutOverrideSeconds ?? 0) < 0)
    ) {
      throw new Error(`Invalid timeout value: ${opts.timeout}`);
    }
    const timeoutMs = resolveAgentTimeoutMs({
      cfg,
      overrideSeconds: timeoutOverrideSeconds,
    });

    // Validate thinking level if provided.
    if (opts.thinking && !normalizeThinkLevel(opts.thinking)) {
      throw new Error(
        `Invalid thinking level: "${opts.thinking}". Valid levels: ${formatThinkingLevels()}`,
      );
    }

    // TODO Wrap spawn/wait errors with recovery context
    // tags: error-handling, review:branch-feature-spawn-command
    // If spawnViaGateway or waitForSpawnCompletion throw, error propagates
    // without session key or transcript path for debugging/recovery. User
    // should know where to find partial results even when spawn/wait fail.
    // ---
    // Spawn the subagent via gateway.
    const { runId, sessionKey } = await spawnViaGateway({
      agentId,
      task: taskBody,
      model: opts.model,
      thinking: opts.thinking,
      timeout: timeoutOverrideSeconds,
    });

    // Wait for the subagent to complete and retrieve the result.
    const result = await waitForSpawnCompletion({
      runId,
      sessionKey,
      timeoutMs,
    });

    // Handle --deliver mode: send result to agent's chat channel instead of terminal.
    if (opts.deliver) {
      // Resolve the agent's main session key to determine where to deliver.
      const mainSessionKey = resolveAgentMainSessionKey({
        cfg,
        agentId,
      });

      // Load the session to extract delivery context (channel, to, accountId, threadId).
      const storePath = resolveStorePath(cfg.session?.store, { agentId });
      const store = loadSessionStore(storePath);
      const sessionEntry = store[mainSessionKey];

      // Validate session exists before attempting delivery.
      if (!sessionEntry) {
        throw new Error(
          `Cannot deliver: agent "${agentId}" has no active chat session. Start a conversation with the agent first.`,
        );
      }

      const deliveryContext = deliveryContextFromSession(sessionEntry);

      // Validate delivery context has required channel information.
      if (!deliveryContext?.channel) {
        throw new Error(
          `Cannot deliver: agent "${agentId}" session has no channel context. The agent may need to receive a message first.`,
        );
      }

      // Prepare the message to deliver.
      const messageToDeliver = result.response || "(no output)";

      // TODO Handle delivery RPC failure
      // tags: error-handling, review:branch-feature-spawn-command
      // If gateway delivery fails (channel unreachable, auth error, rate limit),
      // error propagates without context. User won't know if subagent succeeded but
      // delivery failed. Should catch and provide: "Subagent completed but delivery
      // failed: [error]" with transcript path for recovery.
      // ---
      // Call the gateway to deliver the message to the agent's chat channel.
      await callGateway({
        method: "agent",
        params: {
          sessionKey: mainSessionKey,
          message: messageToDeliver,
          deliver: true,
          channel: deliveryContext?.channel,
          accountId: deliveryContext?.accountId,
          to: deliveryContext?.to,
          threadId:
            deliveryContext?.threadId != null && deliveryContext.threadId !== ""
              ? String(deliveryContext.threadId)
              : undefined,
          idempotencyKey: crypto.randomUUID(),
        },
        expectFinal: true,
        timeoutMs: 60_000,
      });

      // Show confirmation message in terminal.
      const channelLabel = deliveryContext?.channel
        ? `${deliveryContext.channel}${deliveryContext.to ? ` (${deliveryContext.to})` : ""}`
        : "agent's chat channel";
      runtime.log(`Delivered to ${channelLabel}`);
      return {};
    }

    // Build transcript path for error reporting.
    const transcriptPath = buildTranscriptPath(sessionKey, cfg);

    // Format output based on --json flag.
    if (opts.json) {
      // JSON mode: output structured result.
      if (result.status === "ok") {
        const output = {
          status: "success",
          response: result.response || "",
          sessionKey,
        };
        runtime.log(JSON.stringify(output, null, 2));
        return {};
      }

      // JSON error output.
      const errorOutput = {
        status: result.status,
        error:
          result.error || (result.status === "timeout" ? "Operation timed out" : "Unknown error"),
        sessionKey,
        transcript: transcriptPath,
      };
      runtime.error(JSON.stringify(errorOutput, null, 2));
      process.exit(result.status === "timeout" ? 2 : 1);
    }

    // Terminal mode: print response to stdout if successful.
    if (result.status === "ok" && result.response) {
      runtime.log(result.response);
      return {};
    }

    // Handle timeout errors.
    if (result.status === "timeout") {
      const durationMs =
        result.endedAt && result.startedAt ? result.endedAt - result.startedAt : timeoutMs;
      const durationSec = Math.round(durationMs / 1000);

      runtime.error("Error: Subagent timed out\n");
      runtime.error(`Session: ${sessionKey}`);
      runtime.error(`Transcript: ${transcriptPath}`);
      runtime.error(`Duration: ${durationSec}s\n`);
      runtime.error("Check the transcript for details.");
      process.exit(2);
    }

    // Handle general errors.
    if (result.status === "error") {
      const errorMsg = result.error || "Unknown error";
      runtime.error(`Error: ${errorMsg}\n`);
      runtime.error(`Session: ${sessionKey}`);
      runtime.error(`Transcript: ${transcriptPath}\n`);
      runtime.error("Check the transcript for details.");
      process.exit(1);
    }

    return {};
  } finally {
    // Clean up SIGINT handler on normal completion.
    process.off("SIGINT", handleSigint);
  }
}
