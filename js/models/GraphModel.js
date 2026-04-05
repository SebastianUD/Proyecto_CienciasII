/**
 * @fileoverview Modelo de Grafo y Operaciones entre Grafos.
 * Integra la lógica antes separada en GraphOpsModel.
 * Las aristas tienen IDs automáticos (a, b, c…).
 * Incluye operaciones de edición de grafo único y operaciones entre grafos.
 * @module models/GraphModel
 */

class GraphModel {
    constructor() {
        /** @type {string[]} */
        this.vertices = [];
        /** @type {Array<{id:string, from:string, to:string, weight:number|null}>} */
        this.edges = [];
        /** @type {boolean} */
        this.directed = false;
        /** @type {boolean} */
        this.created = false;
        /** @type {string|null} */
        this.name = null;
    }

    // ─── Generación de IDs de aristas ────────────────────────────────────────

    /**
     * Genera el ID de arista para el índice n (0→'a', 25→'z', 26→'aa'…).
     * @param {number} n
     * @returns {string}
     */
    static edgeIdFromIndex(n) {
        const az = 'abcdefghijklmnopqrstuvwxyz';
        if (n < 26) return az[n];
        let result = '';
        let i = n + 1;
        while (i > 0) {
            i--;
            result = az[i % 26] + result;
            i = Math.floor(i / 26);
        }
        return result;
    }

    /**
     * Reasigna IDs secuenciales (a, b, c…) a un arreglo de aristas.
     * @param {Array} edges
     * @returns {Array}
     */
    static reindexEdgeIds(edges) {
        return edges.map((e, i) => ({ ...e, id: GraphModel.edgeIdFromIndex(i) }));
    }

    // ─── Creación / Reset ─────────────────────────────────────────────────────

    /**
     * Inicializa el grafo. Las aristas reciben IDs automáticos.
     * @param {string[]} vertices
     * @param {Array<{from,to,weight?}>} edges
     * @param {boolean} [directed=false]
     * @returns {{ success: boolean, error?: string }}
     */
    create(vertices, edges, directed = false) {
        if (!vertices || vertices.length === 0)
            return { success: false, error: 'Debe ingresar al menos un vértice.' };
        if (vertices.length > 52)
            return { success: false, error: 'El máximo permitido es 52 vértices.' };

        const seenV = new Set();
        for (const v of vertices) {
            if (seenV.has(v)) return { success: false, error: `Vértice duplicado: "${v}".` };
            seenV.add(v);
        }

        const vSet = new Set(vertices);
        for (const e of edges) {
            if (!vSet.has(e.from))
                return { success: false, error: `El vértice "${e.from}" en la arista "${e.from}-${e.to}" no existe.` };
            if (!vSet.has(e.to))
                return { success: false, error: `El vértice "${e.to}" en la arista "${e.from}-${e.to}" no existe.` };
        }

        // Deduplicar aristas
        const seenE = new Set();
        const deduped = [];
        for (const e of edges) {
            const key = directed ? `${e.from}->${e.to}` : [e.from, e.to].sort().join('-');
            if (!seenE.has(key)) { seenE.add(key); deduped.push(e); }
        }

        this.vertices = [...vertices];
        this.edges = GraphModel.reindexEdgeIds(
            deduped.map(e => ({ from: e.from, to: e.to, weight: e.weight ?? null }))
        );
        this.directed = directed;
        this.created = true;
        return { success: true };
    }

    /** Vacía el grafo y lo marca como no creado. */
    reset() {
        this.vertices = [];
        this.edges = [];
        this.directed = false;
        this.created = false;
    }

    // ─── Operaciones de edición (grafo único) ─────────────────────────────────

    /** Agrega un vértice. @param {string} v @returns {{success,error?}} */
    addVertex(v) {
        v = String(v).trim().toUpperCase();
        if (!v) return { success: false, error: 'El nombre no puede estar vacío.' };
        if (this.vertices.includes(v)) return { success: false, error: `El vértice "${v}" ya existe.` };
        this.vertices.push(v);
        return { success: true };
    }

    /** Elimina un vértice y sus aristas. */
    removeVertex(v) {
        if (!this.vertices.includes(v)) return { success: false, error: `El vértice "${v}" no existe.` };
        const removedEdges = this.edges.filter(e => e.from === v || e.to === v).map(e => e.id);
        this.vertices = this.vertices.filter(x => x !== v);
        this.edges = GraphModel.reindexEdgeIds(this.edges.filter(e => e.from !== v && e.to !== v));
        return { success: true, removedEdges };
    }

