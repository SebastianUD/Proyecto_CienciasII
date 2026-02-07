import { View } from "./base/View.js";

/**
 * Vista Genérica para Algoritmos (Placeholder)
 * --------------------------------------------
 * Se usa para mostrar algoritmos que aún no tienen una implementación específica.
 */
export class AlgorithmView extends View {
    constructor(titulo, descripcion) {
        super();
        this.titulo = titulo;
        this.descripcion = descripcion || "Implementación en desarrollo.";
    }

    render() {
        this.clear();

        const card = document.createElement('div');
        card.className = 'content-card';

        const titleParams = document.createElement('h1');
        titleParams.textContent = this.titulo;

        const pDesc = document.createElement('p');
        pDesc.innerHTML = this.descripcion + "<br><br><em>Esta sección es una Vista de JavaScript renderizada dinámicamente.</em>";

        card.appendChild(titleParams);
        card.appendChild(pDesc);

        this.appMain.appendChild(card);
    }
}
