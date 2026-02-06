# Phase 01: Spawn Command

## Overview

Adds the `openclaw spawn` command, providing direct CLI access to subagent spawning infrastructure. Users can spawn a configured agent with a task and receive the result in their terminal or delivered to the agent's chat channel.

## Goal

Users can run `openclaw spawn "task"` and receive the subagent's response in their terminal.

## Scope

### Command and Task Input (REQ-1, REQ-2, REQ-10, REQ-11)

**User experience:**
The user invokes `openclaw spawn` with a task describing work for the subagent. The task can be provided as:

- Positional argument: `openclaw spawn "summarise this file"`
- Flag: `openclaw spawn --message "summarise this file"`
- Stdin: `cat notes.txt | openclaw spawn -` (when task is literally `-`)

**Success:**
The command accepts the task and proceeds to spawn the subagent.

**Failure:**

- No task provided (neither positional, `--message`, nor stdin): error message explaining how to provide a task.
- Both positional and `--message` provided: error indicating only one should be used.

**Acceptance criteria:**

- [ ] Task accepted as positional argument
- [ ] Task accepted via `--message` flag
- [ ] Task read from stdin when argument is `-`
- [ ] Error shown when no task provided
- [ ] Error shown when both positional and `--message` provided

### Agent Selection (REQ-6, REQ-7, REQ-8, REQ-9)

**User experience:**
The user specifies which configured agent to spawn via `--agent <id>`. If omitted, the default agent is used (same resolution as `openclaw agent`).

**Success:**

- Specified agent exists → that agent is used
- No agent specified, default exists → default agent is used
- Terminal shows which agent was selected (part of progress output)

**Failure:**

- Specified agent ID doesn't exist:

  ```
  Error: Agent "foo" not found

  Available agents:
    default - Default agent
    research - Research assistant

  Run 'openclaw agents list' to see all configured agents.
  ```

- No agents configured at all:

  ```
  Error: No agents configured

  Add an agent first with 'openclaw agents add'.
  ```

**Acceptance criteria:**

- [ ] `--agent <id>` selects the specified agent
- [ ] Omitting `--agent` uses the default agent
- [ ] Invalid agent ID shows error listing available agents
- [ ] No configured agents shows guidance to add one

### Synchronous Execution and Wait (REQ-3, REQ-12, REQ-13, REQ-14, REQ-14a, REQ-14b, REQ-17)

**User experience:**
After invoking the command, the user sees a progress spinner while the subagent executes. The command waits synchronously until the subagent completes.

**Success:**

- Gateway is running → subagent spawns and executes
- Progress spinner displays during wait
- User sees indication that work is in progress

**Failure:**

- Gateway not running:

  ```
  Error: Gateway not running

  Start the gateway with 'openclaw gateway run' or launch the OpenClaw app.
  ```

- Lane at capacity (concurrency limit reached): the command queues and waits, same as subagent spawns from within an agent turn. No special error—the spinner continues until capacity frees.

**Constraints:**

- Subagent sessions respect existing lifecycle: 60-minute idle auto-archive, lane concurrency limits via `maxConcurrent` configuration.
- If capacity is reached, the spawn queues behind other subagent work.

**Acceptance criteria:**

- [ ] Command requires running gateway
- [ ] Clear error when gateway not running
- [ ] Progress spinner shown during execution
- [ ] Command respects lane concurrency limits

### Terminal Output (REQ-4, REQ-15, REQ-18)

**User experience:**
By default, the subagent's final response prints to stdout when complete. No partial output, tool call details, or thinking content—just the final result text.

**Success:**
The final assistant response appears in the terminal:

```
$ openclaw spawn "what is 2+2?"
The answer is 4.
```

Exit code 0.

**Failure:**
Error output goes to stderr. Exit code is non-zero. See error handling section for details.

**JSON output mode:**
With `--json`, output is structured:

```json
{
  "status": "success",
  "response": "The answer is 4.",
  "sessionKey": "spawn-abc123"
}
```

**Acceptance criteria:**

- [ ] Final response prints to stdout
- [ ] No partial output, tool calls, or thinking shown
- [ ] Exit code 0 on success
- [ ] `--json` outputs structured result

### Chat Delivery (REQ-5, REQ-16)

**User experience:**
With `--deliver`, the result goes to the agent's configured chat channel instead of the terminal.

**Success:**

- Subagent completes successfully
- Result delivered to the agent's main session channel via existing announce mechanism
- Terminal shows confirmation:
  ```
  Delivered to #general (Slack)
  ```
- No response text in terminal (it went to chat)
- Exit code 0

**Failure:**
Delivery failure (e.g., channel unreachable) shows error with context. Exit code non-zero.

**Acceptance criteria:**

- [ ] `--deliver` sends result to chat channel
- [ ] Terminal shows delivery confirmation, not the response
- [ ] Delivery failure shows clear error

### Configuration Override (REQ-19, REQ-20, REQ-21, REQ-22)

**User experience:**
Override specific settings for this spawn while inheriting the rest from the agent's configuration:

