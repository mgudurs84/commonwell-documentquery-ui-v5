import streamlit as st
import requests
import json
import base64
import os
import re
import ssl
import urllib3
import hashlib
import uuid
from datetime import datetime, timedelta, timezone
from dateutil import parser as date_parser
from typing import Optional, Dict, Any, List
from urllib.parse import urlencode, quote

try:
    import jwt as pyjwt
    from cryptography import x509
    from cryptography.hazmat.primitives import serialization
    JWT_AVAILABLE = True
except ImportError:
    JWT_AVAILABLE = False

st.set_page_config(
    page_title="CommonWell Document Query",
    page_icon="🏥",
    layout="wide",
    initial_sidebar_state="expanded"
)

st.markdown("""
<style>
    .main-header {
        font-size: 1.8rem;
        font-weight: 700;
        color: #0BA5E9;
        margin-bottom: 0.5rem;
    }
    .sub-header {
        font-size: 0.9rem;
        color: #64748b;
        margin-bottom: 1.5rem;
    }
    .section-header {
        font-size: 1.1rem;
        font-weight: 600;
        color: #14B8A6;
        margin-top: 1rem;
        margin-bottom: 0.5rem;
        border-bottom: 2px solid #14B8A6;
        padding-bottom: 0.3rem;
    }
    .doc-card {
        background-color: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 1rem;
        margin-bottom: 1rem;
    }
    .doc-title {
        font-weight: 600;
        color: #1e293b;
    }
    .doc-meta {
        font-size: 0.85rem;
        color: #64748b;
    }
    .status-badge {
        display: inline-block;
        padding: 0.2rem 0.5rem;
        border-radius: 4px;
        font-size: 0.75rem;
        font-weight: 500;
    }
    .status-current {
        background-color: #dcfce7;
        color: #166534;
    }
    .url-preview {
        background-color: #1e293b;
        color: #e2e8f0;
        padding: 0.75rem;
        border-radius: 6px;
        font-family: monospace;
        font-size: 0.8rem;
        word-break: break-all;
        margin-top: 0.5rem;
    }
    .error-box {
        background-color: #fef2f2;
        border: 1px solid #fecaca;
        color: #991b1b;
        padding: 1rem;
        border-radius: 6px;
    }
    .success-box {
        background-color: #f0fdf4;
        border: 1px solid #bbf7d0;
        color: #166534;
        padding: 1rem;
        border-radius: 6px;
    }
</style>
""", unsafe_allow_html=True)

from config import (
    CW_ORG_OID, CW_ORG_NAME, CLEAR_OID,
    CLIENT_CERT_PATH, CLIENT_KEY_PATH, CA_CERT_PATH,
    CERTIFICATE_PATH, PRIVATE_KEY_PATH,
    API_BASE_URLS, PATIENT_API_BASE_URLS,
    API_TIMEOUT, SKIP_TLS_VERIFY
)

def decode_clear_id_token(token: str) -> Optional[Dict[str, Any]]:
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return None
        payload_padding = "=" * (4 - len(parts[1]) % 4) if len(parts[1]) % 4 else ""
        payload = json.loads(base64.urlsafe_b64decode(parts[1] + payload_padding))
        return payload
    except Exception:
        return None

def get_x5t_from_cert(cert_path: str) -> Optional[str]:
    if not JWT_AVAILABLE:
        return None
    try:
        with open(cert_path, "rb") as f:
            cert = x509.load_pem_x509_certificate(f.read())
        cert_der = cert.public_bytes(serialization.Encoding.DER)
        thumbprint = hashlib.sha1(cert_der).digest()
        return base64.urlsafe_b64encode(thumbprint).rstrip(b"=").decode("utf-8")
    except Exception:
        return None

