// src/scrapers/cim-full-v2.ts
import axios from "axios";
import * as cheerio from "cheerio";
import { ContractType, PropertyType } from "@prisma/client";
import { upsertParsedListing } from "./upsertListing";
import { parseCimListing } from "./cim-parse";

const BASE_HOST = "https://www.chambre-immobiliere-monaco.mc";
const BASE_GRID_URL =
  BASE_HOST +
  "/it/affitti/t_appartement/t_duplex/t_loft/t_penthouse%7Croof/p_2/p_3/p_4/p_5/p_plus/grid";

// ------- helpers to parse grid -------

function parseResultsText($: cheerio.CheerioAPI): {
  from: number;
  to: number;
  total: number;
} {
  const bodyText = $("body").text();
  const match = bodyText.match(/da\s+(\d+)\s+a\s+(\d+)\s+su\s+(\d+)/i);
  if (!match) {
    throw new Error("Could not find results text like 'da 1 a 24 su 276'");
  }
  const from = parseInt(match[1], 10);
  const to = parseInt(match[2], 10);
  const total = parseInt(match[3], 10);
  return { from, to, total };
}

function extractListingUrlsFromGrid($: cheerio.CheerioAPI): string[] {
  const urls: string[] = [];
  $("a[href^='/it/property/']").each((_i, el) => {
    const href = $(el).attr("href");
    if (!href) return;
    const fullUrl = BASE_HOST + href;
    urls.push(fullUrl);
  });
  return urls;
}

async function fetchGridPage(page: number): Promise<{
  html: string;
  $: cheerio.CheerioAPI;
}> {
  const url = page === 1 ? BASE_GRID_URL : `${BASE_GRID_URL}/${page}`;
  console.log(`Fetching CIM grid page ${page}: ${url}`);
  const res = await axios.get(url, { timeout: 10000 });
  console.log(`HTTP status from CIM grid page ${page}: ${res.status}`);
  const html = res.data as string;
  const $ = cheerio.load(html);
  return { html, $ };
}

export async function collectAllListingUrls(): Promise<string[]> {
  const all = new Set<string>();

  // page 1 to discover total pages
  const { $, html } = await fetchGridPage(1);
  const { from, to, total } = parseResultsText($);
  console.log(`Page 1 results text: da ${from} a ${to} su ${total}`);
  const perPage = to - from + 1;
  const totalPages = Math.ceil(total / perPage);
  console.log(
    `Detected total results: ${total}, per page: ${perPage}, total pages: ${totalPages}`
  );

  extractListingUrlsFromGrid($).forEach((u) => all.add(u));

  for (let page = 2; page <= totalPages; page++) {
    const pageRes = await fetchGridPage(page);
    const pageResults = parseResultsText(pageRes.$);
    console.log(
      `Page ${page} results text: da ${pageResults.from} a ${pageResults.to} su ${pageResults.total}`
    );
    extractListingUrlsFromGrid(pageRes.$).forEach((u) => all.add(u));
  }

  const urls = Array.from(all);
  console.log("----");
  console.log(`Total unique URLs collected: ${urls.length}`);
  return urls;
}

// ------- helpers for single listing -------

function extractSourceListingIdFromUrl(url: string): string {
  // Extract the numeric ID from URL: /property/118798/... -> 118798
  const match = url.match(/\/property\/(\d+)/);
  if (match) return match[1];
  // Fallback: try to get any ID from the URL path
  const fallbackMatch = url.match(/\/property\/([^\/]+)/);
  return fallbackMatch ? fallbackMatch[1] : url;
}

// Use the shared parser
export async function scrapeSingleListing(url: string) {
  console.log(`Fetching listing: ${url}`);
  const res = await axios.get(url, { timeout: 10000 });
  console.log(`HTTP status from CIM listing: ${res.status}`);

  const html = res.data as string;
  const parsed = parseCimListing(html, url);

  // Monthly rent -> cents
  const priceMonthlyCents =
    parsed.monthlyRent != null ? parsed.monthlyRent * 100 : 0;

  // Extract URL ID first (most reliable for deduplication)
  const urlId = extractSourceListingIdFromUrl(url);
  
  const result = await upsertParsedListing({
    sourceWebsiteCode: "CIM",
    sourceListingId: urlId, // Always use URL ID for sourceListingId (unique per listing)
    url,

    referenceRaw: parsed.externalId ?? undefined, // RIF code goes here for reference matching

    title: parsed.title,
    city: "Monaco",
    district: parsed.neighbourhood ?? null,
    buildingName: parsed.buildingName ?? null,
    address: null,

    contractType: ContractType.RENT,
    propertyType: PropertyType.APARTMENT,

    priceMonthlyCents,
    serviceChargesMonthlyCents: null,
    serviceChargesIncluded: null,

    rooms: parsed.rooms ?? null,
    bedrooms: parsed.bedrooms ?? null,
    bathrooms: parsed.bathrooms ?? null,
    totalAreaSqm: parsed.totalAreaSqm ?? null,
    livingAreaSqm: null,
    terraceAreaSqm: parsed.terraceAreaSqm ?? null,

    // floor is string | null in parsed, DB expects number | null
    floor:
      parsed.floor != null && parsed.floor !== ""
        ? parseInt(parsed.floor, 10)
        : null,

    parkingSpaces: null,
    cellars: null,
    isMixedUse: null,

    hasRooftop: null,
    hasTerrace:
      parsed.terraceAreaSqm != null && parsed.terraceAreaSqm > 0 ? true : null,
    hasSeaView: null,
    hasElevator: null,
    condition: null,

    featuresTags: [],
    description: parsed.descriptionText ?? null,
    // description is in French on your sample page, adjust if you prefer "it"
    descriptionLang: "fr",

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

// ------- main runner -------

async function run() {
  try {
    const urls = await collectAllListingUrls();

    let processed = 0;
    let newListings = 0;

    for (const url of urls) {
      processed++;
      console.log(`[${processed}/${urls.length}] Processing listing: ${url}`);
      try {
        const result = await scrapeSingleListing(url);
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
      `CIM full scrape finished. Processed=${processed}, new listings=${newListings}`
    );
  } finally {
    // let ts-node-dev exit by itself
  }
}

run();
