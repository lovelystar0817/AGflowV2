# Overview

This is a modern full-stack web application for a hair stylist business management platform. The application provides user authentication, dashboard functionality, client management, appointment booking, AI-powered features, and comprehensive email notifications. Built using React with TypeScript on the frontend and Express.js on the backend, it features a modern responsive UI design system using shadcn/ui components and Tailwind CSS for styling.

## Recent Updates - Milestone 3 (September 2025)
- **Enhanced UI/UX**: Modern responsive design with improved animations, better spacing, and touch-friendly mobile interactions
- **Complete Mobile Responsiveness**: All components optimized for mobile devices with proper touch targets and responsive layouts  
- **Professional Email System**: Comprehensive booking confirmation emails with retry mechanisms and HTML templates
- **Enhanced Booking System**: Improved error handling, user feedback, and specific error messages for common scenarios
- **API Optimization**: Better validation, authorization checks, and business logic protection with detailed error responses
- **Bug Fixes**: Resolved edge cases, improved input sanitization, and prevented cross-tenant access issues

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript using Vite as the build tool
- **UI Components**: shadcn/ui component library with Radix UI primitives
- **Styling**: Tailwind CSS with custom CSS variables for theming
- **Routing**: Wouter for client-side routing with protected routes
- **State Management**: TanStack Query (React Query) for server state management
- **Form Handling**: React Hook Form with Zod validation

## Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Authentication**: Passport.js with local strategy using session-based authentication
- **Session Storage**: PostgreSQL-backed session store using connect-pg-simple
- **Password Security**: Node.js crypto module with scrypt for password hashing
- **API Design**: RESTful endpoints with rate limiting for authentication routes

## Database Layer
- **ORM**: Drizzle ORM for type-safe database operations
- **Database**: PostgreSQL (configured for Neon serverless)
- **Schema**: Single table for stylists/users with email-based authentication
- **Migrations**: Drizzle Kit for schema migrations

## Project Structure
- **Monorepo Layout**: Shared code in `/shared`, client code in `/client`, server code in `/server`
- **Type Safety**: Full TypeScript coverage with shared types between client and server
- **Path Aliases**: Configured for clean imports (`@/` for client, `@shared/` for shared code)

## Authentication & Authorization
- **Strategy**: Session-based authentication with PostgreSQL session store
- **Password Security**: Scrypt-based password hashing with salt
- **Route Protection**: Client-side protected routes with authentication state management
- **Rate Limiting**: Express rate limiting on authentication endpoints (5 attempts per 15 minutes)

## Development Tools
- **Build System**: Vite for frontend, esbuild for backend production builds
- **Development**: Hot module replacement with Vite dev server
- **Code Quality**: TypeScript strict mode, ES modules throughout

## Styling System
- **Design System**: shadcn/ui with "new-york" style variant
- **Theme**: CSS custom properties for consistent theming
- **Responsive**: Mobile-first responsive design with Tailwind breakpoints
- **Typography**: Multiple font families (Inter, Georgia, Menlo) loaded from Google Fonts

# External Dependencies

## Database
- **Neon PostgreSQL**: Serverless PostgreSQL database with connection pooling
- **Environment**: Requires `DB_URL` environment variable

## Authentication
- **Session Management**: Requires `SESSION_SECRET` environment variable for secure sessions

## UI Libraries
- **Radix UI**: Unstyled, accessible UI components
- **Lucide React**: Icon library for consistent iconography
- **Tailwind CSS**: Utility-first CSS framework

## Development Integrations
- **Replit Plugins**: Custom Vite plugins for development banners and error overlays
- **WebSocket Support**: ws library for Neon database connections

## Build & Runtime
- **Node.js**: Modern ES modules with TypeScript compilation
- **Package Management**: npm with lockfile for dependency consistency
