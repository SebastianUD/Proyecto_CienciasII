/**
 * @fileoverview Vista para Índices en Archivos (Búsquedas Externas).
 * @module views/IndicesView
 */
class IndicesView {
    constructor(containerEl) {
        this.container = containerEl;
        this.model = new IndicesModel();
        this.elements = {};
        this._algorithmName = 'ext-indices';
        this._offsetX = 0;
        this._offsetY = 0;
        this._scale = 1;
        this._isPanning = false;
        this._panStartX = 0;
        this._panStartY = 0;
    }

    show() { this.render('Índices en Archivos'); }

    render(title) {
        this.container.innerHTML = '';
        this.container.classList.remove('hidden');
        const welcome = document.getElementById('welcome-screen');
        if (welcome) welcome.classList.add('hidden');

        this.container.innerHTML = `
            <div class="algo-title">${title}</div>
            <div class="indices-config-row">
                <div class="section-title">Configuración de la Estructura</div>
                <div class="config-panel">
                    <div class="config-fields">
                        <div class="config-group">
                            <label for="idx-type">Tipo de Índice</label>
                            <select id="idx-type">
                                <option value="">-- Seleccione --</option>
                                <option value="primario">Índice Primario (No Denso)</option>
                                <option value="secundario">Índice Secundario (Denso)</option>
                                <option value="multinivel-primario">Multinivel Primario (No Denso)</option>
                                <option value="multinivel-secundario">Multinivel Secundario (Denso)</option>
                            </select>
                        </div>
                        <div class="config-group">
                            <label for="idx-r">r (Registros)</label>
                            <input type="number" id="idx-r" min="1" placeholder="Ej: 500000">
                        </div>
                        <div class="config-group">
                            <label for="idx-B">B (Tamaño Bloque)</label>
                            <input type="number" id="idx-B" min="1" placeholder="Ej: 4096">
                        </div>
                        <div class="config-group">
                            <label for="idx-R">R (Long. Registro)</label>
                            <input type="number" id="idx-R" min="1" placeholder="Ej: 120">
                        </div>
                        <div class="config-group">
                            <label for="idx-Ri">Ri (Long. Reg. Índice)</label>
                            <input type="number" id="idx-Ri" min="1" placeholder="Ej: 15">
                        </div>
                    </div>
                    <div class="config-buttons">
                        <button class="btn btn-primary" id="idx-btn-create">CREAR</button>
                        <button class="btn btn-info" id="idx-btn-load">CARGAR</button>
                        <button class="btn btn-secondary" id="idx-btn-clear">LIMPIAR</button>
                    </div>
                </div>
            </div>
            <div class="indices-results-area" id="idx-results-area" style="display:none;">
                <div class="indices-table-wrapper" id="idx-table-wrapper">
                    <div class="section-title" style="background-color:var(--bg-main);color:var(--text-secondary);justify-content:center;">Tabla de Cálculos</div>
                    <div class="indices-table-scroll" id="idx-table-scroll">
                        <div id="idx-tables-container"></div>
                    </div>
                </div>
                <div class="indices-canvas-wrapper">
                    <canvas id="idx-canvas"></canvas>
                    <button class="tree-fit-btn" id="idx-btn-fit" title="Ajustar vista">⊞</button>
                </div>
            </div>
            <div class="footer-buttons">
                <button class="btn btn-success" id="idx-btn-save" disabled>GUARDAR</button>
                <button class="btn btn-primary" id="idx-btn-print" disabled>IMPRIMIR</button>
            </div>`;
        this._cacheElements();
        this._bindEvents();
    }

    _cacheElements() {
        this.elements = {
            indexType: document.getElementById('idx-type'),
            inputR: document.getElementById('idx-r'),
            inputB: document.getElementById('idx-B'),
            inputR2: document.getElementById('idx-R'),
            inputRi: document.getElementById('idx-Ri'),
            btnCreate: document.getElementById('idx-btn-create'),
            btnLoad: document.getElementById('idx-btn-load'),
            btnClear: document.getElementById('idx-btn-clear'),
            btnSave: document.getElementById('idx-btn-save'),
            btnPrint: document.getElementById('idx-btn-print'),
            btnFit: document.getElementById('idx-btn-fit'),
            resultsArea: document.getElementById('idx-results-area'),
            tablesContainer: document.getElementById('idx-tables-container'),
            canvas: document.getElementById('idx-canvas')
        };
    }

