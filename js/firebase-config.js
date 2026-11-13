// =============================================================================
// firebase-config.js  →  CONFIGURACIÓN DE LA PLATAFORMA
// -----------------------------------------------------------------------------
// Este es el ÚNICO archivo que conoce los datos del proyecto de Firebase.
// Aquí se inicializa Firebase y se crean dos "instancias" que el resto de la
// aplicación reutiliza:
//   - auth → Firebase Authentication (registro, login y logout).
//   - db   → Cloud Firestore (la base de datos NoSQL de documentos).
//
// IMPORTANTE (visto en clase): la configuración del proyecto NO es un mecanismo
// de seguridad, por eso puede estar en el código del navegador. Quien protege
// los datos son las REGLAS DE FIRESTORE (archivo firestore.rules).
// =============================================================================

// Importamos las funciones del SDK modular de Firebase directamente desde la CDN
// (misma forma que en la presentación "Introducción a Firebase").
import { initializeApp } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js"; // Trae la función que "enciende" Firebase en la página (Clase 15 · Módulos: import desde otro archivo)
import { getAuth } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js"; // Trae el servicio de cuentas: registro, login y logout (Intro a Firebase · Authentication)
import { getFirestore } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js"; // Trae la base de datos en la nube donde se guardan productos, pedidos y usuarios (Intro a Firebase · Firestore)

// -----------------------------------------------------------------------------
// 1. Configuración obtenida desde Firebase Console
//    (Configuración del proyecto → Tus apps → App web → firebaseConfig).
//    Proyecto: sv3dprints (plan Spark).
// -----------------------------------------------------------------------------
const firebaseConfig = { // Objeto literal con los datos que identifican NUESTRO proyecto en Firebase (Clase 11 · Objetos)
  apiKey: "AIzaSyDFCKfljZx0GVxGrSq7HIKCOAma8UYegIs", // Llave pública de la app web: identifica el proyecto, no da permisos (la seguridad está en firestore.rules)
  authDomain: "sv3dprints-7769d.firebaseapp.com", // Dominio que Firebase usa para manejar el inicio de sesión
  projectId: "sv3dprints-7769d", // Nombre interno del proyecto en Firebase: sv3dprints-7769d
  storageBucket: "sv3dprints-7769d.firebasestorage.app", // Espacio para archivos (no lo usamos, pero Firebase lo incluye en la configuración)
  messagingSenderId: "61638307199", // Número del proyecto que Firebase genera automáticamente
  appId: "1:61638307199:web:390126e419d5cb6dcd3e4a" // Identificador de esta app web dentro del proyecto
}; // Fin del objeto de configuración

// Bandera para avisar en pantalla si todavía no se pegó la configuración real.
// main.js la revisa antes de intentar conectarse a Firebase.
export const configuracionPendiente = firebaseConfig.apiKey.startsWith("PEGAR_AQUI"); // true si alguien olvidó pegar la configuración real; startsWith() revisa cómo empieza el texto (Clase 11 · Cadenas; export = Clase 15 · Módulos)

// -----------------------------------------------------------------------------
// 2. Inicializar Firebase con la configuración del proyecto
// -----------------------------------------------------------------------------
const app = initializeApp(firebaseConfig); // Conecta la página con nuestro proyecto de Firebase usando los datos de arriba (Intro a Firebase · Inicializar)

// -----------------------------------------------------------------------------
// 3. Obtener las instancias que se usarán en auth.js y db.js
// -----------------------------------------------------------------------------
export const auth = getAuth(app);   // Servicio de autenticación. Exporta la conexión de cuentas para que auth.js la use (Clase 15 · Módulos: export)
export const db = getFirestore(app); // Base de datos Cloud Firestore. Exporta la conexión a la base de datos para que db.js y auth.js la usen (Intro a Firebase · getFirestore)
