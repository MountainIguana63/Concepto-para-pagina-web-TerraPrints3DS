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
export const ESTADOS = ["En espera", "Imprimiendo", "Completado"]; // Arreglo con los 3 estados de un pedido; llena el <select> de estado del admin (Clase 11 · Arreglos)

// Nombre visible de cada servicio + cargo fijo en USD.
export const SERVICIOS = { // Objeto de objetos: cada servicio tiene nombre visible y cargo fijo (Clase 11 · Objetos anidados)
  catalogo: { nombre: "Producto del catálogo", cargo: 0 }, // Pedir un producto ya hecho del catálogo: sin cargo extra
  impresion: { nombre: "Impresión de archivo STL/OBJ propio", cargo: 2.0 }, // Imprimir un archivo propio del cliente: $2 de cargo
  modelado: { nombre: "Modelado 3D desde cero", cargo: 15.0 }, // Diseñar la pieza desde cero: $15 de cargo
  modificacion: { nombre: "Modificación de archivo existente", cargo: 8.0 } // Modificar un archivo existente: $8 de cargo
}; // Fin del objeto SERVICIOS

// Factor de costo según el filamento (PLA+ es la base).
export const MATERIALES = { // Multiplicador de precio según el filamento elegido en el formulario de pedidos
  "PLA+": 1.0, // PLA+ es el precio base (x1)
  PETG: 1.2, // PETG cuesta 20% más (x1.2)
  TPU: 1.5 // TPU (flexible) cuesta 50% más (x1.5)
}; // Fin del objeto MATERIALES

const TARIFA_POR_HORA = 0.9;   // USD por hora de máquina
const MINUTOS_POR_CM3 = 0.6;   // velocidad promedio de la impresora
export const MEDIDA_MAXIMA_CM = 25; // volumen de impresión de la máquina (25 cm por lado)

// -----------------------------------------------------------------------------
// FORMATOS
// -----------------------------------------------------------------------------

// 14.5 → "$14.50"
export function formatearPrecio(valor) { // Convierte un número en precio con 2 decimales; se usa en tarjetas, tablas e indicadores (Clase 12 · Funciones)
  return "$" + Number(valor).toFixed(2); // Number() convierte a número y toFixed(2) deja 2 decimales; + concatena el signo $ (Clase 10 · Coerción de tipos)
} // Fin de formatearPrecio

// 200 → "3h 20m"
export function formatearTiempo(minutos) { // Convierte minutos en el texto "Xh YYm" que se ve en las tarjetas
  const total = Math.round(Number(minutos) || 0); // Si no es un número válido usa 0 (Clase 10 · operador || y valores falsy)
  const horas = Math.floor(total / 60); // Math.floor divide y quita los decimales: horas completas (Clase 10 · Operadores aritméticos)
  const resto = total % 60; // % (módulo) da los minutos que sobran
  return horas + "h " + String(resto).padStart(2, "0") + "m"; // padStart(2,"0") convierte 5 en "05" (Clase 11 · Cadenas)
} // Fin de formatearTiempo

// Timestamp de Firestore → "11/11/2026"
export function formatearFecha(fecha) { // Convierte la fecha guardada en Firestore a texto como "13/11/2026" (columna Fecha y Mis pedidos)
  if (!fecha || typeof fecha.toDate !== "function") { // Si la fecha aún no llega o no es del tipo esperado... (Clase 10 · typeof y operadores lógicos)
    return "Procesando…"; // serverTimestamp aún no asignado
  } // Fin del if
  return fecha.toDate().toLocaleDateString("es-SV"); // toDate() la vuelve fecha de JS y toLocaleDateString la escribe al estilo de El Salvador
} // Fin de formatearFecha

// Quita mayúsculas y tildes para que "Búho" coincida con "buho".
export function normalizarTexto(texto) { // Prepara textos para comparar en el buscador del catálogo y del admin
  return String(texto || "") // Convierte a texto; si viene vacío usa "" (Clase 10 · Coerción)
    .toLowerCase() // Todo a minúsculas (Clase 11 · Convirtiendo a mayúsculas y minúsculas)
    .normalize("NFD") // Separa las letras de sus tildes
    .replace(/[̀-ͯ]/g, "") // Borra las tildes con una expresión regular (Clase 11 · Reemplazando contenido de una cadena)
    .trim(); // Quita espacios al inicio y al final (Clase 11 · trim)
} // Fin de normalizarTexto

