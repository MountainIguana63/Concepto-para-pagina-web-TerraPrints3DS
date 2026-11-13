// =============================================================================
// auth.js  →  AUTENTICACIÓN Y ROLES
// -----------------------------------------------------------------------------
// Funciones para: registrar usuarios, iniciar sesión, cerrar sesión, conocer
// quién está conectado y cuál es su ROL ("cliente" o "admin").
//
// ¿Dónde se guarda el rol?
//   En la colección "usuarios", en un documento cuyo ID es el uid del usuario:
//     usuarios/{uid} → { nombre, correo, rol: "cliente", creado }
//   Al registrarse SIEMPRE se crea con rol "cliente". Las reglas de Firestore
//   impiden que alguien se registre como "admin" por su cuenta. El primer admin
//   se asigna manualmente desde Firebase Console (ver README).
// =============================================================================

import { auth, db } from "./firebase-config.js"; // Usa las conexiones creadas en firebase-config.js (Clase 15 · Módulos: import)
import { // Inicio de la lista de funciones de Firebase Authentication que vamos a usar
  createUserWithEmailAndPassword, // Crea una cuenta nueva con correo y contraseña (la usa el formulario "Crear cuenta")
  signInWithEmailAndPassword, // Inicia sesión con correo y contraseña (la usa el formulario "Iniciar sesión")
  signOut, // Cierra la sesión (la usa el botón "Cerrar sesión" del menú)
  onAuthStateChanged, // Avisa quién está conectado cuando la página carga (trabaja con un callback · JS Asíncrono)
  updateProfile // Guarda el nombre visible dentro de la cuenta de Firebase
} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js"; // Fin de la importación desde la CDN de Firebase Auth
import { // Inicio de la lista de funciones de Firestore para el perfil del usuario
  doc, // doc() apunta a un documento exacto, por ejemplo usuarios/{uid} (Intro a Firebase)
  getDoc, // getDoc() LEE un documento (READ del CRUD)
  setDoc, // setDoc() CREA un documento eligiendo su ID (CREATE del CRUD)
  serverTimestamp // serverTimestamp() pone la fecha del servidor, no la de la computadora del usuario
} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js"; // Fin de la importación de Firestore

// Nombres de los roles en un solo lugar (evita errores de escritura).
export const ROLES = { // Objeto constante con los dos roles del sistema (Clase 10 · const; Clase 11 · Objetos)
  CLIENTE: "cliente", // Rol de quien se registra en la página: puede pedir y ver solo SUS pedidos
  ADMIN: "admin" // Rol del dueño del taller: maneja catálogo y pedidos (se asigna a mano en la consola)
}; // Fin del objeto ROLES

// -----------------------------------------------------------------------------
// REGISTRO: crea la cuenta en Firebase Auth y su perfil en Firestore.
// -----------------------------------------------------------------------------
export async function registrarUsuario(nombre, correo, contrasena) { // Función asíncrona que recibe los datos del formulario de registro (Clase 12 · Funciones con parámetros; JS Asíncrono · async)
  // 1. Crear la cuenta (correo + contraseña) en Firebase Authentication.
  const credencial = await createUserWithEmailAndPassword(auth, correo, contrasena); // await espera a que Firebase cree la cuenta antes de seguir (JS Asíncrono · await)
  const usuario = credencial.user; // Guardamos el usuario recién creado en una constante (Clase 11 · acceso a propiedades)

  // 2. Guardar el nombre visible dentro del propio usuario de Auth.
  await updateProfile(usuario, { displayName: nombre }); // Guarda el nombre para mostrar "Hola, nombre" en el menú

  // 3. Crear el documento de perfil con el rol "cliente".
  //    setDoc() permite elegir el ID del documento (usamos el uid).
  await setDoc(doc(db, "usuarios", usuario.uid), { // Crea el documento usuarios/{uid} en Firestore con el perfil (Intro a Firebase · CREATE)
    nombre: nombre, // Nombre que escribió la persona en el registro
    correo: correo, // Correo de la cuenta
    rol: ROLES.CLIENTE, // ← nunca "admin": las reglas lo rechazarían
    creado: serverTimestamp() // Fecha de creación puesta por el servidor de Firebase
  }); // Fin del objeto que se guarda en Firestore

  return usuario; // Devuelve el usuario a quien llamó la función, main.js (Clase 12 · return)
} // Fin de registrarUsuario

