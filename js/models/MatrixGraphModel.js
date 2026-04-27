/**
 * @class MatrixGraphModel
 * @description Algoritmos de matrices para grafos: Distancia (Floyd), Circuitos,
 * Conjuntos de Corte, Incidencia y Adyacencia (vértices y aristas).
 */
class MatrixGraphModel {

    // ─── 1. MATRIZ DE DISTANCIA (FLOYD) ───────────────────────────────────────

    static computeDistanceMatrix(graph) {
        const V = graph.vertices;
        const n = V.length;
        const INF = Infinity;
        const idx = {};
        V.forEach((v, i) => idx[v] = i);

        // Inicializar matriz con pesos directos
        const D = Array.from({ length: n }, (_, i) =>
            Array.from({ length: n }, (__, j) => (i === j ? 0 : INF))
        );

        for (const e of graph.edges) {
            const i = idx[e.from], j = idx[e.to];
            const w = (e.weight !== null && e.weight !== undefined) ? e.weight : 1;
            if (i !== undefined && j !== undefined) {
                if (w < D[i][j]) D[i][j] = w;
                if (!graph.directed && w < D[j][i]) D[j][i] = w;
            }
        }

        // Floyd-Warshall
        for (let k = 0; k < n; k++)
            for (let i = 0; i < n; i++)
                for (let j = 0; j < n; j++)
                    if (D[i][k] < INF && D[k][j] < INF && D[i][k] + D[k][j] < D[i][j])
                        D[i][j] = D[i][k] + D[k][j];

        // Calcular propiedades
        const eccentricity = V.map((_, i) => {
            const row = D[i].filter((_, j) => j !== i);
            return row.every(v => v === INF) ? INF : Math.max(...row);
        });

        const finiteEcc = eccentricity.filter(e => e < INF);
        const diameter = finiteEcc.length ? Math.max(...finiteEcc) : INF;
        const radius = finiteEcc.length ? Math.min(...finiteEcc) : INF;

        // Cintura: mínimo número de aristas que forman un ciclo (sin pesos)
        let girth = INF;
        for (const e of graph.edges) {
            const i = idx[e.from], j = idx[e.to];
            if (i !== undefined && j !== undefined && i !== j) {
                const hops = MatrixGraphModel._shortestPathHops(graph, e.from, e.to, e, graph.directed);
                if (hops < INF) {
                    const cycleLen = hops + 1; // +1 por la arista excluida
                    if (cycleLen < girth) girth = cycleLen;
                }
            }
        }

        // Sumatoria de distancias por vértice (usando Floyd)
        const vertexDist = V.map((_, i) => {
            return D[i].reduce((acc, v, j) => (j !== i && v < INF ? acc + v : acc), 0);
        });

        const center = V.filter((_, i) => eccentricity[i] === radius);
        const isBicenter = center.length === 2;
        const minDist = Math.min(...vertexDist);
        const median = V.filter((_, i) => vertexDist[i] === minDist);

        return { D, V, n, eccentricity, diameter, radius, girth, vertexDist, center, isBicenter, median };
    }

    // BFS por saltos (sin pesos) excluyendo una arista
    static _shortestPathHops(graph, src, tgt, excludeEdge, directed) {
        const visited = new Set([src]);
        const queue = [[src, 0]];
        while (queue.length > 0) {
            const [u, hops] = queue.shift();
            if (u === tgt) return hops;
            for (const e of graph.edges) {
                if (e === excludeEdge) continue;
                if (!directed && e.from === excludeEdge.from && e.to === excludeEdge.to) continue;
                if (!directed && e.from === excludeEdge.to && e.to === excludeEdge.from) continue;
                let nb = null;
                if (e.from === u) nb = e.to;
                else if (!directed && e.to === u) nb = e.from;
                if (nb !== null && !visited.has(nb)) {
                    visited.add(nb);
                    queue.push([nb, hops + 1]);
                }
            }
        }
        return Infinity;
    }

