/**
 * @class MatchingModel
 * @description Contiene la lógica matemática para Pareamientos (Matching) en grafos
 * no dirigidos. Implementa algoritmos para enumerar todos los pareamientos posibles,
 * clasificarlos y encontrar el pareamiento máximo.
 *
 * Definiciones:
 * - Pareamiento M: Conjunto de aristas independientes (sin vértices compartidos).
 * - Vértice Saturado: Extremo de alguna arista en M.
 * - Vértice Libre: No es extremo de ninguna arista en M.
 * - Maximal: No se puede agregar ninguna arista más sin violar la independencia.
 * - Máximo: Mayor cardinalidad posible.
 * - Perfecto: Todos los vértices están saturados.
 * - Óptimo: Máximo y Perfecto a la vez.
 *
 * @module models/MatchingModel
 */
class MatchingModel {

    // ─── Enumerar TODOS los pareamientos posibles ─────────────────────────────

    /**
     * Enumera todos los pareamientos posibles de un grafo (incluyendo los de
     * cardinalidad 1) y los clasifica en tres categorías:
     *   - comunes: ni maximales ni máximos
     *   - maximales: maximales pero no máximos
     *   - maximos: máximos (que siempre son maximales)
     *
     * Cada pareamiento se nombra como M₁, M₂, ... Mₙ con numeración continua.
     *
     * @param {GraphModel} graph - Grafo no dirigido.
     * @returns {{
     *   comunes: Object[],
     *   maximales: Object[],
     *   maximos: Object[],
     *   total: number
     * }}
     */
    static enumerateAllMatchings(graph) {
        // Filtrar aristas válidas (sin lazos)
        const validEdges = graph.edges.filter(e => e.from !== e.to);

        // Generar todos los conjuntos independientes de aristas por backtracking
        const allMatchingSets = [];
        const seen = new Set();

        this._enumerateMatchings(validEdges, 0, [], new Set(), allMatchingSets, seen);

        // Calcular la cardinalidad máxima
        const maxCard = this._computeMaximumCardinality(graph);

        // Clasificar cada matching
        const comunes = [];
        const maximales = [];
        const maximos = [];

        let globalIdx = 1;

        for (const edgeSet of allMatchingSets) {
            const classified = this._classifyMatching(graph, edgeSet, maxCard);
            classified.label = `M<sub>${globalIdx}</sub>`;
            classified.idx = globalIdx;

            if (classified.isMaximum) {
                maximos.push(classified);
            } else if (classified.isMaximal) {
                maximales.push(classified);
            } else {
                comunes.push(classified);
            }
            globalIdx++;
        }

        return {
            comunes,
            maximales,
            maximos,
            total: globalIdx - 1
        };
    }

    /**
     * Backtracking recursivo para generar todos los matchings posibles.
     * Cada matching es un subconjunto de aristas donde ningún par comparte vértice.
     * Solo genera matchings de cardinalidad >= 1.
     * @private
     */
    static _enumerateMatchings(edges, startIdx, current, usedVertices, results, seen) {
        // Si ya tenemos al menos una arista, registrar este matching
        if (current.length > 0) {
            // Clave canónica para deduplicar (aristas multi-grafo)
            const key = current
                .map(e => [e.from, e.to].sort().join('-'))
                .sort()
                .join('|');
            if (!seen.has(key)) {
                seen.add(key);
                results.push([...current]);
            }
        }

        // Explorar extensiones
        for (let i = startIdx; i < edges.length; i++) {
            const e = edges[i];
            if (!usedVertices.has(e.from) && !usedVertices.has(e.to)) {
                current.push(e);
                usedVertices.add(e.from);
                usedVertices.add(e.to);

                this._enumerateMatchings(edges, i + 1, current, usedVertices, results, seen);

                current.pop();
                usedVertices.delete(e.from);
                usedVertices.delete(e.to);
            }
        }
    }

    // ─── Pareamiento Máximo (Caminos Incrementados) ───────────────────────────