    /** Fusiona v2 en v1 (v2 desaparece, sus conexiones pasan a v1). */
    mergeVertices(v1, v2) {
        if (!this.vertices.includes(v1)) return { success: false, error: `El vértice "${v1}" no existe.` };
        if (!this.vertices.includes(v2)) return { success: false, error: `El vértice "${v2}" no existe.` };
        if (v1 === v2) return { success: false, error: 'Los vértices deben ser distintos.' };

        let raw = this.edges.map(e => ({
            ...e,
            from: e.from === v2 ? v1 : e.from,
            to: e.to === v2 ? v1 : e.to
        }));
        const seen = new Set();
        raw = raw.filter(e => {
            if (e.from === e.to) return false;
            const key = this.directed ? `${e.from}->${e.to}` : [e.from, e.to].sort().join('-');
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
        this.vertices = this.vertices.filter(v => v !== v2);
        this.edges = GraphModel.reindexEdgeIds(raw);
        return { success: true };
    }

    /** Agrega una arista al grafo creado. */
    addEdge(from, to, weight = null) {
        if (!this.vertices.includes(from)) return { success: false, error: `El vértice "${from}" no existe.` };
        if (!this.vertices.includes(to)) return { success: false, error: `El vértice "${to}" no existe.` };
        const key = this.directed ? `${from}->${to}` : [from, to].sort().join('-');
        for (const e of this.edges) {
            const k = this.directed ? `${e.from}->${e.to}` : [e.from, e.to].sort().join('-');
            if (k === key) return { success: false, error: `La arista ${from}-${to} ya existe (ID: "${e.id}").` };
        }
        const newId = GraphModel.edgeIdFromIndex(this.edges.length);
        this.edges.push({ id: newId, from, to, weight });
        return { success: true, edgeId: newId };
    }

    /** Elimina una arista por su ID y reindesa los IDs. */
    removeEdge(edgeId) {
        const idx = this.edges.findIndex(e => e.id === edgeId);
        if (idx === -1) return { success: false, error: `La arista "${edgeId}" no existe.` };
        this.edges.splice(idx, 1);
        this.edges = GraphModel.reindexEdgeIds(this.edges);
        return { success: true };
    }

    /** Contrae la arista: fusiona sus dos extremos. */
    contractEdge(edgeId) {
        const edge = this.edges.find(e => e.id === edgeId);
        if (!edge) return { success: false, error: `La arista "${edgeId}" no existe.` };
        const { from, to } = edge;
        this.edges = this.edges.filter(e => e.id !== edgeId);
        return this.mergeVertices(from, to);
    }

    // ─── Parse ────────────────────────────────────────────────────────────────

    /** @param {string} raw @returns {string[]} */
    static parseVertices(raw) {
        return raw.split(/[\s,;]+/).map(s => s.trim().toUpperCase()).filter(s => s.length > 0);
    }

    /** @param {string} raw @returns {{ edges: Array, errors: string[] }} */
    static parseEdges(raw) {
        const tokens = raw.split(/[\n,;]+/).map(s => s.trim()).filter(s => s.length > 0);
        const edges = [], errors = [];
        for (const token of tokens) {
            const m = token.match(/^([A-Za-z0-9]+)\s*[-–→]\s*([A-Za-z0-9]+)(?:\s*:\s*(-?[\d.]+))?$/);
            if (!m) { errors.push(`Formato inválido: "${token}" (use A-B o A-B:5)`); continue; }
            edges.push({ from: m[1].toUpperCase(), to: m[2].toUpperCase(), weight: m[3] !== undefined ? parseFloat(m[3]) : null });
        }
        return { edges, errors };
    }

    // ─── Layout ───────────────────────────────────────────────────────────────

    /**
     * Posiciones circulares para cada vértice.
     * @param {number} [cx=300] @param {number} [cy=200]
     * @returns {Object<string,{x,y,label}>}
     */
    getVertexPositions(cx = 300, cy = 200) {
        const n = this.vertices.length;
        if (n === 0) return {};
        const radius = n === 1 ? 0 : Math.max(80, Math.min(160, n * 18));
        const positions = {};
        this.vertices.forEach((v, i) => {
            const angle = (2 * Math.PI * i / n) - Math.PI / 2;
            positions[v] = { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle), label: v };
        });
        return positions;
    }

    /** @param {string} from @param {string} to @returns {string} */
    static canonicalEdge(from, to) { return [from, to].sort().join('-'); }

    /** @param {string} from @param {string} to @returns {boolean} */
    hasEdge(from, to) {
        for (const e of this.edges) {
            if (e.from === from && e.to === to) return true;
            if (!this.directed && e.from === to && e.to === from) return true;
        }
        return false;
    }

    /** @returns {Set<string>} */
    getEdgeKeySet() {
        const s = new Set();
        for (const e of this.edges)
            s.add(this.directed ? `${e.from}->${e.to}` : GraphModel.canonicalEdge(e.from, e.to));
        return s;
    }

    // ─── Serialización ────────────────────────────────────────────────────────

    toJSON() {
        return { vertices: this.vertices, edges: this.edges, directed: this.directed, name: this.name };
    }

    fromJSON(data) {
        this.vertices = data.vertices || [];
        this.edges = (data.edges || []).map((e, i) => ({
            id: e.id || GraphModel.edgeIdFromIndex(i),
            from: e.from,
            to: e.to,
            weight: e.weight !== undefined ? e.weight : null
        }));
        this.directed = data.directed || false;
        this.name = data.name || null;
        this.created = this.vertices.length > 0;
    }

    // ─── Utilidades internas (operaciones) ────────────────────────────────────

    static _build(vertices, edges, directed, name = 'Resultado') {
        const g = new GraphModel();
        g.vertices = vertices;
        g.edges = GraphModel.reindexEdgeIds(edges.map(e => ({ from: e.from, to: e.to, weight: e.weight ?? null })));
        g.directed = directed;
        g.created = true;
        g.name = name;
        return g;
    }

    static _dedupEdges(edges, directed) {
        const seen = new Set(), result = [];
        for (const e of edges) {
            const key = directed ? `${e.from}->${e.to}` : [e.from, e.to].sort().join('-');
            if (!seen.has(key)) { seen.add(key); result.push(e); }
        }
        return result;
    }

    /**
     * Genera una tabla HTML para un solo grafo.
     */
    static _singleGraphHtmlTable(g, title, sLabel, aLabel) {
        const vStr = g.vertices.join(', ');
        const eStr = g.edges.map(e => e.id).join(', ');
        return `<div style="flex: 1; border: 1px solid var(--border-light); border-radius: 4px; overflow: hidden;"><table class="data-table huffman-ct-table" style="width: 100%; border-collapse: collapse; margin: 0; padding: 0;"><thead style="background:#2B579A; color:white;"><tr><th colspan="2" style="padding:6px; border-bottom:1px solid var(--border-light); font-weight:600;">${title}</th></tr></thead><tbody style="background:transparent;"><tr><td style="font-weight:bold; padding:6px 10px; border-bottom:1px solid var(--border-light); border-right:1px solid var(--border-light); width:45%;">Vértices (${sLabel})</td><td style="padding:6px 10px; border-bottom:1px solid var(--border-light);">{${vStr || '∅'}}</td></tr><tr><td style="font-weight:bold; padding:6px 10px; border-right:1px solid var(--border-light);">Aristas (${aLabel})</td><td style="padding:6px 10px;">{${eStr || '∅'}}</td></tr></tbody></table></div>`;
    }

    /**
     * Genera las tablas HTML duales de notación estándar (Grafo 1 y Grafo 2).
     */
    static _graphsHtmlTables(g1, g2) {
        return `<div style="display: flex; flex-direction: column; gap: 10px; margin-top: 5px; margin-bottom: 5px; font-family: var(--font-main);">${GraphModel._singleGraphHtmlTable(g1, 'GRAFO 1', 'S1', 'A1')}${GraphModel._singleGraphHtmlTable(g2, 'GRAFO 2', 'S2', 'A2')}</div>`;
    }

    // ─── Operaciones entre grafos ─────────────────────────────────────────────

    /**
     * Unión: V = V(G1) ∪ V(G2), E = E(G1) ∪ E(G2).
     * @param {GraphModel} g1 @param {GraphModel} g2
     * @returns {{ graph: GraphModel, log: string[] }}
     */
    static union(g1, g2) {
        const log = [];
        log.push('--- Operación ---');
        log.push('Unión\nG1 ∪ G2 = G3');
        log.push('--- Grafos ---');
        log.push(GraphModel._graphsHtmlTables(g1, g2));
        log.push('--- Unión ---');

        const directed = g1.directed || g2.directed;
        const vertices = Array.from(new Set([...g1.vertices, ...g2.vertices]));
        const edges = GraphModel._dedupEdges([...g1.edges, ...g2.edges], directed);
        const result = GraphModel._build(vertices, edges, directed, 'G3');

        log.push(GraphModel._singleGraphHtmlTable(result, 'GRAFO 3', 'S3 = S1 ∪ S2', 'A3 = A1 ∪ A2'));
        return { graph: result, log };
    }

    /**
     * Intersección: V = V(G1) ∩ V(G2), E = E(G1) ∩ E(G2).
     */
    static intersection(g1, g2) {
        const log = [];
        log.push('--- Operación ---');
        log.push('Intersección\nG1 ∩ G2 = G3');
        log.push('--- Grafos ---');
        log.push(GraphModel._graphsHtmlTables(g1, g2));
        log.push('--- Intersección ---');

        const directed = g1.directed && g2.directed;
        const v2Set = new Set(g2.vertices);
        const vertices = g1.vertices.filter(v => v2Set.has(v));
        const vSet = new Set(vertices);
        const edges = g1.edges.filter(e => vSet.has(e.from) && vSet.has(e.to) && g2.hasEdge(e.from, e.to));
        const result = GraphModel._build(vertices, edges, directed, 'G3');

        log.push(GraphModel._singleGraphHtmlTable(result, 'GRAFO 3', 'S3 = S1 ∩ S2', 'A3 = A1 ∩ A2'));
        return { graph: result, log };
    }

    /**
     * Suma Anillo: G1 ⊕ G2.
     * Diferencia simétrica de aristas.
     */
    static sumRing(g1, g2) {
        const log = [];
        log.push('--- Operación ---');
        log.push('Suma Anillo\nG1 ⊕ G2 = G3');
        log.push('--- Grafos ---');
        log.push(GraphModel._graphsHtmlTables(g1, g2));
        log.push('--- Suma Anillo ---');

        const directed = g1.directed || g2.directed;
        const vertices = Array.from(new Set([...g1.vertices, ...g2.vertices]));
        const key1 = g1.getEdgeKeySet(), key2 = g2.getEdgeKeySet();
        const edges = [];
        for (const e of g1.edges) {
            const k = directed ? `${e.from}->${e.to}` : GraphModel.canonicalEdge(e.from, e.to);
            if (!key2.has(k)) edges.push(e);
        }
        for (const e of g2.edges) {
            const k = directed ? `${e.from}->${e.to}` : GraphModel.canonicalEdge(e.from, e.to);
            if (!key1.has(k)) edges.push(e);
        }
        const result = GraphModel._build(vertices, edges, directed, 'G3');

        log.push(GraphModel._singleGraphHtmlTable(result, 'GRAFO 3', 'S3 = S1 ∪ S2', 'A3 = (A1 ∪ A2) - (A1 ∩ A2)'));
        return { graph: result, log };
    }

    /**
     * Suma (Unión completa): G1 + G2.
     * G1 ∪ G2 más aristas entre todo vertice de G1 y todo vertice de G2.
     */
    static sum(g1, g2) {
        const log = [];
        log.push('--- Operación ---');
        log.push('Suma\nG1 + G2 = G3');
        log.push('--- Grafos ---');
        log.push(GraphModel._graphsHtmlTables(g1, g2));
        log.push('--- Suma ---');

        const directed = g1.directed || g2.directed;
        const vertices = Array.from(new Set([...g1.vertices, ...g2.vertices]));
        const raw = [...g1.edges, ...g2.edges];
        for (const v1 of g1.vertices) {
            for (const v2 of g2.vertices) {
                if (v1 !== v2) raw.push({ from: v1, to: v2, weight: null });
            }
        }

        const result = GraphModel._build(vertices, GraphModel._dedupEdges(raw, directed), directed, 'G3');

        log.push(GraphModel._singleGraphHtmlTable(result, 'GRAFO 3', 'S3', 'A3'));
        return { graph: result, log };
    }

    /**
     * Producto Cartesiano: G1 X G2.
     */
    static cartesianProduct(g1, g2) {
        const log = [];
        log.push('--- Operación ---');
        log.push('Producto Cartesiano\nG1 X G2 = G3');
        log.push('--- Grafos ---');
        log.push(GraphModel._graphsHtmlTables(g1, g2));
        log.push('--- Producto Cartesiano ---');

        const directed = g1.directed || g2.directed;
        const vertices = [], vertexMap = {};
        for (const u of g1.vertices) {
            for (const v of g2.vertices) {
                const label = `(${u},${v})`;
                vertices.push(label);
                vertexMap[`${u}|${v}`] = label;
            }
        }
        const edges = [];
        for (const u of g1.vertices) {
            for (const e of g2.edges) {
                const f = vertexMap[`${u}|${e.from}`], t = vertexMap[`${u}|${e.to}`];
                if (f && t) edges.push({ from: f, to: t, weight: null });
            }
        }
        for (const e of g1.edges) {
            for (const v of g2.vertices) {
                const f = vertexMap[`${e.from}|${v}`], t = vertexMap[`${e.to}|${v}`];
                if (f && t) edges.push({ from: f, to: t, weight: null });
            }
        }

        const result = GraphModel._build(vertices, GraphModel._dedupEdges(edges, directed), directed, 'G3');
        log.push(GraphModel._singleGraphHtmlTable(result, 'GRAFO 3', 'S3', 'A3'));
        return { graph: result, log };
    }

    /**
     * Composición: G1[G2].
     */
    static composition(g1, g2) {
        const log = [];
        log.push('--- Operación ---');
        log.push('Composición\nG1[G2] = G3');
        log.push('--- Grafos ---');
        log.push(GraphModel._graphsHtmlTables(g1, g2));
        log.push('--- Composición ---');

        const directed = g1.directed || g2.directed;
        const vertices = [], vertexMap = {};
        for (const u of g1.vertices) {
            for (const v of g2.vertices) {
                const label = `(${u},${v})`;
                vertices.push(label);
                vertexMap[`${u}|${v}`] = label;
            }
        }
        const raw = [];
        for (const u of g1.vertices) {
            for (const v of g2.vertices) {
                for (const u2 of g1.vertices) {
                    for (const v2 of g2.vertices) {
                        if (g1.hasEdge(u, u2) || (u === u2 && g2.hasEdge(v, v2))) {
                            const f = vertexMap[`${u}|${v}`], t = vertexMap[`${u2}|${v2}`];
                            if (f && t && f !== t) raw.push({ from: f, to: t, weight: null });
                        }
                    }
                }
            }
        }
        const result = GraphModel._build(vertices, GraphModel._dedupEdges(raw, directed), directed, 'G3');
        log.push(GraphModel._singleGraphHtmlTable(result, 'GRAFO 3', 'S3', 'A3'));
        return { graph: result, log };
    }

    /**
     * Producto Tensorial: G1 ⊗ G2.
     */
    static tensorProduct(g1, g2) {
        const log = [];
        log.push('--- Operación ---');
        log.push('Producto Tensorial\nG1 ⊗ G2 = G3');
        log.push('--- Grafos ---');
        log.push(GraphModel._graphsHtmlTables(g1, g2));
        log.push('--- Producto Tensorial ---');

        const directed = g1.directed || g2.directed;
        const vertices = [], vertexMap = {};
        for (const u of g1.vertices) {
            for (const v of g2.vertices) {
                const label = `(${u},${v})`;
                vertices.push(label);
                vertexMap[`${u}|${v}`] = label;
            }
        }
        const raw = [];
        for (const e1 of g1.edges) {
            for (const e2 of g2.edges) {
                const f = vertexMap[`${e1.from}|${e2.from}`], t = vertexMap[`${e1.to}|${e2.to}`];
                if (f && t) raw.push({ from: f, to: t, weight: null });
                if (!directed) {
                    const f2 = vertexMap[`${e1.from}|${e2.to}`], t2 = vertexMap[`${e1.to}|${e2.from}`];
                    if (f2 && t2) raw.push({ from: f2, to: t2, weight: null });
                }
            }
        }
        const result = GraphModel._build(vertices, GraphModel._dedupEdges(raw, directed), directed, 'G3');
        log.push(GraphModel._singleGraphHtmlTable(result, 'GRAFO 3', 'S3', 'A3'));
        return { graph: result, log };
    }
}
