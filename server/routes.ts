import type { Express } from "express";
import { createServer, type Server } from "http";
import https from "https";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { storage } from "./storage";
import { BASE_URLS, API_BASE_URLS, type QueryParameters, insertQueryHistorySchema } from "@shared/schema";
import { z } from "zod";
import { config } from "./config";

const CW_ORG_OID = config.CW_ORG_OID;
const CW_ORG_NAME = config.CW_ORG_NAME;
const CLEAR_OID = config.CLEAR_OID;

function formatTimestamp(): string {
  return new Date().toISOString();
}

function logJson(logEntry: Record<string, any>): void {
  console.log(JSON.stringify(logEntry));
}

function logRequest(operation: string, method: string, url: string, headers: Record<string, string>, body?: any): void {
  const sanitizedHeaders: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === "authorization") {
      sanitizedHeaders[key] = value.length > 100 ? `${value.substring(0, 100)}...[truncated]` : value;
    } else {
      sanitizedHeaders[key] = value;
    }
  }

  logJson({
    timestamp: formatTimestamp(),
    severity: "INFO",
    type: "REQUEST",
    operation,
    method,
    url,
    headers: sanitizedHeaders,
    body: body || null
  });
}

function logResponse(operation: string, status: number, statusText: string, headers?: any, body?: any, responseTimeMs?: number): void {
  const headerObj = headers 
    ? (typeof headers.entries === "function" ? Object.fromEntries(headers.entries()) : headers)
    : null;

  logJson({
    timestamp: formatTimestamp(),
    severity: status >= 400 ? "ERROR" : "INFO",
    type: "RESPONSE",
    operation,
    statusCode: status,
    statusText,
    headers: headerObj,
    body: body || null,
    responseTimeMs: responseTimeMs || null
  });
}

function logEvent(operation: string, message: string, data?: Record<string, any>, severity: string = "INFO"): void {
  logJson({
    timestamp: formatTimestamp(),
    severity,
    type: "EVENT",
    operation,
    message,
    ...data
  });
}

function getX5tFromCert(certPath: string): string | null {
  try {
    const certPem = fs.readFileSync(path.resolve(certPath), "utf8");
    const certBase64 = certPem
      .replace(/-----BEGIN CERTIFICATE-----/g, "")
      .replace(/-----END CERTIFICATE-----/g, "")
      .replace(/\s/g, "");
    const certDer = Buffer.from(certBase64, "base64");
    const thumbprint = crypto.createHash("sha1").update(certDer).digest();
    return thumbprint.toString("base64url");
  } catch (error) {
    console.error("Failed to calculate x5t:", error);
    return null;
  }
}

function decodeIdToken(idToken: string): any {
  try {
    const parts = idToken.split(".");
    if (parts.length !== 3) {
      throw new Error("Invalid JWT format");
    }
    const payload = Buffer.from(parts[1], "base64url").toString("utf8");
    return JSON.parse(payload);
  } catch (error: any) {
    throw new Error(`Failed to decode ID token: ${error.message}`);
  }
}

function generateCommonWellJwt(clearIdToken: string): { jwt: string; claims: any } | { error: string } {
  const certPath = config.CLIENT_CERT_PATH;
  const keyPath = config.CLIENT_KEY_PATH;

  if (!certPath || !keyPath || !fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
    return { error: "Certificate paths not configured. Set CLIENT_CERT_PATH and CLIENT_KEY_PATH." };
  }

  try {
    const privateKey = fs.readFileSync(path.resolve(keyPath), "utf8");
    const claims = decodeIdToken(clearIdToken);
    
    const patientName = `${claims.given_name || ""} ${claims.family_name || ""}`.trim();
    const now = Math.floor(Date.now() / 1000);
    const exp = now + 3600;

    const x5t = getX5tFromCert(certPath);
    
    const header: any = {
      typ: "JWT",
      alg: "RS384",
    };
    if (x5t) {
      header.x5t = x5t;
    }

    const payload = {
      iss: `urn:oid:${CW_ORG_OID}`,
      sub: `urn:oid:${CW_ORG_OID}`,
      aud: "urn:commonwellalliance.org",
      iat: now,
      nbf: now,
      exp: exp,
      jti: uuidv4(),
      "urn:oasis:names:tc:xspa:1.0:subject:purposeofuse": "REQUEST",
      "urn:oasis:names:tc:xacml:2.0:subject:role": "116154003",
      "urn:oasis:names:tc:xspa:1.0:subject:subject-id": patientName,
      "urn:oasis:names:tc:xspa:1.0:subject:organization": CW_ORG_NAME,
      "urn:oasis:names:tc:xspa:1.0:subject:organization-id": `urn:oid:${CW_ORG_OID}`,
      extensions: {
        tefca_ias: {
          id_token: clearIdToken
        }
      }
    };

    const signedJwt = jwt.sign(payload, privateKey, {
      algorithm: "RS384",
      header: header,
    });

    return { jwt: signedJwt, claims };
  } catch (error: any) {
    return { error: `Failed to generate JWT: ${error.message}` };
  }
}

