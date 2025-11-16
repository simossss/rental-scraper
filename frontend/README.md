# Monaco Rentals Frontend

A modern, mobile-first React application for browsing Monaco rental listings.

## Features

- 🏠 **Beautiful Listing Cards** - Modern card design with images, scores, and key details
- 🔍 **Advanced Filtering** - Filter by price, district, building, parking, and score
- 📊 **Smart Sorting** - Sort by score (default), price, or date
- 📱 **Mobile-First Design** - Optimized for mobile devices with responsive layout
- ⚡ **Fast & Smooth** - Built with Vite and React for optimal performance

## Getting Started

### Prerequisites

- Node.js 18+ 
- Backend API running on `http://localhost:3001`

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### Build

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Usage

1. **Start the backend API** (from project root):
   ```bash
   npm run api
   ```

2. **Start the frontend** (from frontend directory):
   ```bash
   npm run dev
   ```

3. **Open your browser** to `http://localhost:5173`

## Features Overview

### Filtering
- **Price Range**: Set min/max monthly rent in EUR
- **Score**: Minimum score slider (0-100)
- **Parking**: Filter by parking availability
- **Districts**: Multi-select district filter
- **Buildings**: Multi-select building filter

### Sorting
- Score (High to Low) - Default
- Price (Low to High)
- Price (High to Low)
- Newest First

### Listing Cards
Each card displays:
- Main image with score badge
- Title and location (district/building)
- Monthly rent
- Room count, area, bedrooms
- Feature badges (parking, elevator, terrace, sea view, concierge, AC)
- Link to original listing

## Tech Stack

- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS 3** - Styling
- **Modern CSS** - Mobile-first responsive design
