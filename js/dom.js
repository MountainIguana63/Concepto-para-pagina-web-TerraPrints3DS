// =============================================================================
// dom.js  →  COMPORTAMIENTO DE LA INTERFAZ (manipulación del DOM)
// -----------------------------------------------------------------------------
// Todo lo que se DIBUJA en pantalla a partir de datos está aquí:
//   tarjetas de productos (2 imágenes), tablas del panel admin, lista de
//   pedidos, indicadores, spinners de carga, notificaciones, estados vacíos y
//   mensajes de error de los formularios.
//
// Se usa createElement() + textContent (visto en la clase del DOM) en lugar de
// innerHTML con datos: así un texto escrito por un usuario nunca se interpreta
// como código HTML (evita inyección de código / XSS).
// Estas funciones NO llaman a Firebase: reciben los datos ya listos y, cuando
// hay botones, reciben también la función (callback) que deben ejecutar.
// =============================================================================

import { formatearPrecio, formatearTiempo, formatearFecha, ESTADOS, SERVICIOS } from "./logica.js"; // Trae funciones de formato y constantes de logica.js (Clase 15 · Módulos)

// -----------------------------------------------------------------------------
// AYUDA GENERAL: crea un elemento con clase y texto en una sola línea.
// -----------------------------------------------------------------------------
function crear(etiqueta, clase = "", texto = "") { // Función de ayuda que usan TODAS las demás para crear elementos; parámetros por defecto "" (Clase 12 · Parámetros por defecto)
  const elemento = document.createElement(etiqueta); // Crea una etiqueta HTML nueva en memoria, por ejemplo <div> (Clase 14 DOM · Crear elementos HTML)
  if (clase) elemento.className = clase; // Si se pasó una clase, se la pone para que styles.css la pinte (Clase 14 DOM · Trabajar con clases CSS)
  if (texto !== "") elemento.textContent = texto; // Si se pasó texto, lo escribe con textContent: nunca se interpreta como HTML (seguridad)
  return elemento; // Devuelve el elemento listo para insertarlo en la página
} // Fin de crear

// =============================================================================
// 1. RETROALIMENTACIÓN: notificaciones, carga, vacío y error
// =============================================================================

// Notificación flotante que desaparece sola a los 4.5 s (setTimeout).
// tipo: "exito" | "error" | "info"
export function mostrarNotificacion(texto, tipo = "exito") { // Muestra los avisos verdes/rojos/azules de la esquina ("Pedido enviado", "Correo incorrecto"...)
  let zona = document.querySelector("#notificaciones"); // Busca la zona de avisos en la página (Clase 14 DOM · Seleccionar elementos con querySelector)
  if (!zona) { // Si todavía no existe (primera notificación)... (Clase 10 · if y !)
    zona = crear("div", "zona-notificaciones"); // ...la crea
    zona.id = "notificaciones"; // Le pone id para encontrarla la próxima vez
    zona.setAttribute("aria-live", "polite"); // Los lectores de pantalla la anuncian.
    document.body.append(zona); // La agrega al final del <body> (Clase 14 DOM · Insertar elementos)
  } // Fin del if

  const aviso = crear("div", "notificacion notificacion-" + tipo, texto); // Crea el aviso con la clase del tipo (exito, error o info) para cambiar su color
  aviso.setAttribute("role", tipo === "error" ? "alert" : "status"); // Atributo de accesibilidad según el tipo (Clase 14 DOM · Gestionar atributos; Clase 10 · ternario)
  zona.append(aviso); // Lo inserta en la zona de avisos: aquí aparece en pantalla

  setTimeout(() => aviso.remove(), 4500); // A los 4.5 segundos lo quita solo (JS Asíncrono · setTimeout; Clase 12 · Función flecha)
} // Fin de mostrarNotificacion

// Reemplaza el contenido de un contenedor por un spinner de carga.
export function mostrarCargando(contenedor, texto = "Cargando…") { // ESTADO DE CARGA: muestra el circulito girando mientras Firebase responde
  const caja = crear("div", "estado-carga"); // Caja que contendrá el spinner y el texto
  caja.setAttribute("role", "status"); // Avisa a lectores de pantalla que algo está cargando
  caja.append(crear("span", "spinner"), crear("p", "", texto)); // Mete el spinner y el texto "Cargando…" dentro de la caja (append acepta varios elementos)
  contenedor.replaceChildren(caja); // Borra lo que había en el contenedor y pone la caja (Clase 14 DOM · reemplazar hijos)
} // Fin de mostrarCargando

