#!/bin/bash
# Fix frontend webpack cache issue

echo "Cleaning frontend build cache..."

# Remove .next directory if it exists
docker exec gm-frontend rm -rf /app/.next 2>/dev/null || true

# Restart frontend container
echo "Restarting frontend container..."
docker-compose restart frontend

echo "Done! Frontend should rebuild on next request."

