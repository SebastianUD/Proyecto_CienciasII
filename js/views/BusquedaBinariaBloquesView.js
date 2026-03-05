/**
 * @fileoverview Vista de Búsqueda Binaria por Bloques (Externa).
 * Extiende {@link BlockSearchView} para implementar la búsqueda binaria
 * por bloques con animación paso a paso.
 * @module views/BusquedaBinariaBloquesView
 */

class BusquedaBinariaBloquesView extends BlockSearchView {
    constructor(containerEl) {
        super(containerEl);
        this._algorithmName = 'ext-binaria-bloques';
    }

    /** Renderiza la vista. */
    show() {
        this.render('Búsqueda Binaria por Bloques');
    }

    /**
     * Búsqueda binaria por bloques con animación.
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
        const result = this.dataStructure.blockBinarySearch(key, this.blockSize);
        const displayKey = this._displayKey(key);

        this._clearHighlights();
        this.isSearchAnimating = true;
        el.btnSearch.disabled = true;
        el.btnInsert.disabled = true;
        el.btnDelete.disabled = true;

        this._addLog(`Buscando clave "${displayKey}" (binaria por bloques, tamaño bloque: ${this.blockSize})...`, 'info');

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
     * Eliminación con animación de búsqueda binaria previa.
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
        const searchResult = this.dataStructure.blockBinarySearch(key, this.blockSize);

        this._clearHighlights();
        this.isSearchAnimating = true;
        el.btnSearch.disabled = true;
        el.btnInsert.disabled = true;
        el.btnDelete.disabled = true;

        this._setOperation('delete');
        this._addLog(`Buscando clave "${displayKey}" (binaria) para eliminar...`, 'info');

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
     * Anima la búsqueda binaria por bloques.
     * Fase 1: Búsqueda binaria sobre últimos registros de cada bloque.
     * Fase 2: Búsqueda binaria dentro del bloque encontrado.
     * @private
     * @param {Object} result - Resultado de blockBinarySearch.
     * @param {string} displayKey
     * @returns {Promise<void>}
     */
    _animateSearch(result, displayKey) {
        return new Promise((resolve) => {
            const steps = result.steps;
            let stepIndex = 0;
            const numBlocks = Math.ceil(this.dataStructure.size / this.blockSize);

            const animateStep = () => {
                if (stepIndex >= steps.length) {
                    this._addLog(`✘ Clave "${displayKey}" no encontrada. Pasos: ${steps.length}.`, 'error');
                    resolve();
                    return;
                }

                const step = steps[stepIndex];

                if (step.type === 'block-binary') {
                    // ─── Phase 1: Binary on blocks ───
                    this._clearHighlights();

                    // Dim discarded blocks
                    for (let b = 0; b < numBlocks; b++) {
                        if (b < step.lowBlock || b > step.highBlock) {
                            const blockEl = this._findBlock(b);
                            if (blockEl) blockEl.classList.add('block-skipped');
                        }
                    }

                    // Highlight the mid block and its last row
                    const midBlockEl = this._findBlock(step.midBlock);
                    const lastRow = this._findRow(step.index);
                    if (midBlockEl) midBlockEl.classList.add('block-active');
                    if (lastRow) lastRow.classList.add('highlight-mid');
                    this._scrollToBlock(step.midBlock, step.index);

                    if (step.action === 'found-at-boundary') {
                        this._addLog(`  Bloques [${step.lowBlock + 1}..${step.highBlock + 1}] → Medio: Bloque ${step.midBlock + 1} (último="${step.lastKey}") → ¡Coincidencia!`, 'success');
                        stepIndex++;
                        setTimeout(() => {
                            this._clearHighlights();
                            if (lastRow) lastRow.classList.add('highlight-found');
                            if (midBlockEl) midBlockEl.classList.add('block-active');
                            this._addLog(`✔ Clave "${displayKey}" encontrada en posición ${step.index + 1} (Bloque ${step.midBlock + 1}). Pasos: ${steps.length}.`, 'success');
                            resolve();
                        }, 600);
                        return;
                    } else if (step.action === 'discard-right') {
                        this._addLog(`  Bloques [${step.lowBlock + 1}..${step.highBlock + 1}] → Medio: Bloque ${step.midBlock + 1} (último="${step.lastKey}") → Clave menor → Descarta derecha`, 'info');
                    } else if (step.action === 'discard-left') {
                        this._addLog(`  Bloques [${step.lowBlock + 1}..${step.highBlock + 1}] → Medio: Bloque ${step.midBlock + 1} (último="${step.lastKey}") → Clave mayor → Descarta izquierda`, 'info');
                    }

                    stepIndex++;
                    const delay = Math.max(400, Math.min(800, 5000 / steps.length));
                    setTimeout(animateStep, delay);

                } else if (step.type === 'inner-binary') {
                    // ─── Phase 2: Binary within block ───
                    this._clearHighlights();

                    // Keep the target block active
                    const blockEl = this._findBlock(step.blockIndex);
                    if (blockEl) blockEl.classList.add('block-active');

                    // Dim out-of-range rows within the block
                    const bStart = step.blockIndex * this.blockSize;
                    const bEnd = Math.min(bStart + this.blockSize, this.dataStructure.count) - 1;
                    for (let i = bStart; i <= bEnd; i++) {
                        if (i < step.low || i > step.high) {
                            const r = this._findRow(i);
                            if (r) r.classList.add('highlight-discarded');
                        }
                    }

                    // Highlight mid row
                    const midRow = this._findRow(step.mid);
                    if (midRow) midRow.classList.add('highlight-mid');
                    this._scrollToBlock(step.blockIndex, step.mid);

                    if (step.action === 'found') {
                        this._addLog(`  Bloque ${step.blockIndex + 1} [${step.low + 1}..${step.high + 1}] → Medio: pos ${step.mid + 1} (clave "${step.midKey}") → ¡Encontrada!`, 'success');
                        stepIndex++;
                        setTimeout(() => {
                            this._clearHighlights();
                            if (midRow) midRow.classList.add('highlight-found');
                            if (blockEl) blockEl.classList.add('block-active');
                            this._addLog(`✔ Clave "${displayKey}" encontrada en posición ${step.mid + 1} (Bloque ${step.blockIndex + 1}). Pasos: ${steps.length}.`, 'success');
                            resolve();
                        }, 600);
                        return;
                    } else if (step.action === 'discard-right') {
                        this._addLog(`  Bloque ${step.blockIndex + 1} [${step.low + 1}..${step.high + 1}] → Medio: pos ${step.mid + 1} (clave "${step.midKey}") → Descarta derecha`, 'info');
                    } else if (step.action === 'discard-left') {
                        this._addLog(`  Bloque ${step.blockIndex + 1} [${step.low + 1}..${step.high + 1}] → Medio: pos ${step.mid + 1} (clave "${step.midKey}") → Descarta izquierda`, 'info');
                    }

                    stepIndex++;
                    const delay = Math.max(300, Math.min(600, 4000 / steps.length));
                    setTimeout(animateStep, delay);
                }
            };

            animateStep();
        });
    }
}