// Mensaje cuando no hay datos que mostrar. enlace = { href, texto } (opcional).
export function mostrarEstadoVacio(contenedor, texto, enlace = null) { // ESTADO VACÍO: lo que se ve cuando no hay datos ("Todavía no has hecho pedidos")
  const caja = crear("div", "estado-vacio"); // Caja del mensaje
  caja.append(crear("p", "estado-vacio-icono", "📭"), crear("p", "", texto)); // Ícono de buzón y el texto recibido
  if (enlace) { // Si se pasó un enlace (por ejemplo "Ver catálogo")...
    const a = crear("a", "boton-cta", enlace.texto); // ...crea el botón con su texto
    a.href = enlace.href; // ...le pone a dónde lleva (Clase 14 DOM · Modificar atributos)
    caja.append(a); // ...y lo agrega a la caja
  } // Fin del if
  contenedor.replaceChildren(caja); // Reemplaza el contenido del contenedor por el mensaje
} // Fin de mostrarEstadoVacio

// Mensaje de error dentro de un contenedor, con botón opcional "Reintentar".
export function mostrarErrorEnContenedor(contenedor, texto, alReintentar = null) { // ESTADO DE ERROR: mensaje rojo dentro de una sección cuando falla Firebase
  const caja = crear("div", "estado-error"); // Caja del error
  caja.setAttribute("role", "alert"); // Los lectores de pantalla lo anuncian de inmediato
  caja.append(crear("p", "", "⚠️ " + texto)); // Texto del error con ícono de advertencia (Clase 11 · Concatenación)
  if (alReintentar) { // Si se pasó qué hacer al reintentar...
    const boton = crear("button", "boton-cta boton-secundario", "Reintentar"); // ...crea el botón "Reintentar"
    boton.type = "button"; // type="button" evita que envíe un formulario
    boton.addEventListener("click", alReintentar); // Al hacer clic vuelve a ejecutar la función que falló (Clase 12 · addEventListener; la función se pasa como parámetro = callback)
    caja.append(boton); // Agrega el botón a la caja
  } // Fin del if
  contenedor.replaceChildren(caja); // Muestra la caja de error en lugar del contenido
} // Fin de mostrarErrorEnContenedor

// Deshabilita un botón mientras se espera una operación asíncrona.
export function cambiarEstadoBoton(boton, ocupado, textoOcupado = "Procesando…") { // Cambia un botón a "Procesando…" y lo bloquea mientras se espera a Firebase (evita doble clic)
  if (ocupado) { // Si está ocupado... (Clase 10 · if-else)
    boton.dataset.textoOriginal = boton.textContent; // Guardamos el texto original.
    boton.textContent = textoOcupado; // Cambia el texto del botón, por ejemplo "Enviando pedido…"
    boton.disabled = true; // Lo deshabilita para que no se pueda presionar otra vez
  } else { // Si ya terminó...
    boton.textContent = boton.dataset.textoOriginal || boton.textContent; // ...recupera el texto original guardado en data-texto-original (Clase 14 DOM · Atributos de datos data-*)
    boton.disabled = false; // ...y lo vuelve a habilitar
  } // Fin del if-else
} // Fin de cambiarEstadoBoton

// Banner que avisa que falta pegar la configuración de Firebase.
export function mostrarAvisoConfiguracion() { // Barra amarilla de aviso si falta la configuración de Firebase (solo se ve en desarrollo)
  const aviso = crear( // Crea el aviso con crear()
    "div", // Etiqueta div
    "aviso-configuracion", // Clase CSS del aviso
    "⚙️ Falta configurar Firebase: pega los datos de tu proyecto en js/firebase-config.js (ver README)."
  ); // Fin de los parámetros
  aviso.setAttribute("role", "alert"); // Atributo de accesibilidad
  document.body.prepend(aviso); // Lo pone al INICIO del <body> (Clase 14 DOM · prepend)
} // Fin de mostrarAvisoConfiguracion

