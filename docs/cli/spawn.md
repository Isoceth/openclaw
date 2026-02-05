---
summary: "CLI reference for `openclaw spawn` (spawn a subagent and wait for its response)"
read_when:
  - You want to spawn a subagent from scripts and wait for the result
  - You want to automate background tasks using existing agents
title: "spawn"
---

# `openclaw spawn`

Spawn a subagent using an existing configured agent and wait for its response. The subagent runs in its own session and can optionally deliver results to the agent's chat channel.

Related:

- Sub-agents tool: [Sub-Agents](/tools/subagents)
- Agent command: [agent](/cli/agent)

## Overview

`openclaw spawn` provides programmatic access to subagent spawning. Unlike the `sessions_spawn` tool (which returns immediately and announces results later), `spawn` waits for the subagent to complete and returns the final response.

Key differences from `openclaw agent`:

- Uses the subagent lane (dedicated concurrency pool)
- Runs in an isolated session (`agent:<agentId>:spawn:<uuid>`)
- Does not have session tools by default
- Supports `--deliver` mode to send results to the agent's chat channel

## Usage

```bash
openclaw spawn [task] [options]
```

### Task Input

Provide the task via one of three methods (mutually exclusive):

1. **Positional argument**: `openclaw spawn "Check system status"`
2. **`--message` flag**: `openclaw spawn --message "Analyse logs"`
3. **Stdin**: `echo "Generate report" | openclaw spawn -`

## Options

| Flag                   | Description                                                        |
| ---------------------- | ------------------------------------------------------------------ |
| `[task]`               | Task as positional argument (use `-` to read from stdin)           |
| `-m, --message <text>` | Task message (alternative to positional argument)                  |
| `-a, --agent <id>`     | Agent to spawn (default: default agent)                            |
| `--deliver`            | Send result to agent's chat channel instead of terminal            |
| `--model <model>`      | Override model (provider/model format)                             |
| `--thinking <level>`   | Override thinking level: `off`, `minimal`, `low`, `medium`, `high` |
| `--timeout <seconds>`  | Run timeout in seconds (default: 600 or config value)              |
| `--json`               | Output result as JSON                                              |

## Examples

### Basic Usage

```bash
# Simple task with positional argument
openclaw spawn "Check system status"

# Use a specific agent
openclaw spawn --message "Analyse logs" --agent ops

# Read task from stdin
echo "Generate weekly report" | openclaw spawn -
cat task.txt | openclaw spawn -
```

### Model and Thinking Overrides

```bash
# Use a specific model
openclaw spawn "Summarise data" --model anthropic/claude-sonnet-4-5

# Set thinking level
openclaw spawn "Complex analysis" --thinking high

# Combine model and thinking
openclaw spawn "Analyse code" \
  --model anthropic/claude-sonnet-4-5 \
  --thinking medium
```

### Timeout Control

```bash
# Set custom timeout (20 minutes)
openclaw spawn "Long running task" --timeout 1200

# Quick task with short timeout
openclaw spawn "Fetch status" --timeout 30
```

### Delivery Mode

```bash
# Send result to agent's chat channel
openclaw spawn "Generate report" --deliver

# Combine with agent selection
openclaw spawn "Daily summary" --agent ops --deliver
```

### JSON Output

```bash
# Machine-readable output
openclaw spawn "Fetch data" --json

# Use with jq for parsing
openclaw spawn "Status check" --json | jq -r '.response'
```

### Scripting Examples

```bash
# Conditional logic based on exit code
if openclaw spawn "Validate config" --json; then
  echo "Config valid"
else
  echo "Config invalid"
fi

# Capture response
RESPONSE=$(openclaw spawn "Get current status")
echo "Status: $RESPONSE"

# Process multiple tasks
for task in "task1" "task2" "task3"; do
  openclaw spawn "$task" --json >> results.jsonl
done
```

## Output Formats

### Terminal Mode (Default)

Prints the final response to stdout:

```
The system status is healthy. All services are running normally.
```

### JSON Mode

Outputs structured JSON:

