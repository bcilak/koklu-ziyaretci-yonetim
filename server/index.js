import "dotenv/config";
import crypto from "node:crypto";
import express from "express";
import { rateLimit } from "express-rate-limit";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { pool, query } from "./db.js";

const app = express();
const currentDir = dirname(fileURLToPath(import.meta.url));
const distDir = join(currentDir, "..", "dist");
const port = Number(process.env.PORT || 3000);
const staffPin = process.env.STAFF_PIN;
const sessionSecret = process.env.SESSION_SECRET;
const secureCookies = process.env.COOKIE_SECURE === "true" || process.env.NODE_ENV === "production";
const allowedSettings = new Set(["questions", "consents", "zones"]);
const asyncRoute = (handler) => (request, response, next) =>
    Promise.resolve(handler(request, response, next)).catch(next);
const createRecordId = () => `ZYT-${new Date().getFullYear()}-${crypto.randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase()}`;

if (!staffPin) throw new Error("STAFF_PIN environment variable is required");
if (!sessionSecret || sessionSecret.length < 32) {
    throw new Error("SESSION_SECRET must be at least 32 characters");
}

app.disable("x-powered-by");
app.set("trust proxy", Number(process.env.TRUST_PROXY || 1));
app.use(express.json({ limit: "12mb" }));
app.use((request, response, next) => {
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    response.setHeader("X-Frame-Options", "SAMEORIGIN");
    response.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    response.setHeader(
        "Content-Security-Policy",
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'self'",
    );
    next();
});

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 600,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { error: "Çok fazla istek. Lütfen daha sonra tekrar deneyin." },
});

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { error: "Çok fazla giriş denemesi. Lütfen daha sonra tekrar deneyin." },
});

const recordLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 30,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { error: "Çok fazla kayıt isteği. Lütfen kısa süre sonra tekrar deneyin." },
});

app.use("/api", apiLimiter);
app.use("/api", (_request, response, next) => {
    response.setHeader("Cache-Control", "no-store");
    next();
});

const parseCookies = (header = "") =>
    Object.fromEntries(header.split(";").map((part) => part.trim()).filter(Boolean).map((part) => {
        const separator = part.indexOf("=");
        return [part.slice(0, separator), decodeURIComponent(part.slice(separator + 1))];
    }));

const signSession = (expiresAt) => {
    const payload = String(expiresAt);
    const signature = crypto.createHmac("sha256", sessionSecret).update(payload).digest("base64url");
    return `${payload}.${signature}`;
};

const validSession = (value) => {
    if (!value) return false;
    const [expiresAt, signature] = value.split(".");
    if (!expiresAt || !signature || Number(expiresAt) < Date.now()) return false;
    const expected = crypto.createHmac("sha256", sessionSecret).update(expiresAt).digest("base64url");
    const actualBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);
    return actualBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(actualBuffer, expectedBuffer);
};

const requireStaff = (request, response, next) => {
    const cookies = parseCookies(request.headers.cookie);
    if (!validSession(cookies.koklu_session)) {
        return response.status(401).json({ error: "Yetkisiz işlem" });
    }
    next();
};

const serializeRecord = (row) => ({
    ...row.payload,
    id: row.id,
    name: row.full_name,
    company: row.company,
    cardId: row.card_id || row.payload.cardId || "-",
    status: row.status,
    createdAtIso: row.entry_at?.toISOString(),
    createdAt: row.payload.createdAt,
    time: row.payload.time,
    exitTime: row.payload.exitTime,
    expectedExitTime: row.payload.expectedExitTime,
});

const validText = (value, maxLength) =>
    typeof value === "string" && value.trim().length > 0 && value.length <= maxLength;

