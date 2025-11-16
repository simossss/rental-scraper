import { useState, useEffect } from 'react';
import { ListingCard } from './components/ListingCard';
import { FilterDrawer } from './components/FilterDrawer';
import { fetchListings } from './api';
import type { Listing, Filters, SortOption } from './types';

function App() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('scoreDesc');
  
  const [filters, setFilters] = useState<Filters>({
    minRent: null,
    maxRent: 12000,
    districts: [],
    buildings: [],
    hasParking: null,
    minScore: null,
    rooms: [],
    showZeroPrice: false,
  });

  useEffect(() => {
    const loadListings = async () => {
      setLoading(true);
      setError(null);
      setPage(0);
      
      try {
        const response = await fetchListings(filters, sortBy, 0, 20);
        setListings(response.items);
        setTotal(response.total);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load listings');
        console.error('Error loading listings:', err);
      } finally {
        setLoading(false);
      }
    };

    loadListings();
  }, [filters, sortBy]);

  const loadMore = async () => {
    if (!loading && listings.length < total) {
      const nextPage = page + 1;
      setPage(nextPage);
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetchListings(filters, sortBy, nextPage, 20);
        setListings(prev => [...prev, ...response.items]);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load more listings');
      } finally {
        setLoading(false);
      }
    }
  };

  const sortOptions: { value: SortOption; label: string }[] = [
    { value: 'scoreDesc', label: 'Score' },
    { value: 'priceAsc', label: 'Price ↑' },
    { value: 'priceDesc', label: 'Price ↓' },
    { value: 'createdDesc', label: 'Newest' },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200/60 shadow-soft">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                Monaco Rentals
              </h1>
              <p className="text-sm text-slate-600 mt-1 font-medium">
                {total.toLocaleString()} {total === 1 ? 'listing' : 'listings'} found
              </p>
            </div>
            
            {/* Mobile Filter Button */}
            <button
              onClick={() => setFiltersOpen(true)}
              className="lg:hidden flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 active:scale-95 transition-all duration-200 shadow-soft"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Filters
            </button>
          </div>

          {/* Room Filter Pills */}
          <div className="pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide">
              <span className="text-sm font-semibold text-slate-700 whitespace-nowrap">Rooms:</span>
              <div className="flex gap-2">
                {[2, 3, 4, 5].map((roomCount) => {
                  const isSelected = filters.rooms.includes(roomCount);
                  const label = roomCount === 5 ? '4+' : roomCount.toString();
                  return (
                    <button
                      key={roomCount}
                      onClick={() => {
                        const newRooms = isSelected
                          ? filters.rooms.filter(r => r !== roomCount)
                          : [...filters.rooms, roomCount];
                        setFilters({ ...filters, rooms: newRooms });
                      }}
                      className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all duration-200 ${
                        isSelected
                          ? 'bg-primary-600 text-white shadow-soft scale-105'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200 active:scale-95'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Sort Options */}
          <div className="pt-4 pb-4">
            <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide">
              <span className="text-sm font-semibold text-slate-700 whitespace-nowrap">Sort by:</span>
              <div className="flex gap-2">
                {sortOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setSortBy(option.value)}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all duration-200 ${
                      sortBy === option.value
                        ? 'bg-primary-600 text-white shadow-soft scale-105'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200 active:scale-95'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filter Sidebar (Desktop) */}
          <aside className="hidden lg:block lg:w-80 lg:flex-shrink-0">
            <FilterDrawer
              isOpen={true}
              onClose={() => {}}
              filters={filters}
              onFiltersChange={setFilters}
            />
          </aside>

          {/* Filter Drawer (Mobile) */}
          <div className="lg:hidden">
            <FilterDrawer
              isOpen={filtersOpen}
              onClose={() => setFiltersOpen(false)}
              filters={filters}
              onFiltersChange={setFilters}
            />
          </div>

          {/* Main Content */}
          <main className="flex-1 min-w-0 w-full lg:w-auto">
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 font-medium shadow-soft">
                {error}
              </div>
            )}

            {loading && listings.length === 0 ? (
              <div className="flex items-center justify-center py-20">
                <div className="text-center">
                  <div className="inline-block animate-spin rounded-full h-10 w-10 border-3 border-primary-600 border-t-transparent mb-4"></div>
                  <p className="text-slate-600 font-medium">Loading listings...</p>
                </div>
              </div>
            ) : listings.length === 0 ? (
              <div className="text-center py-20">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
                  <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <p className="text-slate-600 font-medium text-lg">No listings found</p>
                <p className="text-slate-500 text-sm mt-2">Try adjusting your filters</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {listings.map((listing, index) => (
                    <div
                      key={listing.id}
                      className="animate-fade-in"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <ListingCard listing={listing} />
                    </div>
                  ))}
                </div>

                {/* Load More */}
                {listings.length < total && (
                  <div className="mt-12 text-center">
                    <button
                      onClick={loadMore}
                      disabled={loading}
                      className="px-8 py-3.5 bg-white border-2 border-primary-600 text-primary-600 rounded-xl font-semibold hover:bg-primary-600 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-soft hover:shadow-medium active:scale-95"
                    >
                      {loading ? (
                        <span className="flex items-center gap-2">
                          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Loading...
                        </span>
                      ) : (
                        `Load More (${(total - listings.length).toLocaleString()} remaining)`
                      )}
                    </button>
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

export default App;