    // Dijkstra excluyendo una arista (para otros usos futuros)
    static _shortestPathExcluding(graph, src, tgt, excludeEdge, directed) {
        const INF = Infinity;
        const dist = {};
        graph.vertices.forEach(v => dist[v] = INF);
        dist[src] = 0;
        const pq = [[0, src]];
        while (pq.length > 0) {
            pq.sort((a, b) => a[0] - b[0]);
            const [d, u] = pq.shift();
            if (d > dist[u]) continue;
            for (const e of graph.edges) {
                if (e === excludeEdge) continue;
                if (!directed && e.from === excludeEdge.from && e.to === excludeEdge.to) continue;
                if (!directed && e.from === excludeEdge.to && e.to === excludeEdge.from) continue;
                const w = (e.weight !== null && e.weight !== undefined) ? e.weight : 1;
                let nb = null;
                if (e.from === u) nb = e.to;
                else if (!directed && e.to === u) nb = e.from;
                if (nb !== null && dist[u] + w < dist[nb]) {
                    dist[nb] = dist[u] + w;
                    pq.push([dist[nb], nb]);
                }
            }
        }
        return dist[tgt];
    }

    // ─── 2. MATRIZ DE CIRCUITOS Y CONJUNTOS DE CORTE ─────────────────────────

    static computeCircuitCutMatrix(graph) {
        const V = graph.vertices;
        const E = graph.edges;

        // MST con Kruskal para obtener ramas y cuerdas
        const mstResult = MatrixGraphModel._kruskalForMatrix(graph);
        const branchKeys = new Set(mstResult.treeEdges.map(e => `${e.from}-${e.to}`));
        const branches = mstResult.treeEdges; // Ramas (árbol)
        const chords = E.filter(e => !branchKeys.has(`${e.from}-${e.to}`) && !branchKeys.has(`${e.to}-${e.from}`)); // Cuerdas

        const directed = graph.directed;
        const nC = chords.length;
        const nB = branches.length;

        // Circuitos fundamentales: para cada cuerda, encontrar el ciclo en el árbol
        const fundamentalCircuits = chords.map(chord => {
            if (!directed) {
                const path = MatrixGraphModel._findTreePath(branches, V, chord.from, chord.to);
                const s = new Set(path);
                s.add(`${chord.from}-${chord.to}`);
                s.add(`${chord.to}-${chord.from}`);
                return s;
            }
            // Dirigido: circuito = cuerda (from→to, +1) + camino de árbol (to→from)
            const pathEdges = MatrixGraphModel._findTreePathDirected(branches, V, chord.to, chord.from);
            const dirMap = new Map();
            dirMap.set(`${chord.from}-${chord.to}`, 1);
            for (const { from, to, dir } of pathEdges) {
                dirMap.set(`${from}-${to}`, dir);
            }
            // Normalizar usando solo el camino del árbol (sin la cuerda):
            // si la mayoría del camino del árbol está en sentido natural (+1), negar todo
            const pathNet = pathEdges.reduce((s, e) => s + e.dir, 0);
            if (pathNet > 0) {
                for (const [k, v] of dirMap) dirMap.set(k, -v);
            }
            return dirMap;
        });

        // Todos los circuitos = combinaciones XOR de fundamentales
        const allCircuits = MatrixGraphModel._generateAllFromFundamental(fundamentalCircuits, E, directed);

        // Conjuntos de corte fundamentales (sin cambios - no tienen orientación signed)
        const fundamentalCuts = branches.map(branch => {
            const comp = MatrixGraphModel._getComponentsWithoutEdge(branches, V, branch);
            const cutSet = new Set();
            for (const e of E) {
                const fromComp = comp[e.from];
                const toComp = comp[e.to];
                if (fromComp !== toComp) {
                    cutSet.add(`${e.from}-${e.to}`);
                    cutSet.add(`${e.to}-${e.from}`);
                }
            }
            return cutSet;
        });

        const allCutsRaw = MatrixGraphModel._generateAllFromFundamental(fundamentalCuts, E, false);
        const allCuts = allCutsRaw.filter(cut => {
            if (cut.isFundamental) return true;
            const components = MatrixGraphModel._countComponentsExcluding(V, E, cut.edgeSet);
            return components === 2;
        });

        return { E, branches, chords, fundamentalCircuits, allCircuits, fundamentalCuts, allCuts, nC, nB, directed };
    }

    static _kruskalForMatrix(graph) {
        const edges = graph.edges.map(e => ({ ...e, weight: e.weight ?? 1 }));
        const sorted = [...edges].sort((a, b) => a.weight - b.weight);
        const parent = {};
        graph.vertices.forEach(v => parent[v] = v);
        const find = x => parent[x] === x ? x : (parent[x] = find(parent[x]));
        const union = (x, y) => { const px = find(x), py = find(y); if (px === py) return false; parent[px] = py; return true; };
        const treeEdges = [];
        for (const e of sorted) {
            if (union(e.from, e.to)) treeEdges.push(e);
            if (treeEdges.length === graph.vertices.length - 1) break;
        }
        return { treeEdges };
    }

