# SepYap 🛒

A grocery price comparison platform that helps you find the cheapest shopping cart across all major Turkish markets.

## Features

- 🔍 **Product Search** - Search and compare prices across multiple markets
- 📊 **Price Comparison** - Find the cheapest option for your shopping cart
- 📈 **Price History** - Track price changes over time
- ⭐ **Watchlist** - Save products and get alerts on price drops
- 🎯 **Brand Filtering** - Filter by preferred or excluded brands
- 🏪 **Market Filtering** - Filter by specific markets for cart optimization
- 🌙 **Dark Mode** - Beautiful dark theme support

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
DB_PASSWORD=your-secure-password
DB_NAME=grocery_matcher
ADMIN_SECRET=your-secret-key-here
ALLOWED_ORIGINS=http://localhost:3001,http://127.0.0.1:3001
NEXT_PUBLIC_SITE_URL=http://localhost:3001
NEXT_PUBLIC_API_URL=http://127.0.0.1:3005/api
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

## Production Deployment

### Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Database Configuration
DB_USER=your_db_user
DB_PASSWORD=your_secure_password
DB_NAME=grocery_matcher

# Admin Secret Key (for admin mode access)
ADMIN_SECRET=your-secret-key-here

# CORS Configuration (comma-separated list of allowed origins)
ALLOWED_ORIGINS=https://sepyap.com,https://www.sepyap.com

# Frontend Configuration
NEXT_PUBLIC_SITE_URL=https://sepyap.com
NEXT_PUBLIC_API_URL=https://api.sepyap.com/api
```

### Production Checklist

- [ ] Set secure database passwords
- [ ] Configure `ADMIN_SECRET` with a strong secret key
- [ ] Update `ALLOWED_ORIGINS` with production domains
- [ ] Update `NEXT_PUBLIC_SITE_URL` and `NEXT_PUBLIC_API_URL` for production
- [ ] Ensure SSL/TLS certificates are configured
- [ ] Review security headers in `next.config.js` and `backend/src/main.ts`
- [ ] Configure database backups
- [ ] Set up monitoring and logging

### Docker Production Build

```bash
# Build production images
docker-compose -f docker-compose.yml build

# Start services
docker-compose up -d

# View logs
docker-compose logs -f
```

## License

MIT

