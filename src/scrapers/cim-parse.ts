// src/scrapers/cim-parse.ts
import * as cheerio from "cheerio";

const BASE_HOST = "https://www.chambre-immobiliere-monaco.mc";

export interface ParsedCimListing {
  source: "CIM";
  url: string;

  externalId: string | null;
  title: string;

  neighbourhood: string | null;
  buildingName: string | null;

  propertyType: string | null;
  rooms: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  totalAreaSqm: number | null;
  terraceAreaSqm: number | null;
  floor: string | null;

  monthlyRent: number | null; // in EUR (not cents)
  rentCurrency: "EUR" | null;
  rentText: string | null;
  priceOnRequest: boolean;

  descriptionHtml: string | null;
  descriptionText: string | null;

  agencyName: string | null;
  agencyPhone: string | null;
  agencyEmail: string | null;
  agencyUrl: string | null;

  images: string[];
}

function textOrNull(str: string | undefined | null): string | null {
  const t = (str || "").trim();
  return t ? t : null;
}

export function parseCimListing(html: string, url: string): ParsedCimListing {
  const $ = cheerio.load(html);

  // Title and neighbourhood + building
  const h1 = $("section.produit .entete h1").first();

  const fullLieu = textOrNull(h1.find("p.lieu").text());
  let neighbourhood: string | null = null;
  let buildingName: string | null = null;

  if (fullLieu) {
    // Example: "Carré d'or / Fairmont Résidence"
    const parts = fullLieu
      .split("/")
      .map((p) => p.trim())
      .filter(Boolean);

    if (parts.length >= 1) {
      neighbourhood = parts[0];
    }
    if (parts.length >= 2) {
      // If there are more segments, join them back for the building name.
      buildingName = parts.slice(1).join(" / ");
    }
  }

  const title =
    h1
      .clone()
      .find("p.lieu")
      .remove()
      .end()
      .text()
      .trim() || "Listing";

  // External ID (RIF reference code)
  // Look for "rif" or "rif:" followed by the reference code (e.g., "rif LMP-LMC-H0010")
  // Search in multiple places: specific ref element, then body text
  let refText = $(".zoomlibri .ref").text() || "";
  if (!refText) {
    // Also check in the main content area
    refText = $("section.produit").text() || $("body").text();
  }
  // Match "rif" or "rif:" (case-insensitive) followed by optional space/colon and the reference code
  // Reference codes are typically uppercase letters, numbers, and hyphens (e.g., LMP-LMC-H0010)
  const refMatch = refText.match(/rif[:\s]+([A-Z0-9\-]+)/i);
  const externalId = refMatch ? refMatch[1].trim().toUpperCase() : null;

  // Caracs block
  const caracsBlock = $(".caracs > div").first();
  const caracMap: Record<string, string> = {};

  caracsBlock.find("p").each((_i, el) => {
    const label = $(el)
      .contents()
      .not("span")
      .text()
      .replace(/\s+/g, " ")
      .trim();
    const value = $(el).find("span").text().trim();
    if (label) {
      caracMap[label.toLowerCase()] = value;
    }
  });

  // Rent
  let monthlyRent: number | null = null;
  let rentCurrency: "EUR" | null = null;
  let rentText: string | null = null;
  let priceOnRequest = false;

  const rentKey = Object.keys(caracMap).find((k) =>
    k.includes("l'affitto")
  );
  if (rentKey) {
    const raw = caracMap[rentKey];
    rentText = raw;

    if (/prezzo\s+su\s+richiesta/i.test(raw)) {
      priceOnRequest = true;
      monthlyRent = null;
      rentCurrency = "EUR";
    } else {
      const m = raw.match(/([\d\s'.,]+)/);
      if (m) {
        const digits = m[1].replace(/[^0-9]/g, "");
        if (digits) {
          monthlyRent = parseInt(digits, 10);
          rentCurrency = "EUR";
        }
      }
    }
  }

  // Property type, rooms, beds, baths, areas, floor
  function numOrNull(value: string | undefined): number | null {
    if (!value) return null;
    // Handle fractional numbers (e.g., "296.50 Mq" -> 296.50)
    // Replace comma with dot for European format, then parse as float
    const normalized = value.replace(/,/g, '.').replace(/[^\d.]/g, '');
    if (!normalized) return null;
    const parsed = parseFloat(normalized);
    return isNaN(parsed) ? null : Math.round(parsed); // Round to integer for area in sqm
  }

  const propertyType = textOrNull(caracMap["tipologia di immobile"]);
  const rooms = numOrNull(caracMap["n° di locali"]);
  const bedrooms = numOrNull(caracMap["camera(re)"]);
  const bathrooms = numOrNull(caracMap["bagno(i)"]);
  const totalAreaSqm = numOrNull(caracMap["area totale"]);
  const terraceAreaSqm = numOrNull(caracMap["zona terrazzo"]);

  const floor =
    textOrNull(caracMap["piano"]) ||
    textOrNull(caracMap["etage"]) ||
    textOrNull(caracMap["étage"]) ||
    null;

  // Description
  const descrBlock = $(".descr > div").first();
  const descriptionHtml = textOrNull(descrBlock.html() || "");
  const descriptionText = textOrNull(descrBlock.text().replace(/\s+/g, " "));

  // Agency info
  const agencyContainer = $(".descr .nomagence").closest("div");
  const agencyName = textOrNull(agencyContainer.find(".nomagence").text());
  const agencyPhone = textOrNull(
    agencyContainer.find("a[href^='tel:']").first().attr("href") || ""
  );
  const agencyEmail = textOrNull(
    agencyContainer.find("a[href^='mailto:']").first().attr("href") || ""
  );
  const agencyUrl = textOrNull(
    agencyContainer
      .find("a[href^='http']")
      .not("[href*='facebook']")
      .not("[href*='twitter']")
      .not("[href*='linkedin']")
      .first()
      .attr("href") || ""
  );

  // Normalize phone and email values
  const cleanPhone = agencyPhone
    ? agencyPhone.replace(/^tel:/i, "").trim()
    : null;
  const cleanEmail = agencyEmail
    ? agencyEmail.replace(/^mailto:/i, "").trim()
    : null;

  // Images
  const images: string[] = [];
  $(".galerie_hor .owl-project img").each((_i, el) => {
    const src = $(el).attr("src");
    if (!src) return;
    if (src.startsWith("http")) {
      images.push(src);
    } else if (src.startsWith("/")) {
      images.push(BASE_HOST + src);
    }
  });

  return {
    source: "CIM",
    url,

    externalId,
    title,

    neighbourhood,
    buildingName,

    propertyType,
    rooms,
    bedrooms,
    bathrooms,
    totalAreaSqm,
    terraceAreaSqm,
    floor,

    monthlyRent,
    rentCurrency,
    rentText,
    priceOnRequest,

    descriptionHtml,
    descriptionText,

    agencyName,
    agencyPhone: cleanPhone,
    agencyEmail: cleanEmail,
    agencyUrl,

    images,
  };
}
