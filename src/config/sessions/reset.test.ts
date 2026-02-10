import { describe, expect, it } from "vitest";
import type { SessionConfig } from "../types.base.js";
import {
  evaluateSessionFreshness,
  resolveChannelResetConfig,
  resolveSessionResetPolicy,
  type SessionResetPolicy,
} from "./reset.js";

describe("evaluateSessionFreshness", () => {
  const HOUR_MS = 60 * 60 * 1000;

  it("marks session as stale after daily reset boundary", () => {
    const now = new Date("2026-02-06T09:00:00").getTime();
    const updatedAt = new Date("2026-02-05T23:00:00").getTime();
    const policy: SessionResetPolicy = { mode: "daily", atHour: 4 };
    const result = evaluateSessionFreshness({ updatedAt, now, policy });
    expect(result.fresh).toBe(false);
  });

  it("marks session as fresh before daily reset boundary", () => {
    const now = new Date("2026-02-06T03:00:00").getTime();
    const updatedAt = new Date("2026-02-05T23:00:00").getTime();
    const policy: SessionResetPolicy = { mode: "daily", atHour: 4 };
    const result = evaluateSessionFreshness({ updatedAt, now, policy });
    expect(result.fresh).toBe(true);
  });

  it("marks session as stale after idle timeout", () => {
    const now = Date.now();
    const updatedAt = now - 2 * HOUR_MS;
    const policy: SessionResetPolicy = { mode: "idle", atHour: 4, idleMinutes: 60 };
    const result = evaluateSessionFreshness({ updatedAt, now, policy });
    expect(result.fresh).toBe(false);
  });

  it("marks session as fresh within idle timeout", () => {
    const now = Date.now();
    const updatedAt = now - 30 * 60 * 1000;
    const policy: SessionResetPolicy = { mode: "idle", atHour: 4, idleMinutes: 60 };
    const result = evaluateSessionFreshness({ updatedAt, now, policy });
    expect(result.fresh).toBe(true);
  });

  it("never mode always returns fresh regardless of age", () => {
    const now = Date.now();
    // Session last updated a year ago — should still be fresh with "never" mode.
    const updatedAt = now - 365 * 24 * HOUR_MS;
    const policy: SessionResetPolicy = { mode: "never", atHour: 4 };
    const result = evaluateSessionFreshness({ updatedAt, now, policy });
    expect(result.fresh).toBe(true);
    expect(result.dailyResetAt).toBeUndefined();
    expect(result.idleExpiresAt).toBeUndefined();
  });

  it("never mode ignores idleMinutes even if present on policy", () => {
    const now = Date.now();
    const updatedAt = now - 2 * HOUR_MS;
    const policy: SessionResetPolicy = { mode: "never", atHour: 4, idleMinutes: 30 };
    const result = evaluateSessionFreshness({ updatedAt, now, policy });
    expect(result.fresh).toBe(true);
  });
});

describe("resolveChannelResetConfig", () => {
  it("returns explicit config for a channel", () => {
    const sessionCfg: SessionConfig = {
      resetByChannel: {
        discord: { mode: "idle", idleMinutes: 120 },
      },
    };
    const result = resolveChannelResetConfig({ sessionCfg, channel: "discord" });
    expect(result).toEqual({ mode: "idle", idleMinutes: 120 });
  });

  it("returns never mode as default for webchat when no explicit config", () => {
    const result = resolveChannelResetConfig({ sessionCfg: {}, channel: "webchat" });
    expect(result).toEqual({ mode: "never" });
  });

  it("returns never mode for webchat even when resetByChannel exists but has no webchat entry", () => {
    const sessionCfg: SessionConfig = {
      resetByChannel: {
        discord: { mode: "idle", idleMinutes: 120 },
      },
    };
    const result = resolveChannelResetConfig({ sessionCfg, channel: "webchat" });
    expect(result).toEqual({ mode: "never" });
  });

  it("respects explicit webchat override from config", () => {
    const sessionCfg: SessionConfig = {
      resetByChannel: {
        webchat: { mode: "idle", idleMinutes: 480 },
      },
    };
    const result = resolveChannelResetConfig({ sessionCfg, channel: "webchat" });
    expect(result).toEqual({ mode: "idle", idleMinutes: 480 });
  });

  it("returns undefined for non-webchat channels without explicit config", () => {
    const result = resolveChannelResetConfig({ sessionCfg: {}, channel: "telegram" });
    expect(result).toBeUndefined();
  });

  it("returns undefined when channel is missing", () => {
    const result = resolveChannelResetConfig({ sessionCfg: {}, channel: undefined });
    expect(result).toBeUndefined();
  });
});

describe("resolveSessionResetPolicy with never mode", () => {
  it("passes through never mode from channel override", () => {
    const policy = resolveSessionResetPolicy({
      sessionCfg: {},
      resetType: "direct",
      resetOverride: { mode: "never" },
    });
    expect(policy.mode).toBe("never");
  });
});

describe("resolveSessionResetPolicy", () => {
  describe("backward compatibility: resetByType.dm → direct", () => {
    it("uses resetByType.direct when available", () => {
      const sessionCfg = {
        resetByType: {
          direct: { mode: "idle" as const, idleMinutes: 30 },
        },
      } satisfies SessionConfig;

      const policy = resolveSessionResetPolicy({
        sessionCfg,
        resetType: "direct",
      });

      expect(policy.mode).toBe("idle");
      expect(policy.idleMinutes).toBe(30);
    });

    it("falls back to resetByType.dm (legacy) when direct is missing", () => {
      // Simulating legacy config with "dm" key instead of "direct"
      const sessionCfg = {
        resetByType: {
          dm: { mode: "idle" as const, idleMinutes: 45 },
        },
      } as unknown as SessionConfig;

      const policy = resolveSessionResetPolicy({
        sessionCfg,
        resetType: "direct",
      });

      expect(policy.mode).toBe("idle");
      expect(policy.idleMinutes).toBe(45);
    });

    it("prefers resetByType.direct over resetByType.dm when both present", () => {
      const sessionCfg = {
        resetByType: {
          direct: { mode: "daily" as const },
          dm: { mode: "idle" as const, idleMinutes: 99 },
        },
      } as unknown as SessionConfig;

      const policy = resolveSessionResetPolicy({
        sessionCfg,
        resetType: "direct",
      });

      expect(policy.mode).toBe("daily");
    });

    it("does not use dm fallback for group/thread types", () => {
      const sessionCfg = {
        resetByType: {
          dm: { mode: "idle" as const, idleMinutes: 45 },
        },
      } as unknown as SessionConfig;

      const groupPolicy = resolveSessionResetPolicy({
        sessionCfg,
        resetType: "group",
      });

      // Should use default mode since group has no config and dm doesn't apply
      expect(groupPolicy.mode).toBe("daily");
    });
  });
});
