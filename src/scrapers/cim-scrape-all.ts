import axios from "axios";
import * as cheerio from "cheerio";
import { ContractType, PropertyType } from "@prisma/client";
import { upsertParsedListing } from "./upsertListing";

const CIM_BASE = "https://www.chambre-immobiliere-monaco.mc";
const CIM_GRID_BASE =
  CIM_BASE +
  "/it/affitti/t_appartement/t_duplex/t_loft/t_penthouse%7Croof/p_2/p_3/p_4/p_5/p_plus/grid";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractFirstNumber(text: string, regex: RegExp): number | null {
  const m = text.match(regex);
  if (!m) return null;
  const digits = m[1].replace(/\D/g, "");
  if (!digits) return null;
  return parseInt(digits, 10);
}

function extractFloat(text: string, regex: RegExp): number | null {
  const m = text.match(regex);
  if (!m) return null;
  const digits = m[1].replace(/[^\d.,]/g, "").replace(",", ".");
  if (!digits) return null;
  const num = parseFloat(digits);
  return isNaN(num) ? null : num;
}

function mapPropertyType(raw: string | null | undefined): PropertyType {
  if (!raw) return PropertyType.OTHER;
  const v = raw.toLowerCase();

  if (v.includes("monolocale") || v.includes("studio")) return PropertyType.STUDIO;
  if (v.includes("attico") || v.includes("penthouse") || v.includes("roof"))
    return PropertyType.PENTHOUSE_APARTMENT;
  if (v.includes("villa")) return PropertyType.VILLA;
  if (v.includes("appartamento")) return PropertyType.APARTMENT;

  return PropertyType.OTHER;
}

async function fetchCimGridUrls(): Promise<string[]> {
  const allUrls = new Set<string>();

  console.log(`Fetching CIM grid page 1: ${CIM_GRID_BASE}`);
  const firstRes = await axios.get(CIM_GRID_BASE, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
  });

  console.log(`HTTP status from CIM grid page 1: ${firstRes.status}`);
  const $first = cheerio.load(firstRes.data);
  const bodyText1 = $first("body").text().replace(/\s+/g, " ").trim();

  // Example text: "da 1 a 24 su 276"
  const match = bodyText1.match(/da\s+(\d+)\s+a\s+(\d+)\s+su\s+(\d+)/i);
  if (!match) {
    console.log("Could not detect pagination text. Scraping only page 1.");
  }

  let totalResults = 0;
  let perPage = 0;
  let totalPages = 1;

  if (match) {
    const from = parseInt(match[1], 10);
    const to = parseInt(match[2], 10);
    const total = parseInt(match[3], 10);
    totalResults = total;
    perPage = to - from + 1;
    totalPages = Math.ceil(total / perPage);
    console.log(
      `Detected total results: ${totalResults}, per page: ${perPage}, total pages: ${totalPages}`
    );
  }

  function collectUrlsFromPage($: cheerio.CheerioAPI) {
    $("a[href*='/it/property/']").each((_, el) => {
      const href = $(el).attr("href");
      if (!href) return;
      let full = href.startsWith("http") ? href : CIM_BASE + href;
      allUrls.add(full);
    });
  }

  // Page 1
  collectUrlsFromPage($first);

  // Other pages
  for (let page = 2; page <= totalPages; page++) {
    const url = `${CIM_GRID_BASE}/${page}`;
    console.log(`Fetching CIM grid page ${page}: ${url}`);
    const res = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });
    console.log(`HTTP status from CIM grid page ${page}: ${res.status}`);

    const $ = cheerio.load(res.data);
    collectUrlsFromPage($);
    await sleep(300); // be nice to the server
  }

  console.log(`Total unique URLs collected: ${allUrls.size}`);
  return Array.from(allUrls);
}

type ParsedListingInput = Parameters<typeof upsertParsedListing>[0];

