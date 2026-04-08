import type { LlamaContext } from "@pocketpalai/llama.rn";

import type { AccountSummary, CategorySlice } from "@/db/transactions-repo";

const TIPS_SYSTEM_PROMPT = `You are a personal finance advisor for Indian users.
Analyze the user's monthly spending data and give 3-5 specific, actionable money-saving tips.

Rules:
- Be specific — mention actual categories and amounts from the data
- Keep each tip to 1-2 sentences max
- Focus on the highest spending categories
- Suggest realistic alternatives (e.g. cooking at home vs Swiggy, public transport vs Uber)
- Respond ONLY as a JSON array of tip strings, no other text
- Example: ["Tip 1 here.", "Tip 2 here."]`;

export type SpendingTips = {
  tips: string[];
  generatedAt: string;
  source: "llm" | "rule";
};

/**
 * Rule-based tips when no LLM is available.
 * Always gives something useful even without AI.
 */
export function generateRuleTips(
  categories: CategorySlice[],
  totalDebit: number,
  totalCredit: number,
): SpendingTips {
  const tips: string[] = [];
  const top = categories.slice(0, 5);

  for (const cat of top) {
    const pct = totalDebit > 0 ? Math.round((cat.total / totalDebit) * 100) : 0;
    if (cat.category === "Food" && cat.total > 2000) {
      tips.push(`You spent ₹${Math.round(cat.total)} on food (${pct}% of expenses). Cooking at home even 3 days a week could save ₹${Math.round(cat.total * 0.3)}.`);
    } else if (cat.category === "Transport" && cat.total > 1500) {
      tips.push(`Transport costs ₹${Math.round(cat.total)} this month. Using metro or carpooling for regular routes could cut this by 40%.`);
    } else if (cat.category === "Entertainment" && cat.total > 1000) {
      tips.push(`₹${Math.round(cat.total)} on entertainment. Consider sharing OTT subscriptions with family to reduce costs.`);
    } else if (cat.category === "Shopping" && cat.total > 3000) {
      tips.push(`Shopping spend is ₹${Math.round(cat.total)}. Try a 24-hour wait rule before non-essential purchases.`);
    } else if (cat.category === "Utilities" && cat.total > 2000) {
      tips.push(`Utility bills at ₹${Math.round(cat.total)}. Check for cheaper mobile/broadband plans — you may be overpaying.`);
    }
  }

  if (totalCredit > 0 && totalDebit > totalCredit) {
    tips.push(`Spending (₹${Math.round(totalDebit)}) exceeds income (₹${Math.round(totalCredit)}) this month. Try to build a monthly budget.`);
  } else if (totalCredit > 0) {
    const savingsRate = Math.round(((totalCredit - totalDebit) / totalCredit) * 100);
    if (savingsRate > 0) {
      tips.push(`You saved ${savingsRate}% of income this month. Aim for 20%+ by automating a recurring deposit.`);
    }
  }

  if (tips.length === 0) {
    tips.push("Keep tracking your expenses — patterns become clearer over time.");
    tips.push("Set a monthly budget for your top spending category to stay on track.");
  }

  return { tips, generatedAt: new Date().toISOString(), source: "rule" };
}

/**
 * LLM-powered tips — richer, context-aware advice.
 */
export async function generateAiTips(
  context: LlamaContext,
  categories: CategorySlice[],
  accounts: AccountSummary[],
  totalDebit: number,
  totalCredit: number,
): Promise<SpendingTips> {
  const categoryLines = categories
    .map((c) => `  ${c.category}: ₹${Math.round(c.total)}`)
    .join("\n");

  const accountLines = accounts
    .map((a) => `  ${a.account}: in ₹${Math.round(a.credit)}, out ₹${Math.round(a.debit)}`)
    .join("\n");

  const userMessage = `Monthly spending summary:
Total spent: ₹${Math.round(totalDebit)}
Total received: ₹${Math.round(totalCredit)}
Net: ₹${Math.round(totalCredit - totalDebit)}

Spending by category:
${categoryLines || "  No data"}

By account/bank:
${accountLines || "  No data"}

Give me 3-5 specific money-saving tips based on this data.`;

  try {
    const result = await context.completion({
      messages: [
        { role: "system", content: TIPS_SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
      n_predict: 512,
      temperature: 0.7,
      response_format: { type: "json_object" },
    });

    const text = result.text.trim();
    const start = text.indexOf("[");
    const end = text.lastIndexOf("]");
    if (start !== -1 && end !== -1) {
      const tips = JSON.parse(text.slice(start, end + 1)) as string[];
      if (Array.isArray(tips) && tips.length > 0) {
        return { tips: tips.map(String), generatedAt: new Date().toISOString(), source: "llm" };
      }
    }
  } catch {
    // fall through to rule-based
  }

  return generateRuleTips(categories, totalDebit, totalCredit);
}
