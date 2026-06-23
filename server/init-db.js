import "dotenv/config";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { pool } from "./db.js";

const currentDir = dirname(fileURLToPath(import.meta.url));
const schema = await fs.readFile(join(currentDir, "schema.sql"), "utf8");

try {
    await pool.query(schema);
    console.log("PostgreSQL schema is ready.");
} finally {
    await pool.end();
}
