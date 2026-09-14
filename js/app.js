const CLAVE_ADMIN = "oasis2026";
const STORAGE_KEY = "oasis_licencias_v1";
const AUTH_KEY = "oasis_admin_ok";
const API = "/.netlify/functions/licencias";

const $ = (id) => document.getElementById(id);

function normalizaFolio(folio) {
  return String(folio || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}

function normalizaNombre(nombre) {
  return String(nombre || "").trim().replace(/\s+/g, " ");
}

function formatoFecha(iso) {
  if (!iso) return "—";
  const raw = String(iso);
  const [y, m, d] = raw.split("T")[0].split("-");
  if (!d) return iso;
  return `${d}/${m}/${y}`;
}

function formatoFechaFicha(iso) {
  if (!iso) return "";
  const raw = String(iso).trim();
  if (raw.includes("T")) return raw;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return `${raw}T00:00:00`;
  return raw;
}

function leerLocal() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function guardarLocal(lista) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(lista));
}

async function leerArchivo() {
  try {
    const res = await fetch("data/licencias.json", { cache: "no-store" });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

async function leerServidor() {
  try {
    const res = await fetch(API, { cache: "no-store" });
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return null;
  }
}

async function guardarServidor(lista) {
  try {
    const res = await fetch(API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-key": CLAVE_ADMIN,
      },
      body: JSON.stringify(lista),
    });
    return res.ok;
  } catch {
    return false;
  }
}

function parseLinea(linea) {
  const parts = linea.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length < 4) return null;
  const modulo = parts.slice(3).join(", ");
  const fecha = parts[2];
  const folio = normalizaFolio(parts[1]);
  const nombre = normalizaNombre(parts[0]);
  if (!nombre || !folio || !fecha) return null;
  return { nombre, folio, fechaExpedicion: fecha, modulo };
}

function mergeRegistros(actual, nuevos) {
  const mapa = new Map();
  for (const item of actual || []) {
    if (item && item.folio) mapa.set(normalizaFolio(item.folio), item);
  }
  for (const item of nuevos || []) {
    if (item && item.folio) mapa.set(normalizaFolio(item.folio), item);
  }
  return Array.from(mapa.values()).sort((a, b) =>
    String(a.nombre || "").localeCompare(String(b.nombre || ""), "es")
  );
}

function buscar(lista, folio) {
  const key = normalizaFolio(folio);
  return (lista || []).find((item) => normalizaFolio(item.folio) === key) || null;
}

async function cargarTodo() {
  const remoto = await leerServidor();
  const archivo = await leerArchivo();
  const local = leerLocal();
  if (remoto && remoto.length) return { lista: mergeRegistros(archivo, mergeRegistros(local, remoto)), remoto: true };
  if (remoto && !remoto.length) return { lista: mergeRegistros(archivo, local), remoto: true };
  return { lista: mergeRegistros(archivo, local), remoto: false };
}

async function persistir(lista, aviso) {
  guardarLocal(lista);
  const ok = await guardarServidor(lista);
  if (aviso) {
    aviso.textContent = ok
      ? "Guardado. Ya se puede consultar en la página pública."
      : "Falta conectar GitHub en Netlify. Sin eso no se ve en otros celulares. Sigue COMO-PUBLICAR.txt";
    aviso.className = ok ? "note ok" : "note";
  }
  return ok;
}

async function initConsulta() {
  const form = $("consulta-form");
  if (!form) return;
  const cajaBuscar = $("caja-buscar");
  const cajaDatos = $("caja-datos");
  const error = $("resultado");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (error) {
      error.hidden = true;
      error.textContent = "Buscando…";
    }
    const { lista } = await cargarTodo();
    const registro = buscar(lista, $("folio").value);
    if (!registro) {
      if (error) {
        error.hidden = false;
        error.textContent = "Folio no encontrado";
      }
      return;
    }
    $("out-nombre").textContent = String(registro.nombre || "").toUpperCase();
    $("out-folio").textContent = registro.folio;
    $("out-fecha").textContent = formatoFechaFicha(registro.fechaExpedicion);
    $("out-modulo").textContent = String(registro.modulo || "").toUpperCase();
    if (cajaBuscar) cajaBuscar.hidden = true;
    if (cajaDatos) cajaDatos.hidden = false;
    window.scrollTo(0, 0);
  });
}

