---
name: merge-upstream
description: >
  Merge upstream/main into staging branch for fork integration.
  Delegates conflict resolution to sonnet teammates for cost efficiency.
  Use when merging upstream, syncing with upstream, or pulling in
  upstream changes.
---

Merge `upstream/main` into `staging` via `git merge` (not squash). The merge commit preserves parent links so future merges only process new commits.

ARGUMENTS: $ARGUMENTS

## 1. Assess

1. `git fetch upstream`
2. `git log --oneline staging..upstream/main | head -50` — if empty, report up to date and stop. Note total with `git rev-list --count` if truncated.
3. `git diff --stat staging..upstream/main | tail -20`
4. Present commit count and diff stat summary. Ask user whether to proceed.

## 2. Merge

1. Verify clean working tree. **Stop if dirty.**
2. `git switch staging`
3. `git merge upstream/main`
4. If clean: skip to Verify.
5. If conflicts: proceed to Resolve Conflicts.

## 3. Resolve Conflicts

List conflicting files: `git diff --name-only --diff-filter=U`

**Delegate to sonnet teammates.** Do not resolve conflicts yourself — the orchestrator assesses and delegates.

### Set up the team

1. Use TeamCreate to create a team (e.g., `merge-upstream`).
2. Create tasks with TaskCreate — one per batch of files (3–5 files per task).
3. Spawn teammates using the Task tool with `model: "sonnet"`, `subagent_type: "general-purpose"`, and `team_name` set to the team name. Give each teammate a name (e.g., `resolver-1`, `resolver-2`).
4. Assign tasks to teammates with TaskUpdate.

### Teammate prompts

Each teammate prompt: "Read `.claude/skills/merge-upstream/references/resolver-instructions.md` for your instructions. Your files: `<absolute paths>`"

### Handle escalations

When a teammate escalates, make the decision and reply via SendMessage. Only escalate to the user for questions about fork direction or intent.

### Finalise

After all teammates complete, shut them down via SendMessage (`type: "shutdown_request"`) and clean up with TeamDelete.

Verify nothing remains: `git diff --name-only --diff-filter=U`

If clean: `git commit --no-edit`

## 4. Verify

Run `pnpm build && pnpm check` via a background **test-runner** agent.

If build passes, ask user about `pnpm test`. Run via test-runner if requested.

## 5. Push

Ask user, then: `git push origin staging`

## Safety

- Never merge upstream directly into main — staging is the integration target.
- Never force-push staging without explicit approval.
- If verification fails, the merge is still local — `git reset --hard HEAD~1` to undo.
