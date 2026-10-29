import { defineConfig } from "prisma/config";
import { config } from "dotenv";

config({ path: ".env.local" });

// `prisma generate` runs during the Vercel build and does not need a database
// connection. Leave the URL undefined when no environment variable is present
// so generation can succeed; commands that actually connect (migrate, db push,
// introspect) will still fail with Prisma's own missing-datasource error.
const datasourceUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: datasourceUrl,
  },
  migrations: {
    path: "prisma/migrations",
  },
});
