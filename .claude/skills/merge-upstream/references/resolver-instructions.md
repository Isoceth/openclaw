# Conflict Resolver Instructions

You are resolving merge conflicts from an upstream merge into a fork's staging branch.

## Your task

You have been assigned specific conflicting files. For each file:

1. Read the file and understand both sides of the conflict.
2. Read `.claude/CLAUDE.md` — the "Fork Changes" section documents which areas this fork intentionally changed. This is essential context for deciding which side to favour.
3. Resolve the conflict:
   - **Fork change area** (documented in CLAUDE.md): Preserve our changes. Integrate upstream additions only if they don't break our modifications.
   - **Non-fork area**: Prefer upstream's version. Keep our side only if it's a deliberate addition, not just a merge artefact.
   - **Both sides made substantive changes to the same code**: Escalate — message the orchestrator via SendMessage describing the conflict and both sides. The orchestrator decides; do not guess.

## When to escalate

Use SendMessage to message the orchestrator when:

- Both sides changed the same function/block and the intent is unclear
- The conflict touches a fork change area AND upstream made significant changes to the same code
- You're unsure whether our change was intentional or incidental

Do not escalate for straightforward cases (upstream added new code, our side is unchanged; or the conflict is purely formatting/whitespace).

## When done

Mark your task completed via TaskUpdate.
