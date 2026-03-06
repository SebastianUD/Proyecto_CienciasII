/**
 * @fileoverview Vista base para búsquedas hash externas por cubetas/bloques.
 * Renderiza un layout de 3 columnas: Directorio de Cubetas | Segmentación por Bloques | Área de Colisiones.
 * Las subclases implementan la función hash específica.
 * @module views/HashBlockSearchView
 */

/**
 * Clase base para vistas de búsqueda hash externa por cubetas y bloques.
 */
class HashBlockSearchView {
    /**
     * @param {HTMLElement} containerEl - Contenedor principal.
     */
    constructor(containerEl) {
        this.container = containerEl;
        this.bucketStructure = new HashBucketStructure();
        this.logMessages = [];
        this.isSearchAnimating = false;
        this.elements = {};
        this._lastOperation = null;
        this._showFullHistory = false;
        this._algorithmName = '';
    }

    // ──────────────────────────────────────────
    // Overridable hooks for subclasses
    // ──────────────────────────────────────────

    /** @protected @returns {string} */
    _getHashMethod() { return 'modulo'; }

    /** @protected @returns {string} Extra HTML for config fields (e.g. base input) */
    _getExtraConfigHTML() { return ''; }

    /** @protected Hook after creation for custom log messages */
    _onCreationSuccess(config) {
        this._addLog(`Estructura hash creada: ${config.numBuckets} cubetas, ${config.blocksPerBucket} bloques/cubeta, ${config.keysPerBlock} claves/bloque, tipo: ${config.dataType}.`, 'info');
    }

    /** @protected Hook to cache extra elements */
    _cacheExtraElements() { }

    /** @protected Hook to validate extra config */
    _validateExtraConfig() { return { valid: true }; }

    /** @protected Hook to get extra config values */
    _getExtraConfigValues() { return {}; }

    /** @protected Hook to disable extra config inputs */
    _disableExtraConfig() { }

    /** @protected Hook to enable extra config inputs */
    _enableExtraConfig() { }

    /** @protected Hook to clear extra config inputs */
    _clearExtraConfig() { }

    /** @protected Hook to set extra config from loaded data */
    _setExtraConfigFromData(data) { }

    /**
     * Genera el log de fórmula para inserción.
     * @protected
     */
    _getInsertFormula(key) {
        return this.bucketStructure.getHashPosition(key).formula;
    }

    // ──────────────────────────────────────────
    // Render
    // ──────────────────────────────────────────

