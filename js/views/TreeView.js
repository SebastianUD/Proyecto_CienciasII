/**
 * @fileoverview Vista base para los árboles de Búsqueda por Residuos.
 * Renderiza un canvas interactivo con pan/zoom para visualizar árboles,
 * un panel de modificación lateral (izquierda) y log debajo del panel.
 * @module views/TreeView
 */

class TreeView {
    /**
     * @param {HTMLElement} containerEl
     */
    constructor(containerEl) {
        this.container = containerEl;
        this.model = null;          // Set by subclass
        this.logMessages = [];
        this.isAnimating = false;
        this.elements = {};
        this._lastOperation = null;
        this._showFullHistory = false;

        // Canvas state
        this._offsetX = 0;
        this._offsetY = 0;
        this._scale = 1;
        this._isPanning = false;
        this._panStartX = 0;
        this._panStartY = 0;

        // Animation highlights — nodeId → color
        this._highlights = new Map();

        // Node radius
        this._nodeRadius = 20;

        // Algorithm name for save/load
        this._algorithmName = 'arbol';
    }

    /**
     * Renderiza el layout completo.
     * @param {string} title
     */
    render(title) {
        this.container.innerHTML = '';
        this.container.classList.remove('hidden');

        const welcome = document.getElementById('welcome-screen');
        if (welcome) welcome.classList.add('hidden');

        this.container.innerHTML = `
            <div class="algo-title">${title}</div>

            <div class="tree-layout">
                <!-- Left panel -->
                <div class="tree-left-panel">
                    <!-- Modification -->
                    <div class="section-block tree-mod-section">
                        <div class="section-title">Modificación de la Estructura</div>
                        <div class="tree-mod-panel">
                            <label for="tree-input-key">Ingrese la Clave (letra)</label>
                            <input type="text" id="tree-input-key" placeholder="A-Z" maxlength="1">
                            <div class="tree-mod-buttons">
                                <button class="btn btn-primary" id="tree-btn-insert">Insertar</button>
                                <button class="btn btn-danger" id="tree-btn-delete">Borrar</button>
                                <button class="btn btn-success" id="tree-btn-search">Buscar</button>
                            </div>
                            <div class="tree-mod-buttons">
                                <button class="btn btn-success" id="tree-btn-load">Cargar</button>
                                <button class="btn btn-secondary" id="tree-btn-clear">Limpiar</button>
                            </div>
                        </div>
                    </div>
                    <!-- Log -->
                    <div class="section-block tree-log-section">
                        <div class="section-title">
                            Mensajes y Resultados
                            <button class="log-history-toggle" id="tree-log-history-toggle" title="Ver historial completo">📋 Historial</button>
                        </div>
                        <div class="tree-log-content" id="tree-log-content"></div>
                    </div>
                </div>

                <!-- Canvas -->
                <div class="tree-canvas-wrapper">
                    <canvas id="tree-canvas"></canvas>
                    <button class="tree-fit-btn" id="tree-btn-fit" title="Ajustar vista">⊞</button>
                </div>
            </div>

            <div class="footer-buttons">
                <button class="btn btn-success" id="tree-btn-save">Guardar</button>
                <button class="btn btn-primary" id="tree-btn-print">Imprimir</button>
            </div>
        `;

        this._cacheElements();
        this._bindEvents();
        this._resizeCanvas();
        this._drawTree();
    }

    show() {
        // Subclasses call: this.model = new XModel(); this.render(title);
    }

    // ─── Cache & Events ────────────────────────────────────────────────────────

    _cacheElements() {
        this.elements = {
            inputKey: document.getElementById('tree-input-key'),
            btnInsert: document.getElementById('tree-btn-insert'),
            btnDelete: document.getElementById('tree-btn-delete'),
            btnSearch: document.getElementById('tree-btn-search'),
            btnLoad: document.getElementById('tree-btn-load'),
            btnClear: document.getElementById('tree-btn-clear'),
            btnSave: document.getElementById('tree-btn-save'),
            btnPrint: document.getElementById('tree-btn-print'),
            btnFit: document.getElementById('tree-btn-fit'),
            canvas: document.getElementById('tree-canvas'),
            logContent: document.getElementById('tree-log-content'),
            logHistoryToggle: document.getElementById('tree-log-history-toggle')
        };
    }

