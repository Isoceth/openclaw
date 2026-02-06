# Promote Staging to Main

Squash-merge staging into main so main gets a single clean commit, then realign staging.

```
staging:  A──B──C──D
                    \
main:     X──────────S  (squash commit)

After realign:
main:     X──S
staging:  X──S  (reset to match main)
```

## Prerequisites

- Working tree must be clean (no uncommitted changes)
- You must be on the `staging` branch
- All changes on staging must be committed and pushed

## Workflow

### Phase 1: Pre-flight Checks

1. Verify clean working tree and correct branch:

   ```bash
   git status
   git branch --show-current
   ```

   **Stop if dirty.** Ask the user to commit first.
   **Stop if not on staging.** Switch or ask the user.

2. Ensure staging is pushed:

   ```bash
   git log origin/staging..staging --oneline
   ```

   If there are unpushed commits, push them:

   ```bash
   git push origin staging
   ```

3. Summarise what's being promoted:

   ```bash
   git log --oneline main..staging
   ```

   Present the commit list and ask the user to confirm the squash merge.

### Phase 2: Squash Merge

1. Switch to main:

   ```bash
   git switch main
   ```

2. Pull latest main (in case of remote changes):

   ```bash
   git pull origin main
   ```

3. Squash merge staging into main:

   ```bash
   git merge --squash staging
   ```

4. Commit with a summary message. Use the commit list from Phase 1 to write a meaningful message:

   ```bash
   git commit -m "$(cat <<'EOF'
   <summary of what this promotion includes>

   Squash merge of staging into main.

   Includes:
   - <bullet points from the commit list>
   EOF
   )"
   ```

   Ask the user to review the commit message before committing.

5. Push main:

   ```bash
   git push origin main
   ```

### Phase 3: Realign Staging

**This is the critical step that prevents divergence.** After squash-merging, staging's history has diverged from main. The individual commits on staging are now redundant — their content lives in the squash commit on main. Staging must be reset to match main.

1. Switch back to staging:

   ```bash
   git switch staging
   ```

2. Reset staging to match main exactly:

   ```bash
   git reset --hard main
   ```

3. Force-push staging (required because history was rewritten):

   ```bash
   git push --force-with-lease origin staging
   ```

4. Verify alignment:

   ```bash
   git log --oneline -1 main
   git log --oneline -1 staging
   ```

   Both branches should point to the same commit.

### Phase 4: Install & Link

Reinstall dependencies and relink, since the squash merge may have changed `package.json` or lockfiles:

```bash
pnpm install && npm link
```

### Phase 5: Verify

Confirm final state:

```bash
git log --oneline main..staging
git log --oneline staging..main
```

Both should be empty — the branches are identical.

Report success with the squash commit SHA.

## Why the Realign Step Matters

Without realigning, staging keeps its old commits while main has the squash. Next time you try to merge staging → main, git sees the old commits as new work and you get conflicts or duplicate changes. Resetting staging to main after each promotion keeps them in sync.

## Safety Notes

- **Never skip Phase 3** (realign) — this is the whole point of the command
- The `--force-with-lease` on staging push is safe: nobody else pushes to staging
- If Phase 2 fails or conflicts arise, you're still on main with uncommitted squash changes — `git merge --abort` or `git reset --hard HEAD` to undo
- Keep the user informed at each step
