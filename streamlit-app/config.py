CW_ORG_OID = "2.16.840.1.113883.3.5958.1000.300"
CW_ORG_NAME = "CVS Health"
CLEAR_OID = "2.16.840.1.113883.3.5958.1000.300.1"

CLIENT_CERT_PATH = "./certs/client-cert.pem"
CLIENT_KEY_PATH = "./certs/client-key.pem"
CA_CERT_PATH = "./certs/ca-cert.pem"

CERTIFICATE_PATH = "./certs/certificate.pem"
PRIVATE_KEY_PATH = "./certs/private_key.pem"

API_TIMEOUT = 55
SKIP_TLS_VERIFY = False

API_BASE_URLS = {
    "integration": "https://api.integration.commonwellalliance.lkopera.com/v2/R4/",
    "production": "https://api.commonwellalliance.lkopera.com/v2/R4/"
}

PATIENT_API_BASE_URLS = {
    "integration": "https://api.integration.commonwellalliance.lkopera.com/v2/",
    "production": "https://api.commonwellalliance.lkopera.com/v2/"
}
