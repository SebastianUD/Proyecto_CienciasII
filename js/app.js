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
    /**
     * Mapa de factories de vistas disponibles.
     * Cada factory recibe el contenedor y retorna una instancia de vista configurada.
     * @type {Object<string, Function>}
     */
    const viewFactories = {
        // ── Búsquedas Internas ────────────────────────────────────────────────
        'busqueda-secuencial':       (el) => new BusquedaSecuencialView(el),
        'busqueda-binaria':          (el) => new BusquedaBinariaView(el),
        'hash-mod':                  (el) => new BusquedaHashModView(el),
        'hash-cuadrado':             (el) => new BusquedaHashCuadradoView(el),
        'hash-truncamiento':         (el) => new BusquedaHashTruncamientoView(el),
        'hash-plegamiento':          (el) => new BusquedaHashPlegamientoView(el),
        'arboles-digitales':         (el) => new ArbolesDigitalesView(el),
        'arboles-residuos':          (el) => new ArbolesResiduosView(el),
        'arboles-residuos-multiples':(el) => new ArbolesResiduosMultiplesView(el),
        'arboles-huffman':           (el) => new HuffmanView(el),
        // ── Búsquedas Externas ────────────────────────────────────────────────
        'ext-secuencial-bloques':    (el) => new BusquedaSecuencialBloquesView(el),
        'ext-binaria-bloques':       (el) => new BusquedaBinariaBloquesView(el),
        'ext-hash-mod':              (el) => new ExtHashModView(el),
        'ext-hash-cuadrado':         (el) => new ExtHashCuadradoView(el),
        'ext-hash-truncamiento':     (el) => new ExtHashTruncamientoView(el),
        'ext-hash-plegamiento':      (el) => new ExtHashPlegamientoView(el),
        'ext-conversion-base':       (el) => new ExtHashConversionBaseView(el),
        'ext-dinamica-totales':      (el) => new ExtDinamicaTotalesView(el),
        'ext-dinamica-parciales':    (el) => new ExtDinamicaParcialesView(el),
        // ── Índices (4 variantes) ─────────────────────────────────────────────
        'idx-primario':              (el) => new IndicesView(el, 'primario'),
        'idx-multinivel-primario':   (el) => new IndicesView(el, 'multinivel-primario'),
        'idx-secundario':            (el) => new IndicesView(el, 'secundario'),
        'idx-multinivel-secundario': (el) => new IndicesView(el, 'multinivel-secundario'),
        // ── Grafos (6 modos) ─────────────────────────────────────────────────
        'grafos-operaciones':        (el) => new GrafosView(el, 'operaciones'),
        'arboles-grafos':            (el) => new GrafosView(el, 'arboles'),
        'calculo-matrices':          (el) => new GrafosView(el, 'matrices'),
        'coloreado-grafos':          (el) => new GrafosView(el, 'coloreado'),
        'conjuntos-dom-indep':       (el) => new GrafosView(el, 'conjuntos'),
        'matching-grafos':           (el) => new GrafosView(el, 'matching'),
        // ── Algoritmos de Grafos (3 variantes) ───────────────────────────────
        'algo-bellman':              (el) => new AlgorithmGraphView(el, 'bellman'),
        'algo-dijkstra':             (el) => new AlgorithmGraphView(el, 'dijkstra'),
        'algo-floyd':                (el) => new AlgorithmGraphView(el, 'floyd')
    };

    /**
     * Navega a la vista de un algoritmo específico.
     * Si la vista no está registrada, muestra un mensaje informativo.
     * @param {string} actionId - Identificador de la acción del menú.
     */
    function navigateTo(actionId) {
        const factory = viewFactories[actionId];

        if (!factory) {
            Validation.showInfo('Este algoritmo aún no ha sido implementado.');
            return;
        }

        currentView = factory(algorithmViewEl);
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
