/**
 * @fileoverview Vista base para búsquedas externas por bloques.
 * Renderiza un layout especial con bloques verticales (segmentación),
 * panel de configuración y modificación, área de log, y pie de página.
 * Las subclases implementan la búsqueda específica (secuencial o binaria).
 * @module views/BlockSearchView
 */

/**
 * Clase base para vistas de búsqueda externa por bloques.
 * Genera la interfaz de bloques y provee operaciones compartidas.
 */
class BlockSearchView {
    /**
     * @param {HTMLElement} containerEl - Contenedor principal donde se renderiza.
     */
    constructor(containerEl) {
        this.container = containerEl;
        this.dataStructure = new DataStructure();
        this.logMessages = [];
        this.isSearchAnimating = false;
        this.elements = {};
        this._lastOperation = null;
        this._showFullHistory = false;
        this._allowDuplicates = false;
        this._algorithmName = '';
        /** @type {number} Tamaño de bloque = √N */
        this.blockSize = 0;
    }

    /**
     * Renderiza el layout completo de bloques.
     * @param {string} title - Título del algoritmo.
     */
    render(title) {
        this.container.innerHTML = '';
        this.container.classList.remove('hidden');

        const welcome = document.getElementById('welcome-screen');
        if (welcome) welcome.classList.add('hidden');

        this.container.innerHTML = `
            <!-- Título -->
            <div class="algo-title">${title}</div>

            <!-- Top row: Creación (izq) + Modificación (der) -->
            <div class="block-top-row">
                <!-- Panel Creación -->
                <div class="block-panel-creation">
                    <div class="section-title">Creación de la Estructura</div>
                    <div class="config-panel">
                        <div class="config-fields">
                            <div class="config-group">
                                <label for="cfg-datatype">Tipo de Dato</label>
                                <select id="cfg-datatype">
                                    <option value="">-- Seleccione --</option>
                                    <option value="numerico">Numérico</option>
                                    <option value="texto">Cadena de Texto</option>
                                    <option value="alfanumerico">Alfanumérico</option>
                                </select>
                            </div>
                            <div class="config-group">
                                <label for="cfg-keylength">Tamaño Clave</label>
                                <input type="number" id="cfg-keylength" min="1" max="100" placeholder="Ej: 3">
                            </div>
                            <div class="config-group">
                                <label for="cfg-range">Rango Estructura</label>
                                <input type="number" id="cfg-range" min="1" placeholder="Ej: 25">
                            </div>
                            <div class="config-group">
                                <label>Claves Repetidas</label>
                                <div class="toggle-container">
                                    <span class="toggle-label" id="toggle-yes">Sí</span>
                                    <div class="toggle-switch off" id="toggle-duplicates" title="Permitir claves repetidas">
                                        <div class="toggle-knob"></div>
                                    </div>
                                    <span class="toggle-label active" id="toggle-no">No</span>
                                </div>
                            </div>
                        </div>
                        <div class="config-buttons">
                            <button class="btn btn-primary" id="btn-create">CREAR</button>
                            <button class="btn btn-info" id="btn-load">CARGAR</button>
                            <button class="btn btn-secondary" id="btn-clear">LIMPIAR</button>
                        </div>
                    </div>
                </div>
                <!-- Panel Modificación -->
                <div class="block-panel-modification">
                    <div class="section-title">Modificación de la Estructura</div>
                    <div class="block-mod-body">
                        <div class="block-mod-left">
                            <label for="input-key">Digite la Clave</label>
                            <input type="text" id="input-key" placeholder="Ingrese la clave..." disabled>
                        </div>
                        <div class="insert-buttons">
                            <button class="btn btn-primary" id="btn-insert" disabled>INSERTAR</button>
                            <button class="btn btn-danger" id="btn-delete" disabled>BORRAR</button>
                            <button class="btn btn-success" id="btn-search" disabled>BUSCAR</button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Segmentación por Bloques -->
            <div class="block-segmentation-wrapper" id="block-segmentation-wrapper" style="display:none;">
                <div class="section-title">Segmentación por Bloques</div>
                <div class="block-segmentation-scroll" id="block-segmentation-scroll">
                    <div class="block-segmentation-content" id="block-segmentation-content"></div>
                </div>
            </div>

            <!-- Mensajes y Resultados -->
            <div class="block-log-wrapper" id="block-log-wrapper" style="display:none;">
                <div class="log-header">
                    Mensajes y Resultados
                    <button class="log-history-toggle" id="log-history-toggle" title="Ver historial completo">📋 Historial</button>
                </div>
                <div class="log-content" id="log-content"></div>
            </div>

            <!-- Footer -->
            <div class="footer-buttons">
                <button class="btn btn-success" id="btn-save" disabled>GUARDAR</button>
                <button class="btn btn-primary" id="btn-print" disabled>IMPRIMIR</button>
            </div>
        `;

        this._cacheElements();
        this._bindEvents();
    }

