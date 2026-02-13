/**
 * @fileoverview Vista de Búsqueda Binaria.
 * Extiende {@link AlgorithmView} para implementar la inserción ordenada
 * y la animación de la búsqueda binaria paso a paso.
 * @module views/BusquedaBinariaView
 */

/**
 * Vista del algoritmo de Búsqueda Binaria.
 * Inserta claves de forma ordenada (ascendente) y busca mediante
 * el método de bisección, verificando la igualdad solo al final.
 * @extends AlgorithmView
 */
class BusquedaBinariaView extends AlgorithmView {
    /**
     * Crea una instancia de BusquedaBinariaView.
     * @param {HTMLElement} containerEl - Elemento contenedor de la vista.
     */
    constructor(containerEl) {
        super(containerEl);
        /** @type {string} Identificador interno del algoritmo */
        this._algorithmName = 'busqueda-binaria';
    }

    /**
     * Renderiza la vista de búsqueda binaria.
     */
    show() {
        this.render('Búsqueda Binaria');
    }

    /**
     * Sobrescribe la carga de archivos para ordenar las claves después de cargar.
     * El arreglo debe estar ordenado para que la búsqueda binaria funcione.
     * @override
     * @private
     * @async
     */
    async _onLoad() {
        await super._onLoad();

        // Si se cargó correctamente, ordenar las claves existentes
        if (this.dataStructure.created && this.dataStructure.count > 0) {
            // Extraer las claves no nulas, ordenarlas, y recolocarlas
            const nonNullKeys = this.dataStructure.keys.filter(k => k !== null);
            nonNullKeys.sort((a, b) => this.dataStructure._compareKeys(a, b));

            // Reconstruir el arreglo: claves ordenadas + nulls al final
            for (let i = 0; i < this.dataStructure.size; i++) {
                this.dataStructure.keys[i] = i < nonNullKeys.length ? nonNullKeys[i] : null;
            }

            this._renderTable();
            this._addLog('Las claves se han reordenado para búsqueda binaria.', 'info');
        }
    }

    /**
     * Sobrescribe la inserción para mantener el arreglo ordenado.
     * Utiliza {@link DataStructure#sortedInsert} en lugar de insert.
     * @override
     * @private
     */
    _onInsert() {
        const el = this.elements;
        const result = this.dataStructure.sortedInsert(el.inputKey.value);

        if (!result.success) {
            Validation.showError(result.error, el.inputKey);
            return;
        }

        this._renderTable();
        this._addLog(`Clave "${this.dataStructure.keys[result.position]}" insertada en la posición ${result.position + 1} (ordenada).`, 'success');
        el.inputKey.value = '';
        el.inputKey.focus();
    }

    /**
     * Sobrescribe el método de búsqueda con la búsqueda binaria animada.
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

        const result = this.dataStructure.binarySearch(key);

        // Normalizar clave para mostrar
        let displayKey = key;
        if (this.dataStructure.dataType === 'numerico' && /^\d+$/.test(key) && key.length < this.dataStructure.keyLength) {
            displayKey = key.padStart(this.dataStructure.keyLength, '0');
        }

        this._clearHighlights();
        this.isSearchAnimating = true;

        // Deshabilitar botones durante animación
        el.btnSearch.disabled = true;
        el.btnInsert.disabled = true;
        el.btnDelete.disabled = true;

        this._addLog(`Buscando clave "${displayKey}" (binaria)...`, 'info');

        this._animateSearch(result, displayKey).then(() => {
            this.isSearchAnimating = false;
            el.btnSearch.disabled = false;
            el.btnInsert.disabled = false;
            el.btnDelete.disabled = false;
            el.inputKey.value = '';
            el.inputKey.focus();
        });
    }

    /**
     * Anima la búsqueda binaria paso a paso, mostrando visualmente
     * el punto medio y la mitad descartada en cada iteración.
     * @private
     * @param {Object} result - Resultado de {@link DataStructure#binarySearch}.
     * @param {string} displayKey - Clave normalizada para mostrar en logs.
     * @returns {Promise<void>} Promesa que se resuelve al finalizar la animación.
     */
    _animateSearch(result, displayKey) {
        return new Promise((resolve) => {
            const steps = result.steps;
            const tbody = this.elements.tableBody;
            let stepIndex = 0;

            /**
             * Ejecuta un paso de la animación.
             * @private
             */
            const animateStep = () => {
                // Limpiar resaltados anteriores
                this._clearHighlights();

                if (stepIndex >= steps.length) {
                    // Sin pasos (estructura vacía o error)
                    this._addLog(`✘ Clave "${displayKey}" no encontrada.`, 'error');
                    resolve();
                    return;
                }

                const step = steps[stepIndex];

                // Resaltar el rango activo [low..high] y las filas descartadas
                for (let i = 0; i < this.dataStructure.count; i++) {
                    const row = tbody.querySelector(`tr[data-index="${i}"]`);
                    if (!row) continue;

                    if (i < step.low || i > step.high) {
                        row.classList.add('highlight-discarded');
                    }
                }

                // Resaltar el punto medio
                const midRow = tbody.querySelector(`tr[data-index="${step.mid}"]`);
                if (midRow) {
                    midRow.classList.add('highlight-mid');
                    midRow.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }

                // Log del paso actual
                if (step.action === 'encontrada') {
                    this._addLog(`  Rango [${step.low + 1}..${step.high + 1}] → Medio: pos ${step.mid + 1} (clave "${step.midKey}") → ¡Encontrada!`, 'success');
                } else if (step.action === 'no-encontrada') {
                    this._addLog(`  Rango [${step.low + 1}..${step.high + 1}] → Medio: pos ${step.mid + 1} (clave "${step.midKey}") → No coincide`, 'error');
                } else if (step.action === 'descarta-derecha') {
                    this._addLog(`  Rango [${step.low + 1}..${step.high + 1}] → Medio: pos ${step.mid + 1} (clave "${step.midKey}") → Descarta mitad derecha`, 'info');
                } else if (step.action === 'descarta-izquierda') {
                    this._addLog(`  Rango [${step.low + 1}..${step.high + 1}] → Medio: pos ${step.mid + 1} (clave "${step.midKey}") → Descarta mitad izquierda`, 'info');
                }

                stepIndex++;

                // Si fue el paso final
                if (step.action === 'encontrada') {
                    setTimeout(() => {
                        this._clearHighlights();
                        if (midRow) midRow.classList.add('highlight-found');
                        this._addLog(`✔ Clave "${displayKey}" encontrada en la posición ${step.mid + 1}. Pasos: ${steps.length}.`, 'success');
                        resolve();
                    }, 600);
                    return;
                }

                if (step.action === 'no-encontrada') {
                    setTimeout(() => {
                        this._clearHighlights();
                        if (midRow) midRow.classList.add('highlight-not-found');
                        this._addLog(`✘ Clave "${displayKey}" no encontrada. Pasos: ${steps.length}.`, 'error');
                        resolve();
                    }, 600);
                    return;
                }

                // Continuar al siguiente paso con retardo
                const delay = Math.max(400, Math.min(800, 5000 / steps.length));
                setTimeout(animateStep, delay);
            };

            animateStep();
        });
    }
}
