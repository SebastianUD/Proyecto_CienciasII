/**
 * @fileoverview Vista de Búsqueda Secuencial.
 * Extiende {@link AlgorithmView} para implementar la búsqueda secuencial
 * con animación paso a paso que resalta cada fila revisada.
 * Incluye opción para insertar claves de forma ordenada.
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
        /** @type {boolean} Si las claves deben insertarse de forma ordenada */
        this._orderedKeys = false;
    }

    /**
     * Renderiza la vista de búsqueda secuencial.
     * Añade el toggle de "Claves Ordenadas" debajo del toggle de "Claves Repetidas".
     */
    show() {
        this.render('Búsqueda Secuencial');

        // Insertar el toggle de "Claves Ordenadas" después del toggle de "Claves Repetidas"
        const duplicatesGroup = this.elements.toggleDuplicates.closest('.config-group');
        if (duplicatesGroup) {
            const orderedGroup = document.createElement('div');
            orderedGroup.classList.add('config-group');
            orderedGroup.innerHTML = `
                <label>Claves Ordenadas</label>
                <div class="toggle-container">
                    <span class="toggle-label" id="toggle-ordered-yes">Sí</span>
                    <div class="toggle-switch off" id="toggle-ordered" title="Insertar claves de forma ordenada">
                        <div class="toggle-knob"></div>
                    </div>
                    <span class="toggle-label active" id="toggle-ordered-no">No</span>
                </div>
            `;
            duplicatesGroup.parentNode.insertBefore(orderedGroup, duplicatesGroup.nextSibling);

            // Cachear nuevos elementos
            this.elements.toggleOrdered = document.getElementById('toggle-ordered');
            this.elements.toggleOrderedYes = document.getElementById('toggle-ordered-yes');
            this.elements.toggleOrderedNo = document.getElementById('toggle-ordered-no');

            // Bind del evento toggle
            this.elements.toggleOrdered.addEventListener('click', () => {
                this._orderedKeys = !this._orderedKeys;
                this.elements.toggleOrdered.classList.toggle('off', !this._orderedKeys);
                this.elements.toggleOrderedYes.classList.toggle('active', this._orderedKeys);
                this.elements.toggleOrderedNo.classList.toggle('active', !this._orderedKeys);
            });
        }
    }

    /**
     * Sobrescribe la creación para deshabilitar el toggle de claves ordenadas.
     * @override
     * @private
     */
    _onCreate() {
        super._onCreate();

        // Deshabilitar el toggle de claves ordenadas si la estructura se creó
        if (this.dataStructure.created && this.elements.toggleOrdered) {
            this.elements.toggleOrdered.style.pointerEvents = 'none';
            this.elements.toggleOrdered.style.opacity = '0.5';
        }
    }

    /**
     * Sobrescribe la inserción para usar sortedInsert si está habilitado.
     * @override
     * @private
     */
    _onInsert() {
        if (this._orderedKeys) {
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
        } else {
            super._onInsert();
        }
    }

    /**
     * Sobrescribe la limpieza para resetear el toggle de claves ordenadas.
     * @override
     * @private
     * @async
     */
    async _onClear() {
        await super._onClear();

        this._orderedKeys = false;
        if (this.elements.toggleOrdered) {
            this.elements.toggleOrdered.classList.add('off');
            this.elements.toggleOrdered.style.pointerEvents = '';
            this.elements.toggleOrdered.style.opacity = '';
        }
        if (this.elements.toggleOrderedYes) this.elements.toggleOrderedYes.classList.remove('active');
        if (this.elements.toggleOrderedNo) this.elements.toggleOrderedNo.classList.add('active');
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

        const result = this._orderedKeys
            ? this.dataStructure.orderedSequentialSearch(key)
            : this.dataStructure.sequentialSearch(key);

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

        this._addLog(`Buscando clave "${displayKey}"${this._orderedKeys ? ' (ordenada)' : ''}...`, 'info');

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
     * Sobrescribe la eliminación para usar búsqueda optimizada si las claves están ordenadas.
     * @override
     * @private
     * @async
     */
    async _onDelete() {
        if (!this._orderedKeys) {
            return super._onDelete();
        }

        const el = this.elements;
        const key = el.inputKey.value.trim();

        if (key === '') {
            Validation.showError('Debe ingresar la clave que desea borrar.', el.inputKey);
            return;
        }

        if (this.isSearchAnimating) {
            Validation.showWarning('Espere a que la animación actual termine.');
            return;
        }

        let displayKey = key;
        if (this.dataStructure.dataType === 'numerico' && /^\d+$/.test(key) && key.length < this.dataStructure.keyLength) {
            displayKey = key.padStart(this.dataStructure.keyLength, '0');
        }

        const searchResult = this.dataStructure.orderedSequentialSearch(key);

        this._clearHighlights();
        this.isSearchAnimating = true;
        el.btnSearch.disabled = true;
        el.btnInsert.disabled = true;
        el.btnDelete.disabled = true;

        this._addLog(`Buscando clave "${displayKey}" (ordenada) para eliminar...`, 'info');

        await this._animateSearch(searchResult, displayKey);

        const deleteResult = this.dataStructure.delete(key);

        if (!deleteResult.success) {
            this.isSearchAnimating = false;
            el.btnSearch.disabled = false;
            el.btnInsert.disabled = false;
            el.btnDelete.disabled = false;
            this._addLog(`✘ No se pudo eliminar: ${deleteResult.error}`, 'error');
            el.inputKey.value = '';
            el.inputKey.focus();
            return;
        }

        const tbody = this.elements.tableBody;
        const row = tbody.querySelector(`tr[data-index="${deleteResult.position}"]`);
        if (row) {
            this._clearHighlights();
            row.classList.add('highlight-deleting');
            this._addLog(`Clave "${displayKey}" encontrada en posición ${deleteResult.position + 1}. Eliminando...`, 'warning');
            await new Promise(r => setTimeout(r, 800));
            row.classList.add('fade-out');
            await new Promise(r => setTimeout(r, 500));
        }

        this._renderTable();
        this._clearHighlights();
        this.isSearchAnimating = false;
        el.btnSearch.disabled = false;
        el.btnInsert.disabled = false;
        el.btnDelete.disabled = false;
        this._addLog(`Clave "${displayKey}" borrada de la posición ${deleteResult.position + 1}. Se realizó corrimiento del arreglo.`, 'success');
        el.inputKey.value = '';
        el.inputKey.focus();
    }

    /**
     * Anima la búsqueda secuencial paso a paso.
     * Resalta cada fila con color amarillo (revisando), verde (encontrada) o rojo (no encontrada).
     * Si las claves están ordenadas y se encuentra una mayor, se detiene y muestra el motivo.
     * @private
     * @param {Object} result - Resultado de búsqueda secuencial.
     * @param {string} displayKey - Clave normalizada para mostrar en los logs.
     * @returns {Promise<void>} Promesa que se resuelve al finalizar la animación.
     */
    _animateSearch(result, displayKey) {
        return new Promise((resolve) => {
            const steps = result.steps;
            const tbody = this.elements.tableBody;
            let stepIndex = 0;

            const animateStep = () => {
                if (stepIndex >= steps.length) {
                    if (result.stoppedEarly) {
                        this._addLog(`✘ Clave "${displayKey}" no encontrada. Búsqueda detenida en posición ${steps[steps.length - 1].index + 1} (clave "${steps[steps.length - 1].key}" es mayor). Se revisaron ${steps.length} posición(es).`, 'error');
                    } else {
                        this._addLog(`✘ Clave "${displayKey}" no encontrada. Se revisaron ${steps.length} posición(es).`, 'error');
                    }
                    resolve();
                    return;
                }

                const step = steps[stepIndex];
                const row = tbody.querySelector(`tr[data-index="${step.index}"]`);

                if (row) {
                    row.classList.add('highlight-checking');
                    const scrollContainer = document.getElementById('table-scroll');
                    if (scrollContainer) {
                        const rowTop = row.offsetTop;
                        const rowHeight = row.offsetHeight;
                        const containerHeight = scrollContainer.clientHeight;
                        scrollContainer.scrollTop = rowTop - (containerHeight / 2) + (rowHeight / 2);
                    }

                    if (step.match) {
                        this._addLog(`  Posición ${step.index + 1}: clave "${step.key}" → ¡Coincidencia!`, 'success');
                    } else if (step.greater) {
                        this._addLog(`  Posición ${step.index + 1}: clave "${step.key}" → es mayor que "${displayKey}" → Búsqueda detenida`, 'warning');
                    } else {
                        this._addLog(`  Posición ${step.index + 1}: clave "${step.key}" → no coincide`, 'info');
                    }
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

                // Si la clave es mayor (búsqueda ordenada), marcar en rojo y terminar
                if (step.greater) {
                    setTimeout(() => {
                        if (row) {
                            row.classList.remove('highlight-checking');
                            row.classList.add('highlight-not-found');
                        }
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
