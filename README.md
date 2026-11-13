# SV3DPrints · TerraPrints 3D — Desafío Práctico II

Aplicación web para **SV3DPrints**, emprendimiento salvadoreño de impresión 3D, prototipado rápido y figuras.
Amplía el sitio estático del Desafío Práctico I con autenticación, roles, base de datos remota y procesos de negocio completos.

> Desarrollo Web I · ESEN · 2026

---

## 1. Problema que resuelve

El negocio recibía cotizaciones por mensajes de Instagram, sin registro de clientes, sin precio estimado y sin forma de que el cliente supiera en qué estado estaba su impresión. El catálogo estaba escrito a mano en el HTML.

La aplicación permite:

- Que el **cliente** consulte un catálogo dinámico, solicite pedidos con parámetros de impresión (material, relleno %, medidas, cantidad), reciba una **cotización automática** y dé **seguimiento** al estado de sus pedidos.
- Que el **administrador** gestione el catálogo (CRUD completo) y cambie el estado de fabricación de cada pedido, con indicadores del negocio.

## 2. Procesos funcionales (relacionados entre sí)

| # | Proceso | Rol | Descripción |
|---|---------|-----|-------------|
| 1 | Gestión del catálogo | admin | Crear, consultar, editar y eliminar productos (2 imágenes, precio, tiempo, relleno, medidas, multicolor, enlace STL). |
| 2 | Solicitud de pedidos | cliente | Elegir un producto del catálogo o una pieza personalizada; el precio y el tiempo se calculan en vivo; se guarda en Firestore. |
| 3 | Seguimiento de fabricación | admin → cliente | El admin cambia el estado (`En espera` → `Imprimiendo` → `Completado`); el cliente lo ve en "Mis pedidos" y puede cancelar mientras siga en espera. |

Los procesos se relacionan: el pedido guarda `productoId` / `productoNombre` del producto elegido en el catálogo.

## 3. Roles y permisos

| Acción | Visitante | Cliente | Admin |
|--------|:--------:|:-------:|:-----:|
| Ver catálogo | ✅ | ✅ | ✅ |
| Registrarse / iniciar sesión | ✅ | — | — |
| Crear pedido (a su nombre, "En espera") | ❌ | ✅ | ✅ |
| Ver pedidos | ❌ | Solo los suyos | Todos |
| Cancelar pedido | ❌ | Solo suyos y "En espera" | Todos |
| Cambiar estado de pedido | ❌ | ❌ | ✅ |
| CRUD de productos | ❌ | ❌ | ✅ |

- Toda cuenta nueva se crea con rol **`cliente`**. Las reglas de Firestore rechazan que un usuario se registre como `admin`.
- El rol `admin` se asigna **manualmente** desde Firebase Console (ver sección 6).
- La protección **no** depende de ocultar botones: está en [`firestore.rules`](firestore.rules).

## 4. Tecnología

- HTML5 semántico, CSS3 propio (variables, Grid, Flexbox, media queries) — sin frameworks.
- JavaScript nativo con **módulos ES** (`import` / `export`), `async/await`, `try/catch/finally`.
- **Firebase Authentication** (correo y contraseña) y **Cloud Firestore** (SDK modular 13.1.0 desde CDN).
- `sessionStorage` para recordar el producto elegido si el cliente debe iniciar sesión primero.
- Hosting: Firebase Hosting (o cualquier hosting estático, p. ej. GitHub Pages).

## 5. Estructura del proyecto

```
├── index.html          Inicio + productos destacados (dinámicos)
├── catalogo.html       Catálogo con búsqueda, filtros y ordenamiento
├── pedidos.html        Nuevo pedido con cotización automática + "Mis pedidos"
├── admin.html          Panel admin: indicadores, CRUD de productos, estados de pedidos
├── login.html          Inicio de sesión y registro
├── css/styles.css      Estilos globales y adaptables
├── img/                Imágenes del sitio y de los productos
├── js/
│   ├── firebase-config.js  Configuración de la plataforma (initializeApp, auth, db)
│   ├── auth.js             Registro, login, logout, sesión y rol
│   ├── db.js               Operaciones con Firestore (CRUD productos y pedidos)
│   ├── logica.js           Procesamiento de datos: filtros, orden, cotización, indicadores, validaciones
│   ├── dom.js              Dibujo de la interfaz: tarjetas, tablas, cargas, notificaciones
│   ├── datos-iniciales.js  Catálogo inicial y pedidos de demostración
│   └── main.js             Punto de entrada: conecta eventos de cada página
├── firestore.rules     Reglas de seguridad por rol
└── firebase.json       Configuración de Firebase Hosting y reglas
```

