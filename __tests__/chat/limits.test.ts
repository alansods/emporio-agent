import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { MAX_MESSAGE_CHARS, MAX_MESSAGES } from "@/lib/chat/limits";

const config = readFileSync(join(process.cwd(), "emporio_agent/config.py"), "utf8");

function pythonConstant(name: string): number {
  const match = config.match(new RegExp(`^${name} = ([\\d_]+)$`, "m"));
  if (!match?.[1]) throw new Error(`${name} not found in config.py`);
  return Number(match[1].replaceAll("_", ""));
}

describe("client limits", () => {
  it("match the API message count limit", () => {
    expect(MAX_MESSAGES).toBe(pythonConstant("MAX_MESSAGES"));
  });

  it("match the API message length limit", () => {
    expect(MAX_MESSAGE_CHARS).toBe(pythonConstant("MAX_MESSAGE_CHARS"));
  });
});