// -----------------------------------------------------------------------------
// CATÁLOGO: BÚSQUEDA, FILTRADO Y ORDENAMIENTO
// -----------------------------------------------------------------------------

// Devuelve las categorías sin repetir (para llenar el <select> de filtros).
export function obtenerCategorias(productos) { // Arma la lista de categorías para el <select> "Categoría" del catálogo
  const categorias = []; // Arreglo vacío para ir guardando categorías (Clase 11 · Arreglos)
  productos.forEach((producto) => { // Recorre cada producto (Clase 11 · forEach; Clase 12 · Función flecha)
    if (producto.categoria && !categorias.includes(producto.categoria)) { // Si tiene categoría Y todavía no está en la lista (includes)... (Clase 11 · Buscar elementos en un arreglo)
      categorias.push(producto.categoria); // ...la agrega al final (push)
    } // Fin del if
  }); // Fin del forEach
  return categorias.sort(); // Devuelve las categorías en orden alfabético (Clase 11 · Ordenar un arreglo)
} // Fin de obtenerCategorias

// filtros = { texto, categoria, soloMulticolor }
export function filtrarProductos(productos, filtros) { // PROCESAMIENTO DE DATOS #1: filtra el catálogo según lo que la persona escribe y marca
  const texto = normalizarTexto(filtros.texto); // Prepara el texto buscado (sin mayúsculas ni tildes)

  return productos.filter((producto) => { // filter() deja solo los productos que cumplen las condiciones (Programación funcional · filter)
    // 1. Búsqueda por nombre o por tipo (categoría).
    const coincideTexto = // Coincide si no se buscó nada...
      texto === "" || // ...o (||) si el texto está vacío
      normalizarTexto(producto.nombre).includes(texto) || // ...o si el nombre contiene el texto (Clase 11 · includes en cadenas)
      normalizarTexto(producto.categoria).includes(texto); // ...o si la categoría contiene el texto

    // 2. Filtro por categoría exacta.
    const coincideCategoria = filtros.categoria === "" || producto.categoria === filtros.categoria; // Coincide si se eligió "Todas" o si la categoría es exactamente la elegida (Clase 10 · === y ||)

    // 3. Solo productos multicolor (si la casilla está marcada).
    const coincideColor = !filtros.soloMulticolor || producto.multicolor === true; // Coincide si la casilla "Solo multicolor" no está marcada o si el producto es multicolor (Clase 10 · ! negación)

    return coincideTexto && coincideCategoria && coincideColor; // El producto se queda solo si cumple las TRES condiciones (Clase 10 · operador &&)
  }); // Fin del filter
} // Fin de filtrarProductos

// criterio: "nombre" | "precio-asc" | "precio-desc" | "tiempo-asc"
export function ordenarProductos(productos, criterio) { // PROCESAMIENTO DE DATOS #2: ordena el catálogo según el <select> "Ordenar por"
  const copia = [...productos]; // No modificamos el arreglo original.

  switch (criterio) { // Elige cómo ordenar según el criterio (Clase 10 · switch)
    case "precio-asc": // Precio de menor a mayor
      return copia.sort((a, b) => a.precio - b.precio); // sort() con función comparadora: a - b ordena ascendente (Clase 11 · Ordenar un arreglo)
    case "precio-desc": // Precio de mayor a menor
      return copia.sort((a, b) => b.precio - a.precio); // b - a ordena descendente
    case "tiempo-asc": // Tiempo de impresión de menor a mayor
      return copia.sort((a, b) => a.tiempo - b.tiempo); // Compara los minutos de cada producto
    default: // Si no es ninguno de los anteriores (Clase 10 · default del switch)
      return copia.sort((a, b) => a.nombre.localeCompare(b.nombre)); // Ordena por nombre en orden alfabético respetando tildes (localeCompare)
  } // Fin del switch
} // Fin de ordenarProductos

