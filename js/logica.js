// =============================================================================
// logica.js  →  PROCESAMIENTO DE DATOS Y REGLAS DEL NEGOCIO
// -----------------------------------------------------------------------------
// Funciones "puras": reciben datos y devuelven un resultado. No tocan el DOM
// ni Firebase, por eso son fáciles de probar y de explicar.
//   - Filtrado, búsqueda y ordenamiento del catálogo.
//   - Cálculo automático de la cotización (precio y tiempo) de un pedido.
//   - Agrupación de pedidos por estado e indicadores del panel admin.
//   - Validaciones de formularios.
//   - Formatos (precio, tiempo, fecha) y traducción de errores.
// =============================================================================

// -----------------------------------------------------------------------------
// CONSTANTES DEL NEGOCIO
// -----------------------------------------------------------------------------
export const ESTADOS = ["En espera", "Imprimiendo", "Completado"];

// Nombre visible de cada servicio + cargo fijo en USD.
export const SERVICIOS = {
  catalogo: { nombre: "Producto del catálogo", cargo: 0 },
  impresion: { nombre: "Impresión de archivo STL/OBJ propio", cargo: 2.0 },
  modelado: { nombre: "Modelado 3D desde cero", cargo: 15.0 },
  modificacion: { nombre: "Modificación de archivo existente", cargo: 8.0 }
};

// Factor de costo según el filamento (PLA+ es la base).
export const MATERIALES = {
  "PLA+": 1.0,
  PETG: 1.2,
  TPU: 1.5
};

const TARIFA_POR_HORA = 0.9;   // USD por hora de máquina
const MINUTOS_POR_CM3 = 0.6;   // velocidad promedio de la impresora
export const MEDIDA_MAXIMA_CM = 25; // volumen de impresión de la máquina (25 cm por lado)

// -----------------------------------------------------------------------------
// FORMATOS
// -----------------------------------------------------------------------------

// 14.5 → "$14.50"
export function formatearPrecio(valor) {
  return "$" + Number(valor).toFixed(2);
}

// 200 → "3h 20m"
export function formatearTiempo(minutos) {
  const total = Math.round(Number(minutos) || 0);
  const horas = Math.floor(total / 60);
  const resto = total % 60;
  return horas + "h " + String(resto).padStart(2, "0") + "m";
}

// Timestamp de Firestore → "11/11/2026"
export function formatearFecha(fecha) {
  if (!fecha || typeof fecha.toDate !== "function") {
    return "Procesando…"; // serverTimestamp aún no asignado
  }
  return fecha.toDate().toLocaleDateString("es-SV");
}

