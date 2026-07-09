import type { Character } from "./types";

export function parentsAlive(c: Character): boolean {
  return c.relationships.some((r) => (r.type === "mother" || r.type === "father") && r.alive);
}

/**
 * A dependent minor: under 18, not emancipated, not living independently,
 * not homeless, and with at least one living parent.
 */
export function isDependent(c: Character): boolean {
  return c.age < 18 && !c.emancipated && !c.independent && !c.homeless && parentsAlive(c);
}

export function familyLiquidity(c: Character): number {
  return c.family.savings + Math.max(0, c.family.income * 0.25);
}

export function parentsCanAfford(c: Character, amount: number): boolean {
  return familyLiquidity(c) >= amount;
}

export type PaidBy = "player" | "parents" | "family-debt";

export interface ExpenseResult {
  paidBy: PaidBy;
  message: string;
}

/**
 * Route an expense to whoever should pay it. Dependent minors have their
 * essentials covered by parents; luxuries are only covered by wealthy
 * families. Independent / emancipated / homeless people and adults pay
 * themselves.
 */
export function chargeExpense(
  c: Character,
  amount: number,
  opts?: { luxury?: boolean; label?: string },
): ExpenseResult {
  const label = opts?.label ?? "expense";
  const luxury = opts?.luxury ?? false;
  const money = `$${Math.round(amount).toLocaleString()}`;

  if (isDependent(c)) {
    const richFamily = c.family.tier === "wealthy" || c.family.tier === "affluent";
    if (luxury && !richFamily) {
      c.money -= amount;
      return {
        paidBy: "player",
        message: `You paid ${money} for the ${label} out of your own pocket money.`,
      };
    }
    if (parentsCanAfford(c, amount)) {
      c.family.savings = Math.max(0, c.family.savings - amount);
      c.family.netWorth -= amount;
      return {
        paidBy: "parents",
        message: `Your parents paid the ${money} ${label}.`,
      };
    }
    // Parents can't afford it — it becomes family debt.
    c.family.debt += amount;
    c.family.netWorth -= amount;
    c.family.creditScore = Math.max(300, c.family.creditScore - 6);
    return {
      paidBy: "family-debt",
      message: `Your family couldn't afford the ${money} ${label}, so it went on credit.`,
    };
  }

  c.money -= amount;
  return { paidBy: "player", message: `You paid ${money} for the ${label}.` };
}
