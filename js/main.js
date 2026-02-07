import { AppController } from './controllers/AppController.js';

// Esperamos a que el DOM cargue completo
document.addEventListener('DOMContentLoaded', () => {
    const app = new AppController();
    app.iniciar();
});