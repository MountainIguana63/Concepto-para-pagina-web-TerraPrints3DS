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

// =============================================================================
// MAPA RÁPIDO: ¿DÓNDE ESTÁ CADA COSA? (busca el nombre con Ctrl + F)
// -----------------------------------------------------------------------------
// ¿Dónde se renderiza (dibuja) el DOM?
//    dom.js → crear(), renderizarProductos(), crearTarjetaProducto(),
//             renderizarPedidosCliente(), renderizarTablaProductos(),
//             renderizarTablaPedidos(), mostrarIndicadores().
//    Usan createElement + textContent + append/replaceChildren (Clase 14 · DOM).
// ¿Dónde se cancela un pedido?
//    Botón: dom.js → renderizarPedidosCliente() (solo si está "En espera").
//    Acción: main.js → cancelarPedido() → db.js → eliminarPedido().
//    Seguridad: firestore.rules → match /pedidos → allow delete.
// ¿Dónde se cambia el estado de un pedido (admin)?
//    dom.js → renderizarTablaPedidos() (<select>) → main.js → cambiarEstado()
//    → db.js → actualizarEstadoPedido().
// ¿Dónde está el CRUD de productos?
//    db.js → crearProducto(), obtenerProductos(), actualizarProducto(),
//    eliminarProducto(). Lo usan editarProducto() y borrarProducto() aquí.
// ¿Dónde se calcula la cotización?  logica.js → calcularCotizacion().
// ¿Dónde se filtra / busca / ordena?  logica.js → filtrarProductos(),
//    ordenarProductos(), filtrarPedidos(). Se llaman en aplicarFiltros() y dibujarPedidos().
// ¿Dónde están las validaciones?  logica.js → validarLogin(), validarRegistro(),
//    validarPedido(), validarProducto(). Los mensajes los pinta dom.js → mostrarErrores().
// ¿Dónde están los indicadores?  logica.js → resumirPedidos() y resumirCatalogo() (reduce).
// ¿Dónde se registra / inicia / cierra sesión?  auth.js → registrarUsuario(),
//    iniciarSesion(), cerrarSesion(). Los formularios están en iniciarPaginaLogin().
// ¿Dónde se decide si es cliente o admin?  auth.js → obtenerPerfil() y esAdmin();
//    main.js → redirigirSegunRol(). La protección real: firestore.rules → esAdmin().
// ¿Dónde están los eventos?  Aquí, en main.js: todos los addEventListener.
// ¿Dónde está el async/await con try/catch/finally?  Aquí y en db.js / auth.js.
// ¿Dónde se usa sessionStorage?  iniciarPaginaPedidos() y redirigirSegunRol().
// ¿Dónde están los estados de carga, vacío y error?  dom.js → mostrarCargando(),
//    mostrarEstadoVacio(), mostrarErrorEnContenedor(), mostrarNotificacion().
// =============================================================================
import { configuracionPendiente } from "./firebase-config.js"; // Trae la bandera que avisa si falta configurar Firebase (Clase 15 · Módulos: import)
import { registrarUsuario, iniciarSesion, cerrarSesion, esperarSesion, esAdmin } from "./auth.js"; // Trae las funciones de cuentas y roles de auth.js
import { // Inicio de la lista de funciones de base de datos que vienen de db.js
  obtenerProductos, // READ de todos los productos
  obtenerProducto, // READ de un producto
  crearProducto, // CREATE de producto
  actualizarProducto, // UPDATE de producto
  eliminarProducto, // DELETE de producto
  crearPedido, // CREATE de pedido
  obtenerPedidosDeCliente, // READ de pedidos del cliente
  obtenerTodosLosPedidos, // READ de todos los pedidos (admin)
  actualizarEstadoPedido, // UPDATE del estado de un pedido
  eliminarPedido, // DELETE de un pedido (cancelar o eliminar)
  cargarDatosIniciales // Carga del conjunto de datos iniciales
} from "./db.js"; // Fin del import de db.js
import { // Inicio de la lista de funciones de procesamiento y validación de logica.js
  obtenerCategorias, // Categorías sin repetir
  filtrarProductos, // Filtro del catálogo
  ordenarProductos, // Orden del catálogo
  calcularCotizacion, // Regla de negocio de la cotización
  ordenarPorFecha, // Orden de pedidos por fecha
  resumirPedidos, // Indicadores de pedidos
  resumirCatalogo, // Indicadores del catálogo
  filtrarPedidos, // Filtro de pedidos del admin
  validarLogin, // Validación del login
  validarRegistro, // Validación del registro
  validarPedido, // Validación del pedido
  validarProducto, // Validación del producto
  sinErrores, // ¿Hay errores?
  mensajeDeError // Errores de Firebase en español
} from "./logica.js"; // Fin del import de logica.js
import { // Inicio de la lista de funciones que dibujan en pantalla (dom.js)
  mostrarNotificacion, // Avisos flotantes
  mostrarCargando, // Spinner de carga
  mostrarEstadoVacio, // Mensaje cuando no hay datos
  mostrarErrorEnContenedor, // Mensaje de error con Reintentar
  cambiarEstadoBoton, // Botón en "Procesando…"
  mostrarAvisoConfiguracion, // Aviso de configuración
  actualizarNavegacion, // Menú según el rol
  renderizarProductos, // Tarjetas de productos
  actualizarContador, // Contador "Mostrando X de Y"
  llenarSelectCategorias, // Opciones de categoría
  mostrarErrores, // Errores debajo de los campos
  limpiarErrores, // Borrar errores
  mostrarCotizacion, // Recuadro de cotización
  mostrarProductoSeleccionado, // Recuadro del producto elegido
  renderizarPedidosCliente, // Lista "Mis pedidos"
  mostrarResumenCliente, // Resumen del cliente
  mostrarIndicadores, // Indicadores del admin
  renderizarTablaProductos, // Tabla de productos
  renderizarTablaPedidos, // Tabla de pedidos
  llenarFormularioProducto // Llenar formulario para editar
} from "./dom.js"; // Fin del import de dom.js

