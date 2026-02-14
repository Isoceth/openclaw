---
summary: "WebChat channel documentation (redirects to canonical location)"
read_when:
  - Setting up or debugging WebChat access
title: "WebChat"
---

# WebChat

**This documentation has moved.**

See [WebChat Channel Documentation](/channels/webchat) for complete setup, configuration, and usage information.

WebChat is a browser-based chat interface that connects to the OpenClaw gateway via WebSocket. It's now registered as a built-in channel alongside Telegram, WhatsApp, Discord, and other messaging platforms.

## Quick links

1. Start the gateway.
2. Open the WebChat UI (macOS/iOS app) or the Control UI chat tab.
3. Ensure gateway auth is configured (required by default, even on loopback).

## How it works (behavior)

- The UI connects to the Gateway WebSocket and uses `chat.history`, `chat.send`, and `chat.inject`.
- `chat.inject` appends an assistant note directly to the transcript and broadcasts it to the UI (no agent run).
- History is always fetched from the gateway (no local file watching).
- If the gateway is unreachable, WebChat is read-only.

## Remote use

- Remote mode tunnels the gateway WebSocket over SSH/Tailscale.
- You do not need to run a separate WebChat server.

## Configuration reference (WebChat)

Full configuration: [Configuration](/gateway/configuration)

Channel options:

- No dedicated `webchat.*` block. WebChat uses the gateway endpoint + auth settings below.

Related global options:

- `gateway.port`, `gateway.bind`: WebSocket host/port.
- `gateway.auth.mode`, `gateway.auth.token`, `gateway.auth.password`: WebSocket auth (token/password).
- `gateway.auth.mode: "trusted-proxy"`: reverse-proxy auth for browser clients (see [Trusted Proxy Auth](/gateway/trusted-proxy-auth)).
- `gateway.remote.url`, `gateway.remote.token`, `gateway.remote.password`: remote gateway target.
- `session.*`: session storage and main key defaults.
