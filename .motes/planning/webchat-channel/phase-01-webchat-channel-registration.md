# Phase 01: Webchat Channel Registration with Workspace Routing

## Overview

Register webchat as a first-class channel with workspace-based routing, enabling users to configure bindings that route webchat messages to different agents based on workspace context, with human-friendly names displayed in the session dropdown.

## Goal

Users can configure workspace-based bindings for webchat and see human-friendly workspace names in the session dropdown.

## Scope

### Channel Registration

**User experience:**
Webchat appears alongside Discord, Telegram, and Slack as a proper channel in the system.

**Behaviours:**

- `openclaw channels status` lists webchat with connection status
- Webchat follows the same metadata patterns as other channels (icon, display name, capabilities)
- Channel-level bindings (`match.channel: webchat`) work identically to other channels

**Acceptance criteria:**

- [ ] Webchat appears in `openclaw channels status` output
- [ ] Webchat entry in channel registry includes appropriate metadata (display name, icon)

### Workspace Routing

**User experience:**
Users configure bindings with workspace IDs to route webchat messages to different agents. The browser specifies which workspace to connect to.

**Behaviours:**

- Bindings can match on `workspaceId` for webchat channel
- Browser specifies workspace via URL query parameter (`?workspace=acme-corp`) or localStorage
- When no workspace specified, connection uses "default" workspace
- Routing checks workspace match after team/guild, before account

**Configuration example:**

```yaml
bindings:
  - agentId: work
    label: "ACME Corp"
    match:
      channel: webchat
      workspaceId: acme-corp
  - agentId: personal
    label: "Home"
    match:
      channel: webchat
      workspaceId: home
```

**Acceptance criteria:**

- [ ] Binding with `match.workspaceId: acme-corp` routes webchat messages to configured agent
- [ ] URL parameter `?workspace=acme-corp` connects to that workspace
- [ ] Missing workspace parameter routes to default agent
- [ ] Workspace ID persists in localStorage for subsequent visits

### Workspace ID Validation

**User experience:**
Workspace IDs follow a predictable slug format. Invalid IDs in config produce clear validation errors; invalid IDs from browser fall back gracefully.

**Constraints:**

- Slug format: lowercase alphanumeric characters and hyphens only
- Maximum length: 64 characters
- Valid examples: `acme-corp`, `home`, `team-alpha`, `default`
- Invalid examples: `ACME Corp`, `my_workspace`, `workspace!`

**Behaviours:**

- Invalid workspace ID in binding config: validation error at config load
- Invalid workspace ID from browser: falls back to default workspace, warning logged

**Acceptance criteria:**

- [ ] Config with invalid workspace ID (e.g., `workspaceId: "Invalid Workspace!"`) fails validation with clear error
- [ ] Browser request with invalid workspace ID falls back to default agent
- [ ] Warning logged when unknown/invalid workspace ID received from browser

### Session Display Names

**User experience:**
Session dropdown shows human-friendly workspace names instead of opaque session keys.

**Behaviours:**

- Webchat sessions display the workspace name (from binding `label` or workspace ID as fallback)
- Discord sessions display guild/server name
- Slack sessions display team/workspace name
- Other channels display agent name

**Display name resolution:**

1. Binding `label` field (if configured)
2. Workspace ID (if no label)
3. Agent name (fallback for sessions without workspace)

**Acceptance criteria:**

- [ ] Session dropdown shows "ACME Corp" for sessions matching binding with that label
- [ ] Session dropdown shows workspace ID when binding has no label
- [ ] Existing sessions without workspace show agent name

### Backwards Compatibility

**User experience:**
Existing webchat users experience no disruption. Sessions created before this feature continue working.

**Behaviours:**

- Connections without workspace ID route to default agent (same as before)
- Existing sessions without workspace metadata display normally
- No migration required for existing sessions or config

**Acceptance criteria:**

- [ ] Webchat without workspace parameter continues routing to default agent
- [ ] Existing sessions without workspace metadata display unchanged
- [ ] Config without workspace bindings works as before

## Technical Design

### Technology Choices

| Choice                | Decision                                                    | Rationale                                                     |
| --------------------- | ----------------------------------------------------------- | ------------------------------------------------------------- |
| Channel registry      | Existing `CHAT_CHANNEL_ORDER` / `CHAT_CHANNEL_META` pattern | Consistency with Discord, Telegram, Slack registration        |
| Workspace storage     | Config-defined via bindings                                 | No dynamic workspace creation; mirrors Discord guild approach |
| Connection parameters | Existing WebSocket client params                            | No protocol changes needed                                    |

### Data Models

#### Binding Schema Additions

| Field       | Type   | Constraints               | Notes                     |
| ----------- | ------ | ------------------------- | ------------------------- |
| workspaceId | string | Slug format, max 64 chars | Match field for routing   |
| label       | string | Optional                  | Display name for sessions |

**Validation:** Workspace ID validated at config load (Zod schema) and at connection time (runtime fallback).

#### Session Metadata Additions

| Field         | Type   | Source                        | Notes                       |
| ------------- | ------ | ----------------------------- | --------------------------- |
| workspaceId   | string | Connection params             | Workspace identifier        |
| workspaceName | string | Binding label or workspace ID | Human-friendly display name |

**Note:** These are transient metadata derived from config and connection params, not new stored state.

### Interface Contracts

#### WebSocket Connection Parameters

Browser passes workspace context via existing connection parameters:

| Parameter          | Type   | Required | Notes                              |
| ------------------ | ------ | -------- | ---------------------------------- |
| client.workspaceId | string | No       | Workspace identifier (slug format) |

**Source priority:** URL query param (`?workspace=<id>`) → localStorage → "default"

#### Channel Registry Entry

Webchat should be added to `CHAT_CHANNEL_META` with appropriate display name and icon, following the same pattern as Discord, Telegram, and Slack.

### Routing Priority

Workspace matching slots into existing hierarchy:

1. peer
2. parent peer
3. guild (Discord)
4. team (Slack)
5. **workspace (webchat)** ← new
6. account
7. channel
8. default

### Key Decisions

#### Open Workspace Access

**Context:** Should workspace access require additional authentication?

**Decision:** Anyone with gateway access can use any workspace ID.

**Rationale:** Gateway authentication is sufficient. Adding per-workspace auth would add complexity without clear benefit for the initial use case. Access control can be added later if needed.

#### Pre-defined Workspaces Only

**Context:** Should arbitrary workspace IDs from the browser create new workspaces?

**Decision:** No. Workspace IDs must be defined in config via bindings. Unknown IDs fall back to default.

**Rationale:** Mirrors Discord's approach where guilds are externally defined. Prevents unbounded workspace creation and keeps routing deterministic from config.

## Dependencies

None. This is the first phase of the webchat-channel milestone.

## Testing Focus

**Unit tests:**

- Workspace matching in routing (parallel to existing guild/team tests)
- Workspace ID validation (valid and invalid formats)
- Display name resolution (label → workspace ID → agent name fallback)

**Integration tests:**

- Config validation accepts webchat workspace bindings
- Messages route to correct agent based on workspace
- Session list shows workspace display names
- Unknown workspace falls back with warning log
