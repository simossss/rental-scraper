import { ContractType, PropertyType, Condition } from "@prisma/client";
import { upsertParsedListing } from "./scrapers/upsertListing";

async function main() {
  const result = await upsertParsedListing({
    // Source info
    sourceWebsiteCode: "CIM",
    sourceListingId: "99966",
    url: "https://www.chambre-immobiliere-monaco.mc/it/property/99966/villa-antoinette-duplex-3-pi%C3%A8ces-avec-rooftop-et-vue-mer",

    // Reference
    referenceRaw: "RIF WL VILLA ANTOINETTE",

    // Basic info
    title: "Villa Antoinette: Rooftop / Penthouse Duplex 2 Bedroom Apartment with Sea View",
    city: "Monaco",
    district: "La Rousse - Saint Roman",
    buildingName: "Villa Antoinette",
    address: null,

    contractType: ContractType.RENT,
    propertyType: PropertyType.APARTMENT,

    // Money
    priceMonthlyCents: 990000, // €9,900
    serviceChargesMonthlyCents: 16000,
    serviceChargesIncluded: false,

    // Size
    rooms: 3,
    bedrooms: 2,
    bathrooms: 1,
    totalAreaSqm: 220,
    livingAreaSqm: 110,
    terraceAreaSqm: 110,
    floor: 4,

    // Extras
    parkingSpaces: 1,
    cellars: 1,
    isMixedUse: false,

    hasRooftop: true,
    hasTerrace: true,
    hasSeaView: true,
    hasElevator: false,
    condition: Condition.GOOD,

    featuresTags: ["Panoramic view", "Cellar", "Good condition"],
    description: "Magnificent duplex on the top floor with sea view and rooftop terrace.",
    descriptionLang: "en",

    agencyName: "Westrope Real Estate",
    agencyAddress: "22 boulevard des Moulins, Monaco",
    agencyPhone: "+377 93 50 50 50",
    agencyEmail: "info@westrope.mc",
    agencyWebsite: "https://www.westrope.mc",

    imageUrls: [
      "https://example.com/img1.jpg",
      "https://example.com/img2.jpg"
    ],

    rawPayload: {
      debug: true,
      example: "this is raw payload for debugging"
    }
  });

  console.log("UPSERT RESULT:", result);
}

main().catch(console.error);
