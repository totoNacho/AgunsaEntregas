/* ==========================================================
   AgunsaEntregas - App web REMOTA (por enlace)
   - Técnico: prepara datos y genera un enlace (datos codificados en la URL).
   - Usuario: abre el enlace, ve los datos bloqueados, completa nombre/RUT/firma y envía.
   Sin servidor: los datos del técnico viajan dentro del propio enlace.
   ========================================================== */

const DESTINATARIOS = [
  { nombre: "Soporte TI", email: "soporteti@agunsa.cl" },
  { nombre: "Felipe Delafuente", email: "felipe.delafuente@agunsa.com" },
  { nombre: "Danitza Cifuentes", email: "danitza.cifuentes@agunsa.com" },
  { nombre: "Hugo Quiroz", email: "hugo.quiroz@agunsa.com" },
  { nombre: "Cristobal Pardo", email: "cristobal.pardo@agunsa.com" },
  { nombre: "Unidad Gestión Activos TI", email: "unidadgestionactivosti@agunsa.com" },
];

const AGUNSA_RED = [218, 41, 28];
const AGUNSA_GRAY = [63, 63, 62];
const AGUNSA_BLACK = [45, 41, 38];

let firmaDataUrl = null;
let datosTecnico = null;   // datos recibidos (vista usuario)
let ultimoEnlace = "";     // enlace generado (vista técnico)

// ---- Codificar/decodificar datos en la URL (base64 seguro para UTF-8) ----
function codificar(obj) {
  const json = JSON.stringify(obj);
  return encodeURIComponent(btoa(unescape(encodeURIComponent(json))));
}
function decodificar(str) {
  try {
    const json = decodeURIComponent(escape(atob(decodeURIComponent(str))));
    return JSON.parse(json);
  } catch (e) { return null; }
}

// ---- Toast ----
function toast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(t._h);
  t._h = setTimeout(() => t.classList.remove("show"), 3200);
}

// ====================== ARRANQUE: ¿técnico o usuario? ======================
window.addEventListener("DOMContentLoaded", () => {
  const hash = window.location.hash || "";
  const m = hash.match(/d=([^&]+)/);
  if (m) {
    const datos = decodificar(m[1]);
    if (datos && datos.descripcion) {
      iniciarVistaUsuario(datos);
      return;
    }
  }
  iniciarVistaTecnico();
});

// ====================== VISTA TÉCNICO ======================
function iniciarVistaTecnico() {
  document.getElementById("vistaTecnico").style.display = "block";
  document.getElementById("vistaUsuario").style.display = "none";
  const cont = document.getElementById("dd-body");
  cont.innerHTML = "";
  DESTINATARIOS.forEach((d) => {
    const lbl = document.createElement("label");
    lbl.className = "dest";
    lbl.innerHTML = `
      <input type="checkbox" class="destchk" data-email="${d.email}" data-nombre="${d.nombre}" onchange="updResumen()">
      <span><div class="n">${d.nombre}</div><div class="e">${d.email}</div></span>`;
    cont.appendChild(lbl);
  });
}

function toggleDD() { document.getElementById("dd").classList.toggle("open"); }

function updResumen() {
  const marcados = [...document.querySelectorAll(".destchk:checked")];
  const count = document.getElementById("count");
  count.textContent = marcados.length;
  count.classList.toggle("show", marcados.length > 0);
  const pills = document.getElementById("pills");
  pills.innerHTML = "";
  marcados.forEach((c) => {
    const s = document.createElement("span");
    s.className = "pill";
    s.textContent = c.dataset.nombre;
    pills.appendChild(s);
  });
}

function generarEnlace() {
  const descripcion = document.getElementById("descripcion").value.trim();
  let ticket = document.getElementById("ticket").value.trim();
  if (!ticket || ticket.toLowerCase() === "ticket#") ticket = "";
  const observaciones = document.getElementById("observaciones").value.trim();
  const correos = [];
  document.querySelectorAll(".destchk:checked").forEach(c => correos.push(c.dataset.email));

  if (!descripcion) { toast("Ingresa la descripción de lo entregado."); return; }
  if (correos.length === 0) { toast("Selecciona al menos un destinatario."); return; }

  const payload = { descripcion, ticket, observaciones, correos };
  const base = window.location.href.split("#")[0];
  ultimoEnlace = base + "#d=" + codificar(payload);

  document.getElementById("enlaceBox").textContent = ultimoEnlace;
  document.getElementById("enlaceWrap").classList.add("show");
  document.getElementById("enlaceWrap").scrollIntoView({ behavior: "smooth", block: "center" });
}

