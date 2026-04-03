export function formatInr(amount: number): string {
  if (!Number.isFinite(amount)) {
    return "₹0";
  }
  const fixed = amount >= 100 ? amount.toFixed(0) : amount.toFixed(2);
  return `₹${fixed}`;
}
