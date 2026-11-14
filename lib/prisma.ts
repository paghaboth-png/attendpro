import { PrismaClient } from "@prisma/client";

function getCleanDatabaseUrl(): string {
  let url =
    process.env.DATABASE_URL ||
    process.env.DATABASE_URL_POOLED ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    "postgresql://neondb_owner:npg_Qc5xUTm4FefA@ep-small-mouse-a1fywhr9.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";

  // Clean quotes, spaces, and prefixes
  url = url.trim();
  if (url.startsWith("DATABASE_URL=")) {
    url = url.substring("DATABASE_URL=".length).trim();
  }
  url = url.replace(/^["']|["']$/g, "").trim();

  // If missing postgresql protocol
  if (!url.startsWith("postgresql://") && !url.startsWith("postgres://")) {
    url = "postgresql://neondb_owner:npg_Qc5xUTm4FefA@ep-small-mouse-a1fywhr9.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";
  }

  // Ensure SSL for cloud databases
  if (!url.includes("sslmode=")) {
    url += (url.includes("?") ? "&" : "?") + "sslmode=require";
  }

  return url;
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: getCleanDatabaseUrl(),
      },
    },
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