    _bindEvents() {
        const el = this.elements;
        el.btnCreate.addEventListener('click', () => this._onCreate());
        el.btnClear.addEventListener('click', () => this._onClear());
        el.btnLoad.addEventListener('click', () => this._onLoad());
        el.btnSave.addEventListener('click', () => this._onSave());
        el.btnPrint.addEventListener('click', () => FileManager.print());
        el.btnFit.addEventListener('click', () => this._fitToView());
        el.indexType.addEventListener('change', () => {
            if (this.model.created) this._onSwitchType();
        });
        const canvas = el.canvas;
        canvas.addEventListener('mousedown', e => this._onMouseDown(e));
        canvas.addEventListener('mousemove', e => this._onMouseMove(e));
        canvas.addEventListener('mouseup', () => this._onMouseUp());
        canvas.addEventListener('mouseleave', () => this._onMouseUp());
        canvas.addEventListener('wheel', e => this._onWheel(e), { passive: false });
        this._resizeObserver = new ResizeObserver(() => {
            this._resizeCanvas();
            if (this.model.created) this._drawStructure();
        });
        this._resizeObserver.observe(canvas.parentElement);
    }

    // ─── Switch type ───────────────────────────────────────────────────────────
    _onSwitchType() {
        const newType = this.elements.indexType.value;
        if (!newType) return;
        const { r, B, R, Ri } = this.model;
        this.model.reset();
        const result = this.model.create(newType, r, B, R, Ri);
        if (!result.success) { Validation.showError(result.error); return; }
        this._renderCalcTables();
        this._resizeCanvas();
        this._fitToView();
    }

    // ─── Pan & Zoom ────────────────────────────────────────────────────────────
    _onMouseDown(e) { this._isPanning = true; this._panStartX = e.clientX - this._offsetX; this._panStartY = e.clientY - this._offsetY; this.elements.canvas.style.cursor = 'grabbing'; }
    _onMouseMove(e) { if (!this._isPanning) return; this._offsetX = e.clientX - this._panStartX; this._offsetY = e.clientY - this._panStartY; if (this.model.created) this._drawStructure(); }
    _onMouseUp() { this._isPanning = false; this.elements.canvas.style.cursor = 'grab'; }
    _onWheel(e) {
        e.preventDefault();
        const rect = this.elements.canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left, my = e.clientY - rect.top;
        const f = e.deltaY < 0 ? 1.1 : 0.9;
        const ns = Math.max(0.05, Math.min(5, this._scale * f));
        this._offsetX = mx - (mx - this._offsetX) * (ns / this._scale);
        this._offsetY = my - (my - this._offsetY) * (ns / this._scale);
        this._scale = ns;
        if (this.model.created) this._drawStructure();
    }
    _resizeCanvas() { const c = this.elements.canvas, p = c.parentElement; c.width = p.clientWidth; c.height = p.clientHeight; }

    _fitToView() {
        if (!this.model.created) return;
        const c = this.elements.canvas, b = this._getStructureBounds();
        if (!b) { this._offsetX = 0; this._offsetY = 0; this._scale = 1; this._drawStructure(); return; }
        const pad = 50, sw = b.maxX - b.minX + pad * 2, sh = b.maxY - b.minY + pad * 2;
        this._scale = Math.min(c.width / sw, c.height / sh, 2);
        this._offsetX = c.width / 2 - ((b.minX + b.maxX) / 2) * this._scale;
        this._offsetY = c.height / 2 - ((b.minY + b.maxY) / 2) * this._scale;
        this._drawStructure();
    }

    // ─── Operations ────────────────────────────────────────────────────────────
    _onCreate() {
        if (this.model.created) { Validation.showWarning('Ya existe una estructura activa. Debe limpiarla antes de crear una nueva.'); return; }
        const el = this.elements;
        const result = this.model.create(el.indexType.value, parseInt(el.inputR.value), parseInt(el.inputB.value), parseInt(el.inputR2.value), parseInt(el.inputRi.value));
        if (!result.success) { Validation.showError(result.error); return; }
        this._afterCreate();
    }