- `--model <provider/model>`: override the model
- `--thinking <level>`: override thinking level (low, medium, high)
- `--timeout <seconds>`: set run timeout (0 for no limit)

**Success:**
Overrides apply to this spawn only. Other configuration (workspace, tools policy, etc.) inherited from the target agent.

**Failure:**

- Invalid model format: error explaining expected format
- Invalid thinking level: error listing valid options
- Invalid timeout (negative, non-numeric): validation error

**Acceptance criteria:**

- [ ] `--model` overrides the model
- [ ] `--thinking` overrides thinking level
- [ ] `--timeout` sets run timeout
- [ ] Invalid values show validation errors
- [ ] Other config inherited from agent

### Error Handling (REQ-23, REQ-24)

**User experience:**
When the subagent fails or times out, the user receives a clear error with debugging context.

**Failure scenarios:**

Subagent failure (error during execution):

```
Error: Subagent failed

Session: spawn-abc123
Transcript: ~/.openclaw/agents/default/sessions/spawn-abc123.jsonl

Check the transcript for details.
```

Timeout:

```
Error: Subagent timed out after 300 seconds

Session: spawn-abc123
Transcript: ~/.openclaw/agents/default/sessions/spawn-abc123.jsonl
```

Exit code non-zero for all failure cases.

**JSON error output:**

```json
{
  "status": "error",
  "error": "Subagent timed out after 300 seconds",
  "sessionKey": "spawn-abc123",
  "transcriptPath": "~/.openclaw/agents/default/sessions/spawn-abc123.jsonl"
}
```

**Acceptance criteria:**

- [ ] Subagent failure shows clear error message
- [ ] Timeout shows error with duration
- [ ] Error output includes session key
- [ ] Error output includes transcript path
- [ ] Exit code non-zero on failure

### Cancellation (REQ-25)

**User experience:**
Pressing Ctrl+C during execution cleanly cancels the spawn.

**Behaviour:**

- Ctrl+C caught by CLI
- Subagent run stopped
- Terminal shows brief cancellation message:
  ```
  Cancelled
  ```
- No partial output printed
- Exit code non-zero (standard cancellation code)

**Acceptance criteria:**

- [ ] Ctrl+C cancels the spawn cleanly
- [ ] No partial output on cancellation
- [ ] Brief cancellation message shown
- [ ] Exit code indicates cancellation

## Technical Design

### Technology Choices

| Choice              | Decision                          | Rationale                                                                 |
| ------------------- | --------------------------------- | ------------------------------------------------------------------------- |
| Gateway integration | Existing RPC methods              | No new infrastructure needed; reuse `agent`, `agent.wait`, `chat.history` |
| Progress UI         | Existing `src/cli/progress.ts`    | Consistent with other CLI commands                                        |
| Session lifecycle   | Ephemeral (deleted on completion) | CLI spawns don't need persistence; result retrieved then discarded        |
| Registry bypass     | Direct wait, no registry          | CLI handles its own wait; no main session to announce to                  |

### CLI Interface

```
openclaw spawn [task] [options]

Arguments:
  task                    Task for the subagent (or use --message; use - for stdin)

Options:
  -m, --message <text>    Task message (alternative to positional)
  -a, --agent <id>        Agent to spawn (default: resolved default agent)
  --deliver               Send result to agent's chat channel instead of terminal
  --model <model>         Override model (provider/model format)
  --thinking <level>      Override thinking level (low, medium, high)
  --timeout <seconds>     Run timeout in seconds (0 = no limit)
  --json                  Output result as JSON
```

### Gateway RPC Usage

Uses existing RPCs—no new methods required:

| RPC            | Purpose                                          |
| -------------- | ------------------------------------------------ |
| `agent`        | Spawn the subagent with `lane: "subagent"`       |
| `agent.wait`   | Wait for completion, get status                  |
| `chat.history` | Retrieve conversation history for final response |

**Result retrieval:** Uses existing `readLatestAssistantReply` helper to extract the final assistant message from session history.

### Exit Codes

| Code | Meaning                                            |
| ---- | -------------------------------------------------- |
| 0    | Success                                            |
| 1    | General failure (subagent error, delivery failure) |
| 2    | Timeout                                            |
| 130  | Cancelled (Ctrl+C)                                 |

### Key Decisions

#### Registry Bypass for CLI Spawns

**Context:** The subagent registry exists to track spawns for announce-back to a main agent session.

**Decision:** CLI spawns bypass the registry entirely.

**Rationale:** CLI spawns have no main session to announce to. The CLI handles its own wait and result retrieval directly, making the registry unnecessary.

#### Ephemeral Sessions

**Context:** Spawned sessions could be retained or deleted after completion.

**Decision:** Sessions are deleted on completion by default.

**Rationale:** The CLI retrieves the result and exits. Retaining sessions would accumulate storage without benefit. Users who need session history can check the transcript path provided in error output (sessions persist on error for debugging).

## Dependencies

None. This phase has no dependencies on other phases.