async function initAdmin() {
  const gate = $("gate");
  const panel = $("panel");
  if (!gate || !panel) return;

  const aviso = $("aviso-guardado");
  const { lista: inicial, remoto } = await cargarTodo();
  let lista = inicial;
  guardarLocal(lista);

  function renderTabla() {
    $("total").textContent = `${lista.length} registro${lista.length === 1 ? "" : "s"}`;
    $("tabla").innerHTML = lista
      .map(
        (item, i) => `
        <tr>
          <td>${item.nombre}</td>
          <td>${item.folio}</td>
          <td>${formatoFecha(item.fechaExpedicion)}</td>
          <td>${item.modulo}</td>
          <td><button class="danger" data-i="${i}" type="button">Quitar</button></td>
        </tr>`
      )
      .join("");
  }

  const abrir = () => {
    gate.hidden = true;
    panel.hidden = false;
    sessionStorage.setItem(AUTH_KEY, "1");
    renderTabla();
    if (aviso) {
      aviso.textContent = remoto
        ? "Los registros se guardan en la nube y se pueden consultar desde cualquier celular."
        : "Falta conectar el repo de GitHub en Netlify. Abre COMO-PUBLICAR.txt. Mientras tanto solo se guarda en este navegador.";
    }
  };

  if (sessionStorage.getItem(AUTH_KEY) === "1") abrir();

  $("login-form").addEventListener("submit", (e) => {
    e.preventDefault();
    if ($("clave").value === CLAVE_ADMIN) abrir();
    else alert("Clave incorrecta");
  });

  $("alta-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const nuevo = {
      nombre: normalizaNombre($("nombre").value),
      folio: normalizaFolio($("folio-alta").value),
      fechaExpedicion: $("fecha").value,
      modulo: normalizaNombre($("modulo").value),
    };
    lista = mergeRegistros(lista, [nuevo]);
    await persistir(lista, aviso);
    e.target.reset();
    renderTabla();
  });

  $("tabla").addEventListener("click", async (e) => {
    const btn = e.target.closest("button[data-i]");
    if (!btn) return;
    lista.splice(Number(btn.dataset.i), 1);
    await persistir(lista, aviso);
    renderTabla();
  });

  $("importar-texto").addEventListener("click", async () => {
    const lineas = $("bulk").value.split(/\n+/);
    const nuevos = lineas.map(parseLinea).filter(Boolean);
    if (!nuevos.length) {
      alert("No se pudo leer ningún registro. Usa: Nombre, Folio, YYYY-MM-DD, Módulo");
      return;
    }
    lista = mergeRegistros(lista, nuevos);
    await persistir(lista, aviso);
    renderTabla();
  });

  $("archivo").addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    let nuevos = [];
    if (file.name.endsWith(".json")) {
      try {
        const parsed = JSON.parse(text);
        nuevos = (Array.isArray(parsed) ? parsed : []).map((item) => ({
          nombre: normalizaNombre(item.nombre),
          folio: normalizaFolio(item.folio),
          fechaExpedicion: item.fechaExpedicion || item.fecha || "",
          modulo: normalizaNombre(item.modulo),
        }));
      } catch {
        alert("JSON inválido");
        return;
      }
    } else {
      nuevos = text.split(/\n+/).map(parseLinea).filter(Boolean);
    }
    lista = mergeRegistros(lista, nuevos);
    await persistir(lista, aviso);
    renderTabla();
    e.target.value = "";
  });

  $("exportar").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(lista, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "licencias.json";
    a.click();
  });

  $("exportar-csv").addEventListener("click", () => {
    const csv = ["Nombre,Folio,Fecha expedición,Módulo"]
      .concat(lista.map((i) => `${i.nombre},${i.folio},${i.fechaExpedicion},${i.modulo}`))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "licencias.csv";
    a.click();
  });
}

initConsulta();
initAdmin();