function buildPatientObject(clearClaims: any, cvsPatientId: string, cvsAaid: string): any {
  const patient: any = {
    identifier: [
      {
        value: cvsPatientId,
        system: cvsAaid,
        use: "official",
        assigner: CW_ORG_NAME
      },
      {
        value: clearClaims.sub,
        system: CLEAR_OID,
        use: "secondary",
        type: "IAL2",
        assigner: "CLEAR"
      }
    ],
    name: [{
      given: [clearClaims.given_name],
      family: [clearClaims.family_name],
      text: `${clearClaims.given_name} ${clearClaims.middle_name || ""} ${clearClaims.family_name}`.replace(/\s+/g, " ").trim(),
      use: "usual"
    }],
    birthDate: clearClaims.birthdate,
    active: true
  };

  if (clearClaims.middle_name) {
    patient.name[0].given.push(clearClaims.middle_name);
  }

  if (clearClaims.gender) {
    patient.gender = clearClaims.gender;
  }

  if (clearClaims.address) {
    patient.address = [{
      line: [clearClaims.address.street_address],
      city: clearClaims.address.locality,
      state: clearClaims.address.region,
      postalCode: clearClaims.address.postal_code,
      country: clearClaims.address.country || "US",
      use: "home"
    }];
  }

  if (clearClaims.phone_number) {
    let phoneNumber = clearClaims.phone_number.replace(/^\+1/, "").replace(/\D/g, "");
    patient.telecom = [{
      value: phoneNumber,
      system: "phone",
      use: "home"
    }];
  }

  if (clearClaims.historical_address && Array.isArray(clearClaims.historical_address)) {
    if (!patient.address) patient.address = [];
    clearClaims.historical_address.forEach((hist: any) => {
      patient.address.push({
        line: [hist.street_address],
        city: hist.locality,
        state: hist.region,
        postalCode: hist.postal_code,
        country: hist.country || "US",
        use: "old",
        type: "both"
      });
    });
  }

  const alternatePatient: any = {
    identifier: [{
      value: clearClaims.sub,
      system: CLEAR_OID,
      use: "secondary",
      type: "IAL2",
      assigner: "CLEAR"
    }],
    name: [{
      given: [clearClaims.given_name],
      family: [clearClaims.family_name],
      use: "usual"
    }],
    birthDate: clearClaims.birthdate
  };

  if (clearClaims.middle_name) {
    alternatePatient.name[0].given.push(clearClaims.middle_name);
  }

  if (clearClaims.gender) {
    alternatePatient.gender = clearClaims.gender;
  }

  if (clearClaims.address) {
    alternatePatient.address = [{
      line: [clearClaims.address.street_address],
      city: clearClaims.address.locality,
      state: clearClaims.address.region,
      postalCode: clearClaims.address.postal_code,
      use: "home"
    }];
  }

  if (clearClaims.phone_number && clearClaims.phone_number_verified === true) {
    let phoneNumber = clearClaims.phone_number.replace(/^\+1/, "").replace(/\D/g, "");
    alternatePatient.telecom = [{
      value: phoneNumber,
      system: "phone",
      use: "home"
    }];
  }

  patient.alternatePatients = [alternatePatient];

  return patient;
}