// Perfil del usuario conectado (null si no hay sesión). Lo usan varias páginas.
let perfilActual = null; // Variable global con let porque cambia al iniciar sesión (Clase 10 · Variables; Clase 12 · Scope global)

// Clave de sessionStorage para recordar el producto elegido antes de iniciar sesión.
const CLAVE_PRODUCTO_PENDIENTE = "productoPendiente"; // Nombre de la llave en sessionStorage (Clase 15 · API Storage)

iniciarAplicacion(); // Arranca la aplicación apenas carga el script (llamada a la función · Clase 12)

// =============================================================================
// ARRANQUE
// =============================================================================
async function iniciarAplicacion() { // Primera función que corre en TODAS las páginas (JS Asíncrono · async)
  if (configuracionPendiente) { // Si falta la configuración de Firebase...
    mostrarAvisoConfiguracion(); // ...muestra el aviso amarillo
    return; // Sin configuración no tiene sentido llamar a Firebase.
  } // Fin del if

  try { // Intenta averiguar quién está conectado (JS Asíncrono · try/catch)
    perfilActual = await esperarSesion(); // ¿Hay alguien conectado? ¿Qué rol tiene?
  } catch (error) { // Si Firebase falló...
    mostrarNotificacion(mensajeDeError(error), "error"); // ...muestra el error en rojo
  } // Fin del try/catch

  actualizarNavegacion(perfilActual, manejarCierreSesion); // Arregla el menú: saludo, Cerrar sesión y Panel admin según el rol

  // Ejecutamos solo la lógica de la página actual.
  const pagina = document.body.dataset.pagina; // Lee data-pagina del <body>, por ejemplo "catalogo" (Clase 14 DOM · Atributos de datos data-*)
  switch (pagina) { // Según la página, ejecuta solo su función (Clase 10 · switch)
    case "inicio": // index.html
      iniciarPaginaInicio(); // Destacados
      break; // break evita que siga con el siguiente case (Clase 10 · break)
    case "catalogo": // catalogo.html
      iniciarPaginaCatalogo(); // Búsqueda y filtros
      break; // Sale del switch
    case "pedidos": // pedidos.html
      iniciarPaginaPedidos(); // Formulario y Mis pedidos
      break; // Sale del switch
    case "admin": // admin.html
      iniciarPaginaAdmin(); // Panel de administración
      break; // Sale del switch
    case "login": // login.html
      iniciarPaginaLogin(); // Formularios de acceso
      break; // Sale del switch
  } // Fin del switch
} // Fin de iniciarAplicacion

async function manejarCierreSesion() { // CERRAR SESIÓN: la ejecuta el botón "Cerrar sesión" del menú
  try { // Intenta...
    await cerrarSesion(); // ...cerrar la sesión en Firebase y esperar (await)
    window.location.href = "index.html"; // ...y regresar a la página de inicio
  } catch (error) { // Si falla...
    mostrarNotificacion(mensajeDeError(error), "error"); // ...avisa el error
  } // Fin del try/catch
} // Fin de manejarCierreSesion

// =============================================================================
// PÁGINA: INICIO (index.html) → productos destacados dinámicos
// =============================================================================
async function iniciarPaginaInicio() { // PÁGINA DE INICIO: muestra los productos destacados desde Firestore
  const contenedor = document.querySelector("#productos-destacados"); // Busca la sección de destacados en el HTML (Clase 14 DOM · querySelector)
  mostrarCargando(contenedor, "Cargando productos destacados…"); // Muestra el spinner mientras llegan los datos (retroalimentación visible)

  try { // Intenta...
    const productos = await obtenerProductos(); // ...traer los productos de Firestore (await)
    // Destacados = los 4 productos más económicos del catálogo.
    const destacados = ordenarProductos(productos, "precio-asc").slice(0, 4); // Ordena por precio y toma los 4 primeros (Clase 11 · slice)
    renderizarProductos(contenedor, destacados, "Pronto agregaremos productos al catálogo."); // Dibuja las 4 tarjetas en la página
  } catch (error) { // Si algo falla...
    mostrarErrorEnContenedor(contenedor, mensajeDeError(error), iniciarPaginaInicio); // ...muestra el error con un botón Reintentar que vuelve a llamar esta misma función
  } // Fin del try/catch
} // Fin de iniciarPaginaInicio

// =============================================================================
// PÁGINA: CATÁLOGO (catalogo.html) → búsqueda, filtros y orden
// =============================================================================
let productosCatalogo = []; // Copia local: filtramos sin volver a consultar Firestore.