// -----------------------------------------------------------------------------
// COTIZACIÓN AUTOMÁTICA DE UN PEDIDO (regla del negocio)
// datos = { servicio, material, infill, largo, ancho, alto, cantidad, producto }
// Devuelve { precio, minutos, gramos? }
// -----------------------------------------------------------------------------
export function calcularCotizacion(datos) { // REGLA DEL NEGOCIO: calcula precio y tiempo en vivo mientras el cliente llena el pedido
  const cantidad = Number(datos.cantidad) || 0; // Cantidad de piezas; si viene vacía usa 0
  const factorMaterial = MATERIALES[datos.material] || 1; // Busca el multiplicador del material; si no hay, usa 1 (Clase 11 · acceso con corchetes)

  // Caso 1: producto del catálogo → su precio y tiempo por la cantidad.
  if (datos.servicio === "catalogo" && datos.producto) { // Si eligió un producto del catálogo... (Clase 10 · if con &&)
    return { // Devuelve un objeto con precio y minutos (Clase 12 · return)
      precio: redondear(datos.producto.precio * cantidad * factorMaterial), // Precio del producto x cantidad x factor del material
      minutos: datos.producto.tiempo * cantidad // Tiempo del producto x cantidad
    }; // Fin del objeto
  } // Fin del if

  // Caso 2: pieza personalizada → se estima a partir del volumen y el relleno.
  const volumen = Number(datos.largo) * Number(datos.ancho) * Number(datos.alto); // cm³
  const infill = Number(datos.infill) || 0; // Porcentaje de relleno como número
  if (!volumen || !cantidad) { // Si falta el volumen o la cantidad (0 es falsy)... (Clase 10 · Falsy)
    return { precio: 0, minutos: 0 }; // ...todavía no se puede cotizar: muestra $0.00
  } // Fin del if

  // Más relleno = más tiempo. 0.4 representa paredes y capas superiores.
  const minutosPorPieza = Math.round(volumen * MINUTOS_POR_CM3 * (0.4 + infill / 100)); // Minutos por pieza según el volumen y el relleno (más relleno = más tiempo)
  const costoPorPieza = (minutosPorPieza / 60) * TARIFA_POR_HORA * factorMaterial; // Costo = horas de máquina x tarifa x factor del material
  const cargoServicio = SERVICIOS[datos.servicio] ? SERVICIOS[datos.servicio].cargo : 0; // Cargo fijo del servicio; si no existe, 0 (Clase 10 · Operador condicional ternario)

  return { // Devuelve el resultado que se muestra en el recuadro de cotización
    precio: redondear(cargoServicio + costoPorPieza * cantidad), // Precio total = cargo del servicio + costo de todas las piezas
    minutos: minutosPorPieza * cantidad // Tiempo total de todas las piezas
  }; // Fin del objeto
} // Fin de calcularCotizacion

function redondear(valor) { // Ayuda interna para dejar el precio en 2 decimales
  return Math.round(valor * 100) / 100; // Multiplica por 100, redondea y divide entre 100 (Clase 10 · Operadores)
} // Fin de redondear

// -----------------------------------------------------------------------------
// PEDIDOS: ORDENAMIENTO, AGRUPACIÓN E INDICADORES
// -----------------------------------------------------------------------------

// Del más reciente al más antiguo.
export function ordenarPorFecha(pedidos) { // Ordena "Mis pedidos" del más reciente al más antiguo
  return [...pedidos].sort((a, b) => obtenerMilisegundos(b.fecha) - obtenerMilisegundos(a.fecha)); // Copia con spread y ordena comparando la fecha en milisegundos (Clase 11 · sort)
} // Fin de ordenarPorFecha

function obtenerMilisegundos(fecha) { // Ayuda interna: convierte la fecha de Firestore a milisegundos
  return fecha && typeof fecha.toMillis === "function" ? fecha.toMillis() : 0; // Si hay fecha válida usa toMillis(); si no, 0 (Clase 10 · Operador ternario)
} // Fin de obtenerMilisegundos