Flujo de una operación: **evento** (`main.js`) → **validación** (`logica.js`) → **Firebase** (`auth.js` / `db.js`, con `await`) → **interfaz** (`dom.js`).

### Colecciones de Firestore

- `usuarios/{uid}`: `nombre`, `correo`, `rol` (`cliente` | `admin`), `creado`.
- `productos/{id}`: `nombre`, `categoria`, `precio`, `tiempo` (minutos), `infill`, `medidas`, `multicolor`, `imagen1`, `imagen2`, `linkSTL`, `creado`, `actualizado`.
- `pedidos/{id}`: `clienteId`, `clienteNombre`, `clienteCorreo`, `servicio`, `productoId`, `productoNombre`, `material`, `infill`, `medidas`, `cantidad`, `descripcion`, `precioEstimado`, `minutosEstimados`, `estado`, `fecha`.

### Procesamiento de datos con JavaScript

1. **Búsqueda y filtrado** del catálogo por nombre/tipo, categoría y multicolor (`filter`).
2. **Ordenamiento** por nombre, precio o tiempo (`sort`).
3. **Cotización automática**: volumen (largo × ancho × alto) × relleno × factor de material + cargo del servicio.
4. **Agrupación e indicadores** con `reduce`: pedidos por estado, horas de máquina pendientes, ingresos completados, precio promedio del catálogo.

## 6. Configuración y ejecución

1. Crear un proyecto en [Firebase Console](https://console.firebase.google.com/).
2. **Authentication** → Método de acceso → habilitar **Correo electrónico/contraseña**.
3. **Firestore Database** → Crear base de datos (modo producción).
4. **Firestore → Reglas**: pegar el contenido de `firestore.rules` y **Publicar**.
5. Configuración del proyecto → Tus apps → **App web** → copiar el objeto `firebaseConfig` y pegarlo en `js/firebase-config.js`.
6. Ejecutar con un servidor local (los módulos ES no funcionan abriendo el archivo con doble clic):
   - VS Code: extensión **Live Server** → "Open with Live Server", o
   - `npx serve .` o `firebase serve`.
7. **Crear el primer administrador**:
   1. Registrarse en `login.html` con la cuenta que será admin.
   2. En Firestore → colección `usuarios` → documento con el uid de esa cuenta → cambiar `rol` de `cliente` a `admin`.
   3. Cerrar sesión y volver a entrar: aparece **Panel admin**.
8. En el panel admin, presionar **Cargar datos iniciales** (8 productos y 3 pedidos de demostración).

### Publicación (Firebase Hosting)

```bash
npm install -g firebase-tools
firebase login
firebase use --add            # elegir el proyecto
firebase deploy               # publica el sitio y las reglas
```

Después de publicar, agregar el dominio `*.web.app` en Authentication → Configuración → Dominios autorizados (si no aparece automáticamente).

## 7. Cómo probar

Las **credenciales de prueba** (una cuenta cliente y una admin) se entregan por Moodle; no se publican en este repositorio.

1. **Visitante**: abrir el catálogo, buscar "llavero", filtrar por categoría, ordenar por precio.
2. **Cliente**: registrarse → en el catálogo pulsar "Solicitar este modelo" → ajustar material/cantidad y ver la cotización → enviar → revisar "Mis pedidos" → cancelar un pedido en espera.
3. **Admin**: crear, editar y eliminar un producto; cambiar el estado de un pedido; filtrar pedidos por estado; revisar los indicadores.
4. **Seguridad**: con la cuenta cliente abrir `admin.html` (acceso restringido). Aunque se forzara la petición desde la consola, Firestore responde *permission-denied*.

## 8. Integrantes

| Integrante | Aporte principal |
|-----------|------------------|
| Víctor Solano | Configuración de Firebase autenticación, reglas por rol, validaciones y estilos dinámicos |
| Sara Arévalo | CRUD de productos, catálogo dinámico y panel administrativo |
| Nathaly Avilés | Formulario de pedidos con cotización, login/registro, conexión de eventos y documentación |
