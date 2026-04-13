/**
 * @class FloydView
 * @extends AlgorithmGraphView
 * @description Implementación del Algoritmo de Floyd para caminos más cortos entre todos los pares.
 * Utiliza GraphAlgorithmsModel para la lógica segmentada.
 *
 * @module views/FloydView
 */
class FloydView extends AlgorithmGraphView {

    /** @override */
    _title() { return 'Algoritmo de Floyd'; }

    // ─── Inputs adicionales ───────────────────────────────────────────────────

    /** @override */
    _extraInputHTML() {
        return `
        <div class="grafos-field-col" id="ag-fl-src-section" style="display:none; margin-top:10px;">
            <label for="ag-fl-source">Nodo Inicial (Visualizar Camino)</label>
            <select id="ag-fl-source" style="width:100%; margin-bottom:6px;">
                <option value="">-- Seleccione inicial --</option>
            </select>
            <label for="ag-fl-target">Nodo Final (Visualizar Camino)</label>
            <select id="ag-fl-target" style="width:100%;">
                <option value="">-- Seleccione final --</option>
            </select>
        </div>`;
    }

    /** @override */
    _cacheExtra() {
        this.el.srcSection = document.getElementById('ag-fl-src-section');
        this.el.srcNode    = document.getElementById('ag-fl-source');
        this.el.tgtNode    = document.getElementById('ag-fl-target');
    }

    /** @override */
    _onCreateExtra() {
        if (!this.el.srcSection) return;
        this.el.srcSection.style.display = '';
        this._syncExtraUI();
        
        this.el.srcNode.addEventListener('change', () => this._drawGraph());
        this.el.tgtNode.addEventListener('change', () => this._drawGraph());
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
     * Ejecuta Floyd y genera todas las tablas de iteración.
     * @override
     * @private
     */
    _onExecute() {
        const n = this.nodeCount;
        const src = parseInt(this.el.srcNode ? this.el.srcNode.value : 0);
        const tgt = parseInt(this.el.tgtNode ? this.el.tgtNode.value : 0);

        if (n === 0) { Validation.showError('Cree el grafo primero.'); return; }

        if (!this._isEnumerated) {
            Validation.showError('Por favor, enumere los nodos antes de calcular.');
            return;
        }

        const D = this._adjMatrix();
        
        const result = GraphAlgorithmsModel.executeFloyd(n, D, src, tgt);
        
        this._nodeHL = result.nodeHL;
        this._edgeHL = result.edgeHL;
        this._nodeExtraLabel = result.nodeExtraLabel;
        
        this._isExecuted = true;
        this._setOps(result.html);
        this._drawGraph();
        
        this._addLog(
            `Floyd completado. ${n + 1} matrices generadas, ${result.totalChanges} actualización(es) total.`,
            'success'
        );

        if (src && tgt) {
            if (result.isPathFound) {
                this._addLog(`Camino más corto (v${src} → v${tgt}) resaltado con costo ${result.finalDist}.`, 'info');
            } else {
                this._addLog(`No existe camino entre v${src} y v${tgt}.`, 'warning');
            }
        }
    }
}
