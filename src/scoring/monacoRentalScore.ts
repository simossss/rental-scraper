// src/scoring/monacoRentalScore.ts

export type InteriorCondition =
  | "luxury_renovated"
  | "good_modern"
  | "dated_ok"
  | "very_dated"
  | "poor"
  | null;

export interface MonacoScoringInput {
  pieces: number | null;
  internal_m2: number | null;
  terrace_m2: number | null;
  rent_eur: number | null;
  quartier: string | null;
  has_parking: boolean | null;
  has_concierge: boolean | null;
  has_elevator: boolean | null;
  has_ac: boolean | null;
  interior_condition: InteriorCondition;
}

export interface MonacoScoringOutput {
  locationScore: number;
  apartmentScore: number;
  buildingScore: number;
  economicsScore: number;
  totalScore: number;
}

function normalizeQuartier(q: string | null): string {
  if (!q) return "";
  return q
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/’/g, "'")
    .toLowerCase()
    .trim();
}

// 1. LOCATION SCORE (0–30)
function computeLocationScore(quartier: string | null): number {
  const q = normalizeQuartier(quartier);

  if (
    q.includes("la rousse") ||
    q.includes("saint roman") ||
    q.includes("larvotto")
  ) {
    return 30;
  }

  if (
    q.includes("anse du portier") ||
    q.includes("monte carlo") ||
    q.includes("monte-carlo") ||
    q.includes("carre d'or") ||
    q.includes("carré d'or")
  ) {
    return 24;
  }

  if (q.includes("condamine") || q.includes("moneghetti")) {
    return 18;
  }

  if (q.includes("port") || q.includes("fontvieille")) {
    return 12;
  }

  // Jardin Exotique, Monaco Ville, other minor areas
  if (!q) return 0;
  return 6;
}

// 2. APARTMENT QUALITY SCORE (0–30)

// 2.1 Size vs target (0–15)
function computeSizeScore(pieces: number | null, internal_m2: number | null): number {
  const A = internal_m2 ?? 0;

  let target_min_m2: number;
  if (pieces === 2) target_min_m2 = 75;
  else if (pieces === 3) target_min_m2 = 90;
  else target_min_m2 = 90;

  if (A <= 0 || target_min_m2 <= 0) return 0;

  if (A <= 0.8 * target_min_m2) return 0;
  if (A <= target_min_m2) return 6;
  if (A <= target_min_m2 + 15) return 10;
  return 15;
}

// 2.2 Terrace quality (0–7)
function computeTerraceScore(
  internal_m2: number | null,
  terrace_m2: number | null
): number {
  const A = internal_m2 ?? 0;
  const T = terrace_m2 ?? 0;

  if (T <= 0) return 0;

  const ratio = A > 0 ? T / A : 0;

  if (ratio < 0.08 && T < 8) return 2;
  if (ratio < 0.20 && T < 20) return 4;
  return 7;
}

// 2.3 Interior condition (0–8)
function computeInteriorScore(interior_condition: InteriorCondition): number {
  switch (interior_condition) {
    case "luxury_renovated":
      return 8;
    case "good_modern":
      return 6;
    case "dated_ok":
      return 4;
    case "very_dated":
      return 2;
    case "poor":
      return 0;
    default:
      return 4; // default
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

// 3. BUILDING & AMENITIES SCORE (0–25)
function computeBuildingScore(input: MonacoScoringInput): number {
  const parking_score = input.has_parking ? 9 : 0;
  const concierge_score = input.has_concierge ? 8 : 0;
  const elevator_score = input.has_elevator ? 4 : 0;
  const ac_score = input.has_ac ? 4 : 0;

  const total = parking_score + concierge_score + elevator_score + ac_score;
  return clamp(total, 0, 25);
}

// 4. ECONOMICS SCORE (0–15 NORMALIZED)
function computeEconomicsScore(rent_eur: number | null): number {
  if (!rent_eur || rent_eur <= 0) return 0;

  const TARGET = 9000;
  const MAX_CONSIDERED = 11000;
  const ECON_MAX = 15.0;
  const ECON_RAW_MAX = 17.0; // base 15 + max bonus 2

  const P = rent_eur;

  let base_score: number;
  if (P <= TARGET) {
    base_score = 15;
  } else if (P >= MAX_CONSIDERED) {
    base_score = 5;
  } else {
    const penalty = (10 * (P - TARGET)) / (MAX_CONSIDERED - TARGET);
    base_score = 15 - penalty;
  }

  let bonus_raw = 0;
  if (P < TARGET) {
    bonus_raw = (TARGET - P) / 2500.0;
    bonus_raw = Math.min(2.0, Math.max(0.0, bonus_raw));
  }

  const econ_raw = base_score + bonus_raw;
  const economics_score = Math.round((econ_raw * ECON_MAX) / ECON_RAW_MAX);

  return clamp(economics_score, 0, 15);
}

// MAIN ENTRY

export function computeMonacoRentalScore(
  input: MonacoScoringInput
): MonacoScoringOutput {
  const locationScore = clamp(
    computeLocationScore(input.quartier),
    0,
    30
  );

  const sizeScore = clamp(
    computeSizeScore(input.pieces, input.internal_m2),
    0,
    15
  );

  const terraceScore = clamp(
    computeTerraceScore(input.internal_m2, input.terrace_m2),
    0,
    7
  );

  const interiorScore = clamp(
    computeInteriorScore(input.interior_condition),
    0,
    8
  );

  const apartmentScore = clamp(
    sizeScore + terraceScore + interiorScore,
    0,
    30
  );

  const buildingScore = computeBuildingScore(input);
  const economicsScore = computeEconomicsScore(input.rent_eur);

  const totalScore = clamp(
    locationScore + apartmentScore + buildingScore + economicsScore,
    0,
    100
  );

  return {
    locationScore,
    apartmentScore,
    buildingScore,
    economicsScore,
    totalScore,
  };
}
