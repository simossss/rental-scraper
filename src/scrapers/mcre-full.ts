// src/scrapers/mcre-full.ts
import axios from "axios";
import * as cheerio from "cheerio";
import { ContractType, PropertyType } from "@prisma/client";
import { upsertParsedListing } from "./upsertListing";
import { parseMcreListing } from "./mcre-parse";

const BASE_HOST = "https://www.montecarlo-realestate.com";
const BASE_LISTINGS_URL =
  BASE_HOST +
  "/en/houses-and-apartments-for-rent/monaco?FlNrLocali2=True&FlNrLocali3=True&FlNrLocali4=True&FlNrLocaliN=True";

// ------- helpers to parse listing grid -------

function extractListingUrlsFromPage($: cheerio.CheerioAPI): string[] {
  const urls: string[] = [];
  // MCRE uses links like /en/properties/mc-tc-6-32736
  $("a[href*='/properties/']").each((_i, el) => {
    const href = $(el).attr("href");
    if (!href) return;
    const fullUrl = href.startsWith("http") ? href : BASE_HOST + href;
    if (!urls.includes(fullUrl)) {
      urls.push(fullUrl);
    }
  });
  return urls;
}

async function fetchListingsPage(page: number): Promise<{
  html: string;
  $: cheerio.CheerioAPI;
}> {
  const url = page === 1 
    ? BASE_LISTINGS_URL 
    : `${BASE_LISTINGS_URL}&page=${page}`;
  console.log(`Fetching MCRE listings page ${page}: ${url}`);
  const res = await axios.get(url, {
    timeout: 10000,
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });
  console.log(`HTTP status from MCRE page ${page}: ${res.status}`);
  const html = res.data as string;
  const $ = cheerio.load(html);
  return { html, $ };
}

// Detect total pages from pagination
function detectTotalPages($: cheerio.CheerioAPI): number {
  // Look for pagination links
  const pageLinks = $(".pagination a, .pager a, [class*='page'] a");
  let maxPage = 1;
  
  pageLinks.each((_i, el) => {
    const text = $(el).text().trim();
    const pageNum = parseInt(text, 10);
    if (!isNaN(pageNum) && pageNum > maxPage) {
      maxPage = pageNum;
    }
  });
  
  // Also check for "next" button or "last" button
  const nextButton = $("a:contains('Next'), a:contains('next'), .next");
  const hasNext = nextButton.length > 0;
  
  // If we found pages, return max; otherwise check if there's a next button
  if (maxPage > 1) {
    return maxPage;
  }
  
  // If there's a next button on page 1, we need to check page 2
  // For now, return a reasonable default and let the scraper discover pages
  return hasNext ? 10 : 1; // Start with assumption of 10 pages max, will adjust
}

export async function collectAllMcreListingUrls(): Promise<string[]> {
  const all = new Set<string>();

  // Fetch page 1 to discover structure
  const { $: $page1 } = await fetchListingsPage(1);
  const urlsPage1 = extractListingUrlsFromPage($page1);
  urlsPage1.forEach((u) => all.add(u));
  
  console.log(`Page 1: Found ${urlsPage1.length} listing URLs`);

  // Try to detect total pages
  let totalPages = detectTotalPages($page1);
  console.log(`Detected up to ${totalPages} pages`);

  // Fetch remaining pages
  for (let page = 2; page <= totalPages; page++) {
    try {
      const { $ } = await fetchListingsPage(page);
      const pageUrls = extractListingUrlsFromPage($);
      
      if (pageUrls.length === 0) {
        // No more listings, stop
        console.log(`Page ${page}: No listings found, stopping pagination`);
        break;
      }
      
      pageUrls.forEach((u) => all.add(u));
      console.log(`Page ${page}: Found ${pageUrls.length} listing URLs (total unique: ${all.size})`);
      
      // If we got fewer URLs than expected, might be last page
      if (pageUrls.length < urlsPage1.length * 0.5) {
        console.log(`Page ${page}: Significantly fewer listings, might be last page`);
      }
    } catch (err: any) {
      console.error(`Error fetching page ${page}:`, err.message);
      // If page doesn't exist, stop
      break;
    }
  }

  const urls = Array.from(all);
  console.log("----");
  console.log(`Total unique MCRE URLs collected: ${urls.length}`);
  return urls;
}

// ------- helpers for single listing -------

