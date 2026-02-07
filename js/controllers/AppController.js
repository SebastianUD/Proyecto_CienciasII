import { MenuModel } from '../models/MenuModel.js';
import { MenuView } from '../views/MenuView.js';

export class AppController {
    constructor() {
        this.modelo = new MenuModel();
        // Le decimos a la vista que se dibuje dentro del elemento <nav id="menu-principal">
        this.vista = new MenuView('menu-principal');
    }

    iniciar() {
        console.log("Iniciando aplicación...");
        const datos = this.modelo.obtenerDatos();
        this.vista.renderizar(datos);

    }
}