# Roadmap: CLI Subagent Spawn Command

## Overview

A single-phase feature delivering the `openclaw spawn` command—direct CLI access to subagent spawning infrastructure.

## Phase 01: Spawn Command

**Goal:** Users can run `openclaw spawn "task"` and receive the subagent's response in their terminal.

**Delivers:**

- REQ-1: Command spawns a subagent using an existing configured agent
- REQ-2: Command accepts a task message
- REQ-3: Command runs synchronously—waits for completion
- REQ-4: Output goes to terminal (stdout) by default
- REQ-5: Optional `--deliver` flag for chat channel delivery
- REQ-6: Agent selection via `--agent` flag
- REQ-7: Default agent resolution when unspecified
- REQ-8: Error on invalid agent ID
- REQ-9: Error with guidance when no agents configured
- REQ-10: Task as positional argument or `--message` flag
- REQ-11: Stdin support when task is `-`
- REQ-12: Gateway required (same as `openclaw agent`)
- REQ-13: Clear error if gateway not running
- REQ-14: Reuse existing `sessions_spawn` infrastructure
- REQ-14a: Existing lifecycle management (60-min idle, concurrency limits)
- REQ-14b: Respect registry limits
- REQ-15: Terminal output shows final response only
- REQ-16: Chat delivery via `--deliver` uses announce mechanism
- REQ-17: Progress spinner while waiting
- REQ-18: Exit code 0 success, non-zero failure
- REQ-19: `--model` flag for model override
- REQ-20: `--thinking` flag for thinking level override
- REQ-21: `--timeout` flag for run timeout
- REQ-22: Inherit other config from target agent
- REQ-23: Clear error on subagent failure or timeout
- REQ-24: Error output includes session ID and transcript location
- REQ-25: Ctrl+C cancellation cleanly stops the run

**Dependencies:** None

**Acceptance:** Running `openclaw spawn "summarise this file" --agent default` spawns a subagent, waits for completion, and prints the final response to the terminal. Errors include actionable context. Cancellation via Ctrl+C exits cleanly.