def generate_commonwell_jwt(clear_id_token: str) -> Dict[str, Any]:
    if not JWT_AVAILABLE:
        return {"error": "PyJWT and cryptography packages required. Install with: pip install PyJWT cryptography"}
    
    cert_path = CERTIFICATE_PATH
    key_path = PRIVATE_KEY_PATH
    
    if not os.path.exists(cert_path) or not os.path.exists(key_path):
        return {"error": f"Certificate files not found. Ensure certificate.pem and private_key.pem exist in certs/ folder."}
    
    try:
        with open(key_path, "rb") as f:
            private_key = serialization.load_pem_private_key(f.read(), password=None)
        
        claims = decode_clear_id_token(clear_id_token)
        if not claims:
            return {"error": "Failed to decode CLEAR ID token"}
        
        patient_name = f"{claims.get('given_name', '')} {claims.get('family_name', '')}".strip()
        now = datetime.now(timezone.utc)
        
        x5t = get_x5t_from_cert(cert_path)
        
        headers = {
            "typ": "JWT",
            "alg": "RS384",
        }
        if x5t:
            headers["x5t"] = x5t
        
        payload = {
            "iss": f"urn:oid:{CW_ORG_OID}",
            "sub": f"urn:oid:{CW_ORG_OID}",
            "aud": "urn:commonwellalliance.org",
            "iat": int(now.timestamp()),
            "nbf": int(now.timestamp()),
            "exp": int((now + timedelta(hours=1)).timestamp()),
            "jti": str(uuid.uuid4()),
            "urn:oasis:names:tc:xspa:1.0:subject:purposeofuse": "REQUEST",
            "urn:oasis:names:tc:xacml:2.0:subject:role": "116154003",
            "urn:oasis:names:tc:xspa:1.0:subject:subject-id": patient_name,
            "urn:oasis:names:tc:xspa:1.0:subject:organization": CW_ORG_NAME,
            "urn:oasis:names:tc:xspa:1.0:subject:organization-id": f"urn:oid:{CW_ORG_OID}",
            "extensions": {
                "tefca_ias": {
                    "id_token": clear_id_token
                }
            }
        }
        
        signed_jwt = pyjwt.encode(payload, private_key, algorithm="RS384", headers=headers)
        
        return {"success": True, "jwt": signed_jwt, "claims": claims}
    except Exception as e:
        return {"error": f"Failed to generate JWT: {str(e)}"}

def build_patient_object(clear_claims: Dict[str, Any], cvs_patient_id: str, cvs_aaid: str) -> Dict[str, Any]:
    patient = {
        "identifier": [
            {
                "value": cvs_patient_id,
                "system": cvs_aaid,
                "use": "official",
                "assigner": CW_ORG_NAME
            },
            {
                "value": clear_claims.get("sub", ""),
                "system": CLEAR_OID,
                "use": "secondary",
                "type": "IAL2",
                "assigner": "CLEAR"
            }
        ],
        "name": [{
            "given": [clear_claims.get("given_name", "")],
            "family": [clear_claims.get("family_name", "")],
            "text": f"{clear_claims.get('given_name', '')} {clear_claims.get('middle_name', '')} {clear_claims.get('family_name', '')}".replace("  ", " ").strip(),
            "use": "usual"
        }],
        "birthDate": clear_claims.get("birthdate"),
        "active": True
    }
    
    if clear_claims.get("middle_name"):
        patient["name"][0]["given"].append(clear_claims["middle_name"])
    
    if clear_claims.get("gender"):
        patient["gender"] = clear_claims["gender"]
    
    address = clear_claims.get("address")
    if address:
        patient["address"] = [{
            "line": [address.get("street_address", "")],
            "city": address.get("locality", ""),
            "state": address.get("region", ""),
            "postalCode": address.get("postal_code", ""),
            "country": address.get("country", "US"),
            "use": "home"
        }]
    
    phone = clear_claims.get("phone_number")
    if phone:
        phone_clean = re.sub(r"^\+1", "", phone)
        phone_clean = re.sub(r"\D", "", phone_clean)
        patient["telecom"] = [{
            "value": phone_clean,
            "system": "phone",
            "use": "home"
        }]
    
    historical = clear_claims.get("historical_address", [])
    if historical:
        if "address" not in patient:
            patient["address"] = []
        for hist in historical:
            patient["address"].append({
                "line": [hist.get("street_address", "")],
                "city": hist.get("locality", ""),
                "state": hist.get("region", ""),
                "postalCode": hist.get("postal_code", ""),
                "country": hist.get("country", "US"),
                "use": "old",
                "type": "both"
            })
    
    alternate = {
        "identifier": [{
            "value": clear_claims.get("sub", ""),
            "system": CLEAR_OID,
            "use": "secondary",
            "type": "IAL2",
            "assigner": "CLEAR"
        }],
        "name": [{
            "given": [clear_claims.get("given_name", "")],
            "family": [clear_claims.get("family_name", "")],
            "use": "usual"
        }],
        "birthDate": clear_claims.get("birthdate")
    }
    
    if clear_claims.get("middle_name"):
        alternate["name"][0]["given"].append(clear_claims["middle_name"])
    
    if clear_claims.get("gender"):
        alternate["gender"] = clear_claims["gender"]
    
    if address:
        alternate["address"] = [{
            "line": [address.get("street_address", "")],
            "city": address.get("locality", ""),
            "state": address.get("region", ""),
            "postalCode": address.get("postal_code", ""),
            "use": "home"
        }]
    
    if phone and clear_claims.get("phone_number_verified") is True:
        phone_clean = re.sub(r"^\+1", "", phone)
        phone_clean = re.sub(r"\D", "", phone_clean)
        alternate["telecom"] = [{
            "value": phone_clean,
            "system": "phone",
            "use": "home"
        }]
    
    patient["alternatePatients"] = [alternate]
    
    return patient

