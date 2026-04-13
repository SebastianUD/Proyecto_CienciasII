/**
 * @class AlgorithmGraphView
 * @description Vista base compartida para los algoritmos de grafos (Bellman-Ford, Dijkstra, Floyd-Warshall).
 * Proporciona un editor de grafos dirigidos con peso, canvas interactivo (pan/zoom/arrastre),
 * disposición circular de nodos y panel de operaciones paso a paso.
 *
 * Las subclases deben sobreescribir:
 *  - _title()           → Texto del título.
 *  - _extraInputHTML()  → HTML para inputs adicionales (ej. nodo fuente).
 *  - _cacheExtra()      → Cachear elementos extra del DOM.
 *  - _bindExtra()       → Vincular eventos extra.
 *  - _onCreateExtra()   → Acciones al crear el grafo.
 *  - _onClearExtra()    → Acciones al limpiar el grafo.
 *  - _onExecute()       → Implementación del algoritmo.
 *
 * @module views/AlgorithmGraphView
 */
class AlgorithmGraphView {
    /**
     * @param {HTMLElement} containerEl - Contenedor principal de la vista.
     */
    constructor(containerEl) {
        this.container = containerEl;

        /** @type {number} Número de nodos en el grafo */
        this.nodeCount = 0;

        /** @type {Array<{from:number, to:number, weight:number}>} Aristas del grafo */
        this.edges = [];

        /** @type {Object<number,{x:number,y:number}>} Posiciones manuales de nodos */
        this._manualPos = {};

        /** @type {Object<number,string>} Color de resaltado por nodo */
        this._nodeHL = {};

        /** @type {Object<string,string>} Color de resaltado por arista ('from-to' → color) */
        this._edgeHL = {};

        /** @type {boolean} Modo arrastre de nodos activo */
        this._dragMode = false;

        /** @type {number|null} Nodo siendo arrastrado actualmente */
        this._dragging = null;

        /** @type {{offsetX,offsetY,scale,isPanning,startX,startY}} Estado de la cámara */
        this._cam = { offsetX: 0, offsetY: 0, scale: 1, isPanning: false, startX: 0, startY: 0 };

        /** @type {number} Radio base de los nodos */
        this._r = 22;

        /** @type {Object} Referencias al DOM */
        this.el = {};
    }

    // ─── Métodos Sobreescribibles ─────────────────────────────────────────────

    /** @returns {string} Título a mostrar en la vista. */
    _title() { return 'Algoritmo'; }

    /** @returns {string} HTML adicional para el panel izquierdo (ej. nodo fuente). */
    _extraInputHTML() { return ''; }

    /** Cachea elementos extra del DOM después del render. @protected */
    _cacheExtra() {}

    /** Vincula eventos extra. @protected */
    _bindExtra() {}

    /** Ejecuta acciones tras la creación del grafo. @protected */
    _onCreateExtra() {}

    /** Ejecuta acciones tras limpiar el grafo. @protected */
    _onClearExtra() {}

    /** Implementación del algoritmo — debe sobreescribirse. @protected @abstract */
    _onExecute() {}

    // ─── Ciclo de vida ────────────────────────────────────────────────────────

    /**
     * Muestra la vista en el contenedor: genera HTML, cachea elementos, vincula eventos y dibuja.
     */
    show() {
        this.container.innerHTML = '';
        this.container.classList.remove('hidden');
        const welcome = document.getElementById('welcome-screen');
        if (welcome) welcome.classList.add('hidden');

        this.container.innerHTML = this._buildHTML();
        this._cacheElements();
        this._bindEvents();
        this._resizeCanvas();
        this._drawGraph();
    }

