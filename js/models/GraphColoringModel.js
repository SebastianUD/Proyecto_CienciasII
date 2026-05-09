/**
 * @class GraphColoringModel
 * @description Modelo para el coloreado de grafos.
 * Calcula número cromático, índice cromático, polinomio cromático,
 * particionamiento cromático, clase cromática y conjuntos independientes.
 * @module models/GraphColoringModel
 */
class GraphColoringModel {

    /** Paleta de colores ordenada según las reglas */
    static COLORS = [
        '#000000', // Negro
        '#E53935', // Rojo
        '#1E88E5', // Azul
        '#43A047', // Verde
        '#8E24AA', // Morado
    ];

    static COLOR_NAMES = ['Negro', 'Rojo', 'Azul', 'Verde', 'Morado'];

    /** Genera colores adicionales si se necesitan más de 5 */
    static getColor(index) {
        if (index < this.COLORS.length) return this.COLORS[index];
        const hue = (index * 137.508) % 360;
        return `hsl(${hue}, 70%, 50%)`;
    }

    static getColorName(index) {
        if (index < this.COLOR_NAMES.length) return this.COLOR_NAMES[index];
        return `Color ${index + 1}`;
    }

    // ─── Adjacency helpers ────────────────────────────────────────────────

    static _buildAdj(graph) {
        const adj = {};
        for (const v of graph.vertices) adj[v] = new Set();
        for (const e of graph.edges) {
            adj[e.from].add(e.to);
            if (!graph.directed) adj[e.to].add(e.from);
        }
        return adj;
    }

    // ─── Vertex Coloring (Greedy with ordering) ───────────────────────────

    /**
     * Greedy vertex coloring using Welsh-Powell (degree descending).
     * Returns a map vertex -> colorIndex.
     */
    static greedyVertexColoring(graph) {
        const adj = this._buildAdj(graph);
        const sorted = [...graph.vertices].sort((a, b) => adj[b].size - adj[a].size);
        const color = {};
        for (const v of sorted) {
            const usedColors = new Set();
            for (const nb of adj[v]) {
                if (color[nb] !== undefined) usedColors.add(color[nb]);
            }
            let c = 0;
            while (usedColors.has(c)) c++;
            color[v] = c;
        }
        return color;
    }

    /**
     * Exact chromatic number via backtracking for small graphs,
     * greedy for larger ones.
     */
    static chromaticNumber(graph) {
        const n = graph.vertices.length;
        if (n === 0) return { chi: 0, coloring: {} };
        if (graph.edges.length === 0) return { chi: 1, coloring: Object.fromEntries(graph.vertices.map(v => [v, 0])) };

        const adj = this._buildAdj(graph);

        // For small graphs (n <= 15), try exact coloring via backtracking
        if (n <= 15) {
            for (let k = 1; k <= n; k++) {
                const coloring = this._tryColorWithK(graph.vertices, adj, k);
                if (coloring) return { chi: k, coloring };
            }
        }

        // Fallback to greedy
        const coloring = this.greedyVertexColoring(graph);
        const chi = Math.max(...Object.values(coloring)) + 1;
        return { chi, coloring };
    }

    static _tryColorWithK(vertices, adj, k) {
        const color = {};
        const n = vertices.length;

        function backtrack(idx) {
            if (idx === n) return true;
            const v = vertices[idx];
            for (let c = 0; c < k; c++) {
                let valid = true;
                for (const nb of adj[v]) {
                    if (color[nb] === c) { valid = false; break; }
                }
                if (valid) {
                    color[v] = c;
                    if (backtrack(idx + 1)) return true;
                    delete color[v];
                }
            }
            return false;
        }

        if (backtrack(0)) return { ...color };
        return null;
    }

    // ─── Edge Coloring (Vizing-like greedy) ───────────────────────────────

    /**
     * Greedy edge coloring.
     * Returns { chiPrime, edgeColoring: Map<edgeId, colorIndex> }
     */
    static edgeColoring(graph) {
        if (graph.edges.length === 0) return { chiPrime: 0, edgeColoring: {} };

        const adj = this._buildAdj(graph);
        const maxDeg = Math.max(...graph.vertices.map(v => adj[v].size));

        // For each edge, find the smallest color not used by incident edges
        const edgeColor = {};
        const vertexUsedColors = {};
        for (const v of graph.vertices) vertexUsedColors[v] = new Set();

        for (const e of graph.edges) {
            const usedColors = new Set([...vertexUsedColors[e.from], ...vertexUsedColors[e.to]]);
            let c = 0;
            while (usedColors.has(c)) c++;
            edgeColor[e.id] = c;
            vertexUsedColors[e.from].add(c);
            vertexUsedColors[e.to].add(c);
        }

        const chiPrime = graph.edges.length > 0 ? Math.max(...Object.values(edgeColor)) + 1 : 0;
        return { chiPrime, edgeColoring: edgeColor };
    }