def create_patient(environment: str, cw_jwt: str, patient_object: Dict[str, Any], skip_verify: bool = False) -> Dict[str, Any]:
    base_url = PATIENT_API_BASE_URLS[environment]
    patient_url = f"{base_url}org/{CW_ORG_OID}/Patient"
    
    print(f"[Patient Create] URL: {patient_url}")
    print(f"[Patient Create] Request body: {json.dumps(patient_object, indent=2)}")
    
    cert, verify = get_ssl_context(skip_verify)
    
    headers = {
        "Authorization": f"Bearer {cw_jwt}",
        "Accept": "application/fhir+json",
        "Content-Type": "application/fhir+json"
    }
    
    try:
        response = requests.post(
            patient_url,
            headers=headers,
            json=patient_object,
            cert=cert,
            verify=verify,
            timeout=55
        )
        
        print(f"[Patient Create] Response status: {response.status_code}")
        print(f"[Patient Create] Response body: {response.text}")
        
        if response.status_code >= 200 and response.status_code < 300:
            return {
                "success": True,
                "patient": response.json() if response.text else {},
                "patient_object": patient_object
            }
        else:
            return {
                "success": False,
                "error": f"HTTP {response.status_code}: {response.text}",
                "patient_object": patient_object
            }
    except Exception as e:
        print(f"[Patient Create] Error: {str(e)}")
        return {"success": False, "error": str(e), "patient_object": patient_object}

DOCUMENT_STATUS_OPTIONS = [
    {"value": "", "label": "All Statuses"},
    {"value": "current", "label": "Current"},
    {"value": "superseded", "label": "Superseded"},
    {"value": "entered-in-error", "label": "Entered in Error"}
]

DOCUMENT_TYPE_OPTIONS = [
    {"value": "", "label": "All Types"},
    {"value": "34133-9", "label": "Summarization of Episode Note (34133-9)"},
    {"value": "11488-4", "label": "Consultation Note (11488-4)"},
    {"value": "18842-5", "label": "Discharge Summary (18842-5)"},
    {"value": "11506-3", "label": "Progress Note (11506-3)"},
    {"value": "28570-0", "label": "Procedure Note (28570-0)"},
    {"value": "57133-1", "label": "Referral Note (57133-1)"}
]

CONTENT_TYPE_OPTIONS = [
    {"value": "", "label": "All Content Types"},
    {"value": "application/xml", "label": "XML (application/xml)"},
    {"value": "text/xml", "label": "XML (text/xml)"},
    {"value": "application/pdf", "label": "PDF (application/pdf)"},
    {"value": "text/plain", "label": "Plain Text (text/plain)"},
    {"value": "application/hl7-v3+xml", "label": "HL7 V3 (application/hl7-v3+xml)"}
]

if "query_history" not in st.session_state:
    st.session_state.query_history = []
if "results" not in st.session_state:
    st.session_state.results = None
if "error" not in st.session_state:
    st.session_state.error = None
if "response_time" not in st.session_state:
    st.session_state.response_time = None

