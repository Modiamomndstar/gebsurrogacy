#!/bin/bash

# Configuration
APP_NAME="gebsurrogacy"
APP_DIR="/home/gebsurrogacy/apps/gebsurrogacy"

echo "🚀 Starting deployment for $APP_NAME..."

# Navigate to app directory
cd $APP_DIR || exit

# Pull latest changes
echo "📥 Pulling latest changes from GitHub..."
git pull origin main

# Install root dependencies (Vite, etc)
echo "📦 Installing root dependencies..."
npm install

# Build frontend
echo "🏗️ Building frontend..."
npm run build

# Install API dependencies
echo "📦 Installing API dependencies..."
cd api && npm install
cd ..

# Restart app with PM2
echo "🔄 Restarting application with PM2..."
pm2 restart $APP_NAME || pm2 start api/server.js --name $APP_NAME

echo "✅ Deployment complete!"
