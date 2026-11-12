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

import { formatearPrecio, formatearTiempo, formatearFecha, ESTADOS, SERVICIOS } from "./logica.js";

// -----------------------------------------------------------------------------
// AYUDA GENERAL: crea un elemento con clase y texto en una sola línea.
// -----------------------------------------------------------------------------
function crear(etiqueta, clase = "", texto = "") {
  const elemento = document.createElement(etiqueta);
  if (clase) elemento.className = clase;
  if (texto !== "") elemento.textContent = texto;
  return elemento;
}

// =============================================================================
// 1. RETROALIMENTACIÓN: notificaciones, carga, vacío y error
// =============================================================================

// Notificación flotante que desaparece sola a los 4.5 s (setTimeout).
// tipo: "exito" | "error" | "info"
export function mostrarNotificacion(texto, tipo = "exito") {
  let zona = document.querySelector("#notificaciones");
  if (!zona) {
    zona = crear("div", "zona-notificaciones");
    zona.id = "notificaciones";
    zona.setAttribute("aria-live", "polite"); // Los lectores de pantalla la anuncian.
    document.body.append(zona);
  }

  const aviso = crear("div", "notificacion notificacion-" + tipo, texto);
  aviso.setAttribute("role", tipo === "error" ? "alert" : "status");
  zona.append(aviso);

  setTimeout(() => aviso.remove(), 4500);
}

// Reemplaza el contenido de un contenedor por un spinner de carga.
export function mostrarCargando(contenedor, texto = "Cargando…") {
  const caja = crear("div", "estado-carga");
  caja.setAttribute("role", "status");
  caja.append(crear("span", "spinner"), crear("p", "", texto));
  contenedor.replaceChildren(caja);
}

// Mensaje cuando no hay datos que mostrar. enlace = { href, texto } (opcional).
export function mostrarEstadoVacio(contenedor, texto, enlace = null) {
  const caja = crear("div", "estado-vacio");
  caja.append(crear("p", "estado-vacio-icono", "📭"), crear("p", "", texto));
  if (enlace) {
    const a = crear("a", "boton-cta", enlace.texto);
    a.href = enlace.href;
    caja.append(a);
  }
  contenedor.replaceChildren(caja);
}

// Mensaje de error dentro de un contenedor, con botón opcional "Reintentar".
export function mostrarErrorEnContenedor(contenedor, texto, alReintentar = null) {
  const caja = crear("div", "estado-error");
  caja.setAttribute("role", "alert");
  caja.append(crear("p", "", "⚠️ " + texto));
  if (alReintentar) {
    const boton = crear("button", "boton-cta boton-secundario", "Reintentar");
    boton.type = "button";
    boton.addEventListener("click", alReintentar);
    caja.append(boton);
  }
  contenedor.replaceChildren(caja);
}

// Deshabilita un botón mientras se espera una operación asíncrona.
export function cambiarEstadoBoton(boton, ocupado, textoOcupado = "Procesando…") {
  if (ocupado) {
    boton.dataset.textoOriginal = boton.textContent; // Guardamos el texto original.
    boton.textContent = textoOcupado;
    boton.disabled = true;
  } else {
    boton.textContent = boton.dataset.textoOriginal || boton.textContent;
    boton.disabled = false;
  }
}

// Banner que avisa que falta pegar la configuración de Firebase.
export function mostrarAvisoConfiguracion() {
  const aviso = crear(
    "div",
    "aviso-configuracion",
    "⚙️ Falta configurar Firebase: pega los datos de tu proyecto en js/firebase-config.js (ver README)."
  );
  aviso.setAttribute("role", "alert");
  document.body.prepend(aviso);
}

// =============================================================================
// 2. NAVEGACIÓN SEGÚN LA SESIÓN Y EL ROL
// =============================================================================
export function actualizarNavegacion(perfil, alCerrarSesion) {
  const itemSesion = document.querySelector("#nav-sesion");
  const itemAdmin = document.querySelector("#nav-admin");
  if (!itemSesion) return;

  // El enlace al panel solo se muestra al admin. (Ocultarlo NO es la seguridad:
  // la protección real está en las reglas de Firestore.)
  if (itemAdmin) {
    itemAdmin.hidden = !(perfil && perfil.rol === "admin");
  }

  if (!perfil) {
    return; // Se queda el enlace "Iniciar sesión" escrito en el HTML.
  }

  const saludo = crear("span", "saludo-usuario", "Hola, " + perfil.nombre.split(" ")[0]);
  if (perfil.rol === "admin") {
    saludo.append(crear("span", "insignia-rol", "admin"));
  }

  const botonSalir = crear("button", "boton-salir", "Cerrar sesión");
  botonSalir.type = "button";
  botonSalir.addEventListener("click", alCerrarSesion);

  itemSesion.replaceChildren(saludo, botonSalir);
}