// Agrupa con reduce(): cuántos pedidos hay por estado y montos totales.
export function resumirPedidos(pedidos) { // PROCESAMIENTO DE DATOS #3 (indicadores): cuenta pedidos por estado y suma montos
  const inicial = { // Objeto inicial con todos los contadores en cero (Clase 11 · Objetos)
    total: pedidos.length, // Total de pedidos (length)
    porEstado: { "En espera": 0, Imprimiendo: 0, Completado: 0 }, // Un contador por cada estado
    montoTotal: 0, // Suma de todos los precios
    montoCompletado: 0, // Suma de lo que ya se entregó (ingresos)
    minutosPendientes: 0 // Minutos de máquina que faltan
  }; // Fin del objeto inicial

  return pedidos.reduce((resumen, pedido) => { // reduce() recorre los pedidos acumulando resultados en "resumen" (Programación funcional · reduce)
    const precio = Number(pedido.precioEstimado) || 0; // Precio del pedido como número

    if (resumen.porEstado[pedido.estado] !== undefined) { // Si el estado es uno de los conocidos...
      resumen.porEstado[pedido.estado] += 1; // ...suma 1 a su contador (Clase 10 · Operadores de asignación +=)
    } // Fin del if
    resumen.montoTotal += precio; // Suma el precio al total

    if (pedido.estado === "Completado") { // Si ya está completado... (Clase 10 · if-else)
      resumen.montoCompletado += precio; // ...cuenta como ingreso
    } else { // Si no...
      // Tiempo de máquina que todavía falta por imprimir.
      resumen.minutosPendientes += Number(pedido.minutosEstimados) || 0; // ...sus minutos cuentan como trabajo pendiente
    } // Fin del if-else
    return resumen; // Devuelve el acumulado para el siguiente pedido
  }, inicial); // Fin de reduce; "inicial" es el valor de arranque
} // Fin de resumirPedidos

// Indicadores del catálogo para el panel admin.
export function resumirCatalogo(productos) { // Indicadores del catálogo para el panel admin: cantidad, precio promedio y multicolor
  if (productos.length === 0) { // Si no hay productos... (evita dividir entre 0)
    return { cantidad: 0, precioPromedio: 0, multicolor: 0 }; // ...devuelve todo en cero
  } // Fin del if
  const suma = productos.reduce((acumulado, p) => acumulado + Number(p.precio), 0); // Suma todos los precios con reduce (Programación funcional)
  return { // Devuelve el resumen
    cantidad: productos.length, // Cuántos productos hay
    precioPromedio: suma / productos.length, // Promedio = suma / cantidad
    multicolor: productos.filter((p) => p.multicolor).length // Cuántos son multicolor: filtra y cuenta (Clase 11 · filter + length)
  }; // Fin del objeto
} // Fin de resumirCatalogo

// Filtro de pedidos en el panel admin: por estado y por nombre de cliente.
export function filtrarPedidos(pedidos, estado, texto) { // PROCESAMIENTO DE DATOS #4: filtro y búsqueda de la tabla de pedidos del admin
  const buscado = normalizarTexto(texto); // Prepara el texto buscado
  return pedidos.filter((pedido) => { // Deja solo los pedidos que coinciden (filter)
    const coincideEstado = estado === "" || pedido.estado === estado; // Coincide si se eligió "Todos" o si el estado es el elegido
    const coincideTexto = // Coincide por texto si...
      buscado === "" || // ...no se buscó nada
      normalizarTexto(pedido.clienteNombre).includes(buscado) || // ...o el nombre del cliente contiene el texto
      normalizarTexto(pedido.productoNombre).includes(buscado); // ...o el producto contiene el texto
    return coincideEstado && coincideTexto; // Debe cumplir ambas condiciones (&&)
  }); // Fin del filter
} // Fin de filtrarPedidos

// -----------------------------------------------------------------------------
// VALIDACIONES (devuelven un objeto { campo: "mensaje" }; vacío = todo bien)
// -----------------------------------------------------------------------------
const PATRON_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; // Expresión regular: texto + @ + dominio + . + terminación (valida correos)
const PATRON_MEDIDAS = /^\d+(\.\d+)?(x\d+(\.\d+)?){1,2} cm$/; // "18x19 cm" o "15x8x8 cm"

export function validarLogin(datos) { // VALIDACIÓN del formulario "Iniciar sesión"; devuelve un objeto con los errores
  const errores = {}; // Objeto vacío: si sigue vacío, no hay errores
  if (!PATRON_CORREO.test(datos.correo)) { // test() revisa si el correo cumple el patrón; ! lo niega (Clase 10 · Operadores lógicos)
    errores.correo = "Ingresa un correo válido."; // Agrega la propiedad "correo" con su mensaje (Clase 11 · Añadiendo propiedades a un objeto)
  } // Fin del if
  if (datos.contrasena.length < 6) { // Si la contraseña tiene menos de 6 caracteres (Clase 11 · Longitud de una cadena)
    errores.contrasena = "La contraseña tiene al menos 6 caracteres."; // Mensaje que se ve debajo del campo contraseña
  } // Fin del if
  return errores; // Devuelve los errores encontrados
} // Fin de validarLogin

