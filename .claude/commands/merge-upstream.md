# Merge Upstream into Staging

Merge `upstream/main` into `staging` via `git merge` (not squash/cherry-pick). The merge commit preserves parent links so future merges only process genuinely new commits.

ARGUMENTS: $ARGUMENTS

```
upstream/main ───────> (fetched)
                        \
staging ◄──────────── merge commit (two parents)
```

## Prerequisites

- Clean working tree
- Remote `upstream` configured

## Phase 1: Assess

1. `git fetch upstream`
2. `git log --oneline staging..upstream/main | head -50` — if empty, report up to date and stop. If truncated, note total count with `git rev-list --count staging..upstream/main`.
3. `git diff --stat staging..upstream/main | tail -20` — show which files changed and the summary line. This is your conflict risk indicator; no further analysis needed.
4. Present: commit count, diff stat summary. Ask user whether to proceed.

## Phase 2: Merge

1. Verify clean working tree. **Stop if dirty.**
2. `git switch staging`
3. `git merge upstream/main`
4. If conflicts: list conflicted files from `git diff --name-only --diff-filter=U`. For each, show the conflict markers concisely — don't dump entire files. Ask user for resolution strategy (ours/theirs/manual). After resolving: `git add <files> && git commit --no-edit`.

## Phase 3: Verify

1. Run `pnpm build && pnpm check` via a background **test-runner** agent. Continue only once it reports back.
2. If build passes, ask user about `pnpm test`. Run via test-runner if requested.
3. Report pass/fail.

## Phase 4: Push

Ask user, then: `git push origin staging`

## Safety

- Never merge upstream directly into main — staging is the integration target.
- Never force-push staging without explicit approval.
- If verification fails, the merge is still local — `git reset --hard HEAD~1` to undo.