// =============================================================================
// 3. CATÁLOGO: tarjetas con 2 imágenes por producto
// =============================================================================

// Crea una <img>; si la ruta falla, muestra el logo en su lugar.
function crearImagen(ruta, textoAlternativo) {
  const imagen = document.createElement("img");
  imagen.src = ruta;
  imagen.alt = textoAlternativo;
  imagen.loading = "lazy";
  imagen.addEventListener("error", () => {
    imagen.src = "img/logo.jpg";
  }, { once: true });
  return imagen;
}

export function crearTarjetaProducto(producto) {
  const tarjeta = crear("article", "tarjeta-producto");

  // Galería con las dos fotos.
  const galeria = crear("div", "tarjeta-galeria-dos");
  galeria.append(
    crearImagen(producto.imagen1, producto.nombre + " foto 1"),
    crearImagen(producto.imagen2, producto.nombre + " foto 2")
  );

  // Cuerpo con los datos.
  const cuerpo = crear("div", "tarjeta-cuerpo");
  cuerpo.append(crear("span", "chip-categoria", producto.categoria));
  cuerpo.append(crear("h3", "tarjeta-titulo", producto.nombre));

  const detalles = crear("ul", "tarjeta-detalles");
  detalles.append(
    crear("li", "", "Tiempo: " + formatearTiempo(producto.tiempo) + " | Multicolor: " + (producto.multicolor ? "Sí" : "No")),
    crear("li", "", "Relleno: " + producto.infill + "% | Medidas: " + producto.medidas)
  );
  cuerpo.append(detalles);

  cuerpo.append(crear("p", "tarjeta-precio", formatearPrecio(producto.precio) + " USD"));

  // Botón que lleva al formulario de pedidos con este producto seleccionado.
  const solicitar = crear("a", "boton-cta", "Solicitar este modelo");
  solicitar.href = "pedidos.html?producto=" + encodeURIComponent(producto.id);
  cuerpo.append(solicitar);

  if (producto.linkSTL) {
    const stl = crear("a", "enlace-stl", "Ver archivo STL ↗");
    stl.href = producto.linkSTL;
    stl.target = "_blank";
    stl.rel = "noopener noreferrer";
    cuerpo.append(stl);
  }

  tarjeta.append(galeria, cuerpo);
  return tarjeta;
}

export function renderizarProductos(contenedor, productos, textoVacio = "No hay productos para mostrar.") {
  if (productos.length === 0) {
    mostrarEstadoVacio(contenedor, textoVacio);
    return;
  }
  // map() convierte cada objeto producto en un elemento <article>.
  const tarjetas = productos.map((producto) => crearTarjetaProducto(producto));
  contenedor.replaceChildren(...tarjetas);
}

export function actualizarContador(elemento, mostrados, total) {
  elemento.textContent = "Mostrando " + mostrados + " de " + total + " productos";
}

// Llena el <select> de categorías con las que existen en la base de datos.
export function llenarSelectCategorias(select, categorias) {
  categorias.forEach((categoria) => {
    const opcion = crear("option", "", categoria);
    opcion.value = categoria;
    select.append(opcion);
  });
}

// =============================================================================
// 4. FORMULARIOS: errores de validación
// =============================================================================

// Cada campo tiene debajo un <small data-error="nombreDelCampo">.
export function mostrarErrores(formulario, errores) {
  limpiarErrores(formulario);
  let primero = null;

  for (const campo in errores) {
    const mensaje = formulario.querySelector('[data-error="' + campo + '"]');
    const entrada = formulario.elements[campo];
    if (mensaje) mensaje.textContent = errores[campo];
    if (entrada) {
      entrada.setAttribute("aria-invalid", "true");
      if (!primero) primero = entrada;
    }
  }
  if (primero) primero.focus(); // Lleva al usuario al primer error.
}

export function limpiarErrores(formulario) {
  formulario.querySelectorAll("[data-error]").forEach((mensaje) => {
    mensaje.textContent = "";
  });
  formulario.querySelectorAll('[aria-invalid="true"]').forEach((entrada) => {
    entrada.removeAttribute("aria-invalid");
  });
}

// =============================================================================
// 5. PEDIDOS (vista del cliente)
// =============================================================================

// Muestra la cotización calculada en tiempo real mientras se llena el formulario.
export function mostrarCotizacion(elemento, cotizacion) {
  elemento.replaceChildren(
    crear("span", "", "Precio estimado: "),
    crear("strong", "", formatearPrecio(cotizacion.precio)),
    crear("span", "", " · Tiempo de impresión aprox.: "),
    crear("strong", "", formatearTiempo(cotizacion.minutos))
  );
}

