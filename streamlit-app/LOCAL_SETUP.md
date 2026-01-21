# CommonWell Document Query Tool - Streamlit Version

A Python Streamlit application for querying the CommonWell Health Alliance FHIR R4 DocumentReference API.

## Prerequisites

- Python 3.9 or higher
- pip (Python package manager)
- CommonWell API access credentials (JWT token)
- mTLS certificates (client certificate and key)

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
│   ├── client.crt    # Client certificate (PEM format)
│   ├── client.key    # Client private key (PEM format)
│   └── ca.crt        # CA certificate (optional, PEM format)
├── app.py
└── requirements.txt
```

### Option 2: Use Environment Variables

Set the following environment variables:

```bash
# Windows
set CLIENT_CERT_PATH=C:\path\to\client.crt
set CLIENT_KEY_PATH=C:\path\to\client.key
set CA_CERT_PATH=C:\path\to\ca.crt

# macOS/Linux
export CLIENT_CERT_PATH=/path/to/client.crt
export CLIENT_KEY_PATH=/path/to/client.key
export CA_CERT_PATH=/path/to/ca.crt
```

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
- Paste your JWT token in the text area
- The tool will validate the token format and expiration

### 2. Patient Identifier

- Enter the Assigning Authority ID (AAID) - e.g., `2.16.840.1.113883.3.101.1`
- Enter the Patient ID within that authority

### 3. Filters (Optional)

- **Document Status**: Filter by current, superseded, or entered-in-error
- **Date Range**: Filter documents by creation date
- **Document Type**: Filter by LOINC code (e.g., Discharge Summary)
- **Content Type**: Filter by MIME type (e.g., application/xml)
- **Author**: Filter by author organization name

### 4. Execute Query

Click "Execute Query" to send the request to CommonWell.

### 5. View Results

- **Documents List**: Card view of each document with download/preview options
- **Raw JSON**: Full FHIR Bundle response in JSON format

### 6. Document Actions

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

### Invalid JWT Token

The tool validates:
- JWT has 3 parts (header.payload.signature)
- Token is not expired

Obtain a fresh token from your authentication provider if needed.

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