// Quita mayúsculas y tildes para que "Búho" coincida con "buho".
export function normalizarTexto(texto) {
  return String(texto || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

// -----------------------------------------------------------------------------
// CATÁLOGO: BÚSQUEDA, FILTRADO Y ORDENAMIENTO
// -----------------------------------------------------------------------------

// Devuelve las categorías sin repetir (para llenar el <select> de filtros).
export function obtenerCategorias(productos) {
  const categorias = [];
  productos.forEach((producto) => {
    if (producto.categoria && !categorias.includes(producto.categoria)) {
      categorias.push(producto.categoria);
    }
  });
  return categorias.sort();
}

// filtros = { texto, categoria, soloMulticolor }
export function filtrarProductos(productos, filtros) {
  const texto = normalizarTexto(filtros.texto);

  return productos.filter((producto) => {
    // 1. Búsqueda por nombre o por tipo (categoría).
    const coincideTexto =
      texto === "" ||
      normalizarTexto(producto.nombre).includes(texto) ||
      normalizarTexto(producto.categoria).includes(texto);

    // 2. Filtro por categoría exacta.
    const coincideCategoria = filtros.categoria === "" || producto.categoria === filtros.categoria;

    // 3. Solo productos multicolor (si la casilla está marcada).
    const coincideColor = !filtros.soloMulticolor || producto.multicolor === true;

    return coincideTexto && coincideCategoria && coincideColor;
  });
}

// criterio: "nombre" | "precio-asc" | "precio-desc" | "tiempo-asc"
export function ordenarProductos(productos, criterio) {
  const copia = [...productos]; // No modificamos el arreglo original.

  switch (criterio) {
    case "precio-asc":
      return copia.sort((a, b) => a.precio - b.precio);
    case "precio-desc":
      return copia.sort((a, b) => b.precio - a.precio);
    case "tiempo-asc":
      return copia.sort((a, b) => a.tiempo - b.tiempo);
    default:
      return copia.sort((a, b) => a.nombre.localeCompare(b.nombre));
  }
}

// -----------------------------------------------------------------------------
// COTIZACIÓN AUTOMÁTICA DE UN PEDIDO (regla del negocio)
// datos = { servicio, material, infill, largo, ancho, alto, cantidad, producto }
// Devuelve { precio, minutos, gramos? }
// -----------------------------------------------------------------------------
export function calcularCotizacion(datos) {
  const cantidad = Number(datos.cantidad) || 0;
  const factorMaterial = MATERIALES[datos.material] || 1;

  // Caso 1: producto del catálogo → su precio y tiempo por la cantidad.
  if (datos.servicio === "catalogo" && datos.producto) {
    return {
      precio: redondear(datos.producto.precio * cantidad * factorMaterial),
      minutos: datos.producto.tiempo * cantidad
    };
  }

  // Caso 2: pieza personalizada → se estima a partir del volumen y el relleno.
  const volumen = Number(datos.largo) * Number(datos.ancho) * Number(datos.alto); // cm³
  const infill = Number(datos.infill) || 0;
  if (!volumen || !cantidad) {
    return { precio: 0, minutos: 0 };
  }

  // Más relleno = más tiempo. 0.4 representa paredes y capas superiores.
  const minutosPorPieza = Math.round(volumen * MINUTOS_POR_CM3 * (0.4 + infill / 100));
  const costoPorPieza = (minutosPorPieza / 60) * TARIFA_POR_HORA * factorMaterial;
  const cargoServicio = SERVICIOS[datos.servicio] ? SERVICIOS[datos.servicio].cargo : 0;

  return {
    precio: redondear(cargoServicio + costoPorPieza * cantidad),
    minutos: minutosPorPieza * cantidad
  };
}

function redondear(valor) {
  return Math.round(valor * 100) / 100;
}

// -----------------------------------------------------------------------------
// PEDIDOS: ORDENAMIENTO, AGRUPACIÓN E INDICADORES
// -----------------------------------------------------------------------------

// Del más reciente al más antiguo.
export function ordenarPorFecha(pedidos) {
  return [...pedidos].sort((a, b) => obtenerMilisegundos(b.fecha) - obtenerMilisegundos(a.fecha));
}

function obtenerMilisegundos(fecha) {
  return fecha && typeof fecha.toMillis === "function" ? fecha.toMillis() : 0;
}

// Agrupa con reduce(): cuántos pedidos hay por estado y montos totales.
export function resumirPedidos(pedidos) {
  const inicial = {
    total: pedidos.length,
    porEstado: { "En espera": 0, Imprimiendo: 0, Completado: 0 },
    montoTotal: 0,
    montoCompletado: 0,
    minutosPendientes: 0
  };

  return pedidos.reduce((resumen, pedido) => {
    const precio = Number(pedido.precioEstimado) || 0;

    if (resumen.porEstado[pedido.estado] !== undefined) {
      resumen.porEstado[pedido.estado] += 1;
    }
    resumen.montoTotal += precio;

    if (pedido.estado === "Completado") {
      resumen.montoCompletado += precio;
    } else {
      // Tiempo de máquina que todavía falta por imprimir.
      resumen.minutosPendientes += Number(pedido.minutosEstimados) || 0;
    }
    return resumen;
  }, inicial);
}

// Indicadores del catálogo para el panel admin.
export function resumirCatalogo(productos) {
  if (productos.length === 0) {
    return { cantidad: 0, precioPromedio: 0, multicolor: 0 };
  }
  const suma = productos.reduce((acumulado, p) => acumulado + Number(p.precio), 0);
  return {
    cantidad: productos.length,
    precioPromedio: suma / productos.length,
    multicolor: productos.filter((p) => p.multicolor).length
  };
}

// Filtro de pedidos en el panel admin: por estado y por nombre de cliente.
export function filtrarPedidos(pedidos, estado, texto) {
  const buscado = normalizarTexto(texto);
  return pedidos.filter((pedido) => {
    const coincideEstado = estado === "" || pedido.estado === estado;
    const coincideTexto =
      buscado === "" ||
      normalizarTexto(pedido.clienteNombre).includes(buscado) ||
      normalizarTexto(pedido.productoNombre).includes(buscado);
    return coincideEstado && coincideTexto;
  });
}

// -----------------------------------------------------------------------------
// VALIDACIONES (devuelven un objeto { campo: "mensaje" }; vacío = todo bien)
// -----------------------------------------------------------------------------
const PATRON_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PATRON_MEDIDAS = /^\d+(\.\d+)?(x\d+(\.\d+)?){1,2} cm$/; // "18x19 cm" o "15x8x8 cm"

export function validarLogin(datos) {
  const errores = {};
  if (!PATRON_CORREO.test(datos.correo)) {
    errores.correo = "Ingresa un correo válido.";
  }
  if (datos.contrasena.length < 6) {
    errores.contrasena = "La contraseña tiene al menos 6 caracteres.";
  }
  return errores;
}

export function validarRegistro(datos) {
  const errores = validarLogin(datos);
  if (datos.nombre.trim().length < 3) {
    errores.nombre = "Escribe tu nombre (mínimo 3 letras).";
  }
  if (datos.confirmacion !== datos.contrasena) {
    errores.confirmacion = "Las contraseñas no coinciden.";
  }
  return errores;
}

export function validarPedido(datos) {
  const errores = {};

  if (!SERVICIOS[datos.servicio]) {
    errores.servicio = "Selecciona un tipo de servicio.";
  }
  if (datos.servicio === "catalogo" && !datos.producto) {
    errores.servicio = "Elige un producto desde el catálogo.";
  }
  if (MATERIALES[datos.material] === undefined) {
    errores.material = "Selecciona un material.";
  }
  if (!Number.isInteger(datos.infill) || datos.infill < 10 || datos.infill > 100) {
    errores.infill = "El relleno debe ser un número entero entre 10 y 100.";
  }
  if (!Number.isInteger(datos.cantidad) || datos.cantidad < 1 || datos.cantidad > 50) {
    errores.cantidad = "La cantidad debe estar entre 1 y 50 piezas.";
  }

  // Las medidas solo se piden para piezas personalizadas.
  if (datos.servicio !== "catalogo") {
    ["largo", "ancho", "alto"].forEach((campo) => {
      const valor = datos[campo];
      if (!(valor >= 1 && valor <= MEDIDA_MAXIMA_CM)) {
        errores[campo] = "Entre 1 y " + MEDIDA_MAXIMA_CM + " cm.";
      }
    });
  }

  if (datos.descripcion.trim().length < 15) {
    errores.descripcion = "Describe tu pedido con al menos 15 caracteres.";
  }
  return errores;
}

export function validarProducto(datos) {
  const errores = {};
  if (datos.nombre.trim().length < 3) {
    errores.nombre = "El nombre debe tener al menos 3 caracteres.";
  }
  if (datos.categoria.trim() === "") {
    errores.categoria = "Indica la categoría.";
  }
  if (!(datos.precio > 0 && datos.precio <= 500)) {
    errores.precio = "El precio debe ser mayor que 0 y máximo $500.";
  }
  if (!Number.isInteger(datos.tiempo) || datos.tiempo <= 0) {
    errores.tiempo = "Indica el tiempo en minutos (número entero mayor que 0).";
  }
  if (!Number.isInteger(datos.infill) || datos.infill < 10 || datos.infill > 100) {
    errores.infill = "El relleno debe estar entre 10 y 100 %.";
  }
  if (!PATRON_MEDIDAS.test(datos.medidas)) {
    errores.medidas = 'Usa el formato "18x19 cm" o "15x8x8 cm".';
  }
  if (datos.imagen1.trim() === "") {
    errores.imagen1 = "La imagen 1 es obligatoria.";
  }
  if (datos.imagen2.trim() === "") {
    errores.imagen2 = "La imagen 2 es obligatoria.";
  }
  if (datos.linkSTL !== "" && !datos.linkSTL.startsWith("https://")) {
    errores.linkSTL = "El enlace debe comenzar con https://";
  }
  return errores;
}

// Devuelve true si el objeto de errores no tiene propiedades.
export function sinErrores(errores) {
  return Object.keys(errores).length === 0;
}

// -----------------------------------------------------------------------------
// TRADUCCIÓN DE ERRORES DE FIREBASE A MENSAJES CLAROS
// -----------------------------------------------------------------------------
export function mensajeDeError(error) {
  const mensajes = {
    "auth/email-already-in-use": "Ese correo ya está registrado. Inicia sesión.",
    "auth/invalid-email": "El correo no es válido.",
    "auth/weak-password": "La contraseña debe tener al menos 6 caracteres.",
    "auth/invalid-credential": "Correo o contraseña incorrectos.",
    "auth/wrong-password": "Correo o contraseña incorrectos.",
    "auth/user-not-found": "Correo o contraseña incorrectos.",
    "auth/too-many-requests": "Demasiados intentos. Espera un momento e intenta de nuevo.",
    "auth/network-request-failed": "Sin conexión a internet. Revisa tu red.",
    "permission-denied": "No tienes permisos para realizar esta operación.",
    unavailable: "El servidor no está disponible. Intenta más tarde."
  };
  if (error && mensajes[error.code]) {
    return mensajes[error.code];
  }
  console.error(error); // Para depurar en la consola del navegador.
  return "Ocurrió un error inesperado. Intenta de nuevo.";
}
