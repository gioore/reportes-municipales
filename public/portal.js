import { solicitar, aviso } from './api.js';

const formulario = document.querySelector('#reporte');
const entradaFoto = document.querySelector('#foto');
const previa = document.querySelector('#previa');
const resultado = document.querySelector('#resultado');
const enviar = formulario.querySelector('button');
let urlPrevia;

function limpiarVistaPrevia() {
  if (urlPrevia) URL.revokeObjectURL(urlPrevia);
  previa.removeAttribute('src');
  previa.hidden = true;
  urlPrevia = undefined;
}

entradaFoto.addEventListener('change', () => {
  limpiarVistaPrevia();
  aviso(resultado);
  const foto = entradaFoto.files[0];
  if (!foto) return;
  if (foto.size > 8 * 1024 * 1024) {
    aviso(resultado, 'Elige una foto de hasta 8 MB.', true);
    entradaFoto.value = '';
    return;
  }
  urlPrevia = URL.createObjectURL(foto);
  previa.src = urlPrevia;
  previa.hidden = false;
});

previa.addEventListener('error', limpiarVistaPrevia);

formulario.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  enviar.disabled = true;
  enviar.textContent = 'Enviando…';
  aviso(resultado);
  try {
    const { folio } = await solicitar('/api/reportes', {
      method: 'POST',
      body: new FormData(formulario)
    });
    formulario.reset();
    limpiarVistaPrevia();
    aviso(resultado, 'Reporte registrado. Tu folio es ' + folio + '.');
  } catch (error) {
    aviso(resultado, error.message, true);
  } finally {
    enviar.disabled = false;
    enviar.textContent = 'Enviar reporte';
  }
});
