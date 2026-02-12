# Fork-Specific Guidelines

The root `CLAUDE.md` is a symlink to `AGENTS.md` — both come from upstream and contain the shared project instructions. This file adds our fork-specific context.

## Editing Philosophy

**Minimal, targeted changes only.** Change what is absolutely needed — nothing more. Avoid:

- Refactoring adjacent code
- Fixing unrelated issues
- Adding comments to unchanged code
- Reformatting files beyond the edited lines

## Fork Layout

This is a fork. Three long-lived branches:

| Branch            | Purpose                                                                  |
| ----------------- | ------------------------------------------------------------------------ |
| **main**          | Stable, our current version. Production-ready at all times.              |
| **staging**       | Development and upstream integration target. Day-to-day work lands here. |
| **upstream/main** | Tracks the original repo (read-only remote).                             |

### Day-to-Day Work

- Work happens on **staging** directly, or on topic branches off staging.
- When staging is stable and tested, merge it to **main**.

### Upstream Integration

- Upstream changes merge into **staging** first via `/merge-upstream`.
- Test and stabilise on staging before promoting to main.
- Never merge upstream directly into main.

## Upstream Overrides

- **Commits:** Use standard `git add`/`git commit` instead of `scripts/committer`.

## Fork Changes

What this fork has changed from upstream. Essential context for merge conflict
resolution — if a conflicting file touches one of these areas, our changes are
intentional and should be preserved.

### Webchat as independent channel

Webchat is promoted to its own channel (on par with WhatsApp, Telegram, etc.)
rather than being a thin UI layer. This enables channel-level features like
bindings, per-channel config, and distinct routing.

**Key areas:** `src/web/`, channel registry, gateway config, webchat UI.

### CLI subagent command

Added a CLI command to spawn a subagent from the command line.

**Key areas:** CLI command definitions, agent spawning logic.

### Webchat session dropdown

Improved the session selector in the webchat UI — better UX for switching
between and managing sessions.

**Key areas:** `ui/src/ui/` session-related components.
