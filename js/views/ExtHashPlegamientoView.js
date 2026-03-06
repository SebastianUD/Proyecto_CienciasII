/**
 * @fileoverview Vista de Búsqueda Hash Externa - Método de Plegamiento.
 * @module views/ExtHashPlegamientoView
 */
class ExtHashPlegamientoView extends HashBlockSearchView {
    constructor(containerEl) {
        super(containerEl);
        this._algorithmName = 'ext-hash-plegamiento';
    }

    _getHashMethod() { return 'plegamiento'; }

    show() {
        this.render('Búsqueda Hash Externa - Método de Plegamiento');
    }

    _onCreationSuccess(config) {
        this._setOperation('create');
        const d = (config.numBuckets - 1).toString().length;
        const h1 = `h(k) = digmensig(bloques de ${d} dígitos) mod ${config.numBuckets}`;
        this._addLog(`Estructura creada: ${config.numBuckets} cubetas, ${config.blocksPerBucket} bloques/cubeta, ${config.keysPerBlock} claves/bloque, tipo: ${config.dataType}, búsqueda: ${config.searchMode}.`, 'info');
        this._addLog(`Función hash: ${h1}`, 'info');
    }
}
