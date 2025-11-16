// src/scrapers/cim-single.ts
import axios from "axios";
import { parseCimListing } from "./cim-parse";

async function run() {
  const url =
    process.argv[2] ||
    "https://www.chambre-immobiliere-monaco.mc/it/property/47410/agréable-2-pièces-meublé-situé-dans-une-résidence";

  console.log(`Fetching CIM listing: ${url}`);
  const res = await axios.get(url, { timeout: 10000 });
  console.log(`HTTP status from CIM listing: ${res.status}`);

  const html = res.data as string;
  const parsed = parseCimListing(html, url);

  console.log("Parsed listing:");
  console.log(JSON.stringify(parsed, null, 2));
}

run();
