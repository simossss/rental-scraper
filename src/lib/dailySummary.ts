import { PrismaClient } from '@prisma/client';

/**
 * Get today's date string in Central European Time (CET/CEST)
 */
function getTodayCETDateString(): string {
  const now = new Date();
  
  // Get today's date string in Europe/Paris timezone (CET/CEST)
  const dateFormatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  
  const dateParts = dateFormatter.formatToParts(now);
  const day = dateParts.find(p => p.type === 'day')!.value;
  const month = dateParts.find(p => p.type === 'month')!.value;
  const year = dateParts.find(p => p.type === 'year')!.value;
  
  return `${day}/${month}/${year}`;
}

/**
 * Get today's new listings grouped by room number
 * Uses PostgreSQL's timezone conversion to properly handle CET/CEST
 */
export async function getTodaySummary(prisma: PrismaClient): Promise<{
  total: number;
  byRooms: Array<{ rooms: number | null; count: number }>;
  date: string;
}> {
  const dateString = getTodayCETDateString();
  
  // Use raw SQL to query listings where firstSeenAt (converted to Europe/Paris timezone) is today
  // This properly handles DST transitions
  // firstSeenAt is stored as TIMESTAMP WITHOUT TIME ZONE (assumed UTC), so we convert it to Europe/Paris
  const result = await prisma.$queryRaw<Array<{ rooms: number | null }>>`
    SELECT rooms
    FROM "Listing"
    WHERE DATE(("firstSeenAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Paris') = 
          DATE((NOW() AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Paris')
  `;
  
  // Group by room number
  const roomCounts = new Map<number | null, number>();
  
  for (const row of result) {
    const rooms = row.rooms;
    roomCounts.set(rooms, (roomCounts.get(rooms) || 0) + 1);
  }
  
  // Convert to array and sort
  const byRooms = Array.from(roomCounts.entries())
    .map(([rooms, count]) => ({ rooms, count }))
    .sort((a, b) => {
      // Sort: null last, then by room count ascending
      if (a.rooms === null && b.rooms === null) return 0;
      if (a.rooms === null) return 1;
      if (b.rooms === null) return -1;
      return a.rooms - b.rooms;
    });
  
  return {
    total: result.length,
    byRooms,
    date: dateString,
  };
}

