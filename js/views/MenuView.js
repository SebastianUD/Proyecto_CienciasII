/**
 * @fileoverview Vista del menú de navegación lateral.
 * Renderiza el árbol de temas, gestiona la expansión/colapso de submenús,
 * implementa el filtrado por búsqueda y actualiza el breadcrumb.
 * @module views/MenuView
 */

/**
 * Vista del menú lateral del curso.
 * Construye dinámicamente el árbol del menú a partir de {@link MenuModel}
 * y emite eventos de navegación hacia el controlador principal.
 */
class MenuView {
    /**
     * Crea una instancia de MenuView.
     * @param {HTMLElement} containerEl - Elemento contenedor del árbol del menú.
     * @param {Function} onNavigate - Callback que recibe el actionId al seleccionar un algoritmo.
     */
    constructor(containerEl, onNavigate) {
        /** @type {HTMLElement} Contenedor del menú */
        this.container = containerEl;
        /** @type {Function} Callback de navegación */
        this.onNavigate = onNavigate;
        /** @type {HTMLElement|null} Elemento del ítem activo actual */
        this.activeItemEl = null;
        /** @type {string|null} Acción del ítem activo actual */
        this.currentAction = null;
        /** @type {HTMLInputElement} Input de búsqueda del menú */
        this.searchInput = document.getElementById('menu-search');
        this.init();
    }

    /**
     * Inicializa el menú: construye el árbol y configura el filtrador.
     * @private
     */
    init() {
        const tree = MenuModel.getMenuTree();
        const ul = this._buildTree(tree, 0);
        this.container.innerHTML = '';
        this.container.appendChild(ul);

        if (this.searchInput) {
            this.searchInput.addEventListener('input', () => this._filterMenu());
        }
    }

    /**
     * Construye recursivamente el árbol HTML a partir de los nodos del modelo.
     * @private
     * @param {Array} nodes - Arreglo de nodos del menú.
     * @param {number} depth - Nivel de profundidad actual (0 = raíz).
     * @returns {HTMLUListElement} Elemento UL con los ítems del nivel.
     */
    _buildTree(nodes, depth) {
        const ul = document.createElement('ul');

        for (const node of nodes) {
            const li = document.createElement('li');
            li.classList.add(`menu-depth-${depth}`);
            li.dataset.id = node.id;

            const itemDiv = document.createElement('div');
            itemDiv.classList.add('menu-item');

            if (node.enabled === false && !node.children) {
                itemDiv.classList.add('disabled');
            }

            // Icono de expansión para nodos padre
            if (node.children && node.children.length > 0) {
                const expandIcon = document.createElement('span');
                expandIcon.classList.add('expand-icon');
                expandIcon.textContent = '▶';
                itemDiv.appendChild(expandIcon);
            } else {
                const bullet = document.createElement('span');
                bullet.classList.add('item-bullet');
                bullet.textContent = '●';
                itemDiv.appendChild(bullet);
            }

            const labelSpan = document.createElement('span');
            labelSpan.classList.add('item-label');
            labelSpan.textContent = node.label;
            itemDiv.appendChild(labelSpan);

            li.appendChild(itemDiv);

            // Contenedor de hijos
            if (node.children && node.children.length > 0) {
                const childrenDiv = document.createElement('div');
                childrenDiv.classList.add('menu-children');
                const childUl = this._buildTree(node.children, depth + 1);
                childrenDiv.appendChild(childUl);
                li.appendChild(childrenDiv);

                // Toggle de expansión al hacer clic
                itemDiv.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const icon = itemDiv.querySelector('.expand-icon');
                    if (icon) icon.classList.toggle('expanded');
                    childrenDiv.classList.toggle('expanded');
                });
            } else if (node.action && node.enabled !== false) {
                // Nodo hoja con acción habilitada
                itemDiv.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this._setActive(itemDiv, node.action);
                    if (this.onNavigate) this.onNavigate(node.action);
                });
            } else if (node.enabled === false) {
                // Nodo hoja deshabilitado
                itemDiv.addEventListener('click', (e) => {
                    e.stopPropagation();
                    Validation.showInfo('Este algoritmo aún no ha sido implementado.');
                });
            }

            ul.appendChild(li);
        }

        return ul;
    }

    /**
     * Marca un ítem como activo y actualiza el breadcrumb.
     * @private
     * @param {HTMLElement} itemEl - Elemento del ítem seleccionado.
     * @param {string} actionId - Identificador de la acción.
     */
    _setActive(itemEl, actionId) {
        if (this.activeItemEl) {
            this.activeItemEl.classList.remove('active');
        }
        itemEl.classList.add('active');
        this.activeItemEl = itemEl;
        this.currentAction = actionId;

        const path = MenuModel.findBreadcrumbPath(actionId);
        if (path) {
            const breadcrumbEl = document.getElementById('breadcrumb-path');
            if (breadcrumbEl) {
                breadcrumbEl.textContent = path.join(' / ');
            }
        }
    }

    /**
     * Filtra los ítems del menú según el texto ingresado en el buscador.
     * Muestra/oculta ítems y expande automáticamente los padres de coincidencias.
     * @private
     */
    _filterMenu() {
        const query = this.searchInput.value.toLowerCase().trim();
        const allItems = this.container.querySelectorAll('li');

        if (query === '') {
            allItems.forEach(li => li.style.display = '');
            return;
        }

        allItems.forEach(li => {
            const label = li.querySelector('.item-label');
            if (label) {
                const text = label.textContent.toLowerCase();
                if (text.includes(query)) {
                    li.style.display = '';
                    let parent = li.parentElement;
                    while (parent && parent !== this.container) {
                        if (parent.tagName === 'LI') parent.style.display = '';
                        if (parent.classList && parent.classList.contains('menu-children')) {
                            parent.classList.add('expanded');
                        }
                        parent = parent.parentElement;
                    }
                } else {
                    const childLabels = li.querySelectorAll('.item-label');
                    let childMatch = false;
                    childLabels.forEach(cl => {
                        if (cl.textContent.toLowerCase().includes(query)) childMatch = true;
                    });
                    if (!childMatch) li.style.display = 'none';
                }
            }
        });
    }
}