    _afterCreate() {
        const el = this.elements;
        el.inputR.disabled = true; el.inputB.disabled = true; el.inputR2.disabled = true; el.inputRi.disabled = true;
        el.btnCreate.disabled = true; el.btnLoad.disabled = true;
        el.btnSave.disabled = false; el.btnPrint.disabled = false;
        el.resultsArea.style.display = '';
        this._renderCalcTables();
        this._resizeCanvas();
        this._fitToView();
    }

    async _onClear() {
        if (this.model.created) { const ok = await Validation.confirm('Se eliminará la estructura actual. ¿Desea continuar?'); if (!ok) return; }
        this.model.reset();
        const el = this.elements;
        el.indexType.value = ''; el.indexType.disabled = false;
        el.inputR.value = ''; el.inputR.disabled = false;
        el.inputB.value = ''; el.inputB.disabled = false;
        el.inputR2.value = ''; el.inputR2.disabled = false;
        el.inputRi.value = ''; el.inputRi.disabled = false;
        el.btnCreate.disabled = false; el.btnLoad.disabled = false;
        el.btnSave.disabled = true; el.btnPrint.disabled = true;
        el.resultsArea.style.display = 'none';
        el.tablesContainer.innerHTML = '';
        this._offsetX = 0; this._offsetY = 0; this._scale = 1;
    }

    async _onLoad() {
        if (this.model.created) { Validation.showWarning('Ya existe una estructura activa. Debe limpiarla antes de cargar otra.'); return; }
        const data = await new Promise(resolve => {
            const input = document.createElement('input'); input.type = 'file'; input.accept = '.json';
            input.onchange = e => {
                const f = e.target.files[0]; if (!f) { resolve(null); return; }
                const reader = new FileReader();
                reader.onload = ev => { try { resolve(JSON.parse(ev.target.result)); } catch { Validation.showError('Error al leer el archivo JSON.'); resolve(null); } };
                reader.readAsText(f);
            };
            input.click();
        });
        if (!data) return;
        if (data.algorithm && !FileCompat.areCompatible(data.algorithm, this._algorithmName)) { Validation.showError(`Este archivo fue creado para "${data.algorithm}" y no es compatible con esta vista.`); return; }
        if (!data.structure || !data.structure.indexType) { Validation.showError('El archivo no tiene un formato válido para índices.'); return; }
        this.model.fromJSON(data.structure);
        const el = this.elements;
        el.indexType.value = data.structure.indexType;
        el.inputR.value = data.structure.r; el.inputB.value = data.structure.B;
        el.inputR2.value = data.structure.R; el.inputRi.value = data.structure.Ri;
        this._afterCreate();
    }

    async _onSave() {
        if (!this.model.created) return;
        const data = { algorithm: this._algorithmName, timestamp: new Date().toISOString(), structure: this.model.toJSON() };
        await FileManager.saveJSON(JSON.stringify(data, null, 2), `${this._algorithmName}_${Date.now()}.json`);
    }

