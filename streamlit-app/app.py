import streamlit as st
import requests
import json
import base64
import os
import re
import ssl
import urllib3
from datetime import datetime, timedelta
from dateutil import parser as date_parser
from typing import Optional, Dict, Any, List
from urllib.parse import urlencode, quote

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

API_BASE_URLS = {
    "integration": "https://api.integration.commonwellalliance.lkopera.com/v2/R4/",
    "production": "https://api.commonwellalliance.lkopera.com/v2/R4/"
}

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
    certs_dir = os.path.join(os.path.dirname(__file__), "certs")
    cert_path = os.path.join(certs_dir, "client.crt")
    key_path = os.path.join(certs_dir, "client.key")
    ca_path = os.path.join(certs_dir, "ca.crt")
    
    if not os.path.exists(cert_path):
        cert_path = os.environ.get("CLIENT_CERT_PATH")
    if not os.path.exists(key_path):
        key_path = os.environ.get("CLIENT_KEY_PATH")
    if not os.path.exists(ca_path):
        ca_path = os.environ.get("CA_CERT_PATH")
    
    cert = None
    verify = True
    
    if cert_path and key_path and os.path.exists(cert_path) and os.path.exists(key_path):
        cert = (cert_path, key_path)
    
    if skip_verify:
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
    
    jwt_token = st.text_area(
        "JWT Token",
        height=100,
        placeholder="Paste your JWT token here...",
        help="Bearer token for CommonWell API authentication"
    )
    
    if jwt_token:
        validation = validate_jwt(jwt_token)
        if validation["valid"]:
            if validation.get("expires"):
                st.success(f"Valid token - Expires: {validation['expires']}")
            else:
                st.success("Valid token format")
        else:
            st.error(validation["error"])
    
    skip_tls = st.checkbox(
        "Skip TLS Verification",
        value=False,
        help="Enable for testing with self-signed certificates"
    )
    
    st.markdown('<p class="section-header">Patient Identifier</p>', unsafe_allow_html=True)
    
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
