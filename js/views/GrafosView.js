class GrafosView {
    constructor(containerEl) {
        this.container = containerEl;
        this.g1 = new GraphModel();
        this.g2 = new GraphModel();
        this.gResult = null;
        this.gResult2 = null;
        this.el = {};
        this.logMessages = [];
        this.opLogMessages = [];
        this._lastOperation = null;
        this._lastBinaryOp = null;
        this._cam1 = this._newCam();
        this._cam2 = this._newCam();
        this._camR = this._newCam();
        this._camR2 = this._newCam();
        this._nodeRadius = 20;
        this._activeGraph = 'g1';
        this._directed = false;
        this._dragModeG1 = false;
        this._dragModeG2 = false;
        this._dragModeR = false;
        this._dragModeR2 = false;
        this._maximizedCanvas = null;
        this._draggingNode = null;
        // Tree state
        this._centerSteps = [];
        this._centerStepIdx = 0;
        this._centerSourceGraph = null;
        this._mstMaximize = false;
        this._resultHighlightVertices = {};
        this._resultHighlightEdges = {};
        this._result2HighlightVertices = {};
        this._result2HighlightEdges = {};
        this._distModeActive = false;
        this._distStepsG1 = [];
        this._distStepIdxG1 = 0;
        this._distStepsG2 = [];
        this._distStepIdxG2 = 0;
    }

    _newCam() {
        return { offsetX: 0, offsetY: 0, scale: 1, isPanning: false, startX: 0, startY: 0 };
    }

    show() {
        this.container.innerHTML = '';
        this.container.classList.remove('hidden');
        const welcome = document.getElementById('welcome-screen');
        if (welcome) welcome.classList.add('hidden');
        this._inputGraphsCollapsed = false;

        this.container.innerHTML = `
            <div class="algo-title">Grafos — Operaciones entre Grafos</div>
            <div class="grafos-layout">

                <!-- Panel Izquierdo -->
                <div class="grafos-left-panel">

                    <!-- Bloque 1: Definición -->
                    <div class="section-block">
                        <div class="section-title">Definición de Grafos</div>
                        <div class="grafos-input-panel">
                            <div class="grafos-field-row">
                                <label>Grafo a editar</label>
                                <div class="grafos-graph-selector">
                                    <button class="grafos-tab-btn active" id="tab-g1" data-target="g1">G1</button>
                                    <button class="grafos-tab-btn" id="tab-g2" data-target="g2">G2</button>
                                </div>
                            </div>
                            <div class="grafos-field-col">
                                <label>Vértices</label>
                                <div class="grafos-vertex-input-row">
                                    <input type="text" id="grafos-input-vertex" placeholder="Ej: a, b, c... Enter para añadir">
                                    <button class="btn btn-primary" id="grafos-add-vertex-btn" style="min-width:40px;justify-content:center;">+</button>
                                </div>
                                <div class="grafos-vertex-chips" id="grafos-vertex-list"></div>
                            </div>
                            <div class="grafos-field-col" style="margin-top:5px;">
                                <label>Aristas</label>
                                <div class="tag-edge-input-row">
                                    <select id="grafos-edge-from"><option value="">--</option></select>
                                    <span style="flex-shrink:0;">—</span>
                                    <select id="grafos-edge-to"><option value="">--</option></select>
                                    <input type="number" id="grafos-edge-weight" placeholder="Peso" step="any" style="width:58px;flex-shrink:0;">
                                    <button class="btn btn-primary" id="grafos-add-edge-btn" style="min-width:40px;justify-content:center;">+</button>
                                </div>
                                <div class="grafos-edge-list" id="grafos-edge-list"></div>
                            </div>
                            <div class="grafos-btn-row">
                                <button class="btn btn-primary" id="grafos-btn-create" style="background-color:#d32f2f;color:white;border:none;">LIMPIAR TODO</button>
                                <button class="btn btn-secondary" id="grafos-btn-clear-graph">LIMPIAR GRAFO</button>
                            </div>
                        </div>
                    </div>

                    <!-- Bloque 2: Operación -->
                    <div class="section-block">
                        <div class="section-title">Operación</div>
                        <div class="grafos-op-panel">
                            <div class="grafos-field-col">
                                <label for="grafos-op-type">Categoría</label>
                                <select id="grafos-op-type">
                                    <option value="binary">Operación entre grafos (G1 y G2)</option>
                                    <option value="unary">Modificar grafo activo</option>
                                    <option value="tree">Árboles como Grafos</option>
                                </select>
                            </div>
                            <div class="grafos-field-col" id="grafos-op-binary-col">
                                <label for="grafos-op-select">Operación (G1 / G2)</label>
                                <select id="grafos-op-select">
                                    <option value="union">Unión (G1 ∪ G2)</option>
                                    <option value="intersection">Intersección (G1 ∩ G2)</option>
                                    <option value="sumRing">Suma Anillo (G1 ⊕ G2)</option>
                                    <option value="sum">Suma (G1 + G2)</option>
                                    <option value="cartesianProduct">Producto Cartesiano (G1 X G2)</option>
                                    <option value="composition">Composición (G1[G2])</option>
                                    <option value="tensorProduct">Producto Tensorial (G1 ⊗ G2)</option>
                                </select>
                            </div>
                            <div class="grafos-field-col hidden" id="grafos-op-unary-col">
                                <label for="grafos-op-unary-select">Edición</label>
                                <select id="grafos-op-unary-select">
                                    <option value="mergeVertices">Fusión de vértices</option>
                                    <option value="contractEdge">Contracción de arista</option>
                                    <option value="complement">Complemento</option>
                                </select>
                                <div id="grafos-op-unary-params" style="margin-top:8px;"></div>
                            </div>
                            <div class="grafos-field-col hidden" id="grafos-op-tree-col">
                                <label for="grafos-op-tree-select">Operación</label>
                                <select id="grafos-op-tree-select">
                                    <option value="center">Centro o Bicentro del Árbol</option>
                                    <option value="mst">Árbol de Expansión Mínimo (MST)</option>
                                    <option value="maxst">Árbol de Expansión Máximo (MaxST)</option>
                                    <option value="distance">Distancia entre 2 Árboles de Expansión</option>
                                    <option value="rank">Rango y Nulidad</option>
                                </select>
                            </div>
                            <button class="btn btn-primary grafos-btn-full" id="grafos-btn-execute" style="margin-bottom:8px;">▶ CALCULAR</button>
                        </div>
                    </div>

                    <!-- Bloque 3: Mensajes -->
                    <div class="section-block grafos-log-section">
                        <div class="section-title">Mensajes y Resultados</div>
                        <div class="tree-log-content" id="grafos-update-content" style="height:120px;"></div>
                    </div>
                </div>

                <!-- Canvas Central -->
                <div class="grafos-canvas-area">
                    <div class="grafos-top-row" id="grafos-top-row">
                        <div class="grafos-canvas-wrapper" id="grafos-wrap-g1">
                            <div class="grafos-canvas-label" id="grafos-label-g1">Grafo 1 (G1)</div>
                            <canvas id="grafos-canvas-g1"></canvas>
                            <button class="tree-fit-btn expand-btn" id="grafos-expand-g1" title="Maximizar G1">⛶</button>
                            <button class="tree-fit-btn drag-toggle-btn" id="grafos-drag-g1" title="Mover nodos G1">✥</button>
                            <button class="tree-fit-btn" id="grafos-fit-g1" title="Ajustar vista G1">⊞</button>
                            <div id="grafos-dist-nav-g1" class="tag-step-nav hidden">
                                <button id="grafos-dist-prev-g1" class="tag-step-btn">◀</button>
                                <span id="grafos-dist-label-g1">Paso 1 de 2</span>
                                <button id="grafos-dist-next-g1" class="tag-step-btn">▶</button>
                            </div>
                        </div>
                        <div class="grafos-canvas-wrapper" id="grafos-wrap-g2">
                            <div class="grafos-canvas-label" id="grafos-label-g2">Grafo 2 (G2)</div>
                            <canvas id="grafos-canvas-g2"></canvas>
                            <button class="tree-fit-btn expand-btn" id="grafos-expand-g2" title="Maximizar G2">⛶</button>
                            <button class="tree-fit-btn drag-toggle-btn" id="grafos-drag-g2" title="Mover nodos G2">✥</button>
                            <button class="tree-fit-btn" id="grafos-fit-g2" title="Ajustar vista G2">⊞</button>
                            <div id="grafos-dist-nav-g2" class="tag-step-nav hidden">
                                <button id="grafos-dist-prev-g2" class="tag-step-btn">◀</button>
                                <span id="grafos-dist-label-g2">Paso 1 de 2</span>
                                <button id="grafos-dist-next-g2" class="tag-step-btn">▶</button>
                            </div>
                        </div>
                    </div>
                    <div class="grafos-result-row" id="grafos-result-row">
                        <div class="grafos-canvas-wrapper grafos-result-canvas" id="grafos-wrap-result" style="flex:1;">
                            <div class="grafos-canvas-label" id="grafos-result-label">Resultado</div>
                            <canvas id="grafos-canvas-result"></canvas>
                            <button class="tree-fit-btn expand-btn" id="grafos-expand-result" title="Maximizar Resultado">⛶</button>
                            <button class="tree-fit-btn drag-toggle-btn" id="grafos-drag-result" title="Mover nodos">✥</button>
                            <button class="tree-fit-btn" id="grafos-fit-result" title="Ajustar vista resultado">⊞</button>
                            <div id="grafos-step-nav" class="tag-step-nav hidden">
                                <button id="grafos-step-prev" class="tag-step-btn">◀</button>
                                <span id="grafos-step-label">Paso 1 de 1</span>
                                <button id="grafos-step-next" class="tag-step-btn">▶</button>
                            </div>
                        </div>
                        <div class="grafos-canvas-wrapper grafos-result-canvas" id="grafos-wrap-result2" style="flex:1;display:none;">
                            <div class="grafos-canvas-label" id="grafos-result2-label">Intersección</div>
                            <canvas id="grafos-canvas-result2"></canvas>
                            <button class="tree-fit-btn expand-btn" id="grafos-expand-result2" title="Maximizar">⛶</button>
                            <button class="tree-fit-btn drag-toggle-btn" id="grafos-drag-result2" title="Mover nodos">✥</button>
                            <button class="tree-fit-btn" id="grafos-fit-result2" title="Ajustar vista">⊞</button>
                        </div>
                    </div>
                </div>

                <!-- Panel Derecho -->
                <div class="grafos-right-panel">
                    <div class="section-block">
                        <div class="section-title" id="grafos-right-panel-title">Operaciones de la Estructura</div>
                        <div class="tree-log-content" id="grafos-op-content" style="height:100%;">
                            <div class="huffman-empty-msg">Ejecute una operación para ver los resultados aquí.</div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="footer-buttons">
                <button class="btn btn-success" id="grafos-btn-save">GUARDAR</button>
                <button class="btn btn-info" id="grafos-btn-load-file">CARGAR</button>
                <button class="btn btn-primary" id="grafos-btn-print">IMPRIMIR</button>
            </div>
        `;

        this._cacheElements();
        this._bindEvents();
        this._resizeAllCanvas();
        this._syncUI();
        this._drawAll();
        this.g1.create([], []);
        this.g2.create([], []);
    }

    _cacheElements() {
        this.el = {
            tabG1: document.getElementById('tab-g1'),
            tabG2: document.getElementById('tab-g2'),
            inputVertex: document.getElementById('grafos-input-vertex'),
            addVertexBtn: document.getElementById('grafos-add-vertex-btn'),
            vertexList: document.getElementById('grafos-vertex-list'),
            edgeFrom: document.getElementById('grafos-edge-from'),
            edgeTo: document.getElementById('grafos-edge-to'),
            edgeWeight: document.getElementById('grafos-edge-weight'),
            addEdgeBtn: document.getElementById('grafos-add-edge-btn'),
            edgeList: document.getElementById('grafos-edge-list'),
            btnCreate: document.getElementById('grafos-btn-create'),
            btnClearGraph: document.getElementById('grafos-btn-clear-graph'),
            btnLoadFile: document.getElementById('grafos-btn-load-file'),
            opTypeSelect: document.getElementById('grafos-op-type'),
            opBinaryCol: document.getElementById('grafos-op-binary-col'),
            opUnaryCol: document.getElementById('grafos-op-unary-col'),
            opTreeCol: document.getElementById('grafos-op-tree-col'),
            opSelect: document.getElementById('grafos-op-select'),
            opUnarySelect: document.getElementById('grafos-op-unary-select'),
            opTreeSelect: document.getElementById('grafos-op-tree-select'),
            opUnaryParams: document.getElementById('grafos-op-unary-params'),
            btnExecute: document.getElementById('grafos-btn-execute'),
            logContent: document.getElementById('grafos-update-content'),
            opContent: document.getElementById('grafos-op-content'),
            rightPanelTitle: document.getElementById('grafos-right-panel-title'),
            btnSave: document.getElementById('grafos-btn-save'),
            btnPrint: document.getElementById('grafos-btn-print'),
            canvasG1: document.getElementById('grafos-canvas-g1'),
            canvasG2: document.getElementById('grafos-canvas-g2'),
            canvasResult: document.getElementById('grafos-canvas-result'),
            canvasResult2: document.getElementById('grafos-canvas-result2'),
            fitG1: document.getElementById('grafos-fit-g1'),
            fitG2: document.getElementById('grafos-fit-g2'),
            fitResult: document.getElementById('grafos-fit-result'),
            fitResult2: document.getElementById('grafos-fit-result2'),
            resultLabel: document.getElementById('grafos-result-label'),
            result2Label: document.getElementById('grafos-result2-label'),
            canvasLabelG1: document.getElementById('grafos-label-g1'),
            canvasLabelG2: document.getElementById('grafos-label-g2'),
            topRow: document.getElementById('grafos-top-row'),
            resultRow: document.getElementById('grafos-result-row'),
            dragG1: document.getElementById('grafos-drag-g1'),
            dragG2: document.getElementById('grafos-drag-g2'),
            dragResult: document.getElementById('grafos-drag-result'),
            dragResult2: document.getElementById('grafos-drag-result2'),
            expandG1: document.getElementById('grafos-expand-g1'),
            expandG2: document.getElementById('grafos-expand-g2'),
            expandResult: document.getElementById('grafos-expand-result'),
            expandResult2: document.getElementById('grafos-expand-result2'),
            wrapG1: document.getElementById('grafos-wrap-g1'),
            wrapG2: document.getElementById('grafos-wrap-g2'),
            wrapResult: document.getElementById('grafos-wrap-result'),
            wrapResult2: document.getElementById('grafos-wrap-result2'),
            stepNav: document.getElementById('grafos-step-nav'),
            stepPrev: document.getElementById('grafos-step-prev'),
            stepNext: document.getElementById('grafos-step-next'),
            stepLabel: document.getElementById('grafos-step-label'),
            distNavG1: document.getElementById('grafos-dist-nav-g1'),
            distPrevG1: document.getElementById('grafos-dist-prev-g1'),
            distNextG1: document.getElementById('grafos-dist-next-g1'),
            distLabelG1: document.getElementById('grafos-dist-label-g1'),
            distNavG2: document.getElementById('grafos-dist-nav-g2'),
            distPrevG2: document.getElementById('grafos-dist-prev-g2'),
            distNextG2: document.getElementById('grafos-dist-next-g2'),
            distLabelG2: document.getElementById('grafos-dist-label-g2')
        };
    }

    _bindEvents() {
        const el = this.el;
        el.tabG1.addEventListener('click', () => this._switchTab('g1'));
        el.tabG2.addEventListener('click', () => this._switchTab('g2'));
        el.addVertexBtn.addEventListener('click', () => this._handleAddVertex());
        el.inputVertex.addEventListener('keypress', (e) => { if (e.key === 'Enter') this._handleAddVertex(); });
        el.inputVertex.addEventListener('input', () => { el.inputVertex.value = el.inputVertex.value.toLowerCase(); });
        el.addEdgeBtn.addEventListener('click', () => this._handleAddEdge());
        el.btnCreate.addEventListener('click', () => this._onCreate());
        el.btnClearGraph.addEventListener('click', () => this._onClearGraph());
        el.btnLoadFile.addEventListener('click', () => this._onLoadFile());
        el.btnExecute.addEventListener('click', () => this._onExecute());
        el.btnSave.addEventListener('click', () => this._onSave());
        el.btnPrint.addEventListener('click', () => window.print());
        el.opTypeSelect.addEventListener('change', () => this._updateOpUI());
        el.opUnarySelect.addEventListener('change', () => this._updateOpUnaryParamsUI());

        el.fitG1.addEventListener('click', () => { const g = this._getDistDisplayG1(); this._fitGraph(el.canvasG1, g, this._cam1); this._redrawG1(); });
        el.fitG2.addEventListener('click', () => { const g = this._getDistDisplayG2(); this._fitGraph(el.canvasG2, g, this._cam2); this._redrawG2(); });
        el.fitResult.addEventListener('click', () => { if (this.gResult) { this._fitGraph(el.canvasResult, this.gResult, this._camR); this._drawResultCanvas(); } });
        el.fitResult2.addEventListener('click', () => { if (this.gResult2) { this._fitGraph(el.canvasResult2, this.gResult2, this._camR2); this._drawGraph(el.canvasResult2, this.gResult2, this._camR2, this._result2HighlightVertices, this._result2HighlightEdges); } });

        el.dragG1.addEventListener('click', () => this._toggleDragMode('g1'));
        el.dragG2.addEventListener('click', () => this._toggleDragMode('g2'));
        el.dragResult.addEventListener('click', () => this._toggleDragMode('result'));
        el.dragResult2.addEventListener('click', () => this._toggleDragMode('result2'));

        el.expandG1.addEventListener('click', () => this._toggleMaximize('g1'));
        el.expandG2.addEventListener('click', () => this._toggleMaximize('g2'));
        el.expandResult.addEventListener('click', () => this._toggleMaximize('result'));
        el.expandResult2.addEventListener('click', () => this._toggleMaximize('result2'));

        el.stepPrev.addEventListener('click', () => this._navigateStep(-1));
        el.stepNext.addEventListener('click', () => this._navigateStep(1));
        el.distPrevG1.addEventListener('click', () => this._navigateDistStep('g1', -1));
        el.distNextG1.addEventListener('click', () => this._navigateDistStep('g1', 1));
        el.distPrevG2.addEventListener('click', () => this._navigateDistStep('g2', -1));
        el.distNextG2.addEventListener('click', () => this._navigateDistStep('g2', 1));

        this._bindCanvasPanZoom(el.canvasG1, () => this._getDistDisplayG1(), this._cam1, () => this._dragModeG1, () => this._redrawG1());
        this._bindCanvasPanZoom(el.canvasG2, () => this._getDistDisplayG2(), this._cam2, () => this._dragModeG2, () => this._redrawG2());
        this._bindCanvasPanZoom(el.canvasResult, () => this.gResult, this._camR, () => this._dragModeR, () => this._drawResultCanvas());
        this._bindCanvasPanZoom(el.canvasResult2, () => this.gResult2, this._camR2, () => this._dragModeR2, () => this._drawGraph(el.canvasResult2, this.gResult2, this._camR2, this._result2HighlightVertices, this._result2HighlightEdges));

        this._ro = new ResizeObserver(() => { this._resizeAllCanvas(); this._drawAll(); });
        [el.canvasG1, el.canvasG2, el.canvasResult, el.canvasResult2].forEach(c => this._ro.observe(c.parentElement));
    }

    _toggleDragMode(canvasKey) {
        if (canvasKey === 'g1')      { this._dragModeG1 = !this._dragModeG1; this.el.dragG1.classList.toggle('active', this._dragModeG1); }
        else if (canvasKey === 'g2') { this._dragModeG2 = !this._dragModeG2; this.el.dragG2.classList.toggle('active', this._dragModeG2); }
        else if (canvasKey === 'result')  { this._dragModeR  = !this._dragModeR;  this.el.dragResult.classList.toggle('active', this._dragModeR); }
        else if (canvasKey === 'result2') { this._dragModeR2 = !this._dragModeR2; this.el.dragResult2.classList.toggle('active', this._dragModeR2); }
    }

    _toggleMaximize(target) {
        this._maximizedCanvas = this._maximizedCanvas === target ? null : target;
        [this.el.topRow, this.el.resultRow].forEach(r => r.classList.remove('grafos-hidden-max', 'grafos-full-row'));
        [this.el.wrapG1, this.el.wrapG2, this.el.wrapResult].forEach(w => w.classList.remove('grafos-hidden-max'));
        if (this.el.wrapResult2.style.display !== 'none') this.el.wrapResult2.classList.remove('grafos-hidden-max');
        [this.el.expandG1, this.el.expandG2, this.el.expandResult, this.el.expandResult2].forEach(b => { if (b) b.classList.remove('active'); });

        if (this._maximizedCanvas === 'g1') {
            this.el.wrapG2.classList.add('grafos-hidden-max'); this.el.resultRow.classList.add('grafos-hidden-max');
            this.el.topRow.classList.add('grafos-full-row'); this.el.expandG1.classList.add('active');
        } else if (this._maximizedCanvas === 'g2') {
            this.el.wrapG1.classList.add('grafos-hidden-max'); this.el.resultRow.classList.add('grafos-hidden-max');
            this.el.topRow.classList.add('grafos-full-row'); this.el.expandG2.classList.add('active');
        } else if (this._maximizedCanvas === 'result') {
            this.el.topRow.classList.add('grafos-hidden-max'); this.el.resultRow.classList.add('grafos-full-row');
            if (this.el.wrapResult2.style.display !== 'none') this.el.wrapResult2.classList.add('grafos-hidden-max');
            this.el.expandResult.classList.add('active');
        } else if (this._maximizedCanvas === 'result2') {
            this.el.topRow.classList.add('grafos-hidden-max'); this.el.resultRow.classList.add('grafos-full-row');
            this.el.wrapResult.classList.add('grafos-hidden-max');
            if (this.el.expandResult2) this.el.expandResult2.classList.add('active');
        }

        this._resizeAllCanvas();
        const applyFit = () => {
            if (this._maximizedCanvas === 'g1')      { this._fitGraph(this.el.canvasG1, this._getDistDisplayG1(), this._cam1); }
            else if (this._maximizedCanvas === 'g2') { this._fitGraph(this.el.canvasG2, this._getDistDisplayG2(), this._cam2); }
            else if (this._maximizedCanvas === 'result' && this.gResult)   { this._fitGraph(this.el.canvasResult, this.gResult, this._camR); }
            else if (this._maximizedCanvas === 'result2' && this.gResult2) { this._fitGraph(this.el.canvasResult2, this.gResult2, this._camR2); }
            else {
                this._fitGraph(this.el.canvasG1, this._getDistDisplayG1(), this._cam1);
                this._fitGraph(this.el.canvasG2, this._getDistDisplayG2(), this._cam2);
                if (this.gResult)  this._fitGraph(this.el.canvasResult,  this.gResult,  this._camR);
                if (this.gResult2) this._fitGraph(this.el.canvasResult2, this.gResult2, this._camR2);
            }
            this._drawAll();
        };
        applyFit();
        setTimeout(applyFit, 150);
    }

    _switchTab(target) {
        this._activeGraph = target;
        this.el.tabG1.classList.toggle('active', target === 'g1');
        this.el.tabG2.classList.toggle('active', target === 'g2');
        this._syncUI();
        this._updateOpUnaryParamsUI();
    }

    _getActiveGraph()      { return this._activeGraph === 'g1' ? this.g1 : this.g2; }
    _getActiveGraphLabel() { return this._activeGraph === 'g1' ? 'G1' : 'G2'; }

    _syncUI() {
        const g = this._getActiveGraph();
        this.el.vertexList.innerHTML = '';
        g.vertices.forEach(v => {
            const chip = document.createElement('div');
            chip.className = 'grafos-vertex-chip';
            chip.innerHTML = `<span>${v}</span><button data-v="${v}">×</button>`;
            chip.querySelector('button').addEventListener('click', (e) => this._handleRemoveVertex(e.currentTarget.getAttribute('data-v')));
            this.el.vertexList.appendChild(chip);
        });
        this.el.edgeFrom.innerHTML = '<option value="">--</option>';
        this.el.edgeTo.innerHTML   = '<option value="">--</option>';
        g.vertices.forEach(v => { this.el.edgeFrom.add(new Option(v, v)); this.el.edgeTo.add(new Option(v, v)); });
        this.el.edgeList.innerHTML = '';
        g.edges.forEach(edge => {
            const row = document.createElement('div');
            row.className = 'grafos-edge-item';
            const w = (edge.weight !== null && edge.weight !== undefined) ? edge.weight : '';
            const badge = w !== '' ? `<span class="tag-edge-weight-badge">[${w}]</span>` : '';
            row.innerHTML = `<span class="grafos-edge-id">${edge.id})</span> ${edge.from} — ${edge.to} ${badge}
                             <button class="edge-remove" data-id="${edge.id}">×</button>`;
            row.querySelector('.edge-remove').addEventListener('click', (e) => this._handleRemoveEdge(e.currentTarget.getAttribute('data-id')));
            this.el.edgeList.appendChild(row);
        });
        this._updateOpUnaryParamsUI();
    }

    _updateOpUI() {
        const type = this.el.opTypeSelect.value;
        this.el.opBinaryCol.classList.toggle('hidden', type !== 'binary');
        this.el.opUnaryCol.classList.toggle('hidden', type !== 'unary');
        this.el.opTreeCol.classList.toggle('hidden', type !== 'tree');
        if (type === 'unary') this._updateOpUnaryParamsUI();
        // Update right panel title
        if (this.el.rightPanelTitle) {
            this.el.rightPanelTitle.textContent = type === 'tree'
                ? 'Descripción de los Grafos'
                : 'Operaciones de la Estructura';
        }
    }

    _updateOpUnaryParamsUI() {
        const g = this._getActiveGraph();
        const action = this.el.opUnarySelect.value;
        const container = this.el.opUnaryParams;
        container.innerHTML = '';
        if (action === 'mergeVertices') {
            const help = document.createElement('div');
            help.style.cssText = 'font-size:0.75rem;color:#555;margin-bottom:5px;';
            help.textContent = 'Seleccione V1 (al que se moverán las conexiones) y V2 (el que desaparecerá):';
            container.appendChild(help);
            const sel1 = document.createElement('select'); sel1.id = 'unary-param-v1'; sel1.className = 'unary-select-inline';
            const sel2 = document.createElement('select'); sel2.id = 'unary-param-v2'; sel2.className = 'unary-select-inline';
            sel1.innerHTML = '<option value="">V1</option>'; sel2.innerHTML = '<option value="">V2</option>';
            g.vertices.forEach(v => { sel1.add(new Option(v, v)); sel2.add(new Option(v, v)); });
            const row = document.createElement('div'); row.style.cssText = 'display:flex;gap:8px;';
            row.appendChild(sel1); row.appendChild(sel2); container.appendChild(row);
        } else if (action === 'contractEdge') {
            const sel = document.createElement('select'); sel.id = 'unary-param-edge'; sel.style.width = '100%';
            sel.innerHTML = '<option value="">Seleccione Arista (ID)</option>';
            g.edges.forEach(e => sel.add(new Option(`${e.id}) ${e.from}-${e.to}`, e.id)));
            container.appendChild(sel);
        } else if (action === 'complement') {
            const help = document.createElement('div');
            help.style.cssText = 'font-size:0.75rem;color:#555;margin-bottom:5px;';
            help.textContent = 'Se generará el complemento del grafo actual.';
            container.appendChild(help);
        }
    }

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
            this._addUpdateLog(`Se añadieron ${added} vértice(s) a ${this._getActiveGraphLabel()}.`, 'success');
            this._syncUI(); this._refreshActiveCanvas(); this._autoUpdateResult();
        }
    }

    async _handleRemoveVertex(v) {
        const g = this._getActiveGraph();
        const confirmed = await Validation.confirm(`¿Eliminar vértice ${v} y todas sus aristas en ${this._getActiveGraphLabel()}?`);
        if (!confirmed) return;
        const res = g.removeVertex(v);
        if (res.success) {
            this._addUpdateLog(`Vértice ${v} eliminado de ${this._getActiveGraphLabel()}.`, 'info');
            if (g.vertices.length === 0) g.created = false;
            this._syncUI(); this._refreshActiveCanvas(); this._autoUpdateResult();
        } else Validation.showError(res.error);
    }

    _handleAddEdge() {
        const g = this._getActiveGraph();
        const from = this.el.edgeFrom.value;
        const to   = this.el.edgeTo.value;
        if (!from || !to) { Validation.showError('Seleccione origen y destino.'); return; }
        const rawW = this.el.edgeWeight.value;
        const weight = (rawW === '' || rawW === null) ? null : parseFloat(rawW);
        if (weight !== null && isNaN(weight)) { Validation.showError('El peso debe ser un número válido.'); return; }
        const res = g.addEdge(from, to, weight);
        if (res.success) {
            this.el.edgeFrom.value = ''; this.el.edgeTo.value = ''; this.el.edgeWeight.value = '';
            const wLabel = weight !== null ? ` (peso ${weight})` : '';
            this._addUpdateLog(`Arista ${from}—${to}${wLabel} añadida a ${this._getActiveGraphLabel()}.`, 'success');
            this._syncUI(); this._refreshActiveCanvas(); this._autoUpdateResult();
        } else Validation.showError(res.error);
    }

    async _handleRemoveEdge(id) {
        const g = this._getActiveGraph();
        const confirmed = await Validation.confirm(`¿Eliminar arista ${id} de ${this._getActiveGraphLabel()}?`);
        if (!confirmed) return;
        const res = g.removeEdge(id);
        if (res.success) {
            this._addUpdateLog(`Arista eliminada de ${this._getActiveGraphLabel()}.`, 'info');
            this._syncUI(); this._refreshActiveCanvas(); this._autoUpdateResult();
        } else Validation.showError(res.error);
    }

    async _onCreate() {
        const confirmed = await Validation.confirm('Se limpiarán completamente G1, G2 y todos los resultados. ¿Continuar?');
        if (!confirmed) return;
        this.g1.reset(); this.g2.reset();
        this._invalidateResult(); this._lastBinaryOp = null;
        this._syncUI(); this._drawAll();
        this._addUpdateLog('Todos los grafos y resultados han sido limpiados.', 'info');
    }

    async _onClearGraph() {
        const g = this._getActiveGraph();
        if (g.created) {
            const confirmed = await Validation.confirm(`Se limpiará completamente ${this._getActiveGraphLabel()}. ¿Continuar?`);
            if (!confirmed) return;
        }
        g.reset(); this._invalidateResult(); this._lastBinaryOp = null;
        this._syncUI(); this._refreshActiveCanvas();
        this._addUpdateLog(`${this._getActiveGraphLabel()} limpiado.`, 'info');
    }

    async _onLoadFile() {
        const data = await new Promise((resolve) => {
            const input = document.createElement('input');
            input.type = 'file'; input.accept = '.json';
            input.onchange = (e) => {
                const file = e.target.files[0];
                if (!file) { resolve(null); return; }
                const reader = new FileReader();
                reader.onload = (ev) => { try { resolve(JSON.parse(ev.target.result)); } catch { Validation.showError('Error al leer JSON.'); resolve(null); } };
                reader.readAsText(file);
            };
            input.click();
        });

        if (!data) return;
        const validAlgos = ['grafos-operaciones', 'arboles-grafos'];
        if (!validAlgos.includes(data.algorithm)) {
            Validation.showError('El archivo no corresponde a Operaciones entre Grafos o Árboles como Grafos.');
            return;
        }

        const s = data.structure;
        if (s.g1) this.g1.fromJSON(s.g1); else this.g1.reset();
        if (s.g2) this.g2.fromJSON(s.g2); else this.g2.reset();

        if (s.result && data.algorithm === 'grafos-operaciones') {
            this.gResult = new GraphModel();
            this.gResult.fromJSON(s.result);
        } else { this.gResult = null; }

        if (s.opLogMessages) { this.opLogMessages = s.opLogMessages; this._renderOpLogs(); }
        else { this.el.opContent.innerHTML = '<div class="huffman-empty-msg">Ejecute una operación para ver los resultados aquí.</div>'; }

        this._syncUI();
        this._addUpdateLog('Datos cargados correctamente.', 'success');
        this._fitGraph(this.el.canvasG1, this.g1, this._cam1);
        this._fitGraph(this.el.canvasG2, this.g2, this._cam2);
        if (this.gResult) this._fitGraph(this.el.canvasResult, this.gResult, this._camR);
        this._drawAll();
    }

    _onExecute(isAuto = false) {
        const type = this.el.opTypeSelect.value;
        if (type === 'tree') { if (!isAuto) this._onExecuteTree(); return; }

        if (type === 'binary') {
            if (!this.g1.created || this.g1.vertices.length === 0) { if (!isAuto) Validation.showError('G1 no está definido o está vacío.'); return; }
            if (!this.g2.created || this.g2.vertices.length === 0) { if (!isAuto) Validation.showError('G2 no está definido o está vacío.'); return; }
            const op = this.el.opSelect.value;
            if (!GraphModel[op]) { if (!isAuto) Validation.showError('Operación desconocida.'); return; }
            try {
                this.el.opContent.innerHTML = ''; this.opLogMessages = []; this._lastBinaryOp = op;
                const res = GraphModel[op](this.g1, this.g2);
                this.gResult = res.graph;
                this.el.resultLabel.textContent = this.gResult.name || 'Resultado';
                this._renderStyledOpLogs(res.log);
                if (!isAuto) this._addUpdateLog(`Operación ${this.gResult.name || ''} ejecutada con éxito.`, 'success');
                this._fitGraph(this.el.canvasResult, this.gResult, this._camR);
                this._drawGraph(this.el.canvasResult, this.gResult, this._camR);
            } catch (e) { if (!isAuto) Validation.showError('Error en operación binaria: ' + e.message); }
        } else {
            if (isAuto) return;
            const action = this.el.opUnarySelect.value;
            const g = this._getActiveGraph();
            let res;
            try {
                if (action === 'mergeVertices') {
                    const v1 = document.getElementById('unary-param-v1').value;
                    const v2 = document.getElementById('unary-param-v2').value;
                    if (!v1 || !v2) { Validation.showError('Debe seleccionar V1 y V2.'); return; }
                    res = g.mergeVerticesOp(v1, v2);
                } else if (action === 'contractEdge') {
                    const edgeId = document.getElementById('unary-param-edge').value;
                    if (!edgeId) { Validation.showError('Debe seleccionar una arista.'); return; }
                    res = g.contractEdgeOp(edgeId);
                } else if (action === 'complement') {
                    res = g.complementOp();
                }
                if (res && res.success) {
                    this.el.opContent.innerHTML = ''; this.opLogMessages = [];
                    this.gResult = res.graph;
                    this.el.resultLabel.textContent = this.gResult.name || 'Resultado';
                    this._renderStyledOpLogs(res.log);
                    this._addUpdateLog('Operación unaria completada con éxito.', 'success');
                    this._fitGraph(this.el.canvasResult, this.gResult, this._camR);
                    this._drawGraph(this.el.canvasResult, this.gResult, this._camR);
                } else if (res) Validation.showError(res.error);
            } catch (e) { Validation.showError('Error en operación unaria: ' + e.message); }
        }
    }

    _onExecuteTree() {
        const func   = this.el.opTreeSelect.value;
        const gActive = this._getActiveGraph();
        const gLabel  = this._getActiveGraphLabel();
        const g2Ready = this.g2.created && this.g2.vertices.length > 0;

        if (func === 'center') {
            if (!gActive.created || gActive.vertices.length === 0) {
                Validation.showError(`Centro/Bicentro requiere un árbol en ${gLabel}. Ingrese los vértices y aristas.`); return;
            }
            const check = TreeGraphModel.isTree(gActive);
            if (!check.isTree) { Validation.showError(`${gLabel} no es un árbol: ${check.reason}`); return; }
        } else if (func === 'mst' || func === 'maxst') {
            if (!gActive.created || gActive.vertices.length === 0) { Validation.showError(`MST/MaxST requiere un grafo conexo en ${gLabel}.`); return; }
            if (!TreeGraphModel.isConnected(gActive)) { Validation.showError(`${gLabel} no es conexo. Todos los vértices deben estar conectados.`); return; }
        } else if (func === 'distance') {
            if (!this.g1.created || this.g1.vertices.length === 0 || !g2Ready) { Validation.showError('Distancia requiere grafos en G1 y G2 (conexos o árboles).'); return; }
            if (!TreeGraphModel.isConnected(this.g1)) { Validation.showError('G1 no es conexo.'); return; }
            if (!TreeGraphModel.isConnected(this.g2)) { Validation.showError('G2 no es conexo.'); return; }
        } else if (func === 'rank') {
            if (!gActive.created || gActive.vertices.length === 0) { Validation.showError(`Rango y Nulidad requiere un grafo ponderado en ${gLabel}.`); return; }
            if (!TreeGraphModel.isConnected(gActive)) { Validation.showError(`${gLabel} no es conexo. Todos los vértices deben estar conectados.`); return; }
        }

        this._invalidateResult();

        try {
            if (func === 'center')        this._executeCenterBicenter();
            else if (func === 'mst')      this._executeMST(false);
            else if (func === 'maxst')    this._executeMST(true);
            else if (func === 'distance') this._executeDistance();
            else if (func === 'rank')     this._executeRankNullity();
        } catch (err) {
            Validation.showError('Error al calcular: ' + err.message);
            console.error(err);
        }
    }

    _invalidateResult() {
        this.gResult  = null;
        this.gResult2 = null;
        this._centerSteps = []; this._centerStepIdx = 0;
        this._resultHighlightVertices  = {}; this._resultHighlightEdges  = {};
        this._result2HighlightVertices = {}; this._result2HighlightEdges = {};
        this._distModeActive = false;
        this._distStepsG1 = []; this._distStepIdxG1 = 0;
        this._distStepsG2 = []; this._distStepIdxG2 = 0;
        if (this.el.distNavG1) this.el.distNavG1.classList.add('hidden');
        if (this.el.distNavG2) this.el.distNavG2.classList.add('hidden');
        if (this.el.canvasLabelG1) this.el.canvasLabelG1.textContent = 'Grafo 1 (G1)';
        if (this.el.canvasLabelG2) this.el.canvasLabelG2.textContent = 'Grafo 2 (G2)';
        if (this.el.resultLabel)  this.el.resultLabel.textContent  = 'Resultado';
        if (this.el.result2Label) this.el.result2Label.textContent = 'Intersección';
        if (this.el.stepNav) this.el.stepNav.classList.add('hidden');
        if (this.el.wrapResult2) this.el.wrapResult2.style.display = 'none';
        if (this.el.opContent) {
            this.el.opContent.innerHTML = '<div class="huffman-empty-msg">Ejecute una operación para ver los resultados aquí.</div>';
        }
        this.opLogMessages = [];
        if (this.el.canvasResult) {
            const ctxR = this.el.canvasResult.getContext('2d');
            ctxR.clearRect(0, 0, this.el.canvasResult.width, this.el.canvasResult.height);
        }
    }

    _autoUpdateResult() {
        if (this._lastBinaryOp && this.g1.created && this.g2.created && this.el.opTypeSelect.value === 'binary') {
            this.el.opSelect.value = this._lastBinaryOp;
            this._onExecute(true);
        } else { this._invalidateResult(); }
    }

    _refreshActiveCanvas() {
        const canvas = this._activeGraph === 'g1' ? this.el.canvasG1 : this.el.canvasG2;
        const cam    = this._activeGraph === 'g1' ? this._cam1 : this._cam2;
        const g      = this._getActiveGraph();
        this._fitGraph(canvas, g, cam);
        this._drawGraph(canvas, g, cam);
    }

    // ─── Tree Algorithms ─────────────────────────────────────────────────────

    _executeCenterBicenter() {
        const gSrc   = this._getActiveGraph();
        const gLabel = this._getActiveGraphLabel();
        this._centerSourceGraph = gSrc;
        const result = TreeGraphModel.findCenterBicenter(gSrc);
        this._centerSteps   = result.steps;
        this._centerStepIdx = 0;
        this.el.stepNav.classList.remove('hidden');
        this._updateStepNav();
        this._renderCenterStep(0);
        result.log.forEach(msg => this._addUpdateLog(msg, 'info'));
        const centerLabel = result.isBicenter ? `Bicentro: {${result.center.join(', ')}}` : `Centro: {${result.center[0]}}`;
        this._addUpdateLog(`✔ ${centerLabel}`, 'success');
        this.el.resultLabel.textContent = result.isBicenter ? 'Bicentro' : 'Centro';
        this._renderDescription([
            { title: `Árbol Original (${gLabel})`, items: [{ graph: gSrc, label: 'T', isTree: true }] },
            { title: centerLabel, html: this._buildCenterDescHTML(result) }
        ]);
    }

    _buildCenterDescHTML(result) {
        const { center, isBicenter, steps } = result;
        let html = `<div style="font-family:Consolas,monospace;font-size:0.83rem;line-height:1.9;padding:8px;background:rgba(43,87,154,0.04);border-radius:4px;border-left:3px solid #28a745;">`;
        html += `<strong>${isBicenter ? 'Bicentro' : 'Centro'} = {${center.join(', ')}}</strong><br>`;
        html += `<div style="font-size:0.78rem;color:var(--text-secondary);margin-top:4px;">`;
        html += `Total de iteraciones: ${steps.filter(s => s.removed && s.removed.length > 0).length}<br>`;
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
        if (this._maximizedCanvas === 'result' && this.gResult) {
            this._fitGraph(this.el.canvasResult, this.gResult, this._camR);
            this._drawResultCanvas();
        }
    }

    _updateStepNav() {
        const total = this._centerSteps.length;
        const idx   = this._centerStepIdx;
        this.el.stepLabel.textContent    = `Paso ${idx + 1} de ${total}`;
        this.el.stepPrev.disabled        = idx === 0;
        this.el.stepNext.disabled        = idx === total - 1;
        const step = this._centerSteps[idx];
        if (step) this.el.resultLabel.textContent = step.label || 'Resultado';
    }

    _renderCenterStep(idx) {
        const step = this._centerSteps[idx];
        if (!step) return;
        const snapGraph = new GraphModel();
        snapGraph._build_internal(step.vertices, step.edges, false, step.label || 'Paso');
        const srcGraph = this._centerSourceGraph || this.g1;
        this._inheritPositions(srcGraph, snapGraph);
        this.gResult = snapGraph;
        this._resultHighlightVertices = {};
        this._resultHighlightEdges    = {};
        if (step.leaves)  step.leaves.forEach(v  => { this._resultHighlightVertices[v] = '#FF7043'; });
        if (step.center)  step.center.forEach(v  => { this._resultHighlightVertices[v] = '#26A65B'; });
        this._fitGraph(this.el.canvasResult, this.gResult, this._camR);
        this._drawResultCanvas();
    }

    _executeMST(maximize) {
        const gSrc   = this._getActiveGraph();
        const gLabel = this._getActiveGraphLabel();
        this._mstMaximize = maximize;
        const result    = TreeGraphModel.kruskal(gSrc, maximize);
        const treeGraph = new GraphModel();
        treeGraph._build_internal(gSrc.vertices, result.treeEdges, false, maximize ? 'MaxST' : 'MST');
        this._inheritPositions(gSrc, treeGraph);
        this.gResult = treeGraph;
        this._resultHighlightVertices = {};
        this._resultHighlightEdges    = {};
        result.treeEdges.forEach(e => { this._resultHighlightEdges[[e.from, e.to].sort().join('-')] = '#26A65B'; });
        this.el.resultLabel.textContent = maximize ? 'Árbol de Expansión Máximo' : 'Árbol de Expansión Mínimo';
        this._fitGraph(this.el.canvasResult, this.gResult, this._camR);
        this._drawResultCanvas();
        result.log.forEach(msg => this._addUpdateLog(msg, 'info'));
        this._addUpdateLog(`✔ Peso total del árbol: ${result.totalWeight}`, 'success');
        let extraHTML = '';
        if (result.hasMultipleSolutions) {
            extraHTML = `<div style="background:#FFF3CD;border:1px solid #FFECB5;border-radius:4px;padding:8px;margin-top:8px;font-size:0.8rem;">
                ⚠ <strong>Nota:</strong> Existe más de un ${maximize ? 'árbol de expansión máximo' : 'árbol de expansión mínimo'} posible.
            </div>`;
        }
        this._renderDescription([
            { title: `Grafo de Entrada (${gLabel}) y Resultado`, items: [{ graph: gSrc, label: gLabel, isTree: false }, { graph: treeGraph, label: 'T', isTree: true }] },
            { title: 'Resultado Adicional', html: `<div style="padding:8px;font-family:Consolas,monospace;font-size:0.83rem;">Peso total (T): <strong>${result.totalWeight}</strong><br>Longitud: <strong>${result.treeEdges.length}</strong></div>${extraHTML}` }
        ]);
    }

    _executeDistance() {
        const check1 = TreeGraphModel.isTree(this.g1);
        const check2 = TreeGraphModel.isTree(this.g2);
        let t1, mst1Log = [], t1IsNew = false;
        if (check1.isTree) { t1 = this.g1; }
        else {
            const r1 = TreeGraphModel.kruskal(this.g1, false);
            t1 = new GraphModel(); t1._build_internal(this.g1.vertices, r1.treeEdges, false, 'T₁ (MST de G1)');
            this._inheritPositions(this.g1, t1); mst1Log = r1.log; t1IsNew = true;
        }
        let t2, mst2Log = [], t2IsNew = false;
        if (check2.isTree) { t2 = this.g2; }
        else {
            const r2 = TreeGraphModel.kruskal(this.g2, false);
            t2 = new GraphModel(); t2._build_internal(this.g2.vertices, r2.treeEdges, false, 'T₂ (MST de G2)');
            this._inheritPositions(this.g2, t2); mst2Log = r2.log; t2IsNew = true;
        }
        this._distModeActive = true;
        this._distStepsG1 = t1IsNew
            ? [{ graph: this.g1, label: 'Grafo 1 (G1) — Original', hlEdges: {}, hlVertices: {} }, { graph: t1, label: 'T₁ — Árbol de Expansión Mínimo', hlEdges: this._buildMSTHighlights(t1), hlVertices: {} }]
            : [{ graph: this.g1, label: 'G1 — Árbol de Entrada (T₁)', hlEdges: {}, hlVertices: {} }];
        this._distStepIdxG1 = t1IsNew ? 1 : 0;
        this._distStepsG2 = t2IsNew
            ? [{ graph: this.g2, label: 'Grafo 2 (G2) — Original', hlEdges: {}, hlVertices: {} }, { graph: t2, label: 'T₂ — Árbol de Expansión Mínimo', hlEdges: this._buildMSTHighlights(t2), hlVertices: {} }]
            : [{ graph: this.g2, label: 'G2 — Árbol de Entrada (T₂)', hlEdges: {}, hlVertices: {} }];
        this._distStepIdxG2 = t2IsNew ? 1 : 0;
        this._updateDistNav('g1'); this._updateDistNav('g2');
        this._redrawG1(); this._redrawG2();

        const result = TreeGraphModel.spanningTreeDistance(t1, t2);
        this._inheritPositions(t1, result.unionGraph);
        this._inheritPositions(t2, result.unionGraph);
        this._inheritPositions(t1, result.intersectionGraph);
        this.gResult = result.unionGraph;
        this.el.resultLabel.textContent = 'T₁∪T₂ (Unión)';
        this._resultHighlightVertices = {};
        this._resultHighlightEdges    = {};
        const edgeMapT1 = new Set(t1.edges.map(e => [e.from, e.to].sort().join('-')));
        const edgeMapT2 = new Set(t2.edges.map(e => [e.from, e.to].sort().join('-')));
        result.unionEdges.forEach(e => {
            const key = [e.from, e.to].sort().join('-');
            const inT1 = edgeMapT1.has(key), inT2 = edgeMapT2.has(key);
            this._resultHighlightEdges[key] = (inT1 && inT2) ? '#26A65B' : inT1 ? '#2B7BE0' : '#FF7043';
        });
        this.gResult2 = result.intersectionGraph;
        this.el.result2Label.textContent = 'T₁∩T₂ (Intersección)';
        this._result2HighlightVertices = {};
        this._result2HighlightEdges    = {};
        result.intersectionEdges.forEach(e => { this._result2HighlightEdges[[e.from, e.to].sort().join('-')] = '#26A65B'; });
        this.el.wrapResult2.style.display = 'flex';
        this._resizeAllCanvas();
        this._fitGraph(this.el.canvasResult,  this.gResult,  this._camR);
        this._fitGraph(this.el.canvasResult2, this.gResult2, this._camR2);
        this._drawResultCanvas();
        this._drawGraph(this.el.canvasResult2, this.gResult2, this._camR2, this._result2HighlightVertices, this._result2HighlightEdges);

        if (t1IsNew) { this._addUpdateLog('— MST de G1 —', 'info'); mst1Log.forEach(m => this._addUpdateLog(m, 'info')); }
        if (t2IsNew) { this._addUpdateLog('— MST de G2 —', 'info'); mst2Log.forEach(m => this._addUpdateLog(m, 'info')); }
        result.log.forEach(msg => this._addUpdateLog(msg, 'info'));
        this._addUpdateLog(`✔ Distancia: D = ${result.distance}`, 'success');

        const sumT1 = t1.edges.reduce((s, e) => s + (e.weight ?? 1), 0);
        const sumT2 = t2.edges.reduce((s, e) => s + (e.weight ?? 1), 0);
        const distHTML = `<div style="font-family:Consolas,monospace;font-size:0.83rem;line-height:1.9;padding:8px;background:rgba(43,87,154,0.04);border-radius:4px;border-left:3px solid var(--accent-primary);">
            D(T₁) = {${t1.edges.map(e => `${[e.from,e.to].sort().join('-')}:${e.weight??1}`).join(', ')}} = ${sumT1}<br>
            D(T₂) = {${t2.edges.map(e => `${[e.from,e.to].sort().join('-')}:${e.weight??1}`).join(', ')}} = ${sumT2}<br><br>
            A₁∪A₂ = (${sumT1} + ${sumT2}) − ${result.sumIntersection} = <strong>${result.sumUnion}</strong><br>
            A₁∩A₂ = <strong>${result.sumIntersection}</strong><br><br>
            D = (${result.sumUnion} − ${result.sumIntersection}) / 2<br>
            <strong style="font-size:1rem;color:var(--accent-primary);">D = ${result.distance}</strong>
        </div>`;
        const descSections = [];
        if (t1IsNew) { descSections.push({ title: 'Grafo G1 (Entrada)', items: [{ graph: this.g1, label: 'G1', isTree: false }] }); descSections.push({ title: 'T₁ — MST de G1', items: [{ graph: t1, label: 'T₁', isTree: true }] }); }
        else { descSections.push({ title: 'T₁ — Árbol G1 (Entrada)', items: [{ graph: t1, label: 'T₁', isTree: true }] }); }
        if (t2IsNew) { descSections.push({ title: 'Grafo G2 (Entrada)', items: [{ graph: this.g2, label: 'G2', isTree: false }] }); descSections.push({ title: 'T₂ — MST de G2', items: [{ graph: t2, label: 'T₂', isTree: true }] }); }
        else { descSections.push({ title: 'T₂ — Árbol G2 (Entrada)', items: [{ graph: t2, label: 'T₂', isTree: true }] }); }
        descSections.push({ title: 'Cálculo de la Distancia', html: distHTML });
        descSections.push({ title: 'Unión e Intersección', items: [{ graph: result.unionGraph, label: 'T₁∪T₂', isTree: false }, { graph: result.intersectionGraph, label: 'T₁∩T₂', isTree: false }] });
        this._renderDescription(descSections);
    }

    _buildMSTHighlights(treeGraph) {
        const hlEdges = {};
        treeGraph.edges.forEach(e => { hlEdges[[e.from, e.to].sort().join('-')] = '#26A65B'; });
        return hlEdges;
    }

    _updateDistNav(which) {
        const steps   = which === 'g1' ? this._distStepsG1    : this._distStepsG2;
        const idx     = which === 'g1' ? this._distStepIdxG1  : this._distStepIdxG2;
        const navEl   = which === 'g1' ? this.el.distNavG1    : this.el.distNavG2;
        const prevEl  = which === 'g1' ? this.el.distPrevG1   : this.el.distPrevG2;
        const nextEl  = which === 'g1' ? this.el.distNextG1   : this.el.distNextG2;
        const labelEl = which === 'g1' ? this.el.distLabelG1  : this.el.distLabelG2;
        const titleEl = which === 'g1' ? this.el.canvasLabelG1 : this.el.canvasLabelG2;
        if (!navEl) return;
        if (steps.length <= 1) { navEl.classList.add('hidden'); }
        else {
            navEl.classList.remove('hidden');
            labelEl.textContent = `Paso ${idx + 1} de ${steps.length}`;
            prevEl.disabled = idx === 0; nextEl.disabled = idx === steps.length - 1;
        }
        if (titleEl && steps[idx]) titleEl.textContent = steps[idx].label;
    }

    _navigateDistStep(which, dir) {
        if (which === 'g1') {
            const newIdx = this._distStepIdxG1 + dir;
            if (newIdx < 0 || newIdx >= this._distStepsG1.length) return;
            this._distStepIdxG1 = newIdx; this._updateDistNav('g1');
            if (this._maximizedCanvas === 'g1') this._fitGraph(this.el.canvasG1, this._getDistDisplayG1(), this._cam1);
            this._redrawG1();
        } else {
            const newIdx = this._distStepIdxG2 + dir;
            if (newIdx < 0 || newIdx >= this._distStepsG2.length) return;
            this._distStepIdxG2 = newIdx; this._updateDistNav('g2');
            if (this._maximizedCanvas === 'g2') this._fitGraph(this.el.canvasG2, this._getDistDisplayG2(), this._cam2);
            this._redrawG2();
        }
    }

    _executeRankNullity() {
        const gSrc   = this._getActiveGraph();
        const gLabel = this._getActiveGraphLabel();
        const result = TreeGraphModel.rankAndNullity(gSrc);
        this._inheritPositions(gSrc, result.mstGraph);
        this._inheritPositions(gSrc, result.complementGraph);
        this.gResult = result.mstGraph;
        this.el.resultLabel.textContent = 'T — Árbol de Expansión (Ramas)';
        this._resultHighlightVertices = {};
        this._resultHighlightEdges    = {};
        result.mstEdges.forEach(e => { this._resultHighlightEdges[[e.from, e.to].sort().join('-')] = '#26A65B'; });
        this.gResult2 = result.complementGraph;
        this.el.result2Label.textContent = "T' — Complemento (Cuerdas)";
        this._result2HighlightVertices = {};
        this._result2HighlightEdges    = {};
        result.complementEdges.forEach(e => { this._result2HighlightEdges[[e.from, e.to].sort().join('-')] = '#E53935'; });
        this.el.wrapResult2.style.display = 'flex';
        this._resizeAllCanvas();
        this._fitGraph(this.el.canvasResult,  this.gResult,  this._camR);
        this._fitGraph(this.el.canvasResult2, this.gResult2, this._camR2);
        this._drawResultCanvas();
        this._drawGraph(this.el.canvasResult2, this.gResult2, this._camR2, this._result2HighlightVertices, this._result2HighlightEdges);
        result.log.forEach(msg => this._addUpdateLog(msg, 'info'));
        this._addUpdateLog(`✔ Rango = ${result.rank} | Nulidad = ${result.nullity}`, 'success');
        const rnHTML = `<div style="font-family:Consolas,monospace;font-size:0.83rem;line-height:1.9;padding:8px;background:rgba(43,87,154,0.04);border-radius:4px;border-left:3px solid var(--accent-primary);">
            <strong>Rango (Ramas)</strong> = |V| - 1 = ${gSrc.vertices.length} - 1 = <strong style="color:#26A65B;">${result.rank}</strong><br>
            <strong>Nulidad (Cuerdas)</strong> = |A| - |V| + 1 = ${gSrc.edges.length} - ${gSrc.vertices.length} + 1 = <strong style="color:#E53935;">${result.nullity}</strong>
        </div>`;
        this._renderDescription([
            { title: `Grafo Original (${gLabel})`, items: [{ graph: gSrc, label: gLabel, isTree: false }] },
            { title: 'Árbol de Expansión Mínimo T (Ramas)', items: [{ graph: result.mstGraph, label: 'T', isTree: true }] },
            { title: "Complemento T' (Cuerdas)", items: [{ graph: result.complementGraph, label: "T'", isTree: false }] },
            { title: 'Rango y Nulidad', html: rnHTML }
        ]);
    }

    _renderDescription(sections) {
        this.el.opContent.innerHTML = '';
        for (const section of sections) {
            let html = `<div class="huffman-step-table" style="margin-bottom:12px;">`;
            if (section.title) html += `<div class="section-title" style="font-size:0.8rem;background:var(--bg-main);border-bottom:1px solid var(--border-light);border-top-left-radius:4px;border-top-right-radius:4px;padding:6px 10px;">${section.title}</div>`;
            html += `<div style="padding:8px;">`;
            if (section.html) {
                html += section.html;
            } else if (section.items) {
                for (const item of section.items) {
                    const g = item.graph; const lbl = item.label || 'G'; const isTree = item.isTree || false;
                    const vStr = g.vertices.join(', ');
                    const edgeStrs = g.edges.map(e => { const w = (e.weight !== null && e.weight !== undefined) ? e.weight : 1; return `${e.from}${e.to}:${w}`; });
                    const aStr = edgeStrs.join(', ');
                    const totalW = g.edges.reduce((s, e) => s + ((e.weight !== null && e.weight !== undefined) ? e.weight : 1), 0);
                    const dL = isTree ? `δ<sub>${lbl}</sub>` : 'δ';
                    const aL = isTree ? `A<sub>${lbl}</sub>` : 'A';
                    const gDef = isTree ? `T<sub>${lbl}</sub>` : lbl;
                    html += `<div style="margin-bottom:10px;padding:8px;background:rgba(43,87,154,0.04);border-radius:4px;border-left:3px solid var(--accent-primary);">`;
                    html += `<div style="font-family:Consolas,monospace;font-size:0.83rem;line-height:1.9;">`;
                    html += `<strong>${g.name || gDef} = (${dL}, ${aL})</strong><br>`;
                    html += `${dL} = {${vStr || '∅'}}<br>${aL} = {${aStr || '∅'}}`;
                    if (g.edges.length > 0) html += `<br><span style="color:var(--accent-primary);font-weight:600;">Peso: ${totalW} &nbsp;|&nbsp; Long: ${g.edges.length}</span>`;
                    html += `</div></div>`;
                }
            }
            html += `</div></div>`;
            this.el.opContent.innerHTML += html;
        }
        this.el.opContent.scrollTop = 0;
    }

    _inheritPositions(sourceGraph, targetGraph) {
        if (!sourceGraph || !targetGraph) return;
        const canvas = this.el.canvasG1;
        const cx = canvas ? canvas.width / 2 : 300;
        const cy = canvas ? canvas.height / 2 : 200;
        const srcPositions = sourceGraph.getVertexPositions(cx, cy);
        for (const v of targetGraph.vertices) {
            if (srcPositions[v]) targetGraph.manualPositions[v] = { x: srcPositions[v].x, y: srcPositions[v].y };
        }
    }

    _getDistDisplayG1() {
        if (this._distModeActive && this._distStepsG1.length > 0) return this._distStepsG1[this._distStepIdxG1].graph;
        return this.g1;
    }
    _getDistDisplayG2() {
        if (this._distModeActive && this._distStepsG2.length > 0) return this._distStepsG2[this._distStepIdxG2].graph;
        return this.g2;
    }
    _redrawG1() {
        if (this._distModeActive && this._distStepsG1.length > 0) {
            const s = this._distStepsG1[this._distStepIdxG1];
            this._drawGraph(this.el.canvasG1, s.graph, this._cam1, s.hlVertices || {}, s.hlEdges || {});
        } else this._drawGraph(this.el.canvasG1, this.g1, this._cam1);
    }
    _redrawG2() {
        if (this._distModeActive && this._distStepsG2.length > 0) {
            const s = this._distStepsG2[this._distStepIdxG2];
            this._drawGraph(this.el.canvasG2, s.graph, this._cam2, s.hlVertices || {}, s.hlEdges || {});
        } else this._drawGraph(this.el.canvasG2, this.g2, this._cam2);
    }
    _drawResultCanvas() {
        this._drawGraph(this.el.canvasResult, this.gResult, this._camR, this._resultHighlightVertices, this._resultHighlightEdges);
    }

    // ─── Logs ─────────────────────────────────────────────────────────────────

    _addUpdateLog(msg, type = 'info') {
        const entry = document.createElement('div');
        entry.classList.add('log-entry', `log-${type}`);
        entry.textContent = msg;
        this.el.logContent.appendChild(entry);
        this.el.logContent.scrollTop = this.el.logContent.scrollHeight;
    }

    _addOpLog(message) {
        const isSeparator = message.startsWith('---');
        if (isSeparator) this.opLogMessages.push({ type: 'header', text: message.replace(/---/g, '').trim() });
        else this.opLogMessages.push({ type: 'body', text: message });
        this._renderOpLogs();
    }

    _renderStyledOpLogs(logsArray) {
        this.opLogMessages = [];
        logsArray.forEach(msg => {
            if (msg.startsWith('---')) this.opLogMessages.push({ type: 'header', text: msg.replace(/---/g, '').trim() });
            else this.opLogMessages.push({ type: 'body', text: msg });
        });
        this._renderOpLogs();
    }

    _renderOpLogs() {
        if (!this.el.opContent) return;
        this.el.opContent.innerHTML = '';
        let html = '';
        this.opLogMessages.forEach((m, idx) => {
            if (m.type === 'header') {
                if (idx > 0) html += `</div></div>`;
                html += `<div class="huffman-step-table" style="margin-bottom:12px;">`;
                html += `<div class="section-title" style="font-size:0.8rem;background:var(--bg-main);border-bottom:1px solid var(--border-light);border-top-left-radius:4px;border-top-right-radius:4px;white-space:pre-wrap;line-height:1.4;">${m.text}</div>`;
                html += `<div style="padding:10px;font-family:Consolas,monospace;font-size:0.82rem;white-space:pre-wrap;color:var(--text-primary);line-height:1.5;">`;
            } else {
                if (idx === 0) { html += `<div class="huffman-step-table" style="margin-bottom:12px;">`; html += `<div style="padding:10px;font-family:Consolas,monospace;font-size:0.82rem;white-space:pre-wrap;color:var(--text-primary);line-height:1.5;">`; }
                html += m.text + '\n';
            }
        });
        if (this.opLogMessages.length > 0) html += `</div></div>`;
        else html = '<div class="huffman-empty-msg">Ejecute una operación para ver los resultados aquí.</div>';
        this.el.opContent.innerHTML = html;
        this.el.opContent.scrollTop = this.el.opContent.scrollHeight;
    }

    // ─── Save ─────────────────────────────────────────────────────────────────

    async _onSave() {
        if (!this.g1.created && !this.g2.created) { Validation.showError('No hay grafos para guardar.'); return; }
        const data = {
            algorithm: 'grafos-operaciones',
            timestamp: new Date().toISOString(),
            structure: {
                g1: this.g1.created ? this.g1.toJSON() : null,
                g2: this.g2.created ? this.g2.toJSON() : null,
                result: this.gResult ? this.gResult.toJSON() : null,
                opLogMessages: this.opLogMessages
            }
        };
        await FileManager.saveJSON(JSON.stringify(data, null, 2), `grafos_${Date.now()}.json`);
        this._addUpdateLog('Datos guardados exitosamente.', 'success');
    }

    // ─── Canvas Pan/Zoom/Drag ─────────────────────────────────────────────────

    _bindCanvasPanZoom(canvas, getGraph, cam, isDragActive, redraw) {
        canvas.addEventListener('mousedown', e => {
            const rect = canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left, mouseY = e.clientY - rect.top;
            const graph = getGraph();
            if (isDragActive() && graph && graph.vertices.length > 0) {
                const worldX = (mouseX - cam.offsetX) / cam.scale, worldY = (mouseY - cam.offsetY) / cam.scale;
                const cx = canvas.width / 2, cy = canvas.height / 2;
                const positions = graph.getVertexPositions(cx, cy);
                const r = this._nodeRadiusFor(graph);
                for (const v of graph.vertices) {
                    const pos = positions[v];
                    if (!pos) continue;
                    if (Math.hypot(worldX - pos.x, worldY - pos.y) < r) {
                        this._draggingNode = { graph, vertex: v }; canvas.style.cursor = 'grabbing'; return;
                    }
                }
            }
            cam.isPanning = true; cam.startX = e.clientX - cam.offsetX; cam.startY = e.clientY - cam.offsetY;
            canvas.style.cursor = 'grabbing';
        });
        canvas.addEventListener('mousemove', e => {
            const graph = getGraph();
            if (this._draggingNode && this._draggingNode.graph === graph) {
                const rect = canvas.getBoundingClientRect();
                const worldX = (e.clientX - rect.left - cam.offsetX) / cam.scale;
                const worldY = (e.clientY - rect.top  - cam.offsetY) / cam.scale;
                graph.setVertexPosition(this._draggingNode.vertex, worldX, worldY); redraw(); return;
            }
            if (!cam.isPanning) return;
            cam.offsetX = e.clientX - cam.startX; cam.offsetY = e.clientY - cam.startY; redraw();
        });
        const stop = () => { cam.isPanning = false; this._draggingNode = null; canvas.style.cursor = 'grab'; };
        canvas.addEventListener('mouseup', stop); canvas.addEventListener('mouseleave', stop);
        canvas.addEventListener('wheel', e => {
            e.preventDefault();
            const rect = canvas.getBoundingClientRect();
            const mx = e.clientX - rect.left, my = e.clientY - rect.top;
            const factor = e.deltaY < 0 ? 1.1 : 0.9;
            const ns = Math.max(0.1, Math.min(5, cam.scale * factor));
            cam.offsetX = mx - (mx - cam.offsetX) * (ns / cam.scale);
            cam.offsetY = my - (my - cam.offsetY) * (ns / cam.scale);
            cam.scale = ns; redraw();
        }, { passive: false });
    }

    _fitGraph(canvas, graph, cam) {
        if (!graph || graph.vertices.length === 0) { cam.offsetX = 0; cam.offsetY = 0; cam.scale = 1; return; }
        const cx = canvas.width / 2, cy = canvas.height / 2;
        const positions = graph.getVertexPositions(cx, cy);
        const posArr = Object.values(positions);
        const r = this._nodeRadiusFor(graph);
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        for (const p of posArr) { minX = Math.min(minX, p.x - r); maxX = Math.max(maxX, p.x + r); minY = Math.min(minY, p.y - r); maxY = Math.max(maxY, p.y + r); }
        const pad = 40;
        const sx = canvas.width  / (maxX - minX + pad * 2);
        const sy = canvas.height / (maxY - minY + pad * 2);
        cam.scale = Math.min(sx, sy, 2);
        cam.offsetX = canvas.width  / 2 - ((minX + maxX) / 2) * cam.scale;
        cam.offsetY = canvas.height / 2 - ((minY + maxY) / 2) * cam.scale;
    }

    _resizeAllCanvas() {
        [
            [this.el.canvasG1,      this.el.wrapG1],
            [this.el.canvasG2,      this.el.wrapG2],
            [this.el.canvasResult,  this.el.wrapResult],
            [this.el.canvasResult2, this.el.wrapResult2]
        ].forEach(([canvas, wrap]) => {
            if (wrap && wrap.clientWidth > 0) { canvas.width = wrap.clientWidth; canvas.height = wrap.clientHeight; }
        });
    }

    _drawAll() {
        this._redrawG1();
        this._redrawG2();
        this._drawResultCanvas();
        if (this.gResult2) this._drawGraph(this.el.canvasResult2, this.gResult2, this._camR2, this._result2HighlightVertices, this._result2HighlightEdges);
    }

    _nodeRadiusFor(graph) {
        if (!graph || graph.vertices.length === 0) return 20;
        return graph.vertices.reduce((m, v) => Math.max(m, v.length), 0) > 5 ? 28 : 20;
    }

    _drawGraph(canvas, graph, cam, hlVertices = {}, hlEdges = {}) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#FAFBFD'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#E0E4EA';
        const gridSize = 30 * cam.scale;
        if (gridSize > 8) {
            const sx2 = ((cam.offsetX % gridSize) + gridSize) % gridSize;
            const sy2 = ((cam.offsetY % gridSize) + gridSize) % gridSize;
            for (let x = sx2; x < canvas.width; x += gridSize)
                for (let y = sy2; y < canvas.height; y += gridSize) { ctx.beginPath(); ctx.arc(x, y, 1, 0, Math.PI * 2); ctx.fill(); }
        }
        if (!graph || graph.vertices.length === 0) {
            ctx.fillStyle = '#A0A8B8'; ctx.font = '14px "Segoe UI",sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(graph && graph.name ? `${graph.name} — Vacío` : 'Vacío o no definido', canvas.width / 2, canvas.height / 2);
            return;
        }
        const r = this._nodeRadiusFor(graph);
        const cx = canvas.width / 2, cy = canvas.height / 2;
        const positions = graph.getVertexPositions(cx, cy);
        ctx.save(); ctx.translate(cam.offsetX, cam.offsetY); ctx.scale(cam.scale, cam.scale);
        const edgeCounts = {}, edgeDrawn = {};
        for (const e of graph.edges) { const key = [e.from, e.to].sort().join('-'); edgeCounts[key] = (edgeCounts[key] || 0) + 1; }
        for (const e of graph.edges) {
            const p1 = positions[e.from], p2 = positions[e.to];
            if (!p1 || !p2) continue;
            const key = [e.from, e.to].sort().join('-');
            edgeDrawn[key] = (edgeDrawn[key] || 0) + 1;
            let curvature = 0;
            const total = edgeCounts[key];
            if (total > 1) {
                const idx = edgeDrawn[key] - 1;
                if (total % 2 === 1) { if (idx !== 0) { const mag = Math.floor((idx + 1) / 2); curvature = idx % 2 === 1 ? mag : -mag; } }
                else { const mag = Math.floor(idx / 2) + 0.5; curvature = idx % 2 === 0 ? mag : -mag; }
                if (e.from > e.to) curvature = -curvature;
            }
            this._drawEdge(ctx, e, p1, p2, false, r, e.from === e.to, curvature, hlEdges[key] || null);
        }
        for (const v of graph.vertices) {
            const p = positions[v]; if (!p) continue;
            this._drawVertex(ctx, v, p.x, p.y, r, hlVertices[v] || null);
        }
        ctx.restore();
    }

    _drawEdge(ctx, edge, p1, p2, directed, r, isSelf, curvature, hlColor) {
        const color = hlColor || '#8494AB';
        ctx.strokeStyle = color; ctx.lineWidth = hlColor ? 2.5 : 1.5; ctx.setLineDash([]);
        let sx, sy, ex, ey, midX, midY, ux = 0, uy = 0;
        if (isSelf) {
            ctx.beginPath(); ctx.arc(p1.x + r, p1.y - r, r * 0.75, 0, Math.PI * 2); ctx.stroke();
            midX = p1.x + r * 1.5; midY = p1.y - r * 1.5; ux = 1; uy = -1;
        } else {
            const dx = p2.x - p1.x, dy = p2.y - p1.y, dist = Math.sqrt(dx * dx + dy * dy);
            if (dist === 0) return;
            ux = dx / dist; uy = dy / dist;
            sx = p1.x + ux * r; sy = p1.y + uy * r; ex = p2.x - ux * r; ey = p2.y - uy * r;
            ctx.beginPath();
            if (curvature !== 0) {
                midX = (sx + ex) / 2; midY = (sy + ey) / 2;
                const ca = curvature * 30, cpX = midX - uy * ca, cpY = midY + ux * ca;
                ctx.moveTo(sx, sy); ctx.quadraticCurveTo(cpX, cpY, ex, ey);
                midX = (sx + cpX + ex) / 3; midY = (sy + cpY + ey) / 3;
            } else { ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); midX = (sx + ex) / 2; midY = (sy + ey) / 2; }
            ctx.stroke();
        }
        // Draw weight label
        const w = (edge.weight !== null && edge.weight !== undefined) ? edge.weight : null;
        if (w !== null) {
            const perp = curvature !== 0 ? curvature * 12 : 10;
            const labelX = midX - uy * perp, labelY = midY + ux * perp;
            ctx.font = 'bold 10px "Segoe UI",sans-serif';
            const wStr = String(w), tw = ctx.measureText(wStr).width;
            ctx.fillStyle = 'rgba(250,251,253,0.92)';
            ctx.fillRect(labelX - tw / 2 - 3, labelY - 8, tw + 6, 16);
            ctx.fillStyle = hlColor || '#1B3A6B'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(wStr, labelX, labelY);
        }
    }

    _drawVertex(ctx, label, x, y, r, hlColor) {
        const labelLen = label.length;
        const dynR = labelLen > 5 ? r + (labelLen - 5) * 4 : r;
        ctx.beginPath(); ctx.arc(x, y, dynR, 0, Math.PI * 2);
        ctx.fillStyle = hlColor || '#D6E4F0'; ctx.fill();
        ctx.strokeStyle = hlColor ? this._darkenColor(hlColor) : '#2B579A'; ctx.lineWidth = 2; ctx.stroke();
        const isLight = hlColor ? this._isLightColor(hlColor) : true;
        const fontSize = labelLen > 6 ? 9 : labelLen > 3 ? 11 : 13;
        ctx.font = `bold ${fontSize}px "Segoe UI",sans-serif`;
        ctx.fillStyle = hlColor ? (isLight ? '#1B3465' : '#fff') : '#2B579A';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(label, x, y);
    }

    _isLightColor(hex) {
        try { const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16); return (r*0.299+g*0.587+b*0.114) > 155; }
        catch { return true; }
    }

    _darkenColor(hex) {
        try { const r = Math.max(0,parseInt(hex.slice(1,3),16)-40), g = Math.max(0,parseInt(hex.slice(3,5),16)-40), b = Math.max(0,parseInt(hex.slice(5,7),16)-40); return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`; }
        catch { return '#1B3A6B'; }
    }
}
