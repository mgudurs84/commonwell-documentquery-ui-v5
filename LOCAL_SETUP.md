# CommonWell Document Query Tool - Local Setup Guide

## Overview
This is an internal testing tool for querying the CommonWell Health Alliance FHIR R4 DocumentReference API. It provides a user-friendly interface to construct and execute FHIR queries, view responses, and maintain query history.

## Prerequisites

- **Node.js** 18.x or higher (20.x recommended)
- **npm** 9.x or higher
- A valid **CLEAR ID Token** (from Accounts Team /token API) - the tool generates the CommonWell JWT automatically
- **Client Certificate** and **Private Key** in the `certs/` folder

## Quick Start (Windows)

### 1. Clone/Download the Project
Download or clone this project to your local machine.

### 2. Install Dependencies
Open a terminal (Command Prompt, PowerShell, or Git Bash) in the project folder:

```bash
npm install
```

### 3. Update Scripts for Windows Compatibility
The project uses `cross-env` for cross-platform environment variables. Update your `package.json` scripts section to:

```json
"scripts": {
  "dev": "cross-env NODE_ENV=development tsx server/index.ts",
  "build": "tsx script/build.ts",
  "start": "cross-env NODE_ENV=production node dist/index.cjs",
  "check": "tsc"
}
```

### 4. Configure Client Certificates (Required for Integration API)

CommonWell's Integration environment requires **mutual TLS (mTLS)**. Place your certificate files in the `certs/` folder:

```
certs/
├── client-cert.pem    # Client certificate for mTLS
├── client-key.pem     # Private key for mTLS and JWT signing
└── ca-cert.pem        # CA certificate (optional)
```

### Configuration

All settings are hardcoded in `server/config.ts` for demo purposes:

```typescript
export const config = {
  CW_ORG_OID: "2.16.840.1.113883.3.5958.1000.300",
  CW_ORG_NAME: "CVS Health",
  CLEAR_OID: "2.16.840.1.113883.3.5958.1000.300.1",
  CLIENT_CERT_PATH: "./certs/client-cert.pem",
  CLIENT_KEY_PATH: "./certs/client-key.pem",
  CA_CERT_PATH: "./certs/ca-cert.pem",
  SKIP_TLS_VERIFY: false,
};
```

To modify settings, edit `server/config.ts` directly.

**Note:** A pre-configured `run-local.bat` is included for Windows users.

### 5. Start the Development Server
```bash
npm run dev
```

### 6. Open in Browser
Navigate to: **http://localhost:5000**

## Production Build

To create a production build:

```bash
npm run build
npm start
```

## Usage

### 1. Select Environment
Choose between **Integration** or **Production** CommonWell environment.

### 2. Enter JWT Token
Paste your valid JWT token. Use the "Validate Token" button to check expiry.

### 3. Enter Patient Identifier
- **AAID (Assigning Authority ID)**: OID format (e.g., `2.16.840.1.113883.3.101.1`)
- **Patient ID**: Local patient identifier

### 4. Configure Filters (Optional)
- **Status**: Current, Superseded, or Entered-in-Error
- **Date Filters**: Filter by document creation date or service period
- **Document Type**: Select LOINC codes for specific document types
- **Content Type**: Filter by MIME type (XML, PDF, etc.)
- **Author**: Filter by author name

### 5. Execute Query
Click "Execute Query" to send the request to CommonWell API.

### 6. View Results
Results are displayed in an expandable JSON viewer with syntax highlighting.

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/execute-query` | POST | Execute a CommonWell DocumentReference query |
| `/api/generate-jwt` | POST | Generate CommonWell JWT from CLEAR ID Token |
| `/api/create-patient` | POST | Create a patient in CommonWell using CLEAR demographics |
| `/api/download-document` | POST | Download a document using Binary Retrieve API |
| `/api/query-history` | GET | Get recent query history |
| `/api/query-history` | DELETE | Clear query history |

### JWT Generation API

The `/api/generate-jwt` endpoint creates a CommonWell JWT from a CLEAR ID Token.

**Request Body:**
```json
{
  "clearIdToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:**
```json
{
  "success": true,
  "jwt": "eyJhbGciOiJSUzM4NCIsInR5cCI6IkpXVCIsIng1dCI6Ii4uLiJ9...",
  "claims": {
    "given_name": "CAMILA",
    "family_name": "LOPEZ",
    "birthdate": "1987-09-12",
    ...
  },
  "expiresIn": 3600
}
```

### Patient Create API

The `/api/create-patient` endpoint creates a patient in CommonWell using demographics from the CLEAR ID Token.

**Request Body:**
```json
{
  "environment": "integration",
  "clearIdToken": "eyJhbGciOiJSUzI1NiIs...",
  "cvsPatientId": "601",
  "cvsAaid": "2.16.840.1.113883.3.CVS"
}
```

**Response:**
```json
{
  "success": true,
  "patient": { ... },
  "patientObject": { ... }
}
```

### Document Download API

The `/api/download-document` endpoint fetches document content from CommonWell's Binary API.

**Request Body:**
```json
{
  "environment": "integration",
  "jwtToken": "your-jwt-token",
  "documentUrl": "https://api.integration.commonwellalliance.lkopera.com/v2/R4/Binary/..."
}
```

**Response:**
```json
{
  "success": true,
  "contentType": "application/xml",
  "data": "base64-encoded-content",
  "id": "document-id"
}
```

## CommonWell Base URLs

| Environment | URL |
|-------------|-----|
| Integration | `https://api.integration.commonwellalliance.lkopera.com/v2/R4/DocumentReference` |
| Production | `https://api.commonwellalliance.lkopera.com/v2/R4/DocumentReference` |

## Supported LOINC Codes

| Code | Document Type |
|------|---------------|
| 34133-9 | Continuity of Care Document (CCD) |
| 18842-5 | Discharge Summary |
| 11506-3 | Progress Note |
| 34117-2 | History and Physical |
| 11488-4 | Consultation Note |
| 28570-0 | Procedure Note |
| 57133-1 | Referral Note |

## Timeout Settings

Per CommonWell Specification V4.4 Appendix B:
- Individual Gateway Timeout: 30 seconds
- Total Query Timeout: 50 seconds
- Performance Target: 99% within 6 seconds

## Troubleshooting

### "No client certificate on connection" Error (401)
This error means CommonWell requires mTLS authentication. You must:
1. Set the `CLIENT_CERT_PATH` and `CLIENT_KEY_PATH` environment variables
2. Ensure the certificate files are valid and not expired
3. Verify the certificate is registered with CommonWell for your organization

### "NODE_ENV is not recognized" Error (Windows)
Make sure you've updated the scripts to use `cross-env` as shown above.

### "Unable to get local issuer certificate" Error
This means Node.js cannot verify CommonWell's SSL certificate chain. Solutions:
1. **Quick fix for testing:** Set `SKIP_TLS_VERIFY=true` in your environment (already set in run-local.bat)
2. **Proper fix:** Provide the CA certificate via `CA_CERT_PATH` environment variable

### "Failed to load client certificates" Error
- Check that the file paths are correct and accessible
- Ensure the certificate files are in PEM format
- Verify file permissions allow reading

### Connection Timeout
CommonWell queries may take up to 50 seconds. The tool has a 55-second timeout configured.

### JWT Token Errors
- Ensure your token is not expired (use the Validate Token button)
- Check that the token has the correct scopes for DocumentReference queries

## Data Storage

**Important**: Query history is stored in-memory only. It resets when the server restarts. No database is required.

## Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Express.js, Node.js
- **Build Tool**: Vite

## License

MIT - Internal use only for CVS IAS Platform E2E testing.
