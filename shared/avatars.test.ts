import { existsSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { AVATARS, avatarName, isAvatarId } from "./avatars";

describe("avatares", () => {
  it("cada avatar tiene su imagen y no sobra ninguna", () => {
    for (const a of AVATARS) expect(existsSync(`public/avatares/${a.id}.webp`), a.id).toBe(true);
    expect(readdirSync("public/avatares").length).toBe(AVATARS.length);
  });

  it("no hay identificadores ni nombres repetidos", () => {
    expect(new Set(AVATARS.map((a) => a.id)).size).toBe(AVATARS.length);
    expect(new Set(AVATARS.map((a) => a.name)).size).toBe(AVATARS.length);
  });

  it("reconoce solo identificadores válidos", () => {
    expect(isAvatarId("panda")).toBe(true);
    expect(isAvatarId("../../secreto")).toBe(false);
    expect(isAvatarId(null)).toBe(false);
    expect(avatarName("trex")).toBe("T-Rex Día de Brazo");
    expect(avatarName(null)).toBeNull();
  });
});
