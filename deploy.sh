#!/bin/bash

# GEB Surrogacy Automated Deployment Script

echo "🚀 Starting Deployment..."

# 1. Clear local changes (like package-lock.json) that block git pull
echo "📦 Stashing local changes..."
git stash

# 2. Pull latest code
echo "📥 Pulling latest code from GitHub..."
git pull origin main

# 3. Install dependencies
echo "🛠️ Installing dependencies..."
npm install
npm install --prefix api

# 4. Build frontend
echo "🏗️ Building frontend..."
npm run build

# 5. Restart backend with PM2
echo "🔄 Restarting backend..."
pm2 restart gebsurrogacy --update-env

echo "✅ Deployment Complete!"
