// =============================================================================
// db.js  →  GESTIÓN DE DATOS (Cloud Firestore)
// -----------------------------------------------------------------------------
// Aquí están TODAS las operaciones con la base de datos. Ningún otro archivo
// llama directamente a addDoc, getDocs, updateDoc, etc.
//
// Colecciones:
//   productos → catálogo de modelos 3D (CRUD completo del administrador).
//   pedidos   → solicitudes de impresión de los clientes (crear, consultar,
//               cambiar estado y eliminar/cancelar).
//   usuarios  → perfiles y roles (se maneja en auth.js).
//
// Todas las funciones son async: devuelven Promesas y se consumen con await.
// Si Firestore falla (sin conexión, permiso denegado por las reglas, etc.) el
// error se propaga y se atrapa con try/catch en main.js.
// =============================================================================

import { db } from "./firebase-config.js";
import {
  collection,
  doc,
  addDoc,
  getDocs,
  getDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";
import { PRODUCTOS_INICIALES, PEDIDOS_DEMO } from "./datos-iniciales.js";

// Referencias a las colecciones (como "tablas" en una BD relacional).
const productosRef = collection(db, "productos");
const pedidosRef = collection(db, "pedidos");

// Convierte un snapshot de getDocs() en un arreglo de objetos normales,
// agregando el id de cada documento.
function convertirSnapshot(snapshot) {
  const lista = [];
  snapshot.forEach((documento) => {
    lista.push({ id: documento.id, ...documento.data() });
  });
  return lista;
}

// =============================================================================
// PRODUCTOS  (CRUD completo)
// =============================================================================

// READ (todos) → getDocs() ordenados por nombre.
export async function obtenerProductos() {
  const consulta = query(productosRef, orderBy("nombre"));
  const snapshot = await getDocs(consulta);
  return convertirSnapshot(snapshot);
}

// READ (uno) → getDoc() con el ID del documento.
export async function obtenerProducto(id) {
  const snapshot = await getDoc(doc(db, "productos", id));
  if (!snapshot.exists()) {
    return null;
  }
  return { id: snapshot.id, ...snapshot.data() };
}

// CREATE → addDoc() genera el ID automáticamente.
export async function crearProducto(datos) {
  const referencia = await addDoc(productosRef, {
    ...datos,
    creado: serverTimestamp()
  });
  return referencia.id;
}

// UPDATE → updateDoc() modifica solo los campos enviados.
export async function actualizarProducto(id, datos) {
  await updateDoc(doc(db, "productos", id), {
    ...datos,
    actualizado: serverTimestamp()
  });
}

// DELETE → deleteDoc() elimina permanentemente (por eso se confirma antes).
export async function eliminarProducto(id) {
  await deleteDoc(doc(db, "productos", id));
}

// =============================================================================
// PEDIDOS
// =============================================================================

// CREATE → un cliente registra una solicitud. Siempre inicia "En espera".
export async function crearPedido(datos) {
  const referencia = await addDoc(pedidosRef, {
    ...datos,
    estado: "En espera",
    fecha: serverTimestamp()
  });
  return referencia.id;
}

// READ (cliente) → solo los pedidos cuyo clienteId es el usuario conectado.
// El filtro where() es OBLIGATORIO: las reglas no permiten a un cliente leer
// pedidos ajenos, así que una consulta sin filtro sería rechazada.
// (El orden por fecha se hace en JavaScript, ver logica.js → ordenarPorFecha.)
export async function obtenerPedidosDeCliente(uid) {
  const consulta = query(pedidosRef, where("clienteId", "==", uid));
  const snapshot = await getDocs(consulta);
  return convertirSnapshot(snapshot);
}

// READ (admin) → todos los pedidos, del más reciente al más antiguo.
export async function obtenerTodosLosPedidos() {
  const consulta = query(pedidosRef, orderBy("fecha", "desc"));
  const snapshot = await getDocs(consulta);
  return convertirSnapshot(snapshot);
}

// UPDATE (admin) → cambia el estado de fabricación.
export async function actualizarEstadoPedido(id, estado) {
  await updateDoc(doc(db, "pedidos", id), {
    estado: estado,
    actualizado: serverTimestamp()
  });
}

// DELETE → el admin elimina, o el cliente cancela un pedido "En espera".
export async function eliminarPedido(id) {
  await deleteDoc(doc(db, "pedidos", id));
}

// =============================================================================
// DATOS INICIALES (requisito 7 del desafío)
// Carga el catálogo y algunos pedidos de demostración. Solo funciona para un
// administrador, porque las reglas no permiten a otros escribir en "productos".
// =============================================================================
export async function cargarDatosIniciales(perfilAdmin) {
  const existentes = await obtenerProductos();
  if (existentes.length > 0) {
    // Evitamos duplicar el catálogo.
    return { productosCreados: 0, pedidosCreados: 0, yaExistian: existentes.length };
  }

  // 1. Crear cada producto y guardar su ID por nombre para relacionar pedidos.
  const idsPorNombre = {};
  for (const producto of PRODUCTOS_INICIALES) {
    idsPorNombre[producto.nombre] = await crearProducto(producto);
  }

  // 2. Crear pedidos de demostración relacionados con productos del catálogo.
  for (const pedido of PEDIDOS_DEMO) {
    await addDoc(pedidosRef, {
      ...pedido,
      productoId: pedido.productoNombre ? idsPorNombre[pedido.productoNombre] : null,
      clienteId: perfilAdmin.uid, // Las reglas exigen que clienteId sea quien escribe.
      fecha: serverTimestamp()
    });
  }

  return {
    productosCreados: PRODUCTOS_INICIALES.length,
    pedidosCreados: PEDIDOS_DEMO.length,
    yaExistian: 0
  };
}
