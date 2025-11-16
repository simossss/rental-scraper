# Monaco Rental Scraper

A modern web scraper and listing platform for Monaco rental properties, featuring real-time scoring, filtering, and Telegram notifications.

## Features

- 🏠 **Automated Scraping**: Hourly scraping of Monaco rental listings
- 📊 **Smart Scoring**: AI-powered scoring system (0-100) based on location, size, amenities, and price
- 🔍 **Advanced Filtering**: Filter by price, district, building, rooms, parking, and score
- 📱 **Modern UI**: Beautiful, responsive web interface built with React and Tailwind CSS
- 🔔 **Telegram Notifications**: Get notified when new listings are found
- 🚀 **Production Ready**: Deployed on Railway (backend) and Vercel (frontend)

## Tech Stack

### Backend
- Node.js + TypeScript
- Express API
- Prisma ORM + PostgreSQL
- Axios + Cheerio for scraping

### Frontend
- React + TypeScript
- Vite
- Tailwind CSS
- Modern, mobile-first UI

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd rental-scraper
   ```

2. **Install dependencies**
   ```bash
   npm install
   cd frontend && npm install && cd ..
   ```

3. **Set up database**
   ```bash
   # Copy .env.example to .env and configure
   cp .env.example .env
   
   # Run migrations
   npx prisma migrate dev
   ```

4. **Start development servers**

   Backend:
   ```bash
   npm run api
   ```

   Frontend (in another terminal):
   ```bash
   cd frontend
   npm run dev
   ```

5. **Run scraper manually**
   ```bash
   npm run scrape
   ```

## Project Structure

```
rental-scraper/
├── src/
│   ├── api/              # Express API server
│   ├── scrapers/         # Web scraping logic
│   ├── scoring/          # Listing scoring algorithm
│   ├── notifications/    # Telegram notification service
│   ├── db/               # Database client
│   └── lib/              # Utility functions
├── frontend/             # React frontend application
├── prisma/               # Database schema and migrations
└── DEPLOYMENT.md         # Deployment guide
```

## Environment Variables

### Backend

```bash
DATABASE_URL=postgresql://...
PORT=3001
CORS_ORIGIN=http://localhost:5173
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id
```

### Frontend

```bash
VITE_API_URL=http://localhost:3001
```

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

**Quick Summary**:
- Backend → Railway
- Frontend → Vercel
- Database → Railway PostgreSQL
- Cron Jobs → Railway Cron Jobs

## Scripts

- `npm run api` - Start API server (dev)
- `npm run start` - Start API server (production)
- `npm run scrape` - Run scraper manually
- `npm run build` - Build TypeScript
- `npx prisma studio` - Open Prisma Studio

## Scoring System

Listings are scored from 0-100 based on:

1. **Location** (0-30 points): District quality
2. **Apartment Quality** (0-30 points): Size, terrace, condition
3. **Building & Amenities** (0-25 points): Parking, concierge, elevator, AC
4. **Economics** (0-15 points): Price vs target (€9,000/month)

See `src/scoring/monacoScoring.ts` for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

ISC

