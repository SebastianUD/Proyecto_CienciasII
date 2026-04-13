/**
 * @class TreeGraphModel
 * @description Contiene la lógica matemática para las funcionalidades del tema
 * "Árboles como Grafos": Centro/Bicentro, MST/MaxST (Kruskal), Distancia entre
 * Árboles de Expansión, y Rango/Nulidad.
 *
 * @module models/TreeGraphModel
 */
class TreeGraphModel {

    // ─── Verificaciones de estructura ─────────────────────────────────────────

    /**
     * Verifica si un grafo es conexo usando BFS.
     * @param {GraphModel} graph
     * @returns {boolean}
     */
    static isConnected(graph) {
        const n = graph.vertices.length;
        if (n === 0) return false;
        if (n === 1) return true;

        const adj = {};
        for (const v of graph.vertices) adj[v] = [];
        for (const e of graph.edges) {
            adj[e.from].push(e.to);
            adj[e.to].push(e.from);
        }

        const visited = new Set();
        const queue = [graph.vertices[0]];
        visited.add(graph.vertices[0]);
        while (queue.length > 0) {
            const curr = queue.shift();
            for (const nb of adj[curr]) {
                if (!visited.has(nb)) {
                    visited.add(nb);
                    queue.push(nb);
                }
            }
        }
        return visited.size === n;
    }

    /**
     * Verifica si un grafo es un árbol (conexo, sin ciclos, |A| = |V| - 1).
     * @param {GraphModel} graph
     * @returns {{ isTree: boolean, reason?: string }}
     */
    static isTree(graph) {
        const n = graph.vertices.length;
        const m = graph.edges.length;

        if (n === 0) return { isTree: false, reason: 'El grafo no tiene vértices.' };
        if (n === 1 && m === 0) return { isTree: true };

        if (m !== n - 1) {
            return {
                isTree: false,
                reason: `Un árbol con ${n} vértice(s) debe tener exactamente ${n - 1} arista(s), pero tiene ${m}.`
            };
        }

        if (!this.isConnected(graph)) {
            return { isTree: false, reason: 'El grafo no es conexo (hay vértices desconectados).' };
        }

        return { isTree: true };
    }

    /**
     * Detecta un ciclo en el grafo usando Union-Find.
     * @param {GraphModel} graph
     * @returns {string[]|null} - Vértices del ciclo detectado o null si no hay.
     */
    static detectCycle(graph) {
        const parent = {};
        const rank = {};
        for (const v of graph.vertices) { parent[v] = v; rank[v] = 0; }

        const find = (x) => {
            if (parent[x] !== x) parent[x] = find(parent[x]);
            return parent[x];
        };
        const union = (x, y) => {
            const px = find(x), py = find(y);
            if (px === py) return false;
            if (rank[px] < rank[py]) parent[px] = py;
            else if (rank[px] > rank[py]) parent[py] = px;
            else { parent[py] = px; rank[px]++; }
            return true;
        };

        for (const e of graph.edges) {
            if (!union(e.from, e.to)) {
                return [e.from, e.to];
            }
        }
        return null;
    }

    // ─── 1. Centro o Bicentro ─────────────────────────────────────────────────

