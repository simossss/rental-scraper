import { useState, useEffect } from 'react';
import type { Filters } from '../types';
import { fetchDistricts, fetchBuildings } from '../api';

interface FilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
}

export function FilterDrawer({ isOpen, onClose, filters, onFiltersChange }: FilterDrawerProps) {
  const [districts, setDistricts] = useState<string[]>([]);
  const [buildings, setBuildings] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      Promise.all([fetchDistricts(), fetchBuildings()])
        .then(([d, b]) => {
          setDistricts(d);
          setBuildings(b);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [isOpen]);

  const updateFilter = <K extends keyof Filters>(key: K, value: Filters[K]) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const toggleDistrict = (district: string) => {
    const newDistricts = filters.districts.includes(district)
      ? filters.districts.filter(d => d !== district)
      : [...filters.districts, district];
    updateFilter('districts', newDistricts);
  };

  const toggleBuilding = (building: string) => {
    const newBuildings = filters.buildings.includes(building)
      ? filters.buildings.filter(b => b !== building)
      : [...filters.buildings, building];
    updateFilter('buildings', newBuildings);
  };

  const clearFilters = () => {
    onFiltersChange({
      minRent: null,
      maxRent: 12000,
      districts: [],
      buildings: [],
      hasParking: null,
      minScore: null,
      rooms: [],
      showZeroPrice: false,
      excludeLaw887: true, // Keep Law 887 exclusion by default
    });
  };

  const hasActiveFilters = 
    filters.minRent !== null ||
    (filters.maxRent !== null && filters.maxRent !== 12000) ||
    filters.districts.length > 0 ||
    filters.buildings.length > 0 ||
    filters.hasParking !== null ||
    filters.minScore !== null ||
    filters.rooms.length > 0 ||
    filters.showZeroPrice ||
    !filters.excludeLaw887; // excludeLaw887=true is default, so !excludeLaw887 means it's changed

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30 lg:hidden animate-fade-in"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-large z-40 transform transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        } lg:translate-x-0 lg:static lg:relative lg:max-w-xs lg:w-full lg:shadow-none lg:border-r lg:border-slate-200 lg:h-auto lg:z-0 lg:bg-transparent`}
      >
        <div className="h-full lg:h-auto overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-slate-200 px-5 py-4 flex items-center justify-between z-10 lg:bg-transparent lg:backdrop-blur-none">
            <h2 className="text-xl font-bold text-slate-900">Filters</h2>
            <div className="flex items-center gap-3">
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="text-sm text-primary-600 hover:text-primary-700 font-semibold transition-colors"
                >
                  Clear All
                </button>
              )}
              <button
                onClick={onClose}
                className="lg:hidden p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <div className="p-5 space-y-6">
            {/* Price Range */}
            <div>
              <label className="block text-sm font-bold text-slate-900 mb-4">
                Price Range
                <span className="text-xs font-normal text-slate-500 ml-1">(€/month)</span>
              </label>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-2">Minimum</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={filters.minRent ?? ''}
                    onChange={(e) => updateFilter('minRent', e.target.value ? Number(e.target.value) : null)}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all bg-white text-slate-900 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-2">Maximum</label>
                  <input
                    type="number"
                    placeholder="No limit"
                    value={filters.maxRent ?? ''}
                    onChange={(e) => updateFilter('maxRent', e.target.value ? Number(e.target.value) : null)}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all bg-white text-slate-900 font-medium"
                  />
                </div>
              </div>
            </div>

            {/* Score Filter */}
            <div>
              <label className="block text-sm font-bold text-slate-900 mb-4">
                Minimum Score
                <span className="text-xs font-normal text-slate-500 ml-1">({filters.minScore ?? 0})</span>
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={filters.minScore ?? 0}
                onChange={(e) => updateFilter('minScore', Number(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
                style={{
                  background: `linear-gradient(to right, rgb(2, 132, 199) 0%, rgb(2, 132, 199) ${(filters.minScore ?? 0)}%, rgb(226, 232, 240) ${(filters.minScore ?? 0)}%, rgb(226, 232, 240) 100%)`
                }}
              />
              <div className="flex justify-between text-xs text-slate-500 mt-2 font-medium">
                <span>0</span>
                <span className="font-bold text-primary-600 text-sm">{filters.minScore ?? 0}</span>
                <span>100</span>
              </div>
            </div>

            {/* Parking */}
            <div>
              <label className="block text-sm font-bold text-slate-900 mb-4">Parking</label>
              <div className="space-y-2">
                {[
                  { value: null, label: 'Any' },
                  { value: true, label: 'With Parking' },
                  { value: false, label: 'Without Parking' },
                ].map((option) => (
                  <label
                    key={String(option.value)}
                    className="flex items-center gap-3 cursor-pointer p-3 rounded-xl hover:bg-slate-50 transition-colors group"
                  >
                    <input
                      type="radio"
                      name="parking"
                      checked={filters.hasParking === option.value}
                      onChange={() => updateFilter('hasParking', option.value)}
                      className="w-4 h-4 text-primary-600 focus:ring-primary-500 focus:ring-2"
                    />
                    <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900">{option.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Districts */}
            <div>
              <label className="block text-sm font-bold text-slate-900 mb-4">
                Districts
                {filters.districts.length > 0 && (
                  <span className="text-xs font-normal text-primary-600 ml-2 bg-primary-50 px-2 py-0.5 rounded-full">
                    {filters.districts.length}
                  </span>
                )}
              </label>
              {loading ? (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Loading...
                </div>
              ) : (
                <div className="flex flex-wrap gap-2 max-h-64 overflow-y-auto">
                  {districts.map((district) => {
                    const isSelected = filters.districts.includes(district);
                    return (
                      <button
                        key={district}
                        onClick={() => toggleDistrict(district)}
                        className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                          isSelected
                            ? 'bg-primary-600 text-white shadow-soft scale-105'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200 active:scale-95'
                        }`}
                      >
                        {district}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Buildings */}
            <div>
              <label className="block text-sm font-bold text-slate-900 mb-4">
                Buildings
                {filters.buildings.length > 0 && (
                  <span className="text-xs font-normal text-primary-600 ml-2 bg-primary-50 px-2 py-0.5 rounded-full">
                    {filters.buildings.length}
                  </span>
                )}
              </label>
              {loading ? (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Loading...
                </div>
              ) : (
                <div className="space-y-1.5 max-h-64 overflow-y-auto">
                  {buildings.slice(0, 50).map((building) => (
                    <label
                      key={building}
                      className="flex items-center gap-3 cursor-pointer p-2.5 rounded-lg hover:bg-slate-50 transition-colors group"
                    >
                      <input
                        type="checkbox"
                        checked={filters.buildings.includes(building)}
                        onChange={() => toggleBuilding(building)}
                        className="w-4 h-4 text-primary-600 focus:ring-primary-500 focus:ring-2 rounded border-slate-300"
                      />
                      <span className="text-sm font-medium text-slate-700 truncate group-hover:text-slate-900">{building}</span>
                    </label>
                  ))}
                  {buildings.length > 50 && (
                    <div className="text-xs text-slate-500 pt-2 font-medium">
                      Showing first 50 of {buildings.length} buildings
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Options */}
            <div>
              <label className="block text-sm font-bold text-slate-900 mb-4">Options</label>
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl hover:bg-slate-50 transition-colors group">
                  <input
                    type="checkbox"
                    checked={filters.showZeroPrice}
                    onChange={(e) => updateFilter('showZeroPrice', e.target.checked)}
                    className="w-4 h-4 text-primary-600 focus:ring-primary-500 focus:ring-2 rounded border-slate-300"
                  />
                  <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900">
                    Show listings with 0 price (if {'>'}3 rooms)
                  </span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl hover:bg-slate-50 transition-colors group">
                  <input
                    type="checkbox"
                    checked={filters.excludeLaw887}
                    onChange={(e) => updateFilter('excludeLaw887', e.target.checked)}
                    className="w-4 h-4 text-primary-600 focus:ring-primary-500 focus:ring-2 rounded border-slate-300"
                  />
                  <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900">
                    Exclude Law 887 listings
                  </span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
