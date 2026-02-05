import type { Command } from "commander";
import { spawnCommand } from "../../commands/spawn.js";
import { defaultRuntime } from "../../runtime.js";
import { formatDocsLink } from "../../terminal/links.js";
import { theme } from "../../terminal/theme.js";
import { runCommandWithRuntime } from "../cli-utils.js";
import { formatHelpExamples } from "../help-format.js";

export function registerSpawnCommand(program: Command) {
  program
    .command("spawn [task]")
    .description("Spawn a subagent and wait for its response")
    .option("-m, --message <text>", "Task message (alternative to positional argument)")
    .option("-a, --agent <id>", "Agent to spawn (default: default agent)")
    .option("--deliver", "Send result to agent's chat channel instead of terminal", false)
    .option("--model <model>", "Override model (provider/model format)")
    .option("--thinking <level>", "Override thinking level: off | minimal | low | medium | high")
    .option("--timeout <seconds>", "Run timeout in seconds (default 600 or config value)")
    .option("--json", "Output result as JSON", false)
    .addHelpText(
      "after",
      () =>
        `
${theme.heading("Examples:")}
${formatHelpExamples([
  ['openclaw spawn "Check system status"', "Spawn a subagent with a simple task."],
  ['openclaw spawn --message "Analyze logs" --agent ops', "Use a specific agent."],
  ['openclaw spawn "Generate report" --deliver', "Send result to agent's chat channel."],
  [
    'openclaw spawn "Summarize data" --model anthropic/claude-sonnet-4-5 --thinking high',
    "Override model and thinking level.",
  ],
  ['openclaw spawn "Long task" --timeout 1200', "Set custom timeout (20 minutes)."],
  ['openclaw spawn "Fetch data" --json', "Output result as JSON."],
])}

${theme.muted("Docs:")} ${formatDocsLink("/cli/spawn", "docs.openclaw.ai/cli/spawn")}`,
    )
    .action(async (task, opts) => {
      await runCommandWithRuntime(defaultRuntime, async () => {
        await spawnCommand(
          {
            task: typeof task === "string" ? task : undefined,
            message: opts.message as string | undefined,
            agent: opts.agent as string | undefined,
            deliver: Boolean(opts.deliver),
            model: opts.model as string | undefined,
            thinking: opts.thinking as string | undefined,
            timeout: opts.timeout as string | undefined,
            json: Boolean(opts.json),
          },
          defaultRuntime,
        );
      });
    });
}