const validRecord = (record) =>
    record
    && (!record.id || validText(record.id, 64))
    && validText(record.name, 160)
    && validText(record.company, 160)
    && (!record.cardId || record.cardId === "-" || validText(record.cardId, 80))
    && (!record.createdAtIso || !Number.isNaN(Date.parse(record.createdAtIso)))
    && (!record.expectedExitTime || /^\d{2}:\d{2}$/.test(record.expectedExitTime))
    && Array.isArray(record.selectedZones)
    && record.selectedZones.length <= 50
    && Array.isArray(record.riskFlags)
    && record.riskFlags.length <= 100;

app.get("/api/health", asyncRoute(async (_request, response) => {
    await query("SELECT 1");
    response.json({ ok: true, storage: "postgresql" });
}));

app.post("/api/auth/login", loginLimiter, (request, response) => {
    const supplied = String(request.body?.pin || "");
    const suppliedBuffer = Buffer.from(supplied);
    const pinBuffer = Buffer.from(staffPin);
    const matches = suppliedBuffer.length === pinBuffer.length && crypto.timingSafeEqual(suppliedBuffer, pinBuffer);
    if (!matches) return response.status(401).json({ error: "Hatalı PIN" });

    const expiresAt = Date.now() + 12 * 60 * 60 * 1000;
    const cookieValue = encodeURIComponent(signSession(expiresAt));
    const cookieStr = `koklu_session=${cookieValue}; HttpOnly; SameSite=Lax; Path=/; Max-Age=43200${secureCookies ? "; Secure" : ""}`;
    console.log(`[AUTH] Login OK – setting cookie (length=${cookieValue.length})`);
    response.setHeader("Set-Cookie", cookieStr);
    response.json({ ok: true });
});

app.post("/api/auth/logout", (_request, response) => {
    response.setHeader("Set-Cookie", `koklu_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secureCookies ? "; Secure" : ""}`);
    response.json({ ok: true });
});

app.get("/api/auth/session", (request, response) => {
    const cookies = parseCookies(request.headers.cookie);
    response.json({ authenticated: validSession(cookies.koklu_session) });
});

app.get("/api/bootstrap", asyncRoute(async (_request, response) => {
    const [settingsResult, summaryResult] = await Promise.all([
        query("SELECT setting_key, setting_value FROM app_settings"),
        query(
            `SELECT
                COUNT(*) FILTER (WHERE status = 'İçeride')::int AS inside_count,
                COUNT(*) FILTER (WHERE status = 'İçeride' AND card_id IS NOT NULL)::int AS active_card_count,
                COUNT(*) FILTER (WHERE jsonb_array_length(COALESCE(payload->'riskFlags', '[]'::jsonb)) > 0)::int AS risk_count
             FROM visitor_records`,
        ),
    ]);
    const settings = Object.fromEntries(settingsResult.rows.map((row) => [row.setting_key, row.setting_value]));
    response.json({
        storage: "postgresql",
        settings,
        summary: summaryResult.rows[0],
    });
}));

app.get("/api/records", (req, res, next) => {
    const cookies = parseCookies(req.headers.cookie);
    console.log(`[GET /api/records] cookie present: ${!!cookies.koklu_session}, valid: ${validSession(cookies.koklu_session)}`);
    next();
}, requireStaff, asyncRoute(async (_request, response) => {
    const result = await query("SELECT * FROM visitor_records ORDER BY entry_at DESC LIMIT 5000");
    console.log(`[GET /api/records] Returning ${result.rows.length} records`);
    response.json({ records: result.rows.map(serializeRecord) });
}));