    // ─── Calculations: 3 separate tables ──────────────────────────────────────
    _renderCalcTables() {
        const container = this.elements.tablesContainer;
        container.innerHTML = '';
        const res = this.model.results, { r, B, R, Ri, indexType } = this.model;
        const typeName = {
            'primario': 'Índice Primario',
            'secundario': 'Índice Secundario',
            'multinivel-primario': 'Índice Multinivel Primario',
            'multinivel-secundario': 'Índice Multinivel Secundario'
        }[indexType];

        // ── Table 1: Parámetros Iniciales (no Fórmula column) ──
        const t1rows = [
            { label: 'r (Registros del Archivo)', value: r.toLocaleString() },
            { label: 'B (Tamaño Bloque)', value: `${B.toLocaleString()} bytes` },
            { label: 'R (Long. Registro Dato)', value: `${R.toLocaleString()} bytes` },
            { label: 'Ri (Long. Registro Índice)', value: `${Ri.toLocaleString()} bytes` }
        ];
        container.appendChild(this._makeTable('Parámetros Iniciales', ['Concepto', 'Valor'], t1rows, false));

        // ── Table 2: Estructura de Datos ──
        const t2rows = [
            { label: 'bfr (Registros Dato × Bloque)', value: res.bfr.toLocaleString(), formula: `⌊B/R⌋ = ⌊${B}/${R}⌋` },
            { label: 'b (Bloques Registro Dato)', value: res.b.toLocaleString(), formula: `⌈r/bfr⌉ = ⌈${r.toLocaleString()}/${res.bfr}⌉` },
            { label: 'Accesos Estructura Datos (Sin Índice)', value: `${res.accessData} accesos`, formula: `⌈log₂(b)⌉ = ⌈log₂(${res.b.toLocaleString()})⌉` }
        ];
        container.appendChild(this._makeTable('Cálculos de la Estructura de Datos (Archivo Principal)', ['Concepto', 'Valor', 'Fórmula'], t2rows, true));

        // ── Table 3: Índice (type-specific) ──
        const t3rows = [
            { label: 'bfri / fo (Entradas Índice × Bloque)', value: res.bfri.toLocaleString(), formula: `⌊B/Ri⌋ = ⌊${B}/${Ri}⌋` }
        ];
        if (!res.isMultilevel) {
            t3rows.push({ label: 'bi (Bloques Índice)', value: res.bi.toLocaleString(), formula: `⌈${res.isDense ? 'r' : 'b'}/bfri⌉ = ⌈${res.ri.toLocaleString()}/${res.bfri}⌉` });
            t3rows.push({ label: 'Total Accesos', value: `${res.totalAccess} accesos`, formula: `⌈log₂(bi)⌉ + 1 = ⌈log₂(${res.bi})⌉ + 1 = ${res.accessIndex} + 1` });
        } else {
            for (const lvl of res.levels) {
                const prev = lvl.level === 1 ? res.ri : res.levels[lvl.level - 2].bi;
                t3rows.push({ label: `Nivel ${lvl.level} (Bloques Índice)`, value: lvl.bi.toLocaleString(), formula: `⌈${prev.toLocaleString()}/${res.bfri}⌉` });
            }
            const tFormula = `⌈log\u2099 ${res.bfri}(${res.ri.toLocaleString()})⌉ = ${res.levels.length} Niveles`;
            t3rows.push({ label: 't (Número de Niveles)', value: `${res.levels.length} Niveles`, formula: tFormula });
            t3rows.push({ label: 'Total Accesos', value: `${res.totalAccess} accesos`, formula: `t + 1 = ${res.levels.length} + 1` });
        }
        container.appendChild(this._makeTable(typeName, ['Concepto', 'Valor', 'Fórmula'], t3rows, true));
    }

    /**
     * Creates a standalone <table> element with header and rows.
     * @param {string} title - Section title shown as a label above the table.
     * @param {string[]} headers - Column header names.
     * @param {Object[]} rows - Array of {label, value, formula?} objects.
     * @param {boolean} hasFormula - Whether to include a 3rd column.
     * @returns {HTMLElement} Wrapper div containing the table.
     */
    _makeTable(title, headers, rows, hasFormula) {
        const wrapper = document.createElement('div');
        wrapper.className = 'idx-subtable-wrapper';

        const titleEl = document.createElement('div');
        titleEl.className = 'idx-subtable-title';
        titleEl.textContent = title;
        wrapper.appendChild(titleEl);

        const table = document.createElement('table');
        table.className = 'data-table indices-calc-table';

        const thead = document.createElement('thead');
        const hRow = document.createElement('tr');
        headers.forEach(h => {
            const th = document.createElement('th');
            th.textContent = h;
            hRow.appendChild(th);
        });
        thead.appendChild(hRow);
        table.appendChild(thead);

        const tbody = document.createElement('tbody');
        for (const row of rows) {
            const tr = document.createElement('tr');
            const td1 = document.createElement('td'); td1.textContent = row.label; td1.className = 'idx-label-cell';
            const td2 = document.createElement('td'); td2.textContent = row.value; td2.className = 'idx-value-cell';
            tr.appendChild(td1); tr.appendChild(td2);
            if (hasFormula) {
                const td3 = document.createElement('td'); td3.textContent = row.formula || ''; td3.className = 'idx-formula-cell';
                tr.appendChild(td3);
            }
            tbody.appendChild(tr);
        }
        table.appendChild(tbody);
        wrapper.appendChild(table);
        return wrapper;
    }