function parseCimListing(html: string, url: string): ParsedListingInput {
  const $ = cheerio.load(html);

  const title =
    $("h1")
      .first()
      .text()
      .trim() || "Listing senza titolo";

  // Simple: for CIM, all are Monaco
  const city = "Monaco";

  // Whole body text (for regex)
  const bodyText = $("body").text().replace(/\s+/g, " ").trim();

  // Reference (rif ...)
  let referenceRaw: string | null = null;
  const refMatch = bodyText.match(/\brif\s+([^.]+?)(?:Specificazioni|L'affitto|Tipologia|$)/i);
  if (refMatch) {
    referenceRaw = refMatch[1].trim();
  }

  // Price
  const priceEur = extractFirstNumber(bodyText, /L'affitto\s+([\d\s.]+)\s*€\s*\/\s*mese/i);
  if (!priceEur) {
    throw new Error("Could not parse monthly rent from page");
  }
  const priceMonthlyCents = priceEur * 100;

  // Service charges
  const chargesEur = extractFirstNumber(bodyText, /Spese\s+([\d\s.]+)\s*€\s*\/\s*mese/i);
  const serviceChargesMonthlyCents = chargesEur ? chargesEur * 100 : null;

  // Property type
  let rawType: string | null = null;
  const typeMatch = bodyText.match(
    /Tipologia di immobile\s+([A-Za-zÀ-ÿ\s]+?)\s+N° di locali/i
  );
  if (typeMatch) {
    rawType = typeMatch[1].trim();
  }
  const propertyType = mapPropertyType(rawType);

  const rooms = extractFirstNumber(bodyText, /N° di locali\s+(\d+)/i);
  const bedrooms = extractFirstNumber(bodyText, /Camera\(re\)\s*(\d+)/i);
  const bathrooms = extractFirstNumber(bodyText, /Bagno\(i\)\s*(\d+)/i);
  const totalAreaSqm = extractFirstNumber(bodyText, /Area totale\s+(\d+)\s*Mq/i);
  const terraceAreaSqm = extractFirstNumber(bodyText, /Zona terrazzo\s+(\d+)\s*Mq/i);
  const floor = extractFirstNumber(bodyText, /Piano\s+(\d+)/i);

  // Very simple description: first h3 after "Descrizione"
  let description: string | null = null;
  const descrHeader = $("h2")
    .filter((_, el) => $(el).text().trim().toLowerCase().startsWith("descrizione"))
    .first();
  if (descrHeader.length > 0) {
    const h3 = descrHeader.nextAll("h3").first();
    if (h3.length > 0) {
      description = h3.text().trim();
    }
  }
  if (!description) {
    // fallback: rough extraction around "Descrizione"
    const descrMatch = bodyText.match(/Descrizione\s+(.+?)Galleria di foto/i);
    if (descrMatch) {
      description = descrMatch[1].trim();
    }
  }

  // Very simple feature tags from description text
  const featuresTags: string[] = [];
  const descLower = (description || "").toLowerCase();
  if (descLower.includes("rooftop") || descLower.includes("toit")) featuresTags.push("rooftop");
  if (descLower.includes("terrasse") || descLower.includes("terrazzo"))
    featuresTags.push("terrace");
  if (descLower.includes("vue mer") || descLower.includes("vista mare"))
    featuresTags.push("sea_view");

  // Extract listing id from URL (e.g. /property/118799/... -> 118799)
  let sourceListingId = url;
  const idMatch = url.match(/\/property\/([^/]+)/);
  if (idMatch) {
    sourceListingId = idMatch[1];
  }

  const input: ParsedListingInput = {
    sourceWebsiteCode: "CIM",
    sourceListingId,
    url,
    referenceRaw,

    title,
    city,
    district: null,
    buildingName: null,
    address: null,

    contractType: ContractType.RENT,
    propertyType,

    priceMonthlyCents,
    serviceChargesMonthlyCents,
    serviceChargesIncluded: null,

    rooms: rooms ?? null,
    bedrooms: bedrooms ?? null,
    bathrooms: bathrooms ?? null,
    totalAreaSqm: totalAreaSqm ?? null,
    livingAreaSqm: null,
    terraceAreaSqm: terraceAreaSqm ?? null,
    floor: floor ?? null,

    parkingSpaces: null,
    cellars: null,
    isMixedUse: null,

    hasRooftop: featuresTags.includes("rooftop") || descLower.includes("rooftop"),
    hasTerrace:
      featuresTags.includes("terrace") ||
      descLower.includes("terrasse") ||
      descLower.includes("terrazzo"),
    hasSeaView:
      featuresTags.includes("sea_view") ||
      descLower.includes("vue mer") ||
      descLower.includes("vista mare"),
    hasElevator: null,
    condition: null,

    featuresTags,
    description,
    descriptionLang: null,

    agencyName: null,
    agencyAddress: null,
    agencyPhone: null,
    agencyEmail: null,
    agencyWebsite: null,

    imageUrls: [],
    rawPayload: {},
  };

  return input;
}

async function scrapeAllCim() {
  try {
    console.log("Starting full CIM scrape (grid + details)...");
    const urls = await fetchCimGridUrls();
    console.log(`Will process ${urls.length} listing URLs.`);

    let processed = 0;
    let newListings = 0;

    for (const url of urls) {
      processed++;
      console.log(`\n[${processed}/${urls.length}] Fetching listing: ${url}`);
      try {
        const res = await axios.get(url, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          },
        });

        if (res.status !== 200) {
          console.log(`Non-200 response for listing. Status: ${res.status}`);
          continue;
        }

        const input = parseCimListing(res.data, url);
        const result = await upsertParsedListing(input);
        console.log(
          `UPSERT: listingId=${result.listingId} new=${result.createdNewListing}`
        );
        if (result.createdNewListing) newListings++;

        await sleep(400);
      } catch (e: any) {
        console.log(`Error while processing listing ${url}:`, e.message || e);
      }
    }

    console.log(
      `\nCIM full scrape finished. Processed=${processed}, new listings=${newListings}`
    );
  } catch (e: any) {
    console.log("Fatal error in CIM full scrape:", e.message || e);
  }
}

scrapeAllCim().then(() => {
  console.log("Done.");
});
