/**
 * Vista (View) del Menú
 * ---------------------
 * En el patrón MVC, la Vista se encarga de:
 * 1. Manipular el DOM (crear elementos HTML).
 * 2. Mostrar los datos proporcionados por el Modelo (a través del Controlador).
 * 3. Capturar eventos del usuario (clics) y gestionarlos visualmente.
 */
export class MenuView {
    /**
     * @param {string} contenedorId - ID del elemento HTML donde se renderizará el menú.
     * @param {Function} onNavigate - Callback que se ejecuta al seleccionar una opción de navegación.
     */
    constructor(contenedorId, onNavigate) {
        this.contenedor = document.getElementById(contenedorId);
        this.onNavigate = onNavigate;

        // Inicializamos los listeners globales
        this._initGlobalListeners();
    }

    /**
     * Configura listeners a nivel de documento.
     * Útil para cerrar el menú si el usuario hace clic fuera de él.
     */
    _initGlobalListeners() {
        document.addEventListener('click', (e) => {
            // Si el clic NO fue dentro del menú (.menu-bar), cerramos todos los submenús abiertos.
            if (!e.target.closest('.menu-bar')) {
                const openMenus = document.querySelectorAll('.menu-bar li.show');
                openMenus.forEach(menu => menu.classList.remove('show'));
            }
        });
    }

    /**
     * Renderiza el menú completo basado en los datos recibidos.
     * @param {Array} datosMenu - Estructura de datos del menú (Array de objetos).
     */
    renderizar(datosMenu) {
        // Limpiamos el contenedor para evitar duplicados
        this.contenedor.innerHTML = '';

        // Creamos la lista principal (<ul>)
        const listaPrincipal = document.createElement('ul');
        listaPrincipal.className = 'menu-bar';

        // Recorremos los datos y creamos los elementos recursivamente
        datosMenu.forEach(item => {
            listaPrincipal.appendChild(this._crearItem(item));
        });

        // Insertamos el menú generado en el DOM
        this.contenedor.appendChild(listaPrincipal);
    }

    /**
     * Método auxiliar recursivo para crear ítems de lista (<li>) y submenús (<ul>).
     * @param {Object} item - Objeto con la información del ítem (titulo, accion, subtemas, etc).
     * @returns {HTMLElement} - El elemento <li> construido.
     */
    _crearItem(item) {
        const li = document.createElement('li');
        const enlace = document.createElement('a');

        enlace.textContent = item.titulo;
        // Usamos hash para evitar recargas, la navegación es controlada por JS
        enlace.href = "#";

        // Atributo de datos para lógica extra si se requiere (ej: identificadores)
        if (item.accion) {
            enlace.dataset.accion = item.accion;

            // Si tiene acción y NO tiene subtemas (es un nodo hoja navegable), agregamos el listener
            if (!item.subtemas || item.subtemas.length === 0) {
                enlace.addEventListener('click', (e) => {
                    e.preventDefault(); // Evitar salto de hash

                    // Cerrar menús abiertos al navegar
                    const openMenus = document.querySelectorAll('.menu-bar li.show');
                    openMenus.forEach(menu => menu.classList.remove('show'));

                    if (this.onNavigate) {
                        this.onNavigate(item.accion);
                    }
                });
            }
        }

        li.appendChild(enlace);

        // --- Recursividad para Submenús ---
        // Si el ítem tiene subtemas, creamos un nuevo <ul> anidado
        if (item.subtemas && item.subtemas.length > 0) {
            const ulSub = document.createElement('ul');
            ulSub.className = 'submenu';

            // Llamada recursiva para cada subtema
            item.subtemas.forEach(subItem => {
                ulSub.appendChild(this._crearItem(subItem));
            });

            li.appendChild(ulSub);
            li.classList.add('tiene-hijos'); // Clase visual para indicar dropdown

            // --- Gestión de Eventos del Dropdown ---
            // Manejamos el clic para mostrar/ocultar submenús en dispositivos táctiles o desktop
            this._agregarEventoDropdown(enlace, li);
        }

        return li;
    }

    /**
     * Agrega la lógica de interacción para desplegar submenús.
     * @param {HTMLElement} enlace - El elemento <a> que dispara el evento.
     * @param {HTMLElement} li - El contenedor <li> que tiene la clase .submenu.
     */
    _agregarEventoDropdown(enlace, li) {
        enlace.addEventListener('click', (e) => {
            e.preventDefault(); // Evitamos navegación
            e.stopPropagation(); // Evitamos que el clic cierre el menú inmediatamente (bubbling)

            // Cierra otros hermanos abiertos al mismo nivel para mantener la UX limpia
            const siblings = li.parentElement.children;
            for (let sibling of siblings) {
                if (sibling !== li && sibling.classList.contains('show')) {
                    sibling.classList.remove('show');
                    // Opcional: Cerrar también los nietos abiertos
                    const openChildren = sibling.querySelectorAll('.show');
                    openChildren.forEach(child => child.classList.remove('show'));
                }
            }

            // Alternar estado visible (toggle class .show)
            li.classList.toggle('show');
        });
    }
}