    /**
     * Encuentra el centro o bicentro de un árbol eliminando hojas iterativamente.
     * @param {GraphModel} graph
     * @returns {{
     *   steps: Array<{ vertices: string[], edges: Array, leaves: string[], removed: string[] }>,
     *   center: string[],
     *   isBicenter: boolean,
     *   log: string[]
     * }}
     */
    static findCenterBicenter(graph) {
        const log = [];
        const steps = [];

        // Trabajar con copias mutables
        let currentVertices = [...graph.vertices];
        let currentEdges = [...graph.edges];
        let iteration = 0;

        // Guardar snapshot inicial
        steps.push({
            vertices: [...currentVertices],
            edges: currentEdges.map(e => ({ ...e })),
            leaves: [],
            removed: [],
            label: 'Árbol original'
        });

        while (currentVertices.length > 2) {
            // Calcular grados
            const degree = {};
            for (const v of currentVertices) degree[v] = 0;
            for (const e of currentEdges) {
                if (degree[e.from] !== undefined) degree[e.from]++;
                if (degree[e.to] !== undefined) degree[e.to]++;
            }

            // Identificar hojas (grado 1)
            const leaves = currentVertices.filter(v => degree[v] === 1);

            if (leaves.length === 0) break; // Sin hojas → ciclo (no es árbol, no debería pasar)

            iteration++;
            log.push(`Iteración ${iteration}: Se eliminan las hojas: {${leaves.join(', ')}}`);

            // Guardar snapshot con hojas marcadas ANTES de eliminar
            steps.push({
                vertices: [...currentVertices],
                edges: currentEdges.map(e => ({ ...e })),
                leaves: [...leaves],
                removed: [],
                label: `Iteración ${iteration} — Hojas a eliminar: {${leaves.join(', ')}}`
            });

            // Eliminar hojas y sus aristas
            const leafSet = new Set(leaves);
            currentVertices = currentVertices.filter(v => !leafSet.has(v));
            currentEdges = currentEdges.filter(e => !leafSet.has(e.from) && !leafSet.has(e.to));

            // Guardar snapshot después de eliminar
            steps.push({
                vertices: [...currentVertices],
                edges: currentEdges.map(e => ({ ...e })),
                leaves: [],
                removed: [...leaves],
                label: `Tras iteración ${iteration}`
            });
        }

        const center = [...currentVertices];
        const isBicenter = center.length === 2;

        if (isBicenter) {
            log.push(`Resultado: Bicentro — {${center.join(', ')}}`);
        } else {
            log.push(`Resultado: Centro — {${center[0]}}`);
        }

        // Marcar el centro en el último snapshot
        if (steps.length > 0) {
            const last = steps[steps.length - 1];
            last.center = [...center];
            last.label = isBicenter
                ? `Bicentro: {${center.join(', ')}}`
                : `Centro: {${center[0]}}`;
        }

        return { steps, center, isBicenter, log };
    }

    // ─── 2. Árbol de Expansión Mínimo/Máximo (Kruskal) ───────────────────────

    /**
     * Algoritmo de Kruskal para MST o MaxST.
     * @param {GraphModel} graph
     * @param {boolean} [maximize=false] - true para árbol máximo.
     * @returns {{
     *   treeEdges: Array,
     *   totalWeight: number,
     *   log: string[],
     *   hasMultipleSolutions: boolean,
     *   rejectedEdges: Array
     * }}
     */
    static kruskal(graph, maximize = false) {
        const log = [];
        const vertices = graph.vertices;
        const n = vertices.length;

        // Aristas con peso por defecto = 1
        const edges = graph.edges.map(e => ({
            ...e,
            weight: (e.weight !== null && e.weight !== undefined) ? e.weight : 1
        }));

        // Ordenar aristas por peso
        const sorted = [...edges].sort((a, b) =>
            maximize ? b.weight - a.weight : a.weight - b.weight
        );

        log.push(maximize ? 'Árbol de Expansión Máximo (Kruskal):' : 'Árbol de Expansión Mínimo (Kruskal):');
        log.push(`Aristas ordenadas por peso ${maximize ? '(descendente)' : '(ascendente)'}:`);
        log.push(sorted.map(e => `  ${e.from}-${e.to}: ${e.weight}`).join('\n'));

        // Union-Find
        const parent = {};
        const rank = {};
        for (const v of vertices) { parent[v] = v; rank[v] = 0; }

        const find = (x) => {
            if (parent[x] !== x) parent[x] = find(parent[x]);
            return parent[x];
        };
        const union = (x, y) => {
            const px = find(x), py = find(y);
            if (px === py) return false;
            if (rank[px] < rank[py]) parent[px] = py;
            else if (rank[px] > rank[py]) parent[py] = px;
            else { parent[py] = px; rank[px]++; }
            return true;
        };

        const treeEdges = [];
        const rejectedEdges = [];
        let totalWeight = 0;
        let hasMultipleSolutions = false;

        for (const e of sorted) {
            if (treeEdges.length === n - 1) break;

            if (union(e.from, e.to)) {
                treeEdges.push(e);
                totalWeight += e.weight;
                log.push(`✔ Arista ${e.from}-${e.to} (peso ${e.weight}) INCLUIDA — sin ciclo`);
            } else {
                rejectedEdges.push(e);
                log.push(`✘ Arista ${e.from}-${e.to} (peso ${e.weight}) RECHAZADA — genera ciclo`);

                // Verificar si hay arista del mismo peso que podría dar solución alternativa
                const sameWeightAvailable = sorted.some(
                    oe => oe !== e && oe.weight === e.weight && !rejectedEdges.includes(oe) && !treeEdges.includes(oe)
                );
                if (sameWeightAvailable) hasMultipleSolutions = true;
            }
        }

        log.push(`\nPeso total del árbol: ${totalWeight}`);
        if (hasMultipleSolutions && rejectedEdges.some(e =>
            sorted.some(oe => !treeEdges.includes(oe) && !rejectedEdges.includes(oe) && oe.weight === e.weight)
        )) {
            hasMultipleSolutions = true;
        }

        return { treeEdges, totalWeight, log, hasMultipleSolutions, rejectedEdges };
    }

