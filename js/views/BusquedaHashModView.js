/**
 * @fileoverview Vista de Búsqueda Hash - Método Módulo.
 * Extiende {@link HashView} para implementar la búsqueda hash
 * usando la función h(k) = (k mod n) + 1 con estrategias de resolución de colisiones.
 * @module views/BusquedaHashModView
 */

/**
 * Vista del algoritmo de Búsqueda Hash con Método Módulo.
 * @extends HashView
 */
class BusquedaHashModView extends HashView {
    /**
     * Crea una instancia de BusquedaHashModView.
     * @param {HTMLElement} containerEl - Elemento contenedor de la vista.
     */
    constructor(containerEl) {
        super(containerEl);
        /** @type {string} Identificador interno del algoritmo */
        this._algorithmName = 'busqueda-hash-mod';
    }

    /**
     * Muestra la vista de búsqueda hash módulo.
     */
    show() {
        this.render('Búsqueda Hash - Método Módulo');
    }

    /**
     * Gancho para personalizar el log de creación con la función hash específica.
     * @override
     * @protected
     */
    _onCreationSuccess(size, keyLength, dataType, strategyName) {
        let h1Text = `h(k) = (k mod ${size}) + 1`;
        let baseMsg = `Estructura hash creada: ${size} posiciones, clave de ${keyLength} carácter(es), tipo: ${dataType}, función: ${h1Text}, estrategia: ${strategyName}.`;

        if (this._collisionStrategy === 'doble-hash') {
            baseMsg += ` Lógica: H'(D) = ((D + 1) mod ${size}) + 1.`;
        } else if (this._collisionStrategy === 'prueba-cuadratica') {
            baseMsg += `\nLógica: H(pos, i) = (h(k) + i²) mod ${size} + 1.`;
        } else if (this._collisionStrategy === 'prueba-lineal') {
            baseMsg += `\nLógica: H(pos, i) = (h(k) + i) mod ${size} + 1.`;
        }

        this._addLog(baseMsg, 'info');
    }

    /**
     * Sobrescribe la inserción para usar la función hash módulo con estrategia.
     * @override
     * @private
     */
    _onInsert() {
        const el = this.elements;
        const rawValue = el.inputKey.value;
        const result = this.dataStructure.hashInsert(rawValue, this._collisionStrategy);

        if (!result.success) {
            Validation.showError(result.error, el.inputKey);
            return;
        }

        this._renderTable();

        // Mostrar pasos de colisión y fórmulas
        if (result.steps) {
            result.steps.forEach((step, i) => {
                if (step.action === 'collision') {
                    let collMsg = `Colisión en pos ${step.position + 1}: ${step.formula}`;
                    this._addLog(collMsg, 'warning');
                }
            });
        }

        // Mensaje final de inserción
        const finalStep = result.steps[result.steps.length - 1];
        let message = `Clave "${this._getDisplayKey(result.position)}" insertada en pos ${result.position + 1}`;

        if (result.collisions === 0) {
            message += ` usando ${result.formula}`;
        } else if (finalStep && finalStep.formula) {
            message += ` usando ${finalStep.formula}`;
        }

        if (result.collisions > 0) {
            message += ` (${result.collisions} colisión${result.collisions > 1 ? 'es' : ''})`;
        }
        message += '.';

        this._addLog(message, 'success');
        el.inputKey.value = '';
        el.inputKey.focus();
    }

    /**
     * Sobrescribe el método de búsqueda con la búsqueda hash animada.
     * @override
     * @private
     */
    _onSearch() {
        const el = this.elements;
        const key = el.inputKey.value.trim();

        if (key === '') {
            Validation.showError('Debe ingresar la clave que desea buscar.', el.inputKey);
            return;
        }

        if (this.isSearchAnimating) {
            Validation.showWarning('Espere a que la búsqueda actual termine.');
            return;
        }

        if (this.dataStructure.count === 0) {
            Validation.showWarning('La estructura está vacía. Inserte claves antes de buscar.');
            return;
        }

        const result = this.dataStructure.hashSearch(key, this._collisionStrategy);

        // Normalizar la clave para mostrar en los mensajes
        let displayKey = key;
        if (this.dataStructure.dataType === 'numerico' && /^\d+$/.test(key) && key.length < this.dataStructure.keyLength) {
            displayKey = key.padStart(this.dataStructure.keyLength, '0');
        }

        this._clearHighlights();
        this.isSearchAnimating = true;

        // Deshabilitar botones durante la animación
        el.btnSearch.disabled = true;
        el.btnInsert.disabled = true;
        el.btnDelete.disabled = true;

        const k = this.dataStructure.getNumericValue(displayKey);
        const n = this.dataStructure.size;
        const { hash: hashValue } = this.dataStructure._getHashValue(k);

        if (this.dataStructure.dataType !== 'numerico') {
            this._addLog(`Conversión ASCII: "${displayKey}" → k = ${k}`, 'info');
        }

        this._addLog(`Buscando clave "${displayKey}" usando h(${k}) = (${k} mod ${this.dataStructure.size}) + 1 = ${hashValue}...`, 'info');

        this._animateSearch(result, displayKey).then(() => {
            this.isSearchAnimating = false;
            el.btnSearch.disabled = false;
            el.btnInsert.disabled = false;
            el.btnDelete.disabled = false;
            el.inputKey.value = '';
            el.inputKey.focus();
        });
    }
}
