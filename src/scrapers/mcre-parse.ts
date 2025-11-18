// src/scrapers/mcre-parse.ts
import * as cheerio from "cheerio";

const BASE_HOST = "https://www.montecarlo-realestate.com";

export interface ParsedMcreListing {
  source: "MCRE";
  url: string;

  externalId: string | null;
  title: string;

  district: string | null;
  buildingName: string | null;

  propertyType: string | null;
  rooms: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  totalAreaSqm: number | null;
  livingAreaSqm: number | null;
  terraceAreaSqm: number | null;
  floor: number | null;

  monthlyRent: number | null; // in EUR (not cents)
  serviceChargesMonthlyCents: number | null;
  serviceChargesIncluded: boolean | null;
  rentCurrency: "EUR" | null;
  rentText: string | null;
  priceOnRequest: boolean;

  descriptionHtml: string | null;
  descriptionText: string | null;

  agencyName: string | null;
  agencyPhone: string | null;
  agencyEmail: string | null;
  agencyUrl: string | null;

  features: string[]; // Tags like "With panoramic view", "Renovated", "Exclusive"

  images: string[];
}

function textOrNull(str: string | undefined | null): string | null {
  const t = (str || "").trim();
  return t ? t : null;
}

// Parse number from text, handling fractional values
function parseNumber(value: string | undefined | null): number | null {
  if (!value) return null;
  // Handle fractional numbers (e.g., "296.50" or "6,500")
  const normalized = value.replace(/,/g, '').replace(/[^\d.]/g, '');
  if (!normalized) return null;
  const parsed = parseFloat(normalized);
  return isNaN(parsed) ? null : parsed;
}

// Parse integer (rounds fractional values)
function parseIntFrom(value: string | undefined | null): number | null {
  const num = parseNumber(value);
  return num !== null ? Math.round(num) : null;
}