    // ─── 3. Distancia entre 2 Árboles de Expansión ───────────────────────────

    /**
     * Calcula la distancia entre dos árboles de expansión.
     * @param {GraphModel} g1 - Árbol de expansión T1
     * @param {GraphModel} g2 - Árbol de expansión T2
     * @returns {{
     *   unionEdges: Array,
     *   intersectionEdges: Array,
     *   sumUnion: number,
     *   sumIntersection: number,
     *   distance: number,
     *   log: string[],
     *   unionGraph: GraphModel,
     *   intersectionGraph: GraphModel
     * }}
     */
    static spanningTreeDistance(g1, g2) {
        const log = [];

        // Normalizar pesos a 1 si son null
        const edges1 = g1.edges.map(e => ({
            ...e,
            weight: (e.weight !== null && e.weight !== undefined) ? e.weight : 1
        }));
        const edges2 = g2.edges.map(e => ({
            ...e,
            weight: (e.weight !== null && e.weight !== undefined) ? e.weight : 1
        }));

        // Construir sets de aristas por clave canónica
        const edgeMap1 = {};
        for (const e of edges1) {
            const key = [e.from, e.to].sort().join('-');
            edgeMap1[key] = e;
        }
        const edgeMap2 = {};
        for (const e of edges2) {
            const key = [e.from, e.to].sort().join('-');
            edgeMap2[key] = e;
        }

        // D(A) = pesos de A1, D(B) = pesos de A2
        const sumA = edges1.reduce((s, e) => s + e.weight, 0);
        const sumB = edges2.reduce((s, e) => s + e.weight, 0);

        log.push(`D(A) = {${edges1.map(e => `${[e.from, e.to].sort().join('-')}:${e.weight}`).join(', ')}} = ${sumA}`);
        log.push(`D(B) = {${edges2.map(e => `${[e.from, e.to].sort().join('-')}:${e.weight}`).join(', ')}} = ${sumB}`);

        // Unión de aristas
        const unionEdgeMap = {};
        for (const [k, e] of Object.entries(edgeMap1)) unionEdgeMap[k] = { ...e };
        for (const [k, e] of Object.entries(edgeMap2)) {
            if (!unionEdgeMap[k]) unionEdgeMap[k] = { ...e };
        }

        // Intersección de aristas (aristas que están en ambos)
        const intersectionEdgeMap = {};
        for (const [k, e] of Object.entries(edgeMap1)) {
            if (edgeMap2[k]) intersectionEdgeMap[k] = { ...e };
        }

        const unionEdges = Object.values(unionEdgeMap);
        const intersectionEdges = Object.values(intersectionEdgeMap);

        const sumUnion = unionEdges.reduce((s, e) => s + e.weight, 0);
        const sumIntersection = intersectionEdges.reduce((s, e) => s + e.weight, 0);

        log.push(`\nA₁∪A₂ = (${sumA} + ${sumB}) - ${sumIntersection} = ${sumUnion}`);
        log.push(`A₁∩A₂ = ${sumIntersection}`);
        log.push(`D = (A₁∪A₂ - A₁∩A₂) / 2`);
        log.push(`D = (${sumUnion} - ${sumIntersection}) / 2`);

        const distance = (sumUnion - sumIntersection) / 2;
        log.push(`D = ${distance}`);

        // Construir los grafos de unión e intersección
        const allVertices = Array.from(new Set([...g1.vertices, ...g2.vertices]));

        const unionGraph = new GraphModel();
        unionGraph._build_internal(allVertices, unionEdges, false, 'G₁∪G₂');

        // Vértices de la intersección: los que están en AMBOS grafos (independientemente de aristas)
        const v2Set = new Set(g2.vertices);
        const intersectionVertices = g1.vertices.filter(v => v2Set.has(v));

        const intersectionGraph = new GraphModel();
        intersectionGraph._build_internal(
            intersectionVertices,
            intersectionEdges,
            false,
            'G₁∩G₂'
        );

        return {
            unionEdges,
            intersectionEdges,
            sumUnion,
            sumIntersection,
            distance,
            log,
            unionGraph,
            intersectionGraph
        };
    }

