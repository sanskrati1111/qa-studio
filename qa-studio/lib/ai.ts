import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface PageSummary {
  url: string;
  title: string;
  headings: string[];
  linkCount: number;
  formCount: number;
  buttonTexts: string[];
  imageCount: number;
  consoleErrors: string[];
}

export interface AiTestCase {
  title: string;
  expectedResult: string;
  category: "FUNCTIONAL" | "UI";
}

/**
 * Asks Claude to propose additional, meaningful functional test cases
 * based on the structural summary of both pages — beyond the fixed
 * rule-based checks the test runner already performs.
 *
 * Kept to ONE call per run to control cost: both page summaries are
 * sent together so Claude can reason about differences directly.
 */
export async function generateAiTestCases(
  pageA: PageSummary,
  pageB: PageSummary
): Promise<AiTestCase[]> {
  const prompt = `You are a QA engineer generating a short list of additional functional test cases by comparing two rendered web pages.

PAGE A (reference): ${JSON.stringify(pageA, null, 2)}

PAGE B (target/dev): ${JSON.stringify(pageB, null, 2)}

Based on structural differences (headings, links, forms, buttons, images) between the two pages, propose up to 5 additional functional test cases that a human QA tester would meaningfully check. Skip anything already obvious from raw counts matching.

Respond ONLY with a JSON array, no preamble, no markdown fences, in this exact shape:
[{"title": string, "expectedResult": string, "category": "FUNCTIONAL" | "UI"}]

If there is nothing meaningful to add, respond with an empty array: []`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1000,
    messages: [{ role: "user", content: prompt }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") return [];

  try {
    const cleaned = textBlock.text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    // If Claude returns something unparseable, fail gracefully —
    // rule-based test cases still cover the run.
    return [];
  }
}

/**
 * Turns a raw failure (e.g. a stack trace or diff) into a short,
 * plain-English explanation for the QA report.
 */
export async function summarizeFailure(
  testTitle: string,
  expected: string,
  actual: string
): Promise<string> {
  const prompt = `A QA test case failed. Explain briefly (1-2 sentences, plain English, no jargon) what likely went wrong, for a QA report.

Test: ${testTitle}
Expected: ${expected}
Actual: ${actual}`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 200,
    messages: [{ role: "user", content: prompt }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  return textBlock && textBlock.type === "text"
    ? textBlock.text.trim()
    : "No summary available.";
}
