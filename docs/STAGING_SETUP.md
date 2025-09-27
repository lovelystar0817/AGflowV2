# Staging Environment Setup Guide

## Overview

This guide walks you through setting up the staging environment for the Hair Stylist Business Management Platform. The staging environment provides a separate, isolated environment for testing features before production deployment.

## Prerequisites

- Node.js 20+
- Docker and Docker Compose (for containerized deployment)
- Access to staging database (Neon PostgreSQL recommended)
- Staging API keys for Resend and OpenAI

## Environment Configuration

### 1. Database Setup

Create a separate staging PostgreSQL database:

1. **Using Neon (Recommended)**:
   - Create a new Neon project for staging
   - Copy the connection string
   - Set `STAGING_DATABASE_URL` environment variable

2. **Using Docker Compose** (included in this setup):
   - The staging deployment includes a PostgreSQL container
   - Connection string: `postgresql://staging_user:staging_password@postgres:5432/staging_hair_stylist_db`

### 2. API Keys Configuration

Set up separate API keys for staging:

1. **Resend API**:
   - Create staging subdomain or use staging email domain
   - Generate staging-specific API key
   - Set `STAGING_RESEND_API_KEY`

2. **OpenAI API**:
   - Set up separate OpenAI project with rate limits for staging
   - Generate staging API key
   - Set `STAGING_OPENAI_API_KEY`

### 3. Environment Variables

Copy `.env.staging` and update with your values:

```bash
cp .env.staging .env.staging.local
# Edit .env.staging.local with your actual values
```

Required variables:
- `STAGING_DATABASE_URL`
- `STAGING_RESEND_API_KEY`
- `STAGING_OPENAI_API_KEY`
- `STAGING_SESSION_SECRET`
- `STAGING_DOMAIN`
- `STAGING_EMAIL_DOMAIN`

## Deployment Options

### Option 1: Replit Deployment

1. Create a new Repl for staging
2. Import the staging configuration:
   ```bash
   # Copy staging.replit.json to .replit
   cp staging.replit.json .replit
   ```
3. Set environment secrets in Replit
4. Deploy using Replit's deployment system

### Option 2: Docker Compose Deployment

1. Set environment variables:
   ```bash
   export STAGING_DATABASE_URL="your_staging_database_url"
   export STAGING_RESEND_API_KEY="your_staging_resend_key"
   export STAGING_OPENAI_API_KEY="your_staging_openai_key"
   export STAGING_SESSION_SECRET="your_32_character_session_secret"
   ```

2. Deploy using the script:
   ```bash
   ./scripts/deploy-staging.sh
   ```

### Option 3: Manual Deployment

1. Install dependencies:
   ```bash
   npm install
   ```

2. Build the application:
   ```bash
   npm run build
   ```

3. Run database migrations:
   ```bash
   npm run db:push:staging
   ```

4. Start the application:
   ```bash
   npm run dev:staging
   ```

## Database Management

### Running Migrations

```bash
# Generate new migration
npm run db:generate:staging

# Push schema changes
npm run db:push:staging

# Apply migrations
npm run db:migrate:staging
```

### Accessing Staging Database

```bash
# Using psql (if connecting to external database)
psql $STAGING_DATABASE_URL

# Using Docker (if using containerized database)
docker-compose -f docker-compose.staging.yml exec postgres psql -U staging_user -d staging_hair_stylist_db
```

## Monitoring and Logs

### Docker Compose Logs

```bash
# View all service logs
docker-compose -f docker-compose.staging.yml logs -f

# View specific service logs
docker-compose -f docker-compose.staging.yml logs -f app
docker-compose -f docker-compose.staging.yml logs -f postgres
docker-compose -f docker-compose.staging.yml logs -f redis
```

### Service Health Checks

```bash
# Check service status
docker-compose -f docker-compose.staging.yml ps

# View health check status
docker-compose -f docker-compose.staging.yml exec app curl -f http://localhost:5000/api/health
```

## Testing

### Running Tests in Staging

```bash
NODE_ENV=staging npm run test:staging
```

### Manual Testing Checklist

- [ ] User registration and login
- [ ] Email notifications (check staging email domain)
- [ ] AI features (verify OpenAI API usage)
- [ ] Database operations (CRUD operations)
- [ ] Session management
- [ ] Rate limiting
- [ ] Error handling

## Security Considerations

1. **Database Access**: Staging database should be isolated from production
2. **API Keys**: Use separate API keys with appropriate rate limits
3. **Secrets Management**: Never commit staging secrets to version control
4. **Network Security**: Staging should be behind authentication or IP restrictions
5. **Data Privacy**: Use anonymized or test data only

## Troubleshooting

### Common Issues

1. **Database Connection Failed**:
   - Verify `STAGING_DATABASE_URL` is correct
   - Check database server is running
   - Verify network connectivity

2. **API Key Issues**:
   - Verify staging API keys are set correctly
   - Check API key permissions and rate limits
   - Test API connectivity manually

3. **Docker Issues**:
   - Ensure Docker daemon is running
   - Check docker-compose.staging.yml syntax
   - Verify port availability (5000, 5432, 6379)

4. **Build Issues**:
   - Clear node_modules and reinstall
   - Check TypeScript compilation errors
   - Verify environment variables are accessible during build

### Getting Help

- Check application logs for detailed error messages
- Verify environment variables are loaded correctly
- Test individual components (database, Redis, APIs) separately
- Review staging configuration against development setup

## Maintenance

### Regular Tasks

1. **Update Dependencies**: Regularly update staging environment packages
2. **Database Cleanup**: Periodically clean up test data
3. **Log Rotation**: Configure log rotation for long-running instances
4. **Health Monitoring**: Set up automated health checks and alerting
5. **Backup Testing**: Regularly test backup and restore procedures