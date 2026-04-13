/**
 * @class GrafosView
 * @description Gestiona la interfaz de usuario y la visualización interactiva de la sección de Grafos.
 * Permite la creación y edición de grafos G1 y G2, ejecución de operaciones lógicas
 * y visualización interactiva (arrastre, zoom y maximización) en tres canvas.
 * 
 * @param {HTMLElement} containerEl - Contenedor principal de la aplicación.
 */
class GrafosView {
    constructor(containerEl) {
        this.container = containerEl;

        /** @type {GraphModel} - Instancia del Grafo 1 */
        this.g1 = new GraphModel();
        /** @type {GraphModel} - Instancia del Grafo 2 */
        this.g2 = new GraphModel();
        /** @type {GraphModel|null} - Grafo resultante de una operación */
        this.gResult = null;

        /** @type {Object} - Guardado de referencias a elementos del DOM */
        this.el = {};

        /** @type {Array} - Mensajes de actualización visual */
        this.logMessages = [];
        /** @type {Array} - Pasos formales de las operaciones */
        this.opLogMessages = [];
        this._lastOperation = null;

        // Estados de cámara (pan/zoom) independientes para cada canvas
        this._cam1 = this._newCam();
        this._cam2 = this._newCam();
        this._camR = this._newCam();

        // Radio base para los nodos de los grafos
        this._nodeRadius = 20;

        /** @type {string} - Indica cuál grafo se está editando actualmente (g1 o g2) */
        this._activeGraph = 'g1';
        this._directed = false;

        // Modos de arrastre manual e interfaz
        this._dragModeG1 = false;
        this._dragModeG2 = false;
        this._dragModeR = false;
        this._maximizedCanvas = null; // 'g1', 'g2', 'result' o null
        this._draggingNode = null; // { graph: GraphModel, vertex: string }
    }

    // ─── Cámara ───────────────────────────────────────────────────────────────

    /**
     * Genera un objeto de estado de cámara predeterminado.
     * @returns {Object} - Estado con offset, escala y variables de paneo.
     * @private
     */
    _newCam() {
        return { offsetX: 0, offsetY: 0, scale: 1, isPanning: false, startX: 0, startY: 0 };
    }

    // ─── Render ───────────────────────────────────────────────────────────────

