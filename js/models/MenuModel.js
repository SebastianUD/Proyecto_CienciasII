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
                                    { id: 'hash-truncamiento', label: 'Función Hash Truncamiento', action: 'hash-truncamiento', enabled: true },
                                    { id: 'hash-plegamiento', label: 'Función Hash Plegamiento', action: 'hash-plegamiento', enabled: true }
                                ]
                            },
                            {
                                id: 'residuos',
                                label: 'Búsqueda por Residuos',
                                children: [
                                    { id: 'arboles-digitales', label: 'Árboles Digitales', action: 'arboles-digitales', enabled: true },
                                    { id: 'arboles-residuos', label: 'Árboles por Residuos', action: 'arboles-residuos', enabled: true },
                                    { id: 'arboles-residuos-multiples', label: 'Árboles por Residuos Múltiples', action: 'arboles-residuos-multiples', enabled: true },
                                    { id: 'arboles-huffman', label: 'Árboles de Huffman', action: 'arboles-huffman', enabled: true }
                                ]
                            }
                        ]
                    },
                    {
                        id: 'externas',
                        label: 'Externas',
                        children: [
                            { id: 'ext-secuencial-bloques', label: 'Secuencial (Bloques)', action: 'ext-secuencial-bloques', enabled: true },
                            { id: 'ext-binaria-bloques', label: 'Binaria (Bloques)', action: 'ext-binaria-bloques', enabled: true },
                            {
                                id: 'ext-transformacion',
                                label: 'Transformación de Claves',
                                children: [
                                    { id: 'ext-hash-mod', label: 'Función Hash Mod', action: 'ext-hash-mod', enabled: true },
                                    { id: 'ext-hash-cuadrado', label: 'Función Hash Cuadrado', action: 'ext-hash-cuadrado', enabled: true },
                                    { id: 'ext-hash-truncamiento', label: 'Función Hash Truncamiento', action: 'ext-hash-truncamiento', enabled: true },
                                    { id: 'ext-hash-plegamiento', label: 'Función Hash Plegamiento', action: 'ext-hash-plegamiento', enabled: true },
                                    { id: 'ext-conversion-base', label: 'Conversión de Base', action: 'ext-conversion-base', enabled: true }
                                ]
                            },
                            {
                                id: 'ext-dinamicas',
                                label: 'Dinámicas',
                                children: [
                                    { id: 'ext-dinamica-totales', label: 'Totales', action: 'ext-dinamica-totales', enabled: true },
                                    { id: 'ext-dinamica-parciales', label: 'Parciales', action: 'ext-dinamica-parciales', enabled: true }
                                ]
                            },
                            {
                                id: 'ext-indices',
                                label: 'Índices',
                                children: [
                                    {
                                        id: 'idx-primarios',
                                        label: 'Primarios',
                                        children: [
                                            { id: 'idx-primario', label: 'Primario (No Denso)', action: 'idx-primario', enabled: true },
                                            { id: 'idx-multinivel-primario', label: 'Multinivel Primario (No Denso)', action: 'idx-multinivel-primario', enabled: true }
                                        ]
                                    },
                                    {
                                        id: 'idx-secundarios',
                                        label: 'Secundarios',
                                        children: [
                                            { id: 'idx-secundario', label: 'Secundario (Denso)', action: 'idx-secundario', enabled: true },
                                            { id: 'idx-multinivel-secundario', label: 'Multinivel Secundario (Denso)', action: 'idx-multinivel-secundario', enabled: true }
                                        ]
                                    }
                                ]
                            }
                        ]
                    }
                ]
            },
            {
                id: 'grafos',
                label: 'Grafos',
                children: [
                    { id: 'grafos-operaciones', label: 'Operaciones entre Grafos', action: 'grafos-operaciones', enabled: true },
                    { id: 'arboles-grafos', label: 'Árboles como Grafos', action: 'arboles-grafos', enabled: true },
                    { id: 'calculo-matrices', label: 'Cálculo de Matrices', action: 'calculo-matrices', enabled: true },
                    { id: 'coloreado-grafos', label: 'Coloreado de Grafos', action: 'coloreado-grafos', enabled: true },
                    { id: 'conjuntos-dom-indep', label: 'Conjuntos Independientes y Dominantes', action: 'conjuntos-dom-indep', enabled: true },
                    { id: 'matching-grafos', label: 'Matching', action: 'matching-grafos', enabled: true },
                    {
                        id: 'algoritmos',
                        label: 'Algoritmos',
                        children: [
                            { id: 'algo-bellman', label: 'Bellman', action: 'algo-bellman', enabled: true },
                            { id: 'algo-dijkstra', label: 'Dijkstra', action: 'algo-dijkstra', enabled: true },
                            { id: 'algo-floyd', label: 'Floyd', action: 'algo-floyd', enabled: true }
                        ]
                    }
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