// =============================================================================
// 2. NAVEGACIÓN SEGÚN LA SESIÓN Y EL ROL
// =============================================================================
export function actualizarNavegacion(perfil, alCerrarSesion) { // MENÚ SEGÚN ROL: cambia los enlaces del menú según quién entró; recibe qué hacer al cerrar sesión
  const itemSesion = document.querySelector("#nav-sesion"); // Busca el <li> de sesión que está en el HTML del menú (Clase 14 DOM · querySelector por id)
  const itemAdmin = document.querySelector("#nav-admin"); // Busca el <li> "Panel admin"
  if (!itemSesion) return; // Si la página no tiene menú, no hace nada

  // El enlace al panel solo se muestra al admin. (Ocultarlo NO es la seguridad:
  // la protección real está en las reglas de Firestore.)
  if (itemAdmin) { // Si existe el enlace al panel...
    itemAdmin.hidden = !(perfil && perfil.rol === "admin"); // ...lo oculta a todos menos al admin con la propiedad hidden (Clase 14 DOM · atributos)
  } // Fin del if

  if (!perfil) { // Si no hay sesión (perfil es null)...
    return; // Se queda el enlace "Iniciar sesión" escrito en el HTML.
  } // Fin del if

  const saludo = crear("span", "saludo-usuario", "Hola, " + perfil.nombre.split(" ")[0]); // Crea el saludo "Hola, Ana": split(" ")[0] toma solo el primer nombre (Clase 11 · Convirtiendo un string en un array)
  if (perfil.rol === "admin") { // Si es admin...
    saludo.append(crear("span", "insignia-rol", "admin")); // ...agrega una etiqueta pequeña "admin" junto al saludo
  } // Fin del if

  const botonSalir = crear("button", "boton-salir", "Cerrar sesión"); // Crea el botón "Cerrar sesión"
  botonSalir.type = "button"; // No envía formularios
  botonSalir.addEventListener("click", alCerrarSesion); // Al hacer clic ejecuta la función que mandó main.js (Clase 12 · Eventos del mouse: click)

  itemSesion.replaceChildren(saludo, botonSalir); // Cambia "Iniciar sesión" por el saludo y el botón (Clase 14 DOM · Insertar/reemplazar elementos)
} // Fin de actualizarNavegacion

// =============================================================================
// 3. CATÁLOGO: tarjetas con 2 imágenes por producto
// =============================================================================

// Crea una <img>; si la ruta falla, muestra el logo en su lugar.
function crearImagen(ruta, textoAlternativo) { // Crea una foto de producto; si la imagen no carga, pone el logo
  const imagen = document.createElement("img"); // Crea la etiqueta <img> (Clase 14 DOM · Crear elementos)
  imagen.src = ruta; // Le dice qué archivo mostrar (Clase 14 DOM · Gestionar atributos)
  imagen.alt = textoAlternativo; // Texto alternativo para accesibilidad
  imagen.loading = "lazy"; // Carga la foto solo cuando está cerca de verse (más rápido)
  imagen.addEventListener("error", () => { // Evento "error": se dispara si la foto no existe (Clase 12 · Eventos del documento)
    imagen.src = "img/logo.jpg"; // Usa el logo como reemplazo
  }, { once: true }); // { once: true } hace que el evento solo se escuche una vez
  return imagen; // Devuelve la imagen
} // Fin de crearImagen

export function crearTarjetaProducto(producto) { // AQUÍ SE DIBUJA CADA TARJETA DEL CATÁLOGO a partir de un objeto producto de Firestore
  const tarjeta = crear("article", "tarjeta-producto"); // La tarjeta es un <article> con la clase de styles.css

  // Galería con las dos fotos.
  const galeria = crear("div", "tarjeta-galeria-dos"); // Contenedor de las dos fotos
  galeria.append( // Mete las dos imágenes
    crearImagen(producto.imagen1, producto.nombre + " foto 1"), // Foto 1 con su texto alternativo (Clase 11 · Concatenación de cadenas)
    crearImagen(producto.imagen2, producto.nombre + " foto 2") // Foto 2
  ); // Fin del append

  // Cuerpo con los datos.
  const cuerpo = crear("div", "tarjeta-cuerpo"); // Parte de abajo de la tarjeta, con los datos
  cuerpo.append(crear("span", "chip-categoria", producto.categoria)); // Etiqueta de categoría (por ejemplo "Llaveros")
  cuerpo.append(crear("h3", "tarjeta-titulo", producto.nombre)); // Título con el nombre del producto

  const detalles = crear("ul", "tarjeta-detalles"); // Lista <ul> con los detalles técnicos
  detalles.append( // Agrega los dos renglones
    crear("li", "", "Tiempo: " + formatearTiempo(producto.tiempo) + " | Multicolor: " + (producto.multicolor ? "Sí" : "No")), // Tiempo formateado y Multicolor Sí/No (Clase 10 · Operador ternario)
    crear("li", "", "Relleno: " + producto.infill + "% | Medidas: " + producto.medidas) // Relleno y medidas
  ); // Fin del append
  cuerpo.append(detalles); // Mete la lista en la tarjeta

  cuerpo.append(crear("p", "tarjeta-precio", formatearPrecio(producto.precio) + " USD")); // Precio formateado "$2.50 USD"

  // Botón que lleva al formulario de pedidos con este producto seleccionado.
  const solicitar = crear("a", "boton-cta", "Solicitar este modelo"); // Crea el botón "Solicitar este modelo"
  solicitar.href = "pedidos.html?producto=" + encodeURIComponent(producto.id); // Lleva a pedidos.html con el id del producto en la URL (?producto=...), así el formulario ya lo trae elegido
  cuerpo.append(solicitar); // Lo agrega a la tarjeta

  if (producto.linkSTL) { // Si el producto tiene archivo STL... (string vacío = falsy)
    const stl = crear("a", "enlace-stl", "Ver archivo STL ↗"); // ...crea el enlace
    stl.href = producto.linkSTL; // ...a dónde lleva
    stl.target = "_blank"; // ...lo abre en otra pestaña
    stl.rel = "noopener noreferrer"; // ...por seguridad, la otra pestaña no puede controlar la nuestra
    cuerpo.append(stl); // ...lo agrega
  } // Fin del if

  tarjeta.append(galeria, cuerpo); // Arma la tarjeta: fotos arriba, datos abajo
  return tarjeta; // Devuelve la tarjeta lista (todavía no está en la página)
} // Fin de crearTarjetaProducto