    // ─── Canvas Drawing ────────────────────────────────────────────────────────
    _getStructureBounds() {
        if (!this.model.created) return null;
        const layout = this._computeLayout();
        const COL_W = layout.COL_W, GAP_X = layout.GAP_X;
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        for (const col of layout.columns) {
            // Only account for the column box itself — labels are inside the gap
            minX = Math.min(minX, col.x - 50);
            maxX = Math.max(maxX, col.x + col.width + 50);
            minY = Math.min(minY, col.y - 20);
            maxY = Math.max(maxY, col.y + col.totalH + 30);
        }
        return { minX, maxX, minY, maxY };
    }

    // ─── Entry Builders ────────────────────────────────────────────────────────
    /**
     * Build entries for an index column using 3-rows-per-block layout.
     * Types: block-first, block-mid, block-last, sep, waste, capacity
     * Layout per block: [first_rec | ... Blabel | last_rec]
     * Bi middle block shows null nums (abstract placeholder).
     */
    _buildColumnEntries(totalEntries, factor, totalBlocks) {
        const e = [];
        const startLast = (totalBlocks - 1) * factor + 1;
        const cap = totalBlocks * factor;
        const hasWaste = cap > totalEntries;
        // Helper: push a 3-row block
        const blk = (first, last, label) => {
            e.push({ type: 'block-first', num: first });
            e.push({ type: 'block-mid',   num: null, label });
            e.push({ type: 'block-last',  num: last });
        };
        if (totalBlocks === 1) {
            blk(1, totalEntries, 'B1');
        } else if (totalBlocks === 2) {
            blk(1, factor, 'B1');
            blk(factor + 1, totalEntries, 'B2');
        } else {
            blk(1, factor, 'B1');
            e.push({ type: 'sep' });
            blk(null, null, 'Bi');   // abstract middle block (no specific numbers)
            e.push({ type: 'sep' });
            blk(startLast, totalEntries, `B${totalBlocks}`);
        }
        if (hasWaste) e.push({ type: 'waste' });
        e.push({ type: 'capacity', num: cap });
        return e;
    }

    _buildDataEntries(res) {
        const { r } = this.model;
        const bfr = res.bfr, b = res.b;
        const cap = b * bfr, hasWaste = cap > r;
        const startLast = (b - 1) * bfr + 1;
        // Middle block: target of second arrow from index
        let midBlock;
        if (!res.isDense) {
            midBlock = res.bfri;                       // Primary: index Bi → data block bfri
        } else {
            midBlock = Math.ceil(res.bfri / bfr);      // Secondary: index record bfri → this block
        }
        const midFirst = (midBlock - 1) * bfr + 1;
        const midLast  = midBlock * bfr;
        const e = [];
        const blk = (first, last, label) => {
            e.push({ type: 'block-first', num: first });
            e.push({ type: 'block-mid',   num: null, label });
            e.push({ type: 'block-last',  num: last });
        };
        blk(1, bfr, 'B1');
        e.push({ type: 'sep' });
        blk(midFirst, midLast, `B${midBlock}`);
        e.push({ type: 'sep' });
        blk(startLast, r, `B${b}`);
        if (hasWaste) e.push({ type: 'waste' });
        e.push({ type: 'capacity', num: cap });
        return e;
    }

