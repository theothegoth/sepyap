# SepYap 🛒

A grocery price comparison platform that helps you find the cheapest shopping cart across all major Turkish markets.

## Features

- 🔍 **Product Search** - Search and compare prices across multiple markets
- 📊 **Price Comparison** - Find the cheapest option for your shopping cart
- 📈 **Price History** - Track price changes over time
- ⭐ **Watchlist** - Save products and get alerts on price drops
- 🎯 **Brand Filtering** - Filter by preferred or excluded brands
- 🌙 **Dark Mode** - Beautiful dark theme support
- 🌍 **Bilingual** - Turkish and English language support

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: NestJS, TypeORM, PostgreSQL
- **Extension**: Chrome Extension (Manifest V3)
- **Infrastructure**: Docker, Docker Compose

## Getting Started

### Prerequisites

- Docker and Docker Compose
- Node.js 20+ (for local development)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/sepyap.git
cd sepyap
```

2. Create a `.env` file in the root directory:
```env
DB_USER=admin
DB_PASSWORD=password
DB_NAME=grocery_matcher
ADMIN_SECRET=your-secret-key-here
```

3. Start the services:
```bash
docker-compose up -d
```

4. Access the application:
- Frontend: http://localhost:3001
- Backend API: http://localhost:3005

### Extension Setup

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `extension` folder
5. The extension will automatically detect the SepYap website

## Project Structure

```
sepyap/
├── frontend/          # Next.js frontend application
├── backend/           # NestJS backend API
├── extension/         # Chrome extension
├── docker-compose.yml # Docker orchestration
└── .env              # Environment variables (not in repo)
```

## Development

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Backend
```bash
cd backend
npm install
npm run start:dev
```

## License

MIT