    // ─── Graph Type Detection ─────────────────────────────────────────────

    static _isConnected(graph) {
        return TreeGraphModel.isConnected(graph);
    }

    static _isNullGraph(graph) {
        return graph.edges.length === 0;
    }

    static _isCompleteGraph(graph) {
        const n = graph.vertices.length;
        if (n <= 1) return true;
        const expected = n * (n - 1) / 2;
        if (graph.edges.length !== expected) return false;
        const adj = this._buildAdj(graph);
        for (const v of graph.vertices) {
            if (adj[v].size !== n - 1) return false;
        }
        return true;
    }

    static _isCycleGraph(graph) {
        const n = graph.vertices.length;
        if (n < 3) return false;
        if (graph.edges.length !== n) return false;
        const adj = this._buildAdj(graph);
        for (const v of graph.vertices) {
            if (adj[v].size !== 2) return false;
        }
        if (!this._isConnected(graph)) return false;
        return true;
    }

    static _isTreeOrLinear(graph) {
        const n = graph.vertices.length;
        if (n === 0) return false;
        if (graph.edges.length !== n - 1) return false;
        return this._isConnected(graph);
    }

    static detectGraphType(graph) {
        if (this._isNullGraph(graph)) return 'null';
        if (this._isCompleteGraph(graph)) return 'complete';
        if (this._isCycleGraph(graph)) return graph.vertices.length % 2 === 0 ? 'cycle_even' : 'cycle_odd';
        if (this._isTreeOrLinear(graph)) return 'tree';
        return 'general';
    }

    static getGraphTypeName(type) {
        const names = {
            'null': 'Grafo Nulo',
            'tree': 'Árbol / Grafo Lineal',
            'cycle_even': 'Grafo Cíclico (n par)',
            'cycle_odd': 'Grafo Cíclico (n impar)',
            'complete': 'Grafo Completo',
            'general': 'Grafo Simple'
        };
        return names[type] || 'Grafo';
    }

    // ─── Chromatic Polynomial ─────────────────────────────────────────────

    static chromaticPolynomial(graph, chi) {
        const n = graph.vertices.length;
        const lam = chi || 2;
        const type = this.detectGraphType(graph);
        let formula = '';
        let evaluated = '';
        let numResult = 0;

        switch (type) {
            case 'null':
                numResult = Math.pow(lam, n);
                formula = `P<sub>n</sub>(λ) = λ<sup>n</sup>`;
                evaluated = `P<sub>${n}</sub>(${lam}) = ${numResult}`;
                break;
            case 'tree':
                numResult = lam * Math.pow(lam - 1, n - 1);
                formula = `P<sub>n</sub>(λ) = λ(λ - 1)<sup>(n-1)</sup>`;
                evaluated = `P<sub>${n}</sub>(${lam}) = ${numResult}`;
                break;
            case 'cycle_even':
                numResult = lam * Math.pow(lam - 1, n - 1);
                formula = `P<sub>n</sub>(λ) = λ(λ - 1)<sup>(n-1)</sup>`;
                evaluated = `P<sub>${n}</sub>(${lam}) = ${numResult}`;
                break;
            case 'cycle_odd':
                numResult = lam * (lam - 2) * Math.pow(lam - 1, n - 2);
                formula = `P<sub>n</sub>(λ) = λ(λ - 2)(λ - 1)<sup>(n-2)</sup>`;
                evaluated = `P<sub>${n}</sub>(${lam}) = ${numResult}`;
                break;
            case 'complete': {
                const factorial = (x) => { let r = 1; for (let i = 2; i <= x; i++) r *= i; return r; };
                numResult = lam >= n ? factorial(lam) / factorial(lam - n) : 0;
                formula = `P<sub>n</sub>(λ) = λ! / (λ - n)!`;
                evaluated = `P<sub>${n}</sub>(${lam}) = ${numResult}`;
                break;
            }
            default: {
                numResult = this._countColorings(graph, lam);
                formula = `P<sub>n</sub>(λ) = λ(λ - 2)(λ - 1)<sup>2</sup>`;
                evaluated = `P<sub>${n}</sub>(${lam}) = ${numResult}`;
                break;
            }
        }

        return { type, formula, evaluated, n, numResult };
    }

