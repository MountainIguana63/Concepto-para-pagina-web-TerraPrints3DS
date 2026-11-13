// =============================================================================
// datos-iniciales.js  →  CONJUNTO DE DATOS INICIALES (requisito 7)
// -----------------------------------------------------------------------------
// Arreglos de objetos (con la misma estructura que tendrá cada documento en
// Firestore). El administrador los sube con el botón "Cargar datos iniciales"
// del panel admin.html → db.js → cargarDatosIniciales().
//
// Estructura de un producto:
//   nombre (texto), categoria (texto), precio (USD), tiempo (MINUTOS de
//   impresión), infill (% de relleno), medidas (texto), multicolor (booleano),
//   imagen1 / imagen2 (ruta o URL), linkSTL (URL opcional).
// =============================================================================

export const PRODUCTOS_INICIALES = [ // Arreglo de objetos exportado: cada objeto es un producto del catálogo (Clase 11 · Arreglos de objetos; Clase 15 · export)
  { // Inicio de un producto (Clase 11 · Objeto literal)
    nombre: "Llavero de corazón y espada", // Nombre que se muestra en la tarjeta del catálogo
    categoria: "Llaveros", // Categoría que usa el filtro "Categoría" del catálogo
    precio: 14.25, // Precio en dólares (número); se usa para ordenar y para cotizar
    tiempo: 200, // 3h 20m
    infill: 20, // Porcentaje de relleno de la pieza
    medidas: "18x19 cm", // Tamaño de la pieza (texto)
    multicolor: false, // true/false: lo usa el filtro "Solo multicolor" (Clase 10 · Booleanos)
    imagen1: "img/prod1_1.jpg", // Primera foto de la tarjeta (carpeta img)
    imagen2: "img/prod1_2.jpg", // Segunda foto de la tarjeta
    linkSTL: "" // Enlace al archivo 3D; vacío = no se muestra el botón
  }, // Fin del producto
  { // Inicio de un producto (Clase 11 · Objeto literal)
    nombre: "Gancho Real Hasta la Muerte", // Nombre que se muestra en la tarjeta del catálogo
    categoria: "Hogar y funcional", // Categoría que usa el filtro "Categoría" del catálogo
    precio: 15.0, // Precio en dólares (número); se usa para ordenar y para cotizar
    tiempo: 765, // 12h 45m
    infill: 15, // Porcentaje de relleno de la pieza
    medidas: "13x20 cm", // Tamaño de la pieza (texto)
    multicolor: true, // true/false: lo usa el filtro "Solo multicolor" (Clase 10 · Booleanos)
    imagen1: "img/prod2_1.jpg", // Primera foto de la tarjeta (carpeta img)
    imagen2: "img/prod2_2.jpg", // Segunda foto de la tarjeta
    linkSTL: "" // Enlace al archivo 3D; vacío = no se muestra el botón
  }, // Fin del producto
  { // Inicio de un producto (Clase 11 · Objeto literal)
    nombre: "Figura de Tralarelo larala", // Nombre que se muestra en la tarjeta del catálogo
    categoria: "Figuras", // Categoría que usa el filtro "Categoría" del catálogo
    precio: 10.0, // Precio en dólares (número); se usa para ordenar y para cotizar
    tiempo: 370, // 6h 10m
    infill: 15, // Porcentaje de relleno de la pieza
    medidas: "5x10 cm", // Tamaño de la pieza (texto)
    multicolor: true, // true/false: lo usa el filtro "Solo multicolor" (Clase 10 · Booleanos)
    imagen1: "img/prod3_1.jpg", // Primera foto de la tarjeta (carpeta img)
    imagen2: "img/prod3_2.jpg", // Segunda foto de la tarjeta
    linkSTL: "" // Enlace al archivo 3D; vacío = no se muestra el botón
  }, // Fin del producto
  { // Inicio de un producto (Clase 11 · Objeto literal)
    nombre: "Llavero de mapache", // Nombre que se muestra en la tarjeta del catálogo
    categoria: "Llaveros", // Categoría que usa el filtro "Categoría" del catálogo
    precio: 10.0, // Precio en dólares (número); se usa para ordenar y para cotizar
    tiempo: 510, // 8h 30m
    infill: 95, // Porcentaje de relleno de la pieza
    medidas: "10x15 cm", // Tamaño de la pieza (texto)
    multicolor: true, // true/false: lo usa el filtro "Solo multicolor" (Clase 10 · Booleanos)
    imagen1: "img/prod4_1.jpg", // Primera foto de la tarjeta (carpeta img)
    imagen2: "img/prod4_2.jpg", // Segunda foto de la tarjeta
    linkSTL: "" // Enlace al archivo 3D; vacío = no se muestra el botón
  }, // Fin del producto
  { // Inicio de un producto (Clase 11 · Objeto literal)
    nombre: "Llavero de Snoopy", // Nombre que se muestra en la tarjeta del catálogo
    categoria: "Llaveros", // Categoría que usa el filtro "Categoría" del catálogo
    precio: 2.5, // Precio en dólares (número); se usa para ordenar y para cotizar
    tiempo: 615, // 10h 15m
    infill: 25, // Porcentaje de relleno de la pieza
    medidas: "15x8x8 cm", // Tamaño de la pieza (texto)
    multicolor: false, // true/false: lo usa el filtro "Solo multicolor" (Clase 10 · Booleanos)
    imagen1: "img/prod5_1.jpg", // Primera foto de la tarjeta (carpeta img)
    imagen2: "img/prod5_2.jpg", // Segunda foto de la tarjeta
    linkSTL: "" // Enlace al archivo 3D; vacío = no se muestra el botón
  }, // Fin del producto
  { // Inicio de un producto (Clase 11 · Objeto literal)
    nombre: "Figura de búho", // Nombre que se muestra en la tarjeta del catálogo
    categoria: "Figuras", // Categoría que usa el filtro "Categoría" del catálogo
    precio: 5.0, // Precio en dólares (número); se usa para ordenar y para cotizar
    tiempo: 75, // 1h 15m
    infill: 100, // Porcentaje de relleno de la pieza
    medidas: "7x5 cm", // Tamaño de la pieza (texto)
    multicolor: true, // true/false: lo usa el filtro "Solo multicolor" (Clase 10 · Booleanos)
    imagen1: "img/prod6_1.jpg", // Primera foto de la tarjeta (carpeta img)
    imagen2: "img/prod6_2.jpg", // Segunda foto de la tarjeta
    linkSTL: "" // Enlace al archivo 3D; vacío = no se muestra el botón
  }, // Fin del producto
  { // Inicio de un producto (Clase 11 · Objeto literal)
    nombre: "Soporte para reloj", // Nombre que se muestra en la tarjeta del catálogo
    categoria: "Hogar y funcional", // Categoría que usa el filtro "Categoría" del catálogo
    precio: 2.5, // Precio en dólares (número); se usa para ordenar y para cotizar
    tiempo: 840, // 14h 00m
    infill: 10, // Porcentaje de relleno de la pieza
    medidas: "10x7 cm", // Tamaño de la pieza (texto)
    multicolor: false, // true/false: lo usa el filtro "Solo multicolor" (Clase 10 · Booleanos)
    imagen1: "img/prod7_1.jpg", // Primera foto de la tarjeta (carpeta img)
    imagen2: "img/prod7_2.jpg", // Segunda foto de la tarjeta
    linkSTL: "" // Enlace al archivo 3D; vacío = no se muestra el botón
  }, // Fin del producto
  { // Inicio de un producto (Clase 11 · Objeto literal)
    nombre: "Llavero Sanrio Cinnamon Roll", // Nombre que se muestra en la tarjeta del catálogo
    categoria: "Llaveros", // Categoría que usa el filtro "Categoría" del catálogo
    precio: 2.5, // Precio en dólares (número); se usa para ordenar y para cotizar
    tiempo: 615, // 10h 15m
    infill: 25, // Porcentaje de relleno de la pieza
    medidas: "5x5 cm", // Tamaño de la pieza (texto)
    multicolor: true, // true/false: lo usa el filtro "Solo multicolor" (Clase 10 · Booleanos)
    imagen1: "img/prod8_1.jpg", // Primera foto de la tarjeta (carpeta img)
    imagen2: "img/prod8_2.jpg", // Segunda foto de la tarjeta
    linkSTL: "" // Enlace al archivo 3D; vacío = no se muestra el botón
  } // Fin del producto
]; // Fin del arreglo de productos (8 en total)