def validate_jwt(token: str) -> Dict[str, Any]:
    if not token or not token.strip():
        return {"valid": False, "error": "JWT token is required"}
    
    parts = token.strip().split(".")
    if len(parts) != 3:
        return {"valid": False, "error": "Invalid JWT format - must have 3 parts separated by dots"}
    
    try:
        header_padding = "=" * (4 - len(parts[0]) % 4) if len(parts[0]) % 4 else ""
        header = json.loads(base64.urlsafe_b64decode(parts[0] + header_padding))
        
        payload_padding = "=" * (4 - len(parts[1]) % 4) if len(parts[1]) % 4 else ""
        payload = json.loads(base64.urlsafe_b64decode(parts[1] + payload_padding))
        
        exp = payload.get("exp")
        if exp:
            exp_date = datetime.fromtimestamp(exp)
            if exp_date < datetime.now():
                return {"valid": False, "error": f"Token expired on {exp_date.strftime('%Y-%m-%d %H:%M:%S')}"}
            return {"valid": True, "expires": exp_date.strftime('%Y-%m-%d %H:%M:%S')}
        
        return {"valid": True, "expires": None}
    except Exception as e:
        return {"valid": False, "error": f"Failed to decode JWT: {str(e)}"}

def build_query_url(params: Dict[str, Any]) -> str:
    base_url = API_BASE_URLS.get(params.get("environment", "integration"), API_BASE_URLS["integration"])
    url = f"{base_url}DocumentReference?"
    
    query_params = []
    
    aaid = params.get("aaid", "").strip()
    patient_id = params.get("patient_id", "").strip()
    if aaid and patient_id:
        identifier = f"{aaid}|{patient_id}"
        query_params.append(f"patient.identifier={quote(identifier, safe='')}")
    
    status = params.get("status", "")
    if status:
        query_params.append(f"status={status}")
    
    date_from = params.get("date_from")
    date_to = params.get("date_to")
    if date_from:
        query_params.append(f"date=ge{date_from.strftime('%Y-%m-%d')}")
    if date_to:
        query_params.append(f"date=le{date_to.strftime('%Y-%m-%d')}")
    
    doc_type = params.get("document_type", "")
    if doc_type:
        query_params.append(f"type={quote(f'http://loinc.org|{doc_type}', safe='')}")
    
    content_type = params.get("content_type", "")
    if content_type:
        query_params.append(f"contenttype={quote(content_type, safe='')}")
    
    author = params.get("author", "").strip()
    if author:
        query_params.append(f"author={quote(author, safe='')}")
    
    return url + "&".join(query_params)

def get_ssl_context(skip_verify: bool = False):
    cert_path = CLIENT_CERT_PATH
    key_path = CLIENT_KEY_PATH
    ca_path = CA_CERT_PATH
    
    cert = None
    verify = True
    
    if cert_path and key_path and os.path.exists(cert_path) and os.path.exists(key_path):
        cert = (cert_path, key_path)
    
    if skip_verify or SKIP_TLS_VERIFY:
        verify = False
        urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
    elif ca_path and os.path.exists(ca_path):
        verify = ca_path
    
    return cert, verify

def execute_query(params: Dict[str, Any]) -> Dict[str, Any]:
    url = build_query_url(params)
    jwt_token = params.get("jwt_token", "").strip()
    skip_verify = params.get("skip_tls_verify", False)
    
    cert, verify = get_ssl_context(skip_verify)
    
    headers = {
        "Authorization": f"Bearer {jwt_token}",
        "Accept": "application/fhir+json",
        "Content-Type": "application/fhir+json"
    }
    
    try:
        start_time = datetime.now()
        response = requests.get(
            url,
            headers=headers,
            cert=cert,
            verify=verify,
            timeout=55
        )
        end_time = datetime.now()
        response_time = (end_time - start_time).total_seconds() * 1000
        
        if response.status_code == 200:
            return {
                "success": True,
                "data": response.json(),
                "response_time": response_time
            }
        else:
            return {
                "success": False,
                "error": f"HTTP {response.status_code}: {response.text}",
                "response_time": response_time
            }
    except requests.exceptions.SSLError as e:
        return {"success": False, "error": f"SSL/TLS Error: {str(e)}. Check your certificate configuration."}
    except requests.exceptions.Timeout:
        return {"success": False, "error": "Request timed out after 55 seconds"}
    except requests.exceptions.RequestException as e:
        return {"success": False, "error": f"Request failed: {str(e)}"}

