/**
 * Vista para la visualización de la expansión y reducción dinámica parcial.
 * @extends HashBlockSearchView
 */
class ExtDinamicaParcialesView extends HashBlockSearchView {
    /**
     * Crea una instancia de ExtDinamicaParcialesView.
     * @param {HTMLElement} containerEl - Contenedor principal de la vista.
     */
    constructor(containerEl) {
        super(containerEl);
        this._algorithmName = 'ext-dinamica-parciales';
        this.dinamicModel = new DinamicaParcialesModel();
    }

    _getHashMethod() { return 'modulo'; }

    /**
     * Muestra la vista de expansión dinámica parcial.
     * @override
     */
    show() {
        this.render('Expansión y Reducción Dinámica Parcial');
    }

    /**
     * Renderiza la estructura básica y personaliza los paneles de configuración.
     * @override
     * @param {string} title - Título de la vista.
     */
    render(title) {
        super.render(title);

        // super.render ya creó la estructura básica.
        // No añadimos 'two-columns' porque oculta el directorio de cubetas (izquierda)
        if (this.elements.hashBlockArea) {
            this.elements.hashBlockArea.classList.add('layout-dinamica-totales');
        }

        // 1. Ocultar rango de cubetas (se auto-gestiona)
        const configPanel = document.querySelector('.config-panel');
        if (configPanel) {
            const rangeGroup = Array.from(configPanel.querySelectorAll('.config-group')).find(g => g.querySelector('#cfg-range'));
            if (rangeGroup) rangeGroup.style.display = 'none';
        }

        // 2. Personalizar etiquetas
        const labelBlocks = document.querySelector('label[for="cfg-blocks-per-bucket"]');
        if (labelBlocks) labelBlocks.innerText = 'Número de Cubetas';

        const labelKeys = document.querySelector('label[for="cfg-keys-per-block"]');
        if (labelKeys) labelKeys.innerText = 'Claves por Cubeta';

        // 3. Valores por defecto (editables por el usuario)
        if (this.elements.blocksPerBucket) {
            this.elements.blocksPerBucket.value = 2;
            this.elements.blocksPerBucket.min = 1;
        }
        if (this.elements.keysPerBlock) {
            this.elements.keysPerBlock.value = 2;
            this.elements.keysPerBlock.min = 1;
        }

        // 4. Reemplazar "Tipo de Búsqueda" por inputs de D.O.
        const searchTypeGroup = Array.from(document.querySelectorAll('.config-group')).find(g => g.querySelector('.toggle-container'));
        if (searchTypeGroup) {
            searchTypeGroup.innerHTML = `
                <div style="display: flex; gap: 10px;">
                    <div style="flex: 1;">
                        <label for="cfg-do">D.O. Expansión (%)</label>
                        <input type="number" id="cfg-do" min="1" max="100" placeholder="Ej: 70" value="70">
                    </div>
                    <div style="flex: 1;">
                        <label for="cfg-do-red">D.O. Reducción (%)</label>
                        <input type="number" id="cfg-do-red" min="1" max="100" placeholder="Ej: 30" value="30">
                    </div>
                </div>
            `;
        }

        // 5. Configurar Columna Izquierda para Densidad
        const leftCol = document.querySelector('.bucket-directory-wrapper');
        if (leftCol) {
            // Cambiar título de la sección
            const titleEl = leftCol.querySelector('.section-title');
            if (titleEl) titleEl.innerText = 'Densidad de Ocupación';

            // Reemplazar contenido (tabla del directorio) por el contenedor de la tarjeta
            const scrollEl = leftCol.querySelector('.bucket-directory-scroll');
            if (scrollEl) {
                scrollEl.innerHTML = '<div id="do-container" style="padding: 10px;"></div>';
            }
        }

        this._cacheExtraElements();
    }