export function renderizarProductos(contenedor, productos, textoVacio = "No hay productos para mostrar.") { // RENDERIZADO DEL CATÁLOGO: pone las tarjetas en la página (la usan inicio y catálogo)
  if (productos.length === 0) { // Si no hay productos (por ejemplo, la búsqueda no encontró nada)...
    mostrarEstadoVacio(contenedor, textoVacio); // ...muestra el mensaje de estado vacío
    return; // ...y termina
  } // Fin del if
  // map() convierte cada objeto producto en un elemento <article>.
  const tarjetas = productos.map((producto) => crearTarjetaProducto(producto)); // Convierte cada producto en una tarjeta (Programación funcional · map)
  contenedor.replaceChildren(...tarjetas); // Reemplaza el contenido por todas las tarjetas; ... separa el arreglo (Clase 11 · Spread)
} // Fin de renderizarProductos

export function actualizarContador(elemento, mostrados, total) { // Actualiza el texto "Mostrando 4 de 8 productos" del catálogo
  elemento.textContent = "Mostrando " + mostrados + " de " + total + " productos"; // Cambia el texto del elemento (Clase 14 DOM · textContent)
} // Fin de actualizarContador

// Llena el <select> de categorías con las que existen en la base de datos.
export function llenarSelectCategorias(select, categorias) { // Llena el <select> "Categoría" del catálogo con las categorías reales
  categorias.forEach((categoria) => { // Recorre cada categoría (forEach)
    const opcion = crear("option", "", categoria); // Crea un <option> con el nombre
    opcion.value = categoria; // Su valor es el mismo nombre
    select.append(opcion); // Lo agrega al <select> (Clase 14 DOM · Insertar elementos)
  }); // Fin del forEach
} // Fin de llenarSelectCategorias

// =============================================================================
// 4. FORMULARIOS: errores de validación
// =============================================================================

// Cada campo tiene debajo un <small data-error="nombreDelCampo">.
export function mostrarErrores(formulario, errores) { // MENSAJES DE VALIDACIÓN: escribe cada error debajo de su campo; la usan todos los formularios
  limpiarErrores(formulario); // Primero borra los errores anteriores
  let primero = null; // Aquí guardaremos el primer campo con error (let porque cambia · Clase 10 · Variables)

  for (const campo in errores) { // Recorre cada propiedad del objeto de errores (Clase 10 · for in; Clase 11 · Recorrer un objeto)
    const mensaje = formulario.querySelector('[data-error="' + campo + '"]'); // Busca el <small data-error="campo"> de ese campo (Clase 14 DOM · Atributos de datos)
    const entrada = formulario.elements[campo]; // Busca el campo del formulario por su name
    if (mensaje) mensaje.textContent = errores[campo]; // Escribe el mensaje debajo del campo
    if (entrada) { // Si encontró el campo...
      entrada.setAttribute("aria-invalid", "true"); // ...lo marca como inválido: styles.css lo pinta de rojo
      if (!primero) primero = entrada; // ...y recuerda el primero
    } // Fin del if
  } // Fin del for
  if (primero) primero.focus(); // Lleva al usuario al primer error.
} // Fin de mostrarErrores