    // ─── Layout ────────────────────────────────────────────────────────────────
    _computeLayout() {
        const res = this.model.results;
        const { Ri, R } = this.model;
        const COL_W = 140, ROW_H = 22, GAP_X = 120;
        const columns = [], arrows = [];
        const makeCol = (x, title, sizeLabel, entries) => {
            const totalH = entries.length * ROW_H;
            columns.push({ x, y: 0, width: COL_W, totalH, title, sizeLabel, entries, ROW_H });
            return columns.length - 1;
        };
        if (!res.isMultilevel) {
            const idxE  = this._buildColumnEntries(res.ri, res.bfri, res.bi);
            const ci    = makeCol(0, 'Estructura Índice', `${Ri} bytes`, idxE);
            const dataE = this._buildDataEntries(res);
            const cd    = makeCol(COL_W + GAP_X, 'Estructura Datos', `${R} bytes`, dataE);
            this._buildArrows(arrows, ci, cd, idxE, dataE);
        } else {
            const totalLevels = res.levels.length;
            let cx = 0;
            for (let i = totalLevels - 1; i >= 0; i--) {
                const lvl          = res.levels[i];
                const entriesCount = i === 0 ? res.ri : res.levels[i - 1].bi;
                const levelE       = this._buildColumnEntries(entriesCount, res.bfri, lvl.bi);
                makeCol(cx, `Índice — Nivel ${i + 1}`, `${Ri} bytes`, levelE);
                cx += COL_W + GAP_X;
            }
            const dataE = this._buildDataEntries(res);
            makeCol(cx, 'Estructura Datos', `${R} bytes`, dataE);
            for (let ci = 0; ci < columns.length - 1; ci++) {
                this._buildSimpleArrows(arrows, ci, ci + 1, columns[ci].entries, columns[ci + 1].entries);
            }
        }
        return { columns, arrows, COL_W, GAP_X };
    }

    // ─── Arrow Builders ────────────────────────────────────────────────────────
    /**
     * Arrow row indices for 3-row-per-block layouts:
     *   bi > 2:  B1-mid=1, Bi-mid=5, B_last-mid=9
     *   bi = 2:  B1-mid=1, B2-mid=4
     *   bi = 1:  B1-mid=1
     * findLastBlockMidRow returns the index of the last block-mid entry.
     */
    _findLastBlockMidRow(entries) {
        for (let i = entries.length - 1; i >= 0; i--) {
            if (entries[i].type === 'block-mid') return i;
        }
        return 1;
    }

    _findLastBlockLastRow(entries) {
        for (let i = entries.length - 1; i >= 0; i--) {
            if (entries[i].type === 'block-last') return i;
        }
        return 2;
    }

    _hasSep(entries) { return entries.some(e => e.type === 'sep'); }

    /**
     * Build arrows connecting index record rows to data block-first rows.
     *
     * Pattern (bi > 2, source has sep):
     *   Arrow 1: fi=0  (B1 block-first, e.g. rec=1)    → ti=0 (data B1 block-first, rec=1)
     *   Arrow 2: fi=2  (B1 block-last,  e.g. rec=273)  → ti=4 (data Bmid block-first, rec=9249)
     *   Arrow 3: fi=10 (B_last block-last, rec=14706)   → ti=8 (data B_last block-first, rec=499971)
     *
     * Pattern (bi = 1, source has no sep):
     *   Arrow 1: fi=0  (B1 block-first) → ti=0 (target B1 block-first)
     *   Arrow 2: fi=2  (B1 block-last)  → ti=toLastFirst (target B_last block-first)
     */
    _buildArrows(arrows, fromCI, toCI, fromE, toE) {
        const fromHasSep  = this._hasSep(fromE);
        const toLastMid   = this._findLastBlockMidRow(toE);
        const toHasSep    = this._hasSep(toE);
        const toLastFirst = toLastMid - 1;        // block-first of B_last in target
        const toBmidFirst = toHasSep ? 4 : 0;     // block-first of Bmid in target

        // Arrow 1: source B1-first → target B1-first
        arrows.push({ fc: fromCI, fi: 0, tc: toCI, ti: 0 });

        const fromLastLast = this._findLastBlockLastRow(fromE);

        if (fromHasSep) {
            // Source bi > 2: show 3 arrows
            // Arrow 2: source B1-last → target Bmid-first
            arrows.push({ fc: fromCI, fi: 2, tc: toCI, ti: toBmidFirst });
            // Arrow 3: source B_last-last → target B_last-first
            arrows.push({ fc: fromCI, fi: fromLastLast, tc: toCI, ti: toLastFirst });
        } else {
            // Source bi = 1 or 2: show 2 arrows
            // Arrow 2: source B_last-last → target B_last-first (skip if same as arrow 1)
            if (toLastFirst !== 0) {
                arrows.push({ fc: fromCI, fi: fromLastLast, tc: toCI, ti: toLastFirst });
            }
        }
    }

