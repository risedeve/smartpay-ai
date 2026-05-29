import { defineConfig } from "drizzle-kit";

export default defineConfig({
  // Use a relative string path instead of path.join
  schema: "./src/schema/index.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});