    /**
     * Cachea referencias a elementos del DOM específicos de esta vista.
     * @private
     */
    _cacheExtraElements() {
        this.elements.inputDO = document.getElementById('cfg-do');
        this.elements.inputDORed = document.getElementById('cfg-do-red');
        this.elements.navWrapper = this._createNavigationControls();
    }

    /**
     * Crea los controles de navegación para el historial.
     * @private
     * @returns {HTMLElement|null}
     */
    _createNavigationControls() {
        // Los botones se insertarán directamente en el contenedor de la matriz en _renderHorizontalMatrix
        return null;
    }

    /**
     * Maneja el evento de retroceder en el historial.
     * @private
     */
    _onGoBack() {
        this.dinamicModel.goBack();
        this._renderAll();
        this._updateNavStatus();
    }

    /**
     * Maneja el evento de avanzar en el historial.
     * @private
     */
    _onGoForward() {
        this.dinamicModel.goForward();
        this._renderAll();
        this._updateNavStatus();
    }

    /**
     * Actualiza el estado de habilitación de los botones de historial.
     * @private
     */
    _updateNavStatus() {
        const back = document.getElementById('btn-hist-back');
        const forward = document.getElementById('btn-hist-forward');

        if (back) back.disabled = !this.dinamicModel.canGoBack();
        if (forward) forward.disabled = !this.dinamicModel.canGoForward();
    }

    /**
     * Maneja la creación de la estructura inicial.
     * @private
     * @override
     */
    _onCreate() {
        if (this.dinamicModel.created) {
            Validation.showWarning('Ya existe una estructura activa.');
            return;
        }

        const el = this.elements;
        const numBuckets = parseInt(el.blocksPerBucket?.value) || 2;
        const keysPerBucket = parseInt(el.keysPerBlock?.value) || 2;

        const validation = Validation.validateCreateParams(
            numBuckets.toString(), el.keyLength.value, el.dataType.value
        );

        if (!validation.valid) {
            Validation.showError(validation.error);
            return;
        }

        if (numBuckets < 1 || keysPerBucket < 1) {
            Validation.showError('El número de cubetas y claves por cubeta deben ser al menos 1.');
            return;
        }

        const config = {
            numBuckets: numBuckets,
            recordsPerRow: keysPerBucket,
            keyLength: parseInt(el.keyLength.value),
            dataType: el.dataType.value,
            occupancyDensity: parseInt(el.inputDO.value),
            reductionDensity: parseInt(el.inputDORed.value)
        };

        this.dinamicModel.create(config);

        // Mostrar áreas
        if (this.elements.hashBlockArea) this.elements.hashBlockArea.style.display = 'flex';
        if (this.elements.logWrapper) this.elements.logWrapper.style.display = 'flex';

        // Bloquear configuración completa
        el.dataType.disabled = true;
        el.keyLength.disabled = true;
        el.inputDO.disabled = true;
        el.inputDORed.disabled = true;
        el.btnCreate.disabled = true;
        if (el.btnLoad) el.btnLoad.disabled = true;
        if (el.range) el.range.disabled = true;
        if (el.blocksPerBucket) el.blocksPerBucket.disabled = true;
        if (el.keysPerBlock) el.keysPerBlock.disabled = true;

        this._enableControls();
        this._updateSegmentationMaxHeight();
        this._renderAll();

        this._setOperation('create');
        this._addLog(`Matriz dinámica parcial ${numBuckets}x${keysPerBucket} creada. D.O. Expansión: ${config.occupancyDensity}%. D.O. Reducción: ${config.reductionDensity}%.`, 'info');
        this._addLog(`Función hash inicial: h(k) = k mod ${numBuckets}`, 'info');
    }