    /** @private */
    _cacheElements() {
        this.elements = {
            dataType: document.getElementById('cfg-datatype'),
            keyLength: document.getElementById('cfg-keylength'),
            range: document.getElementById('cfg-range'),
            toggleDuplicates: document.getElementById('toggle-duplicates'),
            toggleYes: document.getElementById('toggle-yes'),
            toggleNo: document.getElementById('toggle-no'),
            btnCreate: document.getElementById('btn-create'),
            btnClear: document.getElementById('btn-clear'),
            btnLoad: document.getElementById('btn-load'),
            inputKey: document.getElementById('input-key'),
            btnInsert: document.getElementById('btn-insert'),
            btnDelete: document.getElementById('btn-delete'),
            btnSearch: document.getElementById('btn-search'),
            segmentationWrapper: document.getElementById('block-segmentation-wrapper'),
            segmentationScroll: document.getElementById('block-segmentation-scroll'),
            segmentationContent: document.getElementById('block-segmentation-content'),
            logWrapper: document.getElementById('block-log-wrapper'),
            logContent: document.getElementById('log-content'),
            logHistoryToggle: document.getElementById('log-history-toggle'),
            btnSave: document.getElementById('btn-save'),
            btnPrint: document.getElementById('btn-print')
        };
        this._allowDuplicates = false;
    }

