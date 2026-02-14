---
name: promoting-to-main
description: >
  Merge staging into main with a merge commit, then realign staging to match.
  Uses a git worktree so the working directory stays on staging throughout.
  Use when promoting staging to main, shipping to production, or when the
  user says "promote", "ship to main", or "release staging".
---

Merge staging into main with a merge commit (not squash), preserving parent links to upstream commits. Uses a **git worktree** at `../openclaw-main` (always checked out on `main`).

```
staging:  A──B──C──D
                    \
main:     X──────────M  (merge commit, in worktree)

After realign:
main:     X──────────M
staging:  X──────────M  (reset to match)
```

ARGUMENTS: $ARGUMENTS

## 1. Pre-flight

1. `git status` / `git branch --show-current` — stop if wrong branch. If dirty, offer the user a choice: **commit** (via `/committing`), **stash**, or **discard**.
2. `git log origin/staging..staging --oneline` — push if unpushed commits exist.
3. Verify worktree: `git worktree list` — should show `../openclaw-main` on `main`. If missing, create it: `git worktree add ../openclaw-main main`
4. `git log --oneline main..staging` — present the commit list, ask user to confirm.

## 2. Merge

All operations in the **worktree** (`../openclaw-main`), not the working directory.

1. `git -C ../openclaw-main pull origin main`
2. `git -C ../openclaw-main merge --no-ff staging`
3. Write the merge commit message as a **conventional commit describing the content**, not the workflow:
   - **Type:** Match dominant changes — `feat`, `fix`, `chore` only for pure housekeeping.
   - **Title:** Summarise what shipped. Never use "promote", "merge staging", or process language.
   - **Body:** Brief themed bullet list. Summarise — don't list every commit.

   Example (illustrative — always write a fresh message from the actual commits):

   ```
   feat: Qianfan provider, Voyage AI embeddings, cron hardening

   - Providers: Baidu Qianfan, Voyage AI native embeddings
   - Cron: scheduler reliability and store hardening
   - Build: Docker .mjs support, daemon-cli compat shim
   ```

4. `git -C ../openclaw-main push origin main`

## 3. Realign Staging

**Critical — never skip.** Without this, staging diverges and future merges break.

Runs in the working directory (stays on staging).

1. `git reset --hard main`
2. `git push --force-with-lease origin staging`
3. Verify: `git log --oneline -1 main` and `git log --oneline -1 staging` should match.

## 4. Verify

1. In worktree: `cd ../openclaw-main && pnpm install && pnpm build && npm link`
2. `openclaw gateway restart` — restart the gateway with the new build.
3. `git log --oneline main..staging` and `git log --oneline staging..main` — both empty.
4. Report success with the merge commit SHA.

## Safety

- Never skip phase 3 — the realign is the point.
- `--force-with-lease` on staging is safe (nobody else pushes to it).
- If merge fails: `git -C ../openclaw-main merge --abort` to undo.