    /**
     * Maneja la inserción de una nueva clave.
     * @private
     * @override
     */
    _onInsert() {
        const el = this.elements;
        const key = el.inputKey.value.trim();

        if (key === '') {
            Validation.showError('Debe ingresar la clave que desea insertar.', el.inputKey);
            return;
        }

        const result = this.dinamicModel.insert(key);

        if (!result.success) {
            Validation.showError(result.error, el.inputKey);
            return;
        }

        this._setOperation('insert');
        this._renderAll();
        this._updateNavStatus();

        let message = `Clave "${key}" insertada`;
        if (result.isCollision) {
            message += ` en colisión (Cubeta ${result.bucketIndex}) usando ${result.formula}.`;
            this._highlightCollisionCell(result.bucketIndex, result.collisionIndex, 'insert');
        } else {
            message += ` en Cubeta ${result.bucketIndex} - Fila ${result.slotIndex + 1} usando ${result.formula}.`;
            this._highlightMatrixCell(result.bucketIndex, result.slotIndex, 'insert');
        }

        this._addLog(message, result.isCollision ? 'warning' : 'success');

        if (result.expanded) {
            const exp = result.expansionDetails;
            this._addLog(`¡Expansión PARCIAL! ${exp.mathFormula}.`, 'warning');
            this._addLog(`Nueva función hash: h(k) = k mod ${exp.newBuckets}`, 'info');
            this._triggerExpansionAnimation();
        }

        el.inputKey.value = '';
        el.inputKey.focus();
    }

    /**
     * Maneja la búsqueda de una clave existente.
     * @private
     * @override
     */
    _onSearch() {
        const el = this.elements;
        const key = el.inputKey.value.trim();

        if (key === '') {
            Validation.showError('Debe ingresar la clave que desea buscar.', el.inputKey);
            return;
        }

        if (this.dinamicModel.count === 0) {
            Validation.showWarning('La estructura está vacía. Inserte claves antes de buscar.');
            return;
        }

        const valid = this.dinamicModel.validateSearchKey(key);
        if (!valid.valid) {
            if (valid.showPopup) {
                Validation.showError(valid.error, el.inputKey);
            } else {
                this._addLog(`Clave "${key}" no encontrada.`, 'error');
                el.inputKey.value = '';
                el.inputKey.focus();
            }
            return;
        }

        const result = this.dinamicModel.search(key);
        this._setOperation('search');

        if (result.found) {
            let msg = `Clave "${key}" encontrada en Cubeta ${result.bucketIndex}`;
            if (result.isCollision) {
                msg += ` (colisión)`;
                this._highlightCollisionCell(result.bucketIndex, result.collisionIndex, 'found');
            } else {
                msg += ` - Fila ${result.slotIndex + 1}`;
                this._highlightMatrixCell(result.bucketIndex, result.slotIndex, 'found');
            }
            msg += ` usando ${result.formula}.`;
            this._addLog(msg, 'success');
        } else {
            this._addLog(`Clave "${key}" no encontrada usando ${result.formula}.`, 'error');
        }

        el.inputKey.value = '';
        el.inputKey.focus();
    }

