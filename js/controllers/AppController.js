import { MenuModel } from '../models/MenuModel.js';
import { MenuView } from '../views/MenuView.js';
import { HomeView } from '../views/HomeView.js';
import { AlgorithmView } from '../views/AlgorithmView.js';

/**
 * Controlador Principal (Controller)
 * ----------------------------------
 * Orquesta la navegación y el flujo de datos entre el Modelo y las Vistas.
 */
export class AppController {
    constructor() {
        this.modelo = new MenuModel();

        // Pasamos el callback de navegación al constructor de la Vista del Menú
        this.vistaMenu = new MenuView('menu-principal', (accion) => this.navegar(accion));

        // Mapa de Vistas (Routing)
        // Asociamos cada 'accion' del menú con una instancia de una Vista o una función que la genere.
        // Por ahora usamos AlgorithmView genérico, pero aquí se instanciarían las vistas específicas.
        this.rutas = {
            'inicio': () => new HomeView(),
            'secuencial': () => new AlgorithmView('Búsqueda Secuencial', 'Algoritmo que recorre la lista elemento por elemento.'),
            'binario': () => new AlgorithmView('Búsqueda Binaria', 'Algoritmo eficiente para listas ordenadas que divide el espacio de búsqueda en mitades.'),
            'hash_modulo': () => new AlgorithmView('Función Hash Módulo', 'Transformación de claves usando el operador módulo.'),
            'hash_cuadrado': () => new AlgorithmView('Función Hash Cuadrado', 'Eleva la clave al cuadrado y toma los dígitos centrales.'),
            'hash_plegamiento': () => new AlgorithmView('Función Hash Plegamiento', 'Divide la clave en partes y las suma.'),
            'hash_truncamiento': () => new AlgorithmView('Función Hash Truncamiento', 'Toma dígitos específicos de la clave.'),
            'arb_digital': () => new AlgorithmView('Árboles de Búsqueda Digital', 'Estructura basada en los bits o dígitos de las claves.'),
            'arb_residuo': () => new AlgorithmView('Árboles de Búsqueda por Residuo', 'Variante de árboles de búsqueda basada en residuos.'),
            'arb_multiple': () => new AlgorithmView('Árboles por Residuo Múltiples', 'Extensión para manejar múltiples claves o dimensiones.'),
            'arb_huffman': () => new AlgorithmView('Árboles de Huffman', 'Algoritmo de compresión y estructura de árbol optimizada.'),
            'grafos': () => new AlgorithmView('Grafos', 'Estructuras de datos no lineales formadas por nodos y aristas (Próximamente).')
        };

        // Vista actual
        this.vistaActual = null;
    }

    /**
     * Inicializa la aplicación.
     */
    iniciar() {
        console.log("Iniciando aplicación...");

        // 1. Renderizar Menú
        const datos = this.modelo.obtenerDatos();
        this.vistaMenu.renderizar(datos);

        // 2. Renderizar Vista Inicial (Home)
        this.navegar('inicio');
    }

    /**
     * Maneja la navegación entre diferentes "páginas" (Vistas).
     * @param {string} accion - El identificador de la acción/ruta.
     */
    navegar(accion) {
        console.log(`Navegando a: ${accion}`);

        // Buscamos la fábrica de la vista en nuestro mapa de rutas
        const vistaFactory = this.rutas[accion];

        if (vistaFactory) {
            // Creamos la nueva vista
            this.vistaActual = vistaFactory();
            // La renderizamos en el contenedor principal
            this.vistaActual.render();
        } else {
            console.warn(`Ruta no encontrada para la acción: ${accion}`);
        }
    }
}