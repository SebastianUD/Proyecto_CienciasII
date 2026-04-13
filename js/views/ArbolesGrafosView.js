/**
 * @class ArbolesGrafosView
 * @description Vista para el tema "Árboles como Grafos".
 * Gestiona la UI y la visualización de las 4 funcionalidades:
 * 1. Centro o Bicentro
 * 2. Árbol de Expansión Mínimo/Máximo (Kruskal)
 * 3. Distancia entre 2 Árboles de Expansión
 * 4. Rango y Nulidad
 *
 * Layout: 3 columnas — Panel izquierdo | Canvas central | Panel derecho (descripción)
 * Distribución de nodos: Grid/Manual del usuario, heredada al canvas de resultado (sin cambio de layout).
 *
 * @module views/ArbolesGrafosView
 */
class ArbolesGrafosView {
    constructor(containerEl) {
        this.container = containerEl;

        /** @type {GraphModel} */
        this.g1 = new GraphModel();
        /** @type {GraphModel} */
        this.g2 = new GraphModel();
        /** @type {GraphModel|null} */
        this.gResult = null;
        /** @type {GraphModel|null} */
        this.gResult2 = null; // Para distancia entre árboles (intersección)

        this.el = {};
        this.logMessages = [];
        this._activeGraph = 'g1';
        this._directed = false;

        // Cámaras independientes para cada canvas
        this._cam1 = this._newCam();
        this._cam2 = this._newCam();
        this._camR = this._newCam();
        this._camR2 = this._newCam();

        this._nodeRadius = 20;
        this._dragModeG1 = false;
        this._dragModeG2 = false;
        this._dragModeR = false;
        this._draggingNode = null;
        this._maximizedCanvas = null;

        // Estado Centro/Bicentro: pasos de animación
        this._centerSteps = [];
        this._centerStepIdx = 0;

        // MST: indicar si es mínimo o máximo
        this._mstMaximize = false;

        // Highlightes en canvas resultado
        this._resultHighlightVertices = {}; // vertex → color
        this._resultHighlightEdges = {};    // 'from-to' → color

        // Highlightes canvas resultado 2
        this._result2HighlightVertices = {};
        this._result2HighlightEdges = {};
    }

    // ─── Cámara ───────────────────────────────────────────────────────────────

    _newCam() {
        return { offsetX: 0, offsetY: 0, scale: 1, isPanning: false, startX: 0, startY: 0 };
    }

    // ─── Render ───────────────────────────────────────────────────────────────

    show() {
        this.container.innerHTML = '';
        this.container.classList.remove('hidden');
        const welcome = document.getElementById('welcome-screen');
        if (welcome) welcome.classList.add('hidden');

        this.container.innerHTML = this._buildHTML();
        this._cacheElements();
        this._bindEvents();
        this._resizeAllCanvas();
        this._syncUI();
        this._drawAll();
        this.g1.create([], []);
        this.g2.create([], []);
    }

    _buildHTML() {
        return `
        <div class="algo-title">Grafos — Árboles como Grafos</div>

        <div class="grafos-layout">

            <!-- ══ Panel Izquierdo ══ -->
            <div class="grafos-left-panel">

                <!-- Bloque 1: Definición de Grafos -->
                <div class="section-block">
                    <div class="section-title">Definición de Grafos</div>
                    <div class="grafos-input-panel">

                        <!-- Selector G1 / G2 -->
                        <div class="grafos-field-row">
                            <label>Grafo a editar</label>
                            <div class="grafos-graph-selector">
                                <button class="grafos-tab-btn active" id="tag-tab-g1" data-target="g1">G1</button>
                                <button class="grafos-tab-btn" id="tag-tab-g2" data-target="g2">G2</button>
                            </div>
                        </div>

                        <!-- Vértices -->
                        <div class="grafos-field-col">
                            <label>Vértices</label>
                            <div class="grafos-vertex-input-row">
                                <input type="text" id="tag-input-vertex" placeholder="Ej: A, B, C… Enter para añadir">
                                <button class="btn btn-primary" id="tag-add-vertex-btn" style="min-width:40px;justify-content:center;">+</button>
                            </div>
                            <div class="grafos-vertex-chips" id="tag-vertex-list"></div>
                        </div>

                        <!-- Aristas con Peso -->
                        <div class="grafos-field-col" style="margin-top:5px;">
                            <label>Aristas</label>
                            <div class="tag-edge-input-row">
                                <select id="tag-edge-from"><option value="">--</option></select>
                                <span style="flex-shrink:0;">—</span>
                                <select id="tag-edge-to"><option value="">--</option></select>
                                <input type="number" id="tag-edge-weight" placeholder="Peso" step="any" style="width:58px;flex-shrink:0;">
                                <button class="btn btn-primary" id="tag-add-edge-btn" style="min-width:40px;justify-content:center;">+</button>
                            </div>
                            <div class="grafos-edge-list" id="tag-edge-list"></div>
                        </div>

                        <!-- Botones Crear / Limpiar -->
                        <div class="grafos-btn-row">
                            <button class="btn btn-primary" id="tag-btn-create">CREAR</button>
                            <button class="btn btn-secondary" id="tag-btn-clear-graph">LIMPIAR</button>
                        </div>

                    </div>
                </div>

                <!-- Bloque 2: Funcionalidad -->
                <div class="section-block">
                    <div class="section-title">Funcionalidad</div>
                    <div class="grafos-op-panel">

                        <div class="grafos-field-col">
                            <label for="tag-func-select">Seleccione la funcionalidad</label>
                            <select id="tag-func-select">
                                <option value="center">Centro o Bicentro del Árbol</option>
                                <option value="mst">Árbol de Expansión Mínimo (MST)</option>
                                <option value="maxst">Árbol de Expansión Máximo (MaxST)</option>
                                <option value="distance">Distancia entre 2 Árboles de Expansión</option>
                                <option value="rank">Rango y Nulidad</option>
                            </select>
                        </div>

                        <!-- Advertencia de requisitos -->
                        <div id="tag-func-warning" class="tag-func-warning hidden"></div>

                        <button class="btn btn-primary grafos-btn-full" id="tag-btn-execute" style="margin-top:8px;">▶ CALCULAR</button>

                    </div>
                </div>

                <!-- Bloque 3: Mensajes y Resultados -->
                <div class="section-block grafos-log-section">
                    <div class="section-title">Mensajes y Resultados</div>
                    <div class="tree-log-content" id="tag-log-content" style="height:130px;"></div>
                </div>

            </div>

            <!-- ══ Área de Canvas Central ══ -->
            <div class="grafos-canvas-area">
                <div class="grafos-top-row" id="tag-top-row">
                    <div class="grafos-canvas-wrapper" id="tag-wrap-g1">
                        <div class="grafos-canvas-label">Grafo 1 (G1)</div>
                        <canvas id="tag-canvas-g1"></canvas>
                        <button class="tree-fit-btn expand-btn" id="tag-expand-g1" title="Maximizar G1">⛶</button>
                        <button class="tree-fit-btn drag-toggle-btn" id="tag-drag-g1" title="Mover nodos G1">✥</button>
                        <button class="tree-fit-btn" id="tag-fit-g1" title="Ajustar vista G1">⊞</button>
                    </div>
                    <div class="grafos-canvas-wrapper" id="tag-wrap-g2">
                        <div class="grafos-canvas-label">Grafo 2 (G2)</div>
                        <canvas id="tag-canvas-g2"></canvas>
                        <button class="tree-fit-btn expand-btn" id="tag-expand-g2" title="Maximizar G2">⛶</button>
                        <button class="tree-fit-btn drag-toggle-btn" id="tag-drag-g2" title="Mover nodos G2">✥</button>
                        <button class="tree-fit-btn" id="tag-fit-g2" title="Ajustar vista G2">⊞</button>
                    </div>
                </div>

                <div class="grafos-result-row" id="tag-result-row">
                    <!-- Canvas resultado principal -->
                    <div class="grafos-canvas-wrapper grafos-result-canvas" id="tag-wrap-result" style="flex:1;">
                        <div class="grafos-canvas-label" id="tag-result-label">Resultado</div>
                        <canvas id="tag-canvas-result"></canvas>
                        <button class="tree-fit-btn expand-btn" id="tag-expand-result" title="Maximizar Resultado">⛶</button>
                        <button class="tree-fit-btn drag-toggle-btn" id="tag-drag-result" title="Mover nodos">✥</button>
                        <button class="tree-fit-btn" id="tag-fit-result" title="Ajustar vista resultado">⊞</button>
                        <!-- Nav pasos Centro/Bicentro -->
                        <div id="tag-step-nav" class="tag-step-nav hidden">
                            <button id="tag-step-prev" class="tag-step-btn">◀</button>
                            <span id="tag-step-label">Paso 1 de 1</span>
                            <button id="tag-step-next" class="tag-step-btn">▶</button>
                        </div>
                    </div>
                    <!-- Canvas resultado 2 (Distancia entre árboles: intersección) -->
                    <div class="grafos-canvas-wrapper grafos-result-canvas" id="tag-wrap-result2" style="flex:1;display:none;">
                        <div class="grafos-canvas-label" id="tag-result2-label">Intersección</div>
                        <canvas id="tag-canvas-result2"></canvas>
                        <button class="tree-fit-btn" id="tag-fit-result2" title="Ajustar vista">⊞</button>
                    </div>
                </div>
            </div>

            <!-- ══ Panel Derecho: Descripción de los Grafos ══ -->
            <div class="grafos-right-panel">
                <div class="section-block" style="height:100%;display:flex;flex-direction:column;">
                    <div class="section-title">Descripción de los Grafos</div>
                    <div class="tree-log-content" id="tag-desc-content" style="flex:1;overflow-y:auto;">
                        <div class="huffman-empty-msg">Calcule una funcionalidad para ver la descripción formal de los grafos aquí.</div>
                    </div>
                </div>
            </div>

        </div>

        <div class="footer-buttons">
            <button class="btn btn-success" id="tag-btn-save">GUARDAR</button>
            <button class="btn btn-info" id="tag-btn-load">CARGAR</button>
            <button class="btn btn-primary" id="tag-btn-print">IMPRIMIR</button>
        </div>
        `;
    }

