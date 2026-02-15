/**
 * @fileoverview Controlador principal de la aplicación.
 * Inicializa el menú de navegación, gestiona la navegación entre vistas
 * de algoritmos y controla la visibilidad de la barra lateral.
 * @module app
 */
(function () {
    'use strict';

    // === Elementos DOM ===
    /** @type {HTMLElement} */
    const sidebar = document.getElementById('sidebar');
    /** @type {HTMLElement} */
    const sidebarToggle = document.getElementById('sidebar-toggle');
    /** @type {HTMLElement} */
    const sidebarBreadcrumb = document.getElementById('sidebar-breadcrumb');
    /** @type {HTMLElement} */
    const sidebarExpand = document.getElementById('sidebar-expand');
    /** @type {HTMLElement} */
    const menuTreeEl = document.getElementById('menu-tree');
    /** @type {HTMLElement} */
    const algorithmViewEl = document.getElementById('algorithm-view');

    /** @type {AlgorithmView|null} Vista de algoritmo activa */
    let currentView = null;

    /**
     * Mapa de vistas disponibles.
     * Asocia cada identificador de acción con su clase constructora.
     * @type {Object<string, Function>}
     */
    const views = {
        'busqueda-secuencial': BusquedaSecuencialView,
        'busqueda-binaria': BusquedaBinariaView,
        'hash-mod': BusquedaHashModView,
        'hash-cuadrado': BusquedaHashCuadradoView
    };

    /**
     * Navega a la vista de un algoritmo específico.
     * Si la vista no está registrada, muestra un mensaje informativo.
     * @param {string} actionId - Identificador de la acción del menú.
     */
    function navigateTo(actionId) {
        const ViewClass = views[actionId];

        if (!ViewClass) {
            Validation.showInfo('Este algoritmo aún no ha sido implementado.');
            return;
        }

        currentView = new ViewClass(algorithmViewEl);
        currentView.show();
    }

    /**
     * Alterna la visibilidad de la barra lateral.
     * Cuando se colapsa, muestra el breadcrumb vertical.
     */
    function toggleSidebar() {
        const isOpen = !sidebar.classList.contains('collapsed');

        if (isOpen) {
            sidebar.classList.add('collapsed');
            sidebarBreadcrumb.classList.remove('hidden');
            sidebarToggle.title = 'Mostrar menú';
        } else {
            sidebar.classList.remove('collapsed');
            sidebarBreadcrumb.classList.add('hidden');
            sidebarToggle.title = 'Ocultar menú';
        }
    }

    // === Inicialización ===

    // Crear la vista del menú con callback de navegación
    const menuView = new MenuView(menuTreeEl, navigateTo);

    // Eventos del toggle de la barra lateral
    sidebarToggle.addEventListener('click', toggleSidebar);
    sidebarExpand.addEventListener('click', toggleSidebar);

})();