export function parseMcreListing(html: string, url: string): ParsedMcreListing {
  const $ = cheerio.load(html);

  // Title
  const title = $("h1").first().text().trim() || "Listing";

  // Reference code
  const referenceText = $("dt:contains('Reference:')")
    .next("dd")
    .text()
    .trim();
  const externalId = referenceText ? referenceText.toUpperCase() : null;

  // District and Building
  const districtText = $("dt:contains('District:')")
    .next("dd")
    .text()
    .trim();
  const buildingText = $("dt:contains('Building:')")
    .next("dd")
    .text()
    .trim();
  
  const district = textOrNull(districtText);
  const buildingName = textOrNull(buildingText);

  // Price - try multiple selectors
  let monthlyRent: number | null = null;
  let rentCurrency: "EUR" | null = null;
  let rentText: string | null = null;
  let priceOnRequest = false;

  // Try different selectors for price
  let priceText = $(".immobileInfo.price span").first().text().trim();
  if (!priceText) {
    priceText = $(".immobileInfoMobile .price").first().text().trim();
  }
  if (!priceText) {
    // Fallback to Features table
    priceText = $("dt:contains('Price:')").next("dd").text().trim();
  }
  if (!priceText) {
    // Try alternative selector
    priceText = $(".immobileInfo__box .immobileInfo.price").first().text().trim();
  }
  
  if (priceText) {
    rentText = priceText;
    if (/price\s+on\s+request/i.test(priceText) || /sur\s+demande/i.test(priceText)) {
      priceOnRequest = true;
      monthlyRent = null;
      rentCurrency = "EUR";
    } else {
      // Extract number from price (e.g., "6,500 €" -> 6500)
      const priceNum = parseNumber(priceText);
      if (priceNum !== null) {
        monthlyRent = priceNum;
        rentCurrency = "EUR";
      }
    }
  }

  // Service expenses
  const serviceExpensesText = $("dt:contains('Service expenses:')")
    .next("dd")
    .text()
    .trim();
  const serviceChargesMonthlyCents = serviceExpensesText
    ? Math.round((parseNumber(serviceExpensesText) || 0) * 100)
    : null;

  // Service costs included
  const serviceCostsIncludedText = $("dt:contains('Service costs included:')")
    .next("dd")
    .text()
    .trim()
    .toLowerCase();
  const serviceChargesIncluded = serviceCostsIncludedText === "yes" || serviceCostsIncludedText === "oui";

  // Property details
  const propertyTypeText = $("dt:contains('Type of property:')")
    .next("dd")
    .text()
    .trim();
  const propertyType = textOrNull(propertyTypeText);

  const roomsText = $("dt:contains('Rooms:')")
    .next("dd")
    .text()
    .trim();
  const rooms = parseIntFrom(roomsText);

  const bedroomsText = $("dt:contains('Bedrooms:')")
    .next("dd")
    .text()
    .trim();
  const bedrooms = parseIntFrom(bedroomsText);

  const bathroomsText = $("dt:contains('Bathrooms:')")
    .next("dd")
    .text()
    .trim();
  const bathrooms = parseIntFrom(bathroomsText);

  const livingAreaText = $("dt:contains('Living area:')")
    .next("dd")
    .text()
    .trim();
  const livingAreaSqm = parseIntFrom(livingAreaText);

  const totalAreaText = $("dt:contains('Total area:')")
    .next("dd")
    .text()
    .trim();
  const totalAreaSqm = parseIntFrom(totalAreaText);

  const terraceAreaText = $("dt:contains('Terraced area:')")
    .next("dd")
    .text()
    .trim();
  const terraceAreaSqm = parseIntFrom(terraceAreaText);

  const floorText = $("dt:contains('Floor:')")
    .next("dd")
    .text()
    .trim();
  const floor = parseIntFrom(floorText);

  // Features/Tags - try multiple selectors
  const features: string[] = [];
  // Try immobileDetails__tag first (from Features section)
  $(".immobileDetails__tag a, .immobileDetails__tagLabel").each((_i, el) => {
    const tag = $(el).text().trim();
    if (tag) features.push(tag);
  });
  // Fallback to property-features
  if (features.length === 0) {
    $(".property-features .tag").each((_i, el) => {
      const tag = $(el).text().trim();
      if (tag) features.push(tag);
    });
  }

  // Description - try multiple selectors
  let descriptionBlock = $(".immobileDetails__text");
  if (descriptionBlock.length === 0) {
    descriptionBlock = $(".description");
  }
  const descriptionHtml = textOrNull(descriptionBlock.html() || "");
  const descriptionText = textOrNull(descriptionBlock.text().replace(/\s+/g, " "));

  // Agency info - try multiple selectors
  let agencyName = textOrNull($(".agenzia__name").text());
  if (!agencyName) {
    agencyName = textOrNull($(".sideBox__agenzia .agenzia__name").text());
  }
  if (!agencyName) {
    agencyName = textOrNull($(".property__agency-name").text());
  }
  
  // Phone - look in popup or direct link
  let agencyPhone = textOrNull($(".popupTelephone__number").text());
  if (!agencyPhone) {
    agencyPhone = textOrNull($("a[href^='tel:']").first().attr("href")?.replace(/^tel:/i, ""));
  }
  
  const agencyEmail = textOrNull($("a[href^='mailto:']").first().attr("href")?.replace(/^mailto:/i, ""));
  
  let agencyUrl = textOrNull($(".agenzia__name").attr("href"));
  if (!agencyUrl) {
    agencyUrl = textOrNull($(".sideBox__agenzia .agenzia__name").attr("href"));
  }
  if (!agencyUrl) {
    agencyUrl = textOrNull($(".property__agency a[href^='http']").first().attr("href"));
  }

  // Images - try multiple selectors
  const images: string[] = [];
  // Try main gallery first
  $(".immobile__image img, .imagesBox img").each((_i, el) => {
    const src = $(el).attr("data-src") || $(el).attr("src") || $(el).attr("data-lazy");
    if (!src) return;
    if (src.startsWith("http")) {
      images.push(src);
    } else if (src.startsWith("/")) {
      images.push(BASE_HOST + src);
    }
  });
  // Fallback to property__gallery
  if (images.length === 0) {
    $(".property__gallery img").each((_i, el) => {
      const src = $(el).attr("data-src") || $(el).attr("src");
      if (!src) return;
      if (src.startsWith("http")) {
        images.push(src);
      } else if (src.startsWith("/")) {
        images.push(BASE_HOST + src);
      }
    });
  }

  return {
    source: "MCRE",
    url,

    externalId,
    title,

    district,
    buildingName,

    propertyType,
    rooms,
    bedrooms,
    bathrooms,
    totalAreaSqm,
    livingAreaSqm,
    terraceAreaSqm,
    floor,

    monthlyRent,
    serviceChargesMonthlyCents,
    serviceChargesIncluded,
    rentCurrency,
    rentText,
    priceOnRequest,

    descriptionHtml,
    descriptionText,

    agencyName,
    agencyPhone,
    agencyEmail,
    agencyUrl,

    features,

    images,
  };
}