    // ─── DOM ──────────────────────────────────────────────────────────────────

    _cacheElements() {
        this.el = {
            tabG1: document.getElementById('tag-tab-g1'),
            tabG2: document.getElementById('tag-tab-g2'),
            inputVertex: document.getElementById('tag-input-vertex'),
            addVertexBtn: document.getElementById('tag-add-vertex-btn'),
            vertexList: document.getElementById('tag-vertex-list'),
            edgeFrom: document.getElementById('tag-edge-from'),
            edgeTo: document.getElementById('tag-edge-to'),
            edgeWeight: document.getElementById('tag-edge-weight'),
            addEdgeBtn: document.getElementById('tag-add-edge-btn'),
            edgeList: document.getElementById('tag-edge-list'),
            btnCreate: document.getElementById('tag-btn-create'),
            btnClearGraph: document.getElementById('tag-btn-clear-graph'),
            funcSelect: document.getElementById('tag-func-select'),
            funcWarning: document.getElementById('tag-func-warning'),
            btnExecute: document.getElementById('tag-btn-execute'),
            logContent: document.getElementById('tag-log-content'),
            descContent: document.getElementById('tag-desc-content'),
            btnSave: document.getElementById('tag-btn-save'),
            btnLoad: document.getElementById('tag-btn-load'),
            btnPrint: document.getElementById('tag-btn-print'),
            canvasG1: document.getElementById('tag-canvas-g1'),
            canvasG2: document.getElementById('tag-canvas-g2'),
            canvasResult: document.getElementById('tag-canvas-result'),
            canvasResult2: document.getElementById('tag-canvas-result2'),
            fitG1: document.getElementById('tag-fit-g1'),
            fitG2: document.getElementById('tag-fit-g2'),
            fitResult: document.getElementById('tag-fit-result'),
            fitResult2: document.getElementById('tag-fit-result2'),
            resultLabel: document.getElementById('tag-result-label'),
            result2Label: document.getElementById('tag-result2-label'),
            topRow: document.getElementById('tag-top-row'),
            resultRow: document.getElementById('tag-result-row'),
            dragG1: document.getElementById('tag-drag-g1'),
            dragG2: document.getElementById('tag-drag-g2'),
            dragResult: document.getElementById('tag-drag-result'),
            expandG1: document.getElementById('tag-expand-g1'),
            expandG2: document.getElementById('tag-expand-g2'),
            expandResult: document.getElementById('tag-expand-result'),
            wrapG1: document.getElementById('tag-wrap-g1'),
            wrapG2: document.getElementById('tag-wrap-g2'),
            wrapResult: document.getElementById('tag-wrap-result'),
            wrapResult2: document.getElementById('tag-wrap-result2'),
            stepNav: document.getElementById('tag-step-nav'),
            stepPrev: document.getElementById('tag-step-prev'),
            stepNext: document.getElementById('tag-step-next'),
            stepLabel: document.getElementById('tag-step-label')
        };
    }

    // ─── Eventos ──────────────────────────────────────────────────────────────

    _bindEvents() {
        const el = this.el;

        el.tabG1.addEventListener('click', () => this._switchTab('g1'));
        el.tabG2.addEventListener('click', () => this._switchTab('g2'));

        el.addVertexBtn.addEventListener('click', () => this._handleAddVertex());
        el.inputVertex.addEventListener('keypress', e => { if (e.key === 'Enter') this._handleAddVertex(); });

        el.addEdgeBtn.addEventListener('click', () => this._handleAddEdge());

        el.btnCreate.addEventListener('click', () => this._onCreate());
        el.btnClearGraph.addEventListener('click', () => this._onClearGraph());
        el.btnExecute.addEventListener('click', () => this._onExecute());
        el.btnSave.addEventListener('click', () => this._onSave());
        el.btnLoad.addEventListener('click', () => this._onLoad());
        el.btnPrint.addEventListener('click', () => window.print());

        el.funcSelect.addEventListener('change', () => this._validateRequirements());

        el.fitG1.addEventListener('click', () => { this._fitGraph(el.canvasG1, this.g1, this._cam1); this._drawGraph(el.canvasG1, this.g1, this._cam1); });
        el.fitG2.addEventListener('click', () => { this._fitGraph(el.canvasG2, this.g2, this._cam2); this._drawGraph(el.canvasG2, this.g2, this._cam2); });
        el.fitResult.addEventListener('click', () => { if (this.gResult) { this._fitGraph(el.canvasResult, this.gResult, this._camR); this._drawResultCanvas(); } });
        el.fitResult2.addEventListener('click', () => { if (this.gResult2) { this._fitGraph(el.canvasResult2, this.gResult2, this._camR2); this._drawGraph(el.canvasResult2, this.gResult2, this._camR2, this._result2HighlightVertices, this._result2HighlightEdges); } });

        el.dragG1.addEventListener('click', () => this._toggleDragMode('g1'));
        el.dragG2.addEventListener('click', () => this._toggleDragMode('g2'));
        el.dragResult.addEventListener('click', () => this._toggleDragMode('result'));

        el.expandG1.addEventListener('click', () => this._toggleMaximize('g1'));
        el.expandG2.addEventListener('click', () => this._toggleMaximize('g2'));
        el.expandResult.addEventListener('click', () => this._toggleMaximize('result'));

        // Navegación de pasos (Centro/Bicentro)
        el.stepPrev.addEventListener('click', () => this._navigateStep(-1));
        el.stepNext.addEventListener('click', () => this._navigateStep(1));

        // Pan/zoom canvas
        this._bindCanvasPanZoom(el.canvasG1, () => this.g1, this._cam1, () => this._dragModeG1, () => this._drawGraph(el.canvasG1, this.g1, this._cam1));
        this._bindCanvasPanZoom(el.canvasG2, () => this.g2, this._cam2, () => this._dragModeG2, () => this._drawGraph(el.canvasG2, this.g2, this._cam2));
        this._bindCanvasPanZoom(el.canvasResult, () => this.gResult, this._camR, () => this._dragModeR, () => this._drawResultCanvas());
        this._bindCanvasPanZoom(el.canvasResult2, () => this.gResult2, this._camR2, () => false, () => this._drawGraph(el.canvasResult2, this.gResult2, this._camR2, this._result2HighlightVertices, this._result2HighlightEdges));

        // ResizeObserver
        this._ro = new ResizeObserver(() => { this._resizeAllCanvas(); this._drawAll(); });
        [el.canvasG1, el.canvasG2, el.canvasResult, el.canvasResult2].forEach(c => this._ro.observe(c.parentElement));
    }

