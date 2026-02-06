# Architecture: Webchat Channel Registration

## Implementation Approach

Webchat becomes a first-class channel by following the same registration and routing patterns used by Discord, Telegram, and Slack. The feature touches four areas:

1. **Channel registry** — Add webchat to `CHAT_CHANNEL_ORDER` and `CHAT_CHANNEL_META` in `src/channels/registry.ts`
2. **Binding schema** — Add `workspaceId` and `label` fields to the binding schema in `src/config/zod-schema.agents.ts`
3. **Routing** — Add workspace matching to `resolveAgentRoute()` in `src/routing/resolve-route.ts`, slotting into the existing priority hierarchy after `teamId`
4. **Session display** — Extend session metadata to include workspace info, enabling human-friendly names in the dropdown

The implementation mirrors how Discord uses `guildId` for server-based routing. Workspace IDs are config-defined (via bindings), not dynamically created.

## Data Requirements

**No new persistent storage.** Workspace configuration lives in the existing bindings config. Session metadata already supports display names — we extend it to include workspace context.

**Session metadata additions:**

- `workspaceId` — the workspace identifier from the connection
- `workspaceName` — human-friendly name (from binding `label` or workspace ID as fallback)

These are transient metadata derived from config and connection params, not new stored state.

## Interface Design

### WebSocket Connection

The browser passes workspace context via existing connection parameters:

- `client.workspaceId` — workspace identifier (slug format: lowercase alphanumeric + hyphens, max 64 chars)
- `client.workspaceName` — display name (optional, can be derived from binding label)

Source priority for workspace ID: URL query param (`?workspace=<id>`) → localStorage → "default"

### Binding Configuration

```yaml
bindings:
  - agentId: work
    label: "ACME Corp"
    match:
      channel: webchat
      workspaceId: acme-corp
```

The `label` field provides the display name for sessions matching this binding. If omitted, the workspace ID is used.

### Workspace ID Validation

Validation occurs at two points:

| Location             | When        | Behaviour                                                                    |
| -------------------- | ----------- | ---------------------------------------------------------------------------- |
| Binding schema (Zod) | Config load | Invalid workspace IDs in bindings produce config validation errors           |
| Connection handler   | Runtime     | Invalid workspace IDs from browser fall back to "default" (with warning log) |

This mirrors how Discord handles `guildId` — config defines valid bindings, runtime handles arbitrary input gracefully.

### Routing Priority

Workspace matching slots into the existing hierarchy:

1. peer
2. parent peer
3. guild (Discord)
4. team (Slack)
5. **workspace (webchat)** ← new
6. account
7. channel
8. default

### Session Display

The session dropdown shows human-friendly names:

| Channel | Display Name Source               |
| ------- | --------------------------------- |
| Webchat | Binding `label` (or workspace ID) |
| Discord | Guild/server name from API        |
| Slack   | Team/workspace name from API      |
| Others  | Agent name                        |

## Dependencies

No new dependencies. The feature uses existing:

- Channel registry infrastructure
- Binding/routing system
- WebSocket connection protocol
- Session metadata storage

## Testing Strategy

**Unit tests:**

- Workspace matching in `resolve-route.test.ts` (parallel to existing guild/team tests)
- Display name building for webchat workspaces

**Integration tests:**

- Config validation accepts webchat workspace bindings
- Messages route to correct agent based on workspace
- Session list shows workspace display names

**Edge cases:**

- Unknown workspace ID → routes to default agent (with warning log)
- Missing workspace ID → treated as "default" workspace
- Existing sessions without workspace → continue working unchanged