export function limpiarErrores(formulario) { // Borra todos los mensajes de error de un formulario
  formulario.querySelectorAll("[data-error]").forEach((mensaje) => { // Busca todos los <small data-error> (Clase 14 DOM · querySelectorAll)
    mensaje.textContent = ""; // Les borra el texto
  }); // Fin del forEach
  formulario.querySelectorAll('[aria-invalid="true"]').forEach((entrada) => { // Busca los campos marcados como inválidos
    entrada.removeAttribute("aria-invalid"); // Les quita la marca roja (Clase 14 DOM · Eliminar atributos)
  }); // Fin del forEach
} // Fin de limpiarErrores

// =============================================================================
// 5. PEDIDOS (vista del cliente)
// =============================================================================

// Muestra la cotización calculada en tiempo real mientras se llena el formulario.
export function mostrarCotizacion(elemento, cotizacion) { // COTIZACIÓN EN VIVO: escribe precio y tiempo en el recuadro azul de pedidos.html
  elemento.replaceChildren( // Reemplaza el contenido del recuadro
    crear("span", "", "Precio estimado: "), // Texto fijo
    crear("strong", "", formatearPrecio(cotizacion.precio)), // Precio en negrita
    crear("span", "", " · Tiempo de impresión aprox.: "), // Texto fijo
    crear("strong", "", formatearTiempo(cotizacion.minutos)) // Tiempo en negrita
  ); // Fin de replaceChildren
} // Fin de mostrarCotizacion

// Recuadro con el producto elegido desde el catálogo.
export function mostrarProductoSeleccionado(contenedor, producto, alQuitar) { // Muestra arriba del formulario el producto que el cliente eligió en el catálogo
  if (!producto) { // Si no hay producto elegido...
    contenedor.hidden = true; // ...oculta el recuadro
    contenedor.replaceChildren(); // ...y lo vacía
    return; // ...y termina
  } // Fin del if
  const imagen = crearImagen(producto.imagen1, producto.nombre); // Foto del producto
  const texto = crear("div"); // Caja para nombre y precio
  texto.append( // Le agrega...
    crear("strong", "", producto.nombre), // ...el nombre en negrita
    crear("p", "", formatearPrecio(producto.precio) + " c/u · " + producto.medidas + " · " + formatearTiempo(producto.tiempo)) // ...precio, medidas y tiempo en una línea (Clase 11 · Concatenación)
  ); // Fin del append
  const quitar = crear("button", "boton-texto", "Quitar"); // Botón "Quitar" para pedir algo personalizado en su lugar
  quitar.type = "button"; // No envía el formulario
  quitar.addEventListener("click", alQuitar); // Al hacer clic ejecuta la función que mandó main.js (Clase 12 · addEventListener)

  contenedor.replaceChildren(imagen, texto, quitar); // Pone foto, texto y botón en el recuadro
  contenedor.hidden = false; // Muestra el recuadro
} // Fin de mostrarProductoSeleccionado

function crearInsigniaEstado(estado) { // Crea la etiqueta de color del estado (gris, azul o verde)
  // "En espera" → clase "estado-en-espera"
  const clase = "insignia-estado estado-" + estado.toLowerCase().replace(/\s+/g, "-"); // Convierte "En espera" en "estado-en-espera" para que el CSS le dé color (Clase 11 · toLowerCase y replace)
  return crear("span", clase, estado); // Devuelve un <span> con esa clase
} // Fin de crearInsigniaEstado

function nombreDelServicio(pedido) { // Decide qué título mostrar en cada pedido
  if (pedido.servicio === "catalogo" && pedido.productoNombre) { // Si es del catálogo y tiene nombre de producto...
    return pedido.productoNombre; // ...muestra el nombre del producto
  } // Fin del if
  return SERVICIOS[pedido.servicio] ? SERVICIOS[pedido.servicio].nombre : pedido.servicio; // Si no, muestra el nombre del servicio (Clase 10 · Operador ternario)
} // Fin de nombreDelServicio