app.post("/api/records", recordLimiter, asyncRoute(async (request, response) => {
    const record = request.body;
    const payloadSize = JSON.stringify(record).length;
    console.log(`[POST /api/records] Payload size: ${(payloadSize / 1024).toFixed(1)}KB, id: ${record?.id}, name: ${record?.name}, company: ${record?.company}`);
    if (!validRecord(record)) {
        const checks = {
            hasRecord: !!record,
            nameValid: record && typeof record.name === "string" && record.name.trim().length > 0 && record.name.length <= 160,
            companyValid: record && typeof record.company === "string" && record.company.trim().length > 0 && record.company.length <= 160,
            zonesArray: record && Array.isArray(record.selectedZones),
            riskArray: record && Array.isArray(record.riskFlags),
        };
        console.error(`[POST /api/records] Validation FAILED:`, JSON.stringify(checks));
        return response.status(400).json({ error: "Geçersiz veya eksik kayıt bilgisi", validation: checks });
    }

    const entryAt = record.createdAtIso ? new Date(record.createdAtIso) : new Date();
    const payload = JSON.stringify(record);
    let recordId = record.id?.trim() || createRecordId();

    for (let attempt = 0; attempt < 3; attempt += 1) {
        const result = await query(
            `INSERT INTO visitor_records
                (id, full_name, company, card_id, status, entry_at, expected_exit, payload)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             ON CONFLICT (id) DO NOTHING
             RETURNING *`,
            [
                recordId,
                record.name,
                record.company,
                record.cardId === "-" ? null : record.cardId,
                record.status || "İçeride",
                entryAt,
                record.expectedExitTime || null,
                payload,
            ],
        );
        if (result.rowCount) {
            console.log(`[POST /api/records] SUCCESS: Record ${recordId} persisted to database`);
            return response.status(201).json({
                ok: true,
                persisted: true,
                record: serializeRecord(result.rows[0]),
            });
        }
        console.warn(`[POST /api/records] ID conflict for ${recordId}, retrying (attempt ${attempt + 1}/3)`);
        recordId = createRecordId();
    }

    return response.status(409).json({ error: "Kayıt kimliği oluşturulamadı. Lütfen tekrar deneyin." });
}));

app.patch("/api/records/:id/exit", requireStaff, asyncRoute(async (request, response) => {
    const exitAt = new Date();
    const exitTime = request.body?.exitTime || exitAt.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
    const existing = await query("SELECT payload FROM visitor_records WHERE id = $1", [request.params.id]);
    if (!existing.rowCount) return response.status(404).json({ error: "Kayıt bulunamadı" });
    const payload = {
        ...existing.rows[0].payload,
        status: "Çıkış Yaptı",
        exitTime,
        identityTaken: false,
        visitorCardGiven: false,
    };
    const result = await query(
        `UPDATE visitor_records
         SET status = 'Çıkış Yaptı',
             exit_at = $2,
             updated_at = NOW(),
             payload = $3
         WHERE id = $1
         RETURNING *`,
        [request.params.id, exitAt, JSON.stringify(payload)],
    );
    response.json({ record: serializeRecord(result.rows[0]) });
}));

app.put("/api/settings/:key", requireStaff, asyncRoute(async (request, response) => {
    const key = request.params.key;
    if (!allowedSettings.has(key)) return response.status(400).json({ error: "Geçersiz ayar" });
    if (!request.body || typeof request.body !== "object") {
        return response.status(400).json({ error: "Geçersiz ayar verisi" });
    }
    await query(
        `INSERT INTO app_settings (setting_key, setting_value, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (setting_key)
         DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = NOW()`,
        [key, JSON.stringify(request.body)],
    );
    response.json({ ok: true });
}));

app.use("/api", (_request, response) => response.status(404).json({ error: "API endpoint bulunamadı" }));
app.use(express.static(distDir, { index: false, maxAge: process.env.NODE_ENV === "production" ? "1h" : 0 }));
app.get("*", (_request, response) => {
    response.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    response.sendFile(join(distDir, "index.html"));
});

app.use((error, _request, response, _next) => {
    console.error(`[ERROR] ${error.message}`, error.stack);
    response.status(500).json({ error: "Sunucu hatası", detail: process.env.NODE_ENV !== "production" ? error.message : undefined });
});

const server = app.listen(port, () => {
    console.log(`Köklü visitor server listening on port ${port}`);
});

const shutdown = async () => {
    server.close(async () => {
        await pool.end();
        process.exit(0);
    });
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
