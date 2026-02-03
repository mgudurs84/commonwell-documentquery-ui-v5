# CommonWell Document Query Tool - Streamlit Version

A Python Streamlit application for querying the CommonWell Health Alliance FHIR R4 DocumentReference API.

## Prerequisites

- Python 3.9 or higher
- pip (Python package manager)
- **CLEAR ID Token** (from Accounts Team /token API) - the tool generates the CommonWell JWT automatically
- mTLS and JWT signing certificates (client certificate, private key, X.509 certificate)

## Installation

### 1. Navigate to the Streamlit App Directory

```bash
cd streamlit-app
```

### 2. Create a Virtual Environment (Recommended)

```bash
python -m venv venv

# Windows
venv\Scripts\activate

# macOS/Linux
source venv/bin/activate
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

## Certificate Configuration

### Option 1: Place Certificates in the `certs/` Folder

Create the following files in the `streamlit-app/certs/` folder:

```
streamlit-app/
├── certs/
│   ├── client.crt       # Client certificate for mTLS (PEM format)
│   ├── client.key       # Client private key for mTLS (PEM format)
│   ├── ca.crt           # CA certificate (optional, PEM format)
│   ├── certificate.pem  # X.509 certificate for JWT x5t header
│   └── private_key.pem  # RSA private key for JWT signing (RS384)
├── app.py
└── requirements.txt
```

**Note:** In non-production environments, the same certificate/key pair is typically used for both mTLS and JWT signing.

### Option 2: Use Environment Variables

Set the following environment variables:

```bash
# Windows - mTLS Configuration
set CLIENT_CERT_PATH=C:\path\to\client.crt
set CLIENT_KEY_PATH=C:\path\to\client.key
set CA_CERT_PATH=C:\path\to\ca.crt

# Windows - JWT Signing Configuration
set CW_CERTIFICATE_PATH=C:\path\to\certificate.pem
set CW_PRIVATE_KEY_PATH=C:\path\to\private_key.pem

# Windows - Organization Configuration
set CW_ORG_OID=2.16.840.1.113883.3.CVS
set CW_ORG_NAME=CVS Health
set CLEAR_OID=1.2.3.4.5.6.7.8.9

# macOS/Linux
export CLIENT_CERT_PATH=/path/to/client.crt
export CLIENT_KEY_PATH=/path/to/client.key
export CA_CERT_PATH=/path/to/ca.crt
export CW_CERTIFICATE_PATH=/path/to/certificate.pem
export CW_PRIVATE_KEY_PATH=/path/to/private_key.pem
export CW_ORG_OID=2.16.840.1.113883.3.CVS
export CW_ORG_NAME="CVS Health"
export CLEAR_OID=1.2.3.4.5.6.7.8.9
```

### Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `CLIENT_CERT_PATH` | Yes* | Path to client certificate for mTLS |
| `CLIENT_KEY_PATH` | Yes* | Path to client private key for mTLS |
| `CA_CERT_PATH` | No | Path to CA certificate for server verification |
| `CW_CERTIFICATE_PATH` | Yes* | Path to X.509 certificate for JWT x5t header |
| `CW_PRIVATE_KEY_PATH` | Yes* | Path to RSA private key for JWT signing |
| `CW_ORG_OID` | No | Your organization OID (default: 2.16.840.1.113883.3.CVS) |
| `CW_ORG_NAME` | No | Your organization name (default: CVS Health) |
| `CLEAR_OID` | No | CLEAR assigning authority OID (default: 1.2.3.4.5.6.7.8.9) |

*Or place files in the `certs/` folder with the expected filenames.

## Running the Application

### Start the Streamlit Server

```bash
streamlit run app.py
```

The application will open in your default browser at `http://localhost:8501`.

### Custom Port

```bash
streamlit run app.py --server.port 8080
```

## Using the Application

### 1. Authentication

- Select the environment (Integration or Production)
- Paste your **CLEAR ID Token** in the text area (from Accounts Team /token API)
- The tool extracts patient demographics and validates required claims
- Click **"Generate CommonWell JWT"** to create the signed JWT with RS384

### 2. Create Patient (Optional)

Before querying documents, you may need to create the patient in CommonWell:

- Enter the **CVS Patient ID** (unique identifier from CVS systems)
- Enter the **CVS Assigning Authority ID** (your organization's OID)
- Click **"Create Patient"** to register the patient using CLEAR demographics
- The patient object includes primary (CVS) and secondary (CLEAR IAL2) identifiers

### 3. Patient Identifier (for Query)

- Enter the Assigning Authority ID (AAID) - typically your CVS OID
- Enter the Patient ID used when creating the patient

### 4. Filters (Optional)

- **Document Status**: Filter by current, superseded, or entered-in-error
- **Date Range**: Filter documents by creation date
- **Document Type**: Filter by LOINC code (e.g., Discharge Summary)
- **Content Type**: Filter by MIME type (e.g., application/xml)
- **Author**: Filter by author organization name

### 5. Execute Query

Click "Execute Query" to send the request to CommonWell.

### 6. View Results

- **Documents List**: Card view of each document with download/preview options
- **Raw JSON**: Full FHIR Bundle response in JSON format

### 7. Document Actions

- **Copy URL**: Copy the Binary API URL to clipboard
- **Preview**: View document content inline (XML formatted, PDF embedded)
- **Download**: Download the document file

## Query History

The application maintains an in-memory history of your queries (up to 50 entries).
View the history in the "Query History" tab.

## Troubleshooting

### SSL/TLS Errors

If you encounter certificate verification errors:

1. Ensure your certificates are in the correct format (PEM)
2. Check that the certificate chain is valid
3. For testing, enable "Skip TLS Verification" checkbox (not for production)

### Connection Timeouts

CommonWell API has the following timeouts:
- Per gateway: 30 seconds
- Total query: 50 seconds
- This tool: 55 seconds

### Invalid CLEAR ID Token

The tool validates:
- Token has 3 parts (header.payload.signature)
- Base64 encoding is valid
- Required claims are present: given_name, family_name, birthdate

Obtain a fresh CLEAR ID Token from the Accounts Team /token API if needed.

### JWT Generation Errors

If JWT generation fails:
- Ensure certificate.pem and private_key.pem exist in the certs/ folder
- Verify the certificate is in PEM format
- Check that the private key matches the certificate

## API Endpoints

| Environment | Base URL |
|-------------|----------|
| Integration | `https://api.integration.commonwellalliance.lkopera.com/v2/R4/` |
| Production | `https://api.commonwellalliance.lkopera.com/v2/R4/` |

## Security Notes

- Never commit certificates or JWT tokens to version control
- The "Skip TLS Verification" option should only be used for testing
- All CommonWell API calls use mTLS authentication
- Document URLs are validated to prevent SSRF attacks
