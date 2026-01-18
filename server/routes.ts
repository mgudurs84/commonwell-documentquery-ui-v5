import type { Express } from "express";
import { createServer, type Server } from "http";
import https from "https";
import fs from "fs";
import path from "path";
import { storage } from "./storage";
import { BASE_URLS, type QueryParameters, insertQueryHistorySchema } from "@shared/schema";
import { z } from "zod";

function getHttpsAgent(): https.Agent | undefined {
  const certPath = process.env.CLIENT_CERT_PATH;
  const keyPath = process.env.CLIENT_KEY_PATH;
  const caPath = process.env.CA_CERT_PATH;
  const skipTlsVerify = process.env.SKIP_TLS_VERIFY === "true";

  if (!certPath || !keyPath) {
    console.warn("Client certificate not configured. Set CLIENT_CERT_PATH and CLIENT_KEY_PATH environment variables for mTLS.");
    return undefined;
  }

  try {
    const agentOptions: https.AgentOptions = {
      cert: fs.readFileSync(path.resolve(certPath)),
      key: fs.readFileSync(path.resolve(keyPath)),
      rejectUnauthorized: !skipTlsVerify,
    };

    if (caPath) {
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