    /**
     * Genera el HTML completo del layout (panel izquierdo + canvas + panel derecho).
     * @private
     * @returns {string}
     */
    _buildHTML() {
        return `
        <div class="algo-title">${this._title()}</div>
        <div class="grafos-layout">

            <!-- ── Panel Izquierdo ── -->
            <div class="grafos-left-panel">

                <div class="section-block">
                    <div class="section-title">Definición del Grafo</div>
                    <div class="grafos-input-panel">

                        <!-- Número de nodos -->
                        <div class="grafos-field-col">
                            <label for="ag-node-count">Número de Nodos (2–20)</label>
                            <div class="grafos-vertex-input-row">
                                <input type="number" id="ag-node-count" min="2" max="20" placeholder="Ej: 4">
                                <button class="btn btn-primary" id="ag-create-btn" style="min-width:62px;">CREAR</button>
                            </div>
                        </div>

                        <!-- Aristas -->
                        <div class="grafos-field-col" id="ag-edge-section" style="display:none; margin-top:8px;">
                            <label>Aristas Dirigidas con Peso</label>
                            <div style="display:flex; gap:4px; flex-wrap:wrap; margin-bottom:4px;">
                                <select id="ag-edge-from" style="flex:1; min-width:44px;"><option value="">De</option></select>
                                <select id="ag-edge-to"   style="flex:1; min-width:44px;"><option value="">A</option></select>
                                <input  type="number" id="ag-edge-weight" placeholder="Peso" style="flex:1; min-width:50px;">
                                <button class="btn btn-primary" id="ag-add-edge-btn" style="min-width:32px; padding:0 8px;">+</button>
                            </div>
                            <div class="grafos-edge-list" id="ag-edge-list" style="max-height:140px; overflow-y:auto;"></div>
                        </div>

                        <!-- HTML adicional de la subclase (nodo fuente, etc.) -->
                        ${this._extraInputHTML()}

                        <!-- Botones de acción -->
                        <div id="ag-action-section" style="display:none; margin-top:10px;">
                            <button class="btn btn-primary grafos-btn-full" id="ag-execute-btn" style="margin-bottom:8px;">▶ CALCULAR</button>
                        </div>

                        <div class="grafos-btn-row" style="margin-top:10px;">
                            <button class="btn btn-secondary" id="ag-clear-btn">LIMPIAR</button>
                            <button class="btn btn-success" id="ag-btn-save">GUARDAR</button>
                        </div>

                    </div>
                </div>

                <!-- Mensajes -->
                <div class="section-block grafos-log-section">
                    <div class="section-title">Mensajes</div>
                    <div class="tree-log-content" id="ag-log" style="height:110px;"></div>
                </div>

            </div>

            <!-- ── Canvas Central ── -->
            <div class="grafos-canvas-area">
                <div class="grafos-result-row" style="flex:1;">
                    <div class="grafos-canvas-wrapper grafos-result-canvas" id="ag-canvas-wrap">
                        <div class="grafos-canvas-label">${this._title()}</div>
                        <canvas id="ag-canvas"></canvas>
                        <button class="tree-fit-btn drag-toggle-btn" id="ag-drag-btn" title="Mover nodos" style="right:54px;">✥</button>
                        <button class="tree-fit-btn" id="ag-fit-btn" title="Ajustar vista">⊞</button>
                    </div>
                </div>
            </div>

            <!-- ── Panel Derecho: Operaciones ── -->
            <div class="grafos-right-panel">
                <div class="section-block" style="height:100%; display:flex; flex-direction:column;">
                    <div class="section-title">Operaciones de la Estructura</div>
                    <div class="tree-log-content" id="ag-ops" style="flex:1; overflow-y:auto;">
                        <div class="huffman-empty-msg">Ejecute el algoritmo para ver el desarrollo paso a paso.</div>
                    </div>
                </div>
            </div>

        </div>
        
        <!-- Footer global de botones -->
        <div class="footer-buttons">
            <button class="btn btn-info" id="ag-btn-load">CARGAR</button>
            <button class="btn btn-primary" id="ag-btn-print">IMPRIMIR</button>
        </div>`;
    }

    // ─── DOM ─────────────────────────────────────────────────────────────────