    // ─── Tab y Grafo Activo ───────────────────────────────────────────────────

    _switchTab(target) {
        this._activeGraph = target;
        this.el.tabG1.classList.toggle('active', target === 'g1');
        this.el.tabG2.classList.toggle('active', target === 'g2');
        this._syncUI();
    }

    _getActiveGraph() { return this._activeGraph === 'g1' ? this.g1 : this.g2; }
    _getActiveGraphLabel() { return this._activeGraph === 'g1' ? 'G1' : 'G2'; }

    // ─── Sincronización de UI ─────────────────────────────────────────────────

    _syncUI() {
        const g = this._getActiveGraph();

        // Chips de vértices
        this.el.vertexList.innerHTML = '';
        g.vertices.forEach(v => {
            const chip = document.createElement('div');
            chip.className = 'grafos-vertex-chip';
            chip.innerHTML = `<span>${v}</span><button data-v="${v}">×</button>`;
            chip.querySelector('button').addEventListener('click', e => this._handleRemoveVertex(e.currentTarget.getAttribute('data-v')));
            this.el.vertexList.appendChild(chip);
        });

        // Selectores de vértices para aristas
        this.el.edgeFrom.innerHTML = '<option value="">--</option>';
        this.el.edgeTo.innerHTML = '<option value="">--</option>';
        g.vertices.forEach(v => {
            this.el.edgeFrom.add(new Option(v, v));
            this.el.edgeTo.add(new Option(v, v));
        });

        // Lista de aristas con peso
        this.el.edgeList.innerHTML = '';
        g.edges.forEach(edge => {
            const row = document.createElement('div');
            row.className = 'grafos-edge-item';
            const w = (edge.weight !== null && edge.weight !== undefined) ? edge.weight : 1;
            row.innerHTML = `<span class="grafos-edge-id">${edge.id})</span> ${edge.from} — ${edge.to} <span class="tag-edge-weight-badge">[${w}]</span>
                             <button class="edge-remove" data-id="${edge.id}">×</button>`;
            row.querySelector('.edge-remove').addEventListener('click', e => this._handleRemoveEdge(e.currentTarget.getAttribute('data-id')));
            this.el.edgeList.appendChild(row);
        });

        this._validateRequirements();
    }

    // ─── Validación de Requisitos ─────────────────────────────────────────────

    _validateRequirements() {
        const func = this.el.funcSelect.value;
        const warning = this.el.funcWarning;
        let msg = '';

        const g1Ready = this.g1.created && this.g1.vertices.length > 0;
        const g2Ready = this.g2.created && this.g2.vertices.length > 0;

        if (func === 'center') {
            if (!g1Ready) {
                msg = '⚠ Centro/Bicentro requiere un árbol en G1. Ingrese los vértices y aristas del árbol.';
            } else {
                const check = TreeGraphModel.isTree(this.g1);
                if (!check.isTree) msg = `⚠ G1 no es un árbol: ${check.reason}`;
            }
        } else if (func === 'mst' || func === 'maxst') {
            if (!g1Ready) {
                msg = '⚠ Esta funcionalidad requiere un grafo conexo en G1.';
            } else if (!TreeGraphModel.isConnected(this.g1)) {
                msg = '⚠ G1 no es conexo. Todos los vértices deben estar conectados.';
            }
        } else if (func === 'distance') {
            if (!g1Ready || !g2Ready) {
                msg = '⚠ Distancia entre árboles requiere dos árboles en G1 y G2.';
            } else {
                const c1 = TreeGraphModel.isTree(this.g1);
                const c2 = TreeGraphModel.isTree(this.g2);
                if (!c1.isTree) msg = `⚠ G1 no es un árbol: ${c1.reason}`;
                else if (!c2.isTree) msg = `⚠ G2 no es un árbol: ${c2.reason}`;
            }
        } else if (func === 'rank') {
            if (!g1Ready) {
                msg = '⚠ Rango y Nulidad requiere un grafo ponderado en G1.';
            } else if (!TreeGraphModel.isConnected(this.g1)) {
                msg = '⚠ G1 no es conexo. Todos los vértices deben estar conectados.';
            }
        }

        if (msg) {
            warning.textContent = msg;
            warning.classList.remove('hidden');
        } else {
            warning.classList.add('hidden');
        }
    }

    // ─── Handlers de Vértices y Aristas ──────────────────────────────────────

    _handleAddVertex() {
        const g = this._getActiveGraph();
        const raw = this.el.inputVertex.value.trim();
        if (!raw) return;
        const vertices = GraphModel.parseVertices(raw);
        let added = 0;
        for (const v of vertices) {
            const res = g.addVertex(v);
            if (res.success) added++;
            else Validation.showError(res.error);
        }
        if (added > 0) {
            this.el.inputVertex.value = '';
            g.created = true;
            this._addLog(`${added} vértice(s) añadido(s) a ${this._getActiveGraphLabel()}.`, 'success');
            this._syncUI();
            this._refreshActiveCanvas();
        }
    }

    async _handleRemoveVertex(v) {
        const g = this._getActiveGraph();
        const confirmed = await Validation.confirm(`¿Eliminar vértice ${v} y sus aristas en ${this._getActiveGraphLabel()}?`);
        if (!confirmed) return;
        const res = g.removeVertex(v);
        if (res.success) {
            this._addLog(`Vértice ${v} eliminado de ${this._getActiveGraphLabel()}.`, 'info');
            if (g.vertices.length === 0) g.created = false;
            this._syncUI();
            this._refreshActiveCanvas();
        } else {
            Validation.showError(res.error);
        }
    }

    _handleAddEdge() {
        const g = this._getActiveGraph();
        const from = this.el.edgeFrom.value;
        const to = this.el.edgeTo.value;
        const rawW = this.el.edgeWeight.value;
        const weight = rawW === '' || rawW === null ? 1 : parseFloat(rawW);

        if (!from || !to) { Validation.showError('Seleccione origen y destino.'); return; }
        if (isNaN(weight)) { Validation.showError('El peso debe ser un número válido.'); return; }

        const res = g.addEdge(from, to, weight);
        if (res.success) {
            this.el.edgeFrom.value = '';
            this.el.edgeTo.value = '';
            this.el.edgeWeight.value = '';
            this._addLog(`Arista ${from}—${to} (peso ${weight}) añadida a ${this._getActiveGraphLabel()}.`, 'success');
            this._syncUI();
            this._refreshActiveCanvas();
        } else {
            Validation.showError(res.error);
        }
    }

    async _handleRemoveEdge(id) {
        const g = this._getActiveGraph();
        const confirmed = await Validation.confirm(`¿Eliminar arista ${id} de ${this._getActiveGraphLabel()}?`);
        if (!confirmed) return;
        const res = g.removeEdge(id);
        if (res.success) {
            this._addLog(`Arista ${id} eliminada de ${this._getActiveGraphLabel()}.`, 'info');
            this._syncUI();
            this._refreshActiveCanvas();
        } else {
            Validation.showError(res.error);
        }
    }

    // ─── Botones Principales ──────────────────────────────────────────────────

