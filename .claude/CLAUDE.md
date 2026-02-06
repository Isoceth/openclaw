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

## Planning Documents

Feature plans live in `.motes/planning/<feature-name>/`. These are the source of truth for what to build.
