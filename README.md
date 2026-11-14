# Reportes municipales

Aplicación de las Series I, II y III de Desarrollo y Diseño Web. El portal ciudadano registra una queja con fotografía y entrega un folio. El panel municipal consulta en Firestore los registros guardados y muestra la descripción y la fotografía de cada reporte.

## Demostración local en Windows

Requisitos de la demostración: Node.js 22 o superior, npm y Java 21. Abre PowerShell en esta carpeta y ejecuta:

```powershell
npm.cmd ci
npm.cmd run demo
```

La primera ejecución descarga el emulador oficial de Cloud Firestore. Abre [el portal ciudadano](http://127.0.0.1:3000/) y [el panel municipal](http://127.0.0.1:3000/panel.html). La contraseña del emulador es `Municipalidad2026`. Detén la aplicación con Ctrl+C para exportar los registros de demostración a `datos-emulador/`.

## Usar Cloud Firestore en el plan Spark

1. En la consola de Firebase, crea un proyecto con el plan Spark y habilita su base Cloud Firestore predeterminada en modo producción.
2. Obtén una credencial de cuenta de servicio con acceso de lectura y escritura a Firestore. Guarda el JSON fuera de la carpeta del repositorio.
3. Copia `.env.example` como `.env`. Pon el ID del proyecto en `FIREBASE_PROJECT_ID`, la ruta absoluta al JSON en `GOOGLE_APPLICATION_CREDENTIALS` y una contraseña municipal propia de al menos 12 caracteres en `ADMIN_PASSWORD`.
4. Mantén el acceso directo de clientes deshabilitado con las reglas de producción de Firestore. Puedes aplicar las reglas y exenciones de índices incluidas mediante `npx firebase-tools deploy --only firestore --project TU_ID`, después de autenticar la CLI con tu cuenta y verificar que el ID corresponde al proyecto de esta aplicación.
5. Con el emulador detenido, ejecuta `npm.cmd start`. Abre las mismas dos páginas. El servidor se ejecuta en tu computadora y guarda los datos en tu proyecto Firebase.

Consulta la [configuración oficial de Firebase Admin](https://firebase.google.com/docs/admin/setup) y los [límites de Cloud Firestore](https://firebase.google.com/docs/firestore/quotas).

## Probar la entrega

1. En el portal, escribe una descripción como «Hay una fuga de agua frente a la escuela». Adjunta un JPG, PNG o WebP válido de hasta 4 MB y envíalo.
2. Copia el folio que devuelve el portal después de guardar.
3. Entra al panel, selecciona ese folio y verifica la descripción y la fotografía. Recarga el panel y confirma que el reporte sigue en el listado.
4. Prueba a enviar sin foto y a consultar un reporte después de cerrar sesión.

## API

| Método y ruta | Uso |
| --- | --- |
| `POST /api/reportes` | Recibe `descripcion` y `foto` en multipart. Responde 201 con el folio. |
| `POST /api/sesion` | Recibe la clave municipal y abre una sesión con cookie HttpOnly. |
| `DELETE /api/sesion` | Cierra la sesión municipal. |
| `GET /api/reportes` | Lista los reportes del más reciente al más antiguo. Requiere sesión. |
| `GET /api/reportes/:id` | Entrega la descripción, la fecha y la ruta de la fotografía. Requiere sesión. |
| `GET /api/reportes/:id/foto` | Devuelve el JPEG guardado. Requiere sesión. |

Firestore guarda un documento por reporte en la colección `reportes`, con ID como folio, descripción original, fecha del servidor y fotografía JPEG de hasta 300 KiB. El servidor ajusta el tamaño y la orientación de la imagen antes del guardado. El listado consulta un conjunto de campos que excluye los bytes de la imagen. Las sesiones municipales duran dos horas y sus identificadores se guardan como hashes en Firestore.

## Análisis de los reportes

Configura `COURSE_AI_JSON` en el entorno del servidor para activar los servicios del curso. El objeto contiene `sentimiento`, `vision` y `gpt`, cada uno con `endpoint` y `key`. GPT requiere además `deployment`. Conserva esta variable en la configuración privada del alojamiento.

El servidor guarda el reporte antes de analizarlo. El panel filtra por sentimiento, muestra las puntuaciones de confianza y presenta las etiquetas de imagen con una confianza de al menos 75 %. GPT usa esos resultados y la descripción original para sugerir resumen, área y prioridad. El panel indica si algún análisis quedó incompleto.

## Publicar en Render

En [Render](https://dashboard.render.com/), crea un Blueprint desde la rama `main` de este repositorio. El archivo `render.yaml` configura un servicio web gratuito que sirve el portal, el panel y la API bajo el mismo dominio.

Durante la creación, configura `FIREBASE_PROJECT_ID`, `FIREBASE_SERVICE_ACCOUNT_JSON`, `ADMIN_PASSWORD` y `COURSE_AI_JSON` en Render. `FIREBASE_SERVICE_ACCOUNT_JSON` contiene el JSON de la cuenta de servicio de Firestore. Comparte la contraseña municipal por separado con quien necesite revisar el panel.

Cuando el servicio esté activo, abre el dominio asignado para usar el portal. El panel está en `/panel.html`. Registra una queja de prueba con foto y abre el folio en el panel para verificar la persistencia y los análisis.
