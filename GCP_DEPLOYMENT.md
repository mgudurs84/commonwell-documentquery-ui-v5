# CommonWell Document Query Tool - GCP Deployment Guide

This guide covers deploying the CommonWell Document Query Tool to Google Cloud Platform using Cloud Run.

## Prerequisites

- Google Cloud SDK (`gcloud`) installed and authenticated
- Docker installed locally (optional, for local testing)
- A GCP project with billing enabled
- Cloud Run API enabled
- Artifact Registry API enabled (for container images)

## Quick Deploy to Cloud Run

### 1. Set Up GCP Project

```bash
# Set your project ID
export PROJECT_ID=your-gcp-project-id
export REGION=us-central1

gcloud config set project $PROJECT_ID
gcloud config set run/region $REGION

# Enable required APIs
gcloud services enable run.googleapis.com
gcloud services enable artifactregistry.googleapis.com
gcloud services enable secretmanager.googleapis.com
```

### 2. Create Artifact Registry Repository

```bash
gcloud artifacts repositories create commonwell-query \
  --repository-format=docker \
  --location=$REGION \
  --description="CommonWell Query Tool images"
```

### 3. Build and Push Docker Image

```bash
# Configure Docker for GCP
gcloud auth configure-docker $REGION-docker.pkg.dev

# Build the image
docker build -t $REGION-docker.pkg.dev/$PROJECT_ID/commonwell-query/app:latest .

# Push to Artifact Registry
docker push $REGION-docker.pkg.dev/$PROJECT_ID/commonwell-query/app:latest
```

### 4. Store Certificates in Secret Manager

```bash
# Store mTLS certificate
gcloud secrets create client-cert \
  --data-file=/path/to/your/client-cert.pem

# Store private key
gcloud secrets create client-key \
  --data-file=/path/to/your/client-key.pem

# Store CA certificate (optional)
gcloud secrets create ca-cert \
  --data-file=/path/to/your/ca-cert.pem
```

### 5. Grant Secret Manager Access

```bash
# Get the Cloud Run service account
export SERVICE_ACCOUNT=$(gcloud iam service-accounts list \
  --filter="displayName:Compute Engine default" \
  --format='value(email)')

# Grant access to secrets
gcloud secrets add-iam-policy-binding client-cert \
  --member="serviceAccount:$SERVICE_ACCOUNT" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding client-key \
  --member="serviceAccount:$SERVICE_ACCOUNT" \
  --role="roles/secretmanager.secretAccessor"
```

### 6. Deploy to Cloud Run

```bash
gcloud run deploy commonwell-query \
  --image=$REGION-docker.pkg.dev/$PROJECT_ID/commonwell-query/app:latest \
  --platform=managed \
  --region=$REGION \
  --allow-unauthenticated \
  --memory=512Mi \
  --cpu=1 \
  --timeout=60s \
  --set-env-vars="NODE_ENV=production" \
  --set-env-vars="CW_ORG_OID=2.16.840.1.113883.3.5958.1000.300" \
  --set-env-vars="CW_ORG_NAME=CVS Health" \
  --set-env-vars="CLEAR_OID=2.16.840.1.113883.3.5958.1000.300.1" \
  --set-secrets="/app/certs/client-cert.pem=client-cert:latest" \
  --set-secrets="/app/certs/client-key.pem=client-key:latest" \
  --set-env-vars="CLIENT_CERT_PATH=/app/certs/client-cert.pem" \
  --set-env-vars="CLIENT_KEY_PATH=/app/certs/client-key.pem"
```

### 7. Verify Deployment

```bash
# Get the service URL
gcloud run services describe commonwell-query --format='value(status.url)'

# Test the health endpoint
curl $(gcloud run services describe commonwell-query --format='value(status.url)')/api/query-history
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `CLIENT_CERT_PATH` | Yes | Path to client certificate (mounted from Secret Manager) |
| `CLIENT_KEY_PATH` | Yes | Path to private key (mounted from Secret Manager) |
| `CA_CERT_PATH` | No | Path to CA certificate |
| `CW_ORG_OID` | No | Organization OID (default: 2.16.840.1.113883.3.5958.1000.300) |
| `CW_ORG_NAME` | No | Organization name (default: CVS Health) |
| `CLEAR_OID` | No | CLEAR assigning authority OID |
| `SKIP_TLS_VERIFY` | No | Skip TLS verification (NOT recommended for production) |

## Security Considerations

1. **Use Secret Manager** for all certificates and sensitive configuration
2. **Enable IAM authentication** for production deployments:
   ```bash
   gcloud run deploy commonwell-query --no-allow-unauthenticated ...
   ```
3. **Use VPC Connector** if CommonWell API requires specific IP allowlisting
4. **Enable Cloud Armor** for additional protection

## Local Docker Testing

```bash
# Build locally
docker build -t commonwell-query .

# Run locally (mount certificates)
docker run -p 8080:8080 \
  -v /path/to/certs:/app/certs:ro \
  -e CLIENT_CERT_PATH=/app/certs/client-cert.pem \
  -e CLIENT_KEY_PATH=/app/certs/client-key.pem \
  -e CW_ORG_OID=2.16.840.1.113883.3.5958.1000.300 \
  commonwell-query
```

## Updating the Deployment

```bash
# Rebuild and push new image
docker build -t $REGION-docker.pkg.dev/$PROJECT_ID/commonwell-query/app:latest .
docker push $REGION-docker.pkg.dev/$PROJECT_ID/commonwell-query/app:latest

# Deploy new revision
gcloud run deploy commonwell-query \
  --image=$REGION-docker.pkg.dev/$PROJECT_ID/commonwell-query/app:latest
```

## Troubleshooting

### Container fails to start
- Check Cloud Run logs: `gcloud run services logs read commonwell-query`
- Verify certificates are properly mounted
- Ensure PORT environment variable is set to 8080

### Certificate errors
- Verify certificates are in PEM format
- Check Secret Manager permissions
- Ensure the service account has `secretmanager.secretAccessor` role

### Timeout errors
- Increase Cloud Run timeout: `--timeout=120s`
- CommonWell API may take up to 50 seconds to respond