    // Contar componentes conexas del grafo excluyendo un conjunto de aristas
    static _countComponentsExcluding(vertices, edges, excludeEdgeSet) {
        const adj = {};
        vertices.forEach(v => adj[v] = []);
        for (const e of edges) {
            const k1 = `${e.from}-${e.to}`, k2 = `${e.to}-${e.from}`;
            if (excludeEdgeSet.has(k1) || excludeEdgeSet.has(k2)) continue;
            adj[e.from].push(e.to);
            adj[e.to].push(e.from);
        }
        const visited = new Set();
        let components = 0;
        for (const v of vertices) {
            if (visited.has(v)) continue;
            components++;
            const queue = [v];
            visited.add(v);
            while (queue.length) {
                const u = queue.shift();
                for (const nb of adj[u]) {
                    if (!visited.has(nb)) { visited.add(nb); queue.push(nb); }
                }
            }
        }
        return components;
    }

    // BFS dirigido en el árbol: retorna lista de {from, to, dir} donde
    // dir=+1 si el eje se usa en su dirección natural, -1 si al revés
    static _findTreePathDirected(branches, vertices, src, tgt) {
        const adj = {};
        vertices.forEach(v => adj[v] = []);
        for (const e of branches) {
            // Ambas direcciones con info de orientación
            adj[e.from].push({ nb: e.to, from: e.from, to: e.to, dir: 1 });
            adj[e.to].push({ nb: e.from, from: e.from, to: e.to, dir: -1 });
        }
        const visited = new Set([src]);
        const queue = [[src, []]];
        while (queue.length) {
            const [curr, path] = queue.shift();
            if (curr === tgt) return path;
            for (const info of (adj[curr] || [])) {
                if (!visited.has(info.nb)) {
                    visited.add(info.nb);
                    queue.push([info.nb, [...path, info]]);
                }
            }
        }
        return [];
    }

    static _findTreePath(branches, vertices, src, tgt) {
        const adj = {};
        vertices.forEach(v => adj[v] = []);
        for (const e of branches) {
            adj[e.from].push({ to: e.to, key: `${e.from}-${e.to}` });
            adj[e.to].push({ to: e.from, key: `${e.to}-${e.from}` });
        }
        const visited = new Set([src]);
        const queue = [[src, []]];
        while (queue.length) {
            const [curr, path] = queue.shift();
            if (curr === tgt) return path;
            for (const { to, key } of (adj[curr] || [])) {
                if (!visited.has(to)) {
                    visited.add(to);
                    queue.push([to, [...path, key, `${to}-${curr}`]]);
                }
            }
        }
        return [];
    }

    static _getComponentsWithoutEdge(branches, vertices, excludeEdge) {
        const adj = {};
        vertices.forEach(v => adj[v] = []);
        for (const e of branches) {
            if (e === excludeEdge) continue;
            adj[e.from].push(e.to);
            adj[e.to].push(e.from);
        }
        const comp = {};
        let compId = 0;
        for (const v of vertices) {
            if (comp[v] !== undefined) continue;
            const queue = [v];
            comp[v] = compId;
            while (queue.length) {
                const u = queue.shift();
                for (const nb of (adj[u] || [])) {
                    if (comp[nb] === undefined) { comp[nb] = compId; queue.push(nb); }
                }
            }
            compId++;
        }
        return comp;
    }

    static _generateAllFromFundamental(fundamentals, edges, directed = false) {
        const all = [];
        const nF = fundamentals.length;
        for (let mask = 1; mask < (1 << nF); mask++) {
            const isFundamental = (mask & (mask - 1)) === 0;
            if (directed && fundamentals[0] instanceof Map) {
                // Para grafos dirigidos: los edges se cancelan solo si tienen el mismo signo
                // (es decir, están en ambos circuitos recorridos en la misma dirección)
                const combined = new Map();
                for (let i = 0; i < nF; i++) {
                    if (!(mask & (1 << i))) continue;
                    for (const [k, v] of fundamentals[i]) {
                        if (combined.has(k)) {
                            if (combined.get(k) === v) combined.delete(k); // mismo sentido → cancela
                            // si sentido opuesto → NO cancela (arista compartida con dirección distinta)
                        } else combined.set(k, v);
                    }
                }
                if (combined.size > 0) {
                    all.push({ edgeSet: combined, edgeMap: combined, isFundamental, directed: true });
                }
            } else {
                const combined = new Set();
                for (let i = 0; i < nF; i++) {
                    if (mask & (1 << i)) {
                        for (const k of fundamentals[i]) {
                            if (combined.has(k)) combined.delete(k);
                            else combined.add(k);
                        }
                    }
                }
                if (combined.size > 0) {
                    all.push({ edgeSet: combined, isFundamental, directed: false });
                }
            }
        }
        return all;
    }