export function renderizarPedidosCliente(contenedor, pedidos, alCancelar) { // AQUÍ SE DIBUJA "MIS PEDIDOS" del cliente; alCancelar es la función que borra el pedido (callback)
  if (pedidos.length === 0) { // Si el cliente no tiene pedidos...
    mostrarEstadoVacio(contenedor, "Todavía no has hecho pedidos. ¡Cotiza tu primera pieza!", { // ...muestra el estado vacío con un botón al catálogo
      href: "catalogo.html", // Enlace del botón
      texto: "Ver catálogo" // Texto del botón
    }); // Fin del objeto enlace
    return; // Termina
  } // Fin del if

  const tarjetas = pedidos.map((pedido) => { // Convierte cada pedido en una tarjeta (map)
    const tarjeta = crear("article", "tarjeta-pedido"); // Crea la tarjeta del pedido

    const encabezado = crear("div", "tarjeta-pedido-encabezado"); // Parte de arriba de la tarjeta
    encabezado.append(crear("h3", "", nombreDelServicio(pedido)), crearInsigniaEstado(pedido.estado)); // Título y etiqueta de estado

    const detalles = crear("ul", "tarjeta-detalles"); // Lista de detalles
    detalles.append( // Agrega tres renglones
      crear("li", "", "Material: " + pedido.material + " | Relleno: " + pedido.infill + "%"), // Material y relleno
      crear("li", "", "Medidas: " + pedido.medidas + " | Cantidad: " + pedido.cantidad), // Medidas y cantidad
      crear("li", "", "Descripción: " + pedido.descripcion) // Lo que escribió el cliente
    ); // Fin del append

    const pie = crear("div", "tarjeta-pedido-pie"); // Parte de abajo de la tarjeta
    pie.append( // Agrega
      crear("span", "", "📅 " + formatearFecha(pedido.fecha)), // Fecha del pedido
      crear("span", "", "⏱ " + formatearTiempo(pedido.minutosEstimados)), // Tiempo estimado
      crear("strong", "", formatearPrecio(pedido.precioEstimado)) // Precio estimado
    ); // Fin del append

    // Solo se puede cancelar mientras no ha empezado la impresión.
    if (pedido.estado === "En espera") { // FUNCIONALIDAD DE CANCELAR (parte visual): el botón solo aparece si el pedido sigue "En espera"
      const cancelar = crear("button", "boton-texto boton-texto-peligro", "Cancelar pedido"); // Crea el botón rojo "Cancelar pedido"
      cancelar.type = "button"; // No envía formularios
      cancelar.addEventListener("click", () => alCancelar(pedido, cancelar)); // Al hacer clic llama a cancelarPedido() de main.js con este pedido (Clase 12 · Eventos; callback)
      pie.append(cancelar); // Lo agrega al pie de la tarjeta
    } // Fin del if

    tarjeta.append(encabezado, detalles, pie); // Arma la tarjeta completa
    return tarjeta; // Devuelve la tarjeta para el arreglo
  }); // Fin del map

  contenedor.replaceChildren(...tarjetas); // Pone todas las tarjetas en la sección "Mis pedidos" (Clase 11 · Spread)
} // Fin de renderizarPedidosCliente

export function mostrarResumenCliente(contenedor, resumen) { // Tarjetas de resumen del cliente: cuántos pedidos tiene y cuánto suman
  contenedor.replaceChildren( // Reemplaza el contenido por 4 indicadores
    crearIndicador("Pedidos realizados", resumen.total), // Total de pedidos
    crearIndicador("En proceso", resumen.porEstado["En espera"] + resumen.porEstado.Imprimiendo), // En espera + imprimiendo (acceso a propiedades con corchetes y con punto · Clase 11)
    crearIndicador("Completados", resumen.porEstado.Completado), // Completados
    crearIndicador("Total estimado", formatearPrecio(resumen.montoTotal)) // Suma de precios
  ); // Fin de replaceChildren
} // Fin de mostrarResumenCliente

// =============================================================================
// 6. PANEL DE ADMINISTRACIÓN
// =============================================================================

function crearIndicador(titulo, valor) { // Crea una tarjeta de indicador: número grande + título
  const tarjeta = crear("div", "indicador"); // Caja del indicador
  tarjeta.append(crear("span", "indicador-valor", String(valor)), crear("span", "indicador-titulo", titulo)); // Valor grande y título pequeño
  return tarjeta; // Devuelve la tarjeta
} // Fin de crearIndicador

