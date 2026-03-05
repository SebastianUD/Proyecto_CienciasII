/**
 * @fileoverview Vista de Búsqueda Secuencial por Bloques (Externa).
 * Extiende {@link BlockSearchView} para implementar la búsqueda secuencial
 * por bloques con animación paso a paso.
 * @module views/BusquedaSecuencialBloquesView
 */

class BusquedaSecuencialBloquesView extends BlockSearchView {
    constructor(containerEl) {
        super(containerEl);
        this._algorithmName = 'ext-secuencial-bloques';
    }

    /** Renderiza la vista. */
    show() {
        this.render('Búsqueda Secuencial por Bloques');
    }

    /**
     * Búsqueda secuencial por bloques con animación.
     * @override @private
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

        this._setOperation('search');
        const result = this.dataStructure.blockSequentialSearch(key, this.blockSize);
        const displayKey = this._displayKey(key);

        this._clearHighlights();
        this.isSearchAnimating = true;
        el.btnSearch.disabled = true;
        el.btnInsert.disabled = true;
        el.btnDelete.disabled = true;

        this._addLog(`Buscando clave "${displayKey}" (secuencial por bloques, tamaño bloque: ${this.blockSize})...`, 'info');

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
     * Eliminación con animación de búsqueda previa.
     * @override @private @async
     */
    async _onDelete() {
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
        if (this.dataStructure.count === 0) {
            Validation.showWarning('La estructura está vacía.');
            return;
        }

        const displayKey = this._displayKey(key);
        const searchResult = this.dataStructure.blockSequentialSearch(key, this.blockSize);

        this._clearHighlights();
        this.isSearchAnimating = true;
        el.btnSearch.disabled = true;
        el.btnInsert.disabled = true;
        el.btnDelete.disabled = true;

        this._setOperation('delete');
        this._addLog(`Buscando clave "${displayKey}" para eliminar...`, 'info');

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

        // Highlight row in red before removing
        const row = this._findRow(deleteResult.position);
        if (row) {
            this._clearHighlights();
            row.classList.add('highlight-deleting');
            this._addLog(`Clave "${displayKey}" encontrada en posición ${deleteResult.position + 1}. Eliminando...`, 'warning');
            await new Promise(r => setTimeout(r, 800));
            row.classList.add('fade-out');
            await new Promise(r => setTimeout(r, 500));
        }

        this._renderBlocks();
        this._clearHighlights();
        this.isSearchAnimating = false;
        el.btnSearch.disabled = false;
        el.btnInsert.disabled = false;
        el.btnDelete.disabled = false;
        this._addLog(`Clave "${displayKey}" borrada de la posición ${deleteResult.position + 1}. Se reorganizó el arreglo.`, 'success');
        el.inputKey.value = '';
        el.inputKey.focus();
    }

    /**
     * Anima la búsqueda secuencial por bloques.
     * Fase 1: Compara con último de cada bloque (amarillo skip, azul enter).
     * Fase 2: Búsqueda secuencial dentro del bloque (amarillo → verde/rojo).
     * @private
     * @param {Object} result - Resultado de blockSequentialSearch.
     * @param {string} displayKey
     * @returns {Promise<void>}
     */
    _animateSearch(result, displayKey) {
        return new Promise((resolve) => {
            const steps = result.steps;
            let stepIndex = 0;

            const animateStep = () => {
                if (stepIndex >= steps.length) {
                    // No more steps — not found
                    this._addLog(`✘ Clave "${displayKey}" no encontrada. Se revisaron ${steps.length} comparación(es).`, 'error');
                    resolve();
                    return;
                }

                const step = steps[stepIndex];

                if (step.type === 'block-compare') {
                    // Phase 1: block-level comparison
                    const blockEl = this._findBlock(step.blockIndex);
                    const row = this._findRow(step.index);
                    this._scrollToBlock(step.blockIndex, step.index);

                    if (step.action === 'skip-block') {
                        if (blockEl) blockEl.classList.add('block-skipped');
                        if (row) row.classList.add('highlight-checking');
                        this._addLog(`  Bloque ${step.blockIndex + 1}: último="${step.lastKey}" → clave es mayor → Saltar bloque`, 'info');

                        stepIndex++;
                        const delay = Math.max(300, Math.min(700, 4000 / steps.length));
                        setTimeout(animateStep, delay);
                    } else if (step.action === 'enter-block') {
                        if (blockEl) blockEl.classList.add('block-active');
                        if (row) row.classList.add('highlight-mid');
                        this._addLog(`  Bloque ${step.blockIndex + 1}: último="${step.lastKey}" → clave podría estar aquí → Entrar al bloque`, 'success');

                        stepIndex++;
                        const delay = Math.max(400, Math.min(800, 4000 / steps.length));
                        setTimeout(animateStep, delay);
                    }
                } else if (step.type === 'sequential') {
                    // Phase 2: sequential within block
                    const row = this._findRow(step.index);
                    this._scrollRowIntoView(step.index);
                    if (row) {
                        row.classList.add('highlight-checking');
                    }

                    if (step.action === 'found') {
                        this._addLog(`  Posición ${step.index + 1}: clave "${step.key}" → ¡Coincidencia!`, 'success');
                        stepIndex++;
                        setTimeout(() => {
                            if (row) {
                                row.classList.remove('highlight-checking');
                                row.classList.add('highlight-found');
                            }
                            this._addLog(`✔ Clave "${displayKey}" encontrada en posición ${step.index + 1} (Bloque ${step.blockIndex + 1}). Pasos: ${steps.length}.`, 'success');
                            resolve();
                        }, 400);
                        return;
                    } else {
                        this._addLog(`  Posición ${step.index + 1}: clave "${step.key}" → no coincide`, 'info');
                        stepIndex++;
                        const delay = Math.max(200, Math.min(500, 3000 / steps.length));
                        setTimeout(animateStep, delay);
                    }
                }
            };

            animateStep();
        });
    }
}