    static _computeGeneralPolynomialDisplay(graph) {
        const n = graph.vertices.length;
        // Show evaluation for λ = chi to chi+2
        const chi = this.chromaticNumber(graph).chi;
        const evals = [];
        for (let lam = chi; lam <= chi + 3; lam++) {
            const count = this._countColorings(graph, lam);
            evals.push(`P(${lam}) = ${count}`);
        }
        return `Evaluaciones: ${evals.join(', ')}`;
    }

    /** Count colorings with exactly lambda colors (brute-force for small graphs) */
    static _countColorings(graph, lambda) {
        const n = graph.vertices.length;
        if (n > 10) return '—'; // Too large
        const adj = this._buildAdj(graph);
        let count = 0;

        function backtrack(idx, color) {
            if (idx === n) { count++; return; }
            const v = graph.vertices[idx];
            for (let c = 0; c < lambda; c++) {
                let valid = true;
                for (const nb of adj[v]) {
                    if (color[nb] === c) { valid = false; break; }
                }
                if (valid) {
                    color[v] = c;
                    backtrack(idx + 1, color);
                    delete color[v];
                }
            }
        }

        backtrack(0, {});
        return count;
    }

    // ─── Chromatic Partitioning ───────────────────────────────────────────

    static chromaticPartitioning(coloring) {
        const partitions = {};
        for (const [v, c] of Object.entries(coloring)) {
            if (!partitions[c]) partitions[c] = [];
            partitions[c].push(v);
        }
        return partitions;
    }

    // ─── Chromatic Class ─────────────────────────────────────────────────

    /**
     * Determines chromatic class:
     * Class 1: χ'(G) = Δ(G)
     * Class 2: χ'(G) = Δ(G) + 1
     */
    static chromaticClass(graph, chiPrime) {
        if (graph.edges.length === 0) return { classNum: 1, delta: 0 };
        const adj = this._buildAdj(graph);
        const delta = Math.max(...graph.vertices.map(v => adj[v].size));
        const classNum = chiPrime === delta ? 1 : 2;
        return { classNum, delta };
    }

    // ─── Independent Sets ────────────────────────────────────────────────

    /**
     * Find fundamental independent sets from the vertex coloring partition.
     */
    static fundamentalIndependentSets(graph, coloring) {
        const partitions = this.chromaticPartitioning(coloring);
        const adj = this._buildAdj(graph);
        const sets = [];

        for (const [colorIdx, vertices] of Object.entries(partitions)) {
            // Verify independence
            let isIndependent = true;
            for (let i = 0; i < vertices.length && isIndependent; i++) {
                for (let j = i + 1; j < vertices.length && isIndependent; j++) {
                    if (adj[vertices[i]].has(vertices[j])) isIndependent = false;
                }
            }
            if (isIndependent) {
                sets.push({
                    colorIndex: parseInt(colorIdx),
                    colorName: this.getColorName(parseInt(colorIdx)),
                    color: this.getColor(parseInt(colorIdx)),
                    vertices: vertices
                });
            }
        }
        return sets;
    }

    /**
     * Find all maximal independent sets using Bron-Kerbosch algorithm.
     * An independent set is maximal if it's not a subset of any other independent set.
     */
    static findAllMaximalIndependentSets(graph) {
        const vertices = graph.vertices;
        const adj = this._buildAdj(graph);
        const maximalSets = [];

        function bronKerbosch(r, p, x) {
            if (p.size === 0 && x.size === 0) {
                maximalSets.push([...r]);
                return;
            }

            const pArray = [...p];
            for (const v of pArray) {
                const neighbors = adj[v];
                
                // New P: P \ {v} \ neighbors(v)
                const nextP = new Set();
                for (const node of p) {
                    if (node !== v && !neighbors.has(node)) nextP.add(node);
                }

                // New X: X \ neighbors(v)
                const nextX = new Set();
                for (const node of x) {
                    if (!neighbors.has(node)) nextX.add(node);
                }

                bronKerbosch(new Set([...r, v]), nextP, nextX);

                p.delete(v);
                x.add(v);
            }
        }

        bronKerbosch(new Set(), new Set(vertices), new Set());
        return maximalSets;
    }

    /**
     * Find maximum independent sets (maximal sets with maximum size).
     */
    static findMaximumIndependentSets(maximalSets) {
        if (maximalSets.length === 0) return [];
        const maxSize = Math.max(...maximalSets.map(s => s.length));
        return maximalSets.filter(s => s.length === maxSize);
    }

    // ─── Random coloring variant (for polynomial variety) ────────────────

