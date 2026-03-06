/**
 * @fileoverview Vista de Búsqueda Hash Externa - Conversión de Base.
 * Incluye input adicional para la base de conversión.
 * @module views/ExtHashConversionBaseView
 */
class ExtHashConversionBaseView extends HashBlockSearchView {
    constructor(containerEl) {
        super(containerEl);
        this._algorithmName = 'ext-conversion-base';
    }

    _getHashMethod() { return 'conversion-base'; }

    show() {
        this.render('Búsqueda Hash Externa - Conversión de Base');
    }

    /** Agrega el input de base al panel de configuración. */
    _getExtraConfigHTML() {
        return `
            <div class="config-group">
                <label for="cfg-hash-base">Base Conversión</label>
                <input type="number" id="cfg-hash-base" min="2" placeholder="Ej: 9">
            </div>
        `;
    }

    _cacheExtraElements() {
        this.elements.hashBase = document.getElementById('cfg-hash-base');
    }

    _validateExtraConfig() {
        const base = parseInt(this.elements.hashBase.value);
        if (!base || base < 2) {
            return { valid: false, error: 'Debe ingresar una base de conversión válida (mínimo 2).' };
        }
        return { valid: true };
    }

    _getExtraConfigValues() {
        return { hashBase: parseInt(this.elements.hashBase.value) };
    }

    _disableExtraConfig() {
        if (this.elements.hashBase) this.elements.hashBase.disabled = true;
    }

    _enableExtraConfig() {
        if (this.elements.hashBase) this.elements.hashBase.disabled = false;
    }

    _clearExtraConfig() {
        if (this.elements.hashBase) this.elements.hashBase.value = '';
    }

    _setExtraConfigFromData(data) {
        if (this.elements.hashBase && data.hashBase) {
            this.elements.hashBase.value = data.hashBase;
        }
    }

    _onCreationSuccess(config) {
        this._setOperation('create');
        const h1 = `h(k) = digmensig(Σ dᵢ × ${config.hashBase}^i) mod ${config.numBuckets}`;
        this._addLog(`Estructura creada: ${config.numBuckets} cubetas, ${config.blocksPerBucket} bloques/cubeta, ${config.keysPerBlock} claves/bloque, tipo: ${config.dataType}, búsqueda: ${config.searchMode}.`, 'info');
        this._addLog(`Función hash (Conversión Base ${config.hashBase}): ${h1}`, 'info');
    }
}
