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
2. `git log --oneline staging..upstream/main` — if empty, report up to date and stop.
3. Summarise incoming changes (features, fixes, docs, chores).
4. Spawn parallel Explore agents to assess conflict risk. Each examines a subset of commits, reports what changed and which files overlap with our modifications. You coordinate — don't duplicate their work.
5. Present summary: commit count, categories, conflict risk per file. Ask user whether to proceed.

## Phase 2: Merge

1. Verify clean working tree. **Stop if dirty.**
2. `git switch staging`
3. `git merge upstream/main`
4. If conflicts: report each conflict, show both sides, ask user for resolution strategy (ours/theirs/manual). After resolving: `git add <files> && git commit --no-edit`.

## Phase 3: Verify

1. `pnpm install` (upstream may have changed deps)
2. `pnpm build && pnpm check`
3. Ask user about `pnpm test`.
4. Report pass/fail.

## Phase 4: Push

Ask user, then: `git push origin staging`

## Safety

- Never merge upstream directly into main — staging is the integration target.
- Never force-push staging without explicit approval.
- If verification fails, the merge is still local — `git reset --hard HEAD~1` to undo.
