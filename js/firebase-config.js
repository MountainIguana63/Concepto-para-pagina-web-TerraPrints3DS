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
import { initializeApp } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";

// -----------------------------------------------------------------------------
// 1. Configuración obtenida desde Firebase Console
//    (Configuración del proyecto → Tus apps → App web → firebaseConfig).
//    Proyecto: sv3dprints (plan Spark).
// -----------------------------------------------------------------------------
const firebaseConfig = {
  apiKey: "AIzaSyDFCKfljZx0GVxGrSq7HIKCOAma8UYegIs",
  authDomain: "sv3dprints-7769d.firebaseapp.com",
  projectId: "sv3dprints-7769d",
  storageBucket: "sv3dprints-7769d.firebasestorage.app",
  messagingSenderId: "61638307199",
  appId: "1:61638307199:web:390126e419d5cb6dcd3e4a"
};

// Bandera para avisar en pantalla si todavía no se pegó la configuración real.
// main.js la revisa antes de intentar conectarse a Firebase.
export const configuracionPendiente = firebaseConfig.apiKey.startsWith("PEGAR_AQUI");

// -----------------------------------------------------------------------------
// 2. Inicializar Firebase con la configuración del proyecto
// -----------------------------------------------------------------------------
const app = initializeApp(firebaseConfig);

// -----------------------------------------------------------------------------
// 3. Obtener las instancias que se usarán en auth.js y db.js
// -----------------------------------------------------------------------------
export const auth = getAuth(app);   // Servicio de autenticación
export const db = getFirestore(app); // Base de datos Cloud Firestore
