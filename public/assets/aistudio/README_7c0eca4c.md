# iSTB Android — IPTV Player (PWA → APK)

Copia de iSTB adaptada para **Android**. Es una Progressive Web App (PWA) que se instala en Android desde Chrome y se puede empaquetar como **APK**.

## Funcionalidades

- ➕ Añadir portales IPTV: lista M3U, Xtream Codes y Stalker Middleware (MAC)
- 📺 Lista de canales con búsqueda y categorías
- ⭐ Canales favoritos
- ▶️ Reproductor de video con Picture-in-Picture y pantalla completa
- 🌙 Tema oscuro
- 💾 Funciona sin conexión (PWA caché)

## Cómo instalar en Android (sin APK)

1. Sube esta carpeta a un hosting con HTTPS (GitHub Pages, Netlify, etc.).
2. Abre la URL en **Chrome** de Android.
3. Toca el menú ⋮ → **"Agregar a pantalla de inicio"**.
4. Aparecerá como una app nativa en el cajón de aplicaciones.

## Cómo generar el APK instalable (gratis, sin instalar nada)

Esta PWA se puede convertir en un APK real con **PWA Builder** de Microsoft:

1. Ve a https://www.pwabuilder.com/
2. Pega la URL de tu PWA publicada (debe ser **HTTPS**).
3. Pulsa **"Start"** y elige **Android**.
4. Descarga el APK generado.
5. Instálalo en tu Android (habilita "Origenes desconocidos" si te lo pide).

Alternativa con herramientas locales (requiere Android SDK + Node):
```bash
npm install -g @bubblewrap/cli
bubblewrap init --manifest https://TU_URL/manifest.json
bubblewrap build
# Genera app-release.apk
```

## Archivos

```
android/
  index.html    # App PWA completa
  manifest.json # Manifiest para instalación en Android
  sw.js         # Service worker (offline)
  icons/
    icon-192.png
    icon-512.png
```

> ⚠️ Nota legal: esta app no aloja ni distribuye contenido. El usuario es responsable de usar listas y credenciales propias y de cumplir con las leyes de copyright aplicables.