    /** @private */
    _bindEvents() {
        const el = this.elements;

        el.toggleDuplicates.addEventListener('click', () => {
            this._allowDuplicates = !this._allowDuplicates;
            el.toggleDuplicates.classList.toggle('off', !this._allowDuplicates);
            el.toggleYes.classList.toggle('active', this._allowDuplicates);
            el.toggleNo.classList.toggle('active', !this._allowDuplicates);
        });

        el.btnCreate.addEventListener('click', () => this._onCreate());
        el.btnClear.addEventListener('click', () => this._onClear());
        el.btnLoad.addEventListener('click', () => this._onLoad());
        el.btnInsert.addEventListener('click', () => this._onInsert());
        el.btnDelete.addEventListener('click', () => this._onDelete());
        el.btnSearch.addEventListener('click', () => this._onSearch());
        el.btnSave.addEventListener('click', () => this._onSave());
        el.btnPrint.addEventListener('click', () => FileManager.print());
        el.logHistoryToggle.addEventListener('click', () => this._toggleLogHistory());

        el.inputKey.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                setTimeout(() => el.btnInsert.click(), 10);
            }
        });

        // Resize — re-render blocks
        this._resizeTimer = null;
        this._onResizeBound = () => {
            clearTimeout(this._resizeTimer);
            this._resizeTimer = setTimeout(() => {
                if (this.dataStructure.created) {
                    this._renderBlocks();
                }
            }, 150);
        };
        window.addEventListener('resize', this._onResizeBound);
    }

    /** @private */
    _onCreate() {
        const el = this.elements;

        if (this.dataStructure.created) {
            Validation.showWarning('Ya existe una estructura activa. Debe limpiarla antes de crear una nueva.');
            return;
        }

        const validation = Validation.validateCreateParams(
            el.range.value, el.keyLength.value, el.dataType.value
        );
        if (!validation.valid) {
            Validation.showError(validation.error);
            return;
        }

        const size = parseInt(el.range.value);
        const keyLength = parseInt(el.keyLength.value);
        const dataType = el.dataType.value;

        if (size > 10000) {
            Validation.showWarning(`Va a crear una estructura con ${size.toLocaleString()} posiciones. Esto puede afectar el rendimiento visual.`);
        }

        this.dataStructure.create(size, keyLength, dataType, this._allowDuplicates);
        this.blockSize = Math.max(1, Math.floor(Math.sqrt(size)));

        // Enable / disable controls
        el.inputKey.disabled = false;
        el.btnInsert.disabled = false;
        el.btnDelete.disabled = false;
        el.btnSearch.disabled = false;
        el.btnSave.disabled = false;
        el.btnPrint.disabled = false;

        el.dataType.disabled = true;
        el.keyLength.disabled = true;
        el.range.disabled = true;
        el.toggleDuplicates.style.pointerEvents = 'none';
        el.toggleDuplicates.style.opacity = '0.5';
        el.btnCreate.disabled = true;
        el.btnLoad.disabled = true;

        // Show areas
        el.segmentationWrapper.style.display = '';
        el.logWrapper.style.display = '';

        this._renderBlocks();
        this._setOperation('create');
        this._addLog(`Estructura creada: ${size} posiciones, clave de ${keyLength} carácter(es), tipo: ${dataType}, repetidas: ${this._allowDuplicates ? 'Sí' : 'No'}. Tamaño de bloque: ${this.blockSize} (√${size}).`, 'info');
    }

    /** @private @async */
    async _onClear() {
        if (this.dataStructure.created) {
            const confirmed = await Validation.confirm('Se eliminará la estructura actual y todos los datos. ¿Desea continuar?');
            if (!confirmed) return;
        }

        this.dataStructure.reset();
        this.logMessages = [];
        this._allowDuplicates = false;
        this._lastOperation = null;
        this._showFullHistory = false;
        this.blockSize = 0;

        const el = this.elements;

        if (el.logHistoryToggle) {
            el.logHistoryToggle.textContent = '📋 Historial';
            el.logHistoryToggle.title = 'Ver historial completo';
            el.logHistoryToggle.classList.remove('active');
        }

        el.dataType.value = ''; el.dataType.disabled = false;
        el.keyLength.value = ''; el.keyLength.disabled = false;
        el.range.value = ''; el.range.disabled = false;
        if (el.toggleDuplicates) {
            el.toggleDuplicates.classList.add('off');
            el.toggleDuplicates.style.pointerEvents = '';
            el.toggleDuplicates.style.opacity = '';
        }
        if (el.toggleYes) el.toggleYes.classList.remove('active');
        if (el.toggleNo) el.toggleNo.classList.add('active');
        el.btnCreate.disabled = false;
        el.btnLoad.disabled = false;

        el.inputKey.value = ''; el.inputKey.disabled = true;
        el.btnInsert.disabled = true;
        el.btnDelete.disabled = true;
        el.btnSearch.disabled = true;
        el.btnSave.disabled = true;
        el.btnPrint.disabled = true;

        el.segmentationWrapper.style.display = 'none';
        el.logWrapper.style.display = 'none';
        el.segmentationContent.innerHTML = '';
        el.logContent.innerHTML = '';
    }

    /** @private @async */
    async _onLoad() {
        if (this.dataStructure.created) {
            Validation.showWarning('Ya existe una estructura activa. Debe limpiarla antes de cargar otra.');
            return;
        }

        const data = await FileManager.load();
        if (!data) return;

        if (data.algorithm && this._algorithmName && !FileCompat.areCompatible(data.algorithm, this._algorithmName)) {
            Validation.showError(`Este archivo fue creado para "${data.algorithm}" y no es compatible con la vista actual ("${this._algorithmName}").`);
            return;
        }

        this.dataStructure.fromJSON(data.structure);
        this._allowDuplicates = data.structure.allowDuplicates;
        this.blockSize = data.structure.blockSize || Math.max(1, Math.floor(Math.sqrt(this.dataStructure.size)));

        // Sort keys for block search (must be ordered)
        if (this.dataStructure.count > 0) {
            const nonNull = this.dataStructure.keys.filter(k => k !== null);
            nonNull.sort((a, b) => this.dataStructure._compareKeys(a, b));
            for (let i = 0; i < this.dataStructure.size; i++) {
                this.dataStructure.keys[i] = i < nonNull.length ? nonNull[i] : null;
            }
        }

        const el = this.elements;
        el.dataType.value = data.structure.dataType;
        el.keyLength.value = data.structure.keyLength;
        el.range.value = data.structure.size;
        el.toggleDuplicates.classList.toggle('off', !this._allowDuplicates);
        el.toggleYes.classList.toggle('active', this._allowDuplicates);
        el.toggleNo.classList.toggle('active', !this._allowDuplicates);

        el.dataType.disabled = true;
        el.keyLength.disabled = true;
        el.range.disabled = true;
        el.toggleDuplicates.style.pointerEvents = 'none';
        el.toggleDuplicates.style.opacity = '0.5';
        el.btnCreate.disabled = true;
        el.btnLoad.disabled = true;

        el.inputKey.disabled = false;
        el.btnInsert.disabled = false;
        el.btnDelete.disabled = false;
        el.btnSearch.disabled = false;
        el.btnSave.disabled = false;
        el.btnPrint.disabled = false;

        el.segmentationWrapper.style.display = '';
        el.logWrapper.style.display = '';

        this._renderBlocks();
        this._setOperation('load');
        this._addLog('Estructura cargada desde archivo. Las claves se han ordenado.', 'success');
    }

    /** @private */
    _onInsert() {
        const el = this.elements;
        const result = this.dataStructure.sortedInsert(el.inputKey.value);

        if (!result.success) {
            Validation.showError(result.error, el.inputKey);
            return;
        }

        this._setOperation('insert');
        this._renderBlocks();
        this._addLog(`Clave "${this.dataStructure.keys[result.position]}" insertada en posición ${result.position + 1} (Bloque ${Math.floor(result.position / this.blockSize) + 1}).`, 'success');
        el.inputKey.value = '';
        el.inputKey.focus();
    }

    /** @private @async — overridden in subclasses */
    async _onDelete() {
        // Base: subclasses override with animated search + deletion
    }

    /** @private — overridden in subclasses */
    _onSearch() {
        // Base: subclasses override
    }

    /** @private */
    async _onSave() {
        // Temporarily patch toJSON to include blockSize
        const origToJSON = this.dataStructure.toJSON.bind(this.dataStructure);
        this.dataStructure.toJSON = () => {
            const json = origToJSON();
            json.blockSize = this.blockSize;
            return json;
        };
        await FileManager.save(this.dataStructure, this._algorithmName || 'estructura-bloques');
        // Restore original toJSON
        this.dataStructure.toJSON = origToJSON;
    }

    // ──────────────────────────────────────────
    // Block Rendering
    // ──────────────────────────────────────────

    /**
     * Determina si usar bloques compactos (omitiendo filas vacías dentro de cada bloque).
     * @private
     * @returns {boolean}
     */
    _shouldUseCompactBlocks() {
        const rowHeight = 30;
        const headerHeight = 40;
        const titleHeight = 30; // section-title bar

        // Calculate the total available height for segmentation + log
        const algoView = this.container;
        if (!algoView) return false;

        const algoRect = algoView.getBoundingClientRect();
        const wrapperTop = this.elements.segmentationWrapper
            ? this.elements.segmentationWrapper.getBoundingClientRect().top
            : algoRect.top;
        const footerHeight = 60; // footer-buttons height approx
        const availableH = algoRect.bottom - wrapperTop - footerHeight;

        // 70% of the available height goes to segmentation
        const segMaxH = availableH * 0.7;
        const innerH = segMaxH - titleHeight;

        const totalNeeded = this.blockSize * rowHeight + headerHeight;
        return totalNeeded > innerH;
    }

    /**
     * Re-renderiza todos los bloques con sus datos actuales.
     * @private
     */
    _renderBlocks() {
        const container = this.elements.segmentationContent;
        container.innerHTML = '';

        const size = this.dataStructure.size;
        const bs = this.blockSize;
        if (bs === 0 || size === 0) return;

        const numBlocks = Math.ceil(size / bs);
        const useCompact = this._shouldUseCompactBlocks();

        for (let b = 0; b < numBlocks; b++) {
            const blockStart = b * bs;
            const blockEnd = Math.min(blockStart + bs, size);

            const col = document.createElement('div');
            col.classList.add('block-column');
            col.dataset.block = b;

            // Header
            const header = document.createElement('div');
            header.classList.add('block-column-header');
            header.textContent = `Bloque ${b + 1}`;
            col.appendChild(header);

            // Table inside block
            const tableWrap = document.createElement('div');
            tableWrap.classList.add('block-table-scroll');

            const table = document.createElement('table');
            table.classList.add('block-table');

            const thead = document.createElement('thead');
            thead.innerHTML = '<tr><th>Pos</th><th>Clave</th></tr>';
            table.appendChild(thead);

            const tbody = document.createElement('tbody');

            if (!useCompact) {
                // Normal mode: show all positions in block
                for (let i = blockStart; i < blockEnd; i++) {
                    const tr = document.createElement('tr');
                    tr.dataset.index = i;
                    const tdPos = document.createElement('td');
                    tdPos.textContent = i + 1;
                    const tdKey = document.createElement('td');
                    if (this.dataStructure.keys[i] !== null) {
                        tdKey.textContent = this.dataStructure.keys[i];
                    } else {
                        tdKey.textContent = '-';
                        tdKey.classList.add('empty-cell');
                    }
                    tr.appendChild(tdPos);
                    tr.appendChild(tdKey);
                    tbody.appendChild(tr);
                }
            } else {
                // Compact mode: only show occupied positions + first/last
                const visible = new Set();
                visible.add(blockStart);
                visible.add(blockEnd - 1);
                for (let i = blockStart; i < blockEnd; i++) {
                    if (this.dataStructure.keys[i] !== null) visible.add(i);
                }
                const sorted = Array.from(visible).sort((a, b) => a - b);
                let lastRendered = -1;

                for (const pos of sorted) {
                    if (lastRendered !== -1 && pos > lastRendered + 1) {
                        const eTr = document.createElement('tr');
                        eTr.classList.add('ellipsis-row');
                        const eTd = document.createElement('td');
                        eTd.colSpan = 2;
                        eTd.textContent = '\u2026';
                        eTr.appendChild(eTd);
                        tbody.appendChild(eTr);
                    }
                    const tr = document.createElement('tr');
                    tr.dataset.index = pos;
                    const tdPos = document.createElement('td');
                    tdPos.textContent = pos + 1;
                    const tdKey = document.createElement('td');
                    if (this.dataStructure.keys[pos] !== null) {
                        tdKey.textContent = this.dataStructure.keys[pos];
                    } else {
                        tdKey.textContent = '-';
                        tdKey.classList.add('empty-cell');
                    }
                    tr.appendChild(tdPos);
                    tr.appendChild(tdKey);
                    tbody.appendChild(tr);
                    lastRendered = pos;
                }
            }

            table.appendChild(tbody);
            tableWrap.appendChild(table);
            col.appendChild(tableWrap);
            container.appendChild(col);
        }

        // After rendering, cap segmentation at 70% of available flex space
        this._updateSegmentationMaxHeight();
    }

    /**
     * Calculates and sets the max-height on segmentation wrapper
     * so it never exceeds 70% of the vertical space shared with the log.
     * @private
     */
    _updateSegmentationMaxHeight() {
        const wrapper = this.elements.segmentationWrapper;
        const logWrapper = this.elements.logWrapper;
        if (!wrapper || !logWrapper) return;

        // Reset max-height so we can measure natural content
        wrapper.style.maxHeight = '';

        // Let the browser reflow so we get the correct rects
        requestAnimationFrame(() => {
            const wrapperRect = wrapper.getBoundingClientRect();
            const logRect = logWrapper.getBoundingClientRect();
            // Total available = from top of segmentation to bottom of log
            const totalAvailable = logRect.bottom - wrapperRect.top;
            // Subtract gap between them (approx)
            const gap = logRect.top - wrapperRect.bottom;
            const netAvailable = totalAvailable - gap;
            const maxH = Math.floor(netAvailable * 0.7);

            if (wrapperRect.height > maxH) {
                wrapper.style.maxHeight = maxH + 'px';
            }
        });
    }

    // ──────────────────────────────────────────
    // Log System (same pattern as AlgorithmView)
    // ──────────────────────────────────────────

    /** @private */
    _setOperation(operation) {
        const keepLog = operation === 'insert' && this._lastOperation === 'insert';
        if (!keepLog && !this._showFullHistory) {
            this.elements.logContent.innerHTML = '';
        }
        this._lastOperation = operation;
    }

    /** @private */
    _addLog(message, type = 'info') {
        this.logMessages.push({ message, type, time: new Date(), operation: this._lastOperation });
        const logContent = this.elements.logContent;
        const entry = document.createElement('div');
        entry.classList.add('log-entry', `log-${type}`);
        entry.textContent = message;
        logContent.appendChild(entry);
        logContent.scrollTop = logContent.scrollHeight;
    }

    /** @private */
    _renderLogView() {
        const logContent = this.elements.logContent;
        logContent.innerHTML = '';
        const messages = this._showFullHistory
            ? this.logMessages
            : this.logMessages.filter(m => m.operation === this._lastOperation);
        for (const msg of messages) {
            const entry = document.createElement('div');
            entry.classList.add('log-entry', `log-${msg.type}`);
            entry.textContent = msg.message;
            logContent.appendChild(entry);
        }
        logContent.scrollTop = logContent.scrollHeight;
    }

    /** @private */
    _toggleLogHistory() {
        this._showFullHistory = !this._showFullHistory;
        const btn = this.elements.logHistoryToggle;
        if (this._showFullHistory) {
            btn.title = 'Volver al modo normal';
            btn.textContent = '↩ Atrás';
        } else {
            btn.title = 'Ver historial completo';
            btn.textContent = '📋 Historial';
            this.elements.logContent.innerHTML = '';
            return;
        }
        this._renderLogView();
    }

    // ──────────────────────────────────────────
    // Highlight Helpers
    // ──────────────────────────────────────────

    /**
     * Elimina todos los resaltados de los bloques.
     * @protected
     */
    _clearHighlights() {
        const content = this.elements.segmentationContent;
        if (!content) return;
        const highlights = ['highlight-checking', 'highlight-found', 'highlight-not-found',
            'highlight-deleting', 'highlight-discarded', 'highlight-mid', 'fade-out',
            'block-active', 'block-skipped'];
        content.querySelectorAll('tr, .block-column').forEach(el => {
            highlights.forEach(cls => el.classList.remove(cls));
        });
    }

    /**
     * Encuentra la fila <tr> con data-index en cualquier bloque.
     * @protected
     * @param {number} index
     * @returns {HTMLTableRowElement|null}
     */
    _findRow(index) {
        return this.elements.segmentationContent.querySelector(`tr[data-index="${index}"]`);
    }

    /**
     * Encuentra el div .block-column con data-block.
     * @protected
     * @param {number} blockIndex
     * @returns {HTMLElement|null}
     */
    _findBlock(blockIndex) {
        return this.elements.segmentationContent.querySelector(`.block-column[data-block="${blockIndex}"]`);
    }

    /**
     * Desplaza el scroll horizontal para que un bloque sea visible,
     * y opcionalmente el scroll vertical dentro del bloque hasta una fila.
     * @protected
     * @param {number} blockIndex
     * @param {number} [rowIndex] - Índice global de la fila a enfocar verticalmente.
     */
    _scrollToBlock(blockIndex, rowIndex) {
        const blockEl = this._findBlock(blockIndex);
        const scroll = this.elements.segmentationScroll;
        if (blockEl && scroll) {
            const left = blockEl.offsetLeft - scroll.offsetLeft;
            scroll.scrollTo({ left: left - 20, behavior: 'smooth' });
        }
        if (rowIndex !== undefined) {
            this._scrollRowIntoView(rowIndex);
        }
    }

    /**
     * Desplaza verticalmente el contenedor de scroll de un bloque
     * para que la fila indicada sea visible (centrada).
     * @protected
     * @param {number} rowIndex - Índice global de la fila.
     */
    _scrollRowIntoView(rowIndex) {
        const row = this._findRow(rowIndex);
        if (!row) return;
        const tableScroll = row.closest('.block-table-scroll');
        if (!tableScroll) return;
        const rowTop = row.offsetTop;
        const rowH = row.offsetHeight;
        const scrollH = tableScroll.clientHeight;
        tableScroll.scrollTo({
            top: rowTop - (scrollH / 2) + (rowH / 2),
            behavior: 'smooth'
        });
    }

    /**
     * Normaliza la clave para mostrar en logs (padding para numéricos).
     * @protected
     * @param {string} key
     * @returns {string}
     */
    _displayKey(key) {
        if (this.dataStructure.dataType === 'numerico' && /^\d+$/.test(key) && key.length < this.dataStructure.keyLength) {
            return key.padStart(this.dataStructure.keyLength, '0');
        }
        return key;
    }
}
