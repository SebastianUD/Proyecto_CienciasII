/**
 * @fileoverview Vista de Búsqueda Hash Externa - Método de Truncamiento.
 * @module views/ExtHashTruncamientoView
 */
class ExtHashTruncamientoView extends HashBlockSearchView {
    constructor(containerEl) {
        super(containerEl);
        this._algorithmName = 'ext-hash-truncamiento';
    }

    _getHashMethod() { return 'truncamiento'; }

    show() {
        this.render('Búsqueda Hash Externa - Método de Truncamiento');
    }

    _onCreationSuccess(config) {
        this._setOperation('create');
        const d = (config.numBuckets - 1).toString().length;
        const h1 = `h(k) = elegirdigitos impares (pos 1,3,5...) hasta ${d} dígitos mod ${config.numBuckets}`;
        this._addLog(`Estructura creada: ${config.numBuckets} cubetas, ${config.blocksPerBucket} bloques/cubeta, ${config.keysPerBlock} claves/bloque, tipo: ${config.dataType}, búsqueda: ${config.searchMode}.`, 'info');
        this._addLog(`Función hash: ${h1}`, 'info');
    }
}
