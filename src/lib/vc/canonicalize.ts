/**
 * Deterministic JSON canonicalization (sorted object keys, recursively) so that
 * signing and verification always hash/sign the exact same byte sequence for
 * semantically identical documents. This is a practical subset of JCS (RFC 8785)
 * sufficient for our fixed credential schema: it does not attempt to replicate
 * JCS's number-formatting edge cases, since all credential fields are strings,
 * booleans, arrays, or nested objects.
 */
export function canonicalize(value: unknown): string {
  return JSON.stringify(sortKeysDeep(value));
}

function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeysDeep);
  if (value !== null && typeof value === "object") {
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      sorted[key] = sortKeysDeep((value as Record<string, unknown>)[key]);
    }
    return sorted;
  }
  return value;
}

export function canonicalBytes(value: unknown): Uint8Array {
  return new TextEncoder().encode(canonicalize(value));
}
