import { test } from "node:test";
import assert from "node:assert/strict";
import { streamText, simulateReadableStream, tool, stepCountIs } from "ai";
import { MockLanguageModelV3 } from "ai/test";
import { z } from "zod/v3";
import type { LanguageModelV3StreamPart } from "@ai-sdk/provider";
import { adviceGuardTransform, type GuardEvent } from "../lib/guardrails/adviceGuard";
import { SAFE_FALLBACK } from "../lib/guardrails/advice";

const usage = {
  inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 },
  outputTokens: { total: 1, text: 1, reasoning: 0 },
};
const finish = (unified: "stop" | "tool-calls"): LanguageModelV3StreamPart => ({ type: "finish", finishReason: { unified, raw: unified }, usage });
const textParts = (chunks: string[]): LanguageModelV3StreamPart[] => [
  { type: "text-start", id: "t" },
  ...chunks.map((delta) => ({ type: "text-delta" as const, id: "t", delta })),
  { type: "text-end", id: "t" },
];

const textModel = (chunks: string[]) =>
  new MockLanguageModelV3({
    doStream: async () => ({ stream: simulateReadableStream({ chunks: [...textParts(chunks), finish("stop")] }) }),
  });

async function run(chunks: string[], rewrite: (d: string) => Promise<string>) {
  const events: GuardEvent[] = [];
  const result = streamText({
    model: textModel(chunks),
    prompt: "Should I sell QQQM?",
    experimental_transform: adviceGuardTransform({ rewrite, onResult: (e) => events.push(e) }),
  });
  const deltas: string[] = [];
  for await (const d of result.textStream) deltas.push(d);
  return { deltas, text: await result.text, events };
}

test("safe answers pass unchanged, released in one piece after the check", async () => {
  const r = await run(["QQQM tracks ", "the Nasdaq-100. ", "Trade-offs include concentration."], async () => "unused");
  assert.equal(r.text, "QQQM tracks the Nasdaq-100. Trade-offs include concentration.");
  assert.equal(r.deltas.length, 1);
  assert.deepEqual(r.events, [{ stage: "passed" }]);
});

test("advice wording never reaches the reader: it is rewritten", async () => {
  const r = await run(["You should sell ", "QQQM now."], async () => "Some investors reduce concentration; the trade-offs are...");
  assert.ok(!r.deltas.join("").includes("You should sell"));
  assert.equal(r.text, "Some investors reduce concentration; the trade-offs are...");
  assert.equal(r.events[0].stage, "rewritten");
});

test("if the rewrite still fails or errors, the safe fallback is shown", async () => {
  const bad = await run(["You should buy SOXX, guaranteed return."], async () => "You should buy it anyway.");
  assert.equal(bad.text, SAFE_FALLBACK);
  const err = await run(["I recommend you buy CSPX."], async () => { throw new Error("network"); });
  assert.equal(err.text, SAFE_FALLBACK);
  assert.equal(err.events[0].stage, "fallback");
});

test("tool results (sources, projections) still stream before the checked text", async () => {
  let call = 0;
  const model = new MockLanguageModelV3({
    doStream: async () => {
      call++;
      const chunks: LanguageModelV3StreamPart[] = call === 1
        ? [{ type: "tool-call", toolCallId: "t1", toolName: "lookup", input: "{\"q\":\"fif\"}" }, finish("tool-calls")]
        : [...textParts(["You should buy ", "now."]), finish("stop")];
      return { stream: simulateReadableStream({ chunks }) };
    },
  });
  const order: string[] = [];
  const result = streamText({
    model, prompt: "q", stopWhen: stepCountIs(3),
    tools: { lookup: tool({ inputSchema: z.object({ q: z.string() }), execute: async () => ["source"] }) },
    experimental_transform: adviceGuardTransform({ rewrite: async () => "Educational version." }),
  });
  for await (const part of result.fullStream) if (part.type === "tool-result" || part.type === "text-delta") order.push(part.type === "text-delta" ? `text:${part.text}` : "tool-result");
  assert.deepEqual(order, ["tool-result", "text:Educational version."]);
  assert.equal(await result.text, "Educational version.");
});
