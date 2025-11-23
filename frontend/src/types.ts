export interface Listing {
  id: string;
  title: string;
  city: string;
  district: string | null;
  buildingName: string | null;
  address: string | null;
  priceMonthlyCents: number;
  currency: string;
  rooms: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  totalAreaSqm: number | null;
  livingAreaSqm: number | null;
  terraceAreaSqm: number | null;
  floor: number | null;
  parkingSpaces: number | null;
  hasRooftop: boolean | null;
  hasTerrace: boolean | null;
  hasSeaView: boolean | null;
  hasElevator: boolean | null;
  hasConcierge: boolean | null;
  hasAC: boolean | null;
  score: number | null;
  imageUrls: string[] | null;
  primaryUrl: string | null;
  agencyName: string | null;
  description: string | null;
  firstSeenAt: string; // ISO date string
}

export interface ListingsResponse {
  total: number;
  take: number;
  skip: number;
  orderBy: string;
  filters: {
    minRentEur: number | null;
    maxRentEur: number | null;
    districts: string[];
    buildings: string[];
    hasParking: boolean | null;
    minScore: number | null;
  };
  items: Listing[];
}

export interface Filters {
  minRent: number | null;
  maxRent: number | null;
  minArea: number | null;
  maxArea: number | null;
  districts: string[];
  buildings: string[];
  hasParking: boolean | null;
  minScore: number | null;
  rooms: number[]; // Array of room counts (2, 3, 4, or 5+)
  showZeroPrice: boolean; // Show listings with 0 price and >3 rooms
  excludeLaw887: boolean; // Exclude listings with "887" in the title
}

export type SortOption = 'scoreDesc' | 'priceAsc' | 'priceDesc' | 'createdDesc' | 'areaAsc' | 'areaDesc' | 'pricePerSqmAsc' | 'pricePerSqmDesc';