async function iniciarPaginaCatalogo() { // PÁGINA DE CATÁLOGO: carga productos y conecta el buscador y los filtros
  const contenedor = document.querySelector("#catalogo"); // Donde van las tarjetas (Clase 14 DOM)
  const formulario = document.querySelector("#form-filtros"); // Formulario de filtros
  const contador = document.querySelector("#contador-resultados"); // Texto "Mostrando X de Y"

  mostrarCargando(contenedor, "Cargando catálogo…"); // Spinner mientras carga

  try { // Intenta...
    productosCatalogo = await obtenerProductos(); // ...traer los productos una sola vez y guardarlos en la variable
    llenarSelectCategorias(formulario.elements.categoria, obtenerCategorias(productosCatalogo)); // ...llenar el select de categorías
    aplicarFiltros(); // ...y dibujar el catálogo por primera vez
  } catch (error) { // Si falla...
    contador.textContent = ""; // ...borra el contador
    mostrarErrorEnContenedor(contenedor, mensajeDeError(error), iniciarPaginaCatalogo); // ...muestra el error con Reintentar
    return; // ...y no conecta los eventos
  } // Fin del try/catch

  // "input" se dispara con cada letra; "change" al cambiar select/checkbox.
  formulario.addEventListener("input", aplicarFiltros); // Evento "input": cada letra que se escribe vuelve a filtrar (Clase 12 · Eventos de formulario)
  formulario.addEventListener("change", aplicarFiltros); // Evento "change": al cambiar el select o la casilla también filtra
  formulario.addEventListener("submit", (evento) => evento.preventDefault()); // Evita que Enter recargue la página (Clase 12 · El objeto Event: preventDefault)
  formulario.addEventListener("reset", () => setTimeout(aplicarFiltros, 0)); // Espera a que se limpien los campos.

  function aplicarFiltros() { // Función interna (closure): ve las variables de arriba (Clase 12 · Scope chain)
    const filtros = { // Objeto con lo que la persona eligió en los filtros
      texto: formulario.elements.texto.value, // Texto del buscador (Clase 14 DOM · leer valores de formularios)
      categoria: formulario.elements.categoria.value, // Categoría elegida
      soloMulticolor: formulario.elements.multicolor.checked // Casilla multicolor marcada o no
    }; // Fin del objeto
    const filtrados = filtrarProductos(productosCatalogo, filtros); // Procesamiento: filtrar (logica.js)
    const ordenados = ordenarProductos(filtrados, formulario.elements.orden.value); // Procesamiento: ordenar según el select (logica.js)

    renderizarProductos(contenedor, ordenados, "Ningún producto coincide con tu búsqueda."); // Dibuja solo los que pasaron el filtro
    actualizarContador(contador, ordenados.length, productosCatalogo.length); // Actualiza el contador
  } // Fin de aplicarFiltros
} // Fin de iniciarPaginaCatalogo

