import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { newDb } from "pg-mem";

const database = newDb();
const schema = await fs.readFile(new URL("../server/schema.sql", import.meta.url), "utf8");
database.public.none(schema);

const adapter = database.adapters.createPg();
const pool = new adapter.Pool();

const sample = {
    id: "ZYT-2026-TEST01",
    name: "Barış Çılak",
    company: "Köklü Zeytincilik",
    cardId: "VK-001",
    status: "İçeride",
    time: "10:30",
    createdAtIso: "2026-06-23T07:30:00.000Z",
    expectedExitTime: "17:30",
};

await pool.query(
    `INSERT INTO visitor_records
        (id, full_name, company, card_id, status, entry_at, expected_exit, payload)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [sample.id, sample.name, sample.company, sample.cardId, sample.status, sample.createdAtIso, sample.expectedExitTime, JSON.stringify(sample)],
);

await pool.query(
    `INSERT INTO app_settings (setting_key, setting_value)
     VALUES ($1, $2)`,
    ["questions", JSON.stringify([{ key: "health", textTr: "Sağlık sorusu" }])],
);

const records = await pool.query("SELECT * FROM visitor_records WHERE id = $1", [sample.id]);
const settings = await pool.query("SELECT setting_value FROM app_settings WHERE setting_key = $1", ["questions"]);

assert.equal(records.rowCount, 1);
assert.equal(records.rows[0].full_name, "Barış Çılak");
assert.equal(records.rows[0].payload.company, "Köklü Zeytincilik");
assert.equal(settings.rows[0].setting_value[0].textTr, "Sağlık sorusu");

const stored = await pool.query("SELECT payload FROM visitor_records WHERE id = $1", [sample.id]);
const exitedPayload = { ...stored.rows[0].payload, status: "Çıkış Yaptı", exitTime: "16:45" };
await pool.query(
    `UPDATE visitor_records
     SET status = 'Çıkış Yaptı',
         payload = $2
     WHERE id = $1`,
    [sample.id, JSON.stringify(exitedPayload)],
);

const exited = await pool.query("SELECT status, payload FROM visitor_records WHERE id = $1", [sample.id]);
assert.equal(exited.rows[0].status, "Çıkış Yaptı");
assert.equal(exited.rows[0].payload.exitTime, "16:45");

await pool.end();
console.log("Database schema and core queries passed.");
