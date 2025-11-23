import type { Listing } from '../types';

interface ListingCardProps {
  listing: Listing;
}

function getDaysOnMarket(firstSeenAt: string): number {
  const firstSeen = new Date(firstSeenAt);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - firstSeen.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

function isNewListing(firstSeenAt: string): boolean {
  return getDaysOnMarket(firstSeenAt) <= 2;
}

function formatDaysOnMarket(days: number): string {
  if (days === 0) return 'Today';
  if (days === 1) return '1 day';
  if (days < 30) return `${days} days`;
  const months = Math.floor(days / 30);
  const remainingDays = days % 30;
  if (months === 1 && remainingDays === 0) return '1 month';
  if (remainingDays === 0) return `${months} months`;
  return `${months}m ${remainingDays}d`;
}

export function ListingCard({ listing }: ListingCardProps) {
  const priceEurFormatted = (listing.priceMonthlyCents / 100).toLocaleString('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  });

  const mainImage = listing.imageUrls && Array.isArray(listing.imageUrls) && listing.imageUrls.length > 0
    ? listing.imageUrls[0]
    : null;

  // Calculate livable area
  const livableArea = listing.livingAreaSqm ?? 
    (listing.totalAreaSqm && listing.terraceAreaSqm 
      ? Math.max(0, listing.totalAreaSqm - listing.terraceAreaSqm)
      : listing.totalAreaSqm);
  
  const area = livableArea;
  
  // Calculate price per sqm
  const priceEur = listing.priceMonthlyCents / 100;
  const pricePerSqm = livableArea && livableArea > 0 && priceEur > 0
    ? priceEur / livableArea
    : null;
  
  const getScoreColor = (score: number | null) => {
    if (score === null) return 'bg-slate-200 text-slate-600';
    if (score >= 75) return 'bg-emerald-500 text-white';
    if (score >= 60) return 'bg-blue-500 text-white';
    if (score >= 45) return 'bg-amber-500 text-white';
    return 'bg-slate-400 text-white';
  };

  const daysOnMarket = getDaysOnMarket(listing.firstSeenAt);
  const isNew = isNewListing(listing.firstSeenAt);

  return (
    <div className="group bg-white rounded-2xl shadow-soft border border-slate-200/60 overflow-hidden hover:shadow-medium hover:border-slate-300/60 transition-all duration-300 animate-fade-in">
      {/* Image Container */}
      <div className="relative aspect-[4/3] bg-gradient-to-br from-slate-100 to-slate-200 overflow-hidden">
        {mainImage ? (
          <img
            src={mainImage}
            alt={listing.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-400">
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        {/* Badges */}
        <div className="absolute top-4 right-4 flex flex-col gap-2 items-end z-10">
          {isNew && (
            <div className="bg-emerald-500 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-large backdrop-blur-sm animate-pulse">
              NEW
            </div>
          )}
          {listing.score !== null && (
            <div className={`${getScoreColor(listing.score)} px-3 py-1.5 rounded-full text-sm font-semibold shadow-large backdrop-blur-sm`}>
              {listing.score}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        {/* Title & Location */}
        <h3 className="font-semibold text-lg text-slate-900 mb-2 line-clamp-2 leading-snug group-hover:text-primary-600 transition-colors">
          {listing.title}
        </h3>
        <div className="flex items-center gap-2 text-sm text-slate-600 mb-4">
          {listing.district && (
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="font-medium">{listing.district}</span>
            </span>
          )}
          {listing.buildingName && (
            <>
              <span className="text-slate-300">•</span>
              <span className="truncate text-slate-500">{listing.buildingName}</span>
            </>
          )}
        </div>

        {/* Price & Days on Market */}
        <div className="mb-4 pb-4 border-b border-slate-100">
          <div className="flex items-baseline justify-between mb-1">
            <div className="text-3xl font-bold text-slate-900 tracking-tight">{priceEurFormatted}</div>
            <div className="text-xs font-medium text-slate-500 bg-slate-50 px-2 py-1 rounded-md">
              {formatDaysOnMarket(daysOnMarket)}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="text-xs text-slate-500 font-medium">per month</div>
            {pricePerSqm !== null && (
              <div className="text-xs text-slate-600 font-semibold bg-slate-50 px-2 py-0.5 rounded">
                €{pricePerSqm.toFixed(0)}/m²
              </div>
            )}
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {listing.rooms && (
            <div className="flex flex-col items-center gap-1 p-2 rounded-lg bg-slate-50/50">
              <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span className="text-sm font-semibold text-slate-900">{listing.rooms}</span>
              <span className="text-xs text-slate-500">rooms</span>
            </div>
          )}
          {area && (
            <div className="flex flex-col items-center gap-1 p-2 rounded-lg bg-slate-50/50">
              <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m0 0l-5 5" />
              </svg>
              <span className="text-sm font-semibold text-slate-900">{area}</span>
              <span className="text-xs text-slate-500">m²</span>
            </div>
          )}
          {listing.bedrooms && (
            <div className="flex flex-col items-center gap-1 p-2 rounded-lg bg-slate-50/50">
              <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              <span className="text-sm font-semibold text-slate-900">{listing.bedrooms}</span>
              <span className="text-xs text-slate-500">bed</span>
            </div>
          )}
        </div>

        {/* Features */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {listing.parkingSpaces && listing.parkingSpaces > 0 && (
            <span className="inline-flex items-center gap-1 text-xs font-medium bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full border border-blue-100">
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1v-5a1 1 0 00-.293-.707l-2-2A1 1 0 0015 7h-1z" />
              </svg>
              Parking
            </span>
          )}
          {listing.hasElevator && (
            <span className="inline-flex items-center gap-1 text-xs font-medium bg-purple-50 text-purple-700 px-2.5 py-1 rounded-full border border-purple-100">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
              Elevator
            </span>
          )}
          {listing.hasTerrace && listing.terraceAreaSqm && (
            <span className="inline-flex items-center gap-1 text-xs font-medium bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full border border-emerald-100">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Terrace {listing.terraceAreaSqm}m²
            </span>
          )}
          {listing.hasSeaView && (
            <span className="inline-flex items-center gap-1 text-xs font-medium bg-cyan-50 text-cyan-700 px-2.5 py-1 rounded-full border border-cyan-100">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
              Sea View
            </span>
          )}
          {listing.hasConcierge && (
            <span className="inline-flex items-center gap-1 text-xs font-medium bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full border border-amber-100">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              Concierge
            </span>
          )}
          {listing.hasAC && (
            <span className="inline-flex items-center gap-1 text-xs font-medium bg-sky-50 text-sky-700 px-2.5 py-1 rounded-full border border-sky-100">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              AC
            </span>
          )}
        </div>

        {/* View Details Button */}
        {listing.primaryUrl && (
          <a
            href={listing.primaryUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full text-center bg-gradient-to-r from-primary-600 to-primary-700 text-white py-3 rounded-xl font-semibold hover:from-primary-700 hover:to-primary-800 transition-all duration-200 shadow-soft hover:shadow-medium active:scale-[0.98]"
          >
            View Details
          </a>
        )}
      </div>
    </div>
  );
}