    _buildSimpleArrows(arrows, fromCI, toCI, fromE, toE) {
        this._buildArrows(arrows, fromCI, toCI, fromE, toE);
    }


    // ─── Drawing ───────────────────────────────────────────────────────────────
    _getStructureBounds() {
        if (!this.model.created) return null;
        const layout = this._computeLayout();
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        for (const col of layout.columns) {
            minX = Math.min(minX, col.x - 30);
            maxX = Math.max(maxX, col.x + col.width + 30);
            minY = Math.min(minY, col.y - 20);
            maxY = Math.max(maxY, col.y + col.totalH + 30);
        }
        return { minX, maxX, minY, maxY };
    }

    _drawStructure() {
        const canvas = this.elements.canvas, ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#FAFBFD'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        // Grid dots
        ctx.fillStyle = '#E0E4EA';
        const gs = 30 * this._scale;
        if (gs > 8) {
            const sx = (this._offsetX % gs + gs) % gs, sy = (this._offsetY % gs + gs) % gs;
            for (let gx = sx; gx < canvas.width; gx += gs)
                for (let gy = sy; gy < canvas.height; gy += gs) { ctx.beginPath(); ctx.arc(gx, gy, 1, 0, Math.PI * 2); ctx.fill(); }
        }
        if (!this.model.created) {
            ctx.fillStyle = '#A0A8B8'; ctx.font = '16px "Segoe UI",sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText('Configure los parámetros para visualizar la estructura', canvas.width / 2, canvas.height / 2); return;
        }
        const layout = this._computeLayout();
        ctx.save(); ctx.translate(this._offsetX, this._offsetY); ctx.scale(this._scale, this._scale);
        for (const col of layout.columns) this._drawColumn(ctx, col);
        for (const a of layout.arrows)    this._drawArrowBetween(ctx, layout.columns, a);
        ctx.restore();
    }

