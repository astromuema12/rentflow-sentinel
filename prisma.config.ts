import { defineConfig } from "prisma/config";
import { config } from "dotenv";

config({ path: ".env.local" });

const datasourceUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;

if (!datasourceUrl) {
  throw new Error(
    "Set DIRECT_URL or DATABASE_URL before running Prisma commands.",
  );
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: datasourceUrl,
  },
  migrations: {
    path: "prisma/migrations",
  },
});