export function mostrarIndicadores(contenedor, resumenPedidos, resumenCatalogo) { // INDICADORES DEL PANEL ADMIN: dibuja las 7 tarjetas de números de arriba
  contenedor.replaceChildren( // Reemplaza el contenido por los indicadores
    crearIndicador("Productos en catálogo", resumenCatalogo.cantidad), // Cuántos productos hay
    crearIndicador("Precio promedio", formatearPrecio(resumenCatalogo.precioPromedio)), // Precio promedio del catálogo
    crearIndicador("Pedidos en espera", resumenPedidos.porEstado["En espera"]), // Pedidos en espera
    crearIndicador("Imprimiendo", resumenPedidos.porEstado.Imprimiendo), // Pedidos imprimiéndose
    crearIndicador("Completados", resumenPedidos.porEstado.Completado), // Pedidos completados
    crearIndicador("Horas de máquina pendientes", formatearTiempo(resumenPedidos.minutosPendientes)), // Tiempo de máquina pendiente
    crearIndicador("Ingresos (completados)", formatearPrecio(resumenPedidos.montoCompletado)) // Dinero de los pedidos completados
  ); // Fin de replaceChildren
} // Fin de mostrarIndicadores

// Crea una tabla con encabezados y devuelve { tabla, cuerpo }.
function crearTabla(encabezados) { // Crea una tabla HTML con sus encabezados (la usan las dos tablas del admin)
  const tabla = crear("table", "tabla"); // Crea <table>
  const thead = crear("thead"); // Crea <thead>
  const fila = crear("tr"); // Crea la fila de encabezados
  encabezados.forEach((texto) => { // Recorre cada título de columna
    const th = crear("th", "", texto); // Crea el <th>
    th.scope = "col"; // Indica que es encabezado de columna (accesibilidad)
    fila.append(th); // Lo agrega a la fila
  }); // Fin del forEach
  thead.append(fila); // Mete la fila en el thead
  const cuerpo = crear("tbody"); // Crea el <tbody> donde irán los datos
  tabla.append(thead, cuerpo); // Arma la tabla
  return { tabla, cuerpo }; // Devuelve dos cosas en un objeto (Clase 11 · Objetos)
} // Fin de crearTabla

function celda(contenido) { // Crea una celda <td> con texto o con un elemento
  const td = crear("td"); // Crea el <td>
  if (typeof contenido === "string" || typeof contenido === "number") { // Si es texto o número... (Clase 10 · typeof)
    td.textContent = contenido; // ...lo escribe como texto
  } else { // Si es un elemento (imagen, botón, select)...
    td.append(contenido); // ...lo inserta
  } // Fin del if-else
  return td; // Devuelve la celda
} // Fin de celda

// acciones = { alEditar(producto), alEliminar(producto, boton) }
export function renderizarTablaProductos(contenedor, productos, acciones) { // AQUÍ SE DIBUJA LA TABLA DE PRODUCTOS del admin, con botones Editar y Eliminar
  if (productos.length === 0) { // Si no hay productos...
    mostrarEstadoVacio(contenedor, "No hay productos. Crea uno o carga los datos iniciales."); // ...muestra el estado vacío
    return; // Termina
  } // Fin del if

  const { tabla, cuerpo } = crearTabla(["Foto", "Nombre", "Categoría", "Precio", "Tiempo", "Relleno", "Multicolor", "Acciones"]); // Crea la tabla y saca tabla y cuerpo del objeto (Clase 11 · Destructuración de objetos)

  productos.forEach((producto) => { // Una fila por producto (forEach)
    const fila = crear("tr"); // Crea la fila <tr>

    const miniatura = crearImagen(producto.imagen1, producto.nombre); // Foto pequeña
    miniatura.className = "miniatura"; // Clase para el tamaño pequeño

    const botones = crear("div", "fila-acciones"); // Caja de botones
    const editar = crear("button", "boton-texto", "Editar"); // Botón "Editar"
    editar.type = "button"; // No envía formularios
    editar.addEventListener("click", () => acciones.alEditar(producto)); // Al hacer clic llena el formulario con este producto (callback de main.js)
    const eliminar = crear("button", "boton-texto boton-texto-peligro", "Eliminar"); // Botón "Eliminar" en rojo
    eliminar.type = "button"; // No envía formularios
    eliminar.addEventListener("click", () => acciones.alEliminar(producto, eliminar)); // Al hacer clic pide borrar este producto (callback de main.js)
    botones.append(editar, eliminar); // Mete los dos botones

    fila.append( // Agrega las 8 celdas en orden
      celda(miniatura), // Foto
      celda(producto.nombre), // Nombre
      celda(producto.categoria), // Categoría
      celda(formatearPrecio(producto.precio)), // Precio
      celda(formatearTiempo(producto.tiempo)), // Tiempo
      celda(producto.infill + "%"), // Relleno
      celda(producto.multicolor ? "Sí" : "No"), // Multicolor (ternario)
      celda(botones) // Botones
    ); // Fin del append
    cuerpo.append(fila); // Agrega la fila al cuerpo de la tabla
  }); // Fin del forEach

  contenedor.replaceChildren(tabla); // Muestra la tabla en la página
} // Fin de renderizarTablaProductos