    /**
     * Encuentra el pareamiento máximo usando el algoritmo de caminos incrementados
     * (augmenting paths). Parte de un matching greedy y lo mejora iterativamente.
     *
     * Algoritmo:
     * 1. Encontrar un matching inicial (greedy).
     * 2. Buscar un camino incrementado (alternado que empieza y termina en vértice libre).
     * 3. Si se encuentra, intercambiar las aristas del camino (las de M salen, las de fuera entran).
     * 4. Repetir hasta que no haya más caminos incrementados.
     *
     * @param {GraphModel} graph - Grafo no dirigido.
     * @returns {Object} Resultado con matchingEdges y datos de clasificación.
     */
    static findMaximumMatching(graph) {
        // Construir lista de adyacencia
        const adj = {};
        for (const v of graph.vertices) adj[v] = [];
        for (const e of graph.edges) {
            if (e.from === e.to) continue; // Ignorar lazos
            adj[e.from].push({ to: e.to, edge: e });
            adj[e.to].push({ to: e.from, edge: e });
        }

        // Iniciar con matching greedy
        const matchSet = new Set(); // Set de edge IDs en el matching
        const mate = {};            // mate[v] = vértice emparejado con v (o null)
        for (const v of graph.vertices) mate[v] = null;

        // Greedy initial matching
        for (const e of graph.edges) {
            if (e.from === e.to) continue;
            if (mate[e.from] === null && mate[e.to] === null) {
                matchSet.add(e.id);
                mate[e.from] = e.to;
                mate[e.to] = e.from;
            }
        }

        // Buscar caminos incrementados y augmentar
        let found = true;
        while (found) {
            found = false;
            const augPath = this._findAugmentingPath(graph, adj, matchSet, mate);
            if (augPath) {
                // Augmentar: intercambiar aristas en el camino
                this._augment(augPath, matchSet, mate);
                found = true;
            }
        }

        // Reconstruir lista de aristas del matching
        const matchingEdges = graph.edges.filter(e => matchSet.has(e.id));

        return this._classifyMatching(graph, matchingEdges);
    }

    /**
     * Busca un camino incrementado usando BFS desde vértices libres.
     * Un camino incrementado es un camino alternado que empieza y termina
     * en vértices libres.
     * @private
     */
    static _findAugmentingPath(graph, adj, matchSet, mate) {
        // BFS desde todos los vértices libres
        const freeVertices = graph.vertices.filter(v => mate[v] === null);

        for (const start of freeVertices) {
            // BFS con seguimiento de aristas alternadas
            const visited = new Set();
            visited.add(start);
            // Queue entries: { vertex, path: [{from, to, edgeId, inMatch}] }
            const queue = [{ vertex: start, path: [] }];

            while (queue.length > 0) {
                const { vertex, path } = queue.shift();
                const expectNonMatch = (path.length % 2 === 0); // Alternar: no-match, match, no-match...

                for (const neighbor of adj[vertex]) {
                    if (visited.has(neighbor.to)) continue;

                    const edgeInMatch = matchSet.has(neighbor.edge.id);

                    if (expectNonMatch && !edgeInMatch) {
                        // Tomamos arista que NO está en el matching
                        const newPath = [...path, {
                            from: vertex,
                            to: neighbor.to,
                            edgeId: neighbor.edge.id,
                            inMatch: false
                        }];

                        // Si terminamos en un vértice libre → camino incrementado encontrado
                        if (mate[neighbor.to] === null) {
                            return newPath;
                        }

                        visited.add(neighbor.to);
                        queue.push({ vertex: neighbor.to, path: newPath });
                    } else if (!expectNonMatch && edgeInMatch) {
                        // Tomamos arista que SÍ está en el matching
                        const newPath = [...path, {
                            from: vertex,
                            to: neighbor.to,
                            edgeId: neighbor.edge.id,
                            inMatch: true
                        }];

                        visited.add(neighbor.to);
                        queue.push({ vertex: neighbor.to, path: newPath });
                    }
                }
            }
        }
        return null;
    }

    /**
     * Augmenta el matching intercambiando aristas a lo largo del camino incrementado.
     * Las aristas que no estaban en M entran, las que estaban salen.
     * @private
     */
    static _augment(path, matchSet, mate) {
        for (const step of path) {
            if (step.inMatch) {
                // Sacar del matching
                matchSet.delete(step.edgeId);
            } else {
                // Meter al matching
                matchSet.add(step.edgeId);
            }
        }
        // Reconstruir mate
        // Primero limpiar todos los mates que participan en el camino
        const involved = new Set();
        for (const step of path) {
            involved.add(step.from);
            involved.add(step.to);
        }
        for (const v of involved) {
            mate[v] = null;
        }
        // Reconstruir desde matchSet
        for (const step of path) {
            if (matchSet.has(step.edgeId)) {
                mate[step.from] = step.to;
                mate[step.to] = step.from;
            }
        }
    }

