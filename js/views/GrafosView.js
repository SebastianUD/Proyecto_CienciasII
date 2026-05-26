class GrafosView {
    /**
     * @param {HTMLElement} containerEl - Contenedor principal.
     * @param {string} [mode='operaciones'] - Modo: 'operaciones', 'arboles', 'matrices',
     *                                         'coloreado', 'conjuntos', 'matching'.
     */
    constructor(containerEl, mode) {
        this.container = containerEl;
        this._mode = mode || 'operaciones';
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
        this._currentSetsData = {};
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

        // Map modes to display titles
        const titles = {
            'operaciones': 'Grafos — Operaciones entre Grafos',
            'arboles': 'Grafos — Árboles como Grafos',
            'matrices': 'Grafos — Cálculo de Matrices',
            'coloreado': 'Grafos — Coloreado de Grafos',
            'conjuntos': 'Grafos — Conjuntos Dominantes e Independientes',
            'matching': 'Grafos — Matching'
        };

        // Map modes to which opTypeSelect value to auto-set
        const modeToOpType = {
            'operaciones': 'binary',
            'arboles': 'tree',
            'matrices': 'matrix',
            'coloreado': 'coloring',
            'conjuntos': 'independent',
            'matching': 'matching'
        };

        const modeTitle = titles[this._mode] || 'Grafos';

        this.container.innerHTML = `
            <div class="algo-title">${modeTitle}</div>
            <div class="grafos-layout">

                <!-- Panel Izquierdo -->
                <div class="grafos-left-panel">

                    <!-- Bloque 1: Definición -->
                    <div class="section-block">
                        <div class="section-title grafos-section-title-row">
                            <span>Definición de Grafos</span>
                            <!-- Toggle Dirigido: solo visible en modo 'matrices' -->
                            <div class="grafos-directed-toggle" id="grafos-directed-toggle-wrap">
                                <button class="grafos-directed-btn active" id="grafos-btn-undirected">No Dirigido</button>
                                <button class="grafos-directed-btn" id="grafos-btn-directed">Dirigido</button>
                            </div>
                        </div>
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
                                    <span id="grafos-edge-arrow" style="flex-shrink:0;">—</span>
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
                            <!-- Selector de categoría: oculto (se controla por modo) -->
                            <div class="grafos-field-col" id="grafos-op-type-row" style="display:none;">
                                <label for="grafos-op-type">Categoría</label>
                                <select id="grafos-op-type">
                                    <option value="binary">Operación entre grafos (G1 y G2)</option>
                                    <option value="unary">Modificar grafo activo</option>
                                    <option value="tree">Árboles como Grafos</option>
                                    <option value="matrix">Cálculo de Matrices</option>
                                    <option value="coloring">Colorear Grafo</option>
                                    <option value="independent">Conjuntos Independientes</option>
                                    <option value="dominating">Conjunto Dominante</option>
                                    <option value="matching">Matching</option>
                                </select>
                            </div>
                            <!-- Operaciones entre 2 grafos (binarias) -->
                            <div class="grafos-field-col" id="grafos-op-binary-col">
                                <label for="grafos-op-select">Tipo de Operación</label>
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
                            <!-- Operaciones sobre 1 grafo (unarias) -->
                            <div class="grafos-field-col hidden" id="grafos-op-unary-col">
                                <label for="grafos-op-unary-select">Edición</label>
                                <select id="grafos-op-unary-select">
                                    <option value="mergeVertices">Fusión de vértices</option>
                                    <option value="contractEdge">Contracción de arista</option>
                                    <option value="complement">Complemento</option>
                                </select>
                                <div id="grafos-op-unary-params" style="margin-top:8px;"></div>
                            </div>
                            <!-- Árboles como grafos -->
                            <div class="grafos-field-col hidden" id="grafos-op-tree-col">
                                <label for="grafos-op-tree-select">Operación</label>
                                <select id="grafos-op-tree-select">
                                    <option value="center">Centro o Bicentro del Árbol</option>
                                    <option value="mst">Árbol de Expansión Mínimo (MST)</option>
                                    <option value="maxst">Árbol de Expansión Máximo (MaxST)</option>
                                    <option value="distance">Distancia entre 2 Árboles de Expansión</option>
                                </select>
                            </div>
                            <!-- Cálculo de Matrices -->
                            <div class="grafos-matrix-source-row hidden" id="grafos-op-matrix-row">
                                <div class="grafos-field-col">
                                    <label for="grafos-op-matrix-select">Operación</label>
                                    <select id="grafos-op-matrix-select">
                                        <option value="distanceMatrix">Matriz de Distancia Entre Vértices</option>
                                        <option value="circuitCutMatrix">Matriz de Circuitos y Conjuntos de Corte</option>
                                        <option value="incidenceAdjacencyMatrix">Matriz de Incidencia y Adyacencia</option>
                                    </select>
                                </div>
                                <div class="grafos-field-col">
                                    <label for="grafos-op-matrix-source">Grafo</label>
                                    <select id="grafos-op-matrix-source">
                                        <option value="g1">G1</option>
                                        <option value="g2">G2</option>
                                        <option value="g3">G3</option>
                                    </select>
                                </div>
                            </div>
                            <!-- Coloreado de Grafos -->
                            <div class="grafos-field-col hidden" id="grafos-op-coloring-col">
                                <div style="display:flex; gap:6px;">
                                    <div style="flex:1; display:flex; flex-direction:column; gap:4px;">
                                        <label for="grafos-op-coloring-type">Tipo de Coloreado</label>
                                        <select id="grafos-op-coloring-type">
                                            <option value="total">Coloreado Total</option>
                                            <option value="vertices">Coloreado de Vértices</option>
                                            <option value="aristas">Coloreado de Aristas</option>
                                        </select>
                                    </div>
                                    <div style="flex:1; display:flex; flex-direction:column; gap:4px;">
                                        <label for="grafos-op-coloring-source">Grafo</label>
                                        <select id="grafos-op-coloring-source">
                                            <option value="g1">G1</option>
                                            <option value="g2">G2</option>
                                            <option value="g3">G3 (Resultado)</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                            <!-- Conjuntos Dominantes e Independientes -->
                            <div class="grafos-field-col hidden" id="grafos-op-conjuntos-col">
                                <div style="display:flex; gap:6px;">
                                    <div style="flex:1; display:flex; flex-direction:column; gap:4px;">
                                        <label for="grafos-op-conjuntos-select">Operación</label>
                                        <select id="grafos-op-conjuntos-select">
                                            <option value="independent">Conjuntos Independientes</option>
                                            <option value="dominating">Conjuntos Dominantes</option>
                                        </select>
                                    </div>
                                    <div style="flex:1; display:flex; flex-direction:column; gap:4px;">
                                        <label for="grafos-op-conjuntos-source">Grafo</label>
                                        <select id="grafos-op-conjuntos-source">
                                            <option value="g1">G1</option>
                                            <option value="g2">G2</option>
                                            <option value="g3">G3 (Resultado)</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                            <!-- Matching -->
                            <div class="grafos-field-col hidden" id="grafos-op-matching-col">
                                <label for="grafos-op-matching-source">Grafo a analizar</label>
                                <select id="grafos-op-matching-source">
                                    <option value="g1">G1</option>
                                    <option value="g2">G2</option>
                                    <option value="g3">G3 (Resultado)</option>
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

        // ── Post-render: configure UI based on mode ──────────────────────────
        // Auto-set the operation type (the select is hidden, but we still need its value)
        const modeToOpType2 = {
            'operaciones': 'binary',
            'arboles': 'tree',
            'matrices': 'matrix',
            'coloreado': 'coloring',
            'conjuntos': 'independent',
            'matching': 'matching'
        };
        if (this.el.opTypeSelect) {
            this.el.opTypeSelect.value = modeToOpType2[this._mode] || 'binary';
            
            // Adjust options for 'operaciones' mode
            const opTypeRow = document.getElementById('grafos-op-type-row');
            if (opTypeRow) {
                if (this._mode === 'operaciones') {
                    opTypeRow.style.display = '';
                    const optBinary = this.el.opTypeSelect.querySelector('option[value="binary"]');
                    const optUnary = this.el.opTypeSelect.querySelector('option[value="unary"]');
                    if (optBinary) optBinary.textContent = 'Operaciones entre 2 grafos';
                    if (optUnary) optUnary.textContent = 'Operaciones con 1 grafo';
                    this.el.opTypeSelect.querySelectorAll('option').forEach(opt => {
                        if (opt.value !== 'binary' && opt.value !== 'unary') {
                            opt.hidden = true;
                        } else {
                            opt.hidden = false;
                        }
                    });
                } else {
                    opTypeRow.style.display = 'none';
                }
            }

            this._updateOpUI();
        }

        // Show/hide directed toggle based on mode
        const directedWrap = document.getElementById('grafos-directed-toggle-wrap');
        if (directedWrap) {
            directedWrap.style.display = this._mode === 'matrices' ? '' : 'none';
        }

        // For 'conjuntos': show the 'independent' subtype initially as default
        // (user can switch by changing opTypeSelect to 'dominating' if exposed—but since it's hidden,
        //  we expose a special in-mode selector). Handled in _onExecute.
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
            distLabelG2: document.getElementById('grafos-dist-label-g2'),
            btnDirected: document.getElementById('grafos-btn-directed'),
            btnUndirected: document.getElementById('grafos-btn-undirected'),
            edgeArrow: document.getElementById('grafos-edge-arrow'),
            opMatrixRow: document.getElementById('grafos-op-matrix-row'),
            opMatrixSelect: document.getElementById('grafos-op-matrix-select'),
            opMatrixSource: document.getElementById('grafos-op-matrix-source'),
            opColoringCol: document.getElementById('grafos-op-coloring-col'),
            opColoringType: document.getElementById('grafos-op-coloring-type'),
            opColoringSource: document.getElementById('grafos-op-coloring-source'),
            opConjuntosCol: document.getElementById('grafos-op-conjuntos-col'),
            opConjuntosSelect: document.getElementById('grafos-op-conjuntos-select'),
            opConjuntosSource: document.getElementById('grafos-op-conjuntos-source'),
            opMatchingCol: document.getElementById('grafos-op-matching-col'),
            opMatchingSource: document.getElementById('grafos-op-matching-source')
        };
        this._coloringVertexColors = {};
        this._coloringEdgeColors = {};
        this._coloringSource = null;
        // Matching state
        this._matchingAllResults = null;
        this._matchingGraph = null;
        this._matchingGraphSource = null;
        // Matrix highlight state
        this._matrixGraph = null;
        this._matrixSrc = null;
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
        // opTypeSelect is hidden; only listen if it exists and user can access it
        el.opTypeSelect.addEventListener('change', () => this._updateOpUI());
        el.opUnarySelect.addEventListener('change', () => this._updateOpUnaryParamsUI());
        if (el.opColoringType) el.opColoringType.addEventListener('change', () => {
            this._clearColoringState();
            this._drawGraph(el.canvasResult, this.gResult, this._camR);
        });
        el.btnDirected.addEventListener('click', () => this._setDirected(true));
        el.btnUndirected.addEventListener('click', () => this._setDirected(false));

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
        if (canvasKey === 'g1') { this._dragModeG1 = !this._dragModeG1; this.el.dragG1.classList.toggle('active', this._dragModeG1); }
        else if (canvasKey === 'g2') { this._dragModeG2 = !this._dragModeG2; this.el.dragG2.classList.toggle('active', this._dragModeG2); }
        else if (canvasKey === 'result') { this._dragModeR = !this._dragModeR; this.el.dragResult.classList.toggle('active', this._dragModeR); }
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
            if (this._maximizedCanvas === 'g1') { this._fitGraph(this.el.canvasG1, this._getDistDisplayG1(), this._cam1); }
            else if (this._maximizedCanvas === 'g2') { this._fitGraph(this.el.canvasG2, this._getDistDisplayG2(), this._cam2); }
            else if (this._maximizedCanvas === 'result' && this.gResult) { this._fitGraph(this.el.canvasResult, this.gResult, this._camR); }
            else if (this._maximizedCanvas === 'result2' && this.gResult2) { this._fitGraph(this.el.canvasResult2, this.gResult2, this._camR2); }
            else {
                this._fitGraph(this.el.canvasG1, this._getDistDisplayG1(), this._cam1);
                this._fitGraph(this.el.canvasG2, this._getDistDisplayG2(), this._cam2);
                if (this.gResult) this._fitGraph(this.el.canvasResult, this.gResult, this._camR);
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

    _getActiveGraph() { return this._activeGraph === 'g1' ? this.g1 : this.g2; }
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
        this.el.edgeTo.innerHTML = '<option value="">--</option>';
        g.vertices.forEach(v => { this.el.edgeFrom.add(new Option(v, v)); this.el.edgeTo.add(new Option(v, v)); });
        this.el.edgeList.innerHTML = '';
        g.edges.forEach(edge => {
            const row = document.createElement('div');
            row.className = 'grafos-edge-item';
            const w = (edge.weight !== null && edge.weight !== undefined) ? edge.weight : '';
            const badge = w !== '' ? `<span class="tag-edge-weight-badge">[${w}]</span>` : '';
            const sep = this._directed ? '→' : '—';
            row.innerHTML = `<span class="grafos-edge-id">${edge.id})</span> ${edge.from} ${sep} ${edge.to} ${badge}
                             <button class="edge-remove" data-id="${edge.id}">×</button>`;
            row.querySelector('.edge-remove').addEventListener('click', (e) => this._handleRemoveEdge(e.currentTarget.getAttribute('data-id')));
            this.el.edgeList.appendChild(row);
        });
        this._updateOpUnaryParamsUI();
    }

    _updateOpUI() {
        const type = this.el.opTypeSelect.value;
        const isConjuntos = this._mode === 'conjuntos';
        this.el.opBinaryCol.classList.toggle('hidden', type !== 'binary');
        this.el.opUnaryCol.classList.toggle('hidden', type !== 'unary');
        this.el.opTreeCol.classList.toggle('hidden', type !== 'tree');
        this.el.opMatrixRow.classList.toggle('hidden', type !== 'matrix');
        this.el.opColoringCol.classList.toggle('hidden', type !== 'coloring');
        if (this.el.opConjuntosCol) this.el.opConjuntosCol.classList.toggle('hidden', !isConjuntos);
        if (this.el.opMatchingCol) this.el.opMatchingCol.classList.toggle('hidden', type !== 'matching');
        if (type === 'unary') this._updateOpUnaryParamsUI();
        if (this.el.rightPanelTitle) {
            if (isConjuntos || type === 'tree' || type === 'coloring' || type === 'matching') {
                this.el.rightPanelTitle.textContent = 'Descripción del Grafo';
            } else {
                this.el.rightPanelTitle.textContent = 'Operaciones de la Estructura';
            }
        }
    }

    _setDirected(directed) {
        this._directed = directed;
        this.g1.directed = directed;
        this.g2.directed = directed;
        if (this.gResult) this.gResult.directed = directed;
        // Update toggle buttons
        this.el.btnDirected.classList.toggle('active', directed);
        this.el.btnUndirected.classList.toggle('active', !directed);
        // Update edge arrow indicator
        if (this.el.edgeArrow) this.el.edgeArrow.textContent = directed ? '→' : '—';
        // Filter op categories: directed only allows matrix
        const opTypeSelect = this.el.opTypeSelect;
        const options = opTypeSelect.querySelectorAll('option');
        options.forEach(opt => {
            if (directed && opt.value !== 'matrix' && opt.value !== 'coloring' && opt.value !== 'independent' && opt.value !== 'dominating' && opt.value !== 'connected_subsets') {
                opt.hidden = true;
            } else {
                opt.hidden = false;
            }
        });
        if (directed && opTypeSelect.value !== 'coloring' && opTypeSelect.value !== 'independent' && opTypeSelect.value !== 'dominating' && opTypeSelect.value !== 'connected_subsets') opTypeSelect.value = 'matrix';
        // Matching is only for undirected graphs
        if (directed && opTypeSelect.value === 'matching') opTypeSelect.value = 'matrix';
        this._updateOpUI();
        this._drawAll();
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
        const to = this.el.edgeTo.value;
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
        const validAlgos = [
            'grafos-operaciones', 'arboles-grafos', 'calculo-matrices',
            'coloreado-grafos', 'conjuntos-dom-indep', 'matching-grafos'
        ];
        if (!validAlgos.includes(data.algorithm)) {
            Validation.showError('El archivo no corresponde a un módulo de Grafos válido.');
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
        // Route directly by mode for non-auto calls
        const mode = this._mode;
        if (mode === 'arboles') { if (!isAuto) { this._clearColoringState(); this._onExecuteTree(); } return; }
        if (mode === 'matrices') { if (!isAuto) { this._clearColoringState(); this._onExecuteMatrix(); } return; }
        if (mode === 'coloreado') { if (!isAuto) this._onExecuteColoring(); return; }
        if (mode === 'conjuntos') {
            if (!isAuto) {
                const subType = this.el.opConjuntosSelect.value;
                if (subType === 'dominating') this._onExecuteDominating();
                else this._onExecuteIndependent();
            }
            return;
        }
        if (mode === 'matching') { if (!isAuto) { this._clearColoringState(); this._onExecuteMatching(); } return; }

        // mode === 'operaciones' — uses opTypeSelect for binary/unary
        const type = this.el.opTypeSelect.value;
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
        const func = this.el.opTreeSelect.value;
        const gActive = this._getActiveGraph();
        const gLabel = this._getActiveGraphLabel();
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
            if (func === 'center') this._executeCenterBicenter();
            else if (func === 'mst') this._executeMST(false);
            else if (func === 'maxst') this._executeMST(true);
            else if (func === 'distance') this._executeDistance();
        } catch (err) {
            Validation.showError('Error al calcular: ' + err.message);
            console.error(err);
        }
    }

    _onExecuteMatrix() {
        const op = this.el.opMatrixSelect.value;
        const src = this.el.opMatrixSource.value;
        let graph;
        if (src === 'g1') graph = this.g1;
        else if (src === 'g2') graph = this.g2;
        else graph = this.gResult;

        if (!graph || !graph.created || graph.vertices.length === 0) {
            Validation.showError('El grafo seleccionado está vacío o no ha sido definido.');
            return;
        }

        // Propagate directed flag
        graph.directed = this._directed;

        // Store for highlight callbacks
        this._matrixGraph = graph;
        this._matrixSrc = src;

        // Clear any previous coloring highlight and double-result layout
        this._coloringVertexColors = {};
        this._coloringEdgeColors = {};
        this._coloringSource = null;
        this._resultHighlightVertices = {};
        this._resultHighlightEdges = {};
        this._result2HighlightVertices = {};
        this._result2HighlightEdges = {};
        this.gResult = null;
        this.gResult2 = null;
        if (this.el.wrapResult2) this.el.wrapResult2.style.display = 'none';
        this._drawAll();

        try {
            let html = '';
            if (op === 'distanceMatrix') {
                const res = MatrixGraphModel.computeDistanceMatrix(graph);
                html = MatrixGraphModel.renderDistanceHTML(res);
                this._addUpdateLog(`✔ Matriz de Distancia calculada. Diámetro=${res.diameter}, Radio=${res.radius}`, 'success');
            } else if (op === 'circuitCutMatrix') {
                if (!TreeGraphModel.isConnected(graph)) {
                    Validation.showError('El grafo debe ser conexo para calcular circuitos y conjuntos de corte.'); return;
                }
                const res = MatrixGraphModel.computeCircuitCutMatrix(graph);
                html = MatrixGraphModel.renderCircuitCutHTML(res);
                this._addUpdateLog(`✔ Matriz de Circuitos (${res.nC} fundamentales) y Conjuntos de Corte calculados.`, 'success');

                // Perform Rank & Nullity operations and show 2 result graphs
                const rnResult = TreeGraphModel.rankAndNullity(graph);
                this._inheritPositions(graph, rnResult.mstGraph);
                this._inheritPositions(graph, rnResult.complementGraph);
                
                this.gResult = rnResult.mstGraph;
                this.el.resultLabel.textContent = 'T — Árbol de Expansión (Ramas)';
                this._resultHighlightVertices = {};
                this._resultHighlightEdges = {};
                rnResult.mstEdges.forEach(e => {
                    this._resultHighlightEdges[[e.from, e.to].sort().join('-')] = '#26A65B';
                });

                this.gResult2 = rnResult.complementGraph;
                this.el.result2Label.textContent = "T' — Complemento (Cuerdas)";
                this._result2HighlightVertices = {};
                this._result2HighlightEdges = {};
                rnResult.complementEdges.forEach(e => {
                    this._result2HighlightEdges[[e.from, e.to].sort().join('-')] = '#E53935';
                });

                this.el.wrapResult2.style.display = 'flex';
                this._resizeAllCanvas();
                this._fitGraph(this.el.canvasResult, this.gResult, this._camR);
                this._fitGraph(this.el.canvasResult2, this.gResult2, this._camR2);
                this._drawResultCanvas();
                this._drawGraph(this.el.canvasResult2, this.gResult2, this._camR2, this._result2HighlightVertices, this._result2HighlightEdges);
                
                this._addUpdateLog(`✔ Rango = ${rnResult.rank} | Nulidad = ${rnResult.nullity}`, 'success');
            } else if (op === 'incidenceAdjacencyMatrix') {
                const resInc = MatrixGraphModel.computeIncidenceMatrix(graph);
                const resAdj = MatrixGraphModel.computeAdjacencyMatrix(graph);
                html = MatrixGraphModel.renderIncidenceHTML(resInc)
                    + MatrixGraphModel.renderAdjacencyHTML(resAdj);
                this._addUpdateLog('✔ Matrices de Incidencia y Adyacencia calculadas.', 'success');
            }
            this.el.opContent.innerHTML = html || '<div class="huffman-empty-msg">Sin resultados.</div>';
            this.el.opContent.scrollTop = 0;
            // Bind interactive row clicks for matrix highlighting
            this._bindMatrixRowClicks();
        } catch (err) {
            Validation.showError('Error al calcular matrices: ' + err.message);
            console.error(err);
        }
    }

    /**
     * Binds click events to all .matrix-row-clickable elements inside opContent.
     * A click highlights the corresponding vertex/edges on the graph canvas.
     */
    _bindMatrixRowClicks() {
        const self = this;
        this.el.opContent.querySelectorAll('.matrix-row-clickable').forEach(row => {
            row.addEventListener('click', function () {
                const isActive = this.classList.contains('matrix-row-active');
                // Deselect all rows
                self.el.opContent.querySelectorAll('.matrix-row-clickable').forEach(r => {
                    r.classList.remove('matrix-row-active');
                    // Restore original background using data-base-bg (set by the HTML renderer)
                    r.style.background = r.dataset.baseBg || '';
                });

                if (isActive) {
                    // Clicking same row deselects → clear highlights
                    self._clearMatrixHighlight();
                    return;
                }

                // Mark this row active
                this.classList.add('matrix-row-active');
                this.style.background = 'rgba(255,160,0,0.22)';
                self._onMatrixRowClick(this);
            });
        });
    }

    /** Clears all matrix-related highlights from the graph canvas */
    _clearMatrixHighlight() {
        this._coloringVertexColors = {};
        this._coloringEdgeColors = {};
        this._coloringSource = null;
        this._resultHighlightVertices = {};
        this._resultHighlightEdges = {};
        this._drawAll();
    }

    /**
     * Handles a click on a matrix table row.
     * Highlights the corresponding vertices / edges on the graph canvas.
     * @param {HTMLElement} row  - The clicked <tr> element with data-matrix-type and data-key.
     */
    _onMatrixRowClick(row) {
        const type = row.dataset.matrixType;
        const key = row.dataset.key || '';
        const graph = this._matrixGraph;
        const src = this._matrixSrc;
        if (!graph || !src) return;

        const hlV = {};
        const hlE = {};
        const VERTEX_COLOR = '#FF9800';   // naranja  – vértice seleccionado
        const EDGE_COLOR = '#E53935';   // rojo     – arista principal
        const ADJ_COLOR = '#43A047';   // verde    – vértices adyacentes
        const INCIDENT_COLOR = '#F9A825';   // amarillo – aristas incidentes sobre la arista seleccionada
        const SURVIVOR_COLOR = '#43A047';   // verde    – aristas que sobreviven al corte
        const CUT_COLOR = 'rgba(180,180,180,0.22)'; // gris fantasma – aristas del conjunto de corte

        if (type === 'incidence') {
            // Highlight the vertex + its incident edges
            const v = key;
            hlV[v] = VERTEX_COLOR;
            const edgeKeys = (row.dataset.edgeKeys || '').split(',').filter(Boolean);
            for (const ek of edgeKeys) {
                const [f, t] = ek.split('-');
                const e = graph.edges.find(e => e.from === f && e.to === t);
                if (e) {
                    hlE[[e.from, e.to].sort().join('-')] = EDGE_COLOR;
                    hlE[`eid:${e.id}`] = EDGE_COLOR;
                }
            }

        } else if (type === 'adjacency-vertex') {
            // Highlight the vertex + adjacent vertices + connecting edges
            const v = key;
            hlV[v] = VERTEX_COLOR;
            const adjKeys = (row.dataset.adjKeys || '').split(',').filter(Boolean);
            for (const u of adjKeys) { hlV[u] = ADJ_COLOR; }
            for (const e of graph.edges) {
                const involves = (e.from === v || e.to === v);
                if (involves) {
                    hlE[[e.from, e.to].sort().join('-')] = EDGE_COLOR;
                    hlE[`eid:${e.id}`] = EDGE_COLOR;
                }
            }

        } else if (type === 'circuit') {
            // Circuito: colorear aristas del circuito + vértices endpoint
            const edgeKeys = key.split(',').filter(Boolean);
            const cutSet = new Set(edgeKeys);
            for (const ek of edgeKeys) {
                const [f, t] = ek.split('-');
                const e = graph.edges.find(e =>
                    (e.from === f && e.to === t) || (e.from === t && e.to === f)
                );
                if (e) {
                    hlE[[e.from, e.to].sort().join('-')] = EDGE_COLOR;
                    hlE[`eid:${e.id}`] = EDGE_COLOR;
                    hlV[e.from] = hlV[e.from] || ADJ_COLOR;
                    hlV[e.to] = hlV[e.to] || ADJ_COLOR;
                }
            }

        } else if (type === 'cut') {
            // Conjunto de corte: aristas cortadas → casi invisibles; aristas supervivientes → verde
            const edgeKeys = key.split(',').filter(Boolean);
            const cutKeySet = new Set();
            for (const ek of edgeKeys) {
                const [f, t] = ek.split('-');
                const e = graph.edges.find(e =>
                    (e.from === f && e.to === t) || (e.from === t && e.to === f)
                );
                if (e) {
                    const sortedKey = [e.from, e.to].sort().join('-');
                    cutKeySet.add(sortedKey);
                    cutKeySet.add(`eid:${e.id}`);
                }
            }
            // Pintar todas las aristas: transparente si está en el corte, verde si sobrevive
            for (const e of graph.edges) {
                const sortedKey = [e.from, e.to].sort().join('-');
                if (cutKeySet.has(sortedKey) || cutKeySet.has(`eid:${e.id}`)) {
                    hlE[sortedKey] = CUT_COLOR;
                    hlE[`eid:${e.id}`] = CUT_COLOR;
                } else {
                    hlE[sortedKey] = SURVIVOR_COLOR;
                    hlE[`eid:${e.id}`] = SURVIVOR_COLOR;
                }
            }

        } else if (type === 'adjacency-edge') {
            // Highlight the selected edge (red) + its vertices (orange)
            const [f, t] = key.split('-');
            const e = graph.edges.find(e =>
                (e.from === f && e.to === t) || (e.from === t && e.to === f)
            );
            if (e) {
                hlE[[e.from, e.to].sort().join('-')] = EDGE_COLOR;
                hlE[`eid:${e.id}`] = EDGE_COLOR;
                hlV[e.from] = VERTEX_COLOR;
                hlV[e.to] = VERTEX_COLOR;
            }
            // Aristas incidentes en amarillo
            const incidentKeys = (row.dataset.incidentKeys || '').split(',').filter(Boolean);
            for (const ik of incidentKeys) {
                const [if_, it] = ik.split('-');
                const inc = graph.edges.find(e =>
                    (e.from === if_ && e.to === it) || (e.from === it && e.to === if_)
                );
                if (inc) {
                    hlE[[inc.from, inc.to].sort().join('-')] = INCIDENT_COLOR;
                    hlE[`eid:${inc.id}`] = INCIDENT_COLOR;
                }
            }
        }

        // Apply highlights to the correct canvas
        if (src === 'g1') {
            this._coloringSource = 'g1';
            this._coloringVertexColors = hlV;
            this._coloringEdgeColors = hlE;
            this._resultHighlightVertices = {};
            this._resultHighlightEdges = {};
        } else if (src === 'g2') {
            this._coloringSource = 'g2';
            this._coloringVertexColors = hlV;
            this._coloringEdgeColors = hlE;
            this._resultHighlightVertices = {};
            this._resultHighlightEdges = {};
        } else {
            // g3 / result graph
            this._coloringSource = null;
            this._coloringVertexColors = {};
            this._coloringEdgeColors = {};
            this._resultHighlightVertices = hlV;
            this._resultHighlightEdges = hlE;
        }

        this._drawAll();
    }

    _clearColoringState() {
        if (this._coloringSource) {
            this._coloringVertexColors = {};
            this._coloringEdgeColors = {};
            this._coloringSource = null;
            this._redrawG1();
            this._redrawG2();
        }
    }

    _invalidateResult() {

        this.gResult = null;
        this.gResult2 = null;
        this._centerSteps = []; this._centerStepIdx = 0;
        this._resultHighlightVertices = {}; this._resultHighlightEdges = {};
        this._result2HighlightVertices = {}; this._result2HighlightEdges = {};
        this._coloringVertexColors = {}; this._coloringEdgeColors = {}; this._coloringSource = null;
        this._distModeActive = false;
        this._distStepsG1 = []; this._distStepIdxG1 = 0;
        this._distStepsG2 = []; this._distStepIdxG2 = 0;
        if (this.el.distNavG1) this.el.distNavG1.classList.add('hidden');
        if (this.el.distNavG2) this.el.distNavG2.classList.add('hidden');
        if (this.el.canvasLabelG1) this.el.canvasLabelG1.textContent = 'Grafo 1 (G1)';
        if (this.el.canvasLabelG2) this.el.canvasLabelG2.textContent = 'Grafo 2 (G2)';
        if (this.el.resultLabel) this.el.resultLabel.textContent = 'Resultado';
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
        if (this._mode === 'operaciones' && this._lastBinaryOp && this.g1.created && this.g2.created && this.el.opTypeSelect.value === 'binary') {
            this.el.opSelect.value = this._lastBinaryOp;
            this._onExecute(true);
        } else { this._invalidateResult(); }
    }

    _refreshActiveCanvas() {
        const canvas = this._activeGraph === 'g1' ? this.el.canvasG1 : this.el.canvasG2;
        const cam = this._activeGraph === 'g1' ? this._cam1 : this._cam2;
        const g = this._getActiveGraph();
        this._fitGraph(canvas, g, cam);
        this._drawGraph(canvas, g, cam);
    }

    // ─── Tree Algorithms ─────────────────────────────────────────────────────

    _executeCenterBicenter() {
        const gSrc = this._getActiveGraph();
        const gLabel = this._getActiveGraphLabel();
        this._centerSourceGraph = gSrc;
        const result = TreeGraphModel.findCenterBicenter(gSrc);
        this._centerSteps = result.steps;
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
        const idx = this._centerStepIdx;
        this.el.stepLabel.textContent = `Paso ${idx + 1} de ${total}`;
        this.el.stepPrev.disabled = idx === 0;
        this.el.stepNext.disabled = idx === total - 1;
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
        this._resultHighlightEdges = {};
        if (step.leaves) step.leaves.forEach(v => { this._resultHighlightVertices[v] = '#FF7043'; });
        if (step.center) step.center.forEach(v => { this._resultHighlightVertices[v] = '#26A65B'; });
        this._fitGraph(this.el.canvasResult, this.gResult, this._camR);
        this._drawResultCanvas();
    }

    _executeMST(maximize) {
        const gSrc = this._getActiveGraph();
        const gLabel = this._getActiveGraphLabel();
        this._mstMaximize = maximize;
        const result = TreeGraphModel.kruskal(gSrc, maximize);
        const treeGraph = new GraphModel();
        treeGraph._build_internal(gSrc.vertices, result.treeEdges, false, maximize ? 'MaxST' : 'MST');
        this._inheritPositions(gSrc, treeGraph);
        this.gResult = treeGraph;
        this._resultHighlightVertices = {};
        this._resultHighlightEdges = {};
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
        this._resultHighlightEdges = {};
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
        this._result2HighlightEdges = {};
        result.intersectionEdges.forEach(e => { this._result2HighlightEdges[[e.from, e.to].sort().join('-')] = '#26A65B'; });
        this.el.wrapResult2.style.display = 'flex';
        this._resizeAllCanvas();
        this._fitGraph(this.el.canvasResult, this.gResult, this._camR);
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
            D(T₁) = {${t1.edges.map(e => `${[e.from, e.to].sort().join('-')}:${e.weight ?? 1}`).join(', ')}} = ${sumT1}<br>
            D(T₂) = {${t2.edges.map(e => `${[e.from, e.to].sort().join('-')}:${e.weight ?? 1}`).join(', ')}} = ${sumT2}<br><br>
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
        const steps = which === 'g1' ? this._distStepsG1 : this._distStepsG2;
        const idx = which === 'g1' ? this._distStepIdxG1 : this._distStepIdxG2;
        const navEl = which === 'g1' ? this.el.distNavG1 : this.el.distNavG2;
        const prevEl = which === 'g1' ? this.el.distPrevG1 : this.el.distPrevG2;
        const nextEl = which === 'g1' ? this.el.distNextG1 : this.el.distNextG2;
        const labelEl = which === 'g1' ? this.el.distLabelG1 : this.el.distLabelG2;
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
        const gSrc = this._getActiveGraph();
        const gLabel = this._getActiveGraphLabel();
        const result = TreeGraphModel.rankAndNullity(gSrc);
        this._inheritPositions(gSrc, result.mstGraph);
        this._inheritPositions(gSrc, result.complementGraph);
        this.gResult = result.mstGraph;
        this.el.resultLabel.textContent = 'T — Árbol de Expansión (Ramas)';
        this._resultHighlightVertices = {};
        this._resultHighlightEdges = {};
        result.mstEdges.forEach(e => { this._resultHighlightEdges[[e.from, e.to].sort().join('-')] = '#26A65B'; });
        this.gResult2 = result.complementGraph;
        this.el.result2Label.textContent = "T' — Complemento (Cuerdas)";
        this._result2HighlightVertices = {};
        this._result2HighlightEdges = {};
        result.complementEdges.forEach(e => { this._result2HighlightEdges[[e.from, e.to].sort().join('-')] = '#E53935'; });
        this.el.wrapResult2.style.display = 'flex';
        this._resizeAllCanvas();
        this._fitGraph(this.el.canvasResult, this.gResult, this._camR);
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

    _onExecuteColoring() {
        const src = this.el.opColoringSource.value;
        const type = this.el.opColoringType ? this.el.opColoringType.value : 'total';
        let graph;
        let graphLabel;
        if (src === 'g1') { graph = this.g1; graphLabel = 'Grafo 1 (G1)'; }
        else if (src === 'g2') { graph = this.g2; graphLabel = 'Grafo 2 (G2)'; }
        else { graph = this.gResult; graphLabel = 'Grafo 3 (Resultado)'; }

        if (!graph || !graph.created || graph.vertices.length === 0) {
            Validation.showError('El grafo seleccionado está vacío o no ha sido definido.');
            return;
        }

        try {
            const result = GraphColoringModel.computeAll(graph);
            let msg = `✔ Coloreado de ${graphLabel} calculado.`;
            if (type === 'total' || type === 'vertices') msg += ` χ(G)=${result.chi}`;
            if (type === 'total' || type === 'aristas') msg += ` χ'(G)=${result.chiPrime}`;
            this._addUpdateLog(msg, 'success');

            // Build vertex highlight colors for canvas
            const hlVertices = {};
            if (type === 'total' || type === 'vertices') {
                for (const [v, cIdx] of Object.entries(result.coloring)) {
                    hlVertices[v] = GraphColoringModel.getColor(cIdx);
                }
            }

            // Build edge highlight colors for canvas (use edge ID key for parallel edges)
            const hlEdges = {};
            if (type === 'total' || type === 'aristas') {
                for (const e of graph.edges) {
                    const cIdx = result.edgeColoring[e.id];
                    if (cIdx !== undefined) {
                        hlEdges[`eid:${e.id}`] = GraphColoringModel.getColor(cIdx);
                    }
                }
            }

            // Store coloring state and draw on appropriate canvas
            this._coloringVertexColors = hlVertices;
            this._coloringEdgeColors = hlEdges;
            this._coloringSource = src;
            if (src === 'g1') {
                this._drawGraph(this.el.canvasG1, this.g1, this._cam1, hlVertices, hlEdges);
            } else if (src === 'g2') {
                this._drawGraph(this.el.canvasG2, this.g2, this._cam2, hlVertices, hlEdges);
            } else if (this.gResult) {
                this._resultHighlightVertices = hlVertices;
                this._resultHighlightEdges = hlEdges;
                this._drawResultCanvas();
            }

            // Render description
            this._renderColoringDescription(graph, graphLabel, result, type);
        } catch (err) {
            Validation.showError('Error al calcular coloreado: ' + err.message);
            console.error(err);
        }
    }

    _renderColoringDescription(graph, graphLabel, result, type) {
        const sections = [];

        // 1. Graph info
        sections.push({
            title: `Grafo Seleccionado — ${graphLabel}`,
            items: [{ graph: graph, label: graphLabel.replace(/\s*\(.*\)/, ''), isTree: false }]
        });

        // 2. Chromatic Number
        if (type === 'total' || type === 'vertices') {
            let chiHTML = `<div style="font-family:Consolas,monospace;font-size:0.83rem;line-height:1.9;padding:10px;background:rgba(43,87,154,0.04);border-radius:4px;">`;
            chiHTML += `<strong style="font-size:0.95rem;">Número Cromático χ(G) = <span style="font-size:1.1rem;">${result.chi}</span></strong><br><br>`;
            chiHTML += `<strong>Asignación de colores a vértices:</strong><br>`;
            for (const [v, cIdx] of Object.entries(result.coloring)) {
                const color = GraphColoringModel.getColor(cIdx);
                const name = GraphColoringModel.getColorName(cIdx);
                chiHTML += `<div style="display:flex;align-items:center;gap:6px;margin:3px 0;">`;
                chiHTML += `<span style="width:12px;height:12px;border-radius:50%;background:${color};display:inline-block;border:1px solid rgba(0,0,0,0.2);"></span>`;
                chiHTML += `${v} → ${name}`;
                chiHTML += `</div>`;
            }
            chiHTML += `</div>`;
            sections.push({ title: 'Número Cromático χ(G)', html: chiHTML });
        }

        // 3. Chromatic Index
        if (type === 'total' || type === 'aristas') {
            let chiPrimeHTML = `<div style="font-family:Consolas,monospace;font-size:0.83rem;line-height:1.9;padding:10px;background:rgba(43,87,154,0.04);border-radius:4px;">`;
            chiPrimeHTML += `<strong style="font-size:0.95rem;">Índice Cromático χ'(G) = <span style="font-size:1.1rem;">${result.chiPrime}</span></strong><br><br>`;
            if (graph.edges.length > 0) {
                chiPrimeHTML += `<strong>Asignación de colores a aristas:</strong><br>`;
                for (const e of graph.edges) {
                    const cIdx = result.edgeColoring[e.id];
                    if (cIdx !== undefined) {
                        const color = GraphColoringModel.getColor(cIdx);
                        const name = GraphColoringModel.getColorName(cIdx);
                        chiPrimeHTML += `<div style="display:flex;align-items:center;gap:6px;margin:3px 0;">`;
                        chiPrimeHTML += `<span style="width:12px;height:12px;border-radius:50%;background:${color};display:inline-block;border:1px solid rgba(0,0,0,0.2);"></span>`;
                        chiPrimeHTML += `${e.from}–${e.to} → ${name}`;
                        chiPrimeHTML += `</div>`;
                    }
                }
            }
            chiPrimeHTML += `</div>`;
            sections.push({ title: "Índice Cromático χ'(G)", html: chiPrimeHTML });
        }

        // 4. Chromatic Polynomial
        if (type === 'total' || type === 'vertices') {
            const poly = result.polynomial;
            const graphTypeName = GraphColoringModel.getGraphTypeName(poly.type);
            let polyHTML = `<div style="font-family:Consolas,monospace;font-size:0.83rem;line-height:1.9;padding:10px;background:rgba(43,87,154,0.04);border-radius:4px;">`;
            polyHTML += `<div style="font-size:0.85rem;margin-bottom:4px;color:var(--text-secondary);">Tipo: <strong>${graphTypeName}</strong></div>`;
            polyHTML += `<div>λ = χ(G) = ${result.chi}</div>`;
            polyHTML += `<div style="margin-bottom:6px;">n = ${poly.n}</div>`;
            polyHTML += `<div style="font-size:0.9rem;margin:4px 0;">${poly.formula}</div>`;
            polyHTML += `<div style="font-size:0.95rem;margin-top:8px;"><strong>${poly.evaluated}</strong></div>`;
            polyHTML += `</div>`;
            sections.push({ title: 'POLINOMIO CROMÁTICO', html: polyHTML });

            // 5. Chromatic Partitioning (Now containing Chromatic Class and Independent Sets)
            let partHTML = `<div style="font-family:Consolas,monospace;font-size:0.83rem;line-height:1.9;padding:10px;background:rgba(43,87,154,0.04);border-radius:4px;">`;

            // Chromatic Class (using chi instead of chiPrime/delta)
            partHTML += `<strong style="font-size:0.9rem;">Clase Cromática:</strong> χ(G) = ${result.chi}<br><br>`;

            // Fundamental Independent Sets
            partHTML += `<strong style="font-size:0.9rem;">Conjuntos Independientes Fundamentales:</strong><br>`;
            if (result.independentSets.length === 0) {
                partHTML += `<em>No se encontraron conjuntos independientes.</em>`;
            } else {
                for (let i = 0; i < result.independentSets.length; i++) {
                    const s = result.independentSets[i];
                    partHTML += `<div style="margin:4px 0;display:flex;align-items:center;gap:6px;">`;
                    partHTML += `<span style="width:14px;height:14px;border-radius:3px;background:${s.color};display:inline-block;border:1px solid rgba(0,0,0,0.15);"></span>`;
                    partHTML += `Cind<sub>${i + 1}</sub>(${s.colorName}): {${s.vertices.join(', ')}}`;
                    partHTML += `</div>`;
                }
            }
            partHTML += `</div>`;
            sections.push({ title: 'Particionamiento Cromático', html: partHTML });
        }

        // Removed independent sets and matchings HTML logic to _renderIndependentDescription

        this._renderDescription(sections);
    }

    _onExecuteIndependent() {
        const src = this.el.opConjuntosSource.value;
        let graph;
        let graphLabel;
        if (src === 'g1') { graph = this.g1; graphLabel = 'Grafo 1 (G1)'; }
        else if (src === 'g2') { graph = this.g2; graphLabel = 'Grafo 2 (G2)'; }
        else { graph = this.gResult; graphLabel = 'Grafo 3 (Resultado)'; }

        if (!graph || !graph.created || graph.vertices.length === 0) {
            Validation.showError('El grafo seleccionado está vacío o no ha sido definido.');
            return;
        }

        try {
            const result = GraphColoringModel.computeAll(graph);
            this._addUpdateLog(`✔ Conjuntos Independientes de ${graphLabel} calculados.`, 'success');

            this._clearColoringState();

            this._renderIndependentDescription(graph, graphLabel, result, src);
        } catch (err) {
            Validation.showError('Error al calcular conjuntos independientes: ' + err.message);
            console.error(err);
        }
    }

    _renderIndependentDescription(graph, graphLabel, result, src) {
        const sections = [];

        sections.push({
            title: `Grafo Seleccionado — ${graphLabel}`,
            items: [{ graph: graph, label: graphLabel.replace(/\s*\(.*\)/, ''), isTree: false }]
        });

        // Total Vertex Independent Sets
        this._currentSetsData['all_vert_indep'] = result.allIndependentSets;
        let totalVertHTML = `<div style="font-family:Consolas,monospace;font-size:0.83rem;line-height:1.9;padding:10px;background:rgba(43,87,154,0.04);border-radius:4px;">`;
        totalVertHTML += `<strong style="font-size:0.95rem;">Número Total de Conjuntos Independientes de Vértices = <span style="font-size:1.1rem;">${result.totalIndependentSets}</span></strong><br>`;
        totalVertHTML += `<div style="margin-top:6px;font-weight:600;font-size:0.82rem;color:var(--text-primary);">Todos los conjuntos (${result.allIndependentSets.length}):</div>`;
        totalVertHTML += this._buildInteractiveSetsHTML(result.allIndependentSets, false, 'independent', 'indep-set-item', 'all_vert_indep');
        totalVertHTML += `</div>`;
        sections.push({ title: 'Total Conjuntos Independientes Vértices', html: totalVertHTML });

        // 1. Maximum Independent Sets (Vertices)
        this._currentSetsData['max_vert_indep'] = result.maximumSets;
        let maxHTML = `<div style="font-family:Consolas,monospace;font-size:0.83rem;line-height:1.9;padding:10px;background:rgba(43,87,154,0.04);border-radius:4px;">`;
        maxHTML += `<strong style="font-size:0.9rem;">Conjuntos Máximos Independientes de Vértices (${result.maximumSets.length}):</strong><br>`;
        maxHTML += this._buildInteractiveSetsHTML(result.maximumSets, false, 'independent', 'indep-set-item', 'max_vert_indep');
        maxHTML += `</div>`;
        sections.push({ title: 'Conjuntos Máximos Independientes de Vértices', html: maxHTML });

        // 2. Maximal Independent Sets (Vertices)
        this._currentSetsData['maximal_vert_indep'] = result.maximalSets;
        let maximalHTML = `<div style="font-family:Consolas,monospace;font-size:0.83rem;line-height:1.9;padding:10px;background:rgba(43,87,154,0.04);border-radius:4px;">`;
        maximalHTML += `<strong style="font-size:0.9rem;">Conjuntos Maximales Independientes de Vértices (${result.maximalSets.length}):</strong><br>`;
        maximalHTML += this._buildInteractiveSetsHTML(result.maximalSets, false, 'independent', 'indep-set-item', 'maximal_vert_indep');
        maximalHTML += `</div>`;
        sections.push({ title: 'Conjuntos Maximales Independientes de Vértices', html: maximalHTML });

        // Total Edge Independent Sets
        this._currentSetsData['all_edge_indep'] = result.allMatchings;
        let totalEdgeHTML = `<div style="font-family:Consolas,monospace;font-size:0.83rem;line-height:1.9;padding:10px;background:rgba(43,87,154,0.04);border-radius:4px;">`;
        totalEdgeHTML += `<strong style="font-size:0.95rem;">Número Total de Conjuntos Independientes de Aristas = <span style="font-size:1.1rem;">${result.totalMatchings}</span></strong><br>`;
        totalEdgeHTML += `<div style="margin-top:6px;font-weight:600;font-size:0.82rem;color:var(--text-primary);">Todos los conjuntos (${result.allMatchings.length}):</div>`;
        totalEdgeHTML += this._buildInteractiveSetsHTML(result.allMatchings, true, 'matching', 'indep-set-item', 'all_edge_indep');
        totalEdgeHTML += `</div>`;
        sections.push({ title: 'Total Conjuntos Independientes Aristas', html: totalEdgeHTML });

        // 3. Maximum Edge Independent Sets (Matchings)
        this._currentSetsData['max_edge_indep'] = result.maximumMatchings;
        let maxEdgeHTML = `<div style="font-family:Consolas,monospace;font-size:0.83rem;line-height:1.9;padding:10px;background:rgba(43,87,154,0.04);border-radius:4px;">`;
        maxEdgeHTML += `<strong style="font-size:0.9rem;">Conjuntos Máximos Independientes de Aristas (${result.maximumMatchings.length}):</strong><br>`;
        maxEdgeHTML += this._buildInteractiveSetsHTML(result.maximumMatchings, true, 'matching', 'indep-set-item', 'max_edge_indep');
        maxEdgeHTML += `</div>`;
        sections.push({ title: 'Conjuntos Máximos Independientes de Aristas', html: maxEdgeHTML });

        // 4. Maximal Edge Independent Sets (Matchings)
        this._currentSetsData['maximal_edge_indep'] = result.maximalMatchings;
        let maximalEdgeHTML = `<div style="font-family:Consolas,monospace;font-size:0.83rem;line-height:1.9;padding:10px;background:rgba(43,87,154,0.04);border-radius:4px;">`;
        maximalEdgeHTML += `<strong style="font-size:0.9rem;">Conjuntos Maximales Independientes de Aristas (${result.maximalMatchings.length}):</strong><br>`;
        maximalEdgeHTML += this._buildInteractiveSetsHTML(result.maximalMatchings, true, 'matching', 'indep-set-item', 'maximal_edge_indep');
        maximalEdgeHTML += `</div>`;
        sections.push({ title: 'Conjuntos Maximales Independientes de Aristas', html: maximalEdgeHTML });

        this._renderDescription(sections);
        this._bindInteractiveSetClicks('indep-set-item', false, 'independent', src, graph);
    }

    _onExecuteDominating() {
        const src = this.el.opConjuntosSource.value;
        let graph;
        let graphLabel;
        if (src === 'g1') { graph = this.g1; graphLabel = 'Grafo 1 (G1)'; }
        else if (src === 'g2') { graph = this.g2; graphLabel = 'Grafo 2 (G2)'; }
        else { graph = this.gResult; graphLabel = 'Grafo 3 (Resultado)'; }

        if (!graph || !graph.created || graph.vertices.length === 0) {
            Validation.showError('El grafo seleccionado está vacío o no ha sido definido.');
            return;
        }

        try {
            const result = GraphColoringModel.computeDominatingSets(graph);
            
            // Also compute connected dominating sets
            let connResult = null;
            try {
                connResult = GraphColoringModel.computeConnectedSubsets(graph);
            } catch (connErr) {
                console.warn('No se pudieron calcular los conjuntos dominantes conexos:', connErr);
            }

            this._addUpdateLog(`✔ Conjuntos Dominantes de ${graphLabel} calculados.`, 'success');

            this._clearColoringState();

            this._renderDominatingDescription(graph, graphLabel, result, connResult, src);
        } catch (err) {
            Validation.showError('Error al calcular conjuntos dominantes: ' + err.message);
            console.error(err);
        }
    }

    _renderDominatingDescription(graph, graphLabel, result, connResult, src) {
        const sections = [];

        sections.push({
            title: `Grafo Seleccionado — ${graphLabel}`,
            items: [{ graph: graph, label: graphLabel.replace(/\s*\(.*\)/, ''), isTree: false }]
        });

        // Total dominating sets
        this._currentSetsData['all_dominating'] = result.allSets;
        let totalHTML = `<div style="font-family:Consolas,monospace;font-size:0.83rem;line-height:1.9;padding:10px;background:rgba(43,87,154,0.04);border-radius:4px;">`;
        totalHTML += `<strong style="font-size:0.95rem;">Número Total de Conjuntos Dominantes = <span style="font-size:1.1rem;">${result.totalDominatingSetsCount}</span></strong><br>`;
        totalHTML += `<div style="margin-top:6px;font-weight:600;font-size:0.82rem;color:var(--text-primary);">Todos los conjuntos (${result.allSets.length}):</div>`;
        totalHTML += this._buildInteractiveSetsHTML(result.allSets, false, 'dominating', 'dom-set-item', 'all_dominating');
        totalHTML += `</div>`;
        sections.push({ title: 'Número Total de Conjuntos Dominantes', html: totalHTML });

        // Number of domination
        let numHTML = `<div style="font-family:Consolas,monospace;font-size:0.83rem;line-height:1.9;padding:10px;background:rgba(43,87,154,0.04);border-radius:4px;">`;
        numHTML += `<strong style="font-size:0.95rem;">Número de Dominación = <span style="font-size:1.1rem;">${result.dominationNumber}</span></strong>`;
        numHTML += `</div>`;
        sections.push({ title: 'Número de Dominación', html: numHTML });

        // Independent Dominating Sets
        this._currentSetsData['indep_dominating'] = result.independentDominatingSets;
        let indepHTML = `<div style="font-family:Consolas,monospace;font-size:0.83rem;line-height:1.9;padding:10px;background:rgba(43,87,154,0.04);border-radius:4px;">`;
        indepHTML += `<strong style="font-size:0.9rem;">Conjuntos Dominantes Independientes (${result.independentDominatingSets.length}):</strong><br>`;
        indepHTML += this._buildInteractiveSetsHTML(result.independentDominatingSets, false, 'dominating', 'dom-set-item', 'indep_dominating');
        indepHTML += `</div>`;
        sections.push({ title: 'Conjuntos Dominantes Independientes', html: indepHTML });

        // Minimum Dominating Sets
        this._currentSetsData['min_dominating'] = result.minimumSets;
        let minHTML = `<div style="font-family:Consolas,monospace;font-size:0.83rem;line-height:1.9;padding:10px;background:rgba(43,87,154,0.04);border-radius:4px;">`;
        const γ = result.minimumSets.length > 0 ? result.minimumSets[0].length : 0;
        minHTML += `<strong style="font-size:0.9rem;">Conjuntos Dominantes Mínimos (${result.minimumSets.length}) [Tamaño: ${γ}]:</strong><br>`;
        minHTML += this._buildInteractiveSetsHTML(result.minimumSets, false, 'dominating', 'dom-set-item', 'min_dominating');
        minHTML += `</div>`;
        sections.push({ title: 'Conjuntos Dominantes Mínimos', html: minHTML });

        // Maximum Dominating Sets
        this._currentSetsData['max_dominating'] = result.maximumSets;
        let maxHTML = `<div style="font-family:Consolas,monospace;font-size:0.83rem;line-height:1.9;padding:10px;background:rgba(43,87,154,0.04);border-radius:4px;">`;
        const Γ = result.maximumSets.length > 0 ? result.maximumSets[0].length : 0;
        maxHTML += `<strong style="font-size:0.9rem;">Conjuntos Dominantes Máximos (${result.maximumSets.length}) [Tamaño: ${Γ}]:</strong><br>`;
        maxHTML += this._buildInteractiveSetsHTML(result.maximumSets, false, 'dominating', 'dom-set-item', 'max_dominating');
        maxHTML += `</div>`;
        sections.push({ title: 'Conjuntos Dominantes Máximos', html: maxHTML });

        // ─── Connected Dominating Sets Integration ───
        if (connResult && connResult.connectedDominatingSets && connResult.connectedDominatingSets.length > 0) {
            // Connected Domination Number
            let connNumHTML = `<div style="font-family:Consolas,monospace;font-size:0.83rem;line-height:1.9;padding:10px;background:rgba(43,87,154,0.04);border-radius:4px;">`;
            connNumHTML += `<strong style="font-size:0.95rem;">Número de Dominación Conexa = <span style="font-size:1.1rem;">${connResult.connectedDominationNumber}</span></strong>`;
            connNumHTML += `</div>`;
            sections.push({ title: 'Número de Dominación Conexa', html: connNumHTML });

            // All Connected Dominating Sets
            this._currentSetsData['all_conn_dominating'] = connResult.connectedDominatingSets;
            let allConnDomHTML = `<div style="font-family:Consolas,monospace;font-size:0.83rem;line-height:1.9;padding:10px;background:rgba(43,87,154,0.04);border-radius:4px;">`;
            allConnDomHTML += `<strong style="font-size:0.9rem;">Conjuntos Dominantes Conexos (${connResult.connectedDominatingSets.length}):</strong><br>`;
            allConnDomHTML += this._buildInteractiveSetsHTML(connResult.connectedDominatingSets, false, 'connected_dominating', 'dom-set-item', 'all_conn_dominating');
            allConnDomHTML += `</div>`;
            sections.push({ title: 'Conjuntos Dominantes Conexos', html: allConnDomHTML });

            // Minimum Connected Dominating Sets
            this._currentSetsData['min_conn_dominating'] = connResult.minimumConnectedDominatingSets;
            let minConnDomHTML = `<div style="font-family:Consolas,monospace;font-size:0.83rem;line-height:1.9;padding:10px;background:rgba(43,87,154,0.04);border-radius:4px;">`;
            minConnDomHTML += `<strong style="font-size:0.9rem;">Conjuntos Dominantes Conexos Mínimos (${connResult.minimumConnectedDominatingSets.length}):</strong><br>`;
            minConnDomHTML += this._buildInteractiveSetsHTML(connResult.minimumConnectedDominatingSets, false, 'connected_dominating', 'dom-set-item', 'min_conn_dominating');
            minConnDomHTML += `</div>`;
            sections.push({ title: 'Conjuntos Dominantes Conexos Mínimos', html: minConnDomHTML });

            // Maximum Connected Dominating Sets
            this._currentSetsData['max_conn_dominating'] = connResult.maximumConnectedDominatingSets;
            let maxConnDomHTML = `<div style="font-family:Consolas,monospace;font-size:0.83rem;line-height:1.9;padding:10px;background:rgba(43,87,154,0.04);border-radius:4px;">`;
            maxConnDomHTML += `<strong style="font-size:0.9rem;">Conjuntos Dominantes Conexos Máximos (${connResult.maximumConnectedDominatingSets.length}):</strong><br>`;
            maxConnDomHTML += this._buildInteractiveSetsHTML(connResult.maximumConnectedDominatingSets, false, 'connected_dominating', 'dom-set-item', 'max_conn_dominating');
            maxConnDomHTML += `</div>`;
            sections.push({ title: 'Conjuntos Dominantes Conexos Máximos', html: maxConnDomHTML });
        }

        this._renderDescription(sections);
        this._bindInteractiveSetClicks('dom-set-item', false, 'dominating', src, graph);
    }

    // ─── Matching (Pareamientos) ──────────────────────────────────────────────

    _onExecuteMatching() {
        const src = this.el.opMatchingSource.value;
        let graph;
        let graphLabel;
        if (src === 'g1') { graph = this.g1; graphLabel = 'Grafo 1 (G1)'; }
        else if (src === 'g2') { graph = this.g2; graphLabel = 'Grafo 2 (G2)'; }
        else { graph = this.gResult; graphLabel = 'Grafo 3 (Resultado)'; }

        if (!graph || !graph.created || graph.vertices.length === 0) {
            Validation.showError('El grafo seleccionado está vacío o no ha sido definido.');
            return;
        }

        if (this._directed) {
            Validation.showError('El pareamiento solo se aplica a grafos no dirigidos.');
            return;
        }

        // Verificar que no tenga demasiadas aristas para la enumeración
        const validEdges = graph.edges.filter(e => e.from !== e.to).length;
        if (validEdges > 50) {
            Validation.showError('El grafo tiene demasiadas aristas para enumerar todos los pareamientos (máximo 50 aristas válidas).');
            return;
        }

        try {
            const allResults = MatchingModel.enumerateAllMatchings(graph);
            this._matchingAllResults = allResults;
            this._matchingGraph = graph;
            this._matchingGraphSource = src;

            this._addUpdateLog(`✔ Pareamientos de ${graphLabel} calculados. Total: ${allResults.total} (Comunes: ${allResults.comunes.length}, Maximales: ${allResults.maximales.length}, Máximos: ${allResults.maximos.length})`, 'success');

            // Limpiar coloreado previo
            this._coloringVertexColors = {};
            this._coloringEdgeColors = {};
            this._coloringSource = null;
            this._drawAll();

            // Renderizar descripción
            this._renderMatchingDescription(graph, graphLabel, allResults);
        } catch (err) {
            Validation.showError('Error al calcular pareamientos: ' + err.message);
            console.error(err);
        }
    }

    _renderMatchingDescription(graph, graphLabel, allResults) {
        // 1. Datos del Grafo (sin M)
        const vStr = graph.vertices.join(', ');
        const formattedEdges = [];
        const counts = {};
        for (const e of graph.edges) {
            const base = [e.from, e.to].sort().join('');
            const c = counts[base] || 0;
            counts[base] = c + 1;
            formattedEdges.push(base + "'".repeat(c));
        }
        const aStr = formattedEdges.join(', ');

        let graphHTML = `<div style="font-family:Consolas,monospace;font-size:0.83rem;line-height:1.9;padding:10px;background:rgba(43,87,154,0.04);border-radius:4px;">`;
        graphHTML += `<strong>Datos del Grafo:</strong><br>`;
        graphHTML += `G = (S, A)<br>`;
        graphHTML += `S = {${vStr || '∅'}}<br>`;
        graphHTML += `A = {${aStr || '∅'}}`;
        graphHTML += `</div>`;

        // 2. Lista de Posibles Pareamientos (3 subsecciones)
        const buildSubsection = (title, items, emptyMsg) => {
            let html = `<div style="margin-bottom:8px;">`;
            html += `<div style="font-weight:600;font-size:0.82rem;margin-bottom:4px;color:var(--text-primary);">${title} (${items.length})</div>`;
            if (items.length === 0) {
                html += `<div style="padding:6px 10px;font-style:italic;color:#999;font-size:0.8rem;">${emptyMsg}</div>`;
            } else {
                const needScroll = items.length > 10;
                html += `<div style="font-family:Consolas,monospace;font-size:0.82rem;line-height:1.7;${needScroll ? 'max-height:260px;overflow-y:auto;' : ''}padding:4px 0;">`;
                for (const m of items) {
                    const edgeStr = MatchingModel.formatEdges(m.matchingEdges);
                    html += `<div class="matching-item" data-matching-idx="${m.idx}" `;
                    html += `style="padding:4px 10px;cursor:pointer;border-radius:3px;transition:background 0.15s;" `;
                    html += `onmouseover="this.style.background='rgba(43,87,154,0.10)'" `;
                    html += `onmouseout="if(!this.classList.contains('matching-selected'))this.style.background='transparent'">`;
                    html += `${m.label} = {${edgeStr || '∅'}}`;
                    html += `</div>`;
                }
                html += `</div>`;
            }
            html += `</div>`;
            return html;
        };

        let listHTML = '';
        listHTML += buildSubsection('Pareamientos Comunes', allResults.comunes, 'No hay pareamientos comunes.');
        listHTML += buildSubsection('Pareamientos Maximales', allResults.maximales, 'No hay pareamientos maximales no-máximos.');
        listHTML += buildSubsection('Pareamientos Máximos y Maximales', allResults.maximos, 'No hay pareamientos máximos.');

        // 3. Sección de datos del pareamiento (vacía hasta que se seleccione uno)
        let detailHTML = `<div id="matching-detail-content" style="font-family:Consolas,monospace;font-size:0.83rem;line-height:1.9;padding:10px;background:rgba(43,87,154,0.04);border-radius:4px;color:#999;font-style:italic;">`;
        detailHTML += `Seleccione un pareamiento de la lista para ver sus datos.`;
        detailHTML += `</div>`;

        // Construir secciones
        const sections = [
            { title: `Datos del Grafo — ${graphLabel}`, html: graphHTML },
            { title: `Lista de Posibles Pareamientos (${allResults.total})`, html: listHTML },
            { title: 'Datos del Pareamiento', html: detailHTML }
        ];

        this._renderDescription(sections);

        // Bind click events on matching items
        const self = this;
        document.querySelectorAll('.matching-item').forEach(el => {
            el.addEventListener('click', function () {
                const idx = parseInt(this.dataset.matchingIdx);
                self._onSelectMatching(idx);

                // Visual selection state
                document.querySelectorAll('.matching-item').forEach(item => {
                    item.classList.remove('matching-selected');
                    item.style.background = 'transparent';
                });
                this.classList.add('matching-selected');
                this.style.background = 'rgba(229,57,53,0.12)';
            });
        });
    }

    _onSelectMatching(idx) {
        if (!this._matchingAllResults || !this._matchingGraph) return;

        // Find the matching by idx across all categories
        const all = [
            ...this._matchingAllResults.comunes,
            ...this._matchingAllResults.maximales,
            ...this._matchingAllResults.maximos
        ];
        const result = all.find(m => m.idx === idx);
        if (!result) return;

        const src = this._matchingGraphSource;
        const graph = this._matchingGraph;

        // Color matching edges red
        const hlEdges = {};
        for (const e of result.matchingEdges) {
            const key = [e.from, e.to].sort().join('-');
            hlEdges[key] = '#E53935';
        }

        this._coloringVertexColors = {};
        this._coloringEdgeColors = hlEdges;
        this._coloringSource = src;

        if (src === 'g1') {
            this._drawGraph(this.el.canvasG1, this.g1, this._cam1, {}, hlEdges);
        } else if (src === 'g2') {
            this._drawGraph(this.el.canvasG2, this.g2, this._cam2, {}, hlEdges);
        } else if (this.gResult) {
            this._resultHighlightVertices = {};
            this._resultHighlightEdges = hlEdges;
            this._drawResultCanvas();
        }

        // Update detail panel
        const detailEl = document.getElementById('matching-detail-content');
        if (detailEl) {
            const saturatedStr = result.saturatedVertices.join(', ');
            const freeStr = result.freeVertices.length > 0 ? result.freeVertices.join(', ') : '∅';
            const mStr = MatchingModel.formatEdges(result.matchingEdges);

            let html = `<strong>Datos del Pareamiento ${result.label}:</strong><br>`;
            html += `<span style="color:#E53935;font-weight:600;">${result.label} = {${mStr || '∅'}}</span><br>`;
            html += `<em>Cardinalidad:</em> <strong>${result.cardinality}</strong><br>`;
            html += `<em>Pareamiento Máximo:</em> <strong>${result.isMaximum ? 'Sí' : 'No'}</strong><br>`;
            html += `<em>Pareamiento Maximal:</em> <strong>${result.isMaximal ? 'Sí' : 'No'}</strong><br>`;
            html += `<em>Vértices Saturados:</em> {${saturatedStr || '∅'}}<br>`;
            html += `<em>Vértices Libres:</em> {${freeStr}}<br>`;
            html += `<em>Pareamiento Perfecto:</em> <strong>${result.isPerfect ? 'Sí' : 'No'}</strong><br>`;
            html += `<em>Pareamiento Óptimo:</em> <strong>${result.isOptimal ? 'Sí' : 'No'}</strong>`;
            detailEl.innerHTML = html;
            detailEl.style.color = 'var(--text-primary)';
            detailEl.style.fontStyle = 'normal';
        }
    }

    _buildInteractiveSetsHTML(sets, isEdge, type, itemClass, listId) {
        if (!sets || sets.length === 0) return `<div style="padding:6px 10px;font-style:italic;color:#999;font-size:0.8rem;">No se encontraron conjuntos.</div>`;

        let html = `<div style="font-family:Consolas,monospace;font-size:0.82rem;line-height:1.7;max-height:260px;overflow-y:auto;padding:4px 0;">`;
        for (let i = 0; i < sets.length; i++) {
            const set = sets[i];
            let setStr = '';
            let cardinality = 0;
            if (isEdge) {
                setStr = set.map(e => `${e.from}–${e.to}`).join(', ');
                cardinality = set.length;
            } else {
                setStr = set.join(', ');
                cardinality = set.length;
            }

            const label = isEdge ? `A<sub>${i + 1}</sub>` : (type === 'dominating' ? `S'<sub>${i + 1}</sub>` : (type === 'connected_dominating' ? `S'<sub>c,${i + 1}</sub>` : (type === 'connected' ? `C<sub>${i + 1}</sub>` : `S<sub>${i + 1}</sub>`)));

            html += `<div class="${itemClass}" data-idx="${i}" data-list-id="${listId}" `;
            html += `style="padding:4px 10px;cursor:pointer;border-radius:3px;transition:background 0.15s;" `;
            html += `onmouseover="this.style.background='rgba(43,87,154,0.10)'" `;
            html += `onmouseout="if(!this.classList.contains('set-selected'))this.style.background='transparent'">`;
            html += `${label} = {${setStr || '∅'}}`;
            html += `</div>`;
        }
        html += `</div>`;
        return html;
    }

    _bindInteractiveSetClicks(itemClass, isEdge, type, graphSource, graph) {
        const self = this;
        document.querySelectorAll('.' + itemClass).forEach(el => {
            el.addEventListener('click', function () {
                const idx = parseInt(this.dataset.idx);
                const listId = this.dataset.listId;
                const sets = self._currentSetsData[listId];
                if (!sets || !sets[idx]) return;

                const selectedSet = sets[idx];

                // Visual selection state
                document.querySelectorAll('.' + itemClass).forEach(item => {
                    item.classList.remove('set-selected');
                    item.style.background = 'transparent';
                });
                this.classList.add('set-selected');
                this.style.background = 'rgba(229,57,53,0.12)';

                // Highlight on graph
                const isEdgeList = (listId === 'all_edge_indep' || listId === 'max_edge_indep' || listId === 'maximal_edge_indep');
                if (isEdgeList) {
                    self._onSelectSet(graphSource, graph, null, selectedSet, type);
                } else {
                    let setType = type;
                    if (listId && listId.includes('conn_dominating')) {
                        setType = 'connected_dominating';
                    }
                    self._onSelectSet(graphSource, graph, selectedSet, null, setType);
                }
            });
        });
    }

    _onSelectSet(src, graph, vertexSet, edgeSet, type) {
        // Clear all previous highlight states
        this._coloringVertexColors = {};
        this._coloringEdgeColors = {};
        this._resultHighlightVertices = {};
        this._resultHighlightEdges = {};
        this._coloringSource = src;

        const hlV = {};
        const hlE = {};

        // Highlight color
        const color = '#E53935'; // Red

        if (vertexSet) {
            for (const v of vertexSet) {
                hlV[v] = color;
            }
        }

        if (edgeSet) {
            for (const e of edgeSet) {
                const key = [e.from, e.to].sort().join('-');
                hlE[key] = color;
                hlE[`eid:${e.id}`] = color;
            }
        }

        // Special handling based on type
        if (type === 'dominating' && vertexSet) {
            // Color edges incident to dominating vertices
            for (const e of graph.edges) {
                if (vertexSet.includes(e.from) || vertexSet.includes(e.to)) {
                    const key = [e.from, e.to].sort().join('-');
                    hlE[key] = '#43A047';
                    hlE[`eid:${e.id}`] = '#43A047';
                }
            }
        } else if (type === 'connected' && vertexSet) {
            // Color edges that connect vertices within the subset
            const vSet = new Set(vertexSet);
            for (const e of graph.edges) {
                if (vSet.has(e.from) && vSet.has(e.to)) {
                    const key = [e.from, e.to].sort().join('-');
                    hlE[key] = '#43A047';
                    hlE[`eid:${e.id}`] = '#43A047';
                }
            }
        } else if (type === 'connected_dominating' && vertexSet) {
            // Color edges incident to dominating vertices (dominance)
            for (const e of graph.edges) {
                if (vertexSet.includes(e.from) || vertexSet.includes(e.to)) {
                    const key = [e.from, e.to].sort().join('-');
                    hlE[key] = '#43A047';
                    hlE[`eid:${e.id}`] = '#43A047';
                }
            }
        }

        // Set highlights in state
        if (src === 'g1' || src === 'g2') {
            this._coloringVertexColors = hlV;
            this._coloringEdgeColors = hlE;
        } else {
            this._resultHighlightVertices = hlV;
            this._resultHighlightEdges = hlE;
        }

        this._drawAll();
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
                    const edgeStrs = g.edges.map(e => { const w = (e.weight !== null && e.weight !== undefined) ? e.weight : 1; return `${e.from}–${e.to}:${w}`; });
                    const aStr = edgeStrs.join(', ');
                    const totalW = g.edges.reduce((s, e) => s + ((e.weight !== null && e.weight !== undefined) ? e.weight : 1), 0);
                    const dL = isTree ? `S<sub>${lbl}</sub>` : 'S';
                    const aL = isTree ? `A<sub>${lbl}</sub>` : 'A';
                    const gDef = isTree ? `T<sub>${lbl}</sub>` : lbl;
                    html += `<div style="margin-bottom:10px;padding:8px;background:rgba(43,87,154,0.04);border-radius:4px;">`;
                    html += `<div style="font-family:Consolas,monospace;font-size:0.83rem;line-height:1.9;">`;
                    html += `<strong>${g.name || gDef} = (${dL}, ${aL})</strong><br>`;
                    html += `${dL} = {${vStr || '∅'}}<br>${aL} = {${aStr || '∅'}}`;
                    if (g.edges.length > 0) html += `<br><span style="color:var(--accent-primary);font-weight:600;">Peso: ${totalW}</span>`;
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
        const srcPositions = sourceGraph.getVertexPositions(300, 200);
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
        } else {
            const hlV = this._coloringSource === 'g1' ? this._coloringVertexColors : {};
            const hlE = this._coloringSource === 'g1' ? this._coloringEdgeColors : {};
            this._drawGraph(this.el.canvasG1, this.g1, this._cam1, hlV, hlE);
        }
    }
    _redrawG2() {
        if (this._distModeActive && this._distStepsG2.length > 0) {
            const s = this._distStepsG2[this._distStepIdxG2];
            this._drawGraph(this.el.canvasG2, s.graph, this._cam2, s.hlVertices || {}, s.hlEdges || {});
        } else {
            const hlV = this._coloringSource === 'g2' ? this._coloringVertexColors : {};
            const hlE = this._coloringSource === 'g2' ? this._coloringEdgeColors : {};
            this._drawGraph(this.el.canvasG2, this.g2, this._cam2, hlV, hlE);
        }
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

        const modeToAlgo = {
            'operaciones': 'grafos-operaciones',
            'arboles': 'arboles-grafos',
            'matrices': 'calculo-matrices',
            'coloreado': 'coloreado-grafos',
            'conjuntos': 'conjuntos-dom-indep',
            'matching': 'matching-grafos'
        };

        const data = {
            algorithm: modeToAlgo[this._mode] || 'grafos',
            timestamp: new Date().toISOString(),
            structure: {
                g1: this.g1.created ? this.g1.toJSON() : null,
                g2: this.g2.created ? this.g2.toJSON() : null,
                result: this.gResult ? this.gResult.toJSON() : null,
                opLogMessages: this.opLogMessages
            }
        };
        await FileManager.saveJSON(JSON.stringify(data, null, 2), `grafos_${this._mode}_${Date.now()}.json`);
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
                const positions = graph.getVertexPositions(300, 200);
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
                const worldY = (e.clientY - rect.top - cam.offsetY) / cam.scale;
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
        const positions = graph.getVertexPositions(300, 200);
        const posArr = Object.values(positions);
        const r = this._nodeRadiusFor(graph);
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        for (const p of posArr) { minX = Math.min(minX, p.x - r); maxX = Math.max(maxX, p.x + r); minY = Math.min(minY, p.y - r); maxY = Math.max(maxY, p.y + r); }
        const pad = 40;
        const sx = canvas.width / (maxX - minX + pad * 2);
        const sy = canvas.height / (maxY - minY + pad * 2);
        cam.scale = Math.min(sx, sy, 2);
        cam.offsetX = canvas.width / 2 - ((minX + maxX) / 2) * cam.scale;
        cam.offsetY = canvas.height / 2 - ((minY + maxY) / 2) * cam.scale;
    }

    _resizeAllCanvas() {
        [
            [this.el.canvasG1, this.el.wrapG1],
            [this.el.canvasG2, this.el.wrapG2],
            [this.el.canvasResult, this.el.wrapResult],
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
        const positions = graph.getVertexPositions(300, 200);
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
            this._drawEdge(ctx, e, p1, p2, graph.directed, r, e.from === e.to, curvature, hlEdges[`eid:${e.id}`] || hlEdges[key] || null);
        }
        for (const v of graph.vertices) {
            const p = positions[v]; if (!p) continue;
            this._drawVertex(ctx, v, p.x, p.y, r, hlVertices[v] || null);
        }
        ctx.restore();
    }

    _drawEdge(ctx, edge, p1, p2, directed, r, isSelf, curvature, hlColor) {
        const color = hlColor || '#8494AB';
        // Detect ghost color (rgba with very low alpha) for cut-set edges
        const isGhost = hlColor && hlColor.startsWith('rgba') && parseFloat(hlColor.split(',')[3]) < 0.4;
        ctx.strokeStyle = color;
        ctx.lineWidth = isGhost ? 1 : (hlColor ? 2.5 : 1.5);
        if (isGhost) ctx.setLineDash([5, 5]); else ctx.setLineDash([]);
        let sx, sy, ex, ey, midX, midY, ux = 0, uy = 0;
        let arrowUx = 0, arrowUy = 0;
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
                // Arrow direction at end of curve
                arrowUx = ex - cpX; arrowUy = ey - cpY;
                const alen = Math.sqrt(arrowUx * arrowUx + arrowUy * arrowUy);
                if (alen > 0) { arrowUx /= alen; arrowUy /= alen; }
            } else {
                ctx.moveTo(sx, sy); ctx.lineTo(ex, ey);
                midX = (sx + ex) / 2; midY = (sy + ey) / 2;
                arrowUx = ux; arrowUy = uy;
            }
            ctx.stroke();
            // Draw arrowhead for directed
            if (directed && !isSelf) {
                const aSize = 9;
                const ax = ex, ay = ey;
                const perpX = -arrowUy, perpY = arrowUx;
                ctx.beginPath();
                ctx.moveTo(ax, ay);
                ctx.lineTo(ax - arrowUx * aSize + perpX * aSize * 0.4, ay - arrowUy * aSize + perpY * aSize * 0.4);
                ctx.lineTo(ax - arrowUx * aSize - perpX * aSize * 0.4, ay - arrowUy * aSize - perpY * aSize * 0.4);
                ctx.closePath();
                ctx.fillStyle = color;
                ctx.fill();
            }
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
        // Always restore line dash so subsequent edges are not affected
        ctx.setLineDash([]);
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
        try {
            if (hex.startsWith('hsl')) {
                const m = hex.match(/hsl\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%\s*\)/);
                return m ? parseFloat(m[3]) > 55 : true;
            }
            const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
            return (r * 0.299 + g * 0.587 + b * 0.114) > 155;
        }
        catch { return true; }
    }

    _darkenColor(hex) {
        try {
            if (hex.startsWith('hsl')) {
                const m = hex.match(/hsl\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%\s*\)/);
                if (m) return `hsl(${m[1]}, ${m[2]}%, ${Math.max(0, parseFloat(m[3]) - 15)}%)`;
                return '#1B3A6B';
            }
            const r = Math.max(0, parseInt(hex.slice(1, 3), 16) - 40), g = Math.max(0, parseInt(hex.slice(3, 5), 16) - 40), b = Math.max(0, parseInt(hex.slice(5, 7), 16) - 40);
            return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
        }
        catch { return '#1B3A6B'; }
    }
}