    /**
     * Generate a random valid coloring using chi colors.
     */
    static randomValidColoring(graph, chi) {
        const adj = this._buildAdj(graph);
        const n = graph.vertices.length;

        // Try multiple random orderings to get a valid chi-coloring
        for (let attempt = 0; attempt < 20; attempt++) {
            const shuffled = [...graph.vertices].sort(() => Math.random() - 0.5);
            const color = {};
            let valid = true;

            for (const v of shuffled) {
                const usedColors = new Set();
                for (const nb of adj[v]) {
                    if (color[nb] !== undefined) usedColors.add(color[nb]);
                }
                const available = [];
                for (let c = 0; c < chi; c++) {
                    if (!usedColors.has(c)) available.push(c);
                }
                if (available.length > 0) {
                    color[v] = available[Math.floor(Math.random() * available.length)];
                } else {
                    valid = false;
                    break;
                }
            }
            if (valid) return color;
        }

        // Fallback to exact backtracking coloring
        const { coloring } = this.chromaticNumber(graph);
        return coloring;
    }

    // ─── Full Computation ────────────────────────────────────────────────

    /**
     * Perform full graph coloring analysis.
     * @param {GraphModel} graph
     * @returns {Object} Complete coloring results
     */
    static computeAll(graph) {
        // 1. Chromatic number (exact)
        const { chi } = this.chromaticNumber(graph);

        // Generate a random valid coloring for variety on each call
        const coloring = this.randomValidColoring(graph, chi);

        // 2. Edge coloring & chromatic index
        const { chiPrime, edgeColoring } = this.edgeColoring(graph);

        // 3. Chromatic polynomial (evaluate with λ = chi)
        const polynomial = this.chromaticPolynomial(graph, chi);

        // 4. Partitioning
        const partitions = this.chromaticPartitioning(coloring);

        // 5. Chromatic class
        const { classNum, delta } = this.chromaticClass(graph, chiPrime);

        // 6. Independent sets
        const independentSets = this.fundamentalIndependentSets(graph, coloring);
        const allMaximal = this.findAllMaximalIndependentSets(graph);
        const maximumSets = this.findMaximumIndependentSets(allMaximal);

        // 7. Edge Independent Sets (Matchings)
        const allMaximalMatchings = this.findAllMaximalMatchings(graph);
        const maximumMatchings = this.findMaximumMatchings(allMaximalMatchings);

        return {
            chi,
            chiPrime,
            coloring,
            edgeColoring,
            polynomial,
            partitions,
            classNum,
            delta,
            independentSets,
            maximalSets: allMaximal,
            maximumSets: maximumSets,
            maximalMatchings: allMaximalMatchings,
            maximumMatchings: maximumMatchings
        };
    }

    /**
     * Find all maximal matchings (maximal edge independent sets).
     */
    static findAllMaximalMatchings(graph) {
        if (graph.edges.length === 0) return [];
        const edges = graph.edges;
        const maximalMatchings = [];

        function backtrack(idx, currentMatching, coveredVertices) {
            if (idx === edges.length) {
                // Check if it's maximal: can any unused edge be added?
                let isMaximal = true;
                for (const e of edges) {
                    if (!coveredVertices.has(e.from) && !coveredVertices.has(e.to)) {
                        isMaximal = false;
                        break;
                    }
                }
                if (isMaximal) {
                    // Avoid duplicates (different orderings)
                    const sortedIds = [...currentMatching].map(e => e.id).sort().join(',');
                    if (!maximalMatchings.some(m => m.map(e => e.id).sort().join(',') === sortedIds)) {
                        maximalMatchings.push([...currentMatching]);
                    }
                }
                return;
            }

            const e = edges[idx];
            // Option 1: Include edge e if possible
            if (!coveredVertices.has(e.from) && !coveredVertices.has(e.to)) {
                coveredVertices.add(e.from);
                coveredVertices.add(e.to);
                currentMatching.push(e);
                backtrack(idx + 1, currentMatching, coveredVertices);
                currentMatching.pop();
                coveredVertices.delete(e.from);
                coveredVertices.delete(e.to);
            }

            // Option 2: Skip edge e
            backtrack(idx + 1, currentMatching, coveredVertices);
        }

        backtrack(0, [], new Set());
        return maximalMatchings;
    }

    /**
     * Find maximum matchings (maximal matchings with maximum size).
     */
    static findMaximumMatchings(maximalMatchings) {
        if (maximalMatchings.length === 0) return [];
        const maxSize = Math.max(...maximalMatchings.map(m => m.length));
        return maximalMatchings.filter(m => m.length === maxSize);
    }

    // ─── Dominating Sets ──────────────────────────────────────────────────