    render(title) {
        this.container.innerHTML = '';
        this.container.classList.remove('hidden');

        const welcome = document.getElementById('welcome-screen');
        if (welcome) welcome.classList.add('hidden');

        this.container.innerHTML = `
            <div class="algo-title">${title}</div>

            <!-- Top row: Creación (izq) + Modificación (der) -->
            <div class="block-top-row">
                <div class="block-panel-creation">
                    <div class="section-title">Configuración de la Estructura</div>
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
                                <input type="number" id="cfg-range" min="1" placeholder="Ej: 10">
                            </div>
                            <div class="config-group">
                                <label for="cfg-blocks-per-bucket">Bloques X Cubeta</label>
                                <input type="number" id="cfg-blocks-per-bucket" min="1" max="100" placeholder="Ej: 2">
                            </div>
                            <div class="config-group">
                                <label for="cfg-keys-per-block">Claves X Bloque</label>
                                <input type="number" id="cfg-keys-per-block" min="1" max="100" placeholder="Ej: 3">
                            </div>
                            ${this._getExtraConfigHTML()}
                            <div class="config-group">
                                <label>Tipo de Búsqueda</label>
                                <div class="toggle-container">
                                    <span class="toggle-label active" id="toggle-seq">Sec.</span>
                                    <div class="toggle-switch neutral" id="toggle-search-mode" title="Tipo de búsqueda">
                                        <div class="toggle-knob"></div>
                                    </div>
                                    <span class="toggle-label" id="toggle-bin">Bin.</span>
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

            <!-- 3-Column Area: Bucket Directory + Block Segmentation + Collision Area -->
            <div class="hash-block-area" id="hash-block-area" style="display:none;">
                <!-- Bucket Directory (20%) -->
                <div class="bucket-directory-wrapper">
                    <div class="section-title">Directorio de Cubetas</div>
                    <div class="bucket-directory-scroll">
                        <table class="bucket-directory-table" id="bucket-directory-table">
                            <thead><tr><th>Pos</th><th>Bloques</th></tr></thead>
                            <tbody id="bucket-directory-body"></tbody>
                        </table>
                    </div>
                </div>

                <!-- Block Segmentation (70%) -->
                <div class="hash-block-segmentation-wrapper">
                    <div class="section-title">Segmentación por Bloques</div>
                    <div class="block-segmentation-scroll" id="hash-block-seg-scroll">
                        <div class="block-segmentation-content" id="hash-block-seg-content"></div>
                    </div>
                </div>

                <!-- Collision Area (10%) -->
                <div class="collision-area-wrapper">
                    <div class="section-title">Área de Colisiones</div>
                    <div class="collision-area-scroll" id="collision-area-scroll">
                        <div class="collision-area-content" id="collision-area-content"></div>
                    </div>
                </div>
            </div>

            <!-- Log -->
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

    /** Show entry point for subclasses */
    show() {
        this.render('Búsqueda Hash Externa');
    }

    // ──────────────────────────────────────────
    // Cache & Bind
    // ──────────────────────────────────────────

    _cacheElements() {
        this.elements = {
            dataType: document.getElementById('cfg-datatype'),
            keyLength: document.getElementById('cfg-keylength'),
            range: document.getElementById('cfg-range'),
            blocksPerBucket: document.getElementById('cfg-blocks-per-bucket'),
            keysPerBlock: document.getElementById('cfg-keys-per-block'),
            toggleSearchMode: document.getElementById('toggle-search-mode'),
            toggleSeq: document.getElementById('toggle-seq'),
            toggleBin: document.getElementById('toggle-bin'),
            btnCreate: document.getElementById('btn-create'),
            btnClear: document.getElementById('btn-clear'),
            btnLoad: document.getElementById('btn-load'),
            inputKey: document.getElementById('input-key'),
            btnInsert: document.getElementById('btn-insert'),
            btnDelete: document.getElementById('btn-delete'),
            btnSearch: document.getElementById('btn-search'),
            hashBlockArea: document.getElementById('hash-block-area'),
            bucketDirectoryBody: document.getElementById('bucket-directory-body'),
            blockSegScroll: document.getElementById('hash-block-seg-scroll'),
            blockSegContent: document.getElementById('hash-block-seg-content'),
            collisionAreaContent: document.getElementById('collision-area-content'),
            logWrapper: document.getElementById('block-log-wrapper'),
            logContent: document.getElementById('log-content'),
            logHistoryToggle: document.getElementById('log-history-toggle'),
            btnSave: document.getElementById('btn-save'),
            btnPrint: document.getElementById('btn-print')
        };
        this._searchMode = 'secuencial';
        this._cacheExtraElements();
    }

    _bindEvents() {
        const el = this.elements;

        // Toggle search mode
        el.toggleSearchMode.addEventListener('click', () => {
            this._searchMode = this._searchMode === 'secuencial' ? 'binaria' : 'secuencial';
            el.toggleSearchMode.classList.toggle('neutral', this._searchMode === 'secuencial');
            el.toggleSearchMode.classList.toggle('neutral-on', this._searchMode === 'binaria');
            el.toggleSeq.classList.toggle('active', this._searchMode === 'secuencial');
            el.toggleBin.classList.toggle('active', this._searchMode === 'binaria');
            if (this.bucketStructure.created) {
                this.bucketStructure.searchMode = this._searchMode;
            }
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

        this._resizeTimer = null;
        this._onResizeBound = () => {
            clearTimeout(this._resizeTimer);
            this._resizeTimer = setTimeout(() => {
                if (this.bucketStructure.created) {
                    this._updateSegmentationMaxHeight();
                    this._renderAll();
                }
            }, 150);
        };
        window.addEventListener('resize', this._onResizeBound);
    }

    // ──────────────────────────────────────────
    // Operations
    // ──────────────────────────────────────────

    _onCreate() {
        const el = this.elements;

        if (this.bucketStructure.created) {
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

        const blocksPerBucket = parseInt(el.blocksPerBucket.value);
        const keysPerBlock = parseInt(el.keysPerBlock.value);

        if (!blocksPerBucket || blocksPerBucket < 1) {
            Validation.showError('Debe ingresar un número válido de Bloques X Cubeta (mínimo 1).');
            return;
        }
        if (!keysPerBlock || keysPerBlock < 1) {
            Validation.showError('Debe ingresar un número válido de Claves X Bloque (mínimo 1).');
            return;
        }

        const extraValidation = this._validateExtraConfig();
        if (!extraValidation.valid) {
            Validation.showError(extraValidation.error);
            return;
        }

        const config = {
            numBuckets: parseInt(el.range.value),
            blocksPerBucket,
            keysPerBlock,
            keyLength: parseInt(el.keyLength.value),
            dataType: el.dataType.value,
            searchMode: this._searchMode,
            hashMethod: this._getHashMethod(),
            ...this._getExtraConfigValues()
        };

        this.bucketStructure.create(config);

        // Enable controls
        el.inputKey.disabled = false;
        el.btnInsert.disabled = false;
        el.btnDelete.disabled = false;
        el.btnSearch.disabled = false;
        el.btnSave.disabled = false;
        el.btnPrint.disabled = false;

        // Disable config
        el.dataType.disabled = true;
        el.keyLength.disabled = true;
        el.range.disabled = true;
        el.blocksPerBucket.disabled = true;
        el.keysPerBlock.disabled = true;
        el.toggleSearchMode.style.pointerEvents = 'none';
        el.toggleSearchMode.style.opacity = '0.5';
        el.btnCreate.disabled = true;
        el.btnLoad.disabled = true;
        this._disableExtraConfig();

        // Show areas
        el.hashBlockArea.style.display = '';
        el.logWrapper.style.display = '';

        this._updateSegmentationMaxHeight();
        this._renderAll();
        this._setOperation('create');
        this._onCreationSuccess(config);
    }

    async _onClear() {
        if (this.bucketStructure.created) {
            const confirmed = await Validation.confirm('Se eliminará la estructura actual. ¿Desea continuar?');
            if (!confirmed) return;
        }

        this.bucketStructure.reset();
        this.logMessages = [];
        this._lastOperation = null;
        this._showFullHistory = false;
        this._searchMode = 'secuencial';

        const el = this.elements;

        if (el.logHistoryToggle) {
            el.logHistoryToggle.textContent = '📋 Historial';
            el.logHistoryToggle.title = 'Ver historial completo';
            el.logHistoryToggle.classList.remove('active');
        }

        el.dataType.value = ''; el.dataType.disabled = false;
        el.keyLength.value = ''; el.keyLength.disabled = false;
        el.range.value = ''; el.range.disabled = false;
        el.blocksPerBucket.value = ''; el.blocksPerBucket.disabled = false;
        el.keysPerBlock.value = ''; el.keysPerBlock.disabled = false;

        el.toggleSearchMode.classList.add('neutral');
        el.toggleSearchMode.classList.remove('neutral-on');
        el.toggleSearchMode.style.pointerEvents = '';
        el.toggleSearchMode.style.opacity = '';
        el.toggleSeq.classList.add('active');
        el.toggleBin.classList.remove('active');

        el.btnCreate.disabled = false;
        el.btnLoad.disabled = false;

        el.inputKey.value = ''; el.inputKey.disabled = true;
        el.btnInsert.disabled = true;
        el.btnDelete.disabled = true;
        el.btnSearch.disabled = true;
        el.btnSave.disabled = true;
        el.btnPrint.disabled = true;

        el.hashBlockArea.style.display = 'none';
        el.logWrapper.style.display = 'none';
        el.bucketDirectoryBody.innerHTML = '';
        el.blockSegContent.innerHTML = '';
        el.collisionAreaContent.innerHTML = '';
        el.logContent.innerHTML = '';

        this._enableExtraConfig();
        this._clearExtraConfig();
    }

    async _onLoad() {
        if (this.bucketStructure.created) {
            Validation.showWarning('Ya existe una estructura activa. Debe limpiarla antes de cargar otra.');
            return;
        }

        const data = await FileManager.load();
        if (!data) return;

        // Accept both HashBucketStructure format (data.structure.buckets) and legacy
        if (!data.structure || (!data.structure.keys && !data.structure.buckets)) {
            Validation.showError('El archivo no tiene un formato válido para esta vista.');
            return;
        }

        this.bucketStructure.fromJSON(data.structure);
        this._searchMode = data.structure.searchMode || 'secuencial';

        const el = this.elements;
        el.dataType.value = data.structure.dataType;
        el.keyLength.value = data.structure.keyLength;
        el.range.value = data.structure.numBuckets;
        el.blocksPerBucket.value = data.structure.blocksPerBucket;
        el.keysPerBlock.value = data.structure.keysPerBlock;

        el.toggleSearchMode.classList.toggle('neutral', this._searchMode === 'secuencial');
        el.toggleSearchMode.classList.toggle('neutral-on', this._searchMode === 'binaria');
        el.toggleSeq.classList.toggle('active', this._searchMode === 'secuencial');
        el.toggleBin.classList.toggle('active', this._searchMode === 'binaria');

        el.dataType.disabled = true;
        el.keyLength.disabled = true;
        el.range.disabled = true;
        el.blocksPerBucket.disabled = true;
        el.keysPerBlock.disabled = true;
        el.toggleSearchMode.style.pointerEvents = 'none';
        el.toggleSearchMode.style.opacity = '0.5';
        el.btnCreate.disabled = true;
        el.btnLoad.disabled = true;

        el.inputKey.disabled = false;
        el.btnInsert.disabled = false;
        el.btnDelete.disabled = false;
        el.btnSearch.disabled = false;
        el.btnSave.disabled = false;
        el.btnPrint.disabled = false;

        el.hashBlockArea.style.display = '';
        el.logWrapper.style.display = '';

        this._setExtraConfigFromData(data.structure);
        this._disableExtraConfig();
        this._updateSegmentationMaxHeight();
        this._renderAll();
        this._setOperation('load');
        this._addLog('Estructura hash cargada desde archivo.', 'success');
    }

    _onInsert() {
        const el = this.elements;
        const rawValue = el.inputKey.value;
        const result = this.bucketStructure.insert(rawValue);

        if (!result.success) {
            Validation.showError(result.error, el.inputKey);
            return;
        }

        this._setOperation('insert');
        this._renderAll();

        // Scroll to the affected elements
        this._scrollToBucket(result.bucketIndex);
        if (result.isCollision) {
            this._scrollToCollisionBlock(result.bucketIndex);
        } else {
            this._scrollToBlock(result.bucketIndex, result.blockIndex);
        }

        let message = `Clave "${this.bucketStructure._prepareKey(rawValue)}" insertada`;
        if (result.isCollision) {
            message += ` en bloque de colisión (BC - ${result.bucketIndex})`;
        } else {
            message += ` en B${result.blockIndex + 1} - ${result.bucketIndex}`;
        }
        message += ` usando ${result.formula}.`;

        if (result.isCollision) {
            this._addLog(message, 'warning');
        } else {
            this._addLog(message, 'success');
        }

        el.inputKey.value = '';
        el.inputKey.focus();
    }

    async _onSearch() {
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
        if (this.bucketStructure.count === 0) {
            Validation.showWarning('La estructura está vacía. Inserte claves antes de buscar.');
            return;
        }

        this._setOperation('search');
        const displayKey = this._displayKey(key);
        const result = this.bucketStructure.search(key);

        this._clearHighlights();
        this.isSearchAnimating = true;
        el.btnSearch.disabled = true;
        el.btnInsert.disabled = true;
        el.btnDelete.disabled = true;

        this._addLog(`Buscando clave "${displayKey}" usando ${result.formula}...`, 'info');

        await this._animateSearch(result, displayKey);

        this.isSearchAnimating = false;
        el.btnSearch.disabled = false;
        el.btnInsert.disabled = false;
        el.btnDelete.disabled = false;
        el.inputKey.value = '';
        el.inputKey.focus();
    }

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
        if (this.bucketStructure.count === 0) {
            Validation.showWarning('La estructura está vacía.');
            return;
        }

        const displayKey = this._displayKey(key);
        // First search to get animation steps
        const searchResult = this.bucketStructure.search(key);

        this._clearHighlights();
        this.isSearchAnimating = true;
        el.btnSearch.disabled = true;
        el.btnInsert.disabled = true;
        el.btnDelete.disabled = true;

        this._setOperation('delete');
        this._addLog(`Buscando clave "${displayKey}" para eliminar usando ${searchResult.formula}...`, 'info');

        // Animate the search
        await this._animateSearch(searchResult, displayKey);

        if (!searchResult.found) {
            this.isSearchAnimating = false;
            el.btnSearch.disabled = false;
            el.btnInsert.disabled = false;
            el.btnDelete.disabled = false;
            el.inputKey.value = '';
            el.inputKey.focus();
            return;
        }

        // Now actually delete
        const deleteResult = this.bucketStructure.delete(key);

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

        // Brief delete highlight
        this._addLog(`Clave "${displayKey}" encontrada. Eliminando...`, 'warning');
        await new Promise(r => setTimeout(r, 600));

        this._renderAll();
        this._clearHighlights();
        this.isSearchAnimating = false;
        el.btnSearch.disabled = false;
        el.btnInsert.disabled = false;
        el.btnDelete.disabled = false;

        let delMsg = `Clave "${displayKey}" borrada`;
        if (deleteResult.isCollision) {
            delMsg += ` del bloque de colisión (BC - ${deleteResult.bucketIndex})`;
        } else {
            delMsg += ` de B${deleteResult.blockIndex + 1} - ${deleteResult.bucketIndex}`;
        }
        delMsg += '.';
        this._addLog(delMsg, 'success');
        el.inputKey.value = '';
        el.inputKey.focus();
    }

    async _onSave() {
        if (!this.bucketStructure.created) {
            Validation.showError('No hay estructura creada para guardar.');
            return;
        }
        const data = {
            algorithm: this._algorithmName,
            timestamp: new Date().toISOString(),
            structure: this.bucketStructure.toJSON()
        };
        const jsonString = JSON.stringify(data, null, 2);
        const defaultName = `${this._algorithmName || 'ext-hash'}_${Date.now()}.json`;
        await FileManager.saveJSON(jsonString, defaultName);
    }

    // ──────────────────────────────────────────
    // Rendering
    // ──────────────────────────────────────────

    _renderAll() {
        this._renderBucketDirectory();
        this._renderBlocks();
        this._renderCollisionArea();
    }

    /**
     * Renders the bucket directory table (left column).
     */
    _renderBucketDirectory() {
        const tbody = this.elements.bucketDirectoryBody;
        tbody.innerHTML = '';

        const n = this.bucketStructure.numBuckets;
        const useCompact = this._shouldUseCompactDirectory();

        if (!useCompact) {
            // Normal mode — show all buckets
            for (let i = 0; i < n; i++) {
                this._appendBucketRow(tbody, i);
            }
        } else {
            // Compact mode: show first, last, and any bucket that has blocks
            const visible = new Set();
            visible.add(0);
            visible.add(n - 1);
            for (let i = 0; i < n; i++) {
                if (this.bucketStructure.buckets[i].blocks.length > 0) visible.add(i);
                if (this.bucketStructure.buckets[i].collisionBlock) visible.add(i);
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
                this._appendBucketRow(tbody, pos);
                lastRendered = pos;
            }
        }
    }

    /** Appends a single bucket row to the directory table. */
    _appendBucketRow(tbody, i) {
        const bucket = this.bucketStructure.buckets[i];
        const tr = document.createElement('tr');
        tr.dataset.bucket = i;

        const tdPos = document.createElement('td');
        tdPos.textContent = i;

        const tdBlocks = document.createElement('td');
        if (bucket.blocks.length === 0) {
            tdBlocks.textContent = '-';
            tdBlocks.classList.add('empty-cell');
        } else {
            tdBlocks.textContent = bucket.blocks.map((_, idx) => `B${idx + 1}`).join(', ');
        }

        tr.appendChild(tdPos);
        tr.appendChild(tdBlocks);
        tbody.appendChild(tr);
    }

    /**
     * Sets the hash-block-area to 70% and the log to 30% of available space.
     */
    _updateSegmentationMaxHeight() {
        const el = this.elements;
        const area = el.hashBlockArea;
        const logW = el.logWrapper;
        if (!area || !logW) return;

        // Reset to measure fixed elements
        area.style.height = '';
        area.style.flex = '';
        logW.style.height = '';
        logW.style.flex = '';

        const viewEl = this.container;
        const viewH = viewEl.getBoundingClientRect().height;

        // Subtract non-flexible elements (title, top row, footer)
        let fixedH = 0;
        for (const child of viewEl.children) {
            if (child === area || child === logW) continue;
            fixedH += child.getBoundingClientRect().height;
        }
        const gaps = 20 * (viewEl.children.length - 1);
        const available = viewH - fixedH - gaps;

        if (available > 0) {
            const areaH = Math.floor(available * 0.7);
            const logH = Math.floor(available * 0.3);
            area.style.height = areaH + 'px';
            area.style.flex = '0 0 ' + areaH + 'px';
            logW.style.height = logH + 'px';
            logW.style.flex = '0 0 ' + logH + 'px';
        }
    }

    /**
     * Determines if bucket directory should use compact mode.
     */
    _shouldUseCompactDirectory() {
        const rowHeight = 26;
        const headerHeight = 36;

        const area = this.elements.hashBlockArea;
        if (!area) return false;

        const areaH = area.getBoundingClientRect().height;
        const usableH = areaH - headerHeight - 30; // section title + table header

        const totalNeeded = this.bucketStructure.numBuckets * rowHeight;
        return totalNeeded > usableH;
    }

    /**
     * Determines if blocks should use compact mode.
     */
    _shouldUseCompactBlocks() {
        const rowHeight = 30;
        const headerHeight = 40;

        const area = this.elements.hashBlockArea;
        if (!area) return false;

        const areaH = area.getBoundingClientRect().height;
        const usableH = areaH - headerHeight - 30; // section title + block header

        const totalNeeded = this.bucketStructure.keysPerBlock * rowHeight + headerHeight;
        return totalNeeded > usableH;
    }

    /**
     * Renders the block segmentation (center column).
     */
    _renderBlocks() {
        const container = this.elements.blockSegContent;
        container.innerHTML = '';

        const useCompact = this._shouldUseCompactBlocks();

        for (let i = 0; i < this.bucketStructure.numBuckets; i++) {
            const bucket = this.bucketStructure.buckets[i];
            for (let b = 0; b < bucket.blocks.length; b++) {
                const block = bucket.blocks[b];
                const col = document.createElement('div');
                col.classList.add('block-column');
                col.dataset.bucket = i;
                col.dataset.block = b;

                const header = document.createElement('div');
                header.classList.add('block-column-header');
                header.textContent = `B${b + 1} - ${i}`;
                col.appendChild(header);

                const tableWrap = document.createElement('div');
                tableWrap.classList.add('block-table-scroll');

                const table = document.createElement('table');
                table.classList.add('block-table');

                const thead = document.createElement('thead');
                thead.innerHTML = '<tr><th>Pos</th><th>Clave</th></tr>';
                table.appendChild(thead);

                const tbody = document.createElement('tbody');

                if (!useCompact) {
                    // Normal mode
                    for (let k = 0; k < this.bucketStructure.keysPerBlock; k++) {
                        const tr = document.createElement('tr');
                        tr.dataset.bucket = i;
                        tr.dataset.block = b;
                        tr.dataset.keyIndex = k;

                        const tdPos = document.createElement('td');
                        tdPos.textContent = k + 1;
                        const tdKey = document.createElement('td');

                        if (block.keys[k] !== null) {
                            tdKey.textContent = block.keys[k];
                        } else {
                            tdKey.textContent = '-';
                            tdKey.classList.add('empty-cell');
                        }

                        tr.appendChild(tdPos);
                        tr.appendChild(tdKey);
                        tbody.appendChild(tr);
                    }
                } else {
                    // Compact mode
                    const visible = new Set();
                    visible.add(0);
                    visible.add(this.bucketStructure.keysPerBlock - 1);
                    for (let k = 0; k < this.bucketStructure.keysPerBlock; k++) {
                        if (block.keys[k] !== null) visible.add(k);
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
                        tr.dataset.bucket = i;
                        tr.dataset.block = b;
                        tr.dataset.keyIndex = pos;

                        const tdPos = document.createElement('td');
                        tdPos.textContent = pos + 1;
                        const tdKey = document.createElement('td');

                        if (block.keys[pos] !== null) {
                            tdKey.textContent = block.keys[pos];
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
        }

        // Empty-state placeholder
        if (container.children.length === 0) {
            const msg = document.createElement('div');
            msg.className = 'block-empty-placeholder';
            msg.textContent = 'Inserte claves para visualizar los bloques';
            container.appendChild(msg);
        }
    }

    /**
     * Renders the collision area (right column).
     * Collision blocks are NEVER compact.
     */
    _renderCollisionArea() {
        const container = this.elements.collisionAreaContent;
        container.innerHTML = '';

        let hasCollisions = false;
        for (let i = 0; i < this.bucketStructure.numBuckets; i++) {
            const bucket = this.bucketStructure.buckets[i];
            if (!bucket.collisionBlock || bucket.collisionBlock.count === 0) continue;
            hasCollisions = true;

            const col = document.createElement('div');
            col.classList.add('block-column', 'collision-block');
            col.dataset.bucket = i;
            col.dataset.collision = 'true';

            const header = document.createElement('div');
            header.classList.add('block-column-header', 'collision-header');
            header.textContent = `BC - ${i}`;
            col.appendChild(header);

            const tableWrap = document.createElement('div');
            tableWrap.classList.add('block-table-scroll');

            const table = document.createElement('table');
            table.classList.add('block-table');

            const thead = document.createElement('thead');
            thead.innerHTML = '<tr><th>Pos</th><th>Clave</th></tr>';
            table.appendChild(thead);

            const tbody = document.createElement('tbody');

            for (let k = 0; k < bucket.collisionBlock.count; k++) {
                const tr = document.createElement('tr');
                tr.dataset.bucket = i;
                tr.dataset.collision = 'true';
                tr.dataset.keyIndex = k;

                const tdPos = document.createElement('td');
                tdPos.textContent = k + 1;
                const tdKey = document.createElement('td');
                tdKey.textContent = bucket.collisionBlock.keys[k];

                tr.appendChild(tdPos);
                tr.appendChild(tdKey);
                tbody.appendChild(tr);
            }

            table.appendChild(tbody);
            tableWrap.appendChild(table);
            col.appendChild(tableWrap);
            container.appendChild(col);
        }

        if (!hasCollisions) {
            const msg = document.createElement('div');
            msg.className = 'block-empty-placeholder';
            msg.textContent = 'Sin colisiones';
            container.appendChild(msg);
        }
    }

    // ──────────────────────────────────────────
    // Animations
    // ──────────────────────────────────────────

    /**
     * Animates the search step by step.
     */
    _animateSearch(result, displayKey) {
        return new Promise((resolve) => {
            const steps = result.steps;
            let stepIndex = 0;

            const animateStep = () => {
                if (stepIndex >= steps.length) {
                    if (!result.found) {
                        this._addLog(`✘ Clave "${displayKey}" no encontrada. Se revisaron ${steps.length} paso(s).`, 'error');
                    }
                    resolve();
                    return;
                }

                const step = steps[stepIndex];
                const delay = Math.max(300, Math.min(800, 5000 / Math.max(steps.length, 1)));

                if (step.type === 'bucket-empty') {
                    this._highlightBucketRow(step.bucketIndex, 'highlight-not-found');
                    this._scrollToBucket(step.bucketIndex);
                    this._addLog(`  Cubeta ${step.bucketIndex}: Vacía (sin bloques).`, 'error');
                    stepIndex++;
                    setTimeout(() => {
                        this._addLog(`✘ Clave "${displayKey}" no encontrada.`, 'error');
                        resolve();
                    }, delay);
                    return;
                }

                if (step.type === 'block-seq' || step.type === 'block-binary') {
                    const bIdx = step.blockIndex !== undefined ? step.blockIndex : step.mid;
                    this._highlightBucketRow(step.bucketIndex, 'highlight-checking');

                    if (step.action === 'skip-block' || step.action === 'discard-left') {
                        const blockEl = this._findBlockEl(step.bucketIndex, bIdx);
                        if (blockEl) {
                            blockEl.classList.add('block-skipped');
                            this._scrollElementIntoView(blockEl, this.elements.blockSegScroll);
                        }
                        this._addLog(`  B${bIdx + 1} - ${step.bucketIndex}: último="${step.lastKey}" → Saltar`, 'info');
                        stepIndex++;
                        setTimeout(animateStep, delay);
                    } else if (step.action === 'enter-block' || step.action === 'discard-right') {
                        const blockEl = this._findBlockEl(step.bucketIndex, bIdx);
                        if (blockEl) {
                            blockEl.classList.add('block-active');
                            this._scrollElementIntoView(blockEl, this.elements.blockSegScroll);
                        }
                        this._addLog(`  B${bIdx + 1} - ${step.bucketIndex}: último="${step.lastKey}" → Entrar`, 'success');
                        stepIndex++;
                        setTimeout(animateStep, delay);
                    } else if (step.action === 'found-at-boundary') {
                        const blockEl = this._findBlockEl(step.bucketIndex, bIdx);
                        if (blockEl) {
                            blockEl.classList.add('block-active');
                            this._scrollElementIntoView(blockEl, this.elements.blockSegScroll);
                        }
                        this._highlightBucketRow(step.bucketIndex, 'highlight-found');
                        // Highlight the actual key row (last occupied position in the block)
                        const bucket = this.bucketStructure.buckets[step.bucketIndex];
                        const block = bucket.blocks[bIdx];
                        if (block) {
                            const lastKeyIdx = block.count - 1;
                            const row = this._findKeyRow(step.bucketIndex, bIdx, lastKeyIdx, false);
                            if (row) {
                                row.classList.add('highlight-found');
                                this._scrollRowIntoView(row);
                            }
                        }
                        this._addLog(`✔ Clave "${displayKey}" encontrada en B${bIdx + 1} - ${step.bucketIndex}. Pasos: ${steps.length}.`, 'success');
                        stepIndex++;
                        setTimeout(resolve, delay);
                        return;
                    }
                    return;
                }

                if (step.type === 'enter-collision') {
                    this._scrollToCollisionBlock(step.bucketIndex);
                    this._addLog(`  → Buscando en bloque de colisión BC - ${step.bucketIndex}...`, 'info');
                    stepIndex++;
                    setTimeout(animateStep, delay);
                    return;
                }

                if (step.type === 'inner-seq' || step.type === 'inner-binary') {
                    const keyIdx = step.index !== undefined ? step.index : step.mid;
                    const row = this._findKeyRow(step.bucketIndex, step.blockIndex, keyIdx, step.isCollision);
                    if (row) {
                        row.classList.add('highlight-checking');
                        this._scrollRowIntoView(row);
                    }

                    if (step.action === 'found') {
                        // Also highlight the parent block column
                        if (!step.isCollision) {
                            const blockEl = this._findBlockEl(step.bucketIndex, step.blockIndex);
                            if (blockEl) {
                                blockEl.classList.add('block-active');
                                this._scrollElementIntoView(blockEl, this.elements.blockSegScroll);
                            }
                        }
                        this._highlightBucketRow(step.bucketIndex, 'highlight-found');
                        const blockLabel = step.isCollision ? `BC - ${step.bucketIndex}` : `B${step.blockIndex + 1} - ${step.bucketIndex}`;
                        this._addLog(`✔ Clave "${displayKey}" encontrada en ${blockLabel}, pos ${keyIdx + 1}. Pasos: ${steps.length}.`, 'success');
                        setTimeout(() => {
                            if (row) {
                                row.classList.remove('highlight-checking');
                                row.classList.add('highlight-found');
                            }
                            resolve();
                        }, delay);
                        return;
                    } else {
                        const theKey = step.key || step.midKey || '?';
                        this._addLog(`  Pos ${(step.index !== undefined ? step.index : step.mid) + 1}: "${theKey}" → no coincide`, 'info');
                        stepIndex++;
                        setTimeout(() => {
                            if (row) row.classList.remove('highlight-checking');
                            animateStep();
                        }, delay);
                    }
                    return;
                }

                // Unknown step type — skip
                stepIndex++;
                setTimeout(animateStep, delay);
            };

            animateStep();
        });
    }

    // ──────────────────────────────────────────
    // Highlight / Find helpers
    // ──────────────────────────────────────────

    _clearHighlights() {
        const highlights = ['highlight-checking', 'highlight-found', 'highlight-not-found',
            'highlight-deleting', 'highlight-discarded', 'highlight-mid', 'fade-out',
            'block-active', 'block-skipped'];

        // Bucket directory
        this.elements.bucketDirectoryBody.querySelectorAll('tr').forEach(el => {
            highlights.forEach(cls => el.classList.remove(cls));
        });

        // Block segmentation
        this.elements.blockSegContent.querySelectorAll('tr, .block-column').forEach(el => {
            highlights.forEach(cls => el.classList.remove(cls));
        });

        // Collision area
        this.elements.collisionAreaContent.querySelectorAll('tr, .block-column').forEach(el => {
            highlights.forEach(cls => el.classList.remove(cls));
        });
    }

    _highlightBucketRow(bucketIndex, className) {
        const row = this.elements.bucketDirectoryBody.querySelector(`tr[data-bucket="${bucketIndex}"]`);
        if (row) {
            row.classList.add(className);
            this._scrollToBucket(bucketIndex);
        }
    }

    _findBlockEl(bucketIndex, blockIndex) {
        return this.elements.blockSegContent.querySelector(
            `.block-column[data-bucket="${bucketIndex}"][data-block="${blockIndex}"]`
        );
    }

    _findKeyRow(bucketIndex, blockIndex, keyIndex, isCollision) {
        if (isCollision) {
            return this.elements.collisionAreaContent.querySelector(
                `tr[data-bucket="${bucketIndex}"][data-collision="true"][data-key-index="${keyIndex}"]`
            );
        }
        return this.elements.blockSegContent.querySelector(
            `tr[data-bucket="${bucketIndex}"][data-block="${blockIndex}"][data-key-index="${keyIndex}"]`
        );
    }

    _scrollRowIntoView(row) {
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

    /** Scrolls the bucket directory to show the given bucket row. */
    _scrollToBucket(bucketIndex) {
        const row = this.elements.bucketDirectoryBody.querySelector(`tr[data-bucket="${bucketIndex}"]`);
        if (!row) return;
        const scroll = row.closest('.bucket-directory-scroll');
        if (!scroll) return;
        // Account for sticky header (approx 30px)
        const headerOffset = 30;
        const rowTop = row.offsetTop;
        const rowH = row.offsetHeight;
        const scrollH = scroll.clientHeight;
        scroll.scrollTo({
            top: rowTop - headerOffset - (scrollH / 2) + (rowH / 2),
            behavior: 'smooth'
        });
    }

    /** Scrolls the block segmentation to show a specific block column. */
    _scrollToBlock(bucketIndex, blockIndex) {
        const blockEl = this._findBlockEl(bucketIndex, blockIndex);
        if (!blockEl) return;
        blockEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }

    /** Scrolls the collision area to show a specific collision block. */
    _scrollToCollisionBlock(bucketIndex) {
        const col = this.elements.collisionAreaContent.querySelector(
            `.block-column[data-bucket="${bucketIndex}"][data-collision="true"]`
        );
        if (!col) return;
        col.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    /** Scrolls a generic element into view within a scrollable parent. */
    _scrollElementIntoView(el, scrollParent) {
        if (!el) return;
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }

    // ──────────────────────────────────────────
    // Log System
    // ──────────────────────────────────────────

    _setOperation(operation) {
        const keepLog = operation === 'insert' && this._lastOperation === 'insert';
        if (!keepLog && !this._showFullHistory) {
            this.elements.logContent.innerHTML = '';
        }
        this._lastOperation = operation;
    }

    _addLog(message, type = 'info') {
        this.logMessages.push({ message, type, time: new Date(), operation: this._lastOperation });
        const logContent = this.elements.logContent;
        const entry = document.createElement('div');
        entry.classList.add('log-entry', `log-${type}`);
        entry.textContent = message;
        logContent.appendChild(entry);
        logContent.scrollTop = logContent.scrollHeight;
    }

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

    _displayKey(key) {
        if (this.bucketStructure.dataType === 'numerico' && /^\d+$/.test(key) && key.length < this.bucketStructure.keyLength) {
            return key.padStart(this.bucketStructure.keyLength, '0');
        }
        return key;
    }
}
