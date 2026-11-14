import { solicitar, aviso } from './api.js';

const porId = (id) => document.getElementById(id);
const sesion = porId('sesion');
const panel = porId('panel');
const lista = porId('reportes');
const estado = porId('estado');
const foto = porId('fotografia');
const actualizar = porId('actualizar');
const salir = porId('salir');
const formatoFecha = new Intl.DateTimeFormat('es-GT', {
  dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Guatemala'
});
let seleccionado;
let consultaDetalle = 0;

function limpiarDetalle(mensaje = 'Selecciona un reporte para ver los detalles.') {
  consultaDetalle++;
  porId('seleccion').textContent = mensaje;
  porId('seleccion').hidden = false;
  porId('datos').hidden = true;
  foto.removeAttribute('src');
  foto.hidden = true;
  porId('error-foto').hidden = true;
}

function pedirInicio() {
  panel.hidden = true;
  sesion.hidden = false;
  lista.replaceChildren();
  seleccionado = undefined;
  limpiarDetalle();
}

function manejarError(error) {
  if (error.status === 401) pedirInicio();
  aviso(estado, error.message, true);
}

async function verReporte(folio, boton) {
  seleccionado = folio;
  for (const item of lista.querySelectorAll('button')) {
    item.setAttribute('aria-pressed', String(item === boton));
  }
  limpiarDetalle('Cargando reporte…');
  const consulta = consultaDetalle;
  aviso(estado);
  try {
    const reporte = await solicitar('/api/reportes/' + encodeURIComponent(folio));
    if (consulta !== consultaDetalle) return;
    porId('folio').textContent = 'Folio ' + reporte.folio;
    porId('fecha').dateTime = reporte.fecha;
    porId('fecha').textContent = formatoFecha.format(new Date(reporte.fecha));
    porId('descripcion').textContent = reporte.descripcion;
    porId('seleccion').hidden = true;
    porId('datos').hidden = false;
    foto.src = reporte.fotoUrl;
  } catch (error) {
    if (consulta !== consultaDetalle) return;
    limpiarDetalle('Selecciona un reporte para volver a intentar.');
    manejarError(error);
  }
}

foto.addEventListener('load', () => { foto.hidden = false; });
foto.addEventListener('error', () => {
  if (!foto.hasAttribute('src')) return;
  foto.hidden = true;
  porId('error-foto').textContent = 'No se pudo cargar la fotografía.';
  porId('error-foto').hidden = false;
});

async function cargarReportes() {
  aviso(estado, 'Cargando reportes…');
  actualizar.disabled = true;
  salir.disabled = true;
  try {
    const { reportes } = await solicitar('/api/reportes');
    lista.replaceChildren();
    porId('vacio').hidden = reportes.length > 0;
    limpiarDetalle();
    let botonSeleccionado;
    for (const reporte of reportes) {
      const li = document.createElement('li');
      const boton = document.createElement('button');
      const folio = document.createElement('strong');
      const descripcion = document.createElement('span');
      const fecha = document.createElement('time');
      boton.type = 'button';
      boton.className = 'report';
      boton.setAttribute('aria-pressed', 'false');
      folio.textContent = reporte.folio;
      descripcion.textContent = reporte.descripcion;
      fecha.dateTime = reporte.fecha;
      fecha.textContent = formatoFecha.format(new Date(reporte.fecha));
      boton.append(folio, descripcion, fecha);
      boton.addEventListener('click', () => verReporte(reporte.folio, boton));
      li.append(boton);
      lista.append(li);
      if (reporte.folio === seleccionado) botonSeleccionado = boton;
    }
    sesion.hidden = true;
    panel.hidden = false;
    aviso(estado);
    if (botonSeleccionado) await verReporte(seleccionado, botonSeleccionado);
  } catch (error) {
    if (error.status === 401 && panel.hidden) {
      pedirInicio();
      aviso(estado);
    } else {
      manejarError(error);
    }
  } finally {
    actualizar.disabled = false;
    salir.disabled = false;
  }
}

sesion.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  const boton = sesion.querySelector('button');
  boton.disabled = true;
  try {
    await solicitar('/api/sesion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clave: porId('clave').value })
    });
    sesion.reset();
    await cargarReportes();
  } catch (error) {
    manejarError(error);
  } finally {
    boton.disabled = false;
  }
});

actualizar.addEventListener('click', cargarReportes);
salir.addEventListener('click', async () => {
  salir.disabled = true;
  try {
    await solicitar('/api/sesion', { method: 'DELETE' });
    pedirInicio();
    aviso(estado, 'Sesión cerrada.');
    porId('clave').focus();
  } catch (error) {
    manejarError(error);
  } finally {
    salir.disabled = false;
  }
});

await cargarReportes();
