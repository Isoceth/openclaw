# Merge Upstream into Staging

Absorb upstream changes into the staging branch.

## Overview

This command merges `upstream/main` into `staging` as a single merge commit. Upstream changes always land on staging first — never directly on main.

```
upstream/main ──────────────────────> (fetched)
                                       \
staging ◄──────────────────────────── merge
```

## Prerequisites

- Working tree must be clean (no uncommitted changes)
- Remote `upstream` must be configured (`git remote -v` should show the original repo)

## Workflow

### Phase 1: Assess

1. Fetch upstream:

   ```bash
   git fetch upstream
   ```

2. Check how far behind staging is:

   ```bash
   git log --oneline staging..upstream/main
   ```

   If there are no new commits, report that staging is up to date and stop.

3. Summarise what's incoming at a high level (fixes, features, docs, chores).

4. **Create a team** to assess the incoming changes in parallel:

   Use `TeamCreate` to set up a merge assessment team, then spawn teammates to divide the work. Split commits into roughly equal groups and assign each teammate a subset.

   Each teammate should:
   - Examine their assigned commits in detail (`git show`, `git diff`)
   - Report: what changed, which files, the nature of each change
   - Identify potential conflict areas with our local modifications
   - Flag commits that touch files we've heavily modified (high conflict risk)

   **Team leader discipline:** You are the coordinator — not a worker. Do not duplicate your teammates' analysis. Spawn them, assign them work, and wait for their results. Do not read the same diffs they're reading or pre-empt their findings. Your job is to synthesise their reports into a coherent summary, not to race them to conclusions.

5. Once all teammates have reported back, synthesise their findings and present a summary to the user:
   - Total commits incoming
   - Categories of changes (fixes, features, docs, chores, dependencies)
   - Conflict risk assessment (which files are likely to conflict and why)
   - Any commits that warrant particular attention
   - Ask the user whether to proceed with the merge

6. Shut down the assessment team before proceeding.

### Phase 2: Merge

1. Verify clean working tree:

   ```bash
   git status
   ```

   **Stop if dirty.** Ask user to commit or stash first.

2. Switch to staging:

   ```bash
   git switch staging
   ```

3. Merge upstream/main as a single merge commit:

   ```bash
   git merge upstream/main
   ```

4. **If conflicts arise:**
   - Report conflicting files and the nature of each conflict
   - For each conflict, show our version vs upstream version
   - Ask user how to resolve (ours / theirs / manual) per file
   - After resolution, complete the merge commit:

     ```bash
     git add <resolved-files>
     git commit --no-edit
     ```

### Phase 3: Verify

1. Install dependencies (upstream may have changed them):

   ```bash
   pnpm install
   ```

2. Build and lint:

   ```bash
   pnpm build && pnpm check
   ```

3. Ask the user if they want full test verification:

   ```bash
   pnpm test
   ```

4. Report results — pass/fail for each step.

### Phase 4: Summary

Present a brief summary of what the merge brought in:

- **Key changes:** what's new, what's different, anything noteworthy
- **Our modifications touched:** files where the merge overlapped with our local changes, and how conflicts (if any) were resolved
- **Action items:** anything that needs follow-up (new config, deprecated APIs, migrations, etc.)

### Phase 5: Push

Ask the user if they want to push staging to origin:

```bash
git push origin staging
```

## Safety Notes

- **Never merge upstream directly into main** — staging is the integration target
- **Never force-push staging** without explicit user approval
- Keep the user informed at each step
- If verification fails, the merge commit is still local — user can `git reset --hard HEAD~1` to undo