    _onCreate() {
        const g = this._getActiveGraph();
        const label = this._getActiveGraphLabel();
        if (!g.created || g.vertices.length === 0) {
            Validation.showError(`${label} no tiene vértices.`);
            return;
        }
        this._addLog(`${label} creado: ${g.vertices.length} vértice(s), ${g.edges.length} arista(s).`, 'success');
        this._validateRequirements();
        this._refreshActiveCanvas();
    }

    async _onClearGraph() {
        const g = this._getActiveGraph();
        if (g.vertices.length > 0) {
            const confirmed = await Validation.confirm(`Se limpiará completamente ${this._getActiveGraphLabel()}. ¿Continuar?`);
            if (!confirmed) return;
        }
        g.reset();
        this._invalidateResult();
        this._syncUI();
        this._refreshActiveCanvas();
        this._addLog(`${this._getActiveGraphLabel()} limpiado.`, 'info');
    }

    _invalidateResult() {
        this.gResult = null;
        this.gResult2 = null;
        this._centerSteps = [];
        this._centerStepIdx = 0;
        this._resultHighlightVertices = {};
        this._resultHighlightEdges = {};
        this._result2HighlightVertices = {};
        this._result2HighlightEdges = {};
        this.el.resultLabel.textContent = 'Resultado';
        this.el.result2Label.textContent = 'Intersección';
        this.el.stepNav.classList.add('hidden');
        this.el.wrapResult2.style.display = 'none';
        this.el.descContent.innerHTML = '<div class="huffman-empty-msg">Calcule una funcionalidad para ver la descripción formal de los grafos aquí.</div>';
        const ctxR = this.el.canvasResult.getContext('2d');
        ctxR.clearRect(0, 0, this.el.canvasResult.width, this.el.canvasResult.height);
    }

    // ─── Ejecutar Funcionalidad ───────────────────────────────────────────────

    _onExecute() {
        const func = this.el.funcSelect.value;

        // Re-validar antes de calcular
        this._validateRequirements();
        if (!this.el.funcWarning.classList.contains('hidden')) {
            Validation.showError(this.el.funcWarning.textContent.replace('⚠ ', ''));
            return;
        }

        this._invalidateResult();

        try {
            if (func === 'center') {
                this._executeCenterBicenter();
            } else if (func === 'mst') {
                this._executeMST(false);
            } else if (func === 'maxst') {
                this._executeMST(true);
            } else if (func === 'distance') {
                this._executeDistance();
            } else if (func === 'rank') {
                this._executeRankNullity();
            }
        } catch (err) {
            Validation.showError('Error al calcular: ' + err.message);
            console.error(err);
        }
    }

    // ─── Funcionalidad 1: Centro / Bicentro ───────────────────────────────────

    _executeCenterBicenter() {
        const result = TreeGraphModel.findCenterBicenter(this.g1);

        this._centerSteps = result.steps;
        this._centerStepIdx = 0;

        // Mostrar nav de pasos
        this.el.stepNav.classList.remove('hidden');
        this._updateStepNav();

        // Mostrar primer paso
        this._renderCenterStep(this._centerStepIdx);

        // Log
        result.log.forEach(msg => this._addLog(msg, 'info'));

        const centerLabel = result.isBicenter
            ? `Bicentro: {${result.center.join(', ')}}`
            : `Centro: {${result.center[0]}}`;
        this._addLog(`✔ ${centerLabel}`, 'success');

        this.el.resultLabel.textContent = result.isBicenter ? 'Bicentro' : 'Centro';

        // Descripción formal
        this._renderDescription([
            { title: 'Árbol Original (G1)', items: [{ graph: this.g1, label: 'T', isTree: true }] },
            {
                title: centerLabel,
                html: this._buildCenterDescHTML(result)
            }
        ]);
    }

    _buildCenterDescHTML(result) {
        const center = result.center;
        const isBicenter = result.isBicenter;
        let html = `<div style="font-family:Consolas,monospace;font-size:0.83rem;line-height:1.9;padding:8px;background:rgba(43,87,154,0.04);border-radius:4px;border-left:3px solid #28a745;">`;
        html += `<strong>${isBicenter ? 'Bicentro' : 'Centro'} = {${center.join(', ')}}</strong><br>`;
        html += `<div style="font-size:0.78rem;color:var(--text-secondary);margin-top:4px;">`;
        html += `Total de iteraciones: ${result.steps.filter(s => s.removed && s.removed.length > 0).length}<br>`;
        html += `Tipo: ${isBicenter ? 'Bicentro (2 nodos)' : 'Centro (1 nodo)'}`;
        html += `</div></div>`;
        return html;
    }

    _navigateStep(dir) {
        const newIdx = this._centerStepIdx + dir;
        if (newIdx < 0 || newIdx >= this._centerSteps.length) return;
        this._centerStepIdx = newIdx;
        this._updateStepNav();
        this._renderCenterStep(this._centerStepIdx);
    }

    _updateStepNav() {
        const total = this._centerSteps.length;
        const idx = this._centerStepIdx;
        this.el.stepLabel.textContent = `Paso ${idx + 1} de ${total}`;
        this.el.stepPrev.disabled = idx === 0;
        this.el.stepNext.disabled = idx === total - 1;
        // Actualizar label del canvas
        const step = this._centerSteps[idx];
        if (step) this.el.resultLabel.textContent = step.label || 'Resultado';
    }

    _renderCenterStep(idx) {
        const step = this._centerSteps[idx];
        if (!step) return;

        // Construir un GraphModel temporal para este snapshot
        const snapGraph = new GraphModel();
        snapGraph._build_internal(step.vertices, step.edges, false, step.label || 'Paso');

        // Heredar posiciones del grafo original G1 para preservar el layout del usuario
        this._inheritPositions(this.g1, snapGraph);

        this.gResult = snapGraph;

        // Highlights: hojas en naranja, centro en verde
        this._resultHighlightVertices = {};
        this._resultHighlightEdges = {};

        if (step.leaves) {
            for (const v of step.leaves) {
                this._resultHighlightVertices[v] = '#FF7043'; // naranja
            }
        }
        if (step.center) {
            for (const v of step.center) {
                this._resultHighlightVertices[v] = '#26A65B'; // verde
            }
        }

        this._fitGraph(this.el.canvasResult, this.gResult, this._camR);
        this._drawResultCanvas();
    }

    // ─── Funcionalidad 2: MST / MaxST ─────────────────────────────────────────

    _executeMST(maximize) {
        this._mstMaximize = maximize;
        const result = TreeGraphModel.kruskal(this.g1, maximize);

        // Construir grafo árbol resultante
        const treeGraph = new GraphModel();
        treeGraph._build_internal(this.g1.vertices, result.treeEdges, false, maximize ? 'MaxST' : 'MST');

        // Heredar posiciones del grafo G1 original
        this._inheritPositions(this.g1, treeGraph);
        this.gResult = treeGraph;

        // Highlight aristas del árbol en verde
        this._resultHighlightVertices = {};
        this._resultHighlightEdges = {};
        for (const e of result.treeEdges) {
            const key = [e.from, e.to].sort().join('-');
            this._resultHighlightEdges[key] = '#26A65B';
        }

        this.el.resultLabel.textContent = maximize ? 'Árbol de Expansión Máximo' : 'Árbol de Expansión Mínimo';

        this._fitGraph(this.el.canvasResult, this.gResult, this._camR);
        this._drawResultCanvas();

        // Log
        result.log.forEach(msg => this._addLog(msg, 'info'));
        this._addLog(`✔ Peso total del árbol: ${result.totalWeight}`, 'success');

        // Descripción formal
        const descItems = [
            { graph: this.g1, label: 'G', isTree: false },
            { graph: treeGraph, label: 'T', isTree: true }
        ];
        let extraHTML = '';
        if (result.hasMultipleSolutions) {
            extraHTML = `<div style="background:#FFF3CD;border:1px solid #FFECB5;border-radius:4px;padding:8px;margin-top:8px;font-size:0.8rem;">
                ⚠ <strong>Nota:</strong> Existe más de un ${maximize ? 'árbol de expansión máximo' : 'árbol de expansión mínimo'} posible. Se muestra el primero encontrado por el algoritmo.
            </div>`;
        }
        this._renderDescription([
            { title: 'Grafos de Entrada y Resultado', items: descItems },
            { title: 'Resultado Adicional', html: `<div style="padding:8px;font-family:Consolas,monospace;font-size:0.83rem;">Peso total (T): <strong>${result.totalWeight}</strong><br>Longitud: <strong>${result.treeEdges.length}</strong>${extraHTML ? '' : ''}</div>${extraHTML}` }
        ]);
    }