async function copiarEnlace() {
  if (!ultimoEnlace) return;
  try {
    await navigator.clipboard.writeText(ultimoEnlace);
    toast("Enlace copiado. Pégalo en el correo o Teams.");
  } catch (e) {
    // Respaldo si el navegador bloquea el portapapeles
    const box = document.getElementById("enlaceBox");
    const rango = document.createRange();
    rango.selectNode(box);
    window.getSelection().removeAllRanges();
    window.getSelection().addRange(rango);
    toast("Selecciona y copia el enlace mostrado.");
  }
}

async function compartirEnlace() {
  if (!ultimoEnlace) return;
  const texto = "Firma la recepción de tu equipo TI en este enlace:";
  if (navigator.share) {
    try {
      await navigator.share({ title: "AgunsaEntregas", text: texto, url: ultimoEnlace });
    } catch (e) { /* el usuario canceló */ }
  } else {
    // En PC sin API de compartir: abre un correo con el enlace.
    const mailto = "mailto:?subject=" + encodeURIComponent("Recepción de equipo TI - AGUNSA") +
      "&body=" + encodeURIComponent(texto + "\n\n" + ultimoEnlace);
    window.location.href = mailto;
  }
}

// ====================== VISTA USUARIO ======================
function iniciarVistaUsuario(datos) {
  datosTecnico = datos;
  document.getElementById("vistaTecnico").style.display = "none";
  document.getElementById("vistaUsuario").style.display = "block";
  const resumen = document.getElementById("resumen");
  resumen.innerHTML = `
    <div class="rt">🔒 Datos enviados por TI</div>
    <div class="r"><b>Equipo:</b> ${escapeHtml(datos.descripcion)}</div>
    ${datos.ticket ? `<div class="r"><b>Ticket:</b> ${escapeHtml(datos.ticket)}</div>` : ""}
    ${datos.observaciones ? `<div class="r"><b>Observaciones:</b> ${escapeHtml(datos.observaciones)}</div>` : ""}
    <div class="lock">No editable — definido por el técnico</div>
  `;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// ====================== FIRMA ======================
const overlay = document.getElementById("overlay");
const canvas = document.getElementById("sigcanvas");
let ctx, drawing = false, hasInk = false;

function abrirFirma() { overlay.classList.add("show"); setTimeout(setupCanvas, 40); }
function cerrarFirma() { overlay.classList.remove("show"); }
function setupCanvas() {
  const ratio = window.devicePixelRatio || 1;
  const w = canvas.clientWidth, h = canvas.clientHeight;
  canvas.width = Math.round(w * ratio);
  canvas.height = Math.round(h * ratio);
  ctx = canvas.getContext("2d");
  ctx.scale(ratio, ratio);
  ctx.lineWidth = 3; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.strokeStyle = "#111";
  hasInk = false;
}
function ptOf(e) {
  const r = canvas.getBoundingClientRect();
  const p = e.touches ? e.touches[0] : e;
  return { x: p.clientX - r.left, y: p.clientY - r.top };
}
function start(e) { drawing = true; hasInk = true; const { x, y } = ptOf(e); ctx.beginPath(); ctx.moveTo(x, y); e.preventDefault(); }
function move(e) { if (!drawing) return; const { x, y } = ptOf(e); ctx.lineTo(x, y); ctx.stroke(); e.preventDefault(); }
function end() { drawing = false; }
canvas.addEventListener("mousedown", start);
canvas.addEventListener("mousemove", move);
window.addEventListener("mouseup", end);
canvas.addEventListener("touchstart", start, { passive: false });
canvas.addEventListener("touchmove", move, { passive: false });
canvas.addEventListener("touchend", end);
window.addEventListener("resize", () => { if (overlay.classList.contains("show")) setupCanvas(); });

function limpiarCanvas() { setupCanvas(); }

function guardarFirma() {
  if (!hasInk) { toast("Primero firma en el recuadro."); return; }
  const out = document.createElement("canvas");
  out.width = canvas.width; out.height = canvas.height;
  const o = out.getContext("2d");
  o.fillStyle = "#fff"; o.fillRect(0, 0, out.width, out.height);
  o.drawImage(canvas, 0, 0);
  firmaDataUrl = out.toDataURL("image/png");
  document.getElementById("sigThumb").src = firmaDataUrl;
  document.getElementById("sigNo").style.display = "none";
  document.getElementById("sigYes").style.display = "block";
  cerrarFirma();
}

// ====================== UTILIDADES ======================
function limpiarArchivo(texto) {
  if (!texto) return "";
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .trim().replace(/\s+/g, "_").replace(/[^A-Za-z0-9_#-]/g, "").slice(0, 60);
}

function cargarImagen(src) {
  return new Promise((resolve) => {
    let listo = false;
    const terminar = (v) => { if (!listo) { listo = true; resolve(v); } };
    const img = new Image();
    img.onload = () => {
      try {
        const c = document.createElement("canvas");
        c.width = img.naturalWidth; c.height = img.naturalHeight;
        c.getContext("2d").drawImage(img, 0, 0);
        terminar({ dataUrl: c.toDataURL("image/png"), w: img.naturalWidth, h: img.naturalHeight });
      } catch (e) { terminar(null); }
    };
    img.onerror = () => terminar(null);
    setTimeout(() => terminar(null), 4000);
    img.src = src;
  });
}

// ====================== PDF ======================
async function generarPdf(datos) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const PW = 612, PH = 792, M = 48;
  let y = 30;

  const logo = await cargarImagen("assets/agunsa_rojo.png");
  if (logo) {
    const lw = 280, lh = lw * logo.h / logo.w;
    doc.addImage(logo.dataUrl, "PNG", (PW - lw) / 2, y, lw, lh);
    y += lh + 14;
  } else {
    doc.setFont("helvetica", "bold"); doc.setFontSize(26); doc.setTextColor(...AGUNSA_RED);
    doc.text("AGUNSA", PW / 2, y + 20, { align: "center" }); y += 40;
  }

  doc.setDrawColor(...AGUNSA_RED); doc.setLineWidth(3);
  doc.line(M, y, PW - M, y); y += 26;

  doc.setFont("helvetica", "bold"); doc.setFontSize(20); doc.setTextColor(...AGUNSA_RED);
  doc.text("COMPROBANTE DE ENTREGA", M, y); y += 14;
  doc.setDrawColor(221, 221, 221); doc.setLineWidth(1); doc.line(M, y, PW - M, y); y += 26;

  function campo(label, valor, multi) {
    doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(...AGUNSA_GRAY);
    doc.text(label, M, y); y += 16;
    doc.setFont("helvetica", "normal"); doc.setFontSize(12); doc.setTextColor(...AGUNSA_BLACK);
    const val = valor && valor.trim() ? valor : "-";
    if (multi) {
      const lines = doc.splitTextToSize(val, PW - M * 2);
      doc.text(lines, M, y); y += lines.length * 15 + 10;
    } else { doc.text(val, M, y); y += 24; }
  }

  campo("RECEPTOR", datos.receptor);
  campo("RUT / IDENTIFICACION", datos.rut);
  if (datos.ticket) campo("N° TICKET", datos.ticket);
  campo("FECHA Y HORA", datos.fechaHora);
  campo("DESCRIPCION DE LO ENTREGADO", datos.descripcion, true);
  campo("OBSERVACIONES", datos.observaciones && datos.observaciones.trim() ? datos.observaciones : "Sin observaciones", true);

  doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(...AGUNSA_GRAY);
  doc.text("FIRMA DE CONFORMIDAD", M, y);
  const firmaTop = y + 12;
  const footerH = 54, footerTop = PH - footerH;
  const nombreY = footerTop - 22, lineaY = nombreY - 16, firmaBottom = lineaY - 10;
  if (firmaDataUrl) {
    const fw = PW - M * 2;
    const maxH = Math.max(40, firmaBottom - firmaTop);
    doc.addImage(firmaDataUrl, "PNG", M, firmaTop, fw, Math.min(maxH, 120), undefined, "FAST");
  }
  doc.setDrawColor(...AGUNSA_BLACK); doc.setLineWidth(1); doc.line(M, lineaY, M + 260, lineaY);
  doc.setFont("helvetica", "normal"); doc.setFontSize(12); doc.setTextColor(...AGUNSA_BLACK);
  doc.text(datos.receptor || "________________", M, nombreY);

  doc.setFillColor(...AGUNSA_RED); doc.rect(0, footerTop, PW, footerH, "F");
  const logoB = await cargarImagen("assets/agunsa_blanco.png");
  if (logoB) {
    const flw = 96, flh = flw * logoB.h / logoB.w;
    doc.addImage(logoB.dataUrl, "PNG", M, footerTop + (footerH - flh) / 2, flw, flh);
  } else {
    doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(14);
    doc.text("AGUNSA", M, footerTop + footerH / 2 + 5);
  }
  doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "normal"); doc.setFontSize(9);
  doc.text("We make it possible", PW - M, footerTop + footerH / 2 - 2, { align: "right" });
  doc.text("Comprobante de entrega - documento generado digitalmente", PW - M, footerTop + footerH / 2 + 11, { align: "right" });

  return doc;
}

// ====================== GENERAR Y ENVIAR (usuario) ======================
async function generarYEnviar() {
  if (!datosTecnico) { toast("No se recibieron los datos del técnico."); return; }

  const receptor = document.getElementById("receptor").value.trim();
  const rut = document.getElementById("rut").value.trim();
  const correoUsuario = document.getElementById("correoUsuario").value.trim();

  if (!receptor) { toast("Ingresa tu nombre."); return; }
  if (!rut) { toast("Ingresa tu RUT."); return; }
  if (!firmaDataUrl) { toast('Falta la firma. Toca "Agregar firma".'); return; }

  let correos = [...(datosTecnico.correos || [])];
  if (correoUsuario && correoUsuario.includes("@")) correos.push(correoUsuario);
  correos = [...new Set(correos.map(e => e.toLowerCase()))];

  const btn = document.getElementById("btnEnviar");
  btn.disabled = true; btn.textContent = "Generando…";

  try {
    const ahora = new Date();
    const fechaHora = ahora.toLocaleDateString("es-CL") + " " + ahora.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
    const datos = {
      receptor, rut,
      ticket: datosTecnico.ticket || "",
      descripcion: datosTecnico.descripcion || "",
      observaciones: datosTecnico.observaciones || "",
      fechaHora,
    };
    const doc = await generarPdf(datos);

    const stamp = ahora.toISOString().replace(/[-:T]/g, "").slice(0, 15);
    const nombreRecep = limpiarArchivo(receptor) || "entrega";
    const ticketArch = limpiarArchivo(datos.ticket);
    const nombre = "comprobante_" + nombreRecep + (ticketArch ? "_" + ticketArch : "") + "_" + stamp + ".pdf";

    doc.save(nombre);

    const asunto = "Comprobante de entrega - " + receptor + (datos.ticket ? " - " + datos.ticket : "");
    const cuerpo =
      "Adjunto el comprobante de entrega (archivo " + nombre + " descargado en este dispositivo).\n\n" +
      "Receptor: " + receptor + "\n" +
      "RUT/ID: " + rut + "\n" +
      (datos.ticket ? "N° Ticket: " + datos.ticket + "\n" : "") +
      "Fecha y hora: " + fechaHora + "\n" +
      "Descripción: " + datos.descripcion + "\n" +
      (datos.observaciones ? "Observaciones: " + datos.observaciones + "\n" : "") +
      "\nIMPORTANTE: adjunta el PDF descargado antes de enviar.";

    const mailto = "mailto:" + correos.join(",") + "?subject=" + encodeURIComponent(asunto) + "&body=" + encodeURIComponent(cuerpo);
    setTimeout(() => { window.location.href = mailto; }, 600);

    document.getElementById("instru").classList.add("show");
    toast("PDF descargado. Abriendo Outlook…");
  } catch (e) {
    toast("Error al generar el PDF: " + e.message);
  } finally {
    btn.disabled = false; btn.textContent = "Generar comprobante";
  }
}
