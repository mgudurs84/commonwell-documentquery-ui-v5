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

Place your certificate files in the `certs/` folder:

```
streamlit-app/
├── certs/
│   ├── client-cert.pem   # Client certificate for mTLS
│   ├── client-key.pem    # Client private key for mTLS
│   ├── ca-cert.pem       # CA certificate (optional)
│   ├── certificate.pem   # X.509 certificate for JWT x5t header
│   └── private_key.pem   # RSA private key for JWT signing
├── app.py
├── config.py
└── requirements.txt
```

**Note:** In non-production environments, the same certificate/key pair is typically used for both mTLS and JWT signing.

### Configuration

All settings are hardcoded in `config.py` for demo purposes:

```python
CW_ORG_OID = "2.16.840.1.113883.3.5958.1000.300"
CW_ORG_NAME = "CVS Health"
CLEAR_OID = "2.16.840.1.113883.3.5958.1000.300.1"

CLIENT_CERT_PATH = "./certs/client-cert.pem"
CLIENT_KEY_PATH = "./certs/client-key.pem"
CERTIFICATE_PATH = "./certs/certificate.pem"
PRIVATE_KEY_PATH = "./certs/private_key.pem"

SKIP_TLS_VERIFY = False
```

To modify settings, edit `config.py` directly.

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