    // ─── Funcionalidad 3: Distancia entre 2 Árboles ───────────────────────────

    _executeDistance() {
        const result = TreeGraphModel.spanningTreeDistance(this.g1, this.g2);

        // Heredar posiciones de G1 y G2 a sus grafos resultado
        this._inheritPositions(this.g1, result.unionGraph);
        this._inheritPositions(this.g2, result.unionGraph);
        this._inheritPositions(this.g1, result.intersectionGraph);

        // Grafo unión (en canvas principal)
        this.gResult = result.unionGraph;
        this.el.resultLabel.textContent = 'G₁∪G₂ (Unión)';
        this._resultHighlightVertices = {};
        this._resultHighlightEdges = {};

        // Colorear aristas: en G1 azul, en G2 naranja, en intersección verde
        const edgeMap1 = new Set(this.g1.edges.map(e => [e.from, e.to].sort().join('-')));
        const edgeMap2 = new Set(this.g2.edges.map(e => [e.from, e.to].sort().join('-')));
        for (const e of result.unionEdges) {
            const key = [e.from, e.to].sort().join('-');
            const inG1 = edgeMap1.has(key);
            const inG2 = edgeMap2.has(key);
            if (inG1 && inG2) this._resultHighlightEdges[key] = '#26A65B'; // verde
            else if (inG1) this._resultHighlightEdges[key] = '#2B7BE0';   // azul
            else this._resultHighlightEdges[key] = '#FF7043';              // naranja
        }

        // Grafo intersección (en canvas resultado 2)
        this.gResult2 = result.intersectionGraph;
        this.el.result2Label.textContent = 'G₁∩G₂ (Intersección)';
        this._result2HighlightVertices = {};
        this._result2HighlightEdges = {};
        for (const e of result.intersectionEdges) {
            const key = [e.from, e.to].sort().join('-');
            this._result2HighlightEdges[key] = '#26A65B';
        }

        // Mostrar canvas 2
        this.el.wrapResult2.style.display = 'flex';
        this._resizeAllCanvas();

        this._fitGraph(this.el.canvasResult, this.gResult, this._camR);
        this._fitGraph(this.el.canvasResult2, this.gResult2, this._camR2);
        this._drawResultCanvas();
        this._drawGraph(this.el.canvasResult2, this.gResult2, this._camR2, this._result2HighlightVertices, this._result2HighlightEdges);

        // Log
        result.log.forEach(msg => this._addLog(msg, 'info'));
        this._addLog(`✔ Distancia: D = ${result.distance}`, 'success');

        // Descripción formal completa
        const sumA = this.g1.edges.reduce((s, e) => s + ((e.weight !== null && e.weight !== undefined) ? e.weight : 1), 0);
        const sumB = this.g2.edges.reduce((s, e) => s + ((e.weight !== null && e.weight !== undefined) ? e.weight : 1), 0);

        const distDescHTML = `
            <div style="font-family:Consolas,monospace;font-size:0.83rem;line-height:1.9;padding:8px;background:rgba(43,87,154,0.04);border-radius:4px;border-left:3px solid var(--accent-primary);">
                D(A) - D(B) ⇒ D(A) = {${this.g1.edges.map(e => `${[e.from, e.to].sort().join('-')}:${(e.weight !== null && e.weight !== undefined) ? e.weight : 1}`).join(', ')}} = ${sumA}<br>
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;D(B) = {${this.g2.edges.map(e => `${[e.from, e.to].sort().join('-')}:${(e.weight !== null && e.weight !== undefined) ? e.weight : 1}`).join(', ')}} = ${sumB}<br><br>
                A₁∪A₂ = (${sumA} + ${sumB}) - ${result.sumIntersection} = <strong>${result.sumUnion}</strong><br>
                A₁∩A₂ = <strong>${result.sumIntersection}</strong><br><br>
                D = (A₁∪A₂ - A₁∩A₂) / 2<br>
                D = (${result.sumUnion} - ${result.sumIntersection}) / 2<br>
                <strong style="font-size:1rem;color:var(--accent-primary);">D = ${result.distance}</strong>
            </div>
        `;

        this._renderDescription([
            { title: 'Árbol A (G1) — T₁', items: [{ graph: this.g1, label: 'T₁', isTree: true }] },
            { title: 'Árbol B (G2) — T₂', items: [{ graph: this.g2, label: 'T₂', isTree: true }] },
            { title: 'Cálculo de la Distancia', html: distDescHTML },
            {
                title: 'Unión e Intersección', items: [
                    { graph: result.unionGraph, label: 'G₃=G₁∪G₂', isTree: false },
                    { graph: result.intersectionGraph, label: 'G₃=G₁∩G₂', isTree: false }
                ]
            }
        ]);
    }

    // ─── Funcionalidad 4: Rango y Nulidad ─────────────────────────────────────

    _executeRankNullity() {
        const result = TreeGraphModel.rankAndNullity(this.g1);

        // Heredar posiciones de G1 a ambos grafos resultado
        this._inheritPositions(this.g1, result.mstGraph);
        this._inheritPositions(this.g1, result.complementGraph);

        // Mostrar MST en canvas principal
        this.gResult = result.mstGraph;
        this.el.resultLabel.textContent = 'T — Árbol de Expansión (Ramas)';
        this._resultHighlightVertices = {};
        this._resultHighlightEdges = {};
        for (const e of result.mstEdges) {
            const key = [e.from, e.to].sort().join('-');
            this._resultHighlightEdges[key] = '#26A65B';
        }

        // Mostrar complemento en canvas 2
        this.gResult2 = result.complementGraph;
        this.el.result2Label.textContent = "T' — Complemento (Cuerdas)";
        this._result2HighlightVertices = {};
        this._result2HighlightEdges = {};
        for (const e of result.complementEdges) {
            const key = [e.from, e.to].sort().join('-');
            this._result2HighlightEdges[key] = '#E53935';
        }

        // Mostrar canvas 2
        this.el.wrapResult2.style.display = 'flex';
        this._resizeAllCanvas();

        this._fitGraph(this.el.canvasResult, this.gResult, this._camR);
        this._fitGraph(this.el.canvasResult2, this.gResult2, this._camR2);
        this._drawResultCanvas();
        this._drawGraph(this.el.canvasResult2, this.gResult2, this._camR2, this._result2HighlightVertices, this._result2HighlightEdges);

        // Log
        result.log.forEach(msg => this._addLog(msg, 'info'));
        this._addLog(`✔ Rango = ${result.rank} | Nulidad = ${result.nullity}`, 'success');

        // Descripción formal
        const rnHTML = `
            <div style="font-family:Consolas,monospace;font-size:0.83rem;line-height:1.9;padding:8px;background:rgba(43,87,154,0.04);border-radius:4px;border-left:3px solid var(--accent-primary);">
                <strong>Rango (Ramas)</strong> = |V| - 1 = ${this.g1.vertices.length} - 1 = <strong style="color:#26A65B;">${result.rank}</strong><br>
                <strong>Nulidad (Cuerdas)</strong> = |A| - |V| + 1 = ${this.g1.edges.length} - ${this.g1.vertices.length} + 1 = <strong style="color:#E53935;">${result.nullity}</strong>
            </div>
        `;

        this._renderDescription([
            { title: 'Grafo Original (G)', items: [{ graph: this.g1, label: 'G', isTree: false }] },
            { title: 'Árbol de Expansión Mínimo T (Ramas)', items: [{ graph: result.mstGraph, label: 'T', isTree: true }] },
            { title: "Complemento T' (Cuerdas)", items: [{ graph: result.complementGraph, label: "T'", isTree: false }] },
            { title: 'Rango y Nulidad', html: rnHTML }
        ]);
    }