    /**
     * Compute all minimal dominating sets, minimum dominating sets, maximum dominating sets (among minimal ones),
     * and the domination number.
     */
    static computeDominatingSets(graph) {
        const vertices = graph.vertices;
        const adj = this._buildAdj(graph);
        const n = vertices.length;

        if (n > 22) {
            throw new Error("El grafo es demasiado grande para este cálculo (máximo 22 vértices).");
        }

        const minimalDominatingSets = [];

        const isDominating = (subsetSet) => {
            for (const v of vertices) {
                if (subsetSet.has(v)) continue;
                let dominated = false;
                for (const nb of adj[v]) {
                    if (subsetSet.has(nb)) { dominated = true; break; }
                }
                if (!dominated) return false;
            }
            return true;
        };

        const isMinimal = (subsetSet, subsetArray) => {
            for (const v of subsetArray) {
                subsetSet.delete(v);
                let dominatesAll = true;
                for (const u of vertices) {
                    if (subsetSet.has(u)) continue;
                    let dominated = false;
                    for (const nb of adj[u]) {
                        if (subsetSet.has(nb)) { dominated = true; break; }
                    }
                    if (!dominated) { dominatesAll = false; break; }
                }
                subsetSet.add(v);
                if (dominatesAll) return false; // D \ {v} is dominating, so not minimal
            }
            return true;
        };

        function backtrack(idx, currentArray, currentSet) {
            if (idx === n) {
                if (isDominating(currentSet) && isMinimal(currentSet, currentArray)) {
                    minimalDominatingSets.push([...currentArray]);
                }
                return;
            }
            // Exclude
            backtrack(idx + 1, currentArray, currentSet);
            // Include
            const v = vertices[idx];
            currentArray.push(v);
            currentSet.add(v);
            backtrack(idx + 1, currentArray, currentSet);
            currentSet.delete(v);
            currentArray.pop();
        }

        backtrack(0, [], new Set());

        let minSize = Infinity;
        let maxSize = 0;
        for (const s of minimalDominatingSets) {
            if (s.length < minSize) minSize = s.length;
            if (s.length > maxSize) maxSize = s.length;
        }

        const minimumSets = minimalDominatingSets.filter(s => s.length === minSize);
        const maximumSets = minimalDominatingSets.filter(s => s.length === maxSize);

        return {
            minimalSets: minimalDominatingSets,
            minimumSets: minimumSets,
            maximumSets: maximumSets,
            dominationNumber: minSize === Infinity ? 0 : minSize
        };
    }

    // ─── Connected Subsets ────────────────────────────────────────────────

    /**
     * Compute all connected subsets of vertices, as well as the minimum and maximum ones.
     */
    static computeConnectedSubsets(graph) {
        const vertices = graph.vertices;
        const adj = this._buildAdj(graph);
        const n = vertices.length;

        if (n > 18) {
            throw new Error("El grafo es demasiado grande para este cálculo (máximo 18 vértices para evitar sobrecarga de memoria).");
        }

        const connectedSubsets = [];

        const isConnected = (subsetArray) => {
            if (subsetArray.length === 0) return false;
            if (subsetArray.length === 1) return true;

            const subsetSet = new Set(subsetArray);
            const visited = new Set();
            const q = [subsetArray[0]];
            visited.add(subsetArray[0]);

            let count = 0;
            while (q.length > 0) {
                const u = q.shift();
                count++;
                for (const v of adj[u]) {
                    if (subsetSet.has(v) && !visited.has(v)) {
                        visited.add(v);
                        q.push(v);
                    }
                }
            }
            return count === subsetArray.length;
        };

        function backtrack(idx, currentArray) {
            if (idx === n) {
                if (currentArray.length > 0 && isConnected(currentArray)) {
                    connectedSubsets.push([...currentArray]);
                }
                return;
            }
            // Exclude
            backtrack(idx + 1, currentArray);
            // Include
            currentArray.push(vertices[idx]);
            backtrack(idx + 1, currentArray);
            currentArray.pop();
        }

        backtrack(0, []);

        // Sort by size for better visualization
        connectedSubsets.sort((a, b) => a.length - b.length);

        let minSize = Infinity;
        let maxSize = 0;
        if (connectedSubsets.length > 0) {
            minSize = connectedSubsets[0].length; // Already sorted
            maxSize = connectedSubsets[connectedSubsets.length - 1].length;
        } else {
            minSize = 0;
        }

        const minimumSets = connectedSubsets.filter(s => s.length === minSize);
        const maximumSets = connectedSubsets.filter(s => s.length === maxSize);

        return {
            allSets: connectedSubsets,
            minimumSets: minimumSets,
            maximumSets: maximumSets
        };
    }
}