export function validarRegistro(datos) { // VALIDACIÓN del formulario "Crear cuenta"
  const errores = validarLogin(datos); // Reutiliza las reglas del login para correo y contraseña (Clase 12 · Funciones reutilizables)
  if (datos.nombre.trim().length < 3) { // Nombre de al menos 3 letras sin contar espacios (trim + length)
    errores.nombre = "Escribe tu nombre (mínimo 3 letras)."; // Mensaje debajo del campo nombre
  } // Fin del if
  if (datos.confirmacion !== datos.contrasena) { // Si la confirmación es distinta a la contraseña (Clase 10 · !==)
    errores.confirmacion = "Las contraseñas no coinciden."; // Mensaje debajo del campo confirmar
  } // Fin del if
  return errores; // Devuelve los errores
} // Fin de validarRegistro

export function validarPedido(datos) { // VALIDACIÓN del formulario de pedidos (regla: nada inválido llega a la base)
  const errores = {}; // Objeto de errores vacío

  if (!SERVICIOS[datos.servicio]) { // Si el servicio no existe en SERVICIOS...
    errores.servicio = "Selecciona un tipo de servicio."; // ...pide elegir uno
  } // Fin del if
  if (datos.servicio === "catalogo" && !datos.producto) { // Si dice "catálogo" pero no hay producto elegido...
    errores.servicio = "Elige un producto desde el catálogo."; // ...pide elegir un producto
  } // Fin del if
  if (MATERIALES[datos.material] === undefined) { // Si el material no está en la lista (undefined)...
    errores.material = "Selecciona un material."; // ...pide elegir material
  } // Fin del if
  if (!Number.isInteger(datos.infill) || datos.infill < 10 || datos.infill > 100) { // El relleno debe ser entero entre 10 y 100 (Number.isInteger y operadores relacionales)
    errores.infill = "El relleno debe ser un número entero entre 10 y 100."; // Mensaje debajo del campo relleno
  } // Fin del if
  if (!Number.isInteger(datos.cantidad) || datos.cantidad < 1 || datos.cantidad > 50) { // La cantidad debe ser entera entre 1 y 50
    errores.cantidad = "La cantidad debe estar entre 1 y 50 piezas."; // Mensaje debajo del campo cantidad
  } // Fin del if

  // Las medidas solo se piden para piezas personalizadas.
  if (datos.servicio !== "catalogo") { // Solo para piezas personalizadas...
    ["largo", "ancho", "alto"].forEach((campo) => { // ...revisa las 3 medidas con un forEach sobre un arreglo de nombres (Clase 11 · Arreglos)
      const valor = datos[campo]; // Lee el valor del campo usando corchetes (Clase 11 · Acceso a propiedades)
      if (!(valor >= 1 && valor <= MEDIDA_MAXIMA_CM)) { // Debe estar entre 1 y 25 cm (tamaño de la máquina)
        errores[campo] = "Entre 1 y " + MEDIDA_MAXIMA_CM + " cm."; // Mensaje debajo de largo, ancho o alto
      } // Fin del if
    }); // Fin del forEach
  } // Fin del if

  if (datos.descripcion.trim().length < 15) { // La descripción debe tener al menos 15 caracteres
    errores.descripcion = "Describe tu pedido con al menos 15 caracteres."; // Mensaje debajo de la descripción
  } // Fin del if
  return errores; // Devuelve los errores
} // Fin de validarPedido

