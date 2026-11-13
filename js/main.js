// =============================================================================
// main.js  →  PUNTO DE ENTRADA Y CONEXIÓN DE EVENTOS
// -----------------------------------------------------------------------------
// Todas las páginas cargan este archivo con:
//     <script type="module" src="js/main.js"></script>
// Cada <body> tiene un atributo data-pagina="..." que indica qué página es.
// main.js lo lee y ejecuta solo la función de esa página.
//
// Flujo general (separación de responsabilidades):
//   evento del usuario → main.js valida (logica.js) → llama a Firebase
//   (auth.js / db.js) con async/await → dibuja el resultado (dom.js).
// =============================================================================

import { configuracionPendiente } from "./firebase-config.js";
import { registrarUsuario, iniciarSesion, cerrarSesion, esperarSesion, esAdmin } from "./auth.js";
import {
  obtenerProductos,
  obtenerProducto,
  crearProducto,
  actualizarProducto,
  eliminarProducto,
  crearPedido,
  obtenerPedidosDeCliente,
  obtenerTodosLosPedidos,
  actualizarEstadoPedido,
  eliminarPedido,
  cargarDatosIniciales
} from "./db.js";
import {
  obtenerCategorias,
  filtrarProductos,
  ordenarProductos,
  calcularCotizacion,
  ordenarPorFecha,
  resumirPedidos,
  resumirCatalogo,
  filtrarPedidos,
  validarLogin,
  validarRegistro,
  validarPedido,
  validarProducto,
  sinErrores,
  mensajeDeError
} from "./logica.js";
import {
  mostrarNotificacion,
  mostrarCargando,
  mostrarEstadoVacio,
  mostrarErrorEnContenedor,
  cambiarEstadoBoton,
  mostrarAvisoConfiguracion,
  actualizarNavegacion,
  renderizarProductos,
  actualizarContador,
  llenarSelectCategorias,
  mostrarErrores,
  limpiarErrores,
  mostrarCotizacion,
  mostrarProductoSeleccionado,
  renderizarPedidosCliente,
  mostrarResumenCliente,
  mostrarIndicadores,
  renderizarTablaProductos,
  renderizarTablaPedidos,
  llenarFormularioProducto
} from "./dom.js";

// Perfil del usuario conectado (null si no hay sesión). Lo usan varias páginas.
let perfilActual = null;

// Clave de sessionStorage para recordar el producto elegido antes de iniciar sesión.
const CLAVE_PRODUCTO_PENDIENTE = "productoPendiente";

iniciarAplicacion();

// =============================================================================
// ARRANQUE
// =============================================================================
async function iniciarAplicacion() {
  if (configuracionPendiente) {
    mostrarAvisoConfiguracion();
    return; // Sin configuración no tiene sentido llamar a Firebase.
  }

  try {
    perfilActual = await esperarSesion(); // ¿Hay alguien conectado? ¿Qué rol tiene?
  } catch (error) {
    mostrarNotificacion(mensajeDeError(error), "error");
  }

  actualizarNavegacion(perfilActual, manejarCierreSesion);

  // Ejecutamos solo la lógica de la página actual.
  const pagina = document.body.dataset.pagina;
  switch (pagina) {
    case "inicio":
      iniciarPaginaInicio();
      break;
    case "catalogo":
      iniciarPaginaCatalogo();
      break;
    case "pedidos":
      iniciarPaginaPedidos();
      break;
    case "admin":
      iniciarPaginaAdmin();
      break;
    case "login":
      iniciarPaginaLogin();
      break;
  }
}

async function manejarCierreSesion() {
  try {
    await cerrarSesion();
    window.location.href = "index.html";
  } catch (error) {
    mostrarNotificacion(mensajeDeError(error), "error");
  }
}