function getHttpsAgent(): https.Agent | undefined {
  const certPath = config.CLIENT_CERT_PATH;
  const keyPath = config.CLIENT_KEY_PATH;
  const caPath = config.CA_CERT_PATH;
  const skipTlsVerify = config.SKIP_TLS_VERIFY;

  if (!certPath || !keyPath || !fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
    console.warn("Client certificate not found in certs/ folder. Ensure client-cert.pem and client-key.pem exist.");
    return undefined;
  }

  try {
    const agentOptions: https.AgentOptions = {
      cert: fs.readFileSync(path.resolve(certPath)),
      key: fs.readFileSync(path.resolve(keyPath)),
      rejectUnauthorized: !skipTlsVerify,
    };

    if (caPath && fs.existsSync(caPath)) {
      agentOptions.ca = fs.readFileSync(path.resolve(caPath));
    }

    if (skipTlsVerify) {
      console.warn("WARNING: TLS certificate verification is disabled. Use only for testing!");
    }

    console.log("Client certificates loaded successfully");
    return new https.Agent(agentOptions);
  } catch (error: any) {
    console.error("Failed to load client certificates:", error.message);
    return undefined;
  }
}

const queryParamsSchema = z.object({
  environment: z.enum(["integration", "production"]),
  jwtToken: z.string().min(1),
  aaid: z.string().min(1),
  patientId: z.string().min(1),
  status: z.enum(["current", "superseded", "entered-in-error", "all"]),
  dateEnabled: z.boolean(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  periodEnabled: z.boolean(),
  periodFrom: z.string().optional(),
  periodTo: z.string().optional(),
  documentTypeEnabled: z.boolean(),
  documentTypes: z.array(z.string()),
  customDocumentType: z.string().optional(),
  contentTypeEnabled: z.boolean(),
  contentTypes: z.array(z.string()),
  authorEnabled: z.boolean(),
  authorGiven: z.string().optional(),
  authorFamily: z.string().optional(),
});

function buildQueryUrl(params: QueryParameters): string {
  const baseUrl = BASE_URLS[params.environment];
  const searchParams = new URLSearchParams();

  if (params.aaid && params.patientId) {
    searchParams.set("patient.identifier", `${params.aaid}|${params.patientId}`);
  }

  if (params.status !== "all") {
    searchParams.set("status", params.status);
  }

  if (params.dateEnabled) {
    if (params.dateFrom) {
      const isoDate = new Date(params.dateFrom).toISOString();
      searchParams.append("date", `ge${isoDate}`);
    }
    if (params.dateTo) {
      const isoDate = new Date(params.dateTo).toISOString();
      searchParams.append("date", `le${isoDate}`);
    }
  }

  if (params.periodEnabled) {
    if (params.periodFrom) {
      const isoDate = new Date(params.periodFrom).toISOString();
      searchParams.append("period", `ge${isoDate}`);
    }
    if (params.periodTo) {
      const isoDate = new Date(params.periodTo).toISOString();
      searchParams.append("period", `le${isoDate}`);
    }
  }

  if (params.documentTypeEnabled) {
    const types = [...params.documentTypes];
    if (params.customDocumentType) {
      types.push(params.customDocumentType);
    }
    types.forEach((type) => {
      searchParams.append("documenttype", type);
    });
  }

  if (params.contentTypeEnabled) {
    params.contentTypes.forEach((type) => {
      searchParams.append("contenttype", type);
    });
  }

  if (params.authorEnabled) {
    if (params.authorGiven) {
      searchParams.set("author.given", params.authorGiven);
    }
    if (params.authorFamily) {
      searchParams.set("author.family", params.authorFamily);
    }
  }

  const queryString = searchParams.toString();
  return queryString ? `${baseUrl}?${queryString}` : baseUrl;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.post("/api/execute-query", async (req, res) => {
    try {
      const parseResult = queryParamsSchema.safeParse(req.body);
      
      if (!parseResult.success) {
        return res.status(400).json({ 
          error: "Invalid query parameters",
          details: parseResult.error.errors 
        });
      }

      const params = parseResult.data as QueryParameters;
      const queryUrl = buildQueryUrl(params);
      const startTime = Date.now();

      const requestHeaders = {
        "Authorization": `Bearer ${params.jwtToken}`,
        "Accept": "application/fhir+json",
        "Content-Type": "application/fhir+json",
      };
      
      logRequest("DocumentReference Query", "GET", queryUrl, requestHeaders);

      try {
        const httpsAgent = getHttpsAgent();
        
        const fetchWithAgent = (url: string, options: any): Promise<Response> => {
          if (!httpsAgent) {
            return fetch(url, options);
          }
          
          return new Promise((resolve, reject) => {
            const urlObj = new URL(url);
            const reqOptions: https.RequestOptions = {
              hostname: urlObj.hostname,
              port: urlObj.port || 443,
              path: urlObj.pathname + urlObj.search,
              method: options.method || "GET",
              headers: options.headers,
              agent: httpsAgent,
              timeout: 55000,
            };

            const req = https.request(reqOptions, (res) => {
              let data = "";
              res.on("data", (chunk) => (data += chunk));
              res.on("end", () => {
                const response = new Response(data, {
                  status: res.statusCode || 500,
                  statusText: res.statusMessage || "Error",
                  headers: res.headers as any,
                });
                resolve(response);
              });
            });

            req.on("error", reject);
            req.on("timeout", () => {
              req.destroy();
              reject(new Error("Request timeout"));
            });

            if (options.signal) {
              options.signal.addEventListener("abort", () => {
                req.destroy();
                reject(new DOMException("Aborted", "AbortError"));
              });
            }

            req.end();
          });
        };

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 55000);

        const response = await fetchWithAgent(queryUrl, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${params.jwtToken}`,
            "Accept": "application/fhir+json",
            "Content-Type": "application/fhir+json",
          },
          signal: controller.signal,
        });

        clearTimeout(timeout);
        const responseTime = Date.now() - startTime;

        let data;
        const contentType = response.headers.get("content-type");
        
        if (contentType?.includes("application/json") || contentType?.includes("application/fhir+json")) {
          data = await response.json();
        } else {
          const text = await response.text();
          data = { rawResponse: text, contentType };
        }

        logResponse("DocumentReference Query", response.status, response.statusText || "OK", response.headers, data, responseTime);

        await storage.addQueryHistory({
          queryUrl,
          environment: params.environment,
          patientIdentifier: `${params.aaid}|${params.patientId}`,
          parameters: params as unknown as Record<string, unknown>,
          responseTime: responseTime.toString(),
          documentCount: data?.total?.toString() || data?.entry?.length?.toString() || "0",
          status: response.ok ? "success" : "error",
        });

        if (!response.ok) {
          return res.status(response.status).json({
            error: `CommonWell API Error: ${response.status} ${response.statusText}`,
            details: data,
            responseTime,
          });
        }

        return res.json(data);
      } catch (fetchError: any) {
        const responseTime = Date.now() - startTime;
        
        await storage.addQueryHistory({
          queryUrl,
          environment: params.environment,
          patientIdentifier: `${params.aaid}|${params.patientId}`,
          parameters: params as unknown as Record<string, unknown>,
          responseTime: responseTime.toString(),
          documentCount: "0",
          status: "error",
        });

        if (fetchError.name === "AbortError") {
          return res.status(408).json({
            error: "Request timeout",
            message: "The request to CommonWell API timed out after 55 seconds",
            responseTime,
          });
        }

        return res.status(502).json({
          error: "Failed to connect to CommonWell API",
          message: fetchError.message,
          responseTime,
        });
      }
    } catch (error: any) {
      console.error("Execute query error:", error);
      return res.status(500).json({
        error: "Internal server error",
        message: error.message,
      });
    }
  });

  const downloadSchema = z.object({
    environment: z.enum(["integration", "production"]),
    jwtToken: z.string().min(1),
    documentUrl: z.string().url(),
  });

  app.post("/api/download-document", async (req, res) => {
    try {
      const parseResult = downloadSchema.safeParse(req.body);
      
      if (!parseResult.success) {
        return res.status(400).json({ 
          error: "Invalid download parameters",
          details: parseResult.error.errors 
        });
      }

      const { environment, jwtToken, documentUrl } = parseResult.data;
      
      let parsedUrl: URL;
      try {
        parsedUrl = new URL(documentUrl);
      } catch {
        return res.status(400).json({
          error: "Invalid document URL",
          message: "URL format is invalid",
        });
      }

      const allowedHostnames: Record<string, string> = {
        integration: "api.integration.commonwellalliance.lkopera.com",
        production: "api.commonwellalliance.lkopera.com",
      };
      
      const expectedHost = allowedHostnames[environment];
      if (parsedUrl.protocol !== "https:" || parsedUrl.hostname !== expectedHost) {
        return res.status(400).json({
          error: "Invalid document URL",
          message: `URL must be from ${expectedHost} using HTTPS`,
        });
      }

      const binaryRequestHeaders = {
        "Authorization": `Bearer ${jwtToken}`,
        "Accept": "application/fhir+json",
      };
      
      logRequest("Binary Retrieve", "GET", documentUrl, binaryRequestHeaders);
      
      const httpsAgent = getHttpsAgent();
      
      const fetchBinary = (): Promise<{ status: number; statusText: string; data: string; headers: any }> => {
        return new Promise((resolve, reject) => {
          const urlObj = new URL(documentUrl);
          const reqOptions: https.RequestOptions = {
            hostname: urlObj.hostname,
            port: urlObj.port || 443,
            path: urlObj.pathname + urlObj.search,
            method: "GET",
            headers: binaryRequestHeaders,
            agent: httpsAgent,
            timeout: 55000,
          };

          const req = https.request(reqOptions, (response) => {
            const chunks: Buffer[] = [];
            response.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
            response.on("end", () => {
              const buffer = Buffer.concat(chunks);
              resolve({
                status: response.statusCode || 500,
                statusText: response.statusMessage || "Error",
                data: buffer.toString("utf-8"),
                headers: response.headers,
              });
            });
          });

          req.on("error", reject);
          req.on("timeout", () => {
            req.destroy();
            reject(new Error("Request timeout"));
          });

          req.end();
        });
      };

      const response = await fetchBinary();
      
      let parsedResponseBody;
      try {
        parsedResponseBody = JSON.parse(response.data);
      } catch {
        parsedResponseBody = response.data;
      }
      
      logResponse("Binary Retrieve", response.status, response.statusText, response.headers, parsedResponseBody);

      if (response.status !== 200) {
        return res.status(response.status).json({
          error: `CommonWell API Error: ${response.status} ${response.statusText}`,
          details: parsedResponseBody,
        });
      }

      const binaryResource = parsedResponseBody;

      if (binaryResource.resourceType !== "Binary") {
        return res.status(502).json({
          error: "Unexpected response type",
          message: `Expected Binary resource, got ${binaryResource.resourceType}`,
        });
      }

      return res.json({
        success: true,
        contentType: binaryResource.contentType || "application/octet-stream",
        data: binaryResource.data,
        id: binaryResource.id,
      });
    } catch (error: any) {
      console.error("Download document error:", error);
      return res.status(500).json({
        error: "Failed to download document",
        message: error.message,
      });
    }
  });

  const generateJwtSchema = z.object({
    clearIdToken: z.string().min(1),
  });

  app.post("/api/generate-jwt", async (req, res) => {
    try {
      const parseResult = generateJwtSchema.safeParse(req.body);
      
      if (!parseResult.success) {
        return res.status(400).json({ 
          error: "Invalid request",
          details: parseResult.error.errors 
        });
      }

      const { clearIdToken } = parseResult.data;
      
      logEvent("JWT Generation", "Starting JWT generation", {
        clearIdTokenPreview: clearIdToken.substring(0, 100) + "...[truncated]"
      });
      
      const result = generateCommonWellJwt(clearIdToken);

      if ("error" in result) {
        logEvent("JWT Generation", "JWT generation failed", { error: result.error }, "ERROR");
        return res.status(400).json({
          error: result.error,
        });
      }

      logEvent("JWT Generation", "JWT generation successful", {
        jwtPreview: result.jwt.substring(0, 100) + "...[truncated]",
        clearTokenClaims: result.claims
      });

      return res.json({
        success: true,
        jwt: result.jwt,
        claims: result.claims,
        expiresIn: 3600,
      });
    } catch (error: any) {
      console.error("Generate JWT error:", error);
      return res.status(500).json({
        error: "Failed to generate JWT",
        message: error.message,
      });
    }
  });

  const createPatientSchema = z.object({
    environment: z.enum(["integration", "production"]),
    clearIdToken: z.string().min(1),
    cvsPatientId: z.string().min(1),
    cvsAaid: z.string().min(1),
  });

  app.post("/api/create-patient", async (req, res) => {
    try {
      const parseResult = createPatientSchema.safeParse(req.body);
      
      if (!parseResult.success) {
        return res.status(400).json({ 
          error: "Invalid request",
          details: parseResult.error.errors 
        });
      }

      const { environment, clearIdToken, cvsPatientId, cvsAaid } = parseResult.data;

      const jwtResult = generateCommonWellJwt(clearIdToken);
      if ("error" in jwtResult) {
        return res.status(400).json({ error: jwtResult.error });
      }

      const clearClaims = jwtResult.claims;
      const patientObject = buildPatientObject(clearClaims, cvsPatientId, cvsAaid);

      const baseUrl = API_BASE_URLS[environment];
      const patientUrl = `${baseUrl}org/${CW_ORG_OID}/Patient`;
      const body = JSON.stringify(patientObject);

      const patientRequestHeaders = {
        "Authorization": `Bearer ${jwtResult.jwt}`,
        "Accept": "application/fhir+json",
        "Content-Type": "application/fhir+json",
        "Content-Length": Buffer.byteLength(body).toString(),
      };

      logRequest("Patient Create", "POST", patientUrl, patientRequestHeaders, patientObject);

      const httpsAgent = getHttpsAgent();
      
      const createPatient = (): Promise<{ status: number; statusText: string; data: string }> => {
        return new Promise((resolve, reject) => {
          const urlObj = new URL(patientUrl);
          
          const reqOptions: https.RequestOptions = {
            hostname: urlObj.hostname,
            port: urlObj.port || 443,
            path: urlObj.pathname,
            method: "POST",
            headers: patientRequestHeaders,
            agent: httpsAgent,
            timeout: 55000,
          };

          const req = https.request(reqOptions, (response) => {
            const chunks: Buffer[] = [];
            response.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
            response.on("end", () => {
              const buffer = Buffer.concat(chunks);
              resolve({
                status: response.statusCode || 500,
                statusText: response.statusMessage || "Error",
                data: buffer.toString("utf-8"),
              });
            });
          });

          req.on("error", reject);
          req.on("timeout", () => {
            req.destroy();
            reject(new Error("Request timeout"));
          });

          req.write(body);
          req.end();
        });
      };

      const response = await createPatient();

      let responseData;
      try {
        responseData = JSON.parse(response.data);
      } catch {
        responseData = { rawResponse: response.data };
      }

      logResponse("Patient Create", response.status, response.statusText, null, responseData);

      if (response.status >= 200 && response.status < 300) {
        return res.json({
          success: true,
          patient: responseData,
          patientObject: patientObject,
        });
      } else {
        return res.status(response.status).json({
          error: `CommonWell API Error: ${response.status} ${response.statusText}`,
          details: responseData,
          patientObject: patientObject,
        });
      }
    } catch (error: any) {
      console.error("Create patient error:", error);
      return res.status(500).json({
        error: "Failed to create patient",
        message: error.message,
      });
    }
  });

  app.get("/api/query-history", async (req, res) => {
    try {
      const history = await storage.getQueryHistory();
      return res.json(history);
    } catch (error: any) {
      console.error("Get history error:", error);
      return res.status(500).json({
        error: "Failed to get query history",
        message: error.message,
      });
    }
  });

  app.delete("/api/query-history", async (req, res) => {
    try {
      await storage.clearQueryHistory();
      return res.json({ success: true });
    } catch (error: any) {
      console.error("Clear history error:", error);
      return res.status(500).json({
        error: "Failed to clear query history",
        message: error.message,
      });
    }
  });

  return httpServer;
}
