# CLI Subagent Spawn Command

## Goal

OpenClaw has comprehensive subagent spawning infrastructure—the `sessions_spawn` tool, subagent registry, lifecycle management, and announce-back mechanism—but this functionality is only accessible from within an agent turn. There's no way to spawn a subagent directly from the CLI.

This feature adds a CLI command to spawn subagents, wrapping the existing infrastructure. Users select which configured agent to spawn (from those created via `openclaw agents add`), provide a task, and receive the result either in the terminal or delivered to the agent's normal chat. The command runs synchronously, waiting for the subagent to complete before returning.

## Requirements

### Core Behaviour

- **REQ-1**: Command spawns a subagent using an existing configured agent (from `agents.list[]`)
- **REQ-2**: Command accepts a task message (the work for the subagent to perform)
- **REQ-3**: Command runs synchronously—waits for the subagent to complete before exiting
- **REQ-4**: Output goes to terminal (stdout) by default
- **REQ-5**: Optional flag to deliver the result to the agent's normal chat channel instead (existing announce behaviour)

### Agent Selection

- **REQ-6**: User specifies which agent to spawn via flag (e.g., `--agent <id>`)
- **REQ-7**: If no agent specified, use the default agent (same resolution as other agent commands)
- **REQ-8**: Error if specified agent ID doesn't exist in configuration
- **REQ-9**: Error with guidance if no agents are configured at all

### Task Input

- **REQ-10**: Accept task as a positional argument or via `--message` flag (consistent with `openclaw agent`)
- **REQ-11**: Support reading task from stdin when task is `-` (for piping)

### Gateway Integration

- **REQ-12**: Command requires a running gateway (same as `openclaw agent`)
- **REQ-13**: Error clearly if gateway is not running
- **REQ-14**: Reuse existing `sessions_spawn` tool infrastructure and subagent registry
- **REQ-14a**: Subagent sessions use existing lifecycle management (60-minute idle auto-archive, concurrency limits via `maxConcurrent`)
- **REQ-14b**: Respect registry limits—if at capacity, behaviour matches existing subagent queue handling

### Output Modes

- **REQ-15**: Terminal output (default): print the subagent's final response to stdout (no partial output, tool calls, or thinking—just the final result)
- **REQ-16**: Chat delivery (opt-in via `--deliver`): use existing announce mechanism to deliver to the target agent's main session channel
- **REQ-17**: Progress indication while waiting (spinner or status updates)
- **REQ-18**: Exit code 0 on success, non-zero on failure

### Configuration Passthrough

- **REQ-19**: Support `--model` flag to override the subagent's model
- **REQ-20**: Support `--thinking` flag to override thinking level
- **REQ-21**: Support `--timeout` flag to set run timeout (in seconds)
- **REQ-22**: Inherit other configuration from the target agent's config (workspace, tools policy, etc.)

### Error Handling

- **REQ-23**: Clear error message if subagent fails or times out
- **REQ-24**: Include relevant context in error output (session ID, transcript location)
- **REQ-25**: Support Ctrl+C cancellation—cleanly stop the subagent run

## Out of Scope

- **Async/background execution**: CLI commands exit when done; background spawning remains an agent-only capability
- **Creating new agents on the fly**: Use `openclaw agents add` to configure agents first
- **Custom AGENTS.md file path**: Agents use their configured workspace's AGENTS.md
- **Multiple concurrent spawns from one command**: One subagent per invocation
- **Session persistence for the spawner**: The CLI command doesn't maintain its own session history

## Open Questions

None—requirements are clear from interview.