    // ─── 3. MATRIZ DE INCIDENCIA ──────────────────────────────────────────────

    static computeIncidenceMatrix(graph) {
        const V = graph.vertices;
        const E = graph.edges;
        const directed = graph.directed;
        const matrix = V.map(v =>
            E.map(e => {
                if (directed) {
                    if (e.from === v) return 1;
                    if (e.to === v) return -1;
                    return 0;
                } else {
                    return (e.from === v || e.to === v) ? 1 : 0;
                }
            })
        );
        return { V, E, matrix, directed };
    }

    // ─── 4. MATRIZ DE ADYACENCIA ──────────────────────────────────────────────

    static computeAdjacencyMatrix(graph) {
        const V = graph.vertices;
        const E = graph.edges;
        const directed = graph.directed;
        const n = V.length;
        const m = E.length;
        const idx = {};
        V.forEach((v, i) => idx[v] = i);

        // Adyacencia de Vértices (V x V)
        const vertexMatrix = Array.from({ length: n }, () => new Array(n).fill(0));
        for (const e of E) {
            const i = idx[e.from], j = idx[e.to];
            if (i !== undefined && j !== undefined) {
                if (directed) {
                    vertexMatrix[i][j] = 1;   // arista sale de fila hacia columna
                    // Si NO hay arista en sentido contrario, marcar -1 (indica que la conexión existe pero en dirección opuesta)
                    if (vertexMatrix[j][i] === 0) vertexMatrix[j][i] = -1;
                } else {
                    vertexMatrix[i][j] = 1;
                    vertexMatrix[j][i] = 1;
                }
            }
        }
        // Corregir: si hay arista en ambas direcciones (i->j y j->i), la diagonal cruzada debe ser 1 no -1
        if (directed) {
            for (const e of E) {
                const i = idx[e.from], j = idx[e.to];
                if (i !== undefined && j !== undefined && vertexMatrix[i][j] === 1 && vertexMatrix[j][i] === -1) {
                    // si también existe arista j->i, quitar el -1 y poner 1
                    const hasReverse = E.some(e2 => e2.from === e.to && e2.to === e.from);
                    if (!hasReverse) { /* keep -1 */ } else { vertexMatrix[j][i] = 1; }
                }
            }
        }

        // Adyacencia de Aristas (E x E)
        const edgeMatrix = Array.from({ length: m }, () => new Array(m).fill(0));
        for (let i = 0; i < m; i++) {
            for (let j = 0; j < m; j++) {
                if (i === j) { edgeMatrix[i][j] = 0; continue; }
                const a = E[i], b = E[j];
                if (!directed) {
                    // Comparten vértice?
                    const shared = (a.from === b.from || a.from === b.to || a.to === b.from || a.to === b.to);
                    edgeMatrix[i][j] = shared ? 1 : 0;
                } else {
                    // +1 si el final de a coincide con el inicio de b (a→?→b)
                    // -1 si el final de b coincide con el inicio de a (b→?→a)
                    // ±1 si comparten dos vértices (orientaciones mixtas)
                    const aOut = a.from, aIn = a.to;
                    const bOut = b.from, bIn = b.to;
                    // Vértices compartidos
                    const shared = [];
                    if (aOut === bOut || aOut === bIn) shared.push({ av: aOut, role: 'out_a' });
                    if (aIn === bOut || aIn === bIn) shared.push({ av: aIn, role: 'in_a' });
                    if (shared.length === 0) { edgeMatrix[i][j] = 0; continue; }
                    if (shared.length >= 2) { edgeMatrix[i][j] = '±1'; continue; }
                    // Un vértice compartido
                    const sv = shared[0].av;
                    // a sale (from=sv) y b entra (to=sv) => sale/entra -> +1? 
                    // Según spec: +1 si arista sale del vértice, -1 si entra
                    // Para la celda [i][j] = arista i respecto al vértice compartido con arista j
                    const aRole = (a.from === sv) ? 1 : -1; // a sale o entra en sv
                    const bRole = (b.from === sv) ? 1 : -1; // b sale o entra en sv
                    if (aRole === bRole) {
                        edgeMatrix[i][j] = aRole; // misma orientación
                    } else {
                        edgeMatrix[i][j] = '±1'; // orientaciones opuestas en mismo vértice
                    }
                }
            }
        }

        return { V, E, n, m, vertexMatrix, edgeMatrix, directed };
    }

