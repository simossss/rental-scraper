// src/scrapers/mcre-full.ts
// MCRE scraper for Monte Carlo Real Estate listings
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
  const urls = new Set<string>();
  // MCRE uses links like /en/properties/mc-tc-6-32736 or /en/properties/mc-tc-155-32201
  // Look for links in listing cards/containers, not navigation or footer links
  $("a[href*='/properties/']").each((_i, el) => {
    const href = $(el).attr("href");
    if (!href) return;
    
    // Only include URLs that match the property listing pattern: /en/properties/mc-tc-XXX-XXXXX
    // Pattern: /properties/ followed by alphanumeric-dash pattern (e.g., mc-tc-155-32201)
    if (!/\/properties\/[^\/\?]+/.test(href)) return;
    
    // Skip if it's clearly in navigation menu (not listing cards)
    // Be less aggressive - only skip if it's in a main nav menu, not listing cards
    const $el = $(el);
    const isInMainNav = $el.closest('nav.main, nav.navigation, header nav, .main-menu, .site-nav').length > 0;
    if (isInMainNav) return;
    
    // Skip "similar properties" or "related properties" sections (these are on detail pages, not listing pages)
    const isInSimilar = $el.closest('.similar-properties, .related-properties, .other-properties').length > 0;
    if (isInSimilar) return;
    
    // Build full URL
    let fullUrl = href.startsWith("http") ? href : BASE_HOST + href;
    
    // Remove query parameters and fragments to normalize URLs
    try {
      const urlObj = new URL(fullUrl);
      urlObj.search = '';
      urlObj.hash = '';
      fullUrl = urlObj.toString();
    } catch (e) {
      // If URL parsing fails, skip this URL
      console.warn(`Failed to parse URL: ${fullUrl}`, e);
      return;
    }
    
    urls.add(fullUrl);
  });
  return Array.from(urls);
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
  // Look for pagination links in various formats
  const pageLinks = $(".pagination a, .pager a, [class*='page'] a, [class*='pagination'] a, nav a");
  let maxPage = 1;
  
  pageLinks.each((_i, el) => {
    const text = $(el).text().trim();
    const href = $(el).attr("href") || "";
    // Try to extract page number from text
    let pageNum = parseInt(text, 10);
    // If text doesn't parse, try extracting from href (e.g., ?page=5)
    if (isNaN(pageNum)) {
      const pageMatch = href.match(/[?&]page=(\d+)/);
      if (pageMatch) {
        pageNum = parseInt(pageMatch[1], 10);
      }
    }
    if (!isNaN(pageNum) && pageNum > maxPage) {
      maxPage = pageNum;
    }
  });
  
  // Also check for "next" button or "last" button
  const nextButton = $("a:contains('Next'), a:contains('next'), .next, [aria-label*='next' i], [aria-label*='Next' i]");
  const hasNext = nextButton.length > 0 && !nextButton.hasClass('disabled');
  
  // If we found pages, return max; otherwise check if there's a next button
  if (maxPage > 1) {
    return maxPage;
  }
  
  // If there's a next button, we'll discover pages dynamically
  // Return a high number to ensure we check many pages, but the loop will stop when no listings are found
  return hasNext ? 50 : 1; // Increased from 10 to 50 to catch more pages
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

  // Fetch remaining pages - continue until we find no more listings
  // This ensures we don't miss listings even if pagination detection is imperfect
  let consecutiveEmptyPages = 0;
  const maxConsecutiveEmpty = 2; // Stop after 2 consecutive empty pages
  const maxPagesToCheck = 100; // Absolute maximum pages to check (safety limit)
  
  // Continue beyond detected pages if we're still finding listings
  const actualMaxPages = Math.max(totalPages, 20); // At least check 20 pages
  
  for (let page = 2; page <= Math.min(actualMaxPages, maxPagesToCheck); page++) {
    try {
      const { $ } = await fetchListingsPage(page);
      const pageUrls = extractListingUrlsFromPage($);
      
      if (pageUrls.length === 0) {
        consecutiveEmptyPages++;
        console.log(`Page ${page}: No listings found (consecutive empty: ${consecutiveEmptyPages})`);
        
        if (consecutiveEmptyPages >= maxConsecutiveEmpty) {
          console.log(`Stopping pagination after ${maxConsecutiveEmpty} consecutive empty pages`);
          break;
        }
        continue; // Try next page even if this one is empty
      }
      
      // Reset counter if we found listings
      consecutiveEmptyPages = 0;
      pageUrls.forEach((u) => all.add(u));
      console.log(`Page ${page}: Found ${pageUrls.length} listing URLs (total unique: ${all.size})`);
      
      // If we got significantly fewer URLs than expected, might be approaching last page
      if (pageUrls.length < urlsPage1.length * 0.3) {
        console.log(`Page ${page}: Significantly fewer listings (${pageUrls.length} vs ${urlsPage1.length}), might be approaching last page`);
      }
      
      // If we're beyond detected pages but still finding listings, continue
      if (page > totalPages && pageUrls.length > 0) {
        console.log(`Page ${page}: Found listings beyond detected page count (${totalPages}), continuing...`);
      }
    } catch (err: any) {
      consecutiveEmptyPages++;
      console.error(`Error fetching page ${page}:`, err.message);
      
      // If we get multiple consecutive errors, stop
      if (consecutiveEmptyPages >= maxConsecutiveEmpty) {
        console.log(`Stopping pagination after ${maxConsecutiveEmpty} consecutive errors`);
        break;
      }
      
      // Wait a bit before retrying next page
      await new Promise(resolve => setTimeout(resolve, 1000));
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