// =============================================================================
// PÁGINA: PEDIDOS (pedidos.html) → cotizar, crear y consultar pedidos
// =============================================================================
async function iniciarPaginaPedidos() { // PÁGINA DE PEDIDOS: proceso del cliente (cotizar, enviar, ver y cancelar)
  const parametros = new URLSearchParams(window.location.search); // Lee los parámetros de la URL, por ejemplo ?producto=abc
  const idProducto = parametros.get("producto") || sessionStorage.getItem(CLAVE_PRODUCTO_PENDIENTE); // Id del producto desde la URL o desde sessionStorage (Clase 15 · Recuperar datos de Storage)

  // Página protegida: si no hay sesión, se guarda el producto y se va al login.
  if (!perfilActual) { // Si no hay sesión...
    if (idProducto) sessionStorage.setItem(CLAVE_PRODUCTO_PENDIENTE, idProducto); // ...guarda el producto para no perderlo (Clase 15 · Guardar datos en Storage)
    window.location.href = "login.html"; // ...y manda al login
    return; // ...y termina
  } // Fin del if
  sessionStorage.removeItem(CLAVE_PRODUCTO_PENDIENTE); // Ya hay sesión: borra el producto guardado (Clase 15 · Eliminar datos de Storage)

  const formulario = document.querySelector("#form-pedido"); // Formulario de pedido (Clase 14 DOM · Seleccionar elementos)
  const cajaProducto = document.querySelector("#producto-seleccionado"); // Recuadro del producto elegido
  const grupoMedidas = document.querySelector("#grupo-medidas"); // Grupo de campos largo/ancho/alto
  const opcionCatalogo = formulario.elements.servicio.querySelector('option[value="catalogo"]'); // La opción "Producto del catálogo" del select de servicio
  const cotizacion = document.querySelector("#cotizacion"); // Recuadro azul de la cotización
  const listaPedidos = document.querySelector("#mis-pedidos"); // Sección "Mis pedidos"
  const resumen = document.querySelector("#resumen-cliente"); // Tarjetas de resumen

  document.querySelector("#saludo-cliente").textContent = "Sesión iniciada como " + perfilActual.nombre + "."; // Escribe "Sesión iniciada como Ana" (Clase 14 DOM · textContent)

  let productoSeleccionado = null; // Producto elegido; null si es pieza personalizada

  // --- 1. Producto elegido desde el catálogo (relación pedido → producto) ---
  if (idProducto) { // Si llegó un id de producto...
    try { // Intenta...
      productoSeleccionado = await obtenerProducto(idProducto); // ...leer ese producto de Firestore (await)
      if (!productoSeleccionado) { // Si no existe...
        mostrarNotificacion("El producto seleccionado ya no existe.", "info"); // ...avisa en azul
      } // Fin del if
    } catch (error) { // Si falla...
      mostrarNotificacion(mensajeDeError(error), "error"); // ...avisa el error
    } // Fin del try/catch
  } // Fin del if
  aplicarProducto(); // Aplica el producto (o ninguno) al formulario

  function aplicarProducto() { // Ajusta el formulario según si hay producto elegido
    opcionCatalogo.disabled = productoSeleccionado === null; // Desactiva la opción "catálogo" si no hay producto
    if (productoSeleccionado) { // Si hay producto...
      formulario.elements.servicio.value = "catalogo"; // ...pone el servicio en "catálogo"
      formulario.elements.infill.value = productoSeleccionado.infill; // ...y copia su relleno
    } else if (formulario.elements.servicio.value === "catalogo") { // Si no hay producto pero el select decía catálogo...
      formulario.elements.servicio.value = ""; // ...lo deja vacío para que elija
    } // Fin del if
    mostrarProductoSeleccionado(cajaProducto, productoSeleccionado, quitarProducto); // Dibuja o esconde el recuadro del producto
    actualizarFormulario(); // Recalcula la cotización
  } // Fin de aplicarProducto

  function quitarProducto() { // Botón "Quitar" del recuadro del producto
    productoSeleccionado = null; // Olvida el producto
    history.replaceState(null, "", "pedidos.html"); // Limpia ?producto= de la URL.
    aplicarProducto(); // Vuelve a ajustar el formulario
  } // Fin de quitarProducto

  // --- 2. Leer el formulario y recalcular la cotización en cada cambio ---
  function leerFormulario() { // Lee todos los campos y los convierte en un objeto
    const f = formulario.elements; // Atajo a los campos del formulario (Clase 14 DOM · elements)
    return { // Devuelve un objeto con los valores (Clase 11 · Objeto literal)
      servicio: f.servicio.value, // Servicio elegido
      material: f.material.value, // Material
      infill: Number(f.infill.value), // Relleno convertido a número (Clase 10 · Conversión de tipos)
      largo: Number(f.largo.value), // Largo
      ancho: Number(f.ancho.value), // Ancho
      alto: Number(f.alto.value), // Alto
      cantidad: Number(f.cantidad.value), // Cantidad
      descripcion: f.descripcion.value, // Descripción
      producto: productoSeleccionado // Producto elegido o null
    }; // Fin del objeto
  } // Fin de leerFormulario

  function actualizarFormulario() { // Se ejecuta con CADA cambio del formulario
    // Las medidas solo aplican a piezas personalizadas.
    const esCatalogo = formulario.elements.servicio.value === "catalogo"; // ¿Es del catálogo? (true/false)
    grupoMedidas.hidden = esCatalogo; // Esconde las medidas si es del catálogo (Clase 14 DOM · hidden)
    grupoMedidas.disabled = esCatalogo; // Las desactiva para que no se validen
    mostrarCotizacion(cotizacion, calcularCotizacion(leerFormulario())); // Calcula y muestra la cotización en vivo (logica.js + dom.js)
  } // Fin de actualizarFormulario

  formulario.addEventListener("input", actualizarFormulario); // Evento "input": al escribir recalcula el precio (Clase 12 · Eventos de formulario)
  formulario.addEventListener("change", actualizarFormulario); // Evento "change": al cambiar un select también

  // --- 3. Enviar el pedido ---
  formulario.addEventListener("submit", async (evento) => { // ENVIAR PEDIDO: evento "submit" con función asíncrona (Clase 12 · Eventos; JS Asíncrono)
    evento.preventDefault(); // Evita que el navegador recargue la página.

    const datos = leerFormulario(); // Lee el formulario
    const errores = validarPedido(datos); // Valida con las reglas del negocio (logica.js)
    if (!sinErrores(errores)) { // Si hay errores...
      mostrarErrores(formulario, errores); // ...los escribe debajo de cada campo
      mostrarNotificacion("Revisa los campos marcados.", "error"); // ...avisa en rojo
      return; // ...y NO envía nada a Firebase
    } // Fin del if
    limpiarErrores(formulario); // Si todo está bien, borra los errores anteriores

    const calculo = calcularCotizacion(datos); // Calcula el precio final que se guardará
    const esCatalogo = datos.servicio === "catalogo"; // ¿Es del catálogo?
    const boton = formulario.querySelector('button[type="submit"]'); // Busca el botón Enviar
    cambiarEstadoBoton(boton, true, "Enviando pedido…"); // Lo pone en "Enviando pedido…" y lo bloquea (retroalimentación)

    try { // Intenta...
      await crearPedido({ // ...crear el pedido en Firestore (await)
        clienteId: perfilActual.uid, // Quién lo pide: su uid (las reglas exigen que sea el mismo usuario)
        clienteNombre: perfilActual.nombre, // Nombre del cliente
        clienteCorreo: perfilActual.correo, // Correo del cliente
        servicio: datos.servicio, // Servicio
        productoId: esCatalogo ? productoSeleccionado.id : null, // Relación con el producto: su id o null (Clase 10 · ternario)
        productoNombre: esCatalogo ? productoSeleccionado.nombre : null, // Nombre del producto o null
        material: datos.material, // Material
        infill: datos.infill, // Relleno
        medidas: esCatalogo ? productoSeleccionado.medidas : datos.largo + "x" + datos.ancho + "x" + datos.alto + " cm", // Medidas: las del producto o "LxAxH cm" (Clase 11 · Concatenación)
        cantidad: datos.cantidad, // Cantidad
        descripcion: datos.descripcion.trim(), // Descripción sin espacios sobrantes (trim)
        precioEstimado: calculo.precio, // Precio estimado
        minutosEstimados: calculo.minutos // Minutos estimados
      }); // Fin del objeto del pedido

      mostrarNotificacion("¡Pedido enviado! Te avisaremos cuando cambie su estado."); // Avisa en verde
      formulario.reset(); // Limpia el formulario
      quitarProducto(); // Quita el producto elegido
      await cargarMisPedidos(); // Vuelve a cargar "Mis pedidos" para que aparezca el nuevo
    } catch (error) { // Si falla (sin internet, reglas...)...
      mostrarNotificacion(mensajeDeError(error), "error"); // ...avisa en rojo
    } finally { // finally se ejecuta SIEMPRE, salga bien o mal (JS Asíncrono · try/catch/finally)
      cambiarEstadoBoton(boton, false); // Siempre se vuelve a habilitar.
    } // Fin del finally
  }); // Fin del evento submit

  // --- 4. Consultar "Mis pedidos" ---
  async function cargarMisPedidos() { // CONSULTAR MIS PEDIDOS: trae y dibuja los pedidos del cliente
    mostrarCargando(listaPedidos, "Consultando tus pedidos…"); // Spinner
    try { // Intenta...
      const pedidos = ordenarPorFecha(await obtenerPedidosDeCliente(perfilActual.uid)); // ...traer SUS pedidos (await) y ordenarlos por fecha
      mostrarResumenCliente(resumen, resumirPedidos(pedidos)); // ...dibujar el resumen
      renderizarPedidosCliente(listaPedidos, pedidos, cancelarPedido); // ...dibujar las tarjetas, pasando cancelarPedido como callback del botón Cancelar
    } catch (error) { // Si falla...
      mostrarErrorEnContenedor(listaPedidos, mensajeDeError(error), cargarMisPedidos); // ...muestra el error con Reintentar
    } // Fin del try/catch
  } // Fin de cargarMisPedidos

  async function cancelarPedido(pedido, boton) { // FUNCIONALIDAD DE CANCELAR: se ejecuta al tocar "Cancelar pedido" en una tarjeta
    if (!confirm("¿Cancelar este pedido? Esta acción no se puede deshacer.")) return; // Pregunta antes; si dice que no, return termina (Usando ventanas del navegador · confirm)

    cambiarEstadoBoton(boton, true, "Cancelando…"); // Pone el botón en "Cancelando…"
    try { // Intenta...
      await eliminarPedido(pedido.id); // ...borrar el pedido en Firestore (db.js → eliminarPedido)
      mostrarNotificacion("Pedido cancelado."); // ...avisa en verde
      await cargarMisPedidos(); // ...y vuelve a dibujar la lista
    } catch (error) { // Si falla (por ejemplo, el admin ya lo puso en "Imprimiendo")...
      mostrarNotificacion(mensajeDeError(error), "error"); // ...avisa el error
      cambiarEstadoBoton(boton, false); // ...y reactiva el botón
    } // Fin del try/catch
  } // Fin de cancelarPedido

  document.querySelector("#actualizar-pedidos").addEventListener("click", cargarMisPedidos); // Botón "Actualizar": vuelve a consultar los pedidos (Clase 12 · Eventos del mouse)
  cargarMisPedidos(); // Carga los pedidos al entrar a la página
} // Fin de iniciarPaginaPedidos

