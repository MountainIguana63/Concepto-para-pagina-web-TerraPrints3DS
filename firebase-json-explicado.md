# `firebase.json` explicado

El formato JSON **no permite comentarios**, por eso `firebase.json` no los tiene.
Este documento es una copia del archivo con cada línea explicada.

> **Seguridad:** `firebase.json` no guarda contraseñas, claves ni datos de usuarios.
> Solo indica **qué archivos se publican** en Firebase Hosting y **dónde están las
> reglas** de Firestore. La configuración del proyecto (apiKey, projectId…) está en
> `js/firebase-config.js`, y la clave para publicar desde GitHub está guardada como
> secreto en el repositorio (Settings → Secrets), nunca en el código.

---

## Copia comentada

```jsonc
{                                   // Objeto principal de la configuración de Firebase
  "hosting": {                      // Sección de Firebase Hosting: la página publicada en internet
    "public": ".",                  // Carpeta que se publica: "." = la raíz del proyecto (donde están los .html)
    "ignore": [                     // Lista de archivos y carpetas que NO se suben a la página publicada
      "firebase.json",              // Este mismo archivo de configuración (nadie necesita verlo en la página)
      "firestore.rules",            // Las reglas de seguridad: se aplican en Firebase, no se descargan
      "README.md",                  // La documentación del repositorio (es para GitHub, no para la página)
      "**/.*",                      // Cualquier archivo oculto (que empieza con punto), como .gitignore
      ".git/**",                    // El historial de Git: sin esta línea se publicaba y quedaba visible
      ".firebase/**",               // Carpeta temporal que crea Firebase al publicar
      "**/node_modules/**",         // Librerías instaladas con npm (este proyecto no usa, pero es la regla estándar)
      "Indicaciones y ppts/**"      // La guía y las presentaciones de clase (solo son de consulta)
    ]                               // Fin de la lista de ignorados
  },                                // Fin de la sección hosting
  "firestore": {                    // Sección de Cloud Firestore (la base de datos)
    "rules": "firestore.rules"      // Archivo con las reglas de seguridad que usa "firebase deploy --only firestore:rules"
  }                                 // Fin de la sección firestore
}                                   // Fin del archivo
```

---

## Qué hace cada parte

| Parte | Para qué sirve en el proyecto |
|---|---|
| `hosting` | Configura la publicación en **https://sv3dprints-7769d.web.app** (requisito 16: aplicación publicada). |
| `public: "."` | Publica los archivos desde la raíz: `index.html`, `catalogo.html`, `css/`, `js/`, `img/`… No hay carpeta de "build" porque usamos HTML, CSS y JavaScript nativo. |
| `ignore` | Evita publicar lo que no es parte de la página: configuración, documentación, historial de Git y material de clase. |
| `firestore.rules` | Indica dónde están las **reglas de seguridad** (tema *Reglas de seguridad en Cloud Firestore* de la presentación *Introducción a Firebase*). Ahí se decide qué puede leer o escribir cada rol. |

## Cómo se usa

- **Publicación automática:** cada vez que alguien sube cambios a `main`, GitHub Actions (`.github/workflows/firebase-hosting-merge.yml`) lee este archivo y publica la página respetando la lista `ignore`.
- **Publicación manual** (desde la carpeta del proyecto):

  ```bash
  npx.cmd -y firebase-tools@15.36.0 deploy --only hosting --project sv3dprints-7769d
  ```

- **Publicar solo las reglas de seguridad** (cuando se cambie `firestore.rules`):

  ```bash
  npx.cmd -y firebase-tools@15.36.0 deploy --only firestore:rules --project sv3dprints-7769d
  ```

## Por qué `.git/**` está en la lista

La regla `**/.*` debería ignorar todo lo que empieza con punto, pero en la primera
publicación la carpeta `.git` igual se subió. Eso dejaba visible el historial del
repositorio en la página. Al agregar `.git/**` y `.firebase/**` de forma explícita,
esas carpetas ya no se publican: si alguien intenta abrirlas, la página responde
"no encontrado" (error 404).
