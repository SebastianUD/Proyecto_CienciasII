import { AppController } from './controllers/AppController.js';

// Punto de entrada de la aplicación (Main)
// Esperamos a que el DOM esté completamente cargado antes de ejecutar lógica.
document.addEventListener('DOMContentLoaded', () => {
    // Instanciamos el controlador principal que orquesta todo.
    const app = new AppController();
    app.iniciar();
});