// acciones = { alCambiarEstado(pedido, nuevoEstado, select), alEliminar(pedido, boton) }
export function renderizarTablaPedidos(contenedor, pedidos, acciones) { // AQUÍ SE DIBUJA LA TABLA DE PEDIDOS del admin, con el <select> de estado
  if (pedidos.length === 0) { // Si no hay pedidos (o el filtro no encontró nada)...
    mostrarEstadoVacio(contenedor, "No hay pedidos que coincidan con el filtro."); // ...muestra el mensaje
    return; // Termina
  } // Fin del if

  const { tabla, cuerpo } = crearTabla(["Fecha", "Cliente", "Pedido", "Detalles", "Total", "Estado", "Acciones"]); // Crea la tabla con sus 7 columnas (Destructuración)

  pedidos.forEach((pedido) => { // Una fila por pedido
    const fila = crear("tr"); // Crea la fila

    // Columna "Pedido": servicio + descripción del cliente.
    const pedidoInfo = crear("div"); // Caja para la columna Pedido
    pedidoInfo.append(crear("strong", "", nombreDelServicio(pedido)), crear("small", "texto-descripcion", pedido.descripcion)); // Nombre del servicio en negrita y descripción en pequeño

    // <select> para cambiar el estado de fabricación.
    const select = crear("select", "select-estado"); // Crea el <select> para cambiar el estado
    select.setAttribute("aria-label", "Estado del pedido de " + pedido.clienteNombre); // Etiqueta accesible con el nombre del cliente
    ESTADOS.forEach((estado) => { // Recorre los 3 estados posibles
      const opcion = crear("option", "", estado); // Crea cada <option>
      opcion.value = estado; // Su valor
      opcion.selected = estado === pedido.estado; // Deja marcado el estado actual del pedido (Clase 10 · ===)
      select.append(opcion); // Lo agrega al select
    }); // Fin del forEach
    select.addEventListener("change", () => acciones.alCambiarEstado(pedido, select.value, select)); // Evento "change": al elegir otro estado llama a cambiarEstado() de main.js (Clase 12 · Eventos de formulario)

    const eliminar = crear("button", "boton-texto boton-texto-peligro", "Eliminar"); // Botón "Eliminar" del pedido
    eliminar.type = "button"; // No envía formularios
    eliminar.addEventListener("click", () => acciones.alEliminar(pedido, eliminar)); // Al hacer clic pide borrar este pedido (callback de main.js)

    fila.append( // Agrega las 7 celdas
      celda(formatearFecha(pedido.fecha)), // Fecha
      celda(pedido.clienteNombre), // Cliente
      celda(pedidoInfo), // Servicio y descripción
      celda(pedido.material + " · " + pedido.infill + "% · " + pedido.medidas + " · x" + pedido.cantidad), // Detalles técnicos en una línea (Concatenación)
      celda(formatearPrecio(pedido.precioEstimado) + " / " + formatearTiempo(pedido.minutosEstimados)), // Precio y tiempo
      celda(select), // Select de estado
      celda(eliminar) // Botón eliminar
    ); // Fin del append
    cuerpo.append(fila); // Agrega la fila
  }); // Fin del forEach

  contenedor.replaceChildren(tabla); // Muestra la tabla en la página
} // Fin de renderizarTablaPedidos

// Pasa los datos de un producto al formulario para editarlo.
export function llenarFormularioProducto(formulario, producto) { // Pasa los datos de un producto al formulario del admin para EDITARLO
  formulario.elements.productoId.value = producto.id; // Guarda el id en el campo oculto: así main.js sabe que es edición y no creación
  formulario.elements.nombre.value = producto.nombre; // Nombre
  formulario.elements.categoria.value = producto.categoria; // Categoría
  formulario.elements.precio.value = producto.precio; // Precio
  formulario.elements.tiempo.value = producto.tiempo; // Tiempo
  formulario.elements.infill.value = producto.infill; // Relleno
  formulario.elements.medidas.value = producto.medidas; // Medidas
  formulario.elements.multicolor.checked = producto.multicolor; // Casilla multicolor (checked = marcada)
  formulario.elements.imagen1.value = producto.imagen1; // Imagen 1
  formulario.elements.imagen2.value = producto.imagen2; // Imagen 2
  formulario.elements.linkSTL.value = producto.linkSTL || ""; // Enlace STL; si no tiene, vacío (operador ||)
} // Fin de llenarFormularioProducto
