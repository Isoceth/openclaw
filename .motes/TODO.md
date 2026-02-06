# Webchat Channel Registration - TODO

<!-- TODO Review session display name collision for webchat [kxxh] -->
<!-- type: task | priority: normal | scope: trivial -->
<!-- tags: review:branch-feature-webchat-channel, ux -->
<!-- When multiple webchat sessions exist without workspace bindings, they may all display the same workspaceId fallback value. -->
<!-- Consider adding unique identifier or timestamp suffix when falling back to workspaceId for display name. -->
<!-- Location: src/gateway/session-utils.ts:615-617 -->
<!-- Workaround: Sessions remain distinguishable by sessionKey and sessionId in underlying data. -->
<!-- --- -->

<!-- TODO Add edge case validation tests for workspaceId [9xkf] -->
<!-- type: task | priority: high | scope: moderate -->
<!-- tags: review:branch-feature-webchat-channel, test-coverage -->
<!-- Workspace routing tests cover happy path but miss edge cases for invalid input. -->
<!-- Add tests for: empty string, whitespace, uppercase, underscore, exceeds 64 chars. -->
<!-- Location: src/routing/resolve-route.test.ts -->
<!-- Expected: Zod schema correctly rejects invalid values; routing handles missing/invalid IDs gracefully. -->
<!-- --- -->

<!-- TODO Standardise nullability patterns in workspace metadata extraction [zc17] -->
<!-- type: task | priority: low | scope: trivial -->
<!-- tags: review:branch-feature-webchat-channel, code-quality -->
<!-- Inconsistent use of optional chaining and ternary for null checks across metadata.ts and chat.ts. -->
<!-- Choose one style (explicit null checks vs optional chaining) and apply consistently. -->
<!-- Location: src/config/sessions/metadata.ts:163-164, src/gateway/server-methods/chat.ts:461-464 -->
<!-- Current code is functionally correct but could be clearer. -->
<!-- --- -->

<!-- TODO Implement spawn command test suite before merging [97je] -->
<!-- type: task | priority: critical | scope: significant -->
<!-- tags: review:branch-feature-spawn-command, test-coverage -->
<!-- The spawn command has zero test coverage despite being 415 lines with complex validation, RPC integration, and error handling. -->
<!-- All 21 tests in spawn.test.ts are marked .todo(). Project uses TDD with 70% coverage thresholds. -->
<!-- Priority order: (1) Input validation tests, (2) Gateway integration tests with mocked RPC calls, (3) Agent resolution tests, (4) Output modes (terminal/JSON/deliver), (5) Timeout validation, (6) Error handling and exit codes, (7) SIGINT cancellation. -->
<!-- Location: src/commands/spawn.test.ts -->
<!-- Impact: Without tests, regressions in critical paths (input handling, RPC interaction, error messaging) will not be caught. -->
<!-- --- -->

<!-- TODO Gateway RPC error propagation lacks spawn-specific context [apit] -->
<!-- type: task | priority: high | scope: moderate -->
<!-- tags: review:branch-feature-spawn-command, error-handling -->
<!-- When gateway RPC calls fail during spawn operations, users receive generic RPC errors without session key, transcript path, or operation stage context. -->
<!-- Affects: session.patch failures, agent spawn RPC failures, agent.wait failures, chat.history retrieval failures, delivery failures. -->
<!-- Wrap critical RPC calls in try-catch blocks that add spawn-specific context (session key, transcript path, which operation failed) and distinguish between spawn failure vs. completion-but-retrieval-failure vs. delivery-failure. -->
<!-- Location: Multiple locations in src/commands/spawn.ts (lines 141, 159, 206, 229, 306, 330) -->
<!-- Impact: Makes debugging difficult, especially for timeout cases where the subagent may have completed but response retrieval timed out. -->
<!-- --- -->
