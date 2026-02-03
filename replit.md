# CommonWell Document Query Tool

## Overview

This is an internal testing and development tool for querying the CommonWell Health Alliance FHIR R4 DocumentReference API. Built for the CVS IAS Platform E2E testing, it provides a user-friendly interface to construct and execute FHIR queries, view responses, and maintain query history.

The application follows a full-stack TypeScript architecture with a React frontend and Express backend, using PostgreSQL for data persistence.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18+ with TypeScript
- **Routing**: Wouter (lightweight client-side routing)
- **State Management**: TanStack React Query for server state, React useState for local state
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming (light/dark mode support)
- **Build Tool**: Vite with path aliases (`@/` for client source, `@shared/` for shared code)

### Backend Architecture
- **Framework**: Express 5 on Node.js
- **API Design**: RESTful endpoints under `/api` prefix
- **Server**: HTTP server with development (Vite middleware) and production (static file serving) modes
- **Validation**: Zod schemas for request validation

### Data Layer
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema Location**: `shared/schema.ts` (shared between frontend and backend)
- **Schema Validation**: drizzle-zod for automatic Zod schema generation from database tables
- **Migrations**: Drizzle Kit with `db:push` command for schema synchronization

### Project Structure
```
├── client/           # React frontend application
│   └── src/
│       ├── components/   # UI components (query-builder/, ui/)
│       ├── hooks/        # Custom React hooks
│       ├── lib/          # Utilities (queryClient, theme-provider)
│       └── pages/        # Route components
├── server/           # Express backend
│   ├── index.ts      # Server entry point
│   ├── routes.ts     # API route definitions
│   ├── storage.ts    # Data access layer
│   └── vite.ts       # Vite dev server integration
├── shared/           # Shared code between client and server
│   └── schema.ts     # Database schema and types
└── migrations/       # Drizzle database migrations
```

### Key Design Patterns
- **Shared Types**: TypeScript types derived from Drizzle schema are used across client and server
- **In-Memory Fallback**: MemStorage class provides in-memory storage when database is unavailable
- **Environment-Based Configuration**: Different API base URLs for integration vs production CommonWell environments

## External Dependencies

### Database
- **PostgreSQL**: Primary database, connection via `DATABASE_URL` environment variable
- **connect-pg-simple**: Session storage for Express sessions

### Third-Party APIs
- **CommonWell Health Alliance FHIR R4 API**: The application proxies queries to CommonWell's DocumentReference and Binary endpoints
  - Integration: `https://api.integration.commonwellalliance.lkopera.com/v2/R4/`
  - Production: `https://api.commonwellalliance.lkopera.com/v2/R4/`
  - Binary Retrieve API for document download with base64 content response

### Authentication
- **CLEAR ID Token**: The application accepts CLEAR OIDC ID Tokens from the Accounts Team /token API
- **JWT Generation**: Automatically generates CommonWell JWTs with RS384 signing and x5t (SHA-1 thumbprint) header
- **mTLS**: Client certificates used for both mutual TLS authentication and JWT signing
- **Patient Create**: Creates patients in CommonWell using demographics extracted from CLEAR tokens with primary (CVS) and secondary (CLEAR IAL2) identifiers

### Environment Variables
- `CLIENT_CERT_PATH` / `CLIENT_KEY_PATH`: Paths to client certificate/key for mTLS and JWT signing
- `CW_ORG_OID` / `CW_ORG_NAME`: Organization identifiers (default: CVS Health)
- `CLEAR_OID`: CLEAR assigning authority OID for secondary identifier

### Key NPM Packages
- **@tanstack/react-query**: Server state management and caching
- **date-fns**: Date manipulation for query parameters
- **zod**: Runtime type validation
- **drizzle-orm / drizzle-kit**: Database ORM and migration tooling