export class MenuView {
    constructor(contenedorId) {
        this.contenedor = document.getElementById(contenedorId);
    }

    renderizar(datosMenu) {
        // Limpiamos el contenedor
        this.contenedor.innerHTML = '';

        // Creamos la lista principal (<ul>)
        const listaPrincipal = document.createElement('ul');
        listaPrincipal.className = 'menu-bar';

        // Iniciamos la recursión
        datosMenu.forEach(item => {
            listaPrincipal.appendChild(this._crearItem(item));
        });

        this.contenedor.appendChild(listaPrincipal);
    }

    // Método auxiliar privado (recursivo) para crear LIs y ULs anidados
    _crearItem(item) {
        const li = document.createElement('li');
        const enlace = document.createElement('a');

        enlace.textContent = item.titulo;
        enlace.href = "#"; // Para evitar recargas
        if (item.accion) enlace.dataset.accion = item.accion; // Guardamos la acción

        li.appendChild(enlace);

        // Si tiene subtemas, llamar recursivamente
        if (item.subtemas && item.subtemas.length > 0) {
            const ulSub = document.createElement('ul');
            ulSub.className = 'submenu'; // Clase CSS clave

            item.subtemas.forEach(subItem => {
                ulSub.appendChild(this._crearItem(subItem));
            });

            li.appendChild(ulSub);
            li.classList.add('tiene-hijos');
        }

        return li;
    }
}