// =============================================================================
// PÁGINA: INICIO (index.html) → productos destacados dinámicos
// =============================================================================
async function iniciarPaginaInicio() {
  const contenedor = document.querySelector("#productos-destacados");
  mostrarCargando(contenedor, "Cargando productos destacados…");

  try {
    const productos = await obtenerProductos();
    // Destacados = los 4 productos más económicos del catálogo.
    const destacados = ordenarProductos(productos, "precio-asc").slice(0, 4);
    renderizarProductos(contenedor, destacados, "Pronto agregaremos productos al catálogo.");
  } catch (error) {
    mostrarErrorEnContenedor(contenedor, mensajeDeError(error), iniciarPaginaInicio);
  }
}

// =============================================================================
// PÁGINA: CATÁLOGO (catalogo.html) → búsqueda, filtros y orden
// =============================================================================
let productosCatalogo = []; // Copia local: filtramos sin volver a consultar Firestore.

async function iniciarPaginaCatalogo() {
  const contenedor = document.querySelector("#catalogo");
  const formulario = document.querySelector("#form-filtros");
  const contador = document.querySelector("#contador-resultados");

  mostrarCargando(contenedor, "Cargando catálogo…");

  try {
    productosCatalogo = await obtenerProductos();
    llenarSelectCategorias(formulario.elements.categoria, obtenerCategorias(productosCatalogo));
    aplicarFiltros();
  } catch (error) {
    contador.textContent = "";
    mostrarErrorEnContenedor(contenedor, mensajeDeError(error), iniciarPaginaCatalogo);
    return;
  }

  // "input" se dispara con cada letra; "change" al cambiar select/checkbox.
  formulario.addEventListener("input", aplicarFiltros);
  formulario.addEventListener("change", aplicarFiltros);
  formulario.addEventListener("submit", (evento) => evento.preventDefault());
  formulario.addEventListener("reset", () => setTimeout(aplicarFiltros, 0)); // Espera a que se limpien los campos.

  function aplicarFiltros() {
    const filtros = {
      texto: formulario.elements.texto.value,
      categoria: formulario.elements.categoria.value,
      soloMulticolor: formulario.elements.multicolor.checked
    };
    const filtrados = filtrarProductos(productosCatalogo, filtros);
    const ordenados = ordenarProductos(filtrados, formulario.elements.orden.value);

    renderizarProductos(contenedor, ordenados, "Ningún producto coincide con tu búsqueda.");
    actualizarContador(contador, ordenados.length, productosCatalogo.length);
  }
}