    // ─── 4. Rango y Nulidad ───────────────────────────────────────────────────

    /**
     * Calcula el Rango y la Nulidad de un grafo usando su MST.
     * @param {GraphModel} graph
     * @returns {{
     *   mstEdges: Array,
     *   complementEdges: Array,
     *   rank: number,
     *   nullity: number,
     *   totalWeight: number,
     *   log: string[],
     *   mstGraph: GraphModel,
     *   complementGraph: GraphModel
     * }}
     */
    static rankAndNullity(graph) {
        const log = [];
        const n = graph.vertices.length;
        const m = graph.edges.length;

        // Obtener MST con Kruskal mínimo
        const mstResult = this.kruskal(graph, false);
        const mstEdgeKeys = new Set(
            mstResult.treeEdges.map(e => [e.from, e.to].sort().join('-'))
        );

        // Complemento: aristas que no están en el MST
        const complementEdges = graph.edges.filter(e => {
            const key = [e.from, e.to].sort().join('-');
            return !mstEdgeKeys.has(key);
        }).map(e => ({
            ...e,
            weight: (e.weight !== null && e.weight !== undefined) ? e.weight : 1
        }));

        const rank = mstResult.treeEdges.length;       // |V| - 1 = ramas
        const nullity = complementEdges.length;         // |A| - (|V| - 1) = cuerdas

        log.push(`Grafo G: ${n} vértices, ${m} aristas`);
        log.push(`\nÁrbol de Expansión Mínimo (T):`);
        log.push(`  AT = {${mstResult.treeEdges.map(e => `${e.from}-${e.to}:${e.weight !== null ? e.weight : 1}`).join(', ')}}`);
        log.push(`  Peso total T: ${mstResult.totalWeight}`);
        log.push(`\nRango (Ramas) = |V| - 1 = ${n} - 1 = ${rank}`);
        log.push(`\nComplemento T' (Cuerdas):`);
        log.push(`  AT' = {${complementEdges.map(e => `${e.from}-${e.to}:${e.weight !== null ? e.weight : 1}`).join(', ')}}`);
        log.push(`\nNulidad (Cuerdas) = |A| - |V| + 1 = ${m} - ${n} + 1 = ${nullity}`);

        // Construir grafos de MST y complemento
        const mstGraph = new GraphModel();
        mstGraph._build_internal(graph.vertices, mstResult.treeEdges, false, 'T (MST)');

        const compGraph = new GraphModel();
        compGraph._build_internal(graph.vertices, complementEdges, false, "T' (Cuerdas)");

        return {
            mstEdges: mstResult.treeEdges,
            complementEdges,
            rank,
            nullity,
            totalWeight: mstResult.totalWeight,
            log,
            mstGraph,
            complementGraph: compGraph
        };
    }

    // ─── Descripción formal (notación de las imágenes) ────────────────────────

