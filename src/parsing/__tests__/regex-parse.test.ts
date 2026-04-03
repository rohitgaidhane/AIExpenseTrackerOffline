/** @jest-environment node */

import { parseSmsWithRegex } from "@/parsing/regex-parse";
import { parsedTransactionFromLlmText } from "@/parsing/llm-parse";

describe("parseSmsWithRegex (Indian banking fast-pass)", () => {
  it("parses debited Rs with date DD-MM-YYYY", () => {
    const body =
      "Your A/c XX1234 is debited for Rs. 1,250.50 on 15-03-2024 towards UPI-SWIGGY. Avl Bal Rs 50,000.";
    const parsed = parseSmsWithRegex(body, Date.parse("2024-03-15"));
    expect(parsed).not.toBeNull();
    expect(parsed!.type).toBe("debit");
    expect(parsed!.amount).toBeCloseTo(1250.5, 5);
    expect(parsed!.currency).toBe("INR");
    expect(parsed!.date).toBe("2024-03-15");
  });

  it("parses INR credited", () => {
    const body =
      "INR 3,000.00 credited to A/c **5678 on 02/04/2026. Info: SALARY CREDIT";
    const parsed = parseSmsWithRegex(body);
    expect(parsed).not.toBeNull();
    expect(parsed!.type).toBe("credit");
    expect(parsed!.amount).toBe(3000);
  });

  it("parses debited from A/c phrasing", () => {
    const body =
      "Rs 99.00 debited from A/c *1234 on 31-MAR-2026 on AMAZON PAY. If not you, call bank.";
    const parsed = parseSmsWithRegex(body);
    expect(parsed).not.toBeNull();
    expect(parsed!.type).toBe("debit");
    expect(parsed!.amount).toBe(99);
  });

  it("returns null for conversational text", () => {
    expect(parseSmsWithRegex("Happy birthday! See you at 5pm.")).toBeNull();
  });
});

describe("parsedTransactionFromLlmText", () => {
  it("parses strict JSON from LLM output", () => {
    const text = `{"amount": 42.5, "currency": "INR", "merchant": "Uber", "date": "2026-04-01", "category": "Transport", "type": "debit"}`;
    const p = parsedTransactionFromLlmText(text, "", undefined);
    expect(p).not.toBeNull();
    expect(p!.amount).toBe(42.5);
    expect(p!.type).toBe("debit");
    expect(p!.category).toBe("Transport");
  });
});