// Recuadro con el producto elegido desde el catálogo.
export function mostrarProductoSeleccionado(contenedor, producto, alQuitar) {
  if (!producto) {
    contenedor.hidden = true;
    contenedor.replaceChildren();
    return;
  }
  const imagen = crearImagen(producto.imagen1, producto.nombre);
  const texto = crear("div");
  texto.append(
    crear("strong", "", producto.nombre),
    crear("p", "", formatearPrecio(producto.precio) + " c/u · " + producto.medidas + " · " + formatearTiempo(producto.tiempo))
  );
  const quitar = crear("button", "boton-texto", "Quitar");
  quitar.type = "button";
  quitar.addEventListener("click", alQuitar);

  contenedor.replaceChildren(imagen, texto, quitar);
  contenedor.hidden = false;
}

function crearInsigniaEstado(estado) {
  // "En espera" → clase "estado-en-espera"
  const clase = "insignia-estado estado-" + estado.toLowerCase().replace(/\s+/g, "-");
  return crear("span", clase, estado);
}

function nombreDelServicio(pedido) {
  if (pedido.servicio === "catalogo" && pedido.productoNombre) {
    return pedido.productoNombre;
  }
  return SERVICIOS[pedido.servicio] ? SERVICIOS[pedido.servicio].nombre : pedido.servicio;
}

export function renderizarPedidosCliente(contenedor, pedidos, alCancelar) {
  if (pedidos.length === 0) {
    mostrarEstadoVacio(contenedor, "Todavía no has hecho pedidos. ¡Cotiza tu primera pieza!", {
      href: "catalogo.html",
      texto: "Ver catálogo"
    });
    return;
  }

  const tarjetas = pedidos.map((pedido) => {
    const tarjeta = crear("article", "tarjeta-pedido");

    const encabezado = crear("div", "tarjeta-pedido-encabezado");
    encabezado.append(crear("h3", "", nombreDelServicio(pedido)), crearInsigniaEstado(pedido.estado));

    const detalles = crear("ul", "tarjeta-detalles");
    detalles.append(
      crear("li", "", "Material: " + pedido.material + " | Relleno: " + pedido.infill + "%"),
      crear("li", "", "Medidas: " + pedido.medidas + " | Cantidad: " + pedido.cantidad),
      crear("li", "", "Descripción: " + pedido.descripcion)
    );

    const pie = crear("div", "tarjeta-pedido-pie");
    pie.append(
      crear("span", "", "📅 " + formatearFecha(pedido.fecha)),
      crear("span", "", "⏱ " + formatearTiempo(pedido.minutosEstimados)),
      crear("strong", "", formatearPrecio(pedido.precioEstimado))
    );

    // Solo se puede cancelar mientras no ha empezado la impresión.
    if (pedido.estado === "En espera") {
      const cancelar = crear("button", "boton-texto boton-texto-peligro", "Cancelar pedido");
      cancelar.type = "button";
      cancelar.addEventListener("click", () => alCancelar(pedido, cancelar));
      pie.append(cancelar);
    }

    tarjeta.append(encabezado, detalles, pie);
    return tarjeta;
  });

  contenedor.replaceChildren(...tarjetas);
}

export function mostrarResumenCliente(contenedor, resumen) {
  contenedor.replaceChildren(
    crearIndicador("Pedidos realizados", resumen.total),
    crearIndicador("En proceso", resumen.porEstado["En espera"] + resumen.porEstado.Imprimiendo),
    crearIndicador("Completados", resumen.porEstado.Completado),
    crearIndicador("Total estimado", formatearPrecio(resumen.montoTotal))
  );
}

// =============================================================================
// 6. PANEL DE ADMINISTRACIÓN
// =============================================================================

function crearIndicador(titulo, valor) {
  const tarjeta = crear("div", "indicador");
  tarjeta.append(crear("span", "indicador-valor", String(valor)), crear("span", "indicador-titulo", titulo));
  return tarjeta;
}

export function mostrarIndicadores(contenedor, resumenPedidos, resumenCatalogo) {
  contenedor.replaceChildren(
    crearIndicador("Productos en catálogo", resumenCatalogo.cantidad),
    crearIndicador("Precio promedio", formatearPrecio(resumenCatalogo.precioPromedio)),
    crearIndicador("Pedidos en espera", resumenPedidos.porEstado["En espera"]),
    crearIndicador("Imprimiendo", resumenPedidos.porEstado.Imprimiendo),
    crearIndicador("Completados", resumenPedidos.porEstado.Completado),
    crearIndicador("Horas de máquina pendientes", formatearTiempo(resumenPedidos.minutosPendientes)),
    crearIndicador("Ingresos (completados)", formatearPrecio(resumenPedidos.montoCompletado))
  );
}

