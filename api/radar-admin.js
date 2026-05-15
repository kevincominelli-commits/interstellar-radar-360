const { createRadarStore } = require("./_radar-store");

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Interstellar-Admin-Key");
  res.end(JSON.stringify(body));
}

module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") return json(res, 200, { ok: true });
  if (req.method !== "GET") return json(res, 405, { error: "Method not allowed" });

  const store = createRadarStore();
  if (!store.enabled) {
    return json(res, 200, {
      db_enabled: false,
      message: "Supabase non configurato. Aggiungi SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY su Vercel."
    });
  }

  const adminKey = process.env.RADAR_ADMIN_KEY || "";
  const provided = req.headers["x-interstellar-admin-key"] || new URL(req.url, "https://interstellar.local").searchParams.get("adminKey") || "";
  if (adminKey && provided !== adminKey) {
    return json(res, 401, { error: "Admin key non valida" });
  }

  try {
    const snapshot = await store.adminSnapshot();
    return json(res, 200, {
      db_enabled: true,
      ...snapshot
    });
  } catch (error) {
    return json(res, 500, {
      db_enabled: true,
      error: error.message || "Admin Radar non disponibile"
    });
  }
};