    // ─── Clasificación del Pareamiento ────────────────────────────────────────

    /**
     * Clasifica un pareamiento dado, calculando todas sus propiedades.
     * @param {GraphModel} graph - Grafo original.
     * @param {Array} matchingEdges - Aristas seleccionadas para el pareamiento.
     * @param {number|null} knownMaxCard - Cardinalidad máxima ya conocida (opcional).
     * @returns {{
     *   matchingEdges: Array,
     *   cardinality: number,
     *   saturatedVertices: string[],
     *   freeVertices: string[],
     *   isMaximal: boolean,
     *   isMaximum: boolean,
     *   isPerfect: boolean,
     *   isOptimal: boolean
     * }}
     */
    static _classifyMatching(graph, matchingEdges, knownMaxCard = null) {
        const cardinality = matchingEdges.length;

        // Vértices saturados y libres
        const saturatedSet = new Set();
        for (const e of matchingEdges) {
            saturatedSet.add(e.from);
            saturatedSet.add(e.to);
        }
        const saturatedVertices = graph.vertices.filter(v => saturatedSet.has(v));
        const freeVertices = graph.vertices.filter(v => !saturatedSet.has(v));

        // Verificar si es maximal: no se puede agregar ninguna arista más
        let isMaximal = true;
        for (const e of graph.edges) {
            if (e.from === e.to) continue; // Ignorar lazos
            if (!saturatedSet.has(e.from) && !saturatedSet.has(e.to)) {
                isMaximal = false;
                break;
            }
        }

        // Verificar si es perfecto: todos los vértices están saturados
        const isPerfect = freeVertices.length === 0;

        // Usar cardinalidad máxima ya conocida (si se pasa) para evitar recomputar
        const maxCard = knownMaxCard !== null ? knownMaxCard : this._computeMaximumCardinality(graph);
        const isMaximum = cardinality === maxCard;

        // Óptimo: máximo y perfecto
        const isOptimal = isMaximum && isPerfect;

        return {
            matchingEdges,
            cardinality,
            saturatedVertices,
            freeVertices,
            isMaximal,
            isMaximum,
            isPerfect,
            isOptimal
        };
    }

    /**
     * Calcula la cardinalidad del pareamiento máximo (sin devolver las aristas completas).
     * Se usa internamente para clasificar otros pareamientos.
     * @private
     */
    static _computeMaximumCardinality(graph) {
        const adj = {};
        for (const v of graph.vertices) adj[v] = [];
        for (const e of graph.edges) {
            if (e.from === e.to) continue;
            adj[e.from].push({ to: e.to, edge: e });
            adj[e.to].push({ to: e.from, edge: e });
        }

        const matchSet = new Set();
        const mate = {};
        for (const v of graph.vertices) mate[v] = null;

        // Greedy initial
        for (const e of graph.edges) {
            if (e.from === e.to) continue;
            if (mate[e.from] === null && mate[e.to] === null) {
                matchSet.add(e.id);
                mate[e.from] = e.to;
                mate[e.to] = e.from;
            }
        }

        // Augment
        let found = true;
        while (found) {
            found = false;
            const augPath = this._findAugmentingPath(graph, adj, matchSet, mate);
            if (augPath) {
                this._augment(augPath, matchSet, mate);
                found = true;
            }
        }

        let count = 0;
        for (const v of graph.vertices) {
            if (mate[v] !== null) count++;
        }
        return count / 2;
    }

    // ─── Formateador de aristas para la notación ──────────────────────────────

    /**
     * Formatea una lista de aristas al estilo "ab, cd, ef" (vértices concatenados).
     * @param {Array} edges - Lista de aristas.
     * @returns {string}
     */
    static formatEdges(edges) {
        return edges.map(e => {
            const sorted = [e.from, e.to].sort();
            return sorted.join('');
        }).join(', ');
    }

    /**
     * Formatea una lista de aristas al estilo "a–b, c–d, e–f" (con guión).
     * @param {Array} edges - Lista de aristas.
     * @returns {string}
     */
    static formatEdgesDash(edges) {
        return edges.map(e => {
            const sorted = [e.from, e.to].sort();
            return sorted.join('–');
        }).join(', ');
    }
}