// Crea una tabla con encabezados y devuelve { tabla, cuerpo }.
function crearTabla(encabezados) {
  const tabla = crear("table", "tabla");
  const thead = crear("thead");
  const fila = crear("tr");
  encabezados.forEach((texto) => {
    const th = crear("th", "", texto);
    th.scope = "col";
    fila.append(th);
  });
  thead.append(fila);
  const cuerpo = crear("tbody");
  tabla.append(thead, cuerpo);
  return { tabla, cuerpo };
}

function celda(contenido) {
  const td = crear("td");
  if (typeof contenido === "string" || typeof contenido === "number") {
    td.textContent = contenido;
  } else {
    td.append(contenido);
  }
  return td;
}

// acciones = { alEditar(producto), alEliminar(producto, boton) }
export function renderizarTablaProductos(contenedor, productos, acciones) {
  if (productos.length === 0) {
    mostrarEstadoVacio(contenedor, "No hay productos. Crea uno o carga los datos iniciales.");
    return;
  }

  const { tabla, cuerpo } = crearTabla(["Foto", "Nombre", "Categoría", "Precio", "Tiempo", "Relleno", "Multicolor", "Acciones"]);

  productos.forEach((producto) => {
    const fila = crear("tr");

    const miniatura = crearImagen(producto.imagen1, producto.nombre);
    miniatura.className = "miniatura";

    const botones = crear("div", "fila-acciones");
    const editar = crear("button", "boton-texto", "Editar");
    editar.type = "button";
    editar.addEventListener("click", () => acciones.alEditar(producto));
    const eliminar = crear("button", "boton-texto boton-texto-peligro", "Eliminar");
    eliminar.type = "button";
    eliminar.addEventListener("click", () => acciones.alEliminar(producto, eliminar));
    botones.append(editar, eliminar);

    fila.append(
      celda(miniatura),
      celda(producto.nombre),
      celda(producto.categoria),
      celda(formatearPrecio(producto.precio)),
      celda(formatearTiempo(producto.tiempo)),
      celda(producto.infill + "%"),
      celda(producto.multicolor ? "Sí" : "No"),
      celda(botones)
    );
    cuerpo.append(fila);
  });

  contenedor.replaceChildren(tabla);
}

// acciones = { alCambiarEstado(pedido, nuevoEstado, select), alEliminar(pedido, boton) }
export function renderizarTablaPedidos(contenedor, pedidos, acciones) {
  if (pedidos.length === 0) {
    mostrarEstadoVacio(contenedor, "No hay pedidos que coincidan con el filtro.");
    return;
  }

  const { tabla, cuerpo } = crearTabla(["Fecha", "Cliente", "Pedido", "Detalles", "Total", "Estado", "Acciones"]);

  pedidos.forEach((pedido) => {
    const fila = crear("tr");

    // Columna "Pedido": servicio + descripción del cliente.
    const pedidoInfo = crear("div");
    pedidoInfo.append(crear("strong", "", nombreDelServicio(pedido)), crear("small", "texto-descripcion", pedido.descripcion));

    // <select> para cambiar el estado de fabricación.
    const select = crear("select", "select-estado");
    select.setAttribute("aria-label", "Estado del pedido de " + pedido.clienteNombre);
    ESTADOS.forEach((estado) => {
      const opcion = crear("option", "", estado);
      opcion.value = estado;
      opcion.selected = estado === pedido.estado;
      select.append(opcion);
    });
    select.addEventListener("change", () => acciones.alCambiarEstado(pedido, select.value, select));

    const eliminar = crear("button", "boton-texto boton-texto-peligro", "Eliminar");
    eliminar.type = "button";
    eliminar.addEventListener("click", () => acciones.alEliminar(pedido, eliminar));

    fila.append(
      celda(formatearFecha(pedido.fecha)),
      celda(pedido.clienteNombre),
      celda(pedidoInfo),
      celda(pedido.material + " · " + pedido.infill + "% · " + pedido.medidas + " · x" + pedido.cantidad),
      celda(formatearPrecio(pedido.precioEstimado) + " / " + formatearTiempo(pedido.minutosEstimados)),
      celda(select),
      celda(eliminar)
    );
    cuerpo.append(fila);
  });

  contenedor.replaceChildren(tabla);
}

// Pasa los datos de un producto al formulario para editarlo.
export function llenarFormularioProducto(formulario, producto) {
  formulario.elements.productoId.value = producto.id;
  formulario.elements.nombre.value = producto.nombre;
  formulario.elements.categoria.value = producto.categoria;
  formulario.elements.precio.value = producto.precio;
  formulario.elements.tiempo.value = producto.tiempo;
  formulario.elements.infill.value = producto.infill;
  formulario.elements.medidas.value = producto.medidas;
  formulario.elements.multicolor.checked = producto.multicolor;
  formulario.elements.imagen1.value = producto.imagen1;
  formulario.elements.imagen2.value = producto.imagen2;
  formulario.elements.linkSTL.value = producto.linkSTL || "";
}