def download_document(environment: str, jwt_token: str, document_url: str, skip_verify: bool = False) -> Dict[str, Any]:
    allowed_hosts = {
        "integration": "api.integration.commonwellalliance.lkopera.com",
        "production": "api.commonwellalliance.lkopera.com"
    }
    
    from urllib.parse import urlparse
    parsed = urlparse(document_url)
    expected_host = allowed_hosts.get(environment)
    
    if parsed.scheme != "https" or parsed.hostname != expected_host:
        return {"success": False, "error": f"Invalid URL. Must be from {expected_host} using HTTPS"}
    
    cert, verify = get_ssl_context(skip_verify)
    
    headers = {
        "Authorization": f"Bearer {jwt_token}",
        "Accept": "application/fhir+json"
    }
    
    try:
        response = requests.get(
            document_url,
            headers=headers,
            cert=cert,
            verify=verify,
            timeout=55
        )
        
        if response.status_code == 200:
            data = response.json()
            return {
                "success": True,
                "content_type": data.get("contentType", "application/octet-stream"),
                "data": data.get("data", ""),
                "id": data.get("id", "")
            }
        else:
            return {"success": False, "error": f"HTTP {response.status_code}: {response.text}"}
    except Exception as e:
        return {"success": False, "error": str(e)}

def extract_documents(bundle: Dict[str, Any]) -> List[Dict[str, Any]]:
    documents = []
    entries = bundle.get("entry", [])
    
    for entry in entries:
        resource = entry.get("resource", {})
        if resource.get("resourceType") == "DocumentReference":
            doc = {
                "id": resource.get("id", "Unknown"),
                "status": resource.get("status", "unknown"),
                "description": resource.get("description", "No description"),
                "date": resource.get("date"),
                "author": None,
                "content": []
            }
            
            authors = resource.get("author", [])
            if authors and len(authors) > 0:
                doc["author"] = authors[0].get("display") or authors[0].get("reference")
            
            for content in resource.get("content", []):
                attachment = content.get("attachment", {})
                doc["content"].append({
                    "contentType": attachment.get("contentType", "unknown"),
                    "url": attachment.get("url"),
                    "size": attachment.get("size"),
                    "title": attachment.get("title")
                })
            
            documents.append(doc)
    
    return documents

def format_xml(xml_string: str) -> str:
    try:
        import xml.dom.minidom as minidom
        dom = minidom.parseString(xml_string)
        return dom.toprettyxml(indent="  ")
    except:
        return xml_string

def add_to_history(params: Dict[str, Any], success: bool):
    history_entry = {
        "timestamp": datetime.now().isoformat(),
        "environment": params.get("environment"),
        "patient_id": params.get("patient_id"),
        "aaid": params.get("aaid"),
        "success": success,
        "url": build_query_url(params)
    }
    st.session_state.query_history.insert(0, history_entry)
    if len(st.session_state.query_history) > 50:
        st.session_state.query_history = st.session_state.query_history[:50]

st.markdown('<p class="main-header">CommonWell Document Query</p>', unsafe_allow_html=True)
st.markdown('<p class="sub-header">CVS IAS Platform - E2E Testing Tool</p>', unsafe_allow_html=True)

