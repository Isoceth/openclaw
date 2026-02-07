# Promote Staging to Main

Merge staging into main with a merge commit, then realign staging. The merge commit (not squash) preserves parent links to upstream commits.

```
staging:  A──B──C──D
                    \
main:     X──────────M  (merge commit)

After realign:
main:     X──────────M
staging:  X──────────M  (reset to match)
```

## Prerequisites

- Clean working tree, on `staging`, all changes committed and pushed.

## Phase 1: Pre-flight

1. `git status` / `git branch --show-current` — stop if dirty or wrong branch.
2. `git log origin/staging..staging --oneline` — push if unpushed commits exist.
3. `git log --oneline main..staging` — present the commit list, ask user to confirm.

## Phase 2: Merge

1. `git switch main && git pull origin main`
2. `git merge --no-ff staging`
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

4. `git push origin main`

## Phase 3: Realign Staging

**Critical — never skip.** Without this, staging diverges and future merges break.

1. `git switch staging`
2. `git reset --hard main`
3. `git push --force-with-lease origin staging`
4. Verify: `git log --oneline -1 main` and `git log --oneline -1 staging` should match.

## Phase 4: Verify

1. `pnpm install && npm link`
2. `git log --oneline main..staging` and `git log --oneline staging..main` — both empty.
3. Report success with the merge commit SHA.

## Safety

- Never skip Phase 3 — the realign is the point.
- `--force-with-lease` on staging is safe (nobody else pushes to it).
- If merge fails: `git merge --abort` on main to undo.
