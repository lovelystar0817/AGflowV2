#!/bin/bash

# Deploy Hair Stylist Platform to Staging Environment
set -e

echo "🚀 Deploying Hair Stylist Platform to Staging Environment..."

# Check if required environment variables are set
if [ -z "$STAGING_DATABASE_URL" ] || [ -z "$STAGING_RESEND_API_KEY" ] || [ -z "$STAGING_OPENAI_API_KEY" ]; then
  echo "❌ Error: Missing required staging environment variables"
  echo "Please set: STAGING_DATABASE_URL, STAGING_RESEND_API_KEY, STAGING_OPENAI_API_KEY"
  exit 1
fi

# Load staging environment variables
if [ -f .env.staging ]; then
  echo "📝 Loading staging environment variables..."
  export $(grep -v '^#' .env.staging | xargs)
fi

# Build the application
echo "📦 Building application for staging..."
npm run build

# Run database migrations for staging
echo "🗄️  Running database migrations for staging..."
npm run db:push:staging

# Start staging services with docker-compose
echo "🐳 Starting staging services..."
docker-compose -f docker-compose.staging.yml up -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be healthy..."
timeout=300
counter=0

while [ $counter -lt $timeout ]; do
  if docker-compose -f docker-compose.staging.yml ps | grep -q "healthy"; then
    echo "✅ All staging services are healthy!"
    break
  fi
  
  echo "🔄 Waiting for services to start... (${counter}s/${timeout}s)"
  sleep 5
  counter=$((counter + 5))
done

if [ $counter -ge $timeout ]; then
  echo "❌ Error: Services did not become healthy within ${timeout} seconds"
  echo "📋 Service status:"
  docker-compose -f docker-compose.staging.yml ps
  exit 1
fi

echo "🎉 Staging deployment completed successfully!"
echo "🌐 Staging application is available at: http://${STAGING_DOMAIN:-localhost:5000}"
echo "📊 To view logs: docker-compose -f docker-compose.staging.yml logs -f"
echo "🛑 To stop staging: docker-compose -f docker-compose.staging.yml down"