with st.sidebar:
    st.markdown('<p class="section-header">Authentication</p>', unsafe_allow_html=True)
    
    environment = st.selectbox(
        "Environment",
        options=["integration", "production"],
        format_func=lambda x: "Integration" if x == "integration" else "Production"
    )
    
    clear_id_token = st.text_area(
        "CLEAR ID Token",
        height=100,
        placeholder="Paste your CLEAR ID Token here (eyJhbGciOiJSUzI1NiIs...)...",
        help="CLEAR OIDC ID Token from Accounts Team API. The CommonWell JWT will be generated automatically."
    )
    
    jwt_token = ""
    clear_claims = None
    token_hash = ""
    
    if "jwt_source_token" not in st.session_state:
        st.session_state["jwt_source_token"] = ""
    if "generated_jwt" not in st.session_state:
        st.session_state["generated_jwt"] = ""
    
    if clear_id_token:
        import hashlib
        token_hash = hashlib.sha256(clear_id_token.encode()).hexdigest()[:16]
        
        if st.session_state["jwt_source_token"] != token_hash:
            st.session_state["generated_jwt"] = ""
            st.session_state["jwt_source_token"] = ""
        
        clear_claims = decode_clear_id_token(clear_id_token)
        if clear_claims:
            required_claims = ["given_name", "family_name", "birthdate"]
            missing_claims = [c for c in required_claims if not clear_claims.get(c)]
            
            if missing_claims:
                st.error(f"CLEAR token missing required claims: {', '.join(missing_claims)}")
                clear_claims = None
            else:
                st.info(f"Patient: {clear_claims.get('given_name', '')} {clear_claims.get('family_name', '')} | DOB: {clear_claims.get('birthdate', 'N/A')}")
                
                if st.button("Generate CommonWell JWT", type="primary", use_container_width=True):
                    with st.spinner("Generating JWT..."):
                        jwt_result = generate_commonwell_jwt(clear_id_token)
                        if "error" in jwt_result:
                            st.error(f"JWT generation failed: {jwt_result['error']}")
                        else:
                            st.session_state["generated_jwt"] = jwt_result["jwt"]
                            st.session_state["jwt_source_token"] = token_hash
                            st.success("CommonWell JWT generated successfully! Expires in 1 hour.")
                
                if st.session_state["generated_jwt"] and st.session_state["jwt_source_token"] == token_hash:
                    jwt_token = st.session_state["generated_jwt"]
                    with st.expander("View Generated JWT"):
                        st.code(jwt_token[:200] + "..." if len(jwt_token) > 200 else jwt_token)
        else:
            st.error("Invalid CLEAR ID Token format. Ensure it has 3 parts (header.payload.signature) with valid base64 encoding.")
    else:
        st.session_state["generated_jwt"] = ""
        st.session_state["jwt_source_token"] = ""
    
    skip_tls = st.checkbox(
        "Skip TLS Verification",
        value=False,
        help="Enable for testing with self-signed certificates"
    )
    
    st.markdown('<p class="section-header">Create Patient in CommonWell</p>', unsafe_allow_html=True)
    
    st.caption("Create a patient record using demographics from the CLEAR ID Token before querying documents.")
    
    cvs_patient_id = st.text_input(
        "CVS Patient ID",
        placeholder="e.g., 601, PAT123456",
        help="Unique patient identifier from CVS systems"
    )
    
    cvs_aaid = st.text_input(
        "CVS Assigning Authority ID",
        placeholder="e.g., 2.16.840.1.113883.3.CVS",
        help="OID of the CVS assigning authority"
    )
    
    can_create = clear_claims and jwt_token and cvs_patient_id and cvs_aaid
    
    if st.button("Create Patient", disabled=not can_create, use_container_width=True):
        if clear_claims and jwt_token:
            with st.spinner("Creating patient..."):
                patient_obj = build_patient_object(clear_claims, cvs_patient_id, cvs_aaid)
                result = create_patient(environment, jwt_token, patient_obj, skip_tls)
                
                if result.get("success"):
                    st.success("Patient created successfully!")
                    with st.expander("View Patient Object"):
                        st.json(result.get("patient_object", {}))
                else:
                    st.error(result.get("error", "Failed to create patient"))
                    with st.expander("View Patient Object Sent"):
                        st.json(result.get("patient_object", {}))
    
    if not clear_id_token:
        st.warning("Enter a CLEAR ID Token and generate JWT first")
    
    st.markdown('<p class="section-header">Patient Identifier (for Query)</p>', unsafe_allow_html=True)
    
    aaid = st.text_input(
        "Assigning Authority ID (AAID)",
        placeholder="e.g., 2.16.840.1.113883.3.101.1",
        help="OID of the assigning authority"
    )
    
    patient_id = st.text_input(
        "Patient ID",
        placeholder="e.g., PAT123456",
        help="Patient identifier within the assigning authority"
    )
    
    st.markdown('<p class="section-header">Filters</p>', unsafe_allow_html=True)
    
    status = st.selectbox(
        "Document Status",
        options=[opt["value"] for opt in DOCUMENT_STATUS_OPTIONS],
        format_func=lambda x: next((opt["label"] for opt in DOCUMENT_STATUS_OPTIONS if opt["value"] == x), x)
    )
    
    col1, col2 = st.columns(2)
    with col1:
        use_date_from = st.checkbox("Filter by start date", value=False)
        if use_date_from:
            date_from = st.date_input(
                "Date From",
                help="Filter documents from this date"
            )
        else:
            date_from = None
    with col2:
        use_date_to = st.checkbox("Filter by end date", value=False)
        if use_date_to:
            date_to = st.date_input(
                "Date To",
                help="Filter documents until this date"
            )
        else:
            date_to = None
    
    document_type = st.selectbox(
        "Document Type (LOINC)",
        options=[opt["value"] for opt in DOCUMENT_TYPE_OPTIONS],
        format_func=lambda x: next((opt["label"] for opt in DOCUMENT_TYPE_OPTIONS if opt["value"] == x), x)
    )
    
    content_type = st.selectbox(
        "Content Type",
        options=[opt["value"] for opt in CONTENT_TYPE_OPTIONS],
        format_func=lambda x: next((opt["label"] for opt in CONTENT_TYPE_OPTIONS if opt["value"] == x), x)
    )
    
    author = st.text_input(
        "Author",
        placeholder="e.g., Organization name",
        help="Filter by document author"
    )
    
    st.markdown('<p class="section-header">Query URL Preview</p>', unsafe_allow_html=True)
    
    query_params = {
        "environment": environment,
        "jwt_token": jwt_token,
        "aaid": aaid,
        "patient_id": patient_id,
        "status": status,
        "date_from": date_from,
        "date_to": date_to,
        "document_type": document_type,
        "content_type": content_type,
        "author": author,
        "skip_tls_verify": skip_tls
    }
    
    preview_url = build_query_url(query_params)
    st.markdown(f'<div class="url-preview">{preview_url}</div>', unsafe_allow_html=True)
    
    can_execute = bool(jwt_token and aaid and patient_id)
    
    if st.button("Execute Query", type="primary", disabled=not can_execute, use_container_width=True):
        with st.spinner("Executing query..."):
            result = execute_query(query_params)
            add_to_history(query_params, result["success"])
            
            if result["success"]:
                st.session_state.results = result["data"]
                st.session_state.error = None
                st.session_state.response_time = result.get("response_time")
            else:
                st.session_state.results = None
                st.session_state.error = result["error"]
                st.session_state.response_time = result.get("response_time")

