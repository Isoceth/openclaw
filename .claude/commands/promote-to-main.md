# Promote Staging to Main

Merge staging into main with a merge commit, then realign staging. The merge commit (not squash) preserves parent links to upstream commits.

Uses a **git worktree** at `../openclaw-main` (always checked out on `main`) so the working directory stays on staging throughout.

```
staging:  A──B──C──D
                    \
main:     X──────────M  (merge commit, in worktree)

After realign:
main:     X──────────M
staging:  X──────────M  (reset to match)
```

## Prerequisites

- Clean working tree, on `staging`, all changes committed and pushed.
- Worktree exists at `../openclaw-main` on `main`. If missing: `git worktree add ../openclaw-main main`

## Phase 1: Pre-flight

1. `git status` / `git branch --show-current` — stop if dirty or wrong branch.
2. `git log origin/staging..staging --oneline` — push if unpushed commits exist.
3. Verify worktree exists: `git worktree list` — should show `../openclaw-main` on `main`. If missing, create it.
4. `git log --oneline main..staging` — present the commit list, ask user to confirm.

## Phase 2: Merge

All merge operations happen in the **worktree** (`../openclaw-main`), not the working directory.

1. `git -C ../openclaw-main pull origin main`
2. `git -C ../openclaw-main merge --no-ff staging`
3. Write the merge commit message as a **conventional commit describing the content**, not the workflow:
   - **Type:** Match the dominant changes — `feat` for features, `fix` for fixes, `chore` only for pure housekeeping.
   - **Title:** Summarise what shipped. Never use "promote", "merge staging", or process language.
   - **Body:** Brief themed bullet list (features, fixes, docs, chores). Summarise — don't list every commit.

   Example (illustrative — always write a fresh message from the actual commits):

   ```
   feat: Qianfan provider, Voyage AI embeddings, cron hardening

   - Providers: Baidu Qianfan, Voyage AI native embeddings
   - Cron: scheduler reliability and store hardening
   - Build: Docker .mjs support, daemon-cli compat shim
   - CI: concurrency controls, macOS job consolidation
   ```

4. `git -C ../openclaw-main push origin main`

## Phase 3: Realign Staging

**Critical — never skip.** Without this, staging diverges and future merges break.

Runs in the working directory (which stays on staging).

1. `git reset --hard main`
2. `git push --force-with-lease origin staging`
3. Verify: `git log --oneline -1 main` and `git log --oneline -1 staging` should match.

## Phase 4: Verify

1. In worktree: `cd ../openclaw-main && pnpm install && npm link` — ensure main worktree environment is current.
2. `git log --oneline main..staging` and `git log --oneline staging..main` — both empty.
3. Report success with the merge commit SHA.

## Safety

- Never skip Phase 3 — the realign is the point.
- `--force-with-lease` on staging is safe (nobody else pushes to it).
- If merge fails: `git -C ../openclaw-main merge --abort` to undo.