    /**
     * Maneja la eliminación de una clave con animación.
     * @private
     * @override
     * @async
     */
    async _onDelete() {
        const el = this.elements;
        const key = el.inputKey.value.trim();

        if (key === '') {
            Validation.showError('Debe ingresar la clave que desea eliminar.', el.inputKey);
            return;
        }

        if (this.dinamicModel.count === 0) {
            Validation.showWarning('La estructura está vacía.');
            return;
        }

        const valid = this.dinamicModel.validateSearchKey(key);
        if (!valid.valid) {
            if (valid.showPopup) {
                Validation.showError(valid.error, el.inputKey);
            } else {
                this._addLog(`Clave "${key}" no encontrada.`, 'error');
                el.inputKey.value = '';
                el.inputKey.focus();
            }
            return;
        }

        if (this.isSearchAnimating) {
            Validation.showWarning('Espere a que la animación actual termine.');
            return;
        }

        this.isSearchAnimating = true;

        el.btnSearch.disabled = true;
        el.btnInsert.disabled = true;
        el.btnDelete.disabled = true;

        const result = this.dinamicModel.delete(key);
        this._setOperation('delete');

        if (result.success) {
            // Animación de borrado
            if (result.isCollision) {
                const row = document.getElementById(`coll-row-${result.bucketIndex}-${result.collisionIndex}`);
                if (row) {
                    row.classList.remove('highlight-checking', 'highlight-found');
                    row.classList.add('highlight-deleting');
                    await new Promise(r => setTimeout(r, 800));
                    row.classList.add('fade-out');
                    await new Promise(r => setTimeout(r, 500));
                }
            } else {
                const cell = document.getElementById(`cell-${result.bucketIndex}-${result.slotIndex}`);
                if (cell) {
                    cell.classList.remove('highlight-checking', 'highlight-found');
                    cell.classList.add('highlight-deleting');
                    await new Promise(r => setTimeout(r, 800));
                    cell.classList.add('fade-out');
                    await new Promise(r => setTimeout(r, 500));
                }
            }

            this._renderAll();
            this._updateNavStatus();

            let message = `Clave "${key}" eliminada de Cubeta ${result.bucketIndex}`;
            if (result.isCollision) message += ` (colisión)`;
            else message += ` - Fila ${result.slotIndex + 1}`;

            message += ` usando ${result.formula}.`;
            this._addLog(message, 'error');

            if (result.reduced) {
                const red = result.reductionDetails;
                this._addLog(`¡Reducción PARCIAL! ${red.mathFormula}.`, 'warning');
                this._addLog(`Nueva función hash: h(k) = k mod ${red.newBuckets}`, 'info');
                this._triggerExpansionAnimation();
            } else if (result.reductionSkippedByGuard) {
                this._addLog(`Reducción evitada: la estructura resultante expandiría de inmediato.`, 'info');
            }
        } else {
            this._addLog(`Clave "${key}" no encontrada.`, 'error');
        }

        this.isSearchAnimating = false;
        el.btnSearch.disabled = false;
        el.btnInsert.disabled = false;
        el.btnDelete.disabled = false;

        el.inputKey.value = '';
        el.inputKey.focus();
    }

    /**
     * Limpia la estructura y restablece la interfaz.
     * @private
     * @override
     * @async
     */
    async _onClear() {
        if (this.dinamicModel.created) {
            const confirmed = await Validation.confirm('Se eliminará la estructura actual y se resetearán los valores. ¿Continuar?');
            if (!confirmed) return;
        }

        this.dinamicModel.reset();
        this.logMessages = [];
        this._lastOperation = null;

        // Reset UI
        const el = this.elements;
        el.dataType.disabled = false;
        el.dataType.value = '';
        el.keyLength.disabled = false;
        el.keyLength.value = '';
        el.inputDO.disabled = false;
        el.inputDO.value = '70';
        el.inputDORed.disabled = false;
        el.inputDORed.value = '30';
        el.btnCreate.disabled = false;

        // Número de cubetas y Registros vuelven a valor por defecto y se habilitan
        if (el.blocksPerBucket) {
            el.blocksPerBucket.value = 2;
            el.blocksPerBucket.disabled = false;
        }
        if (el.keysPerBlock) {
            el.keysPerBlock.value = 2;
            el.keysPerBlock.disabled = false;
        }

        el.inputKey.value = '';
        el.inputKey.disabled = true;
        el.btnInsert.disabled = true;
        el.btnDelete.disabled = true;
        el.btnSearch.disabled = true;

        el.hashBlockArea.style.display = 'none';
        el.logWrapper.style.display = 'none';
        el.blockSegContent.innerHTML = '';
        el.collisionAreaContent.innerHTML = '';
        el.logContent.innerHTML = '';

        this._addLog('Estructura limpiada correctamente.', 'info');
    }

