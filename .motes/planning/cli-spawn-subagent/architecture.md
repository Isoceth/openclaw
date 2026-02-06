# Architecture: CLI Subagent Spawn Command

## Implementation Approach

The command provides direct CLI access to the existing subagent spawning infrastructure, running synchronously and returning the result to the terminal.

**Gateway Integration:** The command calls the gateway's `agent` RPC method with `lane: "subagent"` — the same call path that `sessions_spawn` uses — then waits for completion via `agent.wait` RPC. Lane concurrency limits (enforced by the command queue) still apply, ensuring spawns respect `maxConcurrent` configuration.

**Lifecycle Handling:** The subagent registry exists to track spawns for announce-back to a main agent session. Since CLI spawns have no main session to announce to, the registry is bypassed — the CLI handles its own wait and result retrieval directly.

**Component Placement:** New command module following existing command patterns. Reuses existing agent config resolution, gateway client, and session utilities.

## Data Requirements

No new persistent data. The spawned session is ephemeral — deleted on completion by default. The CLI retrieves the final response from the session transcript (existing RPC).

## Interface Design

### CLI

```
openclaw spawn [task] [options]

Arguments:
  task                    Task for the subagent (or use --message)

Options:
  -m, --message <text>    Task message (alternative to positional)
  -a, --agent <id>        Agent to spawn (default: default agent)
  --deliver               Send result to agent's chat channel instead of terminal
  --model <model>         Override model (provider/model format)
  --thinking <level>      Override thinking level
  --timeout <seconds>     Run timeout (0 = no limit)
  --json                  Output result as JSON
```

**Task Input:** Positional argument or `--message` flag. Stdin supported when task is `-`.

**Output Modes:**

- Default: final response text to stdout, progress spinner during wait
- `--deliver`: waits for completion, then triggers announce flow to agent's main session channel (no terminal output)
- `--json`: structured output including status, response, session key

**Exit Codes:** 0 = success, non-zero = failure/timeout/cancellation. Error output includes session key and transcript path for debugging.

### Gateway RPC

Uses existing RPCs — no new methods required:

| RPC            | Purpose                                          |
| -------------- | ------------------------------------------------ |
| `agent`        | Spawn the subagent with `lane: "subagent"`       |
| `agent.wait`   | Wait for completion, get status                  |
| `chat.history` | Retrieve conversation history for final response |

Result retrieval uses existing `readLatestAssistantReply` helper (calls `chat.history`, extracts last assistant message).

## Cancellation

Ctrl+C triggers graceful cancellation — clean exit without partial output.

## Dependencies

No new packages required.

## Testing Strategy

Standard command testing: input validation, gateway integration, error handling.
