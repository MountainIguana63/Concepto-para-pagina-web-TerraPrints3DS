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

import { db } from "./firebase-config.js"; // Usa la conexión a la base de datos creada en firebase-config.js (Clase 15 · Módulos)
import { // Inicio de la lista de funciones de Firestore
  collection, // collection() apunta a una colección completa, como "productos" (Intro a Firebase · organización de datos)
  doc, // doc() apunta a un documento exacto por su ID
  addDoc, // addDoc() CREA un documento con ID automático (CREATE)
  getDocs, // getDocs() LEE varios documentos (READ de todos)
  getDoc, // getDoc() LEE un solo documento (READ de uno)
  updateDoc, // updateDoc() MODIFICA campos de un documento (UPDATE)
  deleteDoc, // deleteDoc() ELIMINA un documento (DELETE)
  query, // query() arma una consulta con condiciones
  where, // where() filtra, por ejemplo: solo los pedidos de este cliente
  orderBy, // orderBy() ordena los resultados desde Firebase
  serverTimestamp // Fecha y hora puestas por el servidor
} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js"; // Fin de la importación desde la CDN
import { PRODUCTOS_INICIALES, PEDIDOS_DEMO } from "./datos-iniciales.js"; // Trae los datos iniciales del catálogo y los pedidos demo (Clase 15 · Módulos)

// Referencias a las colecciones (como "tablas" en una BD relacional).
const productosRef = collection(db, "productos"); // Referencia a la colección "productos" (el catálogo)
const pedidosRef = collection(db, "pedidos"); // Referencia a la colección "pedidos" (las solicitudes de los clientes)

// Convierte un snapshot de getDocs() en un arreglo de objetos normales,
// agregando el id de cada documento.
function convertirSnapshot(snapshot) { // Función de ayuda interna (sin export): no se usa fuera de este archivo (Clase 12 · Ámbito)
  const lista = []; // Arreglo vacío donde iremos guardando cada documento (Clase 11 · Arreglos)
  snapshot.forEach((documento) => { // Recorre cada documento que devolvió Firestore (Clase 11 · forEach)
    lista.push({ id: documento.id, ...documento.data() }); // Agrega al arreglo un objeto con el id y los datos del documento (push + Operador spread)
  }); // Fin del forEach
  return lista; // Devuelve el arreglo listo para dibujarlo en la página
} // Fin de convertirSnapshot

// =============================================================================
// PRODUCTOS  (CRUD completo)
// =============================================================================

// READ (todos) → getDocs() ordenados por nombre.
export async function obtenerProductos() { // Trae TODO el catálogo; la usan inicio, catálogo, admin y la carga de datos iniciales
  const consulta = query(productosRef, orderBy("nombre")); // Consulta: todos los productos ordenados por nombre (Intro a Firebase · READ)
  const snapshot = await getDocs(consulta); // Ejecuta la consulta y espera la respuesta del servidor (JS Asíncrono · await)
  return convertirSnapshot(snapshot); // Convierte la respuesta en un arreglo de objetos
} // Fin de obtenerProductos

// READ (uno) → getDoc() con el ID del documento.
export async function obtenerProducto(id) { // Trae UN producto por su ID; la usa pedidos.html cuando llegas desde "Solicitar este modelo"
  const snapshot = await getDoc(doc(db, "productos", id)); // Lee el documento productos/{id}
  if (!snapshot.exists()) { // Si no existe (alguien lo borró)... (Clase 10 · if y operador !)
    return null; // ...devuelve null para que la página avise "El producto ya no existe"
  } // Fin del if
  return { id: snapshot.id, ...snapshot.data() }; // Devuelve el producto con su id (Clase 11 · Operador spread)
} // Fin de obtenerProducto

// CREATE → addDoc() genera el ID automáticamente.
export async function crearProducto(datos) { // Botón "Crear producto" del panel admin (CREATE del CRUD principal)
  const referencia = await addDoc(productosRef, { // Agrega el documento a la colección y Firebase genera el ID
    ...datos, // Copia todos los campos del formulario (nombre, precio, etc.) (Clase 11 · Spread)
    creado: serverTimestamp() // Le agrega la fecha de creación
  }); // Fin del objeto que se guarda
  return referencia.id; // Devuelve el ID nuevo; sirve para relacionar pedidos demo con productos
} // Fin de crearProducto

// UPDATE → updateDoc() modifica solo los campos enviados.
export async function actualizarProducto(id, datos) { // Botón "Guardar cambios" del panel admin (UPDATE del CRUD)
  await updateDoc(doc(db, "productos", id), { // Modifica el documento productos/{id}
    ...datos, // Solo cambia los campos que vienen del formulario
    actualizado: serverTimestamp() // Guarda cuándo se editó
  }); // Fin del objeto
} // Fin de actualizarProducto

// DELETE → deleteDoc() elimina permanentemente (por eso se confirma antes).
export async function eliminarProducto(id) { // Botón "Eliminar" de la tabla de productos (DELETE del CRUD)
  await deleteDoc(doc(db, "productos", id)); // Borra el documento para siempre; por eso main.js pregunta antes con confirm()
} // Fin de eliminarProducto

// =============================================================================
// PEDIDOS
// =============================================================================

