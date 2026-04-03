/** Heuristic: long digit-only addresses look like personal contacts, not bank senders. */
export function looksLikePersonalNumber(address: string): boolean {
  const trimmed = address.trim();
  if (!trimmed) {
    return true;
  }
  const letters = /[a-zA-Z]/.test(trimmed);
  if (letters) {
    return false;
  }
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length >= 10) {
    return true;
  }
  return false;
}
