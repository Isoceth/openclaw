import { describe, expect, it } from "vitest";
import type { SessionConfig } from "../types.base.js";
import {
  evaluateSessionFreshness,
  resolveChannelResetConfig,
  resolveDailyResetAtMs,
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
      resetType: "dm",
      resetOverride: { mode: "never" },
    });
    expect(policy.mode).toBe("never");
  });
});