function extractSourceListingIdFromUrl(url: string): string {
  // Extract ID from URL: /en/properties/mc-tc-6-32736 -> mc-tc-6-32736
  const match = url.match(/\/properties\/([^\/\?]+)/);
  if (match) return match[1];
  // Fallback: use the last part of the path
  const parts = url.split("/").filter(Boolean);
  return parts[parts.length - 1] || url;
}

// Use the shared parser
export async function scrapeSingleMcreListing(url: string) {
  console.log(`Fetching MCRE listing: ${url}`);
  const res = await axios.get(url, {
    timeout: 10000,
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      Referer: BASE_HOST + "/",
    },
    maxRedirects: 5,
    validateStatus: () => true,
  });
  console.log(`HTTP status from MCRE listing: ${res.status}`);

  if (res.status !== 200) {
    throw new Error(`HTTP ${res.status} from MCRE listing`);
  }

  const html = res.data as string;
  const parsed = parseMcreListing(html, url);

  // Monthly rent -> cents
  const priceMonthlyCents =
    parsed.monthlyRent != null ? parsed.monthlyRent * 100 : 0;

  // Extract URL ID
  const urlId = extractSourceListingIdFromUrl(url);

  const result = await upsertParsedListing({
    sourceWebsiteCode: "MCRE",
    sourceListingId: urlId,
    url,

    referenceRaw: parsed.externalId ?? undefined,

    title: parsed.title,
    city: "Monaco",
    district: parsed.district ?? null,
    buildingName: parsed.buildingName ?? null,
    address: null,

    contractType: ContractType.RENT,
    propertyType: PropertyType.APARTMENT,

    priceMonthlyCents,
    serviceChargesMonthlyCents: parsed.serviceChargesMonthlyCents ?? null,
    serviceChargesIncluded: parsed.serviceChargesIncluded ?? null,

    rooms: parsed.rooms ?? null,
    bedrooms: parsed.bedrooms ?? null,
    bathrooms: parsed.bathrooms ?? null,
    totalAreaSqm: parsed.totalAreaSqm ?? null,
    livingAreaSqm: parsed.livingAreaSqm ?? null,
    terraceAreaSqm: parsed.terraceAreaSqm ?? null,
    floor: parsed.floor ?? null,

    parkingSpaces: null,
    cellars: null,
    isMixedUse: null,

    hasRooftop: parsed.features.some(f => /rooftop|roof/i.test(f)) ? true : null,
    hasTerrace: parsed.terraceAreaSqm != null && parsed.terraceAreaSqm > 0 ? true : null,
    hasSeaView: parsed.features.some(f => /sea\s+view|panoramic\s+view|vue\s+mer/i.test(f)) ? true : null,
    hasElevator: parsed.features.some(f => /elevator|ascenseur/i.test(f)) ? true : null,
    hasConcierge: parsed.features.some(f => /concierge/i.test(f)) ? true : null,
    hasAC: parsed.features.some(f => /air\s+condition|climatisation/i.test(f)) ? true : null,
    condition: parsed.features.some(f => /renovated|rénové|refait/i.test(f)) ? "GOOD" : null,

    featuresTags: parsed.features,
    description: parsed.descriptionText ?? null,
    descriptionLang: "en",

    agencyName: parsed.agencyName ?? null,
    agencyAddress: null,
    agencyPhone: parsed.agencyPhone ?? null,
    agencyEmail: parsed.agencyEmail ?? null,
    agencyWebsite: parsed.agencyUrl ?? null,

    imageUrls: parsed.images ?? [],
    rawPayload: {
      rentCurrency: parsed.rentCurrency,
      rentText: parsed.rentText,
      priceOnRequest: parsed.priceOnRequest,
      descriptionHtml: parsed.descriptionHtml,
    },
  });

  return result;
}

// ------- main runner (for testing) -------

async function run() {
  try {
    const urls = await collectAllMcreListingUrls();

    let processed = 0;
    let newListings = 0;

    for (const url of urls) {
      processed++;
      console.log(`[${processed}/${urls.length}] Processing listing: ${url}`);
      try {
        const result = await scrapeSingleMcreListing(url);
        if (result.createdNewListing) {
          newListings++;
        }
        console.log(
          `UPSERT RESULT: listingId=${result.listingId}, sourceId=${result.listingSourceId}, createdNew=${result.createdNewListing}`
        );
      } catch (err: any) {
        console.log(
          `Error while processing listing ${url}:`,
          err?.message || err
        );
      }
    }

    console.log(
      `MCRE full scrape finished. Processed=${processed}, new listings=${newListings}`
    );
  } finally {
    // let ts-node-dev exit by itself
  }
}

if (require.main === module) {
  run();
}