    _drawColumn(ctx, col) {
        const { x, y, width, title, sizeLabel, entries } = col;
        const ROW_H = col.ROW_H;
        const BLK_H = 3 * ROW_H;

        // Size label above column
        ctx.fillStyle = '#444'; ctx.font = '11px "Segoe UI",sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
        ctx.fillText(sizeLabel, x + width / 2, y - 4);

        let ry = y, ei = 0;
        while (ei < entries.length) {
            const en = entries[ei];

            if (en.type === 'block-first') {
                // Draw full 3-row block group
                const bF = entries[ei],     // block-first
                      bM = entries[ei + 1], // block-mid
                      bL = entries[ei + 2]; // block-last

                // Blue fill for all 3 rows
                ctx.fillStyle = '#D4E4F7';
                ctx.fillRect(x, ry, width, BLK_H);

                // Light inner dividers
                ctx.beginPath();
                ctx.moveTo(x, ry + ROW_H); ctx.lineTo(x + width, ry + ROW_H);
                ctx.moveTo(x, ry + 2 * ROW_H); ctx.lineTo(x + width, ry + 2 * ROW_H);
                ctx.strokeStyle = '#A8C4E0'; ctx.lineWidth = 0.6; ctx.stroke();

                // Block border
                ctx.strokeStyle = '#2B579A'; ctx.lineWidth = 1.5;
                ctx.strokeRect(x, ry, width, BLK_H);

                // Row 1: first record — LEFT inside
                if (bF.num != null) {
                    ctx.fillStyle = '#1A3A6B'; ctx.font = '10px "Segoe UI",sans-serif';
                    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
                    ctx.fillText(bF.num.toLocaleString(), x + 5, ry + ROW_H / 2);
                }
                // Row 2: "..." center + block label RIGHT inside
                ctx.fillStyle = '#5A7AAA'; ctx.font = '12px "Segoe UI",sans-serif';
                ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.fillText('...', x + width / 2, ry + ROW_H + ROW_H / 2);
                if (bM.label) {
                    ctx.fillStyle = '#1A3A6B'; ctx.font = 'bold 10px "Segoe UI",sans-serif';
                    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
                    ctx.fillText(bM.label, x + width - 5, ry + ROW_H + ROW_H / 2);
                }
                // Row 3: last record — LEFT inside
                if (bL.num != null) {
                    ctx.fillStyle = '#1A3A6B'; ctx.font = '10px "Segoe UI",sans-serif';
                    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
                    ctx.fillText(bL.num.toLocaleString(), x + 5, ry + 2 * ROW_H + ROW_H / 2);
                }
                ry += BLK_H;
                ei += 3;

            } else if (en.type === 'sep') {
                // Separator row between non-adjacent blocks
                ctx.fillStyle = '#F0F3F8';
                ctx.fillRect(x, ry, width, ROW_H);
                ctx.strokeStyle = '#C8D8EC'; ctx.lineWidth = 0.5;
                ctx.strokeRect(x, ry, width, ROW_H);
                ctx.fillStyle = '#8899AA'; ctx.font = '12px "Segoe UI",sans-serif';
                ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.fillText('...', x + width / 2, ry + ROW_H / 2);
                ry += ROW_H; ei++;

            } else if (en.type === 'waste') {
                ctx.fillStyle = '#FFE44D';
                ctx.fillRect(x, ry, width, ROW_H);
                ctx.strokeStyle = '#CCC'; ctx.lineWidth = 0.5;
                ctx.strokeRect(x, ry, width, ROW_H);
                ctx.fillStyle = '#6B5900'; ctx.font = 'italic 10px "Segoe UI",sans-serif';
                ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.fillText('Desperdicio', x + width / 2, ry + ROW_H / 2);
                ry += ROW_H; ei++;

            } else if (en.type === 'capacity') {
                // Capacity number: shown to the left of the column, outside
                if (en.num != null) {
                    ctx.fillStyle = '#555'; ctx.font = '10px "Segoe UI",sans-serif';
                    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
                    ctx.fillText(en.num.toLocaleString(), x - 5, ry + ROW_H / 2);
                }
                ry += ROW_H; ei++;
            } else {
                ry += ROW_H; ei++;
            }
        }

        // Outer border (excludes the capacity row below)
        const boxH = entries.filter(e => e.type !== 'capacity').length * ROW_H;
        ctx.strokeStyle = '#2B579A'; ctx.lineWidth = 2;
        ctx.strokeRect(x, y, width, boxH);

        // Column title below
        ctx.fillStyle = '#2B579A'; ctx.font = 'bold 11px "Segoe UI",sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        ctx.fillText(title, x + width / 2, y + entries.length * ROW_H + 4);
    }

    /**
     * Draw bezier arrow from block-mid row of source to block-mid row of target.
     * fi/ti are entry indices; Y is computed as col.y + idx * ROW_H + ROW_H/2.
     */
    _drawArrowBetween(ctx, columns, arrow) {
        const fc = columns[arrow.fc], tc = columns[arrow.tc];
        const ROW_H = fc.ROW_H;
        const fromY = fc.y + arrow.fi * ROW_H + ROW_H / 2;
        const toY   = tc.y + arrow.ti * ROW_H + ROW_H / 2;
        const x1    = fc.x + fc.width;
        const x2    = tc.x;
        const midX  = (x1 + x2) / 2;

        ctx.beginPath();
        ctx.moveTo(x1, fromY);
        ctx.bezierCurveTo(midX, fromY, midX, toY, x2, toY);
        ctx.strokeStyle = '#2B579A'; ctx.lineWidth = 1.5; ctx.setLineDash([]); ctx.stroke();

        // Arrowhead
        const hs = 7;
        ctx.beginPath();
        ctx.moveTo(x2, toY);
        ctx.lineTo(x2 - hs, toY - hs / 2);
        ctx.lineTo(x2 - hs, toY + hs / 2);
        ctx.closePath(); ctx.fillStyle = '#2B579A'; ctx.fill();
    }
}
