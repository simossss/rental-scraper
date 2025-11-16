import axios from "axios";
import * as cheerio from "cheerio";
import { ContractType, PropertyType, Condition } from "@prisma/client";
import { upsertParsedListing } from "./upsertListing";

const TEST_URL =
  "https://www.montecarlo-realestate.com/en/properties/mc-tc-6-32736";

async function run() {
  const url = TEST_URL;
  console.log("Fetching MCRE listing:", url);

  const response = await axios.get(url, {
    // Pretend to be a normal desktop browser instead of axios
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      "Upgrade-Insecure-Requests": "1",
      Connection: "keep-alive",
      Referer: "https://www.montecarlo-realestate.com/",
    },
    // follow redirects (default true, but explicit is fine)
    maxRedirects: 5,
    validateStatus: () => true, // we will handle status manually
  });

  console.log("HTTP status from MCRE:", response.status);

  if (response.status !== 200) {
    console.log("Non-200 response, aborting parse.");
    return;
  }

  const html = response.data as string;
  console.log("HTML length:", html.length);

  const $ = cheerio.load(html);

  // ----- SELECTORS (already working from earlier, adjust if needed) -----

  const title = $("h1").first().text().trim();

  const priceText = $(".property__info-price")
    .first()
    .text()
    .trim(); // adjust if changed
  const serviceExpensesText = $("dt:contains('Service expenses:')")
    .next("dd")
    .text()
    .trim();

  const referenceRaw = $("dt:contains('Reference:')")
    .next("dd")
    .text()
    .trim();

  const district = $("dt:contains('District:')")
    .next("dd")
    .text()
    .trim();

  const livingAreaText = $("dt:contains('Living area:')")
    .next("dd")
    .text()
    .trim();
  const totalAreaText = $("dt:contains('Total area:')")
    .next("dd")
    .text()
    .trim();
  const terraceAreaText = $("dt:contains('Terraced area:')")
    .next("dd")
    .text()
    .trim();

  const roomsText = $("dt:contains('Rooms:')")
    .next("dd")
    .text()
    .trim();
  const bedroomsText = $("dt:contains('Bedrooms:')")
    .next("dd")
    .text()
    .trim();
  const bathroomsText = $("dt:contains('Bathrooms:')")
    .next("dd")
    .text()
    .trim();
  const floorText = $("dt:contains('Floor:')")
    .next("dd")
    .text()
    .trim();

  const features: string[] = [];
  $(".property-features .tag").each((_i, el) => {
    const tag = $(el).text().trim();
    if (tag) features.push(tag);
  });

  const description = $(".description").text().trim();

  const imageUrls: string[] = [];
  $(".property__gallery img").each((_i, el) => {
    const src = $(el).attr("data-src") || $(el).attr("src");
    if (src) imageUrls.push(src);
  });

  const parseMoney = (v: string | undefined) => {
    if (!v) return 0;
    const num = v.replace(/[^\d]/g, "");
    return num ? parseInt(num, 10) * 100 : 0;
  };

  const parseIntFrom = (v: string | undefined) => {
    if (!v) return undefined;
    const num = v.replace(/[^\d]/g, "");
    return num ? parseInt(num, 10) : undefined;
  };

  const priceMonthlyCents = parseMoney(priceText);
  const serviceChargesMonthlyCents = parseMoney(serviceExpensesText);

  const livingAreaSqm = parseIntFrom(livingAreaText);
  const totalAreaSqm = parseIntFrom(totalAreaText);
  const terraceAreaSqm = parseIntFrom(terraceAreaText);

  const rooms = parseIntFrom(roomsText);
  const bedrooms = parseIntFrom(bedroomsText);
  const bathrooms = parseIntFrom(bathroomsText);
  const floor = parseIntFrom(floorText);

  const result = await upsertParsedListing({
    sourceWebsiteCode: "MCRE",
    sourceListingId: "mc-tc-6-32736",
    url,
    referenceRaw,
    title,
    city: "Monaco",
    district: district || null,
    buildingName: "Villa Antoinette",
    address: null,

    contractType: "RENT",
    propertyType: "APARTMENT",

    priceMonthlyCents,
    serviceChargesMonthlyCents,
    serviceChargesIncluded: false,

    rooms,
    bedrooms,
    bathrooms,
    totalAreaSqm,
    livingAreaSqm,
    terraceAreaSqm,
    floor,

    parkingSpaces: undefined,
    cellars: undefined,
    isMixedUse: false,

    hasRooftop: true,
    hasTerrace: true,
    hasSeaView: true,
    hasElevator: false,
    condition: Condition.GOOD,

    featuresTags: features,
    description,
    descriptionLang: "en",

    agencyName: "Westrope Real Estate",
    agencyAddress: null,
    agencyPhone: null,
    agencyEmail: null,
    agencyWebsite: null,

    imageUrls,
    rawPayload: { htmlLength: html.length },
  });

  console.log("UPSERT RESULT FROM MCRE SCRAPER:", result);
  console.log("Done.");
}

run().catch((err) => {
  console.error("Error in MCRE single scraper:", err);
});
