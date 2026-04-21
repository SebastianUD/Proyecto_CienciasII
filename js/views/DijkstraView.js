/**
 * @class DijkstraView
 * @extends AlgorithmGraphView
 * @description Implementación del Algoritmo de Dijkstra para caminos más cortos desde un nodo fuente.
 * Utiliza GraphAlgorithmsModel para la lógica segmentada.
 *
 * @module views/DijkstraView
 */
class DijkstraView extends AlgorithmGraphView {

    /** @override */
    _title() { return 'Algoritmo de Dijkstra'; }

    // ─── Inputs adicionales ───────────────────────────────────────────────────

    /** @override */
    _extraInputHTML() {
        return `
        <div class="grafos-field-col" id="ag-dk-src-section" style="display:none; margin-top:10px;">
            <label for="ag-dk-source">Nodo Inicial</label>
            <select id="ag-dk-source" style="width:100%; margin-bottom:6px;">
                <option value="">-- Seleccione inicial --</option>
            </select>
            <label for="ag-dk-target">Nodo Final</label>
            <select id="ag-dk-target" style="width:100%;">
                <option value="">-- Seleccione final --</option>
            </select>
        </div>`;
    }

    /** @override */
    _cacheExtra() {
        this.el.srcSection = document.getElementById('ag-dk-src-section');
        this.el.srcNode    = document.getElementById('ag-dk-source');
        this.el.tgtNode    = document.getElementById('ag-dk-target');
    }

    _onCreateExtra() {
        if (!this.el.srcSection) return;
        this.el.srcSection.style.display = '';
        this._syncExtraUI();
        
        this.el.srcNode.addEventListener('change', () => this._drawGraph());
    }

    /** @override */
    _syncExtraUI() {
        if (!this.el.srcNode || !this.el.tgtNode) return;
        const oldSrc = this.el.srcNode.value;
        const oldTgt = this.el.tgtNode.value;
        this.el.srcNode.innerHTML = '<option value="">-- Seleccione inicial --</option>';
        this.el.tgtNode.innerHTML = '<option value="">-- Seleccione final --</option>';
        
        if (this.vertices && this.vertexIds) {
            this.vertices.forEach(v => {
                const val = this.vertexIds[v];
                const labelText = this._isEnumerated ? `${v} : ${val}` : v;
                this.el.srcNode.add(new Option(labelText, val));
                this.el.tgtNode.add(new Option(labelText, val));
            });
        }
        
        const currentVals = this.vertices ? this.vertices.map(v => String(this.vertexIds[v])) : [];
        if (currentVals.includes(oldSrc)) this.el.srcNode.value = oldSrc;
        if (currentVals.includes(oldTgt)) this.el.tgtNode.value = oldTgt;
    }

    /** @override */
    _onClearExtra() {
        if (this.el.srcSection) this.el.srcSection.style.display = 'none';
    }

    // ─── Ejecución del Algoritmo ──────────────────────────────────────────────

    /**
     * Ejecuta Dijkstra y genera listado de etiquetas.
     * @override
     * @private
     */
    _onExecute() {
        const n   = this.nodeCount;
        const src = parseInt(this.el.srcNode ? this.el.srcNode.value : 0);
        const tgt = parseInt(this.el.tgtNode ? this.el.tgtNode.value : 0);

        if (n === 0)  { Validation.showError('Cree el grafo primero.'); return; }
        if (!src)     { Validation.showError('Seleccione el nodo inicial.'); return; }
        if (!tgt)     { Validation.showError('Seleccione el nodo final.'); return; }
        if (this.edges.length === 0) {
            Validation.showWarning('El grafo no tiene aristas.');
            return;
        }

        const result = GraphAlgorithmsModel.executeDijkstra(n, this.edges, src, tgt);
        
        this._nodeExtraLabel = result.nodeExtraLabel;
        this._edgeHL = result.edgeHL;
        this._nodeHL = result.nodeHL;

        if (result.isPathFound) {
            this._addLog(`Camino más corto encontrado con distancia: ${result.finalDist}`, 'success');
        } else {
            this._addLog(`El nodo final no es alcanzable desde el inicial.`, 'warning');
        }

        this._isExecuted = true;
        this._setOps(result.html);
        this._drawGraph();
    }
}
