import axios from "axios";
import * as cheerio from "cheerio";

const BASE_GRID_URL =
  "https://www.chambre-immobiliere-monaco.mc/it/affitti/t_appartement/t_duplex/t_loft/t_penthouse%7Croof/p_2/p_3/p_4/p_5/p_plus/grid";

const DOMAIN = "https://www.chambre-immobiliere-monaco.mc";

type GridPageResult = {
  listingUrls: string[];
  from?: number;
  to?: number;
  total?: number;
};

async function fetchGridPage(page: number): Promise<GridPageResult> {
  const url = page === 1 ? BASE_GRID_URL : `${BASE_GRID_URL}/${page}`;
  console.log(`Fetching CIM grid page ${page}: ${url}`);

  const response = await axios.get(url);
  console.log(`HTTP status from CIM grid page ${page}: ${response.status}`);

  if (response.status !== 200) {
    return { listingUrls: [] };
  }

  const html = response.data as string;
  const $ = cheerio.load(html);

  // Collect listing URLs from the grid
  const urls = new Set<string>();

  $('a[href^="/it/property/"]').each((_i, el) => {
    const href = $(el).attr("href");
    if (!href) return;
    const fullUrl = href.startsWith("http") ? href : `${DOMAIN}${href}`;
    urls.add(fullUrl);
  });

  // Try to parse the "Risultati da 1 a 24 su 276" text
  let from: number | undefined;
  let to: number | undefined;
  let total: number | undefined;

  const allText = $("body").text();
  const match = /Risultati da\s+(\d+)\s+a\s+(\d+)\s+su\s+(\d+)/.exec(allText);

  if (match) {
    from = parseInt(match[1], 10);
    to = parseInt(match[2], 10);
    total = parseInt(match[3], 10);
    console.log(`Page ${page} results text: da ${from} a ${to} su ${total}`);
  } else {
    console.log(`Page ${page}: could not find "Risultati da ... su ..." text`);
  }

  return {
    listingUrls: Array.from(urls),
    from,
    to,
    total,
  };
}

async function run() {
  const allUrls = new Set<string>();

  // 1. Fetch first page to get total and per-page
  const firstPage = await fetchGridPage(1);

  if (firstPage.listingUrls.length === 0) {
    console.log("No listings found on page 1, aborting.");
    return;
  }

  firstPage.listingUrls.forEach((u) => allUrls.add(u));

  let totalPages: number | undefined = undefined;

  if (
    typeof firstPage.from === "number" &&
    typeof firstPage.to === "number" &&
    typeof firstPage.total === "number"
  ) {
    const perPage = firstPage.to - firstPage.from + 1;
    if (perPage > 0) {
      totalPages = Math.ceil(firstPage.total / perPage);
      console.log(
        `Detected total results: ${firstPage.total}, per page: ${perPage}, total pages: ${totalPages}`
      );
    }
  }

  // 2. If we know total pages, loop through remaining pages
  if (totalPages && totalPages > 1) {
    for (let page = 2; page <= totalPages; page++) {
      const pageResult = await fetchGridPage(page);
      if (pageResult.listingUrls.length === 0) {
        console.log(`Page ${page} returned 0 listings, stopping early.`);
        break;
      }
      pageResult.listingUrls.forEach((u) => allUrls.add(u));
      // Tiny delay to be polite
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  } else {
    console.log(
      "Could not determine total pages from the text, only fetched page 1."
    );
  }

  console.log("----");
  console.log("Total unique URLs collected:", allUrls.size);
  for (const url of allUrls) {
    console.log(" -", url);
  }
}

run().catch((err) => {
  console.error("Error in CIM grid scraper:", err);
});
