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

export const PRODUCTOS_INICIALES = [
  {
    nombre: "Llavero de corazón y espada",
    categoria: "Llaveros",
    precio: 14.25,
    tiempo: 200, // 3h 20m
    infill: 20,
    medidas: "18x19 cm",
    multicolor: false,
    imagen1: "img/prod1_1.jpg",
    imagen2: "img/prod1_2.jpg",
    linkSTL: ""
  },
  {
    nombre: "Gancho Real Hasta la Muerte",
    categoria: "Hogar y funcional",
    precio: 15.0,
    tiempo: 765, // 12h 45m
    infill: 15,
    medidas: "13x20 cm",
    multicolor: true,
    imagen1: "img/prod2_1.jpg",
    imagen2: "img/prod2_2.jpg",
    linkSTL: ""
  },
  {
    nombre: "Figura de Tralarelo larala",
    categoria: "Figuras",
    precio: 10.0,
    tiempo: 370, // 6h 10m
    infill: 15,
    medidas: "5x10 cm",
    multicolor: true,
    imagen1: "img/prod3_1.jpg",
    imagen2: "img/prod3_2.jpg",
    linkSTL: ""
  },
  {
    nombre: "Llavero de mapache",
    categoria: "Llaveros",
    precio: 10.0,
    tiempo: 510, // 8h 30m
    infill: 95,
    medidas: "10x15 cm",
    multicolor: true,
    imagen1: "img/prod4_1.jpg",
    imagen2: "img/prod4_2.jpg",
    linkSTL: ""
  },
  {
    nombre: "Llavero de Snoopy",
    categoria: "Llaveros",
    precio: 2.5,
    tiempo: 615, // 10h 15m
    infill: 25,
    medidas: "15x8x8 cm",
    multicolor: false,
    imagen1: "img/prod5_1.jpg",
    imagen2: "img/prod5_2.jpg",
    linkSTL: ""
  },
  {
    nombre: "Figura de búho",
    categoria: "Figuras",
    precio: 5.0,
    tiempo: 75, // 1h 15m
    infill: 100,
    medidas: "7x5 cm",
    multicolor: true,
    imagen1: "img/prod6_1.jpg",
    imagen2: "img/prod6_2.jpg",
    linkSTL: ""
  },
  {
    nombre: "Soporte para reloj",
    categoria: "Hogar y funcional",
    precio: 2.5,
    tiempo: 840, // 14h 00m
    infill: 10,
    medidas: "10x7 cm",
    multicolor: false,
    imagen1: "img/prod7_1.jpg",
    imagen2: "img/prod7_2.jpg",
    linkSTL: ""
  },
  {
    nombre: "Llavero Sanrio Cinnamon Roll",
    categoria: "Llaveros",
    precio: 2.5,
    tiempo: 615, // 10h 15m
    infill: 25,
    medidas: "5x5 cm",
    multicolor: true,
    imagen1: "img/prod8_1.jpg",
    imagen2: "img/prod8_2.jpg",
    linkSTL: ""
  }
];

// Pedidos de demostración (uno por estado) para que el panel admin y sus
// indicadores tengan información desde el inicio. productoNombre permite
// relacionarlos con un producto del catálogo (db.js busca su ID).
export const PEDIDOS_DEMO = [
  {
    clienteNombre: "Cliente demo - Ana López",
    clienteCorreo: "demo@sv3dprints.com",
    servicio: "catalogo",
    productoNombre: "Figura de búho",
    material: "PLA+",
    infill: 100,
    medidas: "7x5 cm",
    cantidad: 4,
    descripcion: "Cuatro búhos en color café para recuerdos de cumpleaños.",
    precioEstimado: 20.0,
    minutosEstimados: 300,
    estado: "Completado"
  },
  {
    clienteNombre: "Cliente demo - Carlos Rivas",
    clienteCorreo: "demo@sv3dprints.com",
    servicio: "impresion",
    productoNombre: null,
    material: "PETG",
    infill: 40,
    medidas: "12x8x6 cm",
    cantidad: 2,
    descripcion: "Soporte para router; envío el archivo STL por Instagram.",
    precioEstimado: 11.94,
    minutosEstimados: 552,
    estado: "Imprimiendo"
  },
  {
    clienteNombre: "Cliente demo - María Pérez",
    clienteCorreo: "demo@sv3dprints.com",
    servicio: "modelado",
    productoNombre: null,
    material: "PLA+",
    infill: 20,
    medidas: "10x10x15 cm",
    cantidad: 1,
    descripcion: "Modelar desde cero la mascota del logo de mi emprendimiento.",
    precioEstimado: 23.1,
    minutosEstimados: 540,
    estado: "En espera"
  }
];