// =============================================================================
// PÁGINA: PANEL ADMIN (admin.html) → CRUD de productos y estados de pedidos
// =============================================================================
async function iniciarPaginaAdmin() { // PANEL ADMIN: CRUD de productos, estados de pedidos e indicadores
  if (!perfilActual) { // Si no hay sesión...
    window.location.href = "login.html"; // ...manda al login
    return; // ...y termina
  } // Fin del if
  // Si no es admin solo mostramos un aviso. Aunque alguien modificara este
  // código, las reglas de Firestore rechazarían sus escrituras.
  if (!esAdmin(perfilActual)) { // Si la persona NO es admin...
    document.querySelector("#acceso-denegado").hidden = false; // ...muestra "Acceso restringido" (Clase 14 DOM · hidden)
    return; // ...y termina
  } // Fin del if
  document.querySelector("#panel-admin").hidden = false; // Es admin: muestra el panel

  const indicadores = document.querySelector("#indicadores"); // Contenedor de indicadores (Clase 14 DOM · querySelector)
  const formulario = document.querySelector("#form-producto"); // Formulario de producto
  const tituloFormulario = document.querySelector("#titulo-form-producto"); // Título del formulario (Nuevo / Editar)
  const botonCancelar = document.querySelector("#cancelar-edicion"); // Botón para salir de la edición
  const tablaProductos = document.querySelector("#tabla-productos"); // Donde va la tabla de productos
  const tablaPedidos = document.querySelector("#tabla-pedidos"); // Donde va la tabla de pedidos
  const filtroEstado = document.querySelector("#filtro-estado"); // Select para filtrar por estado
  const buscarPedido = document.querySelector("#buscar-pedido"); // Buscador de pedidos

  let productos = []; // Copia local de los productos (Clase 11 · Arreglos)
  let pedidos = []; // Copia local de los pedidos

  // --- Cargar todo el panel ---
  async function cargarPanel() { // Carga todo el panel desde Firestore
    mostrarCargando(tablaProductos, "Cargando productos…"); // Spinner en la tabla de productos
    mostrarCargando(tablaPedidos, "Cargando pedidos…"); // Spinner en la tabla de pedidos
    try { // Intenta...
      // Promise.all espera las dos consultas al mismo tiempo.
      [productos, pedidos] = await Promise.all([obtenerProductos(), obtenerTodosLosPedidos()]); // ...pedir productos y pedidos AL MISMO TIEMPO y guardarlos (Destructuración de arreglos · Clase 11)
      dibujarProductos(); // ...dibujar productos
      dibujarPedidos(); // ...dibujar pedidos
    } catch (error) { // Si falla...
      mostrarErrorEnContenedor(tablaProductos, mensajeDeError(error), cargarPanel); // ...error con Reintentar en productos
      mostrarEstadoVacio(tablaPedidos, "No se pudieron cargar los pedidos."); // ...y mensaje en pedidos
    } // Fin del try/catch
  } // Fin de cargarPanel

  function dibujarIndicadores() { // Recalcula y dibuja las tarjetas de números
    mostrarIndicadores(indicadores, resumirPedidos(pedidos), resumirCatalogo(productos)); // Procesa los datos (logica.js) y los dibuja (dom.js)
  } // Fin de dibujarIndicadores

  function dibujarProductos() { // Dibuja la tabla de productos
    renderizarTablaProductos(tablaProductos, productos, { alEditar: editarProducto, alEliminar: borrarProducto }); // Le pasa qué hacer al tocar Editar y Eliminar (callbacks en un objeto)
    dibujarIndicadores(); // Actualiza los indicadores
  } // Fin de dibujarProductos

  function dibujarPedidos() { // Dibuja la tabla de pedidos con los filtros aplicados
    const filtrados = filtrarPedidos(pedidos, filtroEstado.value, buscarPedido.value); // Filtra por estado y por texto (logica.js)
    renderizarTablaPedidos(tablaPedidos, filtrados, { alCambiarEstado: cambiarEstado, alEliminar: borrarPedido }); // Le pasa qué hacer al cambiar estado y al eliminar
    dibujarIndicadores(); // Actualiza los indicadores
  } // Fin de dibujarPedidos

  // --- CREATE / UPDATE de productos (mismo formulario) ---
  function leerProducto() { // Lee el formulario de producto y lo convierte en objeto
    const f = formulario.elements; // Atajo a los campos
    return { // Objeto con los datos limpios
      nombre: f.nombre.value.trim(), // Nombre sin espacios sobrantes (trim)
      categoria: f.categoria.value.trim(), // Categoría
      precio: Number(f.precio.value), // Precio como número
      tiempo: Number(f.tiempo.value), // Tiempo como número
      infill: Number(f.infill.value), // Relleno como número
      medidas: f.medidas.value.trim(), // Medidas
      multicolor: f.multicolor.checked, // Casilla marcada (true/false)
      imagen1: f.imagen1.value.trim(), // Imagen 1
      imagen2: f.imagen2.value.trim(), // Imagen 2
      linkSTL: f.linkSTL.value.trim() // Enlace STL
    }; // Fin del objeto
  } // Fin de leerProducto

  formulario.addEventListener("submit", async (evento) => { // GUARDAR PRODUCTO (crear o editar): evento submit asíncrono
    evento.preventDefault(); // Evita que la página se recargue (preventDefault)

    const datos = leerProducto(); // Lee los datos
    const errores = validarProducto(datos); // Valida (logica.js)
    if (!sinErrores(errores)) { // Si hay errores...
      mostrarErrores(formulario, errores); // ...los muestra
      return; // ...y no guarda
    } // Fin del if
    limpiarErrores(formulario); // Borra errores anteriores

    const id = formulario.elements.productoId.value; // Vacío = crear, con valor = editar.
    const boton = formulario.querySelector('button[type="submit"]'); // Busca el botón Guardar
    cambiarEstadoBoton(boton, true, "Guardando…"); // Lo pone en "Guardando…"

    try { // Intenta...
      if (id) { // Si hay id es EDICIÓN... (Clase 10 · if-else)
        await actualizarProducto(id, datos); // ...UPDATE en Firestore
        mostrarNotificacion("Producto actualizado."); // ...aviso verde
      } else { // Si no hay id es NUEVO...
        await crearProducto(datos); // ...CREATE en Firestore
        mostrarNotificacion("Producto creado."); // ...aviso verde
      } // Fin del if-else
      salirDeEdicion(); // Limpia el formulario
      productos = await obtenerProductos(); // Vuelve a traer los productos
      dibujarProductos(); // Y redibuja la tabla
    } catch (error) { // Si falla (por ejemplo, permiso denegado)...
      mostrarNotificacion(mensajeDeError(error), "error"); // ...aviso rojo
    } finally { // Siempre...
      cambiarEstadoBoton(boton, false); // ...reactiva el botón
    } // Fin del try/catch/finally
  }); // Fin del evento submit

  function editarProducto(producto) { // EDITAR: se ejecuta al tocar "Editar" en la tabla de productos
    llenarFormularioProducto(formulario, producto); // Copia los datos del producto al formulario (dom.js)
    limpiarErrores(formulario); // Borra errores viejos
    tituloFormulario.textContent = "Editar producto: " + producto.nombre; // Cambia el título a "Editar producto: ..."
    formulario.querySelector('button[type="submit"]').textContent = "Guardar cambios"; // Cambia el texto del botón
    botonCancelar.hidden = false; // Muestra el botón "Cancelar edición"
    formulario.scrollIntoView({ behavior: "smooth" }); // Lleva la pantalla hasta el formulario
    formulario.elements.nombre.focus(); // Pone el cursor en el campo nombre
  } // Fin de editarProducto

  function salirDeEdicion() { // Vuelve el formulario a modo "Nuevo producto"
    formulario.reset(); // Borra todos los campos
    formulario.elements.productoId.value = ""; // Vacía el id oculto
    limpiarErrores(formulario); // Borra errores
    tituloFormulario.textContent = "Nuevo producto"; // Título original
    formulario.querySelector('button[type="submit"]').textContent = "Crear producto"; // Texto original del botón
    botonCancelar.hidden = true; // Esconde "Cancelar edición"
  } // Fin de salirDeEdicion

  botonCancelar.addEventListener("click", salirDeEdicion); // Botón "Cancelar edición" (Clase 12 · addEventListener)

  // --- DELETE de productos ---
  async function borrarProducto(producto, boton) { // ELIMINAR PRODUCTO: se ejecuta al tocar "Eliminar" en la tabla
    if (!confirm('¿Eliminar "' + producto.nombre + '"? Esta acción es permanente.')) return; // Pregunta antes; si cancela, termina (confirm)

    cambiarEstadoBoton(boton, true, "Eliminando…"); // Botón en "Eliminando…"
    try { // Intenta...
      await eliminarProducto(producto.id); // ...DELETE en Firestore
      // Quitamos el producto del arreglo local sin volver a consultar.
      productos = productos.filter((p) => p.id !== producto.id); // ...lo quita de la copia local con filter (Clase 11 · filter)
      dibujarProductos(); // ...redibuja la tabla
      mostrarNotificacion("Producto eliminado."); // ...aviso verde
      if (formulario.elements.productoId.value === producto.id) salirDeEdicion(); // ...si justo se estaba editando, sale de la edición
    } catch (error) { // Si falla...
      mostrarNotificacion(mensajeDeError(error), "error"); // ...aviso rojo
      cambiarEstadoBoton(boton, false); // ...y reactiva el botón
    } // Fin del try/catch
  } // Fin de borrarProducto

  // --- UPDATE del estado de un pedido ---
  async function cambiarEstado(pedido, nuevoEstado, select) { // CAMBIAR ESTADO: se ejecuta al elegir otro estado en el <select> de la tabla de pedidos
    select.disabled = true; // Bloquea el select mientras guarda
    try { // Intenta...
      await actualizarEstadoPedido(pedido.id, nuevoEstado); // ...UPDATE del estado en Firestore
      pedido.estado = nuevoEstado; // Actualizamos la copia local.
      mostrarNotificacion("Pedido de " + pedido.clienteNombre + ": " + nuevoEstado); // ...aviso verde con el nombre del cliente
      dibujarPedidos(); // ...redibuja la tabla e indicadores
    } catch (error) { // Si falla...
      select.value = pedido.estado; // Revertimos el select si falló.
      mostrarNotificacion(mensajeDeError(error), "error"); // ...aviso rojo
    } finally { // Siempre...
      select.disabled = false; // ...desbloquea el select
    } // Fin del try/catch/finally
  } // Fin de cambiarEstado

  // --- DELETE de pedidos ---
  async function borrarPedido(pedido, boton) { // ELIMINAR PEDIDO (admin): se ejecuta al tocar "Eliminar" en la tabla de pedidos
    if (!confirm("¿Eliminar el pedido de " + pedido.clienteNombre + "?")) return; // Pregunta antes (confirm)

    cambiarEstadoBoton(boton, true, "Eliminando…"); // Botón en "Eliminando…"
    try { // Intenta...
      await eliminarPedido(pedido.id); // ...DELETE en Firestore
      pedidos = pedidos.filter((p) => p.id !== pedido.id); // ...lo quita de la copia local (filter)
      dibujarPedidos(); // ...redibuja
      mostrarNotificacion("Pedido eliminado."); // ...aviso verde
    } catch (error) { // Si falla...
      mostrarNotificacion(mensajeDeError(error), "error"); // ...aviso rojo
      cambiarEstadoBoton(boton, false); // ...reactiva el botón
    } // Fin del try/catch
  } // Fin de borrarPedido

  // --- Filtros de pedidos ---
  filtroEstado.addEventListener("change", dibujarPedidos); // Evento change del select de estado: vuelve a filtrar la tabla
  buscarPedido.addEventListener("input", dibujarPedidos); // Evento input del buscador: filtra con cada letra

  // --- Datos iniciales ---
  const botonDatos = document.querySelector("#cargar-datos"); // Botón "Cargar datos iniciales"
  botonDatos.addEventListener("click", async () => { // Evento click con función asíncrona
    if (!confirm("¿Cargar el catálogo inicial y pedidos de demostración?")) return; // Pregunta antes (confirm)

    cambiarEstadoBoton(botonDatos, true, "Cargando datos…"); // Botón en "Cargando datos…"
    try { // Intenta...
      const resultado = await cargarDatosIniciales(perfilActual); // ...subir los datos iniciales (db.js)
      if (resultado.yaExistian > 0) { // Si ya había productos...
        mostrarNotificacion("El catálogo ya tiene " + resultado.yaExistian + " productos; no se duplicó.", "info"); // ...avisa que no se duplicó
      } else { // Si no...
        mostrarNotificacion("Se crearon " + resultado.productosCreados + " productos y " + resultado.pedidosCreados + " pedidos."); // ...avisa cuántos se crearon
      } // Fin del if-else
      await cargarPanel(); // ...y recarga el panel
    } catch (error) { // Si falla...
      mostrarNotificacion(mensajeDeError(error), "error"); // ...aviso rojo
    } finally { // Siempre...
      cambiarEstadoBoton(botonDatos, false); // ...reactiva el botón
    } // Fin del try/catch/finally
  }); // Fin del evento click

  document.querySelector("#actualizar-panel").addEventListener("click", cargarPanel); // Botón "Actualizar" del panel
  cargarPanel(); // Carga el panel al entrar
} // Fin de iniciarPaginaAdmin

