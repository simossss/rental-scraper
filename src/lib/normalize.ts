// src/lib/normalize.ts

// Normalize the RIF / Reference code so different sites match
// Handles cases like:
// - "ACL_2P_Chateau_Azur_9" vs "rif ACL_2P_Chateau_Azur_"
// - Removes trailing underscores and normalizes separators
export function normalizeReference(ref?: string | null): string | null {
  if (!ref) return null;

  return ref
    .toUpperCase()
    .replace(/^RIF\s+/, "")           // remove leading "RIF "
    .replace(/\s+/g, "_")            // spaces -> underscores
    .replace(/[_\s]+/g, "_")          // collapse multiple underscores/spaces
    .replace(/_+$/, "")               // remove trailing underscores
    .trim();
}

// Build a fingerprint for dedup when there is no reference code
export function buildFingerprint(input: {
  city: string;
  district?: string | null;
  buildingName?: string | null;
  livingAreaSqm?: number | null;
  terraceAreaSqm?: number | null;
  bedrooms?: number | null;
  rooms?: number | null;
  priceMonthlyCents: number;
}) {
  const clean = (v?: string | null) =>
    (v || "")
      .toLowerCase()
      .normalize("NFKD")                 // remove accents
      .replace(/[^\w\s]/g, "")           // remove punctuation
      .replace(/\s+/g, "-")              // spaces -> dashes
      .trim();

  // round price so tiny differences don't break the match (round to nearest 500)
  // This is tighter than 1000 to reduce false matches while still catching price updates
  const roundedPrice = Math.round(input.priceMonthlyCents / 500) * 500;

  return [
    clean(input.city),
    clean(input.district),
    clean(input.buildingName),
    `liv:${input.livingAreaSqm || 0}`,
    `terr:${input.terraceAreaSqm || 0}`,
    `bed:${input.bedrooms || 0}`,
    `rooms:${input.rooms || 0}`,
    `p:${roundedPrice}`,
  ]
    .filter(Boolean)
    .join("|");
}