tab1, tab2, tab3 = st.tabs(["Results", "Query History", "Help"])

with tab1:
    if st.session_state.error:
        st.markdown(f'<div class="error-box">{st.session_state.error}</div>', unsafe_allow_html=True)
    elif st.session_state.results:
        bundle = st.session_state.results
        total = bundle.get("total", 0)
        
        col1, col2 = st.columns([3, 1])
        with col1:
            st.markdown(f"### Results ({total} documents)")
        with col2:
            if st.session_state.response_time:
                st.markdown(f"*Response time: {st.session_state.response_time:.0f}ms*")
        
        result_tab1, result_tab2 = st.tabs(["Documents List", "Raw JSON"])
        
        with result_tab1:
            documents = extract_documents(bundle)
            
            if documents:
                for doc in documents:
                    with st.container():
                        st.markdown(f"""
                        <div class="doc-card">
                            <div class="doc-title">{doc['description']}</div>
                            <div class="doc-meta">
                                ID: {doc['id']} | 
                                Status: <span class="status-badge status-{doc['status']}">{doc['status']}</span> |
                                Date: {doc.get('date', 'N/A')} |
                                Author: {doc.get('author', 'N/A')}
                            </div>
                        </div>
                        """, unsafe_allow_html=True)
                        
                        cols = st.columns(len(doc["content"]) if doc["content"] else 1)
                        for idx, content in enumerate(doc["content"]):
                            with cols[idx % len(cols)]:
                                content_type_str = content.get("contentType", "unknown")
                                size = content.get("size")
                                size_str = f" ({size} bytes)" if size else ""
                                
                                st.markdown(f"**{content_type_str}**{size_str}")
                                
                                if content.get("url"):
                                    col_a, col_b, col_c = st.columns(3)
                                    with col_a:
                                        if st.button("Copy URL", key=f"copy_{doc['id']}_{idx}"):
                                            st.code(content["url"])
                                    with col_b:
                                        if st.button("Preview", key=f"preview_{doc['id']}_{idx}"):
                                            with st.spinner("Loading document..."):
                                                result = download_document(
                                                    environment,
                                                    jwt_token,
                                                    content["url"],
                                                    skip_tls
                                                )
                                                if result["success"]:
                                                    st.session_state[f"preview_{doc['id']}_{idx}"] = result
                                                else:
                                                    st.error(result["error"])
                                    with col_c:
                                        if st.button("Download", key=f"download_{doc['id']}_{idx}"):
                                            with st.spinner("Downloading..."):
                                                result = download_document(
                                                    environment,
                                                    jwt_token,
                                                    content["url"],
                                                    skip_tls
                                                )
                                                if result["success"]:
                                                    file_data = base64.b64decode(result["data"])
                                                    ext = ".xml" if "xml" in result["content_type"] else ".pdf" if "pdf" in result["content_type"] else ".bin"
                                                    st.download_button(
                                                        "Save File",
                                                        file_data,
                                                        file_name=f"{doc['id']}{ext}",
                                                        mime=result["content_type"],
                                                        key=f"save_{doc['id']}_{idx}"
                                                    )
                                                else:
                                                    st.error(result["error"])
                                    
                                    preview_key = f"preview_{doc['id']}_{idx}"
                                    if preview_key in st.session_state and st.session_state[preview_key]:
                                        preview_data = st.session_state[preview_key]
                                        decoded = base64.b64decode(preview_data["data"]).decode("utf-8", errors="replace")
                                        
                                        if "xml" in preview_data["content_type"]:
                                            formatted_tab, raw_tab = st.tabs(["Formatted", "Raw"])
                                            with formatted_tab:
                                                st.code(format_xml(decoded), language="xml")
                                            with raw_tab:
                                                st.code(decoded, language="xml")
                                        elif "pdf" in preview_data["content_type"]:
                                            st.markdown(f'<iframe src="data:application/pdf;base64,{preview_data["data"]}" width="100%" height="500px"></iframe>', unsafe_allow_html=True)
                                        else:
                                            st.text(decoded[:5000])
                        
                        st.divider()
            else:
                st.info("No documents found in the response")
        
        with result_tab2:
            st.json(bundle)
    else:
        st.info("Execute a query to see results here")

