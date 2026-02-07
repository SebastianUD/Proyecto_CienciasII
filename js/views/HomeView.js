import { View } from "./base/View.js";

/**
 * Vista de Inicio
 * ---------------
 * Muestra el mensaje de bienvenida y las instrucciones iniciales.
 */
export class HomeView extends View {
    constructor() {
        super();
    }

    render() {
        this.clear();

        const card = document.createElement('div');
        card.className = 'content-card';

        const title = document.createElement('h1');
        title.textContent = 'Ciencias de la Computación II';

        const text = document.createElement('p');
        text.textContent = 'Selecciona un algoritmo del menú para comenzar.';

        card.appendChild(title);
        card.appendChild(text);

        this.appMain.appendChild(card);
    }
}
