// src/api/server.ts
import express from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

// Middlewares
const corsOrigin = process.env.CORS_ORIGIN || '*';
app.use(cors({
  origin: corsOrigin === '*' ? true : corsOrigin.split(','),
  credentials: true,
}));
app.use(express.json());

// Health check
app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

// Scrape endpoint (for external cron triggers)
app.post("/scrape", async (req, res) => {
  console.log('📡 Scrape endpoint called at', new Date().toISOString());
  
  // Optional: Add auth token check for security
  const authToken = req.headers['x-auth-token'] as string | undefined;
  const expectedToken = process.env.SCRAPE_AUTH_TOKEN;
  
  if (expectedToken && authToken !== expectedToken) {
    console.log('❌ Unauthorized scrape attempt');
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  console.log('✅ Starting scraper...');
  
  // Run scraper in background (don't wait for completion)
  import('../scrapers/runScrape').then(({ runScrape }) => {
    console.log('📦 Scraper module loaded, starting scrape...');
    runScrape()
      .then((result) => {
        console.log('✅ Scrape completed:', result);
      })
      .catch((err) => {
        console.error('❌ Error in scraper:', err);
        console.error('Error stack:', err?.stack);
      });
  }).catch((err) => {
    console.error('❌ Error loading scraper module:', err);
    console.error('Error stack:', err?.stack);
  });
  
  res.json({ message: 'Scrape started', status: 'running' });
});

// Seed endpoint (for initializing source websites)
app.post("/seed", async (req, res) => {
  // Optional: Add auth token check for security
  const authToken = req.headers['x-auth-token'] as string | undefined;
  const expectedToken = process.env.SCRAPE_AUTH_TOKEN;
  
  if (expectedToken && authToken !== expectedToken) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    const { seedSourceWebsites } = await import('../maintenance/seed-source-websites');
    await seedSourceWebsites();
    // Don't disconnect Prisma - we're running in the same process as the API
    res.json({ message: 'Database seeded successfully' });
  } catch (err: any) {
    console.error('Error seeding database:', err);
    res.status(500).json({ error: err?.message || 'Internal error' });
  }
});

// Daily summary endpoint (for cron job at 7:30 PM CET)
app.post("/daily-summary", async (req, res) => {
  // Optional: Add auth token check for security
  const authToken = req.headers['x-auth-token'] as string | undefined;
  const expectedToken = process.env.SCRAPE_AUTH_TOKEN;
  
  if (expectedToken && authToken !== expectedToken) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    const { getTodaySummary } = await import('../lib/dailySummary');
    const { initTelegram, sendDailySummary } = await import('../notifications/telegram');
    
    // Initialize Telegram if credentials are provided
    const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
    const telegramChatId = process.env.TELEGRAM_CHAT_ID;
    
    if (!telegramBotToken || !telegramChatId) {
      return res.status(500).json({ error: 'Telegram not configured' });
    }
    
    initTelegram(telegramBotToken, telegramChatId);
    
    // Get today's summary
    const summary = await getTodaySummary(prisma);
    
    // Send notification
    const sent = await sendDailySummary(summary);
    
    if (sent) {
      res.json({ message: 'Daily summary sent', summary });
    } else {
      res.status(500).json({ error: 'Failed to send daily summary' });
    }
  } catch (err: any) {
    console.error('Error in daily summary:', err);
    res.status(500).json({ error: err?.message || 'Internal error' });
  }
});

/**
 * GET /listings
 *
 * Query params:
 * - minRent, maxRent      -> in EUR (float or int); converted to cents
 * - minArea, maxArea      -> in sqm (float or int); living area only
 * - districts             -> comma separated list of district names (exact match)
 * - buildings             -> comma separated list of building names (contains, case-insensitive)
 * - hasParking            -> "true" | "false"
 * - minScore              -> minimum score (0-100)
 * - rooms                 -> comma separated list of room counts (2, 3, 4, 5 for 5+)
 * - showZeroPrice         -> "true" to show listings with 0 price and >3 rooms
 * - excludeLaw887         -> "true" to exclude listings with "887" in the title
 * - take                  -> page size, default 50
 * - skip                  -> offset, default 0
 * - orderBy               -> "priceAsc" | "priceDesc" | "createdDesc" | "createdAsc" | "scoreDesc" | "areaAsc" | "areaDesc" | "pricePerSqmAsc" | "pricePerSqmDesc"
 */
