---
summary: "Routing rules per channel (WhatsApp, Telegram, Discord, Slack) and shared context"
read_when:
  - Changing channel routing or inbox behavior
title: "Channel Routing"
---

# Channels & routing

OpenClaw routes replies **back to the channel where a message came from**. The
model does not choose a channel; routing is deterministic and controlled by the
host configuration.

## Key terms

- **Channel**: `whatsapp`, `telegram`, `discord`, `slack`, `signal`, `imessage`, `webchat`.
- **AccountId**: per‑channel account instance (when supported).
- **AgentId**: an isolated workspace + session store (“brain”).
- **SessionKey**: the bucket key used to store context and control concurrency.

## Session key shapes (examples)

Direct messages collapse to the agent’s **main** session:

- `agent:<agentId>:<mainKey>` (default: `agent:main:main`)

Groups and channels remain isolated per channel:

- Groups: `agent:<agentId>:<channel>:group:<id>`
- Channels/rooms: `agent:<agentId>:<channel>:channel:<id>`

Threads:

- Slack/Discord threads append `:thread:<threadId>` to the base key.
- Telegram forum topics embed `:topic:<topicId>` in the group key.

Examples:

- `agent:main:telegram:group:-1001234567890:topic:42`
- `agent:main:discord:channel:123456:thread:987654`

## Routing rules (how an agent is chosen)

Routing picks **one agent** for each inbound message:

1. **Exact peer match** (`bindings` with `peer.kind` + `peer.id`).
2. **Parent peer match** (thread inheritance).
3. **Guild + roles match** (Discord) via `guildId` + `roles`.
4. **Guild match** (Discord) via `guildId`.
5. **Team match** (Slack) via `teamId`.
6. **Workspace match** (webchat) via `workspaceId`.
7. **Account match** (`accountId` on the channel).
8. **Channel match** (any account on that channel, `accountId: "*"`).
9. **Default agent** (`agents.list[].default`, else first list entry, fallback to `main`).

When a binding includes multiple match fields (`peer`, `guildId`, `teamId`, `workspaceId`, `roles`), **all provided fields must match** for that binding to apply.

The matched agent determines which workspace and session store are used.

## Broadcast groups (run multiple agents)

Broadcast groups let you run **multiple agents** for the same peer **when OpenClaw would normally reply** (for example: in WhatsApp groups, after mention/activation gating).

Config:

```json5
{
  broadcast: {
    strategy: "parallel",
    "120363403215116621@g.us": ["alfred", "baerbel"],
    "+15555550123": ["support", "logger"],
  },
}
```

See: [Broadcast Groups](/channels/broadcast-groups).

## Webchat workspace routing

Webchat supports routing messages based on the workspace origin, allowing different domains or applications to route to specific agents.

Bindings can match on `workspaceId` to route webchat traffic:

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

The `label` field provides a human-readable display name that is:

- Stored in the session entry as `workspaceName`
- Displayed in session dropdowns and session lists
- Used as the fallback display name when no explicit `displayName` exists

If no binding defines a label, the raw `workspaceId` is used as the display name.

Workspace identifiers must be lowercase alphanumeric with hyphens, maximum 64 characters.

See [WebChat](/channels/webchat) and [Session Management](/concepts/session) for details on workspace metadata storage and display.

## Config overview

- `agents.list`: named agent definitions (workspace, model, etc.).
- `bindings`: map inbound channels/accounts/peers to agents.

Example:

```json5
{
  agents: {
    list: [{ id: "support", name: "Support", workspace: "~/.openclaw/workspace-support" }],
  },
  bindings: [
    { match: { channel: "slack", teamId: "T123" }, agentId: "support" },
    { match: { channel: "telegram", peer: { kind: "group", id: "-100123" } }, agentId: "support" },
    {
      match: { channel: "webchat", workspaceId: "acme-corp" },
      agentId: "support",
      label: "Acme Support",
    },
  ],
}
```

## Session storage

Session stores live under the state directory (default `~/.openclaw`):

- `~/.openclaw/agents/<agentId>/sessions/sessions.json`
- JSONL transcripts live alongside the store

You can override the store path via `session.store` and `{agentId}` templating.

## WebChat behavior

WebChat attaches to the **selected agent** based on the workspace routing rules. When a `workspaceId` is provided in the connection parameters, it routes to the agent bound to that workspace (if configured), otherwise to the default agent.

WebChat sessions default to the agent's main session, allowing you to see cross-channel context for that agent in one place.

## Reply context

Inbound replies include:

- `ReplyToId`, `ReplyToBody`, and `ReplyToSender` when available.
- Quoted context is appended to `Body` as a `[Replying to ...]` block.

This is consistent across channels.