    // ─── Descripción Formal (Panel Derecho) ───────────────────────────────────

    /**
     * Renderiza la descripción formal en el panel derecho.
     * @param {Array<{ title?: string, items?: Array, html?: string }>} sections
     */
    _renderDescription(sections) {
        this.el.descContent.innerHTML = '';
        for (const section of sections) {
            let html = `<div class="huffman-step-table" style="margin-bottom:12px;">`;
            if (section.title) {
                html += `<div class="section-title" style="font-size:0.8rem;background:var(--bg-main);border-bottom:1px solid var(--border-light);border-top-left-radius:4px;border-top-right-radius:4px;padding:6px 10px;">${section.title}</div>`;
            }
            html += `<div style="padding:8px;">`;

            if (section.html) {
                html += section.html;
            } else if (section.items) {
                for (const item of section.items) {
                    const g = item.graph;
                    const lbl = item.label || 'G';
                    const isTree = item.isTree || false;

                    const vStr = g.vertices.join(', ');
                    const edgeStrs = g.edges.map(e => {
                        const w = (e.weight !== null && e.weight !== undefined) ? e.weight : 1;
                        return `${e.from}${e.to}:${w}`;
                    });
                    const aStr = edgeStrs.join(', ');
                    const totalW = g.edges.reduce((s, e) => s + ((e.weight !== null && e.weight !== undefined) ? e.weight : 1), 0);

                    const dL = isTree ? `δ<sub>${lbl}</sub>` : 'δ';
                    const aL = isTree ? `A<sub>${lbl}</sub>` : 'A';
                    const gDef = isTree ? `T<sub>${lbl}</sub>` : lbl;

                    html += `<div style="margin-bottom:10px;padding:8px;background:rgba(43,87,154,0.04);border-radius:4px;border-left:3px solid var(--accent-primary);">`;
                    html += `<div style="font-family:Consolas,monospace;font-size:0.83rem;line-height:1.9;">`;
                    html += `<strong>${g.name || gDef} = (${dL}, ${aL})</strong><br>`;
                    html += `${dL} = {${vStr || '∅'}}<br>`;
                    html += `${aL} = {${aStr || '∅'}}`;
                    if (g.edges.length > 0) {
                        html += `<br><span style="color:var(--accent-primary);font-weight:600;">Peso: ${totalW} &nbsp;|&nbsp; Long: ${g.edges.length}</span>`;
                    }
                    html += `</div></div>`;
                }
            }

            html += `</div></div>`;
            this.el.descContent.innerHTML += html;
        }
        this.el.descContent.scrollTop = 0;
    }

    // ─── Save / Load ──────────────────────────────────────────────────────────

    async _onSave() {
        if (!this.g1.created && !this.g2.created) {
            Validation.showError('No hay grafos para guardar.');
            return;
        }
        const data = {
            algorithm: 'arboles-grafos',
            timestamp: new Date().toISOString(),
            structure: {
                g1: this.g1.created ? this.g1.toJSON() : null,
                g2: this.g2.created ? this.g2.toJSON() : null
            }
        };
        await FileManager.saveJSON(JSON.stringify(data, null, 2), `arboles_grafos_${Date.now()}.json`);
        this._addLog('Datos guardados exitosamente.', 'success');
    }

    async _onLoad() {
        const data = await new Promise(resolve => {
            const input = document.createElement('input');
            input.type = 'file'; input.accept = '.json';
            input.onchange = e => {
                const file = e.target.files[0];
                if (!file) { resolve(null); return; }
                const reader = new FileReader();
                reader.onload = ev => {
                    try { resolve(JSON.parse(ev.target.result)); }
                    catch { Validation.showError('Error al leer JSON.'); resolve(null); }
                };
                reader.readAsText(file);
            };
            input.click();
        });

        if (!data || data.algorithm !== 'arboles-grafos') {
            if (data) Validation.showError('El archivo no corresponde a Árboles como Grafos.');
            return;
        }

        const s = data.structure;
        if (s.g1) this.g1.fromJSON(s.g1); else this.g1.reset();
        if (s.g2) this.g2.fromJSON(s.g2); else this.g2.reset();
        this._invalidateResult();
        this._syncUI();
        this._fitGraph(this.el.canvasG1, this.g1, this._cam1);
        this._fitGraph(this.el.canvasG2, this.g2, this._cam2);
        this._drawAll();
        this._addLog('Datos cargados correctamente.', 'success');
    }

    // ─── Log ──────────────────────────────────────────────────────────────────

    _addLog(msg, type = 'info') {
        const entry = document.createElement('div');
        entry.classList.add('log-entry', `log-${type}`);
        entry.textContent = msg;
        this.el.logContent.appendChild(entry);
        this.el.logContent.scrollTop = this.el.logContent.scrollHeight;
    }

    // ─── Drag Mode ────────────────────────────────────────────────────────────

    _toggleDragMode(key) {
        if (key === 'g1') { this._dragModeG1 = !this._dragModeG1; this.el.dragG1.classList.toggle('active', this._dragModeG1); }
        else if (key === 'g2') { this._dragModeG2 = !this._dragModeG2; this.el.dragG2.classList.toggle('active', this._dragModeG2); }
        else if (key === 'result') { this._dragModeR = !this._dragModeR; this.el.dragResult.classList.toggle('active', this._dragModeR); }
    }

    // ─── Maximizar canvas ─────────────────────────────────────────────────────

    _toggleMaximize(target) {
        this._maximizedCanvas = this._maximizedCanvas === target ? null : target;

        [this.el.topRow, this.el.resultRow].forEach(r => {
            r.classList.remove('grafos-hidden-max', 'grafos-full-row');
        });
        [this.el.wrapG1, this.el.wrapG2, this.el.wrapResult].forEach(w => w.classList.remove('grafos-hidden-max'));
        [this.el.expandG1, this.el.expandG2, this.el.expandResult].forEach(b => b.classList.remove('active'));

        if (this._maximizedCanvas === 'g1') {
            this.el.wrapG2.classList.add('grafos-hidden-max');
            this.el.resultRow.classList.add('grafos-hidden-max');
            this.el.topRow.classList.add('grafos-full-row');
            this.el.expandG1.classList.add('active');
        } else if (this._maximizedCanvas === 'g2') {
            this.el.wrapG1.classList.add('grafos-hidden-max');
            this.el.resultRow.classList.add('grafos-hidden-max');
            this.el.topRow.classList.add('grafos-full-row');
            this.el.expandG2.classList.add('active');
        } else if (this._maximizedCanvas === 'result') {
            this.el.topRow.classList.add('grafos-hidden-max');
            this.el.resultRow.classList.add('grafos-full-row');
            this.el.expandResult.classList.add('active');
        }

        this._resizeAllCanvas();
        const applyFit = () => {
            if (this._maximizedCanvas === 'g1') { this._fitGraph(this.el.canvasG1, this.g1, this._cam1); }
            else if (this._maximizedCanvas === 'g2') { this._fitGraph(this.el.canvasG2, this.g2, this._cam2); }
            else if (this._maximizedCanvas === 'result' && this.gResult) { this._fitGraph(this.el.canvasResult, this.gResult, this._camR, true); }
            else {
                this._fitGraph(this.el.canvasG1, this.g1, this._cam1);
                this._fitGraph(this.el.canvasG2, this.g2, this._cam2);
                if (this.gResult) this._fitGraph(this.el.canvasResult, this.gResult, this._camR, true);
            }
            this._drawAll();
        };
        applyFit();
        setTimeout(applyFit, 150);
    }

    // ─── Canvas Pan/Zoom/Drag ─────────────────────────────────────────────────

