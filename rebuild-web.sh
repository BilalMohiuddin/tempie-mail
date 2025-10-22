#!/bin/bash
# Rebuild script for TempiEmail web service

echo "🔄 Rebuilding TempiEmail web service..."

# Navigate to project directory
cd /opt/tempiemail

# Pull latest changes
echo "📥 Pulling latest changes..."
git pull origin main

# Rebuild and restart web service
echo "🔨 Rebuilding web service..."
docker compose up -d --build web

# Wait for service to start
echo "⏳ Waiting for service to start..."
sleep 15

# Test the service
echo "🧪 Testing service..."
curl -k -I https://www.tempiemail.com

echo "✅ Rebuild complete!"
