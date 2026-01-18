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
