import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Session pooler (port 5432) — used by Prisma CLI for db push / migrations
    url: process.env["DIRECT_URL"],
  },
});