    _bindEvents() {
        const el = this.elements;

        el.btnInsert.addEventListener('click', () => this._onInsert());
        el.btnDelete.addEventListener('click', () => this._onDelete());
        el.btnSearch.addEventListener('click', () => this._onSearch());
        el.btnLoad.addEventListener('click', () => this._onLoad());
        el.btnClear.addEventListener('click', () => this._onClear());
        el.btnSave.addEventListener('click', () => this._onSave());
        el.btnPrint.addEventListener('click', () => this._onPrint());
        el.btnFit.addEventListener('click', () => this._fitToView());

        // Tecla Enter en el input de clave
        // Se usa un pequeño retraso para que el keyup de Enter se procese
        // antes de que aparezca cualquier diálogo SweetAlert2.
        el.inputKey.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                setTimeout(() => el.btnInsert.click(), 10);
            }
        });

        el.logHistoryToggle.addEventListener('click', () => this._toggleLogHistory());

        // Canvas pan & zoom
        const canvas = el.canvas;
        canvas.addEventListener('mousedown', (e) => this._onMouseDown(e));
        canvas.addEventListener('mousemove', (e) => this._onMouseMove(e));
        canvas.addEventListener('mouseup', () => this._onMouseUp());
        canvas.addEventListener('mouseleave', () => this._onMouseUp());
        canvas.addEventListener('wheel', (e) => this._onWheel(e), { passive: false });

        // Resize observer
        this._resizeObserver = new ResizeObserver(() => {
            this._resizeCanvas();
            this._drawTree();
        });
        this._resizeObserver.observe(canvas.parentElement);
    }

    // ─── Canvas Pan & Zoom ─────────────────────────────────────────────────────

    _onMouseDown(e) {
        this._isPanning = true;
        this._panStartX = e.clientX - this._offsetX;
        this._panStartY = e.clientY - this._offsetY;
        this.elements.canvas.style.cursor = 'grabbing';
    }

    _onMouseMove(e) {
        if (!this._isPanning) return;
        this._offsetX = e.clientX - this._panStartX;
        this._offsetY = e.clientY - this._panStartY;
        this._drawTree();
    }

    _onMouseUp() {
        this._isPanning = false;
        this.elements.canvas.style.cursor = 'grab';
    }

    _onWheel(e) {
        e.preventDefault();
        const canvas = this.elements.canvas;
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
        const newScale = Math.max(0.1, Math.min(5, this._scale * zoomFactor));

        // Zoom towards cursor
        this._offsetX = mouseX - (mouseX - this._offsetX) * (newScale / this._scale);
        this._offsetY = mouseY - (mouseY - this._offsetY) * (newScale / this._scale);
        this._scale = newScale;

        this._drawTree();
    }

    _resizeCanvas() {
        const canvas = this.elements.canvas;
        const parent = canvas.parentElement;
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;
    }

    /**
     * Ajusta zoom y offset para que el árbol completo sea visible.
     */
    _fitToView() {
        const layoutNodes = this.model ? this.model.getLayoutNodes() : [];
        if (layoutNodes.length === 0) {
            this._offsetX = 0;
            this._offsetY = 0;
            this._scale = 1;
            this._drawTree();
            return;
        }

        const canvas = this.elements.canvas;
        const r = this._nodeRadius;
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

        for (const n of layoutNodes) {
            minX = Math.min(minX, n.x - r);
            maxX = Math.max(maxX, n.x + r);
            minY = Math.min(minY, n.y - r);
            maxY = Math.max(maxY, n.y + r);
        }

        const treeW = maxX - minX + 60;
        const treeH = maxY - minY + 60;

        const scaleX = canvas.width / treeW;
        const scaleY = canvas.height / treeH;
        this._scale = Math.min(scaleX, scaleY, 2);

        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;

        this._offsetX = canvas.width / 2 - centerX * this._scale;
        this._offsetY = canvas.height / 2 - centerY * this._scale;

        this._drawTree();
    }

    // ─── Drawing ───────────────────────────────────────────────────────────────

    /**
     * Dibuja el árbol completo en el canvas.
     */
    _drawTree() {
        const canvas = this.elements.canvas;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Background
        ctx.fillStyle = '#FAFBFD';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Grid dots (subtle)
        ctx.fillStyle = '#E0E4EA';
        const gridSize = 30 * this._scale;
        if (gridSize > 8) {
            const startX = (this._offsetX % gridSize + gridSize) % gridSize;
            const startY = (this._offsetY % gridSize + gridSize) % gridSize;
            for (let x = startX; x < canvas.width; x += gridSize) {
                for (let y = startY; y < canvas.height; y += gridSize) {
                    ctx.beginPath();
                    ctx.arc(x, y, 1, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }

        // Empty state message
        if (!this.model || !this.model.root) {
            ctx.fillStyle = '#A0A8B8';
            ctx.font = '16px "Segoe UI", sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('Inserte claves para visualizar el árbol', canvas.width / 2, canvas.height / 2);
            return;
        }

        const layoutNodes = this.model.getLayoutNodes();

        ctx.save();
        ctx.translate(this._offsetX, this._offsetY);
        ctx.scale(this._scale, this._scale);

        // Draw edges first
        for (const n of layoutNodes) {
            if (n.parentX !== null && n.parentY !== null) {
                this._drawEdge(ctx, n.parentX, n.parentY, n.x, n.y, n.edgeLabel, n.node && n.node.isGhost);
            }
        }

        // Draw nodes
        for (const n of layoutNodes) {
            this._drawNode(ctx, n);
        }

        ctx.restore();
    }

    /**
     * Dibuja una arista entre dos nodos.
     */
    _drawEdge(ctx, x1, y1, x2, y2, label, isGhost = false) {
        const r = this._nodeRadius;

        const endR = isGhost ? r * 0.65 : r;
        const dx = x2 - x1;
        const dy = y2 - y1;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist === 0) return;

        const sx = x1 + (dx / dist) * r;
        const sy = y1 + (dy / dist) * r;
        const ex = x2 - (dx / dist) * endR;
        const ey = y2 - (dy / dist) * endR;

        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(ex, ey);

        if (isGhost) {
            ctx.strokeStyle = 'rgba(180, 192, 206, 0.35)';
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 3]);
        } else {
            const edgeKey = `${x1},${y1}-${x2},${y2}`;
            const highlight = this._highlights.get(edgeKey);
            ctx.strokeStyle = highlight || '#8494AB';
            ctx.lineWidth = highlight ? 2.5 : 1.5;
        }
        ctx.stroke();
        ctx.setLineDash([]);

        if (label) {
            const midX = (sx + ex) / 2;
            const midY = (sy + ey) / 2;
            const perpX = -(ey - sy) / dist * 12;
            const perpY = (ex - sx) / dist * 12;

            ctx.font = 'bold 11px "Segoe UI", sans-serif';
            ctx.fillStyle = isGhost ? 'rgba(160, 168, 184, 0.4)' : '#5A6880';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(label, midX + perpX, midY + perpY);
        }
    }

    /**
     * Dibuja un nodo (círculo con texto).
     * Subclases pueden sobrescribir para personalizar.
     */
    _drawNode(ctx, layoutNode) {
        const { node, x, y } = layoutNode;
        const r = this._nodeRadius;

        if (node.isGhost) {
            const gr = r * 0.65;
            ctx.beginPath();
            ctx.arc(x, y, gr, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(220, 228, 236, 0.25)';
            ctx.fill();
            ctx.strokeStyle = 'rgba(180, 192, 206, 0.4)';
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 3]);
            ctx.stroke();
            ctx.setLineDash([]);
            return;
        }

        const highlight = this._highlights.get(node);
        const isLink = node.isLink === true;
        const hasKey = node.key !== null && node.key !== undefined;

        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);

        if (highlight) {
            ctx.fillStyle = highlight;
            ctx.fill();
            ctx.strokeStyle = this._darken(highlight);
            ctx.lineWidth = 2.5;
        } else if (isLink) {
            ctx.fillStyle = '#FFFFFF';
            ctx.fill();
            ctx.strokeStyle = '#8494AB';
            ctx.lineWidth = 2;
        } else if (hasKey) {
            ctx.fillStyle = '#D6E4F0';
            ctx.fill();
            ctx.strokeStyle = '#2B579A';
            ctx.lineWidth = 2;
        } else {
            ctx.fillStyle = '#F0F2F5';
            ctx.fill();
            ctx.strokeStyle = '#C0C8D4';
            ctx.lineWidth = 1.5;
        }
        ctx.stroke();

        if (hasKey) {
            ctx.font = `bold 14px "Segoe UI", sans-serif`;
            ctx.fillStyle = highlight ? '#FFFFFF' : '#2B579A';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(node.key, x, y);
        }
    }

    /**
     * Oscurece un color hex para el borde.
     */
    _darken(hex) {
        // Simple darken — reduce each channel
        if (hex.startsWith('#')) {
            const r = Math.max(0, parseInt(hex.slice(1, 3), 16) - 40);
            const g = Math.max(0, parseInt(hex.slice(3, 5), 16) - 40);
            const b = Math.max(0, parseInt(hex.slice(5, 7), 16) - 40);
            return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
        }
        return hex;
    }

    // ─── Operations ────────────────────────────────────────────────────────────

    _onInsert() {
        if (this.isAnimating) {
            Validation.showWarning('Espere a que la animación actual termine.');
            return;
        }

        const el = this.elements;
        const result = this.model.insert(el.inputKey.value);

        if (!result.success) {
            Validation.showError(result.error);
            return;
        }

        const letter = el.inputKey.value.trim().toUpperCase();
        const binary = TreeUtils.letterToBinary(letter);
        this._setOperation('insert');
        this._addLog(`Insertada "${letter}" (${binary}).`, 'success');

        // Fit view BEFORE animating so the user sees the animation properly
        this._fitToView();
        this._animateSteps(result.steps, 'insert');

        el.inputKey.value = '';
        el.inputKey.focus();
    }

    async _onDelete() {
        if (this.isAnimating) {
            Validation.showWarning('Espere a que la animación actual termine.');
            return;
        }

        const el = this.elements;
        const key = el.inputKey.value.trim().toUpperCase();

        if (!key) {
            Validation.showError('Debe ingresar la clave que desea borrar.');
            return;
        }

        if (!this.model.keys.has(key)) {
            Validation.showError(`La clave "${key}" no existe en el árbol.`);
            this._addLog(`✘ La clave "${key}" no existe.`, 'error');
            el.inputKey.value = '';
            el.inputKey.focus();
            return;
        }

        const letter = key;
        const binary = TreeUtils.letterToBinary(letter);

        this._setOperation('delete');
        this._addLog(`Iniciando borrado de "${letter}" (${binary})...`, 'info');

        // Step 1: Search animation (tree still intact)
        const searchResult = this.model.search(key);
        this._fitToView();
        await this._animateSteps(searchResult.steps, 'search');

        // Step 2: Highlight found node in red and hold
        const foundStep = searchResult.steps.find(s => s.action === 'found');
        if (foundStep) {
            this._highlights.clear();
            this._highlights.set(foundStep.node, '#DC3545');
            this._drawTree();
            await new Promise(r => setTimeout(r, 800));
        }

        // Step 3: Actually delete (modifies the tree)
        const deleteResult = this.model.delete(key);

        // Step 4: Clear and redraw
        this._highlights.clear();
        this._fitToView();
        this._drawTree();

        if (deleteResult.success) {
            this._addLog(`Clave "${key}" eliminada.`, 'success');
        } else {
            this._addLog(`✘ ${deleteResult.error}`, 'error');
        }

        this.isAnimating = false;
        this._disableButtons(false);
        el.inputKey.value = '';
        el.inputKey.focus();
    }

    async _onSearch() {
        if (this.isAnimating) {
            Validation.showWarning('Espere a que la animación actual termine.');
            return;
        }

        const el = this.elements;
        const key = el.inputKey.value.trim().toUpperCase();

        if (!key) {
            Validation.showError('Debe ingresar la clave que desea buscar.');
            return;
        }

        const binary = TreeUtils.letterToBinary(key);
        this._setOperation('search');
        this._addLog(`Buscando "${key}" (${binary})...`, 'info');

        const result = this.model.search(key);

        if (result.error) {
            Validation.showError(result.error);
            return;
        }

        this._fitToView();
        await this._animateSteps(result.steps, 'search');

        if (result.found) {
            this._addLog(`✔ Clave "${key}" encontrada.`, 'success');
        } else {
            this._addLog(`✘ Clave "${key}" no encontrada.`, 'error');
        }

        el.inputKey.value = '';
        el.inputKey.focus();
    }

    async _onClear() {
        if (this.model && this.model.created) {
            const confirmed = await Validation.confirm('Se eliminará el árbol actual. ¿Desea continuar?');
            if (!confirmed) return;
        }

        this.model.reset();
        this.logMessages = [];
        this._lastOperation = null;
        this._showFullHistory = false;
        this.elements.logContent.innerHTML = '';
        this._highlights.clear();
        this._offsetX = 0;
        this._offsetY = 0;
        this._scale = 1;

        const toggleBtn = this.elements.logHistoryToggle;
        if (toggleBtn) {
            toggleBtn.textContent = '📋 Historial';
            toggleBtn.title = 'Ver historial completo';
            toggleBtn.classList.remove('active');
        }

        this._drawTree();
        this._addLog('Árbol limpiado.', 'info');
    }

    async _onLoad() {
        if (this.model && this.model.created) {
            Validation.showWarning('Debe limpiar el árbol actual antes de cargar otro.');
            return;
        }

        // Own file loading logic (FileManager.load checks for keys array which trees don't have)
        const data = await new Promise((resolve) => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            input.onchange = (e) => {
                const file = e.target.files[0];
                if (!file) { resolve(null); return; }
                const reader = new FileReader();
                reader.onload = (event) => {
                    try {
                        resolve(JSON.parse(event.target.result));
                    } catch (err) {
                        Validation.showError('Error al leer el archivo JSON.');
                        resolve(null);
                    }
                };
                reader.readAsText(file);
            };
            input.click();
        });

        if (!data) return;

        if (data.algorithm && this._algorithmName && !FileCompat.areCompatible(data.algorithm, this._algorithmName)) {
            Validation.showError(`Este archivo fue creado para "${data.algorithm}" y no es compatible con esta vista.`);
            return;
        }

        if (!data.structure || !data.structure.insertionOrder) {
            Validation.showError('El archivo no tiene un formato válido para árboles.');
            return;
        }

        this.model.fromJSON(data.structure);
        this._setOperation('load');
        this._addLog('Árbol cargado desde archivo.', 'success');
    }

    async _onSave() {
        if (!this.model || !this.model.created) {
            Validation.showError('No hay árbol para guardar.');
            return;
        }

        const data = {
            algorithm: this._algorithmName,
            timestamp: new Date().toISOString(),
            structure: this.model.toJSON()
        };

        const jsonString = JSON.stringify(data, null, 2);
        const defaultName = `${this._algorithmName}_${Date.now()}.json`;

        await FileManager.saveJSON(jsonString, defaultName);
    }

    // ─── Animation ─────────────────────────────────────────────────────────────

    /**
     * Anima los pasos de una operación con colores.
     * @param {Array} steps - Pasos animables del modelo.
     * @param {string} operation - 'insert' | 'search' | 'delete'
     * @returns {Promise<void>}
     */
    async _animateSteps(steps, operation) {
        this.isAnimating = true;
        this._disableButtons(true);

        const DELAY = 500;

        // Track the primary node for the final lingering highlight
        let primaryNode = null;
        let primaryColor = null;

        let i = 0;
        while (i < steps.length) {
            const step = steps[i];

            // Skip reinsert and create-link — don't highlight the sibling
            if (step.action === 'reinsert' || step.action === 'create-link') {
                i++;
                continue;
            }

            // Clear previous highlight
            this._highlights.clear();

            // Color based on action
            let color;
            switch (step.action) {
                case 'visit':
                case 'visit-link':
                    color = '#F0AD4E'; // Yellow — checking
                    break;
                case 'found':
                    color = '#28A745'; // Green — found
                    primaryNode = step.node;
                    primaryColor = color;
                    break;
                case 'insert':
                    color = '#28A745'; // Green — inserted
                    primaryNode = step.node;
                    primaryColor = color;
                    break;
                case 'collision':
                    color = '#F0AD4E'; // Yellow — collision
                    break;
                case 'not-found':
                    color = '#DC3545'; // Red — not found
                    primaryNode = step.node;
                    primaryColor = color;
                    break;
                case 'delete-leaf':
                case 'replace':
                case 'remove-link':
                case 'simplify':
                    color = '#DC3545'; // Red — deletion
                    primaryNode = step.node;
                    primaryColor = color;
                    break;
                default:
                    color = '#F0AD4E';
            }

            this._highlights.set(step.node, color);
            this._drawTree();
            await new Promise(r => setTimeout(r, DELAY));

            i++;
        }

        // Final lingering highlight: show only the primary node
        this._highlights.clear();
        if (primaryNode && primaryColor) {
            this._highlights.set(primaryNode, primaryColor);
        }
        this._drawTree();
        await new Promise(r => setTimeout(r, DELAY));

        this._highlights.clear();
        this._drawTree();

        this.isAnimating = false;
        this._disableButtons(false);
    }

    _disableButtons(disabled) {
        const el = this.elements;
        el.btnInsert.disabled = disabled;
        el.btnDelete.disabled = disabled;
        el.btnSearch.disabled = disabled;
    }

    // ─── Log ───────────────────────────────────────────────────────────────────

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
        const toggleBtn = this.elements.logHistoryToggle;

        if (this._showFullHistory) {
            toggleBtn.textContent = '↩ Atrás';
            toggleBtn.title = 'Volver al modo normal';
        } else {
            toggleBtn.textContent = '📋 Historial';
            toggleBtn.title = 'Ver historial completo';
            this.elements.logContent.innerHTML = '';
            return;
        }

        this._renderLogView();
    }

    // ─── Print ──────────────────────────────────────────────────────────────────

    /**
     * Imprime el árbol generando una imagen del canvas en una ventana nueva.
     */
    _onPrint() {
        if (!this.model || !this.model.root) {
            Validation.showError('No hay árbol para imprimir.');
            return;
        }

        // Get title
        const titleEl = this.container.querySelector('.algo-title');
        const title = titleEl ? titleEl.textContent : 'Árbol';

        // Render tree to a temp off-screen canvas at 1:1 scale
        const layoutNodes = this.model.getLayoutNodes();
        const r = this._nodeRadius;
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        for (const n of layoutNodes) {
            minX = Math.min(minX, n.x - r - 20);
            maxX = Math.max(maxX, n.x + r + 20);
            minY = Math.min(minY, n.y - r - 20);
            maxY = Math.max(maxY, n.y + r + 20);
        }

        const w = maxX - minX + 40;
        const h = maxY - minY + 40;

        const tmpCanvas = document.createElement('canvas');
        tmpCanvas.width = w;
        tmpCanvas.height = h;
        const ctx = tmpCanvas.getContext('2d');

        // White background
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, w, h);

        // Translate so tree is centered
        ctx.save();
        ctx.translate(-minX + 20, -minY + 20);

        // Save current highlights and clear
        const savedHighlights = new Map(this._highlights);
        this._highlights.clear();

        // Draw edges
        for (const n of layoutNodes) {
            if (n.parentX !== null && n.parentY !== null) {
                this._drawEdge(ctx, n.parentX, n.parentY, n.x, n.y, n.edgeLabel, n.node && n.node.isGhost);
            }
        }
        // Draw nodes
        for (const n of layoutNodes) {
            this._drawNode(ctx, n);
        }

        ctx.restore();

        // Restore highlights
        this._highlights = savedHighlights;

        // Convert to image and open print window
        const imgData = tmpCanvas.toDataURL('image/png');
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>${title}</title>
                <style>
                    body { margin: 0; display: flex; flex-direction: column; align-items: center; padding: 20px; font-family: 'Segoe UI', sans-serif; }
                    h1 { font-size: 18px; color: #2B579A; margin-bottom: 16px; }
                    img { max-width: 100%; height: auto; }
                </style>
            </head>
            <body>
                <h1>${title}</h1>
                <img src="${imgData}" />
            </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.onload = () => {
            printWindow.print();
        };
    }
}