    // ─── HTML RENDERERS ───────────────────────────────────────────────────────

    static renderDistanceHTML(res) {
        const { D, V, eccentricity, diameter, radius, girth, vertexDist, center, isBicenter, median } = res;
        const INF = Infinity;
        const fmt = v => v === INF ? '∞' : v;

        // ── Encabezado: sin columna izquierda; por cada vértice Vk: Vij | Vk
        let html = `<div class="huffman-step-table" style="margin-bottom:12px;">
            <div class="section-title" style="font-size:0.8rem;background:var(--bg-main);border-bottom:1px solid var(--border-light);padding:6px 10px;">
                Matriz de Distancia Entre Vértices
            </div>
            <div style="padding:8px;overflow-x:auto;">
            <table class="matrix-table">
                <thead><tr>`;
        V.forEach(vk => {
            html += `<th style="font-size:0.72rem;font-weight:500;color:#c8d0e0;">Vij</th><th>V${vk}</th>`;
        });
        html += `</tr></thead><tbody>`;

        // ── Filas: índice j (fila) varía, índice i (columna) fijo
        // Cada celda (columna k, fila j): label = V_{V[k]}_{V[j]}, valor = D[k][j]
        V.forEach((rowV, j) => {
            html += `<tr>`;
            V.forEach((colV, k) => {
                const label = `V<sub>${colV}${rowV}</sub>`;
                if (k === j) {
                    // Diagonal: mostrar label y "—"
                    html += `<td class="matrix-cell" style="background:#f5f5f5;color:#aaa;font-size:0.72rem;">${label}</td>`;
                    html += `<td class="matrix-cell matrix-diag">—</td>`;
                } else {
                    const val = fmt(D[k][j]);
                    html += `<td class="matrix-cell" style="color:#888;font-size:0.72rem;">${label}</td>`;
                    html += `<td class="matrix-cell">${val}</td>`;
                }
            });
            html += `</tr>`;
        });

        // ── Fila Total: V{k}j en gris, valor en verde
        html += `<tr>`;
        V.forEach((vk, k) => {
            html += `<td class="matrix-cell" style="font-size:0.72rem;font-style:italic;color:#555;background:#f0f0f0;">V${vk}j</td>`;
            html += `<td class="matrix-cell" style="background:#4CAF50;color:white;font-weight:bold;">${vertexDist[k]}</td>`;
        });
        html += `</tr></tbody></table></div></div>`;

        // ── Propiedades
        html += `<div class="huffman-step-table" style="margin-bottom:12px;">
            <div class="section-title" style="font-size:0.8rem;background:var(--bg-main);border-bottom:1px solid var(--border-light);padding:6px 10px;">Propiedades</div>
            <div style="padding:10px;font-family:Consolas,monospace;font-size:0.85rem;line-height:2;">`;
        html += `<strong>Excentricidad</strong> = {${V.map((v, i) => `V<sub>${v}</sub> = ${fmt(eccentricity[i])}`).join(', ')}}<br>`;
        html += `<strong>Diámetro</strong> = ${fmt(diameter)}<br>`;
        html += `<strong>Radio</strong> = ${fmt(radius)}<br>`;
        html += `<strong>Cintura</strong> = ${fmt(girth)}<br>`;
        html += `<strong>Centro${isBicenter ? ' o Bicentro' : ''}</strong> = {${center.join(', ')}}<br>`;
        html += `<strong>Mediana</strong> = ${median.join(', ')}`;
        html += `</div></div>`;

        return html;
    }

