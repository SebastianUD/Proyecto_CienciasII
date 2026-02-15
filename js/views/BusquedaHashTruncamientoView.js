/**
 * @fileoverview Vista de Búsqueda Hash - Método de Truncamiento.
 * Extiende {@link HashView} para implementar la búsqueda hash
 * usando la función H(K) = elegirdigitos(d1, d2, ..., dn) + 1.
 * @module views/BusquedaHashTruncamientoView
 */

/**
 * Vista del algoritmo de Búsqueda Hash con Método de Truncamiento.
 * @extends HashView
 */
class BusquedaHashTruncamientoView extends HashView {
    /**
     * Crea una instancia de BusquedaHashTruncamientoView.
     * @param {HTMLElement} containerEl - Elemento contenedor.
     */
    constructor(containerEl) {
        super(containerEl);
        this._algorithmName = 'hash-truncamiento';
    }

    /**
     * Muestra la vista de búsqueda hash por truncamiento.
     */
    show() {
        this.render('Búsqueda Hash - Método de Truncamiento');
    }

    /**
     * Filtra las estrategias de colisión para excluir Doble Función Hash.
     * @override
     * @protected
     * @returns {string}
     */
    _getCollisionStrategiesOptions() {
        return `
            <option value="">-- Seleccione --</option>
            <option value="prueba-lineal">P. Lineal</option>
            <option value="prueba-cuadratica">P. Cuadrática</option>
            <option value="doble-hash">D. F. Hash</option>
        `;
    }

    /**
     * Sobrescribe la creación para validar parámetros y el método hash.
     * @override
     * @private
     */
    _onCreate() {
        const el = this.elements;

        if (this.dataStructure.created) {
            Validation.showWarning('Ya existe una estructura activa. Debe limpiarla antes de crear una nueva.');
            return;
        }

        const validation = Validation.validateCreateParams(
            el.range.value,
            el.keyLength.value,
            el.dataType.value
        );

        if (!validation.valid) {
            Validation.showError(validation.error);
            return;
        }

        const collision = el.collisionStrategy.value;
        if (!collision || collision === '') {
            Validation.showError('Debe seleccionar un método de resolución de colisiones.');
            return;
        }

        const range = parseInt(el.range.value);
        const keyLength = parseInt(el.keyLength.value);
        const dataType = el.dataType.value;

        // Crear con método hash 'truncamiento'
        this.dataStructure.create(range, keyLength, dataType, false, collision, 'truncamiento');

        this._collisionStrategy = collision;

        const strategyName = CollisionStrategyFactory.create(collision, this.dataStructure).getName();
        this._onCreationSuccess(range, keyLength, dataType, strategyName);
        this._renderTable();

        // Habilitar controles
        el.inputKey.disabled = false;
        el.btnInsert.disabled = false;
        el.btnDelete.disabled = false;
        el.btnSearch.disabled = false;
        el.btnSave.disabled = false;
        el.btnPrint.disabled = false;

        // Deshabilitar configuración
        el.dataType.disabled = true;
        el.keyLength.disabled = true;
        el.range.disabled = true;
        el.collisionStrategy.disabled = true;
        el.btnCreate.disabled = true;
        el.btnLoad.disabled = true;

        el.tableContainer.style.display = '';
        el.logContainer.style.display = '';
    }

    /**
     * Log de creación específico para Truncamiento.
     * @override
     * @protected
     */
    _onCreationSuccess(size, keyLength, dataType, strategyName) {
        const d = (size - 1).toString().length;
        const h1Text = `h(k) = elegirdigitos impares (pos 1,3,5...) hasta ${d} dígitos + 1`;
        let baseMsg = `Estructura hash creada: ${size} posiciones, clave de ${keyLength} carácter(es), tipo: ${dataType}, función: ${h1Text}, estrategia: ${strategyName}.`;

        if (this._collisionStrategy === 'prueba-cuadratica') {
            baseMsg += `\nLógica: H(D) = (h(k) + i²) mod ${size} + 1.`;
        } else if (this._collisionStrategy === 'prueba-lineal') {
            baseMsg += `\nLógica: H(D) = (h(k) + i) mod ${size} + 1.`;
        }

        this._addLog(baseMsg, 'info');
    }

    /**
     * Sobrescribe la inserción para usar la función hash truncamiento con estrategia.
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
        const { hash: hashValue, pickedDigits } = this.dataStructure._getHashValue(k);

        if (this.dataStructure.dataType !== 'numerico') {
            this._addLog(`Conversión ASCII: "${displayKey}" → k = ${k}`, 'info');
        }

        this._addLog(`Buscando clave "${displayKey}" usando h(${k}) = elegirdigitos impares(${pickedDigits}) + 1 = ${hashValue}...`, 'info');

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