// Pedidos de demostración (uno por estado) para que el panel admin y sus
// indicadores tengan información desde el inicio. productoNombre permite
// relacionarlos con un producto del catálogo (db.js busca su ID).
export const PEDIDOS_DEMO = [ // Arreglo con 3 pedidos de ejemplo, uno por cada estado, para que el panel admin no empiece vacío
  { // Inicio de un pedido de demostración
    clienteNombre: "Cliente demo - Ana López", // Nombre que aparece en la tabla de pedidos del admin
    clienteCorreo: "demo@sv3dprints.com", // Correo de contacto del cliente demo
    servicio: "catalogo", // Tipo de servicio: catalogo, impresion o modelado
    productoNombre: "Figura de búho", // Producto relacionado; db.js lo cambia por su ID (null = pieza personalizada)
    material: "PLA+", // Filamento elegido (cambia el precio)
    infill: 100, // Porcentaje de relleno
    medidas: "7x5 cm", // Tamaño de la pieza
    cantidad: 4, // Número de piezas
    descripcion: "Cuatro búhos en color café para recuerdos de cumpleaños.", // Lo que escribió el cliente
    precioEstimado: 20.0, // Cotización en dólares; se suma en los indicadores del admin
    minutosEstimados: 300, // Tiempo de máquina; se usa en "Horas de máquina pendientes"
    estado: "Completado" // Estado de fabricación; con esto se cuentan los indicadores
  }, // Fin del pedido
  { // Inicio de un pedido de demostración
    clienteNombre: "Cliente demo - Carlos Rivas", // Nombre que aparece en la tabla de pedidos del admin
    clienteCorreo: "demo@sv3dprints.com", // Correo de contacto del cliente demo
    servicio: "impresion", // Tipo de servicio: catalogo, impresion o modelado
    productoNombre: null, // Producto relacionado; db.js lo cambia por su ID (null = pieza personalizada)
    material: "PETG", // Filamento elegido (cambia el precio)
    infill: 40, // Porcentaje de relleno
    medidas: "12x8x6 cm", // Tamaño de la pieza
    cantidad: 2, // Número de piezas
    descripcion: "Soporte para router; envío el archivo STL por Instagram.", // Lo que escribió el cliente
    precioEstimado: 11.94, // Cotización en dólares; se suma en los indicadores del admin
    minutosEstimados: 552, // Tiempo de máquina; se usa en "Horas de máquina pendientes"
    estado: "Imprimiendo" // Estado de fabricación; con esto se cuentan los indicadores
  }, // Fin del pedido
  { // Inicio de un pedido de demostración
    clienteNombre: "Cliente demo - María Pérez", // Nombre que aparece en la tabla de pedidos del admin
    clienteCorreo: "demo@sv3dprints.com", // Correo de contacto del cliente demo
    servicio: "modelado", // Tipo de servicio: catalogo, impresion o modelado
    productoNombre: null, // Producto relacionado; db.js lo cambia por su ID (null = pieza personalizada)
    material: "PLA+", // Filamento elegido (cambia el precio)
    infill: 20, // Porcentaje de relleno
    medidas: "10x10x15 cm", // Tamaño de la pieza
    cantidad: 1, // Número de piezas
    descripcion: "Modelar desde cero la mascota del logo de mi emprendimiento.", // Lo que escribió el cliente
    precioEstimado: 23.1, // Cotización en dólares; se suma en los indicadores del admin
    minutosEstimados: 540, // Tiempo de máquina; se usa en "Horas de máquina pendientes"
    estado: "En espera" // Estado de fabricación; con esto se cuentan los indicadores
  } // Fin del pedido
]; // Fin del arreglo de pedidos demo
