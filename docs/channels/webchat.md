---
summary: "Browser-based chat interface via Gateway WebSocket"
read_when:
  - Setting up or debugging WebChat access
  - Understanding WebChat capabilities and configuration
title: "WebChat"
---

# WebChat (Browser)

Status: production-ready native chat UI using Gateway WebSocket. Available in macOS/iOS apps and Control UI.

## Quick setup

1. Start the gateway (`openclaw gateway run`).
2. Open the WebChat UI (macOS/iOS app chat tab or Control UI).
3. Ensure gateway auth is configured (required by default, even on loopback).

No additional channel configuration needed—WebChat uses the gateway endpoint directly.

## What it is

- A browser-based chat interface for the OpenClaw gateway (no embedded browser, no local static server).
- Direct messaging only (no groups, channels, or threads).
- Uses the same sessions and routing rules as other messaging channels.
- Deterministic routing: replies always go back to WebChat.
- Text-based with 4000 character message limit.

## Capabilities

| Feature              | Supported            |
| -------------------- | -------------------- |
| Chat types           | Direct messages only |
| Group chat           | ❌ No                |
| Threads              | ❌ No                |
| Reactions            | ❌ No                |
| Media (images/files) | ❌ No                |
| Polls                | ❌ No                |
| Native commands      | ❌ No                |
| Block streaming      | ❌ No                |

## How it works

- The UI connects to the Gateway WebSocket and uses:
  - `chat.history` — fetch conversation history
  - `chat.send` — send messages to the agent
  - `chat.inject` — append assistant notes directly to transcript (no agent run)
- History is always fetched from the gateway (no local file watching).
- If the gateway is unreachable, WebChat is read-only.

## Configuration

WebChat uses gateway-level settings; there is no dedicated `channels.webchat.*` config block.

Relevant global options:

- `gateway.port` — WebSocket port (default: 18789)
- `gateway.bind` — WebSocket bind address (default: loopback)
- `gateway.auth.mode` — Authentication mode (`token`, `password`, or `none`)
- `gateway.auth.token` — Bearer token for WebSocket auth
- `gateway.auth.password` — Password for WebSocket auth
- `gateway.remote.url` — Remote gateway target for tunnelling
- `gateway.remote.token` — Remote gateway auth token
- `gateway.remote.password` — Remote gateway auth password
- `session.*` — Session storage and agent binding configuration

See [Gateway Configuration](/gateway/configuration) for full details.

## Remote use

Remote mode tunnels the gateway WebSocket over SSH or Tailscale. No separate WebChat server is needed.

1. Configure `gateway.remote.url` to point to your remote gateway.
2. Set `gateway.remote.token` or `gateway.remote.password` for auth.
3. Connect via the WebChat UI.

## Session routing

WebChat follows standard OpenClaw routing:

- Each WebChat connection can include a `workspaceId` parameter to identify the originating workspace or application.
- Bindings route messages to specific agents based on the `workspaceId` (when configured).
- If no workspace-specific binding exists, WebChat defaults to the agent's main session.

### Workspace bindings

Configure workspace routing via the `bindings` array:

```json5
{
  bindings: [
    {
      agentId: "support",
      label: "Customer Support",
      match: {
        channel: "webchat",
        workspaceId: "acme-corp",
      },
    },
    {
      agentId: "internal",
      label: "Internal Chat",
      match: {
        channel: "webchat",
        workspaceId: "internal-team",
      },
    },
  ],
}
```

The `label` field provides a human-readable display name shown in session metadata and session dropdowns. If omitted, the raw `workspaceId` is displayed.

Workspace identifiers must be lowercase alphanumeric with hyphens, maximum 64 characters.

### Session metadata

WebChat sessions store workspace metadata for display in session lists and dropdowns:

- `workspaceId`: the identifier from the client connection parameters
- `workspaceName`: the display name resolved from the binding's `label` field

When a client connects with a `workspaceId` parameter, the gateway extracts this metadata and stores it in the session entry. The `workspaceName` is resolved by looking up the matching binding and using its `label` field. If no binding defines a label, the raw `workspaceId` is used as the display name.

This metadata appears in:

- Session dropdown menus in the UI
- Session list displays
- The session store entry under `workspaceId` and `workspaceName` fields

See [Channel Routing](/concepts/channel-routing), [Multi-Agent Routing](/concepts/multi-agent), and [Session Management](/concepts/session) for full routing and session details.

## Channel registry

WebChat is registered as a built-in channel in the OpenClaw channel registry:

- **ID:** `webchat`
- **Selection label:** "Webchat (Browser)"
- **Docs path:** `/channels/webchat`
- **System image:** globe (SF Symbols)

This enables WebChat to appear in channel selection UIs and capability queries alongside other messaging channels.

## Limitations

- **Direct messages only** — no support for group chats, channels, or threads
- **No media** — text-only interface (images, files, audio not supported)
- **No reactions or polls** — basic text exchange only
- **No native commands** — slash commands must be handled by the agent
- **Gateway dependency** — requires a running gateway; no offline mode

## Troubleshooting

**WebChat not connecting:**

- Verify gateway is running: `openclaw gateway status`
- Check gateway auth settings match your WebChat client config
- Verify firewall/network allows WebSocket connections to gateway port
- Check gateway logs for connection errors

**Messages not appearing:**

- Refresh history via the UI
- Check session configuration and agent bindings
- Verify gateway is processing messages (check gateway logs)

**Remote gateway issues:**

- Test connectivity: `curl -v [gateway.remote.url]/health`
- Verify auth token/password is correct
- Check SSH/Tailscale tunnel is active
- Review gateway logs on remote host

## Related documentation

- [Gateway Configuration](/gateway/configuration)
- [Gateway Routing](/gateway/routing)
- [Channel Overview](/channels/index)
- [Security](/gateway/security)