    _bindCanvasPanZoom(canvas, getGraph, cam, isDragActive, redraw) {
        canvas.addEventListener('mousedown', e => {
            const rect = canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            const graph = getGraph();

            if (isDragActive() && graph && graph.vertices.length > 0) {
                const worldX = (mouseX - cam.offsetX) / cam.scale;
                const worldY = (mouseY - cam.offsetY) / cam.scale;
                const cx = canvas.width / 2, cy = canvas.height / 2;
                const positions = graph.getVertexPositions(cx, cy);
                const r = this._nodeRadiusFor(graph);

                for (const v of graph.vertices) {
                    const pos = positions[v];
                    if (!pos) continue;
                    if (Math.hypot(worldX - pos.x, worldY - pos.y) < r) {
                        this._draggingNode = { graph, vertex: v };
                        canvas.style.cursor = 'grabbing';
                        return;
                    }
                }
            }

            cam.isPanning = true;
            cam.startX = e.clientX - cam.offsetX;
            cam.startY = e.clientY - cam.offsetY;
            canvas.style.cursor = 'grabbing';
        });

        canvas.addEventListener('mousemove', e => {
            const graph = getGraph();
            if (this._draggingNode && this._draggingNode.graph === graph) {
                const rect = canvas.getBoundingClientRect();
                const worldX = (e.clientX - rect.left - cam.offsetX) / cam.scale;
                const worldY = (e.clientY - rect.top - cam.offsetY) / cam.scale;
                graph.setVertexPosition(this._draggingNode.vertex, worldX, worldY);
                redraw();
                return;
            }
            if (!cam.isPanning) return;
            cam.offsetX = e.clientX - cam.startX;
            cam.offsetY = e.clientY - cam.startY;
            redraw();
        });

        const stop = () => {
            cam.isPanning = false;
            this._draggingNode = null;
            canvas.style.cursor = 'grab';
        };
        canvas.addEventListener('mouseup', stop);
        canvas.addEventListener('mouseleave', stop);

        canvas.addEventListener('wheel', e => {
            e.preventDefault();
            const rect = canvas.getBoundingClientRect();
            const mx = e.clientX - rect.left, my = e.clientY - rect.top;
            const factor = e.deltaY < 0 ? 1.1 : 0.9;
            const ns = Math.max(0.1, Math.min(5, cam.scale * factor));
            cam.offsetX = mx - (mx - cam.offsetX) * (ns / cam.scale);
            cam.offsetY = my - (my - cam.offsetY) * (ns / cam.scale);
            cam.scale = ns;
            redraw();
        }, { passive: false });
    }

    // ─── Resize y Fit ─────────────────────────────────────────────────────────

    _resizeAllCanvas() {
        [
            [this.el.canvasG1, this.el.wrapG1],
            [this.el.canvasG2, this.el.wrapG2],
            [this.el.canvasResult, this.el.wrapResult],
            [this.el.canvasResult2, this.el.wrapResult2]
        ].forEach(([canvas, wrap]) => {
            if (wrap && wrap.clientWidth > 0) {
                canvas.width = wrap.clientWidth;
                canvas.height = wrap.clientHeight;
            }
        });
    }

    // ─── Herencia de posiciones del grafo fuente al resultado ─────────────────

    /**
     * Copia las posiciones manuales y las posiciones calculadas (grid) de un grafo fuente
     * a un grafo destino, para que el resultado use exactamente el mismo layout del usuario.
     * Solo se copian los vértices que existen en el destino.
     * @param {GraphModel} sourceGraph - Grafo cuyos nodos tienen posición establecida.
     * @param {GraphModel} targetGraph - Grafo resultado que recibirá las posiciones.
     */
    _inheritPositions(sourceGraph, targetGraph) {
        if (!sourceGraph || !targetGraph) return;

        // Calcular posiciones actuales del grafo fuente (mix de manual + grid)
        const canvas = this.el.canvasG1;
        const cx = canvas ? canvas.width / 2 : 300;
        const cy = canvas ? canvas.height / 2 : 200;
        const srcPositions = sourceGraph.getVertexPositions(cx, cy);

        // Copiar como posiciones manuales en el destino
        for (const v of targetGraph.vertices) {
            if (srcPositions[v]) {
                targetGraph.manualPositions[v] = { x: srcPositions[v].x, y: srcPositions[v].y };
            }
        }
    }

    /**
     * Fit para canvas de resultado (usa getVertexPositions que respeta manualPositions).
     */
    _fitGraph(canvas, graph, cam) {
        if (!graph || graph.vertices.length === 0) {
            cam.offsetX = 0; cam.offsetY = 0; cam.scale = 1; return;
        }
        const cx = canvas.width / 2, cy = canvas.height / 2;
        const positions = graph.getVertexPositions(cx, cy);

        const posArr = Object.values(positions);
        const r = this._nodeRadiusFor(graph);
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        for (const p of posArr) {
            minX = Math.min(minX, p.x - r); maxX = Math.max(maxX, p.x + r);
            minY = Math.min(minY, p.y - r); maxY = Math.max(maxY, p.y + r);
        }

        const pad = 40;
        const treeW = maxX - minX + pad * 2;
        const treeH = maxY - minY + pad * 2;
        const sx = canvas.width / treeW, sy = canvas.height / treeH;
        cam.scale = Math.min(sx, sy, 2);

        const cxTree = (minX + maxX) / 2;
        const cyTree = (minY + maxY) / 2;
        cam.offsetX = canvas.width / 2 - cxTree * cam.scale;
        cam.offsetY = canvas.height / 2 - cyTree * cam.scale;
    }

    _refreshActiveCanvas() {
        const canvas = this._activeGraph === 'g1' ? this.el.canvasG1 : this.el.canvasG2;
        const cam = this._activeGraph === 'g1' ? this._cam1 : this._cam2;
        const g = this._getActiveGraph();
        this._fitGraph(canvas, g, cam);
        this._drawGraph(canvas, g, cam);
    }

    // ─── Layout Jerárquico para Árboles ──────────────────────────────────────

    /**
     * Calcula posiciones jerárquicas (BFS por niveles) para un árbol.
     * La raíz es el primer vértice, distribuido de arriba a abajo.
     * @param {GraphModel} graph
     * @param {number} cx - Centro X del canvas
     * @param {number} cy - Centro Y del canvas
     * @returns {Object.<string, {x, y, label}>}
     */
    _getTreePositions(graph, cx, cy) {
        const n = graph.vertices.length;
        if (n === 0) return {};

        // Si tiene posiciones manuales usarlas
        const hasManual = Object.keys(graph.manualPositions || {}).length > 0;
        if (hasManual) return graph.getVertexPositions(cx, cy);

        // Construir lista de adyacencia
        const adj = {};
        for (const v of graph.vertices) adj[v] = [];
        for (const e of graph.edges) {
            adj[e.from].push(e.to);
            adj[e.to].push(e.from);
        }

        // BFS desde la raíz (primer vértice)
        const root = graph.vertices[0];
        const levels = {};
        const visited = new Set();
        const queue = [{ v: root, level: 0 }];
        visited.add(root);
        let maxLevel = 0;

        while (queue.length > 0) {
            const { v, level } = queue.shift();
            if (!levels[level]) levels[level] = [];
            levels[level].push(v);
            maxLevel = Math.max(maxLevel, level);

            for (const nb of (adj[v] || [])) {
                if (!visited.has(nb)) {
                    visited.add(nb);
                    queue.push({ v: nb, level: level + 1 });
                }
            }
        }

        // Añadir vértices no visitados (aislados)
        for (const v of graph.vertices) {
            if (!visited.has(v)) {
                maxLevel++;
                levels[maxLevel] = [v];
            }
        }

        // Calcular posiciones
        const levelGap = 90;
        const nodeGap = 80;
        const positions = {};
        const totalHeight = maxLevel * levelGap;
        const startY = cy - totalHeight / 2;

        for (let lvl = 0; lvl <= maxLevel; lvl++) {
            const group = levels[lvl] || [];
            const totalW = (group.length - 1) * nodeGap;
            const startX = cx - totalW / 2;
            const y = startY + lvl * levelGap;

            group.forEach((v, i) => {
                positions[v] = { x: startX + i * nodeGap, y, label: v };
            });
        }

        return positions;
    }