    static renderCircuitCutHTML(res) {
        const { E, allCircuits, allCuts, directed } = res;
        let html = '';

        const edgeLabel = e => directed ? `${e.from}→${e.to}` : `${e.from}-${e.to}`;
        const edgeLabels = E.map(e => edgeLabel(e));

        // Pre-build fundamental index maps
        let cfIdx = 0;
        const circFundIdx = allCircuits.map(c => c.isFundamental ? ++cfIdx : null);
        let ccfIdx = 0;
        const cutFundIdx = allCuts.map(c => c.isFundamental ? ++ccfIdx : null);

        // Helper: aristas del grafo que pertenecen a un edgeSet
        const edgesInSet = edgeSet => E.filter(e => {
            const k1 = `${e.from}-${e.to}`, k2 = `${e.to}-${e.from}`;
            return edgeSet.has(k1) || edgeSet.has(k2);
        }).map(e => edgeLabel(e));

        // ── CIRCUITOS ────────────────────────────────────────────────────────────
        if (allCircuits.length > 0) {
            html += `<div class="huffman-step-table" style="margin-bottom:4px;">
                <div class="section-title" style="font-size:0.8rem;background:var(--bg-main);border-bottom:1px solid var(--border-light);padding:6px 10px;">Matriz de Circuitos</div>
                <div style="padding:8px;overflow-x:auto;">
                <table class="matrix-table">
                    <thead><tr><th></th>${edgeLabels.map(l => `<th>${l}</th>`).join('')}</tr></thead>
                    <tbody>`;
            allCircuits.forEach((circ, i) => {
                const fi = circFundIdx[i];
                const rowStyle = fi !== null ? ' style="background:#FFFDE7;"' : '';
                html += `<tr${rowStyle}><td class="matrix-row-header"${fi !== null ? ' style="background:#FFF9C4;"' : ''}>C<sub>${i + 1}</sub></td>`;
                E.forEach(e => {
                    const k1 = `${e.from}-${e.to}`, k2 = `${e.to}-${e.from}`;
                    let val = 0;
                    if (circ.directed && circ.edgeMap instanceof Map) {
                        // Grafo dirigido: buscar por clave canónica (from-to del edge original)
                        if (circ.edgeMap.has(k1)) val = circ.edgeMap.get(k1);
                        else if (circ.edgeMap.has(k2)) val = -circ.edgeMap.get(k2);
                    } else {
                        val = (circ.edgeSet.has(k1) || circ.edgeSet.has(k2)) ? 1 : 0;
                    }
                    const bgStyle = fi !== null ? 'background:#FFFDE7;' : '';
                    const colorStyle = val === -1 ? 'color:#E53935;' : '';
                    html += `<td class="matrix-cell" style="${bgStyle}${colorStyle}">${val}</td>`;
                });
                html += `</tr>`;
            });
            html += `</tbody></table></div>`;

            // Notación de conjuntos solo para fundamentales
            const fundCircuits = allCircuits.filter((c, i) => circFundIdx[i] !== null);
            if (fundCircuits.length > 0) {
                html += `<div style="padding:6px 12px 10px;font-family:Consolas,monospace;font-size:0.82rem;line-height:1.8;border-top:1px solid var(--border-light);">`;
                fundCircuits.forEach((circ, fi) => {
                    const members = edgesInSet(circ.edgeSet);
                    html += `<span style="font-weight:bold;color:#2B579A;">Cf<sub>${fi + 1}</sub></span> = {${members.join(', ')}}<br>`;
                });
                html += `</div>`;
            }
            html += `</div>`;
        }

        // ── CONJUNTOS DE CORTE ────────────────────────────────────────────────────
        if (allCuts.length > 0) {
            html += `<div class="huffman-step-table" style="margin-bottom:4px;">
                <div class="section-title" style="font-size:0.8rem;background:var(--bg-main);border-bottom:1px solid var(--border-light);padding:6px 10px;">Matriz de Conjuntos de Corte</div>
                <div style="padding:8px;overflow-x:auto;">
                <table class="matrix-table">
                    <thead><tr><th></th>${edgeLabels.map(l => `<th>${l}</th>`).join('')}</tr></thead>
                    <tbody>`;
            allCuts.forEach((cut, i) => {
                const fi = cutFundIdx[i];
                const rowStyle = fi !== null ? ' style="background:#FFFDE7;"' : '';
                html += `<tr${rowStyle}><td class="matrix-row-header"${fi !== null ? ' style="background:#FFF9C4;"' : ''}>CC<sub>${i + 1}</sub></td>`;
                E.forEach(e => {
                    const k1 = `${e.from}-${e.to}`, k2 = `${e.to}-${e.from}`;
                    const has = cut.edgeSet.has(k1) || cut.edgeSet.has(k2);
                    html += `<td class="matrix-cell"${fi !== null ? ' style="background:#FFFDE7;"' : ''}>${has ? 1 : 0}</td>`;
                });
                html += `</tr>`;
            });
            html += `</tbody></table></div>`;

            // Notación de conjuntos solo para fundamentales
            const fundCuts = allCuts.filter((c, i) => cutFundIdx[i] !== null);
            if (fundCuts.length > 0) {
                html += `<div style="padding:6px 12px 10px;font-family:Consolas,monospace;font-size:0.82rem;line-height:1.8;border-top:1px solid var(--border-light);">`;
                fundCuts.forEach((cut, fi) => {
                    const members = edgesInSet(cut.edgeSet);
                    html += `<span style="font-weight:bold;color:#2B579A;">CCf<sub>${fi + 1}</sub></span> = {${members.join(', ')}}<br>`;
                });
                html += `</div>`;
            }
            html += `</div>`;
        }

        return html;
    }

