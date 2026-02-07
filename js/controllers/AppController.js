import { MenuModel } from '../models/MenuModel.js';
import { MenuView } from '../views/MenuView.js';

/**
 * Controlador Principal (Controller)
 * ----------------------------------
 * En el patrón MVC, el Controlador actúa como intermediario:
 * 1. Inicializa el Modelo y la Vista.
 * 2. Obtiene datos del Modelo.
 * 3. Pasa esos datos a la Vista para que sean renderizados.
 * 4. (Opcional) Gestiona la comunicación compleja entre componentes eventos.
 */
export class AppController {
    constructor() {
        // Instancia del Modelo: Contiene los datos "crudos" del menú.
        this.modelo = new MenuModel();

        // Instancia de la Vista: Sabe cómo dibujar el menú en el DOM.
        // Se le pasa el ID del elemento contenedor ('menu-principal').
        this.vista = new MenuView('menu-principal');
    }

    /**
     * Método para arrancar la aplicación.
     * Coordina la obtención de datos y su renderizado.
     */
    iniciar() {
        console.log("Iniciando aplicación...");

        // 1. Pedir datos al modelo
        const datos = this.modelo.obtenerDatos();

        // 2. Entregar datos a la vista para renderizar
        this.vista.renderizar(datos);
    }
}