```json
{
  "status": "success",
  "response": "The system status is healthy. All services are running normally.",
  "sessionKey": "agent:default:spawn:a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

### Delivery Mode

Sends the result to the agent's chat channel and prints confirmation:

```
Delivered to telegram (@username)
```

## Exit Codes

| Code  | Meaning                                                |
| ----- | ------------------------------------------------------ |
| `0`   | Success                                                |
| `1`   | Error (general failure, invalid input, subagent error) |
| `2`   | Timeout                                                |
| `130` | Cancelled (SIGINT)                                     |

## Error Handling

When an error occurs, `spawn` prints diagnostic information:

```
Error: Operation timed out

Session: agent:default:spawn:a1b2c3d4-e5f6-7890-abcd-ef1234567890
Transcript: /home/user/.openclaw/agents/default/sessions/a1b2c3d4-e5f6-7890-abcd-ef1234567890.jsonl
Duration: 600s

Check the transcript for details.
```

### Common Errors

**No agents configured:**

```
Error: No agents configured. Use "openclaw agents add" to configure an agent.
```

**Invalid agent ID:**

```
Error: Unknown agent id "nonexistent".

Available agents:
  - default
  - ops
  - research

Use "openclaw agents list" for more details.
```

**No task provided:**

```
Error: No task specified. Provide a task as an argument, via --message, or from stdin using "-"
```

**Conflicting inputs:**

```
Error: Cannot specify both positional task argument and --message flag
```

**Invalid thinking level:**

```
Error: Invalid thinking level: "ultra". Valid levels: off, minimal, low, medium, high
```

**No active session (delivery mode):**

```
Error: Cannot deliver: agent "ops" has no active chat session. Start a conversation with the agent first.
```

## Cancellation

Press `Ctrl+C` to cancel a running spawn. The command will exit immediately with code 130:

```
Cancelled
```

The subagent session will be stopped, and the transcript will be available for inspection.

## Session Details

Spawn sessions use the key format:

```
agent:<agentId>:spawn:<uuid>
```

Transcripts are stored in the agent directory:

```
~/.openclaw/agents/<agentId>/sessions/<uuid>.jsonl
```

Use the session key from error output or JSON mode to inspect the transcript manually or via:

```bash
openclaw sessions --verbose | grep <uuid>
```

## Configuration

Spawn behaviour is controlled by agent configuration:

```json5
{
  agents: {
    defaults: {
      timeoutSeconds: 600,
      subagents: {
        model: "anthropic/claude-opus-4-5", // Default model for spawned subagents
        thinking: "low", // Default thinking level
        maxConcurrent: 8, // Subagent lane concurrency
      },
    },
  },
}
```

Per-agent overrides:

```json5
{
  agents: {
    list: [
      {
        id: "ops",
        subagents: {
          model: "anthropic/claude-sonnet-4-5",
          thinking: "minimal",
        },
      },
    ],
  },
}
```

CLI flags override both config defaults and per-agent settings.

## Comparison with Other Commands

| Command               | Session Type     | Returns          | Delivery     |
| --------------------- | ---------------- | ---------------- | ------------ |
| `openclaw agent`      | Main session     | Immediately      | Optional     |
| `openclaw spawn`      | Spawn session    | After completion | Optional     |
| `sessions_spawn` tool | Subagent session | Immediately      | Via announce |

Use `spawn` when:

- You need the result before continuing (synchronous)
- Running from scripts that need exit codes
- You want delivery mode without announce formatting

Use `sessions_spawn` tool when:

- You want parallel execution (asynchronous)
- The agent should continue while work happens in background
- You want announce formatting and stats

## Limitations

- Spawn sessions do not have session tools (`sessions_list`, `sessions_history`, `sessions_send`, `sessions_spawn`)
- Spawn sessions cannot spawn additional subagents (no nesting)
- Tool policy inherits from `tools.subagents.tools` configuration
- Authentication inherits from the agent with main agent profiles as fallback
- Spawn sessions do not inject `SOUL.md`, `IDENTITY.md`, `USER.md`, `HEARTBEAT.md`, or `BOOTSTRAP.md` (only `AGENTS.md` and `TOOLS.md`)