    static renderIncidenceHTML(res) {
        const { V, E, matrix, directed } = res;
        const edgeLabel = e => directed ? `${e.from}→${e.to}` : `${e.from}-${e.to}`;

        let html = `<div class="huffman-step-table" style="margin-bottom:12px;">
            <div class="section-title" style="font-size:0.8rem;background:var(--bg-main);border-bottom:1px solid var(--border-light);padding:6px 10px;">Matriz de Incidencia</div>
            <div style="padding:8px;overflow-x:auto;">
            <table class="matrix-table">
                <thead><tr><th></th>${E.map(e => `<th>${edgeLabel(e)}</th>`).join('')}</tr></thead>
                <tbody>`;
        V.forEach((v, i) => {
            html += `<tr><td class="matrix-row-header">${v}</td>`;
            matrix[i].forEach(val => {
                const color = val === 1 ? '' : val === -1 ? 'color:#E53935;' : 'color:#999;';
                html += `<td class="matrix-cell" style="${color}">${val}</td>`;
            });
            html += `</tr>`;
        });
        html += `</tbody></table></div></div>`;
        return html;
    }

    static renderAdjacencyHTML(res) {
        const { V, E, vertexMatrix, edgeMatrix, directed } = res;
        const edgeLabel = e => directed ? `${e.from}→${e.to}` : `${e.from}-${e.to}`;
        const fmt = v => v;

        const cellStyle = val => {
            if (val === 1) return '';
            if (val === -1) return 'color:#E53935;';
            if (val === '±1') return 'color:#9C27B0;font-weight:bold;';
            return 'color:#bbb;';
        };

        let html = `<div class="huffman-step-table" style="margin-bottom:12px;">
            <div class="section-title" style="font-size:0.8rem;background:var(--bg-main);border-bottom:1px solid var(--border-light);padding:6px 10px;">Matriz de Adyacencia (Vértices)</div>
            <div style="padding:8px;overflow-x:auto;">
            <table class="matrix-table">
                <thead><tr><th></th>${V.map(v => `<th>${v}</th>`).join('')}</tr></thead>
                <tbody>`;
        V.forEach((v, i) => {
            html += `<tr><td class="matrix-row-header">${v}</td>`;
            vertexMatrix[i].forEach((val, j) => {
                html += `<td class="matrix-cell" style="${cellStyle(val)}">${val}</td>`;
            });
            html += `</tr>`;
        });
        html += `</tbody></table></div></div>`;

        if (E.length > 0) {
            html += `<div class="huffman-step-table" style="margin-bottom:12px;">
                <div class="section-title" style="font-size:0.8rem;background:var(--bg-main);border-bottom:1px solid var(--border-light);padding:6px 10px;">Matriz de Adyacencia (Aristas)</div>
                <div style="padding:8px;overflow-x:auto;">
                <table class="matrix-table">
                    <thead><tr><th></th>${E.map(e => `<th>${edgeLabel(e)}</th>`).join('')}</tr></thead>
                    <tbody>`;
            E.forEach((e, i) => {
                html += `<tr><td class="matrix-row-header">${edgeLabel(e)}</td>`;
                edgeMatrix[i].forEach(val => {
                    html += `<td class="matrix-cell" style="${cellStyle(val)}">${val}</td>`;
                });
                html += `</tr>`;
            });
            html += `</tbody></table></div></div>`;
        }
        return html;
    }
}