with tab2:
    if st.session_state.query_history:
        if st.button("Clear History"):
            st.session_state.query_history = []
            st.rerun()
        
        for entry in st.session_state.query_history:
            status_icon = "✅" if entry["success"] else "❌"
            timestamp = datetime.fromisoformat(entry["timestamp"]).strftime("%Y-%m-%d %H:%M:%S")
            st.markdown(f"""
            {status_icon} **{entry['environment'].title()}** - {entry.get('aaid', '')}|{entry.get('patient_id', '')}  
            *{timestamp}*
            """)
            with st.expander("View URL"):
                st.code(entry["url"])
    else:
        st.info("No query history yet")

with tab3:
    st.markdown("""
    ## CommonWell Document Query Tool
    
    This tool allows you to query the CommonWell Health Alliance FHIR R4 DocumentReference API.
    
    ### Setup
    
    1. **Certificates**: Place your mTLS certificates in the `certs/` folder:
       - `client.crt` - Client certificate
       - `client.key` - Client private key
       - `ca.crt` - CA certificate (optional)
    
    2. **Or use environment variables**:
       - `CLIENT_CERT_PATH` - Path to client certificate
       - `CLIENT_KEY_PATH` - Path to client key
       - `CA_CERT_PATH` - Path to CA certificate
    
    ### Usage
    
    1. Select the environment (Integration or Production)
    2. Paste your JWT token
    3. Enter the patient identifier (AAID + Patient ID)
    4. Apply any optional filters
    5. Click "Execute Query"
    
    ### Filters
    
    - **Status**: Filter by document status (current, superseded, etc.)
    - **Date Range**: Filter documents by creation date
    - **Document Type**: Filter by LOINC document type code
    - **Content Type**: Filter by MIME type
    - **Author**: Filter by author organization
    
    ### Document Actions
    
    - **Copy URL**: Copy the Binary API URL for the document
    - **Preview**: View the document content inline
    - **Download**: Download the document file
    """)
