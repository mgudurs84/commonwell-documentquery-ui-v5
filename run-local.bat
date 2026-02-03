@echo off
REM CommonWell Document Query Tool - Local Startup Script
REM Configuration is now in server/config.ts
REM Certificates should be placed in the certs/ folder

REM ============================================================
REM CERTIFICATE SETUP (Demo Configuration)
REM ============================================================
REM Place your certificates in the certs/ folder:
REM   - certs/client-cert.pem
REM   - certs/client-key.pem
REM   - certs/ca-cert.pem (optional)

set NODE_ENV=development

echo.
echo ============================================================
echo CommonWell Document Query Tool
echo ============================================================
echo.
echo Configuration loaded from: server/config.ts
echo Certificates expected in: certs/ folder
echo.
echo Starting server...
echo.

npx tsx server/index.ts

pause