    /**
     * Genera la descripción formal de un grafo según la notación G = (δ, A).
     * @param {GraphModel} graph
     * @param {string} [gLabel='G'] - Etiqueta del grafo (G, T, G1, T1, etc.)
     * @param {string} [deltaLabel='δ'] - Etiqueta del conjunto de vértices
     * @param {string} [aLabel='A'] - Etiqueta del conjunto de aristas
     * @param {boolean} [isTree=false] - Si es árbol, usar notación T=(δT, AT)
     * @returns {string} - HTML con la descripción formal
     */
    static buildFormalDescription(graph, gLabel = 'G', deltaLabel = 'δ', aLabel = 'A', isTree = false) {
        const vStr = graph.vertices.join(', ');

        const edgeStrs = graph.edges.map(e => {
            const w = (e.weight !== null && e.weight !== undefined) ? e.weight : 1;
            return `${e.from}${e.to}:${w}`;
        });
        const aStr = edgeStrs.join(', ');

        const totalWeight = graph.edges.reduce((s, e) => {
            return s + ((e.weight !== null && e.weight !== undefined) ? e.weight : 1);
        }, 0);

        const prefix = isTree ? 'T' : 'G';
        const dL = isTree ? `δ${gLabel}` : deltaLabel;
        const aL = isTree ? `A${gLabel}` : aLabel;

        let html = `<div style="font-family: 'Consolas', monospace; font-size: 0.85rem; line-height: 1.8; color: var(--text-primary); padding: 8px;">`;
        html += `<div><strong>${gLabel} = (${dL}, ${aL})</strong></div>`;
        html += `<div>${dL} = {${vStr || '∅'}}</div>`;
        html += `<div>${aL} = {${aStr || '∅'}}</div>`;
        if (graph.edges.length > 0) {
            html += `<div style="margin-top:4px; color: var(--accent-primary);"><strong>Peso total: ${totalWeight} &nbsp;|&nbsp; Long: ${graph.edges.length}</strong></div>`;
        }
        html += `</div>`;
        return html;
    }

    /**
     * Genera una tabla HTML de descripción formal para uno o varios grafos.
     * @param {Array<{graph: GraphModel, label: string, isTree: boolean}>} items
     * @param {string} [title='']
     * @returns {string} HTML
     */
    static buildDescriptionCard(items, title = '') {
        let html = `<div class="huffman-step-table" style="margin-bottom:12px;">`;
        if (title) {
            html += `<div class="section-title" style="font-size:0.8rem; background:var(--bg-main); border-bottom:1px solid var(--border-light); border-top-left-radius:4px; border-top-right-radius:4px; padding:6px 10px;">${title}</div>`;
        }
        html += `<div style="padding:10px;">`;
        for (const item of items) {
            const g = item.graph;
            const lbl = item.label || 'G';
            const isTree = item.isTree || false;

            const vStr = g.vertices.join(', ');
            const edgeStrs = g.edges.map(e => {
                const w = (e.weight !== null && e.weight !== undefined) ? e.weight : 1;
                return `${e.from}${e.to}:${w}`;
            });
            const aStr = edgeStrs.join(', ');
            const totalW = g.edges.reduce((s, e) => s + ((e.weight !== null && e.weight !== undefined) ? e.weight : 1), 0);

            const dL = isTree ? `δ<sub>${lbl}</sub>` : 'δ';
            const aL = isTree ? `A<sub>${lbl}</sub>` : 'A';

            html += `<div style="margin-bottom:10px; padding:8px; background:rgba(43,87,154,0.04); border-radius:4px; border-left:3px solid var(--accent-primary);">`;
            html += `<div style="font-family:Consolas,monospace; font-size:0.83rem; line-height:1.9;">`;
            html += `<strong>${lbl} = (${dL}, ${aL})</strong><br>`;
            html += `${dL} = {${vStr || '∅'}}<br>`;
            html += `${aL} = {${aStr || '∅'}}`;
            if (g.edges.length > 0) {
                html += `<br><span style="color:var(--accent-primary);font-weight:600;">Peso: ${totalW} &nbsp;|&nbsp; Long: ${g.edges.length}</span>`;
            }
            html += `</div></div>`;
        }
        html += `</div></div>`;
        return html;
    }
}

// Parche interno para construir grafos desde TreeGraphModel
GraphModel.prototype._build_internal = function(vertices, edges, directed, name) {
    this.vertices = [...vertices];
    this.edges = GraphModel.reindexEdgeIds(
        edges.map(e => ({ from: e.from, to: e.to, weight: e.weight ?? null }))
    );
    this.directed = directed;
    this.created = vertices.length > 0;
    this.name = name;
    this.manualPositions = {};
};
