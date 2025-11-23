import type { ListingsResponse, Filters, SortOption } from './types';

// Use Vercel rewrite in production, or direct API URL if set, or localhost for dev
const API_BASE_URL = import.meta.env.VITE_API_URL || 
  (import.meta.env.PROD ? '/api' : 'http://localhost:3001');

export async function fetchListings(
  filters: Filters,
  sortBy: SortOption = 'scoreDesc',
  page: number = 0,
  pageSize: number = 20
): Promise<ListingsResponse> {
  const params = new URLSearchParams();
  
  if (filters.minRent !== null) {
    params.append('minRent', filters.minRent.toString());
  }
  if (filters.maxRent !== null) {
    params.append('maxRent', filters.maxRent.toString());
  }
  if (filters.minArea !== null) {
    params.append('minArea', filters.minArea.toString());
  }
  if (filters.maxArea !== null) {
    params.append('maxArea', filters.maxArea.toString());
  }
  if (filters.districts.length > 0) {
    params.append('districts', filters.districts.join(','));
  }
  if (filters.buildings.length > 0) {
    params.append('buildings', filters.buildings.join(','));
  }
  if (filters.hasParking !== null) {
    params.append('hasParking', filters.hasParking.toString());
  }
  if (filters.minScore !== null) {
    params.append('minScore', filters.minScore.toString());
  }
  if (filters.rooms.length > 0) {
    params.append('rooms', filters.rooms.join(','));
  }
  if (filters.showZeroPrice) {
    params.append('showZeroPrice', 'true');
  }
  if (filters.excludeLaw887) {
    params.append('excludeLaw887', 'true');
  }
  
  params.append('orderBy', sortBy);
  params.append('take', pageSize.toString());
  params.append('skip', (page * pageSize).toString());

  const response = await fetch(`${API_BASE_URL}/listings?${params.toString()}`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch listings: ${response.statusText}`);
  }
  
  return response.json();
}

export async function fetchDistricts(): Promise<string[]> {
  // Fetch all listings to extract unique districts
  const response = await fetch(`${API_BASE_URL}/listings?take=1000`);
  const data = await response.json();
  
  // Use a Map to deduplicate case-insensitively, keeping the first occurrence
  const districtsMap = new Map<string, string>();
  
  data.items.forEach((listing: any) => {
    if (listing.district) {
      const lowerKey = listing.district.toLowerCase();
      // Only add if we haven't seen this district (case-insensitive) before
      if (!districtsMap.has(lowerKey)) {
        districtsMap.set(lowerKey, listing.district);
      }
    }
  });
  
  // Return the original district names (not lowercased), sorted
  return Array.from(districtsMap.values()).sort();
}

export async function fetchBuildings(): Promise<string[]> {
  // Fetch all listings to extract unique buildings
  const response = await fetch(`${API_BASE_URL}/listings?take=1000`);
  const data = await response.json();
  const buildings = new Set<string>();
  
  data.items.forEach((listing: any) => {
    if (listing.buildingName) {
      buildings.add(listing.buildingName);
    }
  });
  
  return Array.from(buildings).sort();
}

