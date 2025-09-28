#!/bin/bash

# AGflowV2 Development Setup Script
# Run this script whenever you start working on the project

echo "🚀 Setting up AGflowV2 development environment..."

# Navigate to project root
cd /workspaces/AGflowV2

# Install dependencies with legacy peer deps (for React compatibility)
echo "📦 Installing dependencies..."
npm install --legacy-peer-deps

# Start the backend server in the background
echo "🔧 Starting backend server..."
npm run dev &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 3

# Start the frontend Vite server
echo "🎨 Starting frontend server..."
npx vite dev --host

# If user stops the frontend, also stop the backend
trap "kill $BACKEND_PID" EXIT