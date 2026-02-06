# Webchat Channel Registration

## Goal

OpenClaw's webchat is currently a second-class citizen: it uses a hardcoded constant (`INTERNAL_MESSAGE_CHANNEL = "webchat"`) rather than being a proper registered channel like Discord, Telegram, or Slack. This means webchat lacks binding support for workspace groupings, doesn't appear in channel listings, and can't route messages to different agents based on context.

This feature registers webchat as a first-class channel with workspace-based routing — analogous to how Discord uses guild IDs and Slack uses team IDs. Users will be able to configure bindings that route webchat messages to different agents based on a workspace identifier, and the session dropdown will display human-friendly workspace names instead of opaque session keys.

## Key Decisions

**Full channel registration:** Webchat will be added to `CHAT_CHANNEL_ORDER` and `CHAT_CHANNEL_META` like other channels. This reduces special-case handling and means webchat follows the same patterns throughout the codebase.

**Open workspace access:** Anyone with gateway access can use any workspace ID. There's no additional authentication layer for workspaces — gateway auth is sufficient.

**Pre-defined workspaces:** Workspace IDs must be defined in config (via bindings). Arbitrary strings from the browser will not create new workspaces; if no binding matches, routing falls back to channel/default binding.

**Backwards compatibility via default workspace:** Existing webchat sessions without workspace configuration continue working. Connections without a workspace ID are treated as using the "default" workspace.

## Requirements

### Functional

**Channel Registration**

- Webchat appears in `CHAT_CHANNEL_ORDER` and `CHAT_CHANNEL_META` alongside other channels
- Webchat shows in channel status output (`openclaw channels status`)
- Webchat follows the same metadata patterns as Discord, Telegram, Slack

**Workspace Routing**

- Bindings can match on `workspaceId` for the webchat channel (parallel to `guildId` for Discord, `teamId` for Slack)
- Routing priority: peer → guild → team → workspace → account → channel → default
- Workspace ID is passed from the browser client via WebSocket connection parameters
- The browser can specify workspace via URL query parameter (`?workspace=<id>`) or localStorage

**Binding Configuration**

Workspace bindings follow the existing binding format with a `workspaceId` match field. A `label` field provides the display name:

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

**Workspace ID Constraints**

- Workspace IDs must be slug-like: lowercase alphanumeric characters and hyphens
- Maximum length: 64 characters
- Examples: `acme-corp`, `home`, `team-alpha`, `default`

**Unknown Workspace Handling**

- When a workspace ID doesn't match any binding, route to the default agent
- Log a warning when an unknown workspace ID is used (for debugging misconfigurations)

**Session Display Names**

- Session dropdown shows human-friendly names instead of opaque session keys
- Webchat sessions display the workspace name (e.g., "ACME Corp")
- Discord sessions display the guild/server name
- Slack sessions display the workspace/team name
- This applies to all channels, not just webchat

Friendly names come from:

- **Webchat:** Workspace display name from the binding (or workspace ID if no display name configured)
- **Discord/Slack:** Guild/team name from the platform API (already available)
- **Other channels:** Agent name (agents already have friendly names in config)

**Backwards Compatibility**

- Existing webchat sessions without workspace configuration continue working
- Connections without a workspace ID route as if workspace is "default"
- No migration required for existing sessions

### Out of Scope

- Workspace management UI (creating, renaming, deleting workspaces from UI)
- Workspace membership or access control beyond gateway authentication
- Documentation updates (deferred to follow-up work)
- Webchat-specific features beyond routing (this is channel registration, not a webchat overhaul)
