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

    // ─── Ejecución del Algoritmo ──────────────────────────────────────────────

    /**
     * Ejecuta Floyd y genera todas las tablas de iteración.
     * @override
     * @private
     */
    _onExecute() {
        const n = this.nodeCount;
        if (n === 0) { Validation.showError('Cree el grafo primero.'); return; }

        const D = this._adjMatrix();
        
        const result = GraphAlgorithmsModel.executeFloyd(n, D);
        
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
    }
}