app.get("/listings", async (req, res) => {
  try {
    // ------- parse filters from query -------

    // price range in EUR -> cents
    const minRentEur = req.query.minRent
      ? Number(req.query.minRent)
      : undefined;
    const maxRentEur = req.query.maxRent
      ? Number(req.query.maxRent)
      : undefined;

    const minRentCents =
      typeof minRentEur === "number" && !Number.isNaN(minRentEur)
        ? Math.round(minRentEur * 100)
        : undefined;
    const maxRentCents =
      typeof maxRentEur === "number" && !Number.isNaN(maxRentEur)
        ? Math.round(maxRentEur * 100)
        : undefined;

    // districts: exact match, but multiple allowed
    const districtsRaw = req.query.districts as string | undefined;
    const districts = districtsRaw
      ? districtsRaw
          .split(",")
          .map((d) => d.trim())
          .filter(Boolean)
      : [];

    // buildings: we treat as "contains" filters, multiple allowed
    const buildingsRaw = req.query.buildings as string | undefined;
    const buildings = buildingsRaw
      ? buildingsRaw
          .split(",")
          .map((b) => b.trim())
          .filter(Boolean)
      : [];

    // hasParking: true -> parkingSpaces > 0, false -> parkingSpaces == 0 or null
    const hasParkingRaw = req.query.hasParking as string | undefined;
    const hasParking =
      hasParkingRaw === "true"
        ? true
        : hasParkingRaw === "false"
        ? false
        : undefined;

    // minScore: minimum score filter
    const minScoreRaw = req.query.minScore as string | undefined;
    const minScore =
      minScoreRaw && !Number.isNaN(Number(minScoreRaw))
        ? Number(minScoreRaw)
        : undefined;

    // rooms: filter by room count (2, 3, 4, or 5+)
    const roomsRaw = req.query.rooms as string | undefined;
    const rooms = roomsRaw
      ? roomsRaw
          .split(",")
          .map((r) => parseInt(r.trim(), 10))
          .filter((r) => !Number.isNaN(r))
      : [];

    // showZeroPrice: whether to show listings with 0 price and >3 rooms
    const showZeroPriceRaw = req.query.showZeroPrice as string | undefined;
    const showZeroPrice = showZeroPriceRaw === "true";

    // excludeLaw887: whether to exclude listings with "887" in the title
    const excludeLaw887Raw = req.query.excludeLaw887 as string | undefined;
    const excludeLaw887 = excludeLaw887Raw === "true";

    // area range in sqm (living area only)
    const minArea = req.query.minArea
      ? Number(req.query.minArea)
      : undefined;
    const maxArea = req.query.maxArea
      ? Number(req.query.maxArea)
      : undefined;

    // pagination
    const take = req.query.take ? Number(req.query.take) : 50;
    const skip = req.query.skip ? Number(req.query.skip) : 0;

    // sorting
    const orderByParam = (req.query.orderBy as string | undefined) || "priceAsc";
    let orderBy: any = { priceMonthlyCents: "asc" as const };
    let needsPricePerSqmSort = false;

    if (orderByParam === "priceDesc") {
      orderBy = { priceMonthlyCents: "desc" };
    } else if (orderByParam === "createdDesc") {
      orderBy = { createdAt: "desc" };
    } else if (orderByParam === "createdAsc") {
      orderBy = { createdAt: "asc" };
    } else if (orderByParam === "scoreDesc") {
      orderBy = { score: "desc" };
    } else if (orderByParam === "areaAsc") {
      orderBy = { livingAreaSqm: "asc" };
    } else if (orderByParam === "areaDesc") {
      orderBy = { livingAreaSqm: "desc" };
    } else if (orderByParam === "pricePerSqmAsc" || orderByParam === "pricePerSqmDesc") {
      // Price per sqm requires custom sorting (computed field)
      needsPricePerSqmSort = true;
      orderBy = { priceMonthlyCents: "asc" }; // Temporary, will be overridden
    }

    // ------- build Prisma "where" -------
    const where: any = {
      contractType: "RENT",
    };
    
    // Build AND conditions array for complex filters
    const andConditions: any[] = [];
    
    // Exclude listings with 0 price and >3 rooms by default
    // (unless showZeroPrice is true)
    if (!showZeroPrice) {
      andConditions.push({
        OR: [
          { priceMonthlyCents: { gt: 0 } },
          { rooms: { lte: 3 } },
          { rooms: null },
        ],
      });
    }

    if (minRentCents !== undefined || maxRentCents !== undefined) {
      const priceFilter: any = {};
      if (minRentCents !== undefined) {
        priceFilter.gte = minRentCents;
      }
      if (maxRentCents !== undefined) {
        priceFilter.lte = maxRentCents;
      }
      andConditions.push({ priceMonthlyCents: priceFilter });
    }

    if (districts.length > 0) {
      // Case-insensitive district filtering
      // Use Prisma's case-insensitive string matching
      // Since Prisma's equals doesn't support mode: "insensitive" directly,
      // we use a workaround: check if the district (lowercased) matches any of the selected districts (lowercased)
      andConditions.push({
        OR: districts.map((district) => ({
          district: {
            // Use contains with mode insensitive as a workaround for case-insensitive exact match
            // This works because we're matching the full district name
            contains: district,
            mode: "insensitive",
          },
        })),
      });
    }

    if (buildings.length > 0) {
      andConditions.push({
        OR: buildings.map((b) => ({
          buildingName: { contains: b, mode: "insensitive" },
        })),
      });
    }

    if (hasParking === true) {
      where.parkingSpaces = { gt: 0 };
    } else if (hasParking === false) {
      andConditions.push({
        OR: [
          { parkingSpaces: null },
          { parkingSpaces: 0 },
        ],
      });
    }

    if (minScore !== undefined) {
      where.score = { gte: minScore };
    }

    // area filter: living area only
    if (minArea !== undefined || maxArea !== undefined) {
      const areaFilter: any = {};
      if (minArea !== undefined && !Number.isNaN(minArea)) {
        areaFilter.gte = minArea;
      }
      if (maxArea !== undefined && !Number.isNaN(maxArea)) {
        areaFilter.lte = maxArea;
      }
      if (Object.keys(areaFilter).length > 0) {
        andConditions.push({ livingAreaSqm: areaFilter });
      }
    }

    // rooms filter: handle 2, 3, 4, and 5+ (where 5+ means >= 5)
    if (rooms.length > 0) {
      const roomConditions: any[] = [];
      
      // Handle specific room counts (2, 3, 4)
      const specificRooms = rooms.filter((r) => r >= 2 && r <= 4);
      if (specificRooms.length > 0) {
        roomConditions.push({ rooms: { in: specificRooms } });
      }
      
      // Handle 5+ (group 5 and up)
      if (rooms.includes(5)) {
        roomConditions.push({ rooms: { gte: 5 } });
      }
      
      if (roomConditions.length > 0) {
        andConditions.push({ OR: roomConditions });
      }
    }

    // Exclude Law 887 listings (if excludeLaw887 is true)
    if (excludeLaw887) {
      andConditions.push({
        NOT: {
          title: {
            contains: "887",
            mode: "insensitive",
          },
        },
      });
    }
    
    // Add AND conditions if any
    if (andConditions.length > 0) {
      where.AND = andConditions;
    }

    // ------- query DB -------

    // For price per sqm sorting, we need to fetch all matching items, calculate, sort, then paginate
    if (needsPricePerSqmSort) {
      const allItems = await prisma.listing.findMany({
        where,
      });

      // Calculate price per sqm for each listing
      const itemsWithPricePerSqm = allItems.map((item) => {
        const livingArea = item.livingAreaSqm ?? 
          (item.totalAreaSqm && item.terraceAreaSqm 
            ? Math.max(0, item.totalAreaSqm - item.terraceAreaSqm)
            : item.totalAreaSqm);
        
        const priceEur = item.priceMonthlyCents / 100;
        const pricePerSqm = livingArea && livingArea > 0 && priceEur > 0
          ? priceEur / livingArea
          : null;

        return {
          ...item,
          _pricePerSqm: pricePerSqm ?? Infinity, // Use Infinity for nulls so they sort last
        };
      });

      // Sort by price per sqm
      const sortDirection = orderByParam === "pricePerSqmAsc" ? 1 : -1;
      itemsWithPricePerSqm.sort((a, b) => {
        if (a._pricePerSqm === Infinity && b._pricePerSqm === Infinity) return 0;
        if (a._pricePerSqm === Infinity) return 1;
        if (b._pricePerSqm === Infinity) return -1;
        return (a._pricePerSqm - b._pricePerSqm) * sortDirection;
      });

      // Remove the temporary field and paginate
      const total = itemsWithPricePerSqm.length;
      const items = itemsWithPricePerSqm
        .slice(skip, skip + take)
        .map(({ _pricePerSqm, ...item }) => item);

      res.json({
        total,
        take,
        skip,
        orderBy: orderByParam,
        filters: {
          minRentEur: minRentEur ?? null,
          maxRentEur: maxRentEur ?? null,
          minArea: minArea ?? null,
          maxArea: maxArea ?? null,
          districts,
          buildings,
          hasParking,
          minScore: minScore ?? null,
          rooms,
          showZeroPrice,
          excludeLaw887,
        },
        items,
      });
    } else {
      // Standard query for other sort options
      const [items, total] = await Promise.all([
        prisma.listing.findMany({
          where,
          orderBy,
          take,
          skip,
        }),
        prisma.listing.count({ where }),
      ]);

      res.json({
        total,
        take,
        skip,
        orderBy: orderByParam,
        filters: {
          minRentEur: minRentEur ?? null,
          maxRentEur: maxRentEur ?? null,
          minArea: minArea ?? null,
          maxArea: maxArea ?? null,
          districts,
          buildings,
          hasParking,
          minScore: minScore ?? null,
          rooms,
          showZeroPrice,
          excludeLaw887,
        },
        items,
      });
    }
  } catch (err: any) {
    console.error("Error in GET /listings:", err);
    res.status(500).json({ error: err?.message || "Internal error" });
  }
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`API server listening on port ${PORT}`);
});