// =============================================================================
// PÁGINA: PEDIDOS (pedidos.html) → cotizar, crear y consultar pedidos
// =============================================================================
async function iniciarPaginaPedidos() {
  const parametros = new URLSearchParams(window.location.search);
  const idProducto = parametros.get("producto") || sessionStorage.getItem(CLAVE_PRODUCTO_PENDIENTE);

  // Página protegida: si no hay sesión, se guarda el producto y se va al login.
  if (!perfilActual) {
    if (idProducto) sessionStorage.setItem(CLAVE_PRODUCTO_PENDIENTE, idProducto);
    window.location.href = "login.html";
    return;
  }
  sessionStorage.removeItem(CLAVE_PRODUCTO_PENDIENTE);

  const formulario = document.querySelector("#form-pedido");
  const cajaProducto = document.querySelector("#producto-seleccionado");
  const grupoMedidas = document.querySelector("#grupo-medidas");
  const opcionCatalogo = formulario.elements.servicio.querySelector('option[value="catalogo"]');
  const cotizacion = document.querySelector("#cotizacion");
  const listaPedidos = document.querySelector("#mis-pedidos");
  const resumen = document.querySelector("#resumen-cliente");

  document.querySelector("#saludo-cliente").textContent = "Sesión iniciada como " + perfilActual.nombre + ".";

  let productoSeleccionado = null;

  // --- 1. Producto elegido desde el catálogo (relación pedido → producto) ---
  if (idProducto) {
    try {
      productoSeleccionado = await obtenerProducto(idProducto);
      if (!productoSeleccionado) {
        mostrarNotificacion("El producto seleccionado ya no existe.", "info");
      }
    } catch (error) {
      mostrarNotificacion(mensajeDeError(error), "error");
    }
  }
  aplicarProducto();

  function aplicarProducto() {
    opcionCatalogo.disabled = productoSeleccionado === null;
    if (productoSeleccionado) {
      formulario.elements.servicio.value = "catalogo";
      formulario.elements.infill.value = productoSeleccionado.infill;
    } else if (formulario.elements.servicio.value === "catalogo") {
      formulario.elements.servicio.value = "";
    }
    mostrarProductoSeleccionado(cajaProducto, productoSeleccionado, quitarProducto);
    actualizarFormulario();
  }

  function quitarProducto() {
    productoSeleccionado = null;
    history.replaceState(null, "", "pedidos.html"); // Limpia ?producto= de la URL.
    aplicarProducto();
  }

  // --- 2. Leer el formulario y recalcular la cotización en cada cambio ---
  function leerFormulario() {
    const f = formulario.elements;
    return {
      servicio: f.servicio.value,
      material: f.material.value,
      infill: Number(f.infill.value),
      largo: Number(f.largo.value),
      ancho: Number(f.ancho.value),
      alto: Number(f.alto.value),
      cantidad: Number(f.cantidad.value),
      descripcion: f.descripcion.value,
      producto: productoSeleccionado
    };
  }

  function actualizarFormulario() {
    // Las medidas solo aplican a piezas personalizadas.
    const esCatalogo = formulario.elements.servicio.value === "catalogo";
    grupoMedidas.hidden = esCatalogo;
    grupoMedidas.disabled = esCatalogo;
    mostrarCotizacion(cotizacion, calcularCotizacion(leerFormulario()));
  }

  formulario.addEventListener("input", actualizarFormulario);
  formulario.addEventListener("change", actualizarFormulario);

  // --- 3. Enviar el pedido ---
  formulario.addEventListener("submit", async (evento) => {
    evento.preventDefault(); // Evita que el navegador recargue la página.

    const datos = leerFormulario();
    const errores = validarPedido(datos);
    if (!sinErrores(errores)) {
      mostrarErrores(formulario, errores);
      mostrarNotificacion("Revisa los campos marcados.", "error");
      return;
    }
    limpiarErrores(formulario);

    const calculo = calcularCotizacion(datos);
    const esCatalogo = datos.servicio === "catalogo";
    const boton = formulario.querySelector('button[type="submit"]');
    cambiarEstadoBoton(boton, true, "Enviando pedido…");

    try {
      await crearPedido({
        clienteId: perfilActual.uid,
        clienteNombre: perfilActual.nombre,
        clienteCorreo: perfilActual.correo,
        servicio: datos.servicio,
        productoId: esCatalogo ? productoSeleccionado.id : null,
        productoNombre: esCatalogo ? productoSeleccionado.nombre : null,
        material: datos.material,
        infill: datos.infill,
        medidas: esCatalogo ? productoSeleccionado.medidas : datos.largo + "x" + datos.ancho + "x" + datos.alto + " cm",
        cantidad: datos.cantidad,
        descripcion: datos.descripcion.trim(),
        precioEstimado: calculo.precio,
        minutosEstimados: calculo.minutos
      });

      mostrarNotificacion("¡Pedido enviado! Te avisaremos cuando cambie su estado.");
      formulario.reset();
      quitarProducto();
      await cargarMisPedidos();
    } catch (error) {
      mostrarNotificacion(mensajeDeError(error), "error");
    } finally {
      cambiarEstadoBoton(boton, false); // Siempre se vuelve a habilitar.
    }
  });

  // --- 4. Consultar "Mis pedidos" ---
  async function cargarMisPedidos() {
    mostrarCargando(listaPedidos, "Consultando tus pedidos…");
    try {
      const pedidos = ordenarPorFecha(await obtenerPedidosDeCliente(perfilActual.uid));
      mostrarResumenCliente(resumen, resumirPedidos(pedidos));
      renderizarPedidosCliente(listaPedidos, pedidos, cancelarPedido);
    } catch (error) {
      mostrarErrorEnContenedor(listaPedidos, mensajeDeError(error), cargarMisPedidos);
    }
  }

  async function cancelarPedido(pedido, boton) {
    if (!confirm("¿Cancelar este pedido? Esta acción no se puede deshacer.")) return;

    cambiarEstadoBoton(boton, true, "Cancelando…");
    try {
      await eliminarPedido(pedido.id);
      mostrarNotificacion("Pedido cancelado.");
      await cargarMisPedidos();
    } catch (error) {
      mostrarNotificacion(mensajeDeError(error), "error");
      cambiarEstadoBoton(boton, false);
    }
  }

  document.querySelector("#actualizar-pedidos").addEventListener("click", cargarMisPedidos);
  cargarMisPedidos();
}