    // ─── Draw ────────────────────────────────────────────────────────────────

    _drawAll() {
        this._drawGraph(this.el.canvasG1, this.g1, this._cam1);
        this._drawGraph(this.el.canvasG2, this.g2, this._cam2);
        this._drawResultCanvas();
        if (this.gResult2) {
            this._drawGraph(this.el.canvasResult2, this.gResult2, this._camR2, this._result2HighlightVertices, this._result2HighlightEdges, true);
        }
    }

    _drawResultCanvas() {
        this._drawGraph(
            this.el.canvasResult,
            this.gResult,
            this._camR,
            this._resultHighlightVertices,
            this._resultHighlightEdges
        );
    }

    _nodeRadiusFor(graph) {
        if (!graph || graph.vertices.length === 0) return 20;
        const maxLabelLen = graph.vertices.reduce((m, v) => Math.max(m, v.length), 0);
        return maxLabelLen > 5 ? 28 : 20;
    }

    /**
     * Dibuja un grafo completo en un canvas.
     * Siempre usa getVertexPositions (grid + manualPositions) para respetar el layout del usuario.
     * @param {HTMLCanvasElement} canvas
     * @param {GraphModel} graph
     * @param {Object} cam
     * @param {Object} [hlVertices={}] - Mapa vertex→color para highlights
     * @param {Object} [hlEdges={}] - Mapa 'from-to'→color para highlights de aristas
     */
    _drawGraph(canvas, graph, cam, hlVertices = {}, hlEdges = {}) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = '#FAFBFD';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Rejilla de puntos
        ctx.fillStyle = '#E0E4EA';
        const gridSize = 30 * cam.scale;
        if (gridSize > 8) {
            const sx2 = ((cam.offsetX % gridSize) + gridSize) % gridSize;
            const sy2 = ((cam.offsetY % gridSize) + gridSize) % gridSize;
            for (let x = sx2; x < canvas.width; x += gridSize)
                for (let y = sy2; y < canvas.height; y += gridSize) {
                    ctx.beginPath(); ctx.arc(x, y, 1, 0, Math.PI * 2); ctx.fill();
                }
        }

        if (!graph || graph.vertices.length === 0) {
            ctx.fillStyle = '#A0A8B8';
            ctx.font = '14px "Segoe UI", sans-serif';
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            const msg = graph && graph.name ? `${graph.name} — Vacío` : 'Vacío o no definido';
            ctx.fillText(msg, canvas.width / 2, canvas.height / 2);
            return;
        }

        const r = this._nodeRadiusFor(graph);
        const cx = canvas.width / 2, cy = canvas.height / 2;
        const positions = graph.getVertexPositions(cx, cy);

        ctx.save();
        ctx.translate(cam.offsetX, cam.offsetY);
        ctx.scale(cam.scale, cam.scale);

        // Contar aristas entre mismos nodos
        const edgeCounts = {};
        for (const e of graph.edges) {
            const key = [e.from, e.to].sort().join('-');
            edgeCounts[key] = (edgeCounts[key] || 0) + 1;
        }
        const edgeDrawn = {};

        // 1. Aristas
        for (const e of graph.edges) {
            const p1 = positions[e.from], p2 = positions[e.to];
            if (!p1 || !p2) continue;
            const key = [e.from, e.to].sort().join('-');
            edgeDrawn[key] = (edgeDrawn[key] || 0) + 1;
            const curveDir = edgeDrawn[key] % 2 === 0 ? 1 : -1;
            const hlColor = hlEdges[key] || null;
            this._drawEdge(ctx, e, p1, p2, false, r, e.from === e.to, edgeCounts[key] > 1 ? curveDir : 0, hlColor);
        }

        // 2. Vértices
        for (const v of graph.vertices) {
            const p = positions[v];
            if (!p) continue;
            const hlColor = hlVertices[v] || null;
            this._drawVertex(ctx, v, p.x, p.y, r, hlColor);
        }

        ctx.restore();
    }

    _drawEdge(ctx, edge, p1, p2, directed, r, isSelf, curvature, hlColor) {
        const color = hlColor || '#8494AB';
        ctx.strokeStyle = color;
        ctx.lineWidth = hlColor ? 2.5 : 1.5;
        ctx.setLineDash([]);

        let sx, sy, ex, ey, midX, midY, ux, uy;

        if (isSelf) {
            ctx.beginPath();
            ctx.arc(p1.x + r, p1.y - r, r * 0.75, 0, Math.PI * 2);
            ctx.stroke();
            midX = p1.x + r * 1.5; midY = p1.y - r * 1.5;
            ux = 1; uy = -1;
        } else {
            const dx = p2.x - p1.x, dy = p2.y - p1.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist === 0) return;
            ux = dx / dist; uy = dy / dist;
            sx = p1.x + ux * r; sy = p1.y + uy * r;
            ex = p2.x - ux * r; ey = p2.y - uy * r;

            ctx.beginPath();
            if (curvature !== 0) {
                midX = (sx + ex) / 2; midY = (sy + ey) / 2;
                const ca = curvature * 30;
                const cpX = midX - uy * ca, cpY = midY + ux * ca;
                ctx.moveTo(sx, sy); ctx.quadraticCurveTo(cpX, cpY, ex, ey);
                midX = (sx + cpX + ex) / 3; midY = (sy + cpY + ey) / 3;
            } else {
                ctx.moveTo(sx, sy); ctx.lineTo(ex, ey);
                midX = (sx + ex) / 2; midY = (sy + ey) / 2;
            }
            ctx.stroke();
        }

        // Etiqueta: ID + peso
        const w = (edge.weight !== null && edge.weight !== undefined) ? edge.weight : 1;
        const perp = curvature !== 0 ? curvature * 12 : 10;
        const labelX = midX - uy * perp;
        const labelY = midY + (ux || 0) * perp;

        // Fondo para legibilidad
        ctx.font = 'bold 10px "Segoe UI", sans-serif';
        const wStr = String(w);
        const tw = ctx.measureText(wStr).width;
        ctx.fillStyle = 'rgba(250,251,253,0.92)';
        ctx.fillRect(labelX - tw / 2 - 3, labelY - 8, tw + 6, 16);

        ctx.fillStyle = hlColor || '#1B3A6B';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(wStr, labelX, labelY);
    }

    _drawVertex(ctx, label, x, y, r, hlColor) {
        const labelLen = label.length;
        const dynR = labelLen > 5 ? r + (labelLen - 5) * 4 : r;

        ctx.beginPath(); ctx.arc(x, y, dynR, 0, Math.PI * 2);
        ctx.fillStyle = hlColor || '#D6E4F0';
        ctx.fill();
        ctx.strokeStyle = hlColor ? this._darkenColor(hlColor) : '#2B579A';
        ctx.lineWidth = 2;
        ctx.stroke();

        const isLight = hlColor ? this._isLightColor(hlColor) : true;
        const fontSize = labelLen > 6 ? 9 : labelLen > 3 ? 11 : 13;
        ctx.font = `bold ${fontSize}px "Segoe UI", sans-serif`;
        ctx.fillStyle = hlColor ? (isLight ? '#1B3465' : '#fff') : '#2B579A';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(label, x, y);
    }

    _isLightColor(hex) {
        try {
            const r = parseInt(hex.slice(1, 3), 16);
            const g = parseInt(hex.slice(3, 5), 16);
            const b = parseInt(hex.slice(5, 7), 16);
            return (r * 0.299 + g * 0.587 + b * 0.114) > 155;
        } catch { return true; }
    }

    _darkenColor(hex) {
        try {
            const r = Math.max(0, parseInt(hex.slice(1, 3), 16) - 40);
            const g = Math.max(0, parseInt(hex.slice(3, 5), 16) - 40);
            const b = Math.max(0, parseInt(hex.slice(5, 7), 16) - 40);
            return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
        } catch { return '#1B3A6B'; }
    }
}