// =============================================================================
// PÁGINA: LOGIN Y REGISTRO (login.html)
// =============================================================================
function iniciarPaginaLogin() { // PÁGINA DE LOGIN: conecta los formularios de iniciar sesión y crear cuenta
  // Si ya hay sesión, no tiene sentido mostrar el login.
  if (perfilActual) { // Si ya hay sesión...
    redirigirSegunRol(perfilActual); // ...lo manda a su página según el rol
    return; // ...y termina
  } // Fin del if

  const formLogin = document.querySelector("#form-login"); // Formulario "Iniciar sesión" (Clase 14 DOM · querySelector)
  const formRegistro = document.querySelector("#form-registro"); // Formulario "Crear cuenta"

  // --- Iniciar sesión ---
  formLogin.addEventListener("submit", async (evento) => { // INICIAR SESIÓN: evento submit asíncrono (Clase 12 · Eventos de formulario)
    evento.preventDefault(); // Evita que el navegador recargue la página

    const datos = { // Objeto con lo escrito
      correo: formLogin.elements.correo.value.trim(), // Correo sin espacios (trim)
      contrasena: formLogin.elements.contrasena.value // Contraseña
    }; // Fin del objeto
    const errores = validarLogin(datos); // Valida antes de llamar a Firebase
    if (!sinErrores(errores)) { // Si hay errores...
      mostrarErrores(formLogin, errores); // ...los muestra
      return; // ...y no sigue
    } // Fin del if
    limpiarErrores(formLogin); // Borra errores anteriores

    const boton = formLogin.querySelector('button[type="submit"]'); // Botón Ingresar
    cambiarEstadoBoton(boton, true, "Ingresando…"); // Lo pone en "Ingresando…"
    try { // Intenta...
      const perfil = await iniciarSesion(datos.correo, datos.contrasena); // ...iniciar sesión y obtener el perfil con el rol (auth.js)
      mostrarNotificacion("¡Bienvenido/a, " + perfil.nombre + "!"); // ...saludo en verde (Concatenación)
      redirigirSegunRol(perfil); // ...y lo manda a su página
    } catch (error) { // Si la contraseña está mal u otro error...
      mostrarNotificacion(mensajeDeError(error), "error"); // ...aviso rojo en español
      cambiarEstadoBoton(boton, false); // ...y reactiva el botón
    } // Fin del try/catch
  }); // Fin del evento submit

  // --- Registrarse (siempre como cliente) ---
  formRegistro.addEventListener("submit", async (evento) => { // CREAR CUENTA: evento submit asíncrono
    evento.preventDefault(); // Evita la recarga

    const datos = { // Objeto con lo escrito
      nombre: formRegistro.elements.nombre.value.trim(), // Nombre
      correo: formRegistro.elements.correo.value.trim(), // Correo
      contrasena: formRegistro.elements.contrasena.value, // Contraseña
      confirmacion: formRegistro.elements.confirmacion.value // Confirmación
    }; // Fin del objeto
    const errores = validarRegistro(datos); // Valida (logica.js)
    if (!sinErrores(errores)) { // Si hay errores...
      mostrarErrores(formRegistro, errores); // ...los muestra
      return; // ...y no sigue
    } // Fin del if
    limpiarErrores(formRegistro); // Borra errores anteriores

    const boton = formRegistro.querySelector('button[type="submit"]'); // Botón Registrarse
    cambiarEstadoBoton(boton, true, "Creando cuenta…"); // Lo pone en "Creando cuenta…"
    try { // Intenta...
      await registrarUsuario(datos.nombre, datos.correo, datos.contrasena); // ...crear la cuenta y su perfil de cliente (auth.js)
      mostrarNotificacion("Cuenta creada. ¡Ya puedes solicitar pedidos!"); // ...aviso verde
      redirigirSegunRol({ rol: "cliente" }); // ...y lo manda a pedidos (siempre es cliente)
    } catch (error) { // Si el correo ya existe u otro error...
      mostrarNotificacion(mensajeDeError(error), "error"); // ...aviso rojo
      cambiarEstadoBoton(boton, false); // ...y reactiva el botón
    } // Fin del try/catch
  }); // Fin del evento submit
} // Fin de iniciarPaginaLogin

// Espera un momento para que se lea la notificación y cambia de página.
function redirigirSegunRol(perfil) { // Decide a dónde va cada rol después de entrar
  const hayProductoPendiente = sessionStorage.getItem(CLAVE_PRODUCTO_PENDIENTE) !== null; // ¿Quedó guardado un producto antes de iniciar sesión? (Clase 15 · sessionStorage)
  const destino = esAdmin(perfil) && !hayProductoPendiente ? "admin.html" : "pedidos.html"; // Admin sin producto pendiente → panel; todos los demás → pedidos (Clase 10 · Operador ternario y &&)
  setTimeout(() => { // Espera 1 segundo para que se lea el aviso (JS Asíncrono · setTimeout)
    window.location.href = destino; // Cambia de página
  }, 1000); // 1000 milisegundos = 1 segundo
} // Fin de redirigirSegunRol