    /**
     * Almacena referencias a los elementos DOM de la vista.
     * @private
     */
    _cacheElements() {
        this.el = {
            nodeCountInput: document.getElementById('ag-node-count'),
            createBtn:      document.getElementById('ag-create-btn'),
            edgeSection:    document.getElementById('ag-edge-section'),
            edgeFrom:       document.getElementById('ag-edge-from'),
            edgeTo:         document.getElementById('ag-edge-to'),
            edgeWeight:     document.getElementById('ag-edge-weight'),
            addEdgeBtn:     document.getElementById('ag-add-edge-btn'),
            edgeList:       document.getElementById('ag-edge-list'),
            actionSection:  document.getElementById('ag-action-section'),
            executeBtn:     document.getElementById('ag-execute-btn'),
            clearBtn:       document.getElementById('ag-clear-btn'),
            saveBtn:        document.getElementById('ag-btn-save'),
            loadBtn:        document.getElementById('ag-btn-load'),
            printBtn:       document.getElementById('ag-btn-print'),
            logContent:     document.getElementById('ag-log'),
            opContent:      document.getElementById('ag-ops'),
            canvasWrap:     document.getElementById('ag-canvas-wrap'),
            canvas:         document.getElementById('ag-canvas'),
            fitBtn:         document.getElementById('ag-fit-btn'),
            dragBtn:        document.getElementById('ag-drag-btn')
        };
        this._cacheExtra();
    }

    /**
     * Vincula todos los eventos de usuario.
     * @private
     */
    _bindEvents() {
        const el = this.el;
        el.createBtn.addEventListener('click',   () => this._onCreate());
        el.addEdgeBtn.addEventListener('click',  () => this._onAddEdge());
        el.clearBtn.addEventListener('click',    () => this._onClear());
        el.executeBtn.addEventListener('click',  () => this._onExecute());
        
        el.saveBtn.addEventListener('click',     () => this._onSave());
        el.loadBtn.addEventListener('click',     () => this._onLoad());
        el.printBtn.addEventListener('click',    () => window.print());
        
        el.fitBtn.addEventListener('click',      () => { this._fitGraph(); this._drawGraph(); });
        el.dragBtn.addEventListener('click',     () => {
            this._dragMode = !this._dragMode;
            el.dragBtn.classList.toggle('active', this._dragMode);
        });

        this._bindExtra();
        this._bindCanvas();

        // Redimensionar canvas cuando cambie el tamaño del contenedor
        this._ro = new ResizeObserver(() => {
            this._resizeCanvas();
            this._drawGraph();
        });
        this._ro.observe(el.canvasWrap);
    }

    // ─── Interacción con el Canvas ────────────────────────────────────────────

