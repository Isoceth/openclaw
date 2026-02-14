import { describe, expect, it } from "vitest";
import type { SessionsListResult } from "./types.ts";
import { resolveSessionDisplayName } from "./app-render.helpers.ts";

type SessionRow = SessionsListResult["sessions"][number];

function row(overrides: Partial<SessionRow> & { key: string }): SessionRow {
  return { kind: "direct", updatedAt: 0, ...overrides };
}

const agents = [{ id: "main", name: "Hex" }];

describe("resolveSessionDisplayName", () => {
  describe("main sessions", () => {
    it("returns agent name from agents list", () => {
      expect(
        resolveSessionDisplayName("agent:main:main", row({ key: "agent:main:main" }), agents),
      ).toBe("Hex");
    });

    it("falls back to agent ID when agents list is absent", () => {
      expect(resolveSessionDisplayName("agent:main:main")).toBe("main");
    });

    it("falls back to agent ID when agent is not in list", () => {
      expect(
        resolveSessionDisplayName("agent:other:main", row({ key: "agent:other:main" }), agents),
      ).toBe("other");
    });

    it("ignores gateway displayName — structural name wins", () => {
      expect(
        resolveSessionDisplayName(
          "agent:main:main",
          row({ key: "agent:main:main", displayName: "telegram:g-abc123" }),
          agents,
        ),
      ).toBe("Hex");
    });

    it("user label still takes priority over agent name", () => {
      expect(
        resolveSessionDisplayName(
          "agent:main:main",
          row({ key: "agent:main:main", label: "My Bot", displayName: "telegram:g-abc123" }),
          agents,
        ),
      ).toBe("My Bot");
    });
  });

  describe("non-agent keys", () => {
    it("uses gateway displayName", () => {
      expect(
        resolveSessionDisplayName(
          "discord:123:456",
          row({ key: "discord:123:456", displayName: "My Chat" }),
        ),
      ).toBe("My Chat");
    });

    it("returns label when set", () => {
      expect(
        resolveSessionDisplayName(
          "discord:123:456",
          row({ key: "discord:123:456", label: "General" }),
        ),
      ).toBe("General");
    });

    it("prefers label over displayName", () => {
      expect(
        resolveSessionDisplayName(
          "discord:123:456",
          row({ key: "discord:123:456", displayName: "My Chat", label: "General" }),
        ),
      ).toBe("General");
    });

    it("falls back to raw key when no metadata", () => {
      expect(resolveSessionDisplayName("discord:123:456", row({ key: "discord:123:456" }))).toBe(
        "discord:123:456",
      );
    });

    it("falls back to raw key when no row is provided", () => {
      expect(resolveSessionDisplayName("mykey")).toBe("mykey");
    });
  });

  describe("whitespace handling", () => {
    it("ignores whitespace-only displayName", () => {
      expect(
        resolveSessionDisplayName(
          "discord:123:456",
          row({ key: "discord:123:456", displayName: "   " }),
        ),
      ).toBe("discord:123:456");
    });

    it("ignores whitespace-only label", () => {
      expect(
        resolveSessionDisplayName("discord:123:456", row({ key: "discord:123:456", label: "   " })),
      ).toBe("discord:123:456");
    });

    it("trims displayName", () => {
      expect(
        resolveSessionDisplayName("mykey", row({ key: "mykey", displayName: "  My Chat  " })),
      ).toBe("My Chat");
    });
  });
});
