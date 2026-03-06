/**
 * @fileoverview Vista de Búsqueda Hash Externa - Método Módulo.
 * @module views/ExtHashModView
 */
class ExtHashModView extends HashBlockSearchView {
    constructor(containerEl) {
        super(containerEl);
        this._algorithmName = 'ext-hash-mod';
    }

    _getHashMethod() { return 'modulo'; }

    show() {
        this.render('Búsqueda Hash Externa - Método Módulo');
    }

    _onCreationSuccess(config) {
        this._setOperation('create');
        const h1 = `h(k) = k mod ${config.numBuckets}`;
        this._addLog(`Estructura creada: ${config.numBuckets} cubetas, ${config.blocksPerBucket} bloques/cubeta, ${config.keysPerBlock} claves/bloque, tipo: ${config.dataType}, búsqueda: ${config.searchMode}.`, 'info');
        this._addLog(`Función hash: ${h1}`, 'info');
    }
}