// CREATE → un cliente registra una solicitud. Siempre inicia "En espera".
export async function crearPedido(datos) { // Botón "Enviar pedido" de pedidos.html: guarda la solicitud del cliente
  const referencia = await addDoc(pedidosRef, { // Agrega el pedido a la colección "pedidos" (CREATE)
    ...datos, // Copia los datos del formulario y la cotización (Clase 11 · Spread)
    estado: "En espera", // Todo pedido nuevo empieza "En espera" (las reglas también lo exigen)
    fecha: serverTimestamp() // Fecha del servidor; sirve para ordenar del más nuevo al más viejo
  }); // Fin del objeto
  return referencia.id; // Devuelve el ID del pedido creado
} // Fin de crearPedido

// READ (cliente) → solo los pedidos cuyo clienteId es el usuario conectado.
// El filtro where() es OBLIGATORIO: las reglas no permiten a un cliente leer
// pedidos ajenos, así que una consulta sin filtro sería rechazada.
// (El orden por fecha se hace en JavaScript, ver logica.js → ordenarPorFecha.)
export async function obtenerPedidosDeCliente(uid) { // Llena la sección "Mis pedidos" del cliente
  const consulta = query(pedidosRef, where("clienteId", "==", uid)); // Consulta: solo los pedidos donde clienteId es igual al uid de quien está conectado (where)
  const snapshot = await getDocs(consulta); // Ejecuta la consulta en Firebase (JS Asíncrono · await)
  return convertirSnapshot(snapshot); // Devuelve el arreglo de pedidos
} // Fin de obtenerPedidosDeCliente

// READ (admin) → todos los pedidos, del más reciente al más antiguo.
export async function obtenerTodosLosPedidos() { // Llena la tabla de pedidos del panel admin
  const consulta = query(pedidosRef, orderBy("fecha", "desc")); // Consulta: todos los pedidos, del más reciente al más antiguo (orderBy desc)
  const snapshot = await getDocs(consulta); // Las reglas solo permiten esta lectura si quien la hace es admin
  return convertirSnapshot(snapshot); // Devuelve el arreglo de pedidos
} // Fin de obtenerTodosLosPedidos

// UPDATE (admin) → cambia el estado de fabricación.
export async function actualizarEstadoPedido(id, estado) { // Se ejecuta al cambiar el <select> de estado en la tabla del admin (UPDATE)
  await updateDoc(doc(db, "pedidos", id), { // Modifica el documento pedidos/{id}
    estado: estado, // Nuevo estado: En espera, Imprimiendo o Completado
    actualizado: serverTimestamp() // Guarda cuándo cambió
  }); // Fin del objeto
} // Fin de actualizarEstadoPedido

// DELETE → el admin elimina, o el cliente cancela un pedido "En espera".
export async function eliminarPedido(id) { // La usan DOS botones: "Cancelar pedido" del cliente y "Eliminar" del admin
  await deleteDoc(doc(db, "pedidos", id)); // Borra el pedido; las reglas solo dejan al cliente si es suyo y sigue "En espera"
} // Fin de eliminarPedido

// =============================================================================
// DATOS INICIALES (requisito 7 del desafío)
// Carga el catálogo y algunos pedidos de demostración. Solo funciona para un
// administrador, porque las reglas no permiten a otros escribir en "productos".
// =============================================================================
export async function cargarDatosIniciales(perfilAdmin) { // Botón "Cargar datos iniciales" del panel admin; recibe el perfil del admin
  const existentes = await obtenerProductos(); // Primero revisa si ya hay productos en la base
  if (existentes.length > 0) { // Si ya hay al menos uno... (Clase 10 · Operadores relacionales)
    // Evitamos duplicar el catálogo.
    return { productosCreados: 0, pedidosCreados: 0, yaExistian: existentes.length }; // ...no carga nada y avisa cuántos había (así no se duplica el catálogo)
  } // Fin del if

  // 1. Crear cada producto y guardar su ID por nombre para relacionar pedidos.
  const idsPorNombre = {}; // Objeto vacío que funcionará como diccionario: nombre → id (Clase 11 · Objetos)
  for (const producto of PRODUCTOS_INICIALES) { // Recorre cada producto inicial uno por uno (Clase 10 · for...of)
    idsPorNombre[producto.nombre] = await crearProducto(producto); // Lo crea en Firestore y guarda su ID usando el nombre como llave (await dentro de un ciclo)
  } // Fin del ciclo

  // 2. Crear pedidos de demostración relacionados con productos del catálogo.
  for (const pedido of PEDIDOS_DEMO) { // Recorre los 3 pedidos de demostración (Clase 10 · for...of)
    await addDoc(pedidosRef, { // Crea cada pedido en la colección "pedidos"
      ...pedido, // Copia los datos del pedido demo (Clase 11 · Spread)
      productoId: pedido.productoNombre ? idsPorNombre[pedido.productoNombre] : null, // Relación pedido → producto: busca el ID del producto por su nombre (Clase 10 · Operador ternario)
      clienteId: perfilAdmin.uid, // Las reglas exigen que clienteId sea quien escribe.
      fecha: serverTimestamp() // Fecha del servidor
    }); // Fin del objeto
  } // Fin del ciclo

  return { // Devuelve un resumen para que el panel muestre "Se crearon 8 productos y 3 pedidos"
    productosCreados: PRODUCTOS_INICIALES.length, // Cuántos productos se crearon (Clase 11 · length)
    pedidosCreados: PEDIDOS_DEMO.length, // Cuántos pedidos se crearon
    yaExistian: 0 // Ninguno existía antes
  }; // Fin del objeto
} // Fin de cargarDatosIniciales
