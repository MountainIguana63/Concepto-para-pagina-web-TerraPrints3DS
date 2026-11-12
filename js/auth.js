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

import { auth, db } from "./firebase-config.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";

// Nombres de los roles en un solo lugar (evita errores de escritura).
export const ROLES = {
  CLIENTE: "cliente",
  ADMIN: "admin"
};

// -----------------------------------------------------------------------------
// REGISTRO: crea la cuenta en Firebase Auth y su perfil en Firestore.
// -----------------------------------------------------------------------------
export async function registrarUsuario(nombre, correo, contrasena) {
  // 1. Crear la cuenta (correo + contraseña) en Firebase Authentication.
  const credencial = await createUserWithEmailAndPassword(auth, correo, contrasena);
  const usuario = credencial.user;

  // 2. Guardar el nombre visible dentro del propio usuario de Auth.
  await updateProfile(usuario, { displayName: nombre });

  // 3. Crear el documento de perfil con el rol "cliente".
  //    setDoc() permite elegir el ID del documento (usamos el uid).
  await setDoc(doc(db, "usuarios", usuario.uid), {
    nombre: nombre,
    correo: correo,
    rol: ROLES.CLIENTE, // ← nunca "admin": las reglas lo rechazarían
    creado: serverTimestamp()
  });

  return usuario;
}

// -----------------------------------------------------------------------------
// LOGIN: inicia sesión y devuelve el perfil (con el rol) del usuario.
// -----------------------------------------------------------------------------
export async function iniciarSesion(correo, contrasena) {
  const credencial = await signInWithEmailAndPassword(auth, correo, contrasena);
  return obtenerPerfil(credencial.user);
}

// -----------------------------------------------------------------------------
// LOGOUT
// -----------------------------------------------------------------------------
export async function cerrarSesion() {
  await signOut(auth);
}

// -----------------------------------------------------------------------------
// PERFIL: lee usuarios/{uid} para conocer el nombre y el rol.
// -----------------------------------------------------------------------------
export async function obtenerPerfil(usuario) {
  const referencia = doc(db, "usuarios", usuario.uid);
  const snapshot = await getDoc(referencia);

  if (snapshot.exists()) {
    // Unimos el uid con los datos guardados (operador spread "...").
    return { uid: usuario.uid, ...snapshot.data() };
  }

  // Si el documento aún no existe, lo tratamos como cliente (el rol más limitado).
  return {
    uid: usuario.uid,
    nombre: usuario.displayName || usuario.email,
    correo: usuario.email,
    rol: ROLES.CLIENTE
  };
}

// -----------------------------------------------------------------------------
// ESTADO DE LA SESIÓN
// onAuthStateChanged() trabaja con un CALLBACK. Igual que en la clase de
// "JavaScript Asíncrono" (Adaptar un callback a Promise), lo envolvemos en una
// Promesa para poder usar: const perfil = await esperarSesion();
// Resuelve con el perfil del usuario conectado o con null si no hay sesión.
// -----------------------------------------------------------------------------
export function esperarSesion() {
  return new Promise((resolve, reject) => {
    const dejarDeEscuchar = onAuthStateChanged(
      auth,
      async (usuario) => {
        dejarDeEscuchar(); // Solo necesitamos el primer estado al cargar la página.

        if (!usuario) {
          resolve(null); // Nadie ha iniciado sesión.
          return;
        }

        try {
          const perfil = await obtenerPerfil(usuario);
          resolve(perfil);
        } catch (error) {
          reject(error);
        }
      },
      reject // Si Firebase reporta un error, la promesa se rechaza.
    );
  });
}

// Pequeña ayuda para preguntar por el rol en otras partes del código.
export function esAdmin(perfil) {
  return perfil !== null && perfil.rol === ROLES.ADMIN;
}