// =============================================================================
// PÁGINA: PANEL ADMIN (admin.html) → CRUD de productos y estados de pedidos
// =============================================================================
async function iniciarPaginaAdmin() {
  if (!perfilActual) {
    window.location.href = "login.html";
    return;
  }
  // Si no es admin solo mostramos un aviso. Aunque alguien modificara este
  // código, las reglas de Firestore rechazarían sus escrituras.
  if (!esAdmin(perfilActual)) {
    document.querySelector("#acceso-denegado").hidden = false;
    return;
  }
  document.querySelector("#panel-admin").hidden = false;

  const indicadores = document.querySelector("#indicadores");
  const formulario = document.querySelector("#form-producto");
  const tituloFormulario = document.querySelector("#titulo-form-producto");
  const botonCancelar = document.querySelector("#cancelar-edicion");
  const tablaProductos = document.querySelector("#tabla-productos");
  const tablaPedidos = document.querySelector("#tabla-pedidos");
  const filtroEstado = document.querySelector("#filtro-estado");
  const buscarPedido = document.querySelector("#buscar-pedido");

  let productos = [];
  let pedidos = [];

  // --- Cargar todo el panel ---
  async function cargarPanel() {
    mostrarCargando(tablaProductos, "Cargando productos…");
    mostrarCargando(tablaPedidos, "Cargando pedidos…");
    try {
      // Promise.all espera las dos consultas al mismo tiempo.
      [productos, pedidos] = await Promise.all([obtenerProductos(), obtenerTodosLosPedidos()]);
      dibujarProductos();
      dibujarPedidos();
    } catch (error) {
      mostrarErrorEnContenedor(tablaProductos, mensajeDeError(error), cargarPanel);
      mostrarEstadoVacio(tablaPedidos, "No se pudieron cargar los pedidos.");
    }
  }

  function dibujarIndicadores() {
    mostrarIndicadores(indicadores, resumirPedidos(pedidos), resumirCatalogo(productos));
  }

  function dibujarProductos() {
    renderizarTablaProductos(tablaProductos, productos, { alEditar: editarProducto, alEliminar: borrarProducto });
    dibujarIndicadores();
  }

  function dibujarPedidos() {
    const filtrados = filtrarPedidos(pedidos, filtroEstado.value, buscarPedido.value);
    renderizarTablaPedidos(tablaPedidos, filtrados, { alCambiarEstado: cambiarEstado, alEliminar: borrarPedido });
    dibujarIndicadores();
  }

  // --- CREATE / UPDATE de productos (mismo formulario) ---
  function leerProducto() {
    const f = formulario.elements;
    return {
      nombre: f.nombre.value.trim(),
      categoria: f.categoria.value.trim(),
      precio: Number(f.precio.value),
      tiempo: Number(f.tiempo.value),
      infill: Number(f.infill.value),
      medidas: f.medidas.value.trim(),
      multicolor: f.multicolor.checked,
      imagen1: f.imagen1.value.trim(),
      imagen2: f.imagen2.value.trim(),
      linkSTL: f.linkSTL.value.trim()
    };
  }

  formulario.addEventListener("submit", async (evento) => {
    evento.preventDefault();

    const datos = leerProducto();
    const errores = validarProducto(datos);
    if (!sinErrores(errores)) {
      mostrarErrores(formulario, errores);
      return;
    }
    limpiarErrores(formulario);

    const id = formulario.elements.productoId.value; // Vacío = crear, con valor = editar.
    const boton = formulario.querySelector('button[type="submit"]');
    cambiarEstadoBoton(boton, true, "Guardando…");

    try {
      if (id) {
        await actualizarProducto(id, datos);
        mostrarNotificacion("Producto actualizado.");
      } else {
        await crearProducto(datos);
        mostrarNotificacion("Producto creado.");
      }
      salirDeEdicion();
      productos = await obtenerProductos();
      dibujarProductos();
    } catch (error) {
      mostrarNotificacion(mensajeDeError(error), "error");
    } finally {
      cambiarEstadoBoton(boton, false);
    }
  });

  function editarProducto(producto) {
    llenarFormularioProducto(formulario, producto);
    limpiarErrores(formulario);
    tituloFormulario.textContent = "Editar producto: " + producto.nombre;
    formulario.querySelector('button[type="submit"]').textContent = "Guardar cambios";
    botonCancelar.hidden = false;
    formulario.scrollIntoView({ behavior: "smooth" });
    formulario.elements.nombre.focus();
  }

  function salirDeEdicion() {
    formulario.reset();
    formulario.elements.productoId.value = "";
    limpiarErrores(formulario);
    tituloFormulario.textContent = "Nuevo producto";
    formulario.querySelector('button[type="submit"]').textContent = "Crear producto";
    botonCancelar.hidden = true;
  }

  botonCancelar.addEventListener("click", salirDeEdicion);

  // --- DELETE de productos ---
  async function borrarProducto(producto, boton) {
    if (!confirm('¿Eliminar "' + producto.nombre + '"? Esta acción es permanente.')) return;

    cambiarEstadoBoton(boton, true, "Eliminando…");
    try {
      await eliminarProducto(producto.id);
      // Quitamos el producto del arreglo local sin volver a consultar.
      productos = productos.filter((p) => p.id !== producto.id);
      dibujarProductos();
      mostrarNotificacion("Producto eliminado.");
      if (formulario.elements.productoId.value === producto.id) salirDeEdicion();
    } catch (error) {
      mostrarNotificacion(mensajeDeError(error), "error");
      cambiarEstadoBoton(boton, false);
    }
  }

  // --- UPDATE del estado de un pedido ---
  async function cambiarEstado(pedido, nuevoEstado, select) {
    select.disabled = true;
    try {
      await actualizarEstadoPedido(pedido.id, nuevoEstado);
      pedido.estado = nuevoEstado; // Actualizamos la copia local.
      mostrarNotificacion("Pedido de " + pedido.clienteNombre + ": " + nuevoEstado);
      dibujarPedidos();
    } catch (error) {
      select.value = pedido.estado; // Revertimos el select si falló.
      mostrarNotificacion(mensajeDeError(error), "error");
    } finally {
      select.disabled = false;
    }
  }

  // --- DELETE de pedidos ---
  async function borrarPedido(pedido, boton) {
    if (!confirm("¿Eliminar el pedido de " + pedido.clienteNombre + "?")) return;

    cambiarEstadoBoton(boton, true, "Eliminando…");
    try {
      await eliminarPedido(pedido.id);
      pedidos = pedidos.filter((p) => p.id !== pedido.id);
      dibujarPedidos();
      mostrarNotificacion("Pedido eliminado.");
    } catch (error) {
      mostrarNotificacion(mensajeDeError(error), "error");
      cambiarEstadoBoton(boton, false);
    }
  }

  // --- Filtros de pedidos ---
  filtroEstado.addEventListener("change", dibujarPedidos);
  buscarPedido.addEventListener("input", dibujarPedidos);

  // --- Datos iniciales ---
  const botonDatos = document.querySelector("#cargar-datos");
  botonDatos.addEventListener("click", async () => {
    if (!confirm("¿Cargar el catálogo inicial y pedidos de demostración?")) return;

    cambiarEstadoBoton(botonDatos, true, "Cargando datos…");
    try {
      const resultado = await cargarDatosIniciales(perfilActual);
      if (resultado.yaExistian > 0) {
        mostrarNotificacion("El catálogo ya tiene " + resultado.yaExistian + " productos; no se duplicó.", "info");
      } else {
        mostrarNotificacion("Se crearon " + resultado.productosCreados + " productos y " + resultado.pedidosCreados + " pedidos.");
      }
      await cargarPanel();
    } catch (error) {
      mostrarNotificacion(mensajeDeError(error), "error");
    } finally {
      cambiarEstadoBoton(botonDatos, false);
    }
  });

  document.querySelector("#actualizar-panel").addEventListener("click", cargarPanel);
  cargarPanel();
}