export function validarProducto(datos) { // VALIDACIÓN del formulario de productos del panel admin (mismas reglas que firestore.rules)
  const errores = {}; // Objeto de errores vacío
  if (datos.nombre.trim().length < 3) { // Nombre de al menos 3 caracteres
    errores.nombre = "El nombre debe tener al menos 3 caracteres."; // Mensaje debajo de nombre
  } // Fin del if
  if (datos.categoria.trim() === "") { // La categoría no puede quedar vacía
    errores.categoria = "Indica la categoría."; // Mensaje debajo de categoría
  } // Fin del if
  if (!(datos.precio > 0 && datos.precio <= 500)) { // El precio debe ser mayor que 0 y máximo 500
    errores.precio = "El precio debe ser mayor que 0 y máximo $500."; // Mensaje debajo de precio
  } // Fin del if
  if (!Number.isInteger(datos.tiempo) || datos.tiempo <= 0) { // El tiempo debe ser un número entero mayor que 0
    errores.tiempo = "Indica el tiempo en minutos (número entero mayor que 0)."; // Mensaje debajo de tiempo
  } // Fin del if
  if (!Number.isInteger(datos.infill) || datos.infill < 10 || datos.infill > 100) { // El relleno debe ser entero entre 10 y 100
    errores.infill = "El relleno debe estar entre 10 y 100 %."; // Mensaje debajo de relleno
  } // Fin del if
  if (!PATRON_MEDIDAS.test(datos.medidas)) { // Las medidas deben tener el formato "18x19 cm" (expresión regular)
    errores.medidas = 'Usa el formato "18x19 cm" o "15x8x8 cm".'; // Mensaje debajo de medidas
  } // Fin del if
  if (datos.imagen1.trim() === "") { // La imagen 1 es obligatoria
    errores.imagen1 = "La imagen 1 es obligatoria."; // Mensaje debajo de imagen 1
  } // Fin del if
  if (datos.imagen2.trim() === "") { // La imagen 2 es obligatoria
    errores.imagen2 = "La imagen 2 es obligatoria."; // Mensaje debajo de imagen 2
  } // Fin del if
  if (datos.linkSTL !== "" && !datos.linkSTL.startsWith("https://")) { // El enlace STL es opcional, pero si se escribe debe empezar con https:// (startsWith)
    errores.linkSTL = "El enlace debe comenzar con https://"; // Mensaje debajo del enlace STL
  } // Fin del if
  return errores; // Devuelve los errores
} // Fin de validarProducto

// Devuelve true si el objeto de errores no tiene propiedades.
export function sinErrores(errores) { // main.js la usa para saber si puede enviar un formulario
  return Object.keys(errores).length === 0; // Object.keys() da la lista de campos con error; si mide 0, todo está bien (Clase 11 · Recorrer un objeto)
} // Fin de sinErrores

// -----------------------------------------------------------------------------
// TRADUCCIÓN DE ERRORES DE FIREBASE A MENSAJES CLAROS
// -----------------------------------------------------------------------------
export function mensajeDeError(error) { // Convierte los códigos de error de Firebase en frases claras para las notificaciones rojas
  const mensajes = { // Objeto que funciona como diccionario: código → mensaje (Clase 11 · Objetos)
    "auth/email-already-in-use": "Ese correo ya está registrado. Inicia sesión.", // Registro con un correo que ya existe
    "auth/invalid-email": "El correo no es válido.", // Correo mal escrito
    "auth/weak-password": "La contraseña debe tener al menos 6 caracteres.", // Contraseña demasiado corta
    "auth/invalid-credential": "Correo o contraseña incorrectos.", // Correo o contraseña incorrectos (versión nueva de Firebase)
    "auth/wrong-password": "Correo o contraseña incorrectos.", // Contraseña incorrecta (versión anterior de Firebase)
    "auth/user-not-found": "Correo o contraseña incorrectos.", // Usuario no encontrado: mismo mensaje para no revelar qué correos existen
    "auth/too-many-requests": "Demasiados intentos. Espera un momento e intenta de nuevo.", // Demasiados intentos seguidos
    "auth/network-request-failed": "Sin conexión a internet. Revisa tu red.", // Sin internet
    "permission-denied": "No tienes permisos para realizar esta operación.", // Las reglas de Firestore rechazaron la operación (por ejemplo, un cliente intentando ser admin)
    unavailable: "El servidor no está disponible. Intenta más tarde." // El servidor no responde
  }; // Fin del diccionario
  if (error && mensajes[error.code]) { // Si el error tiene un código conocido...
    return mensajes[error.code]; // ...devuelve su mensaje en español
  } // Fin del if
  console.error(error); // Para depurar en la consola del navegador.
  return "Ocurrió un error inesperado. Intenta de nuevo."; // Mensaje genérico si el error es desconocido
} // Fin de mensajeDeError
