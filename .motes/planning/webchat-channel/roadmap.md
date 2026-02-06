# Roadmap: Webchat Channel Registration

## Overview

This roadmap delivers webchat as a first-class channel with workspace-based routing in a single phase. The feature is cohesive — routing without session display doesn't deliver user value, as users couldn't see which workspace they're in.

## Phase 01: Webchat Channel Registration with Workspace Routing

**Goal:** Users can configure workspace-based bindings for webchat and see human-friendly workspace names in the session dropdown.

**Delivers:**

- Channel registration (webchat in `CHAT_CHANNEL_ORDER` and `CHAT_CHANNEL_META`)
- Webchat appears in `openclaw channels status` output
- `workspaceId` and `label` fields in binding schema
- Workspace matching in `resolveAgentRoute()` (priority: after `teamId`, before `account`)
- Workspace ID validation (slug format: lowercase alphanumeric + hyphens, max 64 chars)
- Workspace ID passed via WebSocket connection parameters
- URL query parameter (`?workspace=<id>`) and localStorage support for workspace selection
- Unknown workspace handling: fallback to default agent with warning log
- Session display shows human-friendly workspace names (from binding `label` or workspace ID)
- Backwards compatibility: existing sessions without workspace continue working

**Dependencies:** None

**Acceptance:**

1. Webchat listed in `openclaw channels status`
2. Binding with `match.workspaceId: acme-corp` routes webchat messages to the configured agent
3. Session dropdown shows "ACME Corp" (from binding label) instead of opaque session key
4. Webchat without workspace parameter continues routing to default agent
5. Invalid workspace ID (e.g., "Invalid Workspace!") falls back to default with warning in logs
6. Unit tests pass for workspace matching in `resolve-route.test.ts`
7. Integration tests pass for config validation, routing, and session display
