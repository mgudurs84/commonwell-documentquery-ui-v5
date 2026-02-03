import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const queryHistory = pgTable("query_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  queryUrl: text("query_url").notNull(),
  environment: text("environment").notNull(),
  patientIdentifier: text("patient_identifier").notNull(),
  parameters: jsonb("parameters").notNull(),
  responseTime: text("response_time"),
  documentCount: text("document_count"),
  status: text("status").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertQueryHistorySchema = createInsertSchema(queryHistory).omit({
  id: true,
  createdAt: true,
});

export type InsertQueryHistory = z.infer<typeof insertQueryHistorySchema>;
export type QueryHistory = typeof queryHistory.$inferSelect;

export type Environment = "integration" | "production";

export type DocumentStatus = "current" | "superseded" | "entered-in-error" | "all";

export interface QueryParameters {
  environment: Environment;
  jwtToken: string;
  clearIdToken?: string;
  aaid: string;
  patientId: string;
  status: DocumentStatus;
  dateEnabled: boolean;
  dateFrom?: string;
  dateTo?: string;
  periodEnabled: boolean;
  periodFrom?: string;
  periodTo?: string;
  documentTypeEnabled: boolean;
  documentTypes: string[];
  customDocumentType?: string;
  contentTypeEnabled: boolean;
  contentTypes: string[];
  authorEnabled: boolean;
  authorGiven?: string;
  authorFamily?: string;
}

export interface ClearIdTokenClaims {
  iss?: string;
  sub?: string;
  aud?: string | string[];
  exp?: number;
  iat?: number;
  jti?: string;
  given_name?: string;
  family_name?: string;
  middle_name?: string;
  birthdate?: string;
  gender?: string;
  phone_number?: string;
  phone_number_verified?: boolean;
  address?: {
    street_address?: string;
    locality?: string;
    region?: string;
    postal_code?: string;
    country?: string;
  };
  historical_address?: Array<{
    street_address?: string;
    locality?: string;
    region?: string;
    postal_code?: string;
    country?: string;
  }>;
}

export interface GenerateJwtResponse {
  success: boolean;
  jwt?: string;
  claims?: ClearIdTokenClaims;
  expiresIn?: number;
  error?: string;
}

export interface CreatePatientRequest {
  environment: Environment;
  clearIdToken: string;
  cvsPatientId: string;
  cvsAaid: string;
}

export interface CreatePatientResponse {
  success: boolean;
  patient?: any;
  patientObject?: any;
  error?: string;
  details?: any;
}

export interface JwtPayload {
  exp?: number;
  sub?: string;
  iss?: string;
  purposeOfUse?: string;
  organizationId?: string;
}

export const LOINC_CODES = [
  { code: "34133-9", name: "Summarization of Episode Note (CCD)", description: "Continuity of Care Document" },
  { code: "18842-5", name: "Discharge Summary", description: "Hospital discharge documentation" },
  { code: "11506-3", name: "Progress Note", description: "Clinical progress/visit notes" },
  { code: "34117-2", name: "History and Physical", description: "H&P documentation" },
  { code: "11488-4", name: "Consultation Note", description: "Specialist consultation reports" },
  { code: "28570-0", name: "Procedure Note", description: "Surgical/procedural documentation" },
  { code: "57133-1", name: "Referral Note", description: "Referral documentation" },
  { code: "57016-8", name: "Privacy Policy Acknowledgement", description: "Consent/privacy documents" },
];

export const MIME_TYPES = [
  { type: "application/xml", name: "C-CDA XML Documents", description: "Most common clinical format" },
  { type: "text/xml", name: "XML (alternative)", description: "Alternative XML content type" },
  { type: "application/pdf", name: "PDF Documents", description: "Scanned records, reports" },
  { type: "text/plain", name: "Plain Text", description: "Plain text documents" },
  { type: "application/dicom", name: "DICOM Images", description: "Imaging studies" },
  { type: "image/jpeg", name: "JPEG Images", description: "JPEG image files" },
  { type: "image/png", name: "PNG Images", description: "PNG image files" },
  { type: "image/tiff", name: "TIFF Images", description: "Often scanned documents" },
  { type: "application/x-hl7", name: "HL7 v2 Messages", description: "HL7 v2 format" },
];

export const BASE_URLS = {
  integration: "https://api.integration.commonwellalliance.lkopera.com/v2/R4/DocumentReference",
  production: "https://api.commonwellalliance.lkopera.com/v2/R4/DocumentReference",
};

export const BINARY_BASE_URLS = {
  integration: "https://api.integration.commonwellalliance.lkopera.com/v2/R4/Binary",
  production: "https://api.commonwellalliance.lkopera.com/v2/R4/Binary",
};

export const API_BASE_URLS = {
  integration: "https://api.integration.commonwellalliance.lkopera.com/v2/",
  production: "https://api.commonwellalliance.lkopera.com/v2/",
};

export interface BinaryResource {
  resourceType: "Binary";
  id: string;
  contentType: string;
  data: string;
}

export interface DownloadRequest {
  environment: Environment;
  jwtToken: string;
  documentUrl: string;
}

export interface DownloadResponse {
  success: boolean;
  contentType: string;
  data: string;
  filename?: string;
  error?: string;
}

export interface DocumentContent {
  attachment: {
    contentType?: string;
    url?: string;
    title?: string;
    size?: number;
  };
  format?: {
    system?: string;
    code?: string;
    display?: string;
  };
}

export interface DocumentReferenceResource {
  resourceType: "DocumentReference";
  id?: string;
  masterIdentifier?: {
    system?: string;
    value?: string;
  };
  status?: string;
  type?: {
    coding?: Array<{
      system?: string;
      code?: string;
      display?: string;
    }>;
    text?: string;
  };
  category?: Array<{
    coding?: Array<{
      system?: string;
      code?: string;
      display?: string;
    }>;
  }>;
  subject?: {
    reference?: string;
  };
  date?: string;
  author?: Array<{
    reference?: string;
    display?: string;
  }>;
  custodian?: {
    reference?: string;
    display?: string;
  };
  content?: DocumentContent[];
  context?: {
    period?: {
      start?: string;
      end?: string;
    };
    sourcePatientInfo?: {
      identifier?: {
        value?: string;
      };
    };
  };
}

export interface FhirBundleEntry {
  fullUrl?: string;
  resource?: DocumentReferenceResource;
}

export interface FhirBundle {
  resourceType: "Bundle";
  type: string;
  total?: number;
  entry?: FhirBundleEntry[];
}