// -----------------------------------------------------------------------------
// LOGIN: inicia sesión y devuelve el perfil (con el rol) del usuario.
// -----------------------------------------------------------------------------
export async function iniciarSesion(correo, contrasena) { // Función que usa el formulario "Iniciar sesión" (Clase 12 · Funciones; JS Asíncrono)
  const credencial = await signInWithEmailAndPassword(auth, correo, contrasena); // Firebase revisa correo y contraseña; si están mal lanza un error que main.js atrapa con try/catch
  return obtenerPerfil(credencial.user); // Después de entrar, lee el perfil para saber el ROL y devolverlo
} // Fin de iniciarSesion

// -----------------------------------------------------------------------------
// LOGOUT
// -----------------------------------------------------------------------------
export async function cerrarSesion() { // Función del botón "Cerrar sesión"
  await signOut(auth); // Firebase borra la sesión guardada en el navegador (JS Asíncrono · await)
} // Fin de cerrarSesion

// -----------------------------------------------------------------------------
// PERFIL: lee usuarios/{uid} para conocer el nombre y el rol.
// -----------------------------------------------------------------------------
export async function obtenerPerfil(usuario) { // Lee el perfil del usuario conectado: aquí se averigua si es cliente o admin
  const referencia = doc(db, "usuarios", usuario.uid); // Referencia al documento usuarios/{uid} de esta persona (Intro a Firebase · doc)
  const snapshot = await getDoc(referencia); // Lo leemos de Firestore y esperamos la respuesta (READ · await)

  if (snapshot.exists()) { // Si el documento existe en la base de datos... (Clase 10 · if)
    // Unimos el uid con los datos guardados (operador spread "...").
    return { uid: usuario.uid, ...snapshot.data() }; // Devuelve un objeto con el uid más todos los datos del perfil (Clase 11 · Operador spread)
  } // Fin del if

  // Si el documento aún no existe, lo tratamos como cliente (el rol más limitado).
  return { // Objeto de respaldo si el perfil todavía no existe
    uid: usuario.uid, // El identificador único del usuario
    nombre: usuario.displayName || usuario.email, // Usa el nombre; si no hay, usa el correo (Clase 10 · operador lógico ||, valores falsy)
    correo: usuario.email, // Correo de la cuenta
    rol: ROLES.CLIENTE // Por seguridad lo tratamos como cliente
  }; // Fin del objeto de respaldo
} // Fin de obtenerPerfil

// -----------------------------------------------------------------------------
// ESTADO DE LA SESIÓN
// onAuthStateChanged() trabaja con un CALLBACK. Igual que en la clase de
// "JavaScript Asíncrono" (Adaptar un callback a Promise), lo envolvemos en una
// Promesa para poder usar: const perfil = await esperarSesion();
// Resuelve con el perfil del usuario conectado o con null si no hay sesión.
// -----------------------------------------------------------------------------
export function esperarSesion() { // main.js la llama al cargar CUALQUIER página para saber quién está conectado
  return new Promise((resolve, reject) => { // Crea una Promesa a mano: resolve = salió bien, reject = falló (JS Asíncrono · Crear una promesa)
    const dejarDeEscuchar = onAuthStateChanged( // Escucha el estado de la sesión y guarda la función para dejar de escuchar
      auth, // Le decimos a Firebase de qué conexión queremos saber
      async (usuario) => { // Callback que Firebase ejecuta con el usuario conectado o null (Clase 12 · Función flecha; JS Asíncrono · Callbacks)
        dejarDeEscuchar(); // Solo necesitamos el primer estado al cargar la página.

        if (!usuario) { // Si no hay usuario (null es falsy)... (Clase 10 · Valores Falsy y Truthy)
          resolve(null); // Nadie ha iniciado sesión: la promesa termina con null y la página se muestra como visitante
          return; // return corta la función aquí (Clase 12 · return)
        } // Fin del if

        try { // Intentamos leer el perfil; si falla, salta al catch (JS Asíncrono · try/catch)
          const perfil = await obtenerPerfil(usuario); // Espera el perfil con el rol desde Firestore
          resolve(perfil); // La promesa termina bien y entrega el perfil a main.js
        } catch (error) { // Si Firestore falló (por ejemplo, sin internet)...
          reject(error); // ...la promesa se rechaza y main.js muestra el error
        } // Fin del try/catch
      }, // Fin del callback
      reject // Si Firebase reporta un error, la promesa se rechaza.
    ); // Fin de onAuthStateChanged
  }); // Fin de la promesa
} // Fin de esperarSesion

// Pequeña ayuda para preguntar por el rol en otras partes del código.
export function esAdmin(perfil) { // Devuelve true o false según el rol; la usan main.js para redirigir y mostrar el panel
  return perfil !== null && perfil.rol === ROLES.ADMIN; // Es admin solo si hay perfil Y su rol es "admin" (Clase 10 · Operadores lógicos && y relacionales)
} // Fin de esAdmin
