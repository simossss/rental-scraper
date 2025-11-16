// src/scoring/monacoScoring.ts
import { Listing, InteriorCondition } from "@prisma/client";

/**
 * Computes a score (0-100) for a Monaco rental listing based on:
 * - Location (0-30)
 * - Apartment Quality (0-30): size, terrace, interior condition
 * - Building & Amenities (0-25): parking, concierge, elevator, AC
 * - Economics (0-15): rent vs target
 */
export function scoreListing(listing: Listing): number {
  // 1. LOCATION SCORE (0–30)
  const locationScore = computeLocationScore(listing.district);

  // 2. APARTMENT QUALITY SCORE (0–30)
  const apartmentScore = computeApartmentScore(listing);

  // 3. BUILDING & AMENITIES SCORE (0–25)
  const buildingScore = computeBuildingScore(listing);

  // 4. ECONOMICS SCORE (0–15)
  const economicsScore = computeEconomicsScore(listing.priceMonthlyCents);

  // 5. TOTAL SCORE (0–100)
  const totalScore = Math.round(
    locationScore + apartmentScore + buildingScore + economicsScore
  );

  return Math.max(0, Math.min(100, totalScore));
}

// 1. LOCATION SCORE (0–30)
function computeLocationScore(quartier: string | null): number {
  if (!quartier) return 6;

  const q = quartier
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/’/g, "'")
    .toLowerCase()
    .trim();

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

  return 6;
}

// 2. APARTMENT QUALITY SCORE (0–30)
function computeApartmentScore(listing: Listing): number {
  // Calculate livable area: total area minus terrace (since CIM includes terrace in total)
  const livableArea = listing.livingAreaSqm ?? 
    (listing.totalAreaSqm && listing.terraceAreaSqm 
      ? Math.max(0, listing.totalAreaSqm - listing.terraceAreaSqm)
      : listing.totalAreaSqm);
  
  // 2.1 Size vs target (0–15)
  const sizeScore = computeSizeScore(listing.rooms, livableArea);

  // 2.2 Terrace quality (0–7)
  const terraceScore = computeTerraceScore(
    livableArea,
    listing.terraceAreaSqm
  );

  // 2.3 Interior condition (0–8)
  const conditionScore = computeInteriorConditionScore(listing.interiorCondition);

  return sizeScore + terraceScore + conditionScore;
}

// 2.1 Size vs target (0–15)
function computeSizeScore(pieces: number | null, internal_m2: number | null): number {
  let target_min_m2: number;
  if (pieces === 2) {
    target_min_m2 = 75;
  } else if (pieces === 3) {
    target_min_m2 = 90;
  } else {
    target_min_m2 = 90;
  }

  const A = internal_m2 ?? 0;

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
function computeInteriorConditionScore(
  interiorCondition: InteriorCondition | null
): number {
  switch (interiorCondition) {
    case "LUXURY_RENOVATED":
      return 8;
    case "GOOD_MODERN":
      return 6;
    case "DATED_OK":
      return 4;
    case "VERY_DATED":
      return 2;
    case "POOR":
      return 0;
    default:
      return 4; // default
  }
}

// 3. BUILDING & AMENITIES SCORE (0–25)
function computeBuildingScore(listing: Listing): number {
  const parking_score = listing.parkingSpaces != null && listing.parkingSpaces > 0 ? 9 : 0;
  const concierge_score = listing.hasConcierge ? 8 : 0;
  const elevator_score = listing.hasElevator ? 4 : 0;
  const ac_score = listing.hasAC ? 4 : 0;

  return parking_score + concierge_score + elevator_score + ac_score;
}

// 4. ECONOMICS SCORE (0–15)
function computeEconomicsScore(priceMonthlyCents: number): number {
  const TARGET = 9000;
  const MAX_CONSIDERED = 11000;

  const P = priceMonthlyCents / 100; // Convert cents to EUR

  if (P <= 0) return 0;

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
    bonus_raw = Math.min(2, (TARGET - P) / 2500);
  }

  const economics_score = Math.round(((base_score + bonus_raw) * 15) / 17);

  return Math.max(0, Math.min(15, economics_score));
}

