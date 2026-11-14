import { solicitar, aviso } from './api.js';

const porId = (id) => document.getElementById(id);
const sesion = porId('sesion');
const panel = porId('panel');
const lista = porId('reportes');
const estado = porId('estado');
const foto = porId('fotografia');
const actualizar = porId('actualizar');
const salir = porId('salir');
const filtro = porId('filtro-sentimiento');
const analisis = porId('analisis');
const sentimientos = { positive: 'Positivo', neutral: 'Neutral', negative: 'Negativo', mixed: 'Mixto' };
const porcentaje = new Intl.NumberFormat('es-GT', { style: 'percent', maximumFractionDigits: 1 });

function aplicarFiltro() {
  for (const fila of lista.children) {
    fila.hidden = Boolean(filtro.value && filtro.value !== fila.dataset.sentimiento);
    if (fila.hidden && fila.dataset.folio === seleccionado) {
      seleccionado = undefined;
      limpiarDetalle();
    }
  }
  const hayReportes = lista.children.length > 0;
  const hayVisibles = [...lista.children].some(fila => !fila.hidden);
  porId('vacio').hidden = hayVisibles;
  porId('vacio').textContent = hayReportes ? 'No hay reportes con este sentimiento.' : 'Aún no hay reportes.';
}

function mostrarAnalisis(resultado) {
  analisis.replaceChildren();
  analisis.hidden = !resultado;
  if (!resultado) return;
  const { estado, sentimiento, imagen, gpt } = resultado;
  const titulo = document.createElement('h4');
  titulo.textContent = 'Análisis del reporte';
  analisis.append(titulo);

  function fila(etiqueta, valor) {
    const parrafo = document.createElement('p');
    const nombre = document.createElement('strong');
    nombre.textContent = etiqueta + ' · ';
    parrafo.append(nombre, valor);
    analisis.append(parrafo);
  }

  if (estado === 'parcial') fila('Estado', 'Análisis parcial.');
  if (estado === 'error') fila('Estado', 'Servicios de análisis no disponibles.');
  if (sentimiento) {
    fila('Sentimiento', sentimientos[sentimiento.clasificacion] || sentimiento.clasificacion);
    const scores = Object.entries(sentimiento.confianza)
      .map(([nombre, valor]) => sentimientos[nombre] + ' ' + porcentaje.format(valor));
    fila('Confianza', scores.join(' · '));
  }
  if (imagen) {
    if (imagen.descripcion) fila('Descripción de la foto', imagen.descripcion);
    const etiquetas = imagen.etiquetas.map(item => item.nombre + ' (' + porcentaje.format(item.confianza) + ')');
    fila('Etiquetas desde ' + porcentaje.format(imagen.umbral), etiquetas.join(', ') || 'Sin etiquetas que alcancen el umbral.');
  }
  if (gpt) {
    fila('Resumen', gpt.resumen);
    fila('Área sugerida', gpt.area);
    fila('Prioridad sugerida', gpt.prioridad + ' · ' + gpt.justificacion);
  }
}

filtro.addEventListener('change', aplicarFiltro);
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
    mostrarAnalisis(reporte.analisis);
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
    limpiarDetalle();
    let botonSeleccionado;
    for (const reporte of reportes) {
      const li = document.createElement('li');
      li.dataset.sentimiento = reporte.sentimiento || '';
      li.dataset.folio = reporte.folio;
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
      if (reporte.prioridad) {
        const prioridad = document.createElement('small');
        prioridad.textContent = 'Prioridad sugerida · ' + reporte.prioridad;
        boton.append(prioridad);
      }
      boton.addEventListener('click', () => verReporte(reporte.folio, boton));
      li.append(boton);
      lista.append(li);
      if (reporte.folio === seleccionado) botonSeleccionado = boton;
    }
    aplicarFiltro();
    sesion.hidden = true;
    panel.hidden = false;
    aviso(estado);
    if (botonSeleccionado && seleccionado) await verReporte(seleccionado, botonSeleccionado);
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
      body: JSON.stringify({ correo: porId('correo').value, clave: porId('clave').value })
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
    porId('correo').focus();
  } catch (error) {
    manejarError(error);
  } finally {
    salir.disabled = false;
  }
});

await cargarReportes();
