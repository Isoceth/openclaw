import { describe, it } from "vitest";

describe("spawn command", () => {
  describe("input validation", () => {
    it.todo("accepts task as positional argument");
    it.todo("accepts task via --message flag");
    it.todo("reads task from stdin when argument is -");
    it.todo("throws when no task provided");
    it.todo("throws when both positional and --message provided");
  });

  describe("agent selection", () => {
    it.todo("uses specified agent when --agent flag provided");
    it.todo("uses default agent when no --agent flag");
    it.todo("throws with agent list when invalid agent ID");
    it.todo("throws with guidance when no agents configured");
  });

  describe("gateway integration", () => {
    it.todo("spawns subagent via gateway RPC");
    it.todo("waits for completion via agent.wait");
    it.todo("retrieves response via chat.history");
  });

  describe("output modes", () => {
    it.todo("prints final response to stdout by default");
    it.todo("outputs structured JSON when --json flag provided");
    it.todo("delivers to chat channel when --deliver flag provided");
  });

  describe("error handling", () => {
    it.todo("shows error with session context on failure");
    it.todo("shows timeout error with duration");
    it.todo("exits with code 1 on failure");
    it.todo("exits with code 2 on timeout");
  });

  describe("cancellation", () => {
    it.todo("handles SIGINT gracefully");
    it.todo("exits with code 130 on cancellation");
  });
});
