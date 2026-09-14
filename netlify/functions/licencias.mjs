import { getStore } from "@netlify/blobs";

const CLAVE = "oasis2026";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

export default async (req) => {
  const store = getStore("registros");
  let lista = [];
  try {
    const raw = await store.get("licencias");
    lista = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(lista)) lista = [];
  } catch {
    lista = [];
  }

  if (req.method === "GET") return json(lista);

  if (req.method === "POST" || req.method === "PUT") {
    const clave = req.headers.get("x-admin-key") || "";
    if (clave !== CLAVE) return json({ error: "no autorizado" }, 401);
    let body = [];
    try {
      body = await req.json();
    } catch {
      return json({ error: "json inválido" }, 400);
    }
    const data = Array.isArray(body) ? body : body.lista;
    if (!Array.isArray(data)) return json({ error: "formato" }, 400);
    await store.setJSON("licencias", data);
    return json({ ok: true, total: data.length });
  }

  return json({ error: "método no permitido" }, 405);
};