// =============================================================================
// PÁGINA: LOGIN Y REGISTRO (login.html)
// =============================================================================
function iniciarPaginaLogin() {
  // Si ya hay sesión, no tiene sentido mostrar el login.
  if (perfilActual) {
    redirigirSegunRol(perfilActual);
    return;
  }

  const formLogin = document.querySelector("#form-login");
  const formRegistro = document.querySelector("#form-registro");

  // --- Iniciar sesión ---
  formLogin.addEventListener("submit", async (evento) => {
    evento.preventDefault();

    const datos = {
      correo: formLogin.elements.correo.value.trim(),
      contrasena: formLogin.elements.contrasena.value
    };
    const errores = validarLogin(datos);
    if (!sinErrores(errores)) {
      mostrarErrores(formLogin, errores);
      return;
    }
    limpiarErrores(formLogin);

    const boton = formLogin.querySelector('button[type="submit"]');
    cambiarEstadoBoton(boton, true, "Ingresando…");
    try {
      const perfil = await iniciarSesion(datos.correo, datos.contrasena);
      mostrarNotificacion("¡Bienvenido/a, " + perfil.nombre + "!");
      redirigirSegunRol(perfil);
    } catch (error) {
      mostrarNotificacion(mensajeDeError(error), "error");
      cambiarEstadoBoton(boton, false);
    }
  });

  // --- Registrarse (siempre como cliente) ---
  formRegistro.addEventListener("submit", async (evento) => {
    evento.preventDefault();

    const datos = {
      nombre: formRegistro.elements.nombre.value.trim(),
      correo: formRegistro.elements.correo.value.trim(),
      contrasena: formRegistro.elements.contrasena.value,
      confirmacion: formRegistro.elements.confirmacion.value
    };
    const errores = validarRegistro(datos);
    if (!sinErrores(errores)) {
      mostrarErrores(formRegistro, errores);
      return;
    }
    limpiarErrores(formRegistro);

    const boton = formRegistro.querySelector('button[type="submit"]');
    cambiarEstadoBoton(boton, true, "Creando cuenta…");
    try {
      await registrarUsuario(datos.nombre, datos.correo, datos.contrasena);
      mostrarNotificacion("Cuenta creada. ¡Ya puedes solicitar pedidos!");
      redirigirSegunRol({ rol: "cliente" });
    } catch (error) {
      mostrarNotificacion(mensajeDeError(error), "error");
      cambiarEstadoBoton(boton, false);
    }
  });
}

// Espera un momento para que se lea la notificación y cambia de página.
function redirigirSegunRol(perfil) {
  const hayProductoPendiente = sessionStorage.getItem(CLAVE_PRODUCTO_PENDIENTE) !== null;
  const destino = esAdmin(perfil) && !hayProductoPendiente ? "admin.html" : "pedidos.html";
  setTimeout(() => {
    window.location.href = destino;
  }, 1000);
}
