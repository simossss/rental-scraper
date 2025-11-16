// src/api/server.ts
import express from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 3001;

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

/**
 * GET /listings
 *
 * Query params:
 * - minRent, maxRent      -> in EUR (float or int); converted to cents
 * - districts             -> comma separated list of district names (exact match)
 * - buildings             -> comma separated list of building names (contains, case-insensitive)
 * - hasParking            -> "true" | "false"
 * - minScore              -> minimum score (0-100)
 * - rooms                 -> comma separated list of room counts (2, 3, 4, 5 for 5+)
 * - showZeroPrice         -> "true" to show listings with 0 price and >3 rooms
 * - take                  -> page size, default 50
 * - skip                  -> offset, default 0
 * - orderBy               -> "priceAsc" | "priceDesc" | "createdDesc" | "createdAsc" | "scoreDesc"
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

    // pagination
    const take = req.query.take ? Number(req.query.take) : 50;
    const skip = req.query.skip ? Number(req.query.skip) : 0;

    // sorting
    const orderByParam = (req.query.orderBy as string | undefined) || "priceAsc";
    let orderBy: any = { priceMonthlyCents: "asc" as const };

    if (orderByParam === "priceDesc") {
      orderBy = { priceMonthlyCents: "desc" };
    } else if (orderByParam === "createdDesc") {
      orderBy = { createdAt: "desc" };
    } else if (orderByParam === "createdAsc") {
      orderBy = { createdAt: "asc" };
    } else if (orderByParam === "scoreDesc") {
      orderBy = { score: "desc" };
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
      where.district = { in: districts };
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
    
    // Add AND conditions if any
    if (andConditions.length > 0) {
      where.AND = andConditions;
    }

    // ------- query DB -------

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
        districts,
        buildings,
        hasParking,
        minScore: minScore ?? null,
        rooms,
        showZeroPrice,
      },
      items,
    });
  } catch (err: any) {
    console.error("Error in GET /listings:", err);
    res.status(500).json({ error: err?.message || "Internal error" });
  }
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`API server listening on port ${PORT}`);
});
