/**
 * Vista Base
 * ----------
 * Clase abstracta que define la interfaz común para todas las vistas.
 */
export class View {
    constructor() {
        if (new.target === View) {
            throw new Error("No se puede instanciar la clase abstracta View directamente.");
        }
        this.appMain = document.getElementById('contenido-app');
    }

    /**
     * Método que deben implementar las subclases para renderizar su contenido.
     */
    render() {
        throw new Error("El método render() debe ser implementado.");
    }

    /**
     * Limpia el contenido del área principal.
     */
    clear() {
        this.appMain.innerHTML = '';
    }
}
