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

4. **Spawn a team of Explore agents** to assess the incoming changes in parallel:
   - Each agent examines a subset of the commits
   - Reports: what changed, which files, potential conflict areas with our modifications
   - Flags commits that touch files we've heavily modified (high conflict risk)

5. Present a summary to the user:
   - Total commits incoming
   - Categories of changes
   - Conflict risk assessment (which files are likely to conflict)
   - Ask the user whether to proceed with the merge

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

### Phase 4: Push

Ask the user if they want to push staging to origin:

```bash
git push origin staging
```

## Safety Notes

- **Never merge upstream directly into main** — staging is the integration target
- **Never force-push staging** without explicit user approval
- Keep the user informed at each step
- If verification fails, the merge commit is still local — user can `git reset --hard HEAD~1` to undo