    /**
     * Habilita los controles de entrada y botones de operación.
     * @private
     */
    _enableControls() {
        const el = this.elements;
        el.inputKey.disabled = false;
        el.btnInsert.disabled = false;
        el.btnDelete.disabled = false;
        el.btnSearch.disabled = false;

        el.hashBlockArea.style.display = 'flex';
        el.logWrapper.style.display = 'flex';

        el.inputKey.focus();
    }

    /**
     * Renderiza todos los componentes de la vista basados en el snapshot actual.
     * @private
     */
    _renderAll() {
        const snapshot = this.dinamicModel.getCurrentSnapshot();
        if (!snapshot) return;

        this._renderHorizontalMatrix(snapshot);
        this._renderCollisionArea(snapshot);
        this._renderDOInfo(snapshot);
    }

    /**
     * Renderiza la matriz de cubetas en disposición horizontal.
     * @private
     * @param {Object} snapshot - Instantánea del estado del modelo.
     */
    _renderHorizontalMatrix(snapshot) {
        const container = this.elements.blockSegContent;
        container.innerHTML = '';
        container.classList.add('matrix-container-relative');

        // Flecha Izquierda
        const btnBack = document.createElement('button');
        btnBack.id = 'btn-hist-back';
        btnBack.className = 'matrix-side-btn left';
        btnBack.innerHTML = '&lt;'; // <
        btnBack.disabled = !this.dinamicModel.canGoBack();
        btnBack.onclick = () => this._onGoBack();
        container.appendChild(btnBack);

        const tableWrapper = document.createElement('div');
        tableWrapper.className = 'table-wrapper-center';

        const table = document.createElement('table');
        table.id = 'dynamic-matrix';
        table.className = 'matrix-table horizontal-layout';

        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        const headerLabel = snapshot.numBuckets >= 8 ? 'F/C' : 'Filas \\ Cubetas';
        headerRow.innerHTML = `<th>${headerLabel}</th>`;
        for (let i = 0; i < snapshot.numBuckets; i++) {
            headerRow.innerHTML += `<th>${i}</th>`;
        }
        thead.appendChild(headerRow);
        table.appendChild(thead);

        // Body (Registros como filas)
        const tbody = document.createElement('tbody');
        for (let j = 0; j < snapshot.recordsPerRow; j++) {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td><strong>${j + 1}</strong></td>`;
            for (let i = 0; i < snapshot.numBuckets; i++) {
                const cellValue = snapshot.matrix[i][j];
                const td = document.createElement('td');
                td.id = `cell-${i}-${j}`;
                td.innerText = cellValue === null ? '-' : cellValue;
                if (cellValue === null) td.className = 'empty-cell';
                tr.appendChild(td);
            }
            tbody.appendChild(tr);
        }
        table.appendChild(tbody);
        tableWrapper.appendChild(table);
        container.appendChild(tableWrapper);

        // Flecha Derecha
        const btnForward = document.createElement('button');
        btnForward.id = 'btn-hist-forward';
        btnForward.className = 'matrix-side-btn right';
        btnForward.innerHTML = '&gt;'; // >
        btnForward.disabled = !this.dinamicModel.canGoForward();
        btnForward.onclick = () => this._onGoForward();
        container.appendChild(btnForward);
    }

    /**
     * Renderiza la información de densidad de ocupación (D.O.).
     * @private
     * @param {Object} snapshot - Instantánea del estado del modelo.
     */
    _renderDOInfo(snapshot) {
        const container = document.getElementById('do-container');
        if (!container) return;

        // Metas y valores ahora usan bases distintas
        const expansionDO = snapshot.expansionDO;
        const reductionDO = snapshot.reductionDO;

        container.innerHTML = `
            <div class="do-info-card">
                <div class="do-section">
                    <h3>Expansión</h3>
                    <div class="do-value">${expansionDO.toFixed(2)}%</div>
                    <div class="do-label">Meta: >${this.dinamicModel.occupancyThreshold}%</div>
                </div>
                <hr>
                <div class="do-section">
                    <h3>Reducción</h3>
                    <div class="do-value">${reductionDO.toFixed(2)}%</div>
                    <div class="do-label">Meta: <${this.dinamicModel.reductionThreshold}%</div>
                </div>
            </div>
        `;
    }

    /**
     * Dispara la animación visual de expansión en la tabla.
     * @private
     */
    _triggerExpansionAnimation() {
        const matrix = document.getElementById('dynamic-matrix');
        if (matrix) {
            matrix.classList.add('animate-expansion');
            setTimeout(() => matrix.classList.remove('animate-expansion'), 1000);
        }
    }

    /**
     * Resalta una celda específica de la matriz principal.
     * @private
     * @param {number} i - Índice de la cubeta (columna).
     * @param {number} j - Índice del registro (fila).
     * @param {string} type - Tipo de resaltado (found, insert, check).
     */
    _highlightMatrixCell(i, j, type) {
        const cell = document.getElementById(`cell-${i}-${j}`);
        if (cell) {
            cell.classList.add(`highlight-${type}`);
            setTimeout(() => cell.classList.remove(`highlight-${type}`), 2000);
        }
    }

    /**
     * Renderiza el área de bloques de colisión asociados a las cubetas.
     * @private
     * @param {Object} snapshot - Instantánea del estado del modelo.
     */
    _renderCollisionArea(snapshot) {
        const container = this.elements.collisionAreaContent;
        if (!container) return;
        container.innerHTML = '';

        let hasCollisions = false;
        const n = snapshot.numBuckets;

        for (let i = 0; i < n; i++) {
            const collBlock = snapshot.collisionBlocks[i];
            if (!collBlock || collBlock.length === 0) continue;
            hasCollisions = true;

            const colDiv = document.createElement('div');
            colDiv.className = 'block-column collision-block';
            colDiv.dataset.bucket = i;

            const header = document.createElement('div');
            header.className = 'block-column-header collision-header';
            header.textContent = `Cubeta ${i}`;
            colDiv.appendChild(header);

            const tableWrap = document.createElement('div');
            tableWrap.className = 'block-table-scroll';

            const table = document.createElement('table');
            table.className = 'block-table';

            const tbody = document.createElement('tbody');
            for (let k = 0; k < collBlock.length; k++) {
                const tr = document.createElement('tr');
                tr.id = `coll-row-${i}-${k}`;

                const tdPos = document.createElement('td');
                tdPos.textContent = k + 1;
                const tdKey = document.createElement('td');
                tdKey.textContent = collBlock[k];

                tr.appendChild(tdPos);
                tr.appendChild(tdKey);
                tbody.appendChild(tr);
            }
            table.appendChild(tbody);
            tableWrap.appendChild(table);
            colDiv.appendChild(tableWrap);
            container.appendChild(colDiv);
        }

        if (!hasCollisions) {
            const empty = document.createElement('div');
            empty.className = 'block-empty-placeholder';
            empty.textContent = 'Sin colisiones';
            container.appendChild(empty);
        }
    }

    /**
     * Resalta una celda específica en el área de colisiones.
     * @private
     * @param {number} bucketIdx - Índice de la cubeta.
     * @param {number} collIdx - Índice en el bloque de colisión.
     * @param {string} type - Tipo de resaltado.
     */
    _highlightCollisionCell(bucketIdx, collIdx, type) {
        const row = document.getElementById(`coll-row-${bucketIdx}-${collIdx}`);
        if (row) {
            row.classList.add(`highlight-${type}`);
            setTimeout(() => row.classList.remove(`highlight-${type}`), 2000);
            row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }

    /**
     * Renderiza el directorio de cubetas (No utilizado en este modelo).
     * @override
     * @private
     */
    _renderBucketDirectory() { }

    /**
     * Desplaza la vista hacia una cubeta específica (No utilizado en este modelo).
     * @override
     * @private
     */
    _scrollToBucket(index) { }
}