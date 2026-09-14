# Verificador de licencias

## Cómo cambiar el logo

1. Copia tu imagen a la carpeta `img/` (ejemplo: `img/logo.png`)
2. En `index.html` busca esta línea y apunta al archivo nuevo:

```html
<img class="ficha-logo-img" src="img/logo.svg" alt="Logo" />
```

El texto de la derecha se cambia en `index.html`, donde dice `Textos`.

Haz lo mismo en `admin.html` si quieres el logo ahí.

---

Sitio estático para **cargar** y **verificar** registros con solo 4 campos:

- Nombre
- Folio
- Fecha de expedición
- Módulo

## Cómo usarlo

1. Abre `admin.html`
2. Entra con la clave `oasis2026` (cámbiala en `js/app.js`)
3. Agrega uno por uno o pega/sube un CSV
4. En `index.html` consulta por folio

Los cambios se guardan en el navegador. Para que se vean en internet para todos:

1. En el panel da clic en **Descargar JSON**
2. Reemplaza el archivo `data/licencias.json`
3. Vuelve a publicar el sitio en Netlify

## Publicar en Netlify

1. Entra a [app.netlify.com](https://app.netlify.com)
2. **Add new site → Deploy manually**
3. Arrastra la carpeta `verificador-licencias`
4. Listo. La URL pública sirve para verificar folios.

También puedes conectar un repo de GitHub y cada vez que subas un `licencias.json` nuevo se actualiza solo.
