/**
 * @fileoverview Vista de Búsqueda Secuencial.
 * Extiende {@link AlgorithmView} para implementar la búsqueda secuencial
 * con animación paso a paso que resalta cada fila revisada.
 * @module views/BusquedaSecuencialView
 */

/**
 * Vista del algoritmo de Búsqueda Secuencial.
 * Recorre el arreglo de claves una por una, animando cada comparación.
 * @extends AlgorithmView
 */
class BusquedaSecuencialView extends AlgorithmView {
    /**
     * Crea una instancia de BusquedaSecuencialView.
     * @param {HTMLElement} containerEl - Elemento contenedor de la vista.
     */
    constructor(containerEl) {
        super(containerEl);
        /** @type {string} Identificador interno del algoritmo */
        this._algorithmName = 'busqueda-secuencial';
    }

    /**
     * Renderiza la vista de búsqueda secuencial.
     */
    show() {
        this.render('Búsqueda Secuencial');
    }

    /**
     * Sobrescribe el método de búsqueda con la búsqueda secuencial animada.
     * Valida la entrada, ejecuta la búsqueda y lanza la animación.
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

        const result = this.dataStructure.sequentialSearch(key);

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

        this._addLog(`Buscando clave "${displayKey}"...`, 'info');

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
     * Anima la búsqueda secuencial paso a paso.
     * Resalta cada fila con color amarillo (revisando), verde (encontrada) o rojo (no encontrada).
     * @private
     * @param {Object} result - Resultado de {@link DataStructure#sequentialSearch}.
     * @param {string} displayKey - Clave normalizada para mostrar en los logs.
     * @returns {Promise<void>} Promesa que se resuelve al finalizar la animación.
     */
    _animateSearch(result, displayKey) {
        return new Promise((resolve) => {
            const steps = result.steps;
            const tbody = this.elements.tableBody;
            let stepIndex = 0;

            /**
             * Ejecuta un paso de la animación secuencial.
             * @private
             */
            const animateStep = () => {
                if (stepIndex >= steps.length) {
                    // Búsqueda finalizada sin encontrar la clave
                    this._addLog(`✘ Clave "${displayKey}" no encontrada. Se revisaron ${steps.length} posición(es).`, 'error');
                    resolve();
                    return;
                }

                const step = steps[stepIndex];
                const row = tbody.querySelector(`tr[data-index="${step.index}"]`);

                if (row) {
                    row.classList.add('highlight-checking');
                    row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    this._addLog(`  Posición ${step.index + 1}: clave "${step.key}" ${step.match ? '→ ¡Coincidencia!' : '→ no coincide'}`, step.match ? 'success' : 'info');
                }

                stepIndex++;

                // Si se encontró la clave, terminar con resaltado verde
                if (step.match) {
                    setTimeout(() => {
                        if (row) {
                            row.classList.remove('highlight-checking');
                            row.classList.add('highlight-found');
                        }
                        this._addLog(`✔ Clave "${displayKey}" encontrada en la posición ${step.index + 1}.`, 'success');
                        resolve();
                    }, 400);
                    return;
                }

                // Continuar al siguiente paso con retardo adaptativo
                const delay = Math.max(100, Math.min(500, 3000 / steps.length));
                setTimeout(animateStep, delay);
            };

            animateStep();
        });
    }
}
