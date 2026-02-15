/**
 * @fileoverview Modelo del menú de navegación.
 * Define la estructura jerárquica de los temas del curso y provee
 * utilidades para encontrar la ruta de breadcrumb de un algoritmo.
 * @module models/MenuModel
 */

/**
 * Modelo del menú lateral con la jerarquía de temas del curso.
 * Cada nodo tiene: id, label, children (opcional), action (opcional), enabled (opcional).
 * @namespace
 */
const MenuModel = {
    /**
     * Retorna el árbol jerárquico completo de temas.
     * @returns {Array<{id: string, label: string, children?: Array, action?: string, enabled?: boolean}>}
     */
    getMenuTree() {
        return [
            {
                id: 'busquedas',
                label: 'Búsquedas',
                children: [
                    {
                        id: 'internas',
                        label: 'Internas',
                        children: [
                            { id: 'secuencial', label: 'Secuencial', action: 'busqueda-secuencial', enabled: true },
                            { id: 'binaria', label: 'Binaria', action: 'busqueda-binaria', enabled: true },
                            {
                                id: 'hash',
                                label: 'Funciones Hash',
                                children: [
                                    { id: 'hash-mod', label: 'Función Hash Mod', action: 'hash-mod', enabled: true },
                                    { id: 'hash-cuadrado', label: 'Función Hash Cuadrado', action: 'hash-cuadrado', enabled: true },
                                    { id: 'hash-truncamiento', label: 'Función Hash Truncamiento', action: 'hash-truncamiento', enabled: false },
                                    { id: 'hash-plegamiento', label: 'Función Hash Plegamiento', action: 'hash-plegamiento', enabled: false }
                                ]
                            },
                            {
                                id: 'residuos',
                                label: 'Búsqueda por Residuos',
                                children: [
                                    { id: 'arboles-digitales', label: 'Árboles Digitales', action: 'arboles-digitales', enabled: false },
                                    { id: 'arboles-residuos', label: 'Árboles por Residuos', action: 'arboles-residuos', enabled: false },
                                    { id: 'arboles-residuos-multiples', label: 'Árboles por Residuos Múltiples', action: 'arboles-residuos-multiples', enabled: false },
                                    { id: 'arboles-huffman', label: 'Árboles de Huffman', action: 'arboles-huffman', enabled: false }
                                ]
                            }
                        ]
                    },
                    {
                        id: 'externas',
                        label: 'Externas',
                        children: [
                            { id: 'ext-placeholder', label: '...', enabled: false }
                        ]
                    }
                ]
            },
            {
                id: 'grafos',
                label: 'Grafos',
                children: [
                    { id: 'grafos-placeholder', label: '...', enabled: false }
                ]
            }
        ];
    },

    /**
     * Busca la ruta de breadcrumb para un identificador de acción dado.
     * Recorre el árbol recursivamente hasta encontrar el nodo con la acción.
     * @param {string} actionId - Identificador de la acción (ej: 'busqueda-binaria').
     * @param {Array} [tree=null] - Subárbol a recorrer (null = árbol completo).
     * @param {Array<string>} [path=[]] - Ruta acumulada de etiquetas.
     * @returns {Array<string>|null} Arreglo de etiquetas como ['Búsquedas', 'Internas', 'Binaria'] o null.
     */
    findBreadcrumbPath(actionId, tree = null, path = []) {
        if (!tree) tree = this.getMenuTree();
        for (const node of tree) {
            const currentPath = [...path, node.label];
            if (node.action === actionId) {
                return currentPath;
            }
            if (node.children) {
                const result = this.findBreadcrumbPath(actionId, node.children, currentPath);
                if (result) return result;
            }
        }
        return null;
    }
};
