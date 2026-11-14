export async function solicitar(ruta, opciones) {
  let respuesta;
  try {
    respuesta = await fetch(ruta, opciones);
  } catch {
    throw new Error('Revisa tu conexión e inténtalo nuevamente.');
  }
  const datos = respuesta.headers.get('content-type')?.includes('application/json')
    ? await respuesta.json() : null;
  if (!respuesta.ok) {
    const error = new Error(datos?.error || 'No se pudo completar la solicitud.');
    error.status = respuesta.status;
    throw error;
  }
  return datos;
}

export function aviso(elemento, mensaje = '', error = false) {
  elemento.textContent = mensaje;
  elemento.dataset.error = error;
  elemento.hidden = !mensaje;
}
