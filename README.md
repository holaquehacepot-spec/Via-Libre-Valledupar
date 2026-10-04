# Vía Libre Valledupar · Web estática

Prueba de concepto: reportes con foto y ubicación, mapa, filtros, seguimiento, revisión y recompensas ficticias. No envía información a autoridades ni hace pagos.

**La web lista para publicar es `index.html`.** Contiene su JavaScript y sus estilos: no necesita servidor, base de datos, claves, instalación ni compilación para subirse a GitHub Pages. Se puede abrir directamente en el navegador para una prueba rápida.

## Subirla a GitHub Pages: opción sencilla

1. Crea un repositorio en GitHub (público si usas GitHub Free).
2. Sube `index.html` a la raíz del repositorio. También puedes subir todos los archivos de esta carpeta.
3. En **Settings → Pages**, selecciona **Deploy from a branch**, la rama **main** y la carpeta **/ (root)**. Guarda.
4. GitHub mostrará el enlace cuando termine de publicarla. Normalmente será `https://TU-USUARIO.github.io/TU-REPOSITORIO/`.

No subas el ZIP como único archivo: descomprímelo y sube su contenido. La web funciona tanto en la raíz de un dominio como en la ruta de un repositorio, sin cambiar direcciones.

## Publicación con GitHub Actions (opcional)

Incluye `.github/workflows/pages.yml`. Si subes también esa carpeta, puedes elegir **GitHub Actions** como Source en **Settings → Pages** y ejecutar el flujo desde **Actions**. Publica el `index.html` ya generado, sin instalar dependencias. Si la rama se llama distinto de `main`, ajusta el nombre en el flujo.

Referencias oficiales: [fuente de publicación de Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site) y [flujos para Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

## Cómo se guardan los reportes

- Los reportes, sus fotografías y el seguimiento se guardan en **IndexedDB, dentro del navegador**. Se conservan al recargar la página.
- Cada navegador y dispositivo tiene sus propios datos. No se comparten entre visitantes, ni con la versión anterior alojada en Sites. Cambiar el dominio también cambia el almacenamiento.
- Borrar los datos del sitio en el navegador elimina esos reportes. En navegación privada, pueden borrarse al cerrar la sesión.
- “Cargar ejemplos” añade cinco casos ficticios sin duplicarlos y conserva las revisiones realizadas.
- Desde un reporte recibido, el revisor puede elegir **Por revisar**, **Confirmado** o **Denegado**. Un reporte por revisar puede confirmarse o denegarse; uno confirmado puede cerrarse. Los estados anteriores ya guardados se muestran con los nuevos nombres, sin perder datos. Cada caso confirmado suma $10.000 COP ficticios; cerrar el caso no suma otra recompensa.
- El mapa usa MapLibre y [OpenFreeMap](https://openfreemap.org/), con datos de OpenStreetMap, sin cuenta ni clave. Sirve tanto para abrir el HTML directamente como para GitHub Pages. No solicita imágenes al servidor `tile.openstreetmap.org`, que puede bloquear archivos locales sin identificación web. El mapa y la tipografía de Google necesitan conexión. Si falla el mapa, se pueden escribir las coordenadas manualmente y seguir usando el formulario.
- GPS solicita permiso al navegador y funciona en HTTPS (como GitHub Pages) o en localhost. Las fotografías admiten JPG, PNG o WebP de hasta 5 MB.

## Editar el código (opcional)

Se incluye el código en `src/`. Solo necesitas Node.js y npm si quieres modificarlo y generar de nuevo `index.html`:

```sh
npm install
npm run build
npm run preview
```

Abre `http://127.0.0.1:5180/via-libre/`. Después de editar y compilar, sube el nuevo `index.html` al repositorio.

Los scripts de compilación y vista previa no son necesarios para el sitio publicado. El paquete no incluye servicios de Cloudflare, APIs de servidor ni el script temporal de captura de Figma.