    /**
     * Inicializa y muestra la vista de grafos en el contenedor.
     * Configura el HTML base, captura elementos y enlaza eventos.
     */
    show() {
        this.container.innerHTML = '';
        this.container.classList.remove('hidden');

        const welcome = document.getElementById('welcome-screen');
        if (welcome) welcome.classList.add('hidden');

        this._inputGraphsCollapsed = false;

        this.container.innerHTML = `
            <div class="algo-title">Grafos — Operaciones entre Grafos</div>

            <div class="grafos-layout">

                <!-- ── Panel Izquierdo ── -->
                <div class="grafos-left-panel">

                    <!-- Bloque 1: Entrada de datos -->
                    <div class="section-block">
                        <div class="section-title">Definición de Grafos</div>
                        <div class="grafos-input-panel">

                            <!-- Selector de grafo activo -->
                            <div class="grafos-field-row">
                                <label>Grafo a editar</label>
                                <div class="grafos-graph-selector">
                                    <button class="grafos-tab-btn active" id="tab-g1" data-target="g1">G1</button>
                                    <button class="grafos-tab-btn" id="tab-g2" data-target="g2">G2</button>
                                </div>
                            </div>

                            <!-- Vértices Dinámicos -->
                            <div class="grafos-field-col">
                                <label>Vértices</label>
                                <div class="grafos-vertex-input-row">
                                    <input type="text" id="grafos-input-vertex" placeholder="Ej: A, B, C... Enter para añadir">
                                    <button class="btn btn-primary" id="grafos-add-vertex-btn" style="min-width: 40px; justify-content: center;">+</button>
                                </div>
                                <div class="grafos-vertex-chips" id="grafos-vertex-list">
                                    <!-- Chips de vértices renderizados aquí -->
                                </div>
                            </div>

                            <!-- Aristas Dinámicas -->
                            <div class="grafos-field-col" style="margin-top: 5px;">
                                <label>Aristas</label>
                                <div class="grafos-edge-input-row">
                                    <select id="grafos-edge-from"><option value="">--</option></select>
                                    <span>—</span>
                                    <select id="grafos-edge-to"><option value="">--</option></select>
                                    <button class="btn btn-primary" id="grafos-add-edge-btn" style="min-width: 40px; justify-content: center;">+</button>
                                </div>
                                <div class="grafos-edge-list" id="grafos-edge-list">
                                    <!-- Render list of edges -->
                                </div>
                            </div>

                            <!-- Botones -->
                            <div class="grafos-btn-row">
                                <button class="btn btn-primary" id="grafos-btn-create" title="Sincronizar modelo actual con UI">CREAR</button>
                                <button class="btn btn-secondary" id="grafos-btn-clear-graph">LIMPIAR</button>
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
                                </select>
                                
                                <div id="grafos-op-unary-params" style="margin-top: 8px;">
                                    <!-- Parámetros para edición -->
                                </div>
                            </div>

                            <button class="btn btn-primary grafos-btn-full" id="grafos-btn-execute">Calcular Operación</button>
                        </div>
                    </div>

                    <!-- Bloque 3: Mensajes (Actualizaciones visuales) -->
                    <div class="section-block grafos-log-section">
                        <div class="section-title">Mensajes y Resultados</div>
                        <div class="tree-log-content" id="grafos-update-content" style="height: 120px;"></div>
                    </div>

                </div>

                <!-- ── Área de Canvas Centro ── -->
                <div class="grafos-canvas-area">
                    <div class="grafos-top-row" id="grafos-top-row">
                        <div class="grafos-canvas-wrapper" id="grafos-wrap-g1">
                            <div class="grafos-canvas-label">Grafo 1 (G1)</div>
                            <canvas id="grafos-canvas-g1"></canvas>
                            <button class="tree-fit-btn expand-btn" id="grafos-expand-g1" title="Maximizar vista G1">⛶</button>
                            <button class="tree-fit-btn drag-toggle-btn" id="grafos-drag-g1" title="Mover nodos de G1">✥</button>
                            <button class="tree-fit-btn" id="grafos-fit-g1" title="Ajustar vista G1">⊞</button>
                        </div>
                        <div class="grafos-canvas-wrapper" id="grafos-wrap-g2">
                            <div class="grafos-canvas-label">Grafo 2 (G2)</div>
                            <canvas id="grafos-canvas-g2"></canvas>
                            <button class="tree-fit-btn expand-btn" id="grafos-expand-g2" title="Maximizar vista G2">⛶</button>
                            <button class="tree-fit-btn drag-toggle-btn" id="grafos-drag-g2" title="Mover nodos de G2">✥</button>
                            <button class="tree-fit-btn" id="grafos-fit-g2" title="Ajustar vista G2">⊞</button>
                        </div>
                    </div>

                    <div class="grafos-result-row" id="grafos-result-row">
                        <div class="grafos-canvas-wrapper grafos-result-canvas" id="grafos-wrap-result">
                            <div class="grafos-canvas-label" id="grafos-result-label">Resultado</div>
                            <canvas id="grafos-canvas-result"></canvas>
                            <button class="tree-fit-btn expand-btn" id="grafos-expand-result" title="Maximizar vista Resultado">⛶</button>
                            <button class="tree-fit-btn drag-toggle-btn" id="grafos-drag-result" title="Mover nodos de Resultado">✥</button>
                            <button class="tree-fit-btn" id="grafos-fit-result" title="Ajustar vista Resultado">⊞</button>
                        </div>
                    </div>
                </div>

                <!-- ── Panel Derecho (Operaciones de la estructura) ── -->
                <div class="grafos-right-panel">
                    <div class="section-block">
                        <div class="section-title">Operaciones de la Estructura</div>
                        <div class="tree-log-content" id="grafos-op-content" style="height: 100%;">
                            <div class="huffman-empty-msg">Ejecute una operación para ver los pasos formales de G1 y G2 aquí.</div>
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
        // Inicializa con grafos vacíos pero creados
        this.g1.create([], []);
        this.g2.create([], []);
    }

    /**
     * Captura las referencias a los elementos del DOM necesarios para la interacción.
     * @private
     */
    _cacheElements() {
        this.el = {
            tabG1: document.getElementById('tab-g1'),
            tabG2: document.getElementById('tab-g2'),
            inputVertex: document.getElementById('grafos-input-vertex'),
            addVertexBtn: document.getElementById('grafos-add-vertex-btn'),
            vertexList: document.getElementById('grafos-vertex-list'),
            edgeFrom: document.getElementById('grafos-edge-from'),
            edgeTo: document.getElementById('grafos-edge-to'),
            addEdgeBtn: document.getElementById('grafos-add-edge-btn'),
            edgeList: document.getElementById('grafos-edge-list'),
            btnCreate: document.getElementById('grafos-btn-create'),
            btnClearGraph: document.getElementById('grafos-btn-clear-graph'),
            btnLoadFile: document.getElementById('grafos-btn-load-file'),
            opTypeSelect: document.getElementById('grafos-op-type'),
            opBinaryCol: document.getElementById('grafos-op-binary-col'),
            opUnaryCol: document.getElementById('grafos-op-unary-col'),
            opSelect: document.getElementById('grafos-op-select'),
            opUnarySelect: document.getElementById('grafos-op-unary-select'),
            opUnaryParams: document.getElementById('grafos-op-unary-params'),
            btnExecute: document.getElementById('grafos-btn-execute'),
            logContent: document.getElementById('grafos-update-content'),
            opContent: document.getElementById('grafos-op-content'),
            btnSave: document.getElementById('grafos-btn-save'),
            btnPrint: document.getElementById('grafos-btn-print'),
            canvasG1: document.getElementById('grafos-canvas-g1'),
            canvasG2: document.getElementById('grafos-canvas-g2'),
            canvasResult: document.getElementById('grafos-canvas-result'),
            fitG1: document.getElementById('grafos-fit-g1'),
            fitG2: document.getElementById('grafos-fit-g2'),
            fitResult: document.getElementById('grafos-fit-result'),
            resultLabel: document.getElementById('grafos-result-label'),
            topRow: document.getElementById('grafos-top-row'),
            resultRow: document.getElementById('grafos-result-row'),
            dragG1: document.getElementById('grafos-drag-g1'),
            dragG2: document.getElementById('grafos-drag-g2'),
            dragResult: document.getElementById('grafos-drag-result'),
            expandG1: document.getElementById('grafos-expand-g1'),
            expandG2: document.getElementById('grafos-expand-g2'),
            expandResult: document.getElementById('grafos-expand-result'),
            wrapG1: document.getElementById('grafos-wrap-g1'),
            wrapG2: document.getElementById('grafos-wrap-g2'),
            wrapResult: document.getElementById('grafos-wrap-result')
        };
    }

    /**
     * Enlaza los eventos de usuario (clicks, teclados, observers) a sus controladores.
     * @private
     */
    _bindEvents() {
        const el = this.el;

        el.tabG1.addEventListener('click', () => this._switchTab('g1'));
        el.tabG2.addEventListener('click', () => this._switchTab('g2'));

        // Manejo de Vértices
        el.addVertexBtn.addEventListener('click', () => this._handleAddVertex());
        el.inputVertex.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this._handleAddVertex();
        });

        // Manejo de Aristas
        el.addEdgeBtn.addEventListener('click', () => this._handleAddEdge());

        // Operaciones y Botones
        el.btnCreate.addEventListener('click', () => this._onCreate());
        el.btnClearGraph.addEventListener('click', () => this._onClearGraph());
        el.btnLoadFile.addEventListener('click', () => this._onLoadFile());
        el.btnExecute.addEventListener('click', () => this._onExecute());
        el.btnSave.addEventListener('click', () => this._onSave());
        el.btnPrint.addEventListener('click', () => window.print());

        // UI de Operaciones Unarias/Binarias
        el.opTypeSelect.addEventListener('change', () => this._updateOpUI());
        el.opUnarySelect.addEventListener('change', () => this._updateOpUnaryParamsUI());

        // Canvas pan/zoom y drag
        this._bindCanvasPanZoom(el.canvasG1, () => this.g1, this._cam1, () => this._dragModeG1, () => this._drawGraph(el.canvasG1, this.g1, this._cam1));
        this._bindCanvasPanZoom(el.canvasG2, () => this.g2, this._cam2, () => this._dragModeG2, () => this._drawGraph(el.canvasG2, this.g2, this._cam2));
        this._bindCanvasPanZoom(el.canvasResult, () => this.gResult, this._camR, () => this._dragModeR, () => this._drawGraph(el.canvasResult, this.gResult, this._camR));

        el.fitG1.addEventListener('click', () => { this._fitGraph(el.canvasG1, this.g1, this._cam1); this._drawGraph(el.canvasG1, this.g1, this._cam1); });
        el.fitG2.addEventListener('click', () => { this._fitGraph(el.canvasG2, this.g2, this._cam2); this._drawGraph(el.canvasG2, this.g2, this._cam2); });
        el.fitResult.addEventListener('click', () => { if (this.gResult) { this._fitGraph(el.canvasResult, this.gResult, this._camR); this._drawGraph(el.canvasResult, this.gResult, this._camR); } });

        el.dragG1.addEventListener('click', () => this._toggleDragMode('g1'));
        el.dragG2.addEventListener('click', () => this._toggleDragMode('g2'));
        el.dragResult.addEventListener('click', () => this._toggleDragMode('result'));

        el.expandG1.addEventListener('click', () => this._toggleMaximize('g1'));
        el.expandG2.addEventListener('click', () => this._toggleMaximize('g2'));
        el.expandResult.addEventListener('click', () => this._toggleMaximize('result'));

        // ResizeObserver para canvas
        this._ro = new ResizeObserver(() => {
            this._resizeAllCanvas();
            this._drawAll();
        });
        [el.canvasG1, el.canvasG2, el.canvasResult].forEach(c => this._ro.observe(c.parentElement));
    }

    /**
     * Alterna el modo de arrastre manual para un contenedor de grafo.
     * Cuando está activo, se permite mover nodos con el ratón.
     * @param {string} canvasKey - Identificador del canvas ('g1', 'g2' o 'result').
     * @private
     */
    _toggleDragMode(canvasKey) {
        if (canvasKey === 'g1') {
            this._dragModeG1 = !this._dragModeG1;
            this.el.dragG1.classList.toggle('active', this._dragModeG1);
        } else if (canvasKey === 'g2') {
            this._dragModeG2 = !this._dragModeG2;
            this.el.dragG2.classList.toggle('active', this._dragModeG2);
        } else if (canvasKey === 'result') {
            this._dragModeR = !this._dragModeR;
            this.el.dragResult.classList.toggle('active', this._dragModeR);
        }
    }

    /**
     * Controla la expansión visual de un canvas para ocupar todo el espacio central.
     * Aplica clases CSS para ocultar otros paneles y redimensiona el canvas.
     * @param {string} target - El grafo objetivo ('g1', 'g2' o 'result').
     * @private
     */
    _toggleMaximize(target) {
        if (this._maximizedCanvas === target) {
            this._maximizedCanvas = null;
        } else {
            this._maximizedCanvas = target;
        }

        // Limpiar estados previos
        [this.el.topRow, this.el.resultRow].forEach(r => {
            r.classList.remove('grafos-hidden-max');
            r.classList.remove('grafos-full-row');
        });
        [this.el.wrapG1, this.el.wrapG2, this.el.wrapResult].forEach(w => w.classList.remove('grafos-hidden-max'));
        [this.el.expandG1, this.el.expandG2, this.el.expandResult].forEach(b => b.classList.remove('active'));

        // Aplicar lógica de expansión total
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

        // Forzar redimensionado interno de los canvas
        this._resizeAllCanvas();

        // Auto-Ajustar vista automáticamente (Auto-Fit) con retardo para esperar la animación de CSS
        const applyFitArr = () => {
            if (this._maximizedCanvas === 'g1') {
                this._fitGraph(this.el.canvasG1, this.g1, this._cam1);
            } else if (this._maximizedCanvas === 'g2') {
                this._fitGraph(this.el.canvasG2, this.g2, this._cam2);
            } else if (this._maximizedCanvas === 'result') {
                if (this.gResult) this._fitGraph(this.el.canvasResult, this.gResult, this._camR);
            } else {
                // Si volvemos a la vista normal, reajustamos todos
                this._fitGraph(this.el.canvasG1, this.g1, this._cam1);
                this._fitGraph(this.el.canvasG2, this.g2, this._cam2);
                if (this.gResult) this._fitGraph(this.el.canvasResult, this.gResult, this._camR);
            }
            this._drawAll();
        };

        // Primera llamada inmediata (aproximada)
        applyFitArr();
        // Segunda llamada tras terminar transición CSS (clase .grafos-full-row)
        setTimeout(applyFitArr, 150);
    }

    /** @returns {GraphModel} - Retorna la instancia del grafo visualizado actualmente en el panel de edición. */
    _getActiveGraph() { return this._activeGraph === 'g1' ? this.g1 : this.g2; }

    /** @returns {string} - Retorna la etiqueta ('G1' o 'G2') del grafo activo. */
    _getActiveGraphLabel() { return this._activeGraph === 'g1' ? 'G1' : 'G2'; }

    // ─── UI Sincronización y Dinámica ──────────────────────────────────────────

    /**
     * Cambia entre las pestañas de edición de G1 y G2.
     * @param {string} target - 'g1' o 'g2'.
     * @private
     */
    _switchTab(target) {
        this._activeGraph = target;
        this.el.tabG1.classList.toggle('active', target === 'g1');
        this.el.tabG2.classList.toggle('active', target === 'g2');
        this._syncUI();
        this._updateOpUnaryParamsUI();
    }

    /**
     * Sincroniza la interfaz de usuario (chips de vértices, selectores y lista de aristas)
     * con el estado actual del modelo del grafo activo.
     * @private
     */
    _syncUI() {
        const g = this._getActiveGraph();

        // Renderizar chips de vértices
        this.el.vertexList.innerHTML = '';
        g.vertices.forEach(v => {
            const chip = document.createElement('div');
            chip.className = 'grafos-vertex-chip';
            chip.innerHTML = `<span>${v}</span><button data-v="${v}">×</button>`;
            chip.querySelector('button').addEventListener('click', (e) => this._handleRemoveVertex(e.currentTarget.getAttribute('data-v')));
            this.el.vertexList.appendChild(chip);
        });

        // Actualizar dropdowns para la creación de nuevas aristas
        this.el.edgeFrom.innerHTML = '<option value="">--</option>';
        this.el.edgeTo.innerHTML = '<option value="">--</option>';
        g.vertices.forEach(v => {
            this.el.edgeFrom.add(new Option(v, v));
            this.el.edgeTo.add(new Option(v, v));
        });

        // Renderizar lista interactiva de aristas
        this.el.edgeList.innerHTML = '';
        g.edges.forEach(edge => {
            const row = document.createElement('div');
            row.className = 'grafos-edge-item';
            row.innerHTML = `<span class="grafos-edge-id">${edge.id})</span> ${edge.from} — ${edge.to}
                             <button class="edge-remove" data-id="${edge.id}">×</button>`;
            row.querySelector('.edge-remove').addEventListener('click', (e) => this._handleRemoveEdge(e.currentTarget.getAttribute('data-id')));
            this.el.edgeList.appendChild(row);
        });

        this._updateOpUnaryParamsUI();
    }

    /**
     * Actualiza la UI de operaciones según el tipo (binario o unario) seleccionado.
     * @private
     */
    _updateOpUI() {
        const type = this.el.opTypeSelect.value;
        if (type === 'binary') {
            this.el.opBinaryCol.classList.remove('hidden');
            this.el.opUnaryCol.classList.add('hidden');
        } else {
            this.el.opBinaryCol.classList.add('hidden');
            this.el.opUnaryCol.classList.remove('hidden');
            this._updateOpUnaryParamsUI();
        }
    }

    /**
     * Actualiza dinámicamente los menús desplegables (V1, V2, Aristas) 
     * para las operaciones unarias basándose en los datos del grafo.
     * @private
     */
    _updateOpUnaryParamsUI() {
        const g = this._getActiveGraph();
        const action = this.el.opUnarySelect.value;
        const container = this.el.opUnaryParams;
        container.innerHTML = ''; // Limpiar

        if (action === 'mergeVertices') {
            const help = document.createElement('div');
            help.style.fontSize = '0.75rem'; help.style.color = '#555'; help.style.marginBottom = '5px';
            help.textContent = 'Seleccione V1 (al que se moverán las conexiones) y V2 (el que desaparecerá):';
            container.appendChild(help);

            const sel1 = document.createElement('select'); sel1.id = 'unary-param-v1'; sel1.className = 'unary-select-inline';
            const sel2 = document.createElement('select'); sel2.id = 'unary-param-v2'; sel2.className = 'unary-select-inline';
            sel1.innerHTML = '<option value="">V1</option>'; sel2.innerHTML = '<option value="">V2</option>';
            g.vertices.forEach(v => { sel1.add(new Option(v, v)); sel2.add(new Option(v, v)); });

            const row = document.createElement('div');
            row.style.display = 'flex'; row.style.gap = '8px';
            row.appendChild(sel1); row.appendChild(sel2);
            container.appendChild(row);
        } else if (action === 'contractEdge') {
            const sel = document.createElement('select'); sel.id = 'unary-param-edge'; sel.style.width = '100%';
            sel.innerHTML = '<option value="">Seleccione Arista (ID)</option>';
            g.edges.forEach(e => {
                sel.add(new Option(`${e.id}) ${e.from}-${e.to}`, e.id));
            });
            container.appendChild(sel);
        }
    }

    // ─── Input Handlers (Operaciones Directas) ───────────────────────────────

    /**
     * Procesa la adición de un nuevo vértice desde el panel lateral.
     * Valida la entrada y actualiza tanto el modelo como la vista.
     * @private
     */
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
            this._syncUI();
            this._refreshActiveCanvas();
            this._autoUpdateResult();
        }
    }

    /**
     * Elimina un vértice previa confirmación del usuario.
     * @param {string} v - Nombre del vértice.
     * @private
     */
    async _handleRemoveVertex(v) {
        const g = this._getActiveGraph();
        const confirmed = await Validation.confirm(`¿Eliminar vértice ${v} y todas sus aristas en ${this._getActiveGraphLabel()}?`);
        if (!confirmed) return;

        const res = g.removeVertex(v);
        if (res.success) {
            this._addUpdateLog(`Vértice ${v} eliminado de ${this._getActiveGraphLabel()}.`, 'info');
            if (g.vertices.length === 0) g.created = false;
            this._syncUI();
            this._refreshActiveCanvas();
            this._autoUpdateResult();
        } else {
            Validation.showError(res.error);
        }
    }

    /**
     * Procesa la creación de una nueva arista entre dos vértices.
     * @private
     */
    _handleAddEdge() {
        const g = this._getActiveGraph();
        const from = this.el.edgeFrom.value;
        const to = this.el.edgeTo.value;

        if (!from || !to) { Validation.showError('Seleccione origen y destino.'); return; }
        // Se omitió the weight input at UI so we pass null implicitly
        const res = g.addEdge(from, to, null);
        if (res.success) {
            this.el.edgeFrom.value = '';
            this.el.edgeTo.value = '';
            this._addUpdateLog(`Arista añadida a ${this._getActiveGraphLabel()}.`, 'success');
            this._syncUI();
            this._refreshActiveCanvas();
            this._autoUpdateResult();
        } else {
            Validation.showError(res.error);
        }
    }

    /**
     * Elimina una arista del modelo por su ID.
     * @param {string} id - Código identificador de la arista (ej: 'a').
     * @private
     */
    async _handleRemoveEdge(id) {
        const g = this._getActiveGraph();
        const confirmed = await Validation.confirm(`¿Eliminar arista ${id} de ${this._getActiveGraphLabel()}?`);
        if (!confirmed) return;

        const res = g.removeEdge(id);
        if (res.success) {
            this._addUpdateLog(`Arista eliminada de ${this._getActiveGraphLabel()}.`, 'info');
            this._syncUI();
            this._refreshActiveCanvas();
            this._autoUpdateResult();
        } else {
            Validation.showError(res.error);
        }
    }

    // ─── Botones Principales ──────────────────────────────────────────────────

    /**
     * Ejecuta la creación del grafo completo e informa del estado actual en el log.
     * Se activa al pulsar el botón "CREAR".
     * Muestra el estado formal (tabla) en el panel derecho.
     * @private
     */
    _onCreate() {
        const g = this._getActiveGraph();
        const label = this._getActiveGraphLabel();
        if (!g.created || g.vertices.length === 0) {
            Validation.showError(`El grafo ${label} no tiene vértices.`);
            return;
        }

        // Mostrar resumen en el panel de operaciones de la derecha
        this.el.opContent.innerHTML = '';
        this.opLogMessages = [];
        const tableHtml = GraphModel._singleGraphHtmlTable(g, `ESTADO ACTUAL DE ${label}`, label, label === 'G1' ? 'A1' : 'A2');

        // Envolver en el estilo de las tarjetas de pasos
        const wrapper = document.createElement('div');
        wrapper.className = 'huffman-step-table';
        wrapper.style.marginBottom = '12px';
        wrapper.innerHTML = `
            <div class="section-title" style="font-size: 0.8rem; background: var(--bg-main); border-bottom: 1px solid var(--border-light); border-top-left-radius: 4px; border-top-right-radius: 4px;">Información de la Estructura</div>
            <div style="padding: 10px;">${tableHtml}</div>
        `;

        this.el.opContent.appendChild(wrapper);

        this._addUpdateLog(`${label} actualizado: ${g.vertices.length} vértice(s), ${g.edges.length} arista(s).`, 'success');
        this._refreshActiveCanvas();
    }

    async _onClearGraph() {
        const g = this._getActiveGraph();
        if (g.created) {
            const confirmed = await Validation.confirm(`Se limpiará completamente ${this._getActiveGraphLabel()}. ¿Continuar?`);
            if (!confirmed) return;
        }
        g.reset();
        this._invalidateResult();
        this._lastBinaryOp = null;
        this._syncUI();
        this._refreshActiveCanvas();
        this._addUpdateLog(`${this._getActiveGraphLabel()} limpiado.`, 'info');
    }

    async _onLoadFile() {
        const data = await new Promise((resolve) => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            input.onchange = (e) => {
                const file = e.target.files[0];
                if (!file) { resolve(null); return; }
                const reader = new FileReader();
                reader.onload = (event) => {
                    try { resolve(JSON.parse(event.target.result)); }
                    catch (err) { Validation.showError('Error al leer JSON.'); resolve(null); }
                };
                reader.readAsText(file);
            };
            input.click();
        });

        if (!data || data.algorithm !== 'grafos-operaciones') {
            if (data) Validation.showError('El archivo no corresponde a Grafos / Operaciones.');
            return;
        }

        const s = data.structure;
        if (s.g1) this.g1.fromJSON(s.g1); else this.g1.reset();
        if (s.g2) this.g2.fromJSON(s.g2); else this.g2.reset();
        if (s.result) {
            this.gResult = new GraphModel();
            this.gResult.fromJSON(s.result);
        } else {
            this.gResult = null;
        }

        // Cargar operations panel si los hay (opcionalmente)
        if (s.opLogMessages) {
            this.opLogMessages = s.opLogMessages;
            this._renderOpLogs();
        } else {
            this.el.opContent.innerHTML = '<div class="huffman-empty-msg">Ejecute una operación para ver los pasos formales de G1 y G2 aquí.</div>';
        }

        this._syncUI();
        this._addUpdateLog('Datos y estructura de grafos recuperados correctamente.', 'success');

        this._fitGraph(this.el.canvasG1, this.g1, this._cam1);
        this._fitGraph(this.el.canvasG2, this.g2, this._cam2);
        if (this.gResult) this._fitGraph(this.el.canvasResult, this.gResult, this._camR);
        this._drawAll();
    }

    // ─── Ejecutar Operaciones ─────────────────────────────────────────────────

    /**
     * Ejecuta la operación seleccionada (Binaria o Unaria). 
     * @param {boolean} [isAuto=false] - Indica si la ejecución es disparada automáticamente por cambios en los grafos de entrada.
     */
    /**
     * Orquesta la ejecución de la operación seleccionada (unión, suma, contracción, etc.)
     * y gestiona la visualización del grafo resultante.
     * @param {boolean} [isAuto=false] - Define si se disparan errores visuales.
     * @private
     */
    _onExecute(isAuto = false) {
        const isBinary = this.el.opTypeSelect.value === 'binary';

        if (isBinary) {
            if (!this.g1.created || this.g1.vertices.length === 0) { if (!isAuto) Validation.showError('G1 no está definido o está vacío.'); return; }
            if (!this.g2.created || this.g2.vertices.length === 0) { if (!isAuto) Validation.showError('G2 no está definido o está vacío.'); return; }
            const op = this.el.opSelect.value;
            if (!GraphModel[op]) { if (!isAuto) Validation.showError('Operación desconocida.'); return; }

            try {
                this.el.opContent.innerHTML = ''; // Limpiar el panel derecho con cada ejecución binaria
                this.opLogMessages = [];
                this._lastBinaryOp = op;

                const res = GraphModel[op](this.g1, this.g2);
                this.gResult = res.graph;
                this.el.resultLabel.textContent = this.gResult.name || 'Resultado';

                // Agrupar los logs y darle un formato estructurado (tablas formales)
                this._renderStyledOpLogs(res.log);

                if (!isAuto) {
                    this._addUpdateLog(`Operación ${this.gResult.name || ''} ejecutada con éxito.`, 'success');
                }

                this._fitGraph(this.el.canvasResult, this.gResult, this._camR);
                this._drawGraph(this.el.canvasResult, this.gResult, this._camR);
            } catch (e) {
                if (!isAuto) Validation.showError('Error en operación binaria: ' + e.message);
            }
        } else {
            // Operaciones Unarias (Edición en tiempo real)
            if (isAuto) return;
            const action = this.el.opUnarySelect.value;

            const g = this._getActiveGraph();
            let res;

            try {
                if (action === 'mergeVertices') {
                    const v1 = document.getElementById('unary-param-v1').value;
                    const v2 = document.getElementById('unary-param-v2').value;
                    if (!v1 || !v2) { Validation.showError('Debe seleccionar V1 y V2.'); return; }
                    res = g.mergeVertices(v1, v2);
                    if (res.success) {
                        this._addUpdateLog(`Fusión completada en ${this._getActiveGraphLabel()}.`, 'success');
                    }
                } else if (action === 'contractEdge') {
                    const edgeId = document.getElementById('unary-param-edge').value;
                    if (!edgeId) { Validation.showError('Debe seleccionar una arista.'); return; }
                    res = g.contractEdge(edgeId);
                    if (res.success) {
                        this._addUpdateLog(`Contracción completada en ${this._getActiveGraphLabel()}.`, 'success');
                    }
                }

                if (res && res.success) {
                    this._syncUI();
                    this._refreshActiveCanvas();
                    this._autoUpdateResult();
                } else if (res) {
                    Validation.showError(res.error);
                }
            } catch (e) {
                Validation.showError('Error en operación unaria: ' + e.message);
            }
        }
    }

    _invalidateResult() {
        if (this.gResult) {
            this.gResult = null;
            this.el.opContent.innerHTML = '<div class="huffman-empty-msg">Ejecute una operación para ver los pasos formales de G1 y G2 aquí.</div>';
            this.opLogMessages = [];
            this.el.resultLabel.textContent = 'Resultado';
            const ctxR = this.el.canvasResult.getContext('2d');
            ctxR.clearRect(0, 0, this.el.canvasResult.width, this.el.canvasResult.height);
        }
    }

    _autoUpdateResult() {
        if (this._lastBinaryOp && this.g1.created && this.g2.created && this.el.opTypeSelect.value === 'binary') {
            this.el.opSelect.value = this._lastBinaryOp; // ensure same op
            this._onExecute(true);
        } else {
            this._invalidateResult();
        }
    }

    /**
     * Refresca el canvas que está siendo editado actualmente por el usuario.
     * @private
     */
    _refreshActiveCanvas() {
        const canvas = this._activeGraph === 'g1' ? this.el.canvasG1 : this.el.canvasG2;
        const cam = this._activeGraph === 'g1' ? this._cam1 : this._cam2;
        const g = this._getActiveGraph();
        this._fitGraph(canvas, g, cam);
        this._drawGraph(canvas, g, cam);
    }

    // ─── Toggle Visibilidad ───────────────────────────────────────────────────

    _toggleInputGraphs() {
        this._inputGraphsCollapsed = !this._inputGraphsCollapsed;
        const el = this.el;
        if (this._inputGraphsCollapsed) {
            el.topRow.classList.add('grafos-collapsed');
            el.resultRow.classList.add('grafos-expanded');
            el.toggleIcon.textContent = '▶';
            el.toggleText.textContent = 'Mostrar G1 y G2';
        } else {
            el.topRow.classList.remove('grafos-collapsed');
            el.resultRow.classList.remove('grafos-expanded');
            el.toggleIcon.textContent = '▼';
            el.toggleText.textContent = 'Ocultar G1 y G2';
        }

        setTimeout(() => {
            this._resizeAllCanvas();
            this._drawAll();
            if (this._inputGraphsCollapsed && this.gResult) {
                this._fitGraph(el.canvasResult, this.gResult, this._camR);
                this._drawGraph(el.canvasResult, this.gResult, this._camR);
            }
        }, 350);
    }

    // ─── Log System ───────────────────────────────────────────────────────────

    /**
     * Añade un mensaje breve al log inferior de la sección.
     * @param {string} msg - Mensaje a mostrar.
     * @param {string} [type='info'] - Estilo visual (info, success, error).
     * @private
     */
    _addUpdateLog(msg, type = 'info') {
        const entry = document.createElement('div');
        entry.classList.add('log-entry', `log-${type}`);
        entry.textContent = msg;
        this.el.logContent.appendChild(entry);
        this.el.logContent.scrollTop = this.el.logContent.scrollHeight;
    }

    _addOpLog(message, type = 'info') {
        const isSeparator = message.startsWith('---');
        if (isSeparator) {
            this.opLogMessages.push({ type: 'header', text: message.replace(/---/g, '').trim() });
        } else {
            this.opLogMessages.push({ type: 'body', text: message });
        }
        this._renderOpLogs();
    }

    /**
     * Renderiza los pasos detallados de una operación en el panel lateral derecho,
     * utilizando tablas formales y etiquetas explicativas.
     * @param {string[]} logs - Lista de hileras/HTML que representan los pasos.
     * @private
     */
    _renderStyledOpLogs(logsArray) {
        this.opLogMessages = [];
        logsArray.forEach(msg => {
            const isSeparator = msg.startsWith('---');
            if (isSeparator) {
                this.opLogMessages.push({ type: 'header', text: msg.replace(/---/g, '').trim() });
            } else {
                this.opLogMessages.push({ type: 'body', text: msg });
            }
        });
        this._renderOpLogs();
    }

    _renderOpLogs() {
        if (!this.el.opContent) return;
        this.el.opContent.innerHTML = '';

        let html = '';
        this.opLogMessages.forEach((m, idx) => {
            if (m.type === 'header') {
                if (idx > 0) html += `</div></div>`; // Cierra la tarjeta anterior
                html += `<div class="huffman-step-table" style="margin-bottom: 12px;">`;
                html += `<div class="section-title" style="font-size: 0.8rem; background: var(--bg-main); border-bottom: 1px solid var(--border-light); border-top-left-radius: 4px; border-top-right-radius: 4px; white-space: pre-wrap; line-height: 1.4;">${m.text}</div>`;
                html += `<div style="padding: 10px; font-family: Consolas, monospace; font-size: 0.82rem; white-space: pre-wrap; color: var(--text-primary); line-height: 1.5;">`;
            } else {
                // if there was no header, create an anonymous block
                if (idx === 0) {
                    html += `<div class="huffman-step-table" style="margin-bottom: 12px;">`;
                    html += `<div style="padding: 10px; font-family: Consolas, monospace; font-size: 0.82rem; white-space: pre-wrap; color: var(--text-primary); line-height: 1.5;">`;
                }
                html += m.text + '\n';
            }
        });
        if (this.opLogMessages.length > 0) html += `</div></div>`;
        else html = '<div class="huffman-empty-msg">Ejecute una operación para ver los pasos formales de G1 y G2 aquí.</div>';

        this.el.opContent.innerHTML = html;
        this.el.opContent.scrollTop = this.el.opContent.scrollHeight;
    }

    async _onSave() {
        if (!this.g1.created && !this.g2.created) {
            Validation.showError('No hay grafos para guardar.');
            return;
        }

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

        const jsonString = JSON.stringify(data, null, 2);
        const defaultName = `grafos_${Date.now()}.json`;
        await FileManager.saveJSON(jsonString, defaultName);
    }

    // ─── Drawing / Canvas (Pan, Zoom, Fit) ───────────────────────────────────

    /**
     * Motor de interacción física para los grafos. Implementa:
     * - Zoom con la rueda del ratón.
     * - Paneo con el click central o arrastre libre.
     * - Arrastre de nodos individuales (Drag Mode).
     * @private
     */
    _bindCanvasPanZoom(canvas, getGraph, cam, isDragActive, redraw) {
        canvas.addEventListener('mousedown', (e) => {
            const rect = canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            const graph = getGraph();

            // Si el modo arrastre está activo, intentamos agarrar un nodo
            if (isDragActive() && graph && graph.vertices.length > 0) {
                // Convertir coordenadas de pantalla a coordenadas del mundo (grafo)
                const worldX = (mouseX - cam.offsetX) / cam.scale;
                const worldY = (mouseY - cam.offsetY) / cam.scale;

                const cx = canvas.width / 2, cy = canvas.height / 2;
                const positions = graph.getVertexPositions(cx, cy);
                const r = this._nodeRadiusFor(graph);

                for (const v of graph.vertices) {
                    const pos = positions[v];
                    if (!pos) continue;
                    const dist = Math.sqrt((worldX - pos.x) ** 2 + (worldY - pos.y) ** 2);
                    if (dist < r) {
                        this._draggingNode = { graph, vertex: v };
                        canvas.style.cursor = 'grabbing';
                        return; // No iniciamos paneo
                    }
                }
            }

            // Si no agarramos nodo, iniciamos paneo
            cam.isPanning = true;
            cam.startX = e.clientX - cam.offsetX;
            cam.startY = e.clientY - cam.offsetY;
            canvas.style.cursor = 'grabbing';
        });

        canvas.addEventListener('mousemove', (e) => {
            const graph = getGraph();
            // Caso arrastre de nodo
            if (this._draggingNode && this._draggingNode.graph === graph) {
                const rect = canvas.getBoundingClientRect();
                const mouseX = e.clientX - rect.left;
                const mouseY = e.clientY - rect.top;
                const worldX = (mouseX - cam.offsetX) / cam.scale;
                const worldY = (mouseY - cam.offsetY) / cam.scale;

                graph.setVertexPosition(this._draggingNode.vertex, worldX, worldY);
                redraw();
                return;
            }

            // Caso paneo
            if (!cam.isPanning) return;
            cam.offsetX = e.clientX - cam.startX;
            cam.offsetY = e.clientY - cam.startY;
            redraw();
        });

        const stopInteraction = () => {
            cam.isPanning = false;
            this._draggingNode = null;
            canvas.style.cursor = 'grab';
        };
        canvas.addEventListener('mouseup', stopInteraction);
        canvas.addEventListener('mouseleave', stopInteraction);

        canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const rect = canvas.getBoundingClientRect();
            const mx = e.clientX - rect.left;
            const my = e.clientY - rect.top;
            const factor = e.deltaY < 0 ? 1.1 : 0.9;
            const newScale = Math.max(0.1, Math.min(5, cam.scale * factor));
            cam.offsetX = mx - (mx - cam.offsetX) * (newScale / cam.scale);
            cam.offsetY = my - (my - cam.offsetY) * (newScale / cam.scale);
            cam.scale = newScale;
            redraw();
        }, { passive: false });
    }

    /**
     * Calcula y aplica automáticamente el zoom y desplazamiento óptimo 
     * para que todo el grafo sea visible dentro de las dimensiones actuales del canvas.
     * @param {HTMLCanvasElement} canvas - Canvas para el cálculo.
     * @param {GraphModel} graph - Grafo a encuadrar.
     * @param {Object} cam - Cámara que será modificada.
     * @private
     */
    _fitGraph(canvas, graph, cam) {
        if (!graph || graph.vertices.length === 0) {
            cam.offsetX = 0; cam.offsetY = 0; cam.scale = 1; return;
        }
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;
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

        const cxTree = (minX + maxX) / 2, cyTree = (minY + maxY) / 2;
        cam.offsetX = canvas.width / 2 - cxTree * cam.scale;
        cam.offsetY = canvas.height / 2 - cyTree * cam.scale;
    }

    /**
     * Ajusta el tamaño de resolución interna de todos los canvas a su tamaño CSS real.
     * @private
     */
    _resizeAllCanvas() {
        [[this.el.canvasG1, 'grafos-wrap-g1'], [this.el.canvasG2, 'grafos-wrap-g2'], [this.el.canvasResult, 'grafos-wrap-result']]
            .forEach(([canvas]) => {
                const parent = canvas.parentElement;
                canvas.width = parent.clientWidth;
                canvas.height = parent.clientHeight;
            });
    }

    /**
     * Redibuja el contenido de todos los canvas visibles.
     * @private
     */
    _drawAll() {
        this._drawGraph(this.el.canvasG1, this.g1, this._cam1);
        this._drawGraph(this.el.canvasG2, this.g2, this._cam2);
        this._drawGraph(this.el.canvasResult, this.gResult, this._camR);
    }

    _nodeRadiusFor(graph) {
        if (!graph || graph.vertices.length === 0) return 20;
        const maxLabelLen = graph.vertices.reduce((m, v) => Math.max(m, v.length), 0);
        return maxLabelLen > 5 ? 28 : 20;
    }

    /**
     * Dibuja un grafo completo en un canvas específico, considerando su estado de cámara.
     * @param {HTMLCanvasElement} canvas 
     * @param {GraphModel} graph 
     * @param {Object} cam 
     */
    /**
     * Función principal de dibujo para un grafo. Dibuja aristas primero y nodos después.
     * @param {HTMLCanvasElement} canvas - Canvas objetivo.
     * @param {GraphModel} graph - Modelo del grafo a dibujar.
     * @param {Object} cam - Estado de cámara actual.
     * @private
     */
    _drawGraph(canvas, graph, cam) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Fondo y rejilla de puntos
        ctx.fillStyle = '#FAFBFD'; ctx.fillRect(0, 0, canvas.width, canvas.height);
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
            ctx.fillStyle = '#A0A8B8'; ctx.font = '14px "Segoe UI", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            const msg = graph && graph.name ? `${graph.name} — Vacío o no definido` : 'Vacío o no definido';
            ctx.fillText(msg, canvas.width / 2, canvas.height / 2);
            return;
        }

        const r = this._nodeRadiusFor(graph);
        const cx = canvas.width / 2, cy = canvas.height / 2;
        const positions = graph.getVertexPositions(cx, cy);

        // Aplicar transformaciones de cámara (pan & zoom)
        ctx.save();
        ctx.translate(cam.offsetX, cam.offsetY);
        ctx.scale(cam.scale, cam.scale);

        // Contar aristas entre los mismos nodos para dibujar curvas si hay multiaristas
        const edgeCounts = {};
        for (const e of graph.edges) {
            const key = [e.from, e.to].sort().join('-');
            edgeCounts[key] = (edgeCounts[key] || 0) + 1;
        }
        const edgeDrawn = {};

        // 1. Dibujar Aristas
        for (const e of graph.edges) {
            const p1 = positions[e.from], p2 = positions[e.to];
            if (!p1 || !p2) continue;
            const key = [e.from, e.to].sort().join('-');
            edgeDrawn[key] = (edgeDrawn[key] || 0) + 1;
            const isSelf = e.from === e.to;
            const isMulti = edgeCounts[key] > 1;
            const curveDir = edgeDrawn[key] % 2 === 0 ? 1 : -1;
            this._drawEdge(ctx, e, p1, p2, graph.directed, r, isSelf, isMulti ? curveDir : 0);
        }

        // 2. Dibujar Vértices (encima de las aristas)
        for (const v of graph.vertices) {
            const p = positions[v];
            if (!p) continue;
            this._drawVertex(ctx, v, p.x, p.y, r);
        }

        ctx.restore();
    }

    /**
     * Dibuja una arista entre dos puntos. 
     * Soporta visualización dirigida (flechas) y pesos.
     * @param {CanvasRenderingContext2D} ctx - Contexto de dibujo.
     * @param {Object} edge - Objeto de arista del modelo.
     * @param {Object} p1 - Punto de inicio {x,y}.
     * @param {Object} p2 - Punto de destino {x,y}.
     * @param {boolean} directed - Si la arista es dirigida.
     * @param {number} r - Radio del nodo.
     * @param {boolean} isSelf - Si es un bucle.
     * @param {number} curvature - Factor de curvatura.
     * @private
     */
    _drawEdge(ctx, edge, p1, p2, directed, r, isSelf, curvature) {
        ctx.strokeStyle = '#8494AB'; ctx.lineWidth = 1.5; ctx.setLineDash([]);
        let sx, sy, ex, ey, midX, midY, uy, ux;

        if (isSelf) {
            ctx.beginPath(); ctx.arc(p1.x + r, p1.y - r, r * 0.75, 0, Math.PI * 2); ctx.stroke();
            midX = p1.x + r * 1.5; midY = p1.y - r * 1.5;
            uy = -1; ux = 1;
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
                const curveAmt = curvature * 30;
                const cpX = midX - uy * curveAmt, cpY = midY + ux * curveAmt;
                ctx.moveTo(sx, sy); ctx.quadraticCurveTo(cpX, cpY, ex, ey);
                midX = (sx + cpX + ex) / 3; midY = (sy + cpY + ey) / 3; // Approx label center
            } else {
                ctx.moveTo(sx, sy); ctx.lineTo(ex, ey);
                midX = (sx + ex) / 2; midY = (sy + ey) / 2;
            }
            ctx.stroke();

            if (directed) {
                const arrowSize = 9;
                let angle = curvature !== 0 ? Math.atan2(ey - (p1.y + p2.y) / 2, ex - (p1.x + p2.x) / 2) : Math.atan2(ey - sy, ex - sx);
                ctx.beginPath(); ctx.moveTo(ex, ey);
                ctx.lineTo(ex - arrowSize * Math.cos(angle - Math.PI / 6), ey - arrowSize * Math.sin(angle - Math.PI / 6));
                ctx.lineTo(ex - arrowSize * Math.cos(angle + Math.PI / 6), ey - arrowSize * Math.sin(angle + Math.PI / 6));
                ctx.closePath(); ctx.fillStyle = '#8494AB'; ctx.fill();
            }
        }

        // Draw Edge Label (ID)
        const perp = curvature !== 0 ? curvature * 10 : 8;
        const labelX = midX - uy * perp;
        const labelY = midY + ux * perp;

        let labelTxt = edge.id; // Ya no hay peso

        ctx.font = 'bold 10px "Segoe UI", sans-serif';
        ctx.fillStyle = '#1B3A6B'; // Azul oscuro para el ID
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(labelTxt, labelX, labelY);
    }

    /**
     * Dibuja un solo vértice (nodo) en el contexto del canvas.
     * Incluye el círculo base, el borde y la etiqueta del nombre.
     * @param {CanvasRenderingContext2D} ctx - Contexto de dibujo.
     * @param {string} label - Nombre del vértice.
     * @param {number} x - Posición X en mundo.
     * @param {number} y - Posición Y en mundo.
     * @param {number} r - Radio base del nodo.
     * @private
     */
    _drawVertex(ctx, label, x, y, r) {
        const labelLen = label.length;
        const dynR = labelLen > 5 ? r + (labelLen - 5) * 4 : r;

        ctx.beginPath(); ctx.arc(x, y, dynR, 0, Math.PI * 2);
        ctx.fillStyle = '#D6E4F0'; ctx.fill();
        ctx.strokeStyle = '#2B579A'; ctx.lineWidth = 2; ctx.stroke();

        const fontSize = labelLen > 6 ? 9 : labelLen > 3 ? 11 : 13;
        ctx.font = `bold ${fontSize}px "Segoe UI", sans-serif`;
        ctx.fillStyle = '#2B579A'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(label, x, y);
    }
}
