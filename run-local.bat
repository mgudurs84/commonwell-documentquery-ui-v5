@echo off
REM CommonWell Document Query Tool - Local Startup Script
REM Update the paths below to point to your client certificate files

REM ============================================================
REM CONFIGURE YOUR CERTIFICATE PATHS HERE
REM ============================================================
set CLIENT_CERT_PATH=C:\path\to\your\client-cert.pem
set CLIENT_KEY_PATH=C:\path\to\your\client-key.pem
set CA_CERT_PATH=C:\path\to\your\ca-cert.pem

REM Organization OIDs for CommonWell
set CW_ORG_OID=2.16.840.1.113883.3.5958.1000.300
set CW_ORG_NAME=CVS Health
set CLEAR_OID=2.16.840.1.113883.3.5958.1000.300.1

REM Set to "true" to skip TLS verification (use only for testing!)
REM This fixes "unable to get local issuer certificate" errors
set SKIP_TLS_VERIFY=true

REM ============================================================
REM DO NOT MODIFY BELOW THIS LINE
REM ============================================================
set NODE_ENV=development

echo.
echo ============================================================
echo CommonWell Document Query Tool
echo ============================================================
echo.
echo Certificate Configuration:
echo   CLIENT_CERT_PATH: %CLIENT_CERT_PATH%
echo   CLIENT_KEY_PATH:  %CLIENT_KEY_PATH%
echo   CA_CERT_PATH:     %CA_CERT_PATH%
echo.
echo Starting server...
echo.

npx tsx server/index.ts

pause