    /**
     * Vincula los eventos de pan, zoom y arrastre de nodos en el canvas.
     * @private
     */
    _bindCanvas() {
        const canvas = this.el.canvas;
        const cam    = this._cam;

        canvas.addEventListener('mousedown', (e) => {
            const rect = canvas.getBoundingClientRect();
            const mx = e.clientX - rect.left;
            const my = e.clientY - rect.top;

            if (this._dragMode && this.nodeCount > 0) {
                const wx = (mx - cam.offsetX) / cam.scale;
                const wy = (my - cam.offsetY) / cam.scale;
                const pos = this._positions();
                for (let n = 1; n <= this.nodeCount; n++) {
                    const p = pos[n];
                    if (Math.hypot(wx - p.x, wy - p.y) < this._r + 4) {
                        this._dragging = n;
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

        canvas.addEventListener('mousemove', (e) => {
            if (this._dragging !== null) {
                const rect = canvas.getBoundingClientRect();
                const mx = e.clientX - rect.left;
                const my = e.clientY - rect.top;
                this._manualPos[this._dragging] = {
                    x: (mx - cam.offsetX) / cam.scale,
                    y: (my - cam.offsetY) / cam.scale
                };
                this._drawGraph();
                return;
            }
            if (!cam.isPanning) return;
            cam.offsetX = e.clientX - cam.startX;
            cam.offsetY = e.clientY - cam.startY;
            this._drawGraph();
        });

        const stop = () => {
            cam.isPanning = false;
            this._dragging = null;
            canvas.style.cursor = 'grab';
        };
        canvas.addEventListener('mouseup',    stop);
        canvas.addEventListener('mouseleave', stop);

        canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const rect = canvas.getBoundingClientRect();
            const mx = e.clientX - rect.left;
            const my = e.clientY - rect.top;
            const f  = e.deltaY < 0 ? 1.1 : 0.9;
            const ns = Math.max(0.1, Math.min(5, cam.scale * f));
            cam.offsetX = mx - (mx - cam.offsetX) * (ns / cam.scale);
            cam.offsetY = my - (my - cam.offsetY) * (ns / cam.scale);
            cam.scale   = ns;
            this._drawGraph();
        }, { passive: false });

        canvas.style.cursor = 'grab';
    }

    /**
     * Ajusta las dimensiones internas del canvas al tamaño de su contenedor.
     * @private
     */
    _resizeCanvas() {
        const wrap   = this.el.canvasWrap;
        const canvas = this.el.canvas;
        if (wrap && canvas) {
            canvas.width  = wrap.clientWidth;
            canvas.height = wrap.clientHeight;
        }
    }

    // ─── Layout de Nodos ─────────────────────────────────────────────────────

    _positions() {
        const canvas = this.el.canvas;
        const n      = this.nodeCount;
        const pos    = {};

        let levels = {};
        for(let i=1; i<=n; i++) levels[i] = 0;

        // Distribución por nivel de antecesores:
        // Relajación iterativa análoga para hallar profundidad máxima desde raíces
        for (let iter = 0; iter < n; iter++) {
            let changed = false;
            for (let e of this.edges) {
                if (levels[e.from] + 1 > levels[e.to]) {
                    levels[e.to] = levels[e.from] + 1;
                    changed = true;
                }
            }
            if (!changed) break;
        }

        let maxLevel = 0;
        for (let i = 1; i <= n; i++) {
            if (levels[i] > maxLevel) maxLevel = levels[i];
        }

        let levelGroups = [];
        for(let i=0; i<=maxLevel; i++) levelGroups.push([]);
        for(let i=1; i<=n; i++) levelGroups[levels[i]].push(i);

        let w = canvas.width || 600;
        let h = canvas.height || 400;
        const padX = w / (maxLevel + 1);

        for (let lvl = 0; lvl <= maxLevel; lvl++) {
            let group = levelGroups[lvl];
            let padY = h / (group.length + 1);
            let x = padX * lvl + (padX / 2);
            for(let i=0; i<group.length; i++) {
                let node = group[i];
                if (this._manualPos[node]) {
                    pos[node] = this._manualPos[node];
                } else {
                    let y = padY * (i + 1);
                    pos[node] = { x, y };
                }
            }
        }
        return pos;
    }

    /**
     * Resetea la cámara al estado original (sin zoom ni desplazamiento).
     * @private
     */
    _fitGraph() {
        this._cam.offsetX = 0;
        this._cam.offsetY = 0;
        this._cam.scale   = 1;
    }

    // ─── Dibujo ───────────────────────────────────────────────────────────────

    /**
     * Redibuja el grafo completo en el canvas.
     * Incluye fondo, rejilla de puntos, aristas y nodos.
     * @private
     */
    _drawGraph() {
        const canvas = this.el.canvas;
        const ctx    = canvas.getContext('2d');
        const cam    = this._cam;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Fondo
        ctx.fillStyle = '#FAFBFD';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Rejilla de puntos
        ctx.fillStyle = '#E0E4EA';
        const gs = 30 * cam.scale;
        if (gs > 8) {
            const ox = ((cam.offsetX % gs) + gs) % gs;
            const oy = ((cam.offsetY % gs) + gs) % gs;
            for (let x = ox; x < canvas.width; x += gs)
                for (let y = oy; y < canvas.height; y += gs) {
                    ctx.beginPath(); ctx.arc(x, y, 1, 0, Math.PI * 2); ctx.fill();
                }
        }

        if (this.nodeCount === 0) {
            ctx.fillStyle    = '#A0A8B8';
            ctx.font         = '14px "Segoe UI", sans-serif';
            ctx.textAlign    = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('Defina el número de nodos y presione CREAR', canvas.width / 2, canvas.height / 2);
            return;
        }

        const pos = this._positions();

        ctx.save();
        ctx.translate(cam.offsetX, cam.offsetY);
        ctx.scale(cam.scale, cam.scale);

        // 1. Aristas primero
        for (const e of this.edges) {
            const p1 = pos[e.from];
            const p2 = pos[e.to];
            if (!p1 || !p2) continue;
            const hl = this._edgeHL[`${e.from}-${e.to}`] || null;
            this._drawEdge(ctx, p1, p2, e.from, e.to, e.weight, hl);
        }

        // 2. Nodos encima
        const isExecuted = this._isExecuted || false;
        for (let n = 1; n <= this.nodeCount; n++) {
            const hasConnection = this.edges.some(e => e.from === n || e.to === n);
            if (!hasConnection && !isExecuted) continue;

            const p  = pos[n];
            const hl = this._nodeHL[n] || null;
            const extra = this._nodeExtraLabel && this._nodeExtraLabel[n] ? this._nodeExtraLabel[n] : null;
            if (p) this._drawNode(ctx, n, p.x, p.y, hl, extra);
        }

        ctx.restore();
    }

    /**
     * Dibuja un nodo (círculo + etiqueta numérica) en el canvas.
     * @private
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} label  - Número del nodo (1..N).
     * @param {number} x
     * @param {number} y
     * @param {string|null} hlColor - Color de resaltado (null = color por defecto).
     * @param {string|null} extraText - Etiqueta extra arriba del nodo.
     */
    _drawNode(ctx, label, x, y, hlColor, extraText) {
        const r = this._r;

        // Sombra
        ctx.shadowColor   = 'rgba(0,0,0,0.12)';
        ctx.shadowBlur    = 8;
        ctx.shadowOffsetY = 3;

        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = hlColor || '#D6E4F0';
        ctx.fill();

        ctx.shadowColor   = 'transparent';
        ctx.shadowBlur    = 0;
        ctx.shadowOffsetY = 0;

        ctx.strokeStyle = hlColor ? this._darken(hlColor) : '#2B579A';
        ctx.lineWidth   = 2.5;
        ctx.stroke();

        // Etiqueta numérica
        const isLight  = hlColor ? this._isLight(hlColor) : true;
        ctx.font         = `bold 13px "Segoe UI", sans-serif`;
        ctx.fillStyle    = hlColor ? (isLight ? '#1B3465' : '#fff') : '#2B579A';
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(label), x, y);

        if (extraText) {
            ctx.font = 'bold 12px "Segoe UI", sans-serif';
            ctx.textAlign = 'center';
            if (Array.isArray(extraText)) {
                let currentY = y - r - 12;
                // Renderizar de abajo hacia arriba (el último es el más cercano al nodo)
                for (let i = extraText.length - 1; i >= 0; i--) {
                    ctx.fillStyle = extraText[i].color || '#E53935';
                    ctx.fillText(extraText[i].text, x, currentY);
                    currentY -= 14;
                }
            } else {
                ctx.fillStyle = '#E53935';
                ctx.fillText(extraText, x, y - r - 12);
            }
        }
    }

    /**
     * Dibuja una arista dirigida con peso entre dos puntos.
     * Aplica curvatura si existe la arista inversa (para evitar superposición).
     * @private
     * @param {CanvasRenderingContext2D} ctx
     * @param {{x,y}} p1      - Punto de origen.
     * @param {{x,y}} p2      - Punto de destino.
     * @param {number} fromN  - Número del nodo origen.
     * @param {number} toN    - Número del nodo destino.
     * @param {number} weight - Peso de la arista.
     * @param {string|null} hlColor - Color de resaltado.
     */
    _drawEdge(ctx, p1, p2, fromN, toN, weight, hlColor) {
        const color = hlColor || '#8494AB';
        ctx.strokeStyle = color;
        ctx.lineWidth   = hlColor ? 2.5 : 1.5;
        ctx.setLineDash([]);

        // Bucle (self-loop)
        if (fromN === toN) {
            const lx = p1.x + this._r;
            const ly = p1.y - this._r;
            ctx.beginPath();
            ctx.arc(lx, ly, this._r * 0.75, 0, Math.PI * 2);
            ctx.stroke();
            ctx.font         = 'bold 10px "Segoe UI", sans-serif';
            ctx.fillStyle    = hlColor || '#1B3A6B';
            ctx.textAlign    = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(weight !== null ? String(weight) : '', lx + this._r, ly - this._r);
            return;
        }

        const dx   = p2.x - p1.x;
        const dy   = p2.y - p1.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 1) return;

        const ux = dx / dist, uy = dy / dist;
        const r  = this._r;
        const sx = p1.x + ux * r, sy = p1.y + uy * r;
        const ex = p2.x - ux * r, ey = p2.y - uy * r;

        // Curvatura si existe arista inversa
        const hasRev = this.edges.some(e => e.from === toN && e.to === fromN);
        const curv   = hasRev ? 1 : 0;

        let midX, midY;
        ctx.beginPath();
        if (curv !== 0) {
            midX = (sx + ex) / 2;
            midY = (sy + ey) / 2;
            const ca  = curv * 28;
            const cpX = midX - uy * ca;
            const cpY = midY + ux * ca;
            ctx.moveTo(sx, sy);
            ctx.quadraticCurveTo(cpX, cpY, ex, ey);
            midX = (sx + cpX + ex) / 3;
            midY = (sy + cpY + ey) / 3;
        } else {
            ctx.moveTo(sx, sy);
            ctx.lineTo(ex, ey);
            midX = (sx + ex) / 2;
            midY = (sy + ey) / 2;
        }
        ctx.stroke();

        // Punta de flecha
        const arrowSz = 9;
        const angle   = curv !== 0
            ? Math.atan2(ey - (p1.y + p2.y) / 2, ex - (p1.x + p2.x) / 2)
            : Math.atan2(dy, dx);

        ctx.beginPath();
        ctx.moveTo(ex, ey);
        ctx.lineTo(ex - arrowSz * Math.cos(angle - Math.PI / 6), ey - arrowSz * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(ex - arrowSz * Math.cos(angle + Math.PI / 6), ey - arrowSz * Math.sin(angle + Math.PI / 6));
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();

        // Etiqueta del peso
        if (weight !== null && weight !== undefined) {
            const px  = -uy * (curv !== 0 ? 14 : 10);
            const py  =  ux * (curv !== 0 ? 14 : 10);
            const wStr = String(weight);
            ctx.font   = 'bold 11px "Segoe UI", sans-serif';
            const tw   = ctx.measureText(wStr).width;

            // Fondo blanco semitransparente para legibilidad
            ctx.fillStyle = 'rgba(250,251,253,0.9)';
            ctx.fillRect(midX + px - tw / 2 - 3, midY + py - 8, tw + 6, 16);

            ctx.fillStyle    = hlColor || '#1B3A6B';
            ctx.textAlign    = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(wStr, midX + px, midY + py);
        }
    }

    // ─── Helpers de Color ─────────────────────────────────────────────────────

    /**
     * Determina si un color hexadecimal es luminoso (claro).
     * @param {string} hex
     * @returns {boolean}
     */
    _isLight(hex) {
        try {
            const r = parseInt(hex.slice(1, 3), 16);
            const g = parseInt(hex.slice(3, 5), 16);
            const b = parseInt(hex.slice(5, 7), 16);
            return (r * 0.299 + g * 0.587 + b * 0.114) > 155;
        } catch (e) { return false; }
    }

    /**
     * Oscurece un color hexadecimal en 40 unidades por canal.
     * @param {string} hex
     * @returns {string}
     */
    _darken(hex) {
        try {
            let r = Math.max(0, parseInt(hex.slice(1, 3), 16) - 40);
            let g = Math.max(0, parseInt(hex.slice(3, 5), 16) - 40);
            let b = Math.max(0, parseInt(hex.slice(5, 7), 16) - 40);
            return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
        } catch (e) { return '#1B3A6B'; }
    }

    // ─── Creación del grafo ───────────────────────────────────────────────────

    /**
     * Maneja el botón CREAR: valida el número de nodos, reinicializa el grafo
     * y actualiza la interfaz.
     * @private
     */
    _onCreate() {
        const n = parseInt(this.el.nodeCountInput.value);
        if (isNaN(n) || n < 2 || n > 20) {
            Validation.showError('El número de nodos debe estar entre 2 y 20.');
            return;
        }

        this._isExecuted = false;
        this.nodeCount  = n;
        this.edges      = [];
        this._manualPos = {};
        this._nodeHL    = {};
        this._edgeHL    = {};
        this._nodeExtraLabel = {};

        // Actualizar selectores de aristas
        const from = this.el.edgeFrom;
        const to   = this.el.edgeTo;
        from.innerHTML = '<option value="">De</option>';
        to.innerHTML   = '<option value="">A</option>';
        for (let i = 1; i <= n; i++) {
            from.add(new Option(String(i), i));
            to.add(new Option(String(i), i));
        }

        this.el.edgeSection.style.display   = '';
        this.el.actionSection.style.display = '';

        this._onCreateExtra();
        this._renderEdgeList();
        this.el.opContent.innerHTML = '<div class="huffman-empty-msg">Ejecute el algoritmo para ver el desarrollo paso a paso.</div>';
        this.el.logContent.innerHTML = '';
        this._fitGraph();
        this._drawGraph();
        this._addLog(`Grafo creado con ${n} nodo(s). Añada aristas y ejecute el algoritmo.`, 'success');
    }

    /**
     * Agrega una arista al grafo. Si ya existe, actualiza su peso.
     * @private
     */
    _onAddEdge() {
        const from   = parseInt(this.el.edgeFrom.value);
        const to     = parseInt(this.el.edgeTo.value);
        const weight = parseFloat(this.el.edgeWeight.value);

        if (!from || !to) {
            Validation.showError('Seleccione el nodo de origen y destino.');
            return;
        }
        if (from === to) {
            Validation.showError('No se permiten aristas que apunten al mismo vértice.');
            return;
        }
        if (isNaN(weight)) {
            Validation.showError('Ingrese un peso numérico válido.');
            return;
        }
        if (weight < 0) {
            Validation.showError('No se permiten pesos negativos en estas operaciones.');
            return;
        }

        const existingIdx = this.edges.findIndex(e => e.from === from && e.to === to);
        if (existingIdx >= 0) {
            this.edges[existingIdx].weight = weight;
            this._addLog(`Arista ${from}→${to} actualizada: peso ${weight}.`, 'info');
        } else {
            this.edges.push({ from, to, weight });
            this._addLog(`Arista ${from}→${to} con peso ${weight} añadida.`, 'success');
        }

        this.el.edgeWeight.value = '';
        this._renderEdgeList();
        this._drawGraph();
    }

    /**
     * Renderiza la lista de aristas en el panel izquierdo.
     * @private
     */
    _renderEdgeList() {
        const list = this.el.edgeList;
        list.innerHTML = '';

        this.edges.forEach((e, i) => {
            const row = document.createElement('div');
            row.className = 'grafos-edge-item';
            row.innerHTML = `
                <span class="grafos-edge-id">${i + 1})</span>
                <strong>${e.from}</strong>&nbsp;→&nbsp;<strong>${e.to}</strong>
                <span style="color:var(--accent-primary); font-weight:600; margin-left:4px;">[${e.weight}]</span>
                <button class="edge-remove" data-idx="${i}">×</button>`;

            row.querySelector('.edge-remove').addEventListener('click', () => {
                this.edges.splice(i, 1);
                this._renderEdgeList();
                this._drawGraph();
            });
            list.appendChild(row);
        });
    }

    /**
     * Limpia el grafo y restaura el estado inicial de la vista.
     * @private
     */
    _onClear() {
        this._isExecuted = false;
        this.nodeCount  = 0;
        this.edges      = [];
        this._manualPos = {};
        this._nodeHL    = {};
        this._edgeHL    = {};
        this._nodeExtraLabel = {};

        this.el.nodeCountInput.value         = '';
        this.el.edgeSection.style.display    = 'none';
        this.el.actionSection.style.display  = 'none';
        this.el.edgeList.innerHTML           = '';
        this.el.logContent.innerHTML         = '';
        this.el.opContent.innerHTML          = '<div class="huffman-empty-msg">Ejecute el algoritmo para ver el desarrollo paso a paso.</div>';

        this._onClearExtra();
        this._fitGraph();
        this._drawGraph();
    }

    /**
     * Guarda el grafo en un archivo JSON.
     * @private
     */
    _onSave() {
        if (this.nodeCount === 0) {
            Validation.showError('No hay un grafo para guardar.');
            return;
        }

        let type = 'algoritmo-general';
        if (this instanceof BellmanView) type = 'bellman';
        if (this instanceof DijkstraView) type = 'dijkstra';
        if (this instanceof FloydView) type = 'floyd';

        const data = {
            algorithm: type,
            structure: {
                nodeCount: this.nodeCount,
                edges: this.edges,
                manualPos: this._manualPos,
            }
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `grafo_${type}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        this._addLog('Grafo guardado exitosamente.', 'success');
    }

    /**
     * Carga un grafo desde un archivo JSON.
     * @private
     */
    async _onLoad() {
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

        if (!data || !data.structure || data.structure.nodeCount === undefined) {
             if (data) Validation.showError('El archivo no tiene el formato correcto para este algoritmo.');
             return;
        }

        const s = data.structure;
        this._isExecuted = false;
        this.nodeCount = s.nodeCount;
        this.edges = Array.isArray(s.edges) ? s.edges : [];
        this._manualPos = s.manualPos || {};
        this._nodeHL = {};
        this._edgeHL = {};
        this._nodeExtraLabel = {};

        this.el.nodeCountInput.value = this.nodeCount;
        
        // Actualizar selectores de aristas
        const from = this.el.edgeFrom;
        const to   = this.el.edgeTo;
        from.innerHTML = '<option value="">De</option>';
        to.innerHTML   = '<option value="">A</option>';
        for (let i = 1; i <= this.nodeCount; i++) {
            from.add(new Option(String(i), i));
            to.add(new Option(String(i), i));
        }

        this.el.edgeSection.style.display   = '';
        this.el.actionSection.style.display = '';

        this._onCreateExtra();
        this._renderEdgeList();
        this.el.opContent.innerHTML = '<div class="huffman-empty-msg">Ejecute el algoritmo para ver el desarrollo paso a paso.</div>';
        this.el.logContent.innerHTML = '';
        this._fitGraph();
        this._drawGraph();
        
        this._addLog('Grafo cargado exitosamente.', 'success');
    }

    // ─── Log y Operaciones ────────────────────────────────────────────────────

    /**
     * Agrega un mensaje al panel de log inferior izquierdo.
     * @param {string} msg - Texto del mensaje.
     * @param {string} [type='info'] - Tipo: 'info', 'success', 'error', 'warning'.
     */
    _addLog(msg, type = 'info') {
        const entry = document.createElement('div');
        entry.classList.add('log-entry', `log-${type}`);
        entry.textContent = msg;
        this.el.logContent.appendChild(entry);
        this.el.logContent.scrollTop = this.el.logContent.scrollHeight;
    }

    /**
     * Reemplaza el contenido del panel de operaciones (panel derecho).
     * @param {string} html - Contenido HTML completo.
     */
    _setOps(html) {
        this.el.opContent.innerHTML = html;
        this.el.opContent.scrollTop = 0;
    }

    // ─── Utilidad: Matriz de Adyacencia ──────────────────────────────────────

    /**
     * Construye la matriz de adyacencia del grafo.
     * Diagonal = 0, sin arista = Infinity.
     * @private
     * @returns {number[][]} Matriz n×n.
     */
    _adjMatrix() {
        const INF = Infinity;
        const n   = this.nodeCount;
        const D   = Array.from({ length: n }, () => new Array(n).fill(INF));
        for (let i = 0; i < n; i++) D[i][i] = 0;
        for (const e of this.edges) D[e.from - 1][e.to - 1] = e.weight;
        return D;
    }
}
