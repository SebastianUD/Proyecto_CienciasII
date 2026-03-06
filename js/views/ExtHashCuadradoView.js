/**
 * @fileoverview Vista de Búsqueda Hash Externa - Método del Cuadrado.
 * @module views/ExtHashCuadradoView
 */
class ExtHashCuadradoView extends HashBlockSearchView {
    constructor(containerEl) {
        super(containerEl);
        this._algorithmName = 'ext-hash-cuadrado';
    }

    _getHashMethod() { return 'cuadrado'; }

    show() {
        this.render('Búsqueda Hash Externa - Método del Cuadrado');
    }

    _onCreationSuccess(config) {
        this._setOperation('create');
        const h1 = `h(k) = digCent(k²) mod ${config.numBuckets}`;
        this._addLog(`Estructura creada: ${config.numBuckets} cubetas, ${config.blocksPerBucket} bloques/cubeta, ${config.keysPerBlock} claves/bloque, tipo: ${config.dataType}, búsqueda: ${config.searchMode}.`, 'info');
        this._addLog(`Función hash: ${h1}`, 'info');
    }
}
