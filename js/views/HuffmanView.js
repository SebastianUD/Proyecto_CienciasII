/**
 * @fileoverview Vista para Árboles de Huffman.
 * Layout de 3 columnas: panel izquierdo (controles), canvas central (árbol),
 * panel derecho (tabla de codificación + tablas de formación).
 * @module views/HuffmanView
 */

class HuffmanView {
    constructor(containerEl) {
        this.container = containerEl;
        this.model = null;
        this.logMessages = [];
        this.isAnimating = false;
        this.elements = {};

        // Canvas state
        this._offsetX = 0;
        this._offsetY = 0;
        this._scale = 1;
        this._isPanning = false;
        this._panStartX = 0;
        this._panStartY = 0;

        // Animation highlights
        this._highlights = new Map();
        this._nodeRadius = 22;
        this._algorithmName = 'arboles-huffman';
    }

    show() {
        this.model = new HuffmanTreeModel();
        this.render('Árboles de Huffman');
    }

    // ─── Render ─────────────────────────────────────────────────────────────────

    render(title) {
        this.container.innerHTML = '';
        this.container.classList.remove('hidden');

        const welcome = document.getElementById('welcome-screen');
        if (welcome) welcome.classList.add('hidden');

        this.container.innerHTML = `
            <div class="algo-title">${title}</div>

            <div class="huffman-layout">
                <!-- Left panel -->
                <div class="tree-left-panel">
                    <!-- Modification -->
                    <div class="section-block tree-mod-section">
                        <div class="section-title">Modificación de la Estructura</div>
                        <div class="tree-mod-panel">
                            <label for="huffman-input-msg">Ingrese el Mensaje</label>
                            <div class="huffman-input-wrapper">
                                <textarea id="huffman-input-msg" class="huffman-message-input"
                                       autocomplete="off" rows="3"></textarea>
                            </div>
                            <div class="tree-mod-buttons">
                                <button class="btn btn-primary" id="huffman-btn-generate">Generar Árbol</button>
                                <button class="btn btn-success" id="huffman-btn-search">Buscar</button>
                            </div>
                            <div class="tree-mod-buttons">
                                <button class="btn btn-success" id="huffman-btn-load">Cargar</button>
                                <button class="btn btn-secondary" id="huffman-btn-clear">Limpiar</button>
                            </div>
                        </div>
                    </div>
                    <!-- Log -->
                    <div class="section-block tree-log-section">
                        <div class="section-title">Mensajes y Resultados</div>
                        <div class="tree-log-content" id="huffman-log-content"></div>
                    </div>
                </div>

                <!-- Canvas -->
                <div class="tree-canvas-wrapper">
                    <canvas id="huffman-canvas"></canvas>
                    <button class="tree-fit-btn" id="huffman-btn-fit" title="Ajustar vista">⊞</button>
                </div>

                <!-- Right panel -->
                <div class="huffman-right-panel">
                    <!-- Encoding table -->
                    <div class="section-block huffman-encoding-section">
                        <div class="section-title">Codificación Binaria</div>
                        <div class="huffman-encoding-body" id="huffman-encoding-body">
                            <div class="huffman-empty-msg">Genere un árbol para ver la codificación.</div>
                        </div>
                    </div>
                    <!-- Construction tables -->
                    <div class="section-block huffman-construction-section">
                        <div class="section-title">Formación de la Estructura</div>
                        <div class="huffman-construction-scroll" id="huffman-construction-scroll">
                            <div class="huffman-empty-msg">Genere un árbol para ver las tablas.</div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="footer-buttons">
                <button class="btn btn-success" id="huffman-btn-save">Guardar</button>
                <button class="btn btn-primary" id="huffman-btn-print">Imprimir</button>
            </div>
        `;

        this._cacheElements();
        this._bindEvents();
        this._resizeCanvas();
        this._drawTree();
    }

    // ─── Cache & Events ─────────────────────────────────────────────────────────

    _cacheElements() {
        this.elements = {
            inputMsg: document.getElementById('huffman-input-msg'),
            btnGenerate: document.getElementById('huffman-btn-generate'),
            btnSearch: document.getElementById('huffman-btn-search'),
            btnLoad: document.getElementById('huffman-btn-load'),
            btnClear: document.getElementById('huffman-btn-clear'),
            btnSave: document.getElementById('huffman-btn-save'),
            btnPrint: document.getElementById('huffman-btn-print'),
            btnFit: document.getElementById('huffman-btn-fit'),
            canvas: document.getElementById('huffman-canvas'),
            logContent: document.getElementById('huffman-log-content'),
            encodingBody: document.getElementById('huffman-encoding-body'),
            constructionScroll: document.getElementById('huffman-construction-scroll')
        };
    }

    _bindEvents() {
        const el = this.elements;

        el.btnGenerate.addEventListener('click', () => this._onGenerate());
        el.btnSearch.addEventListener('click', () => this._onSearch());
        el.btnLoad.addEventListener('click', () => this._onLoad());
        el.btnClear.addEventListener('click', () => this._onClear());
        el.btnSave.addEventListener('click', () => this._onSave());
        el.btnPrint.addEventListener('click', () => this._onPrint());
        el.btnFit.addEventListener('click', () => this._fitToView());

        el.inputMsg.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') el.btnGenerate.click();
        });

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

    // ─── Canvas Pan & Zoom ──────────────────────────────────────────────────────

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
            minX = Math.min(minX, n.x - r - 30);
            maxX = Math.max(maxX, n.x + r + 30);
            minY = Math.min(minY, n.y - r - 30);
            maxY = Math.max(maxY, n.y + r + 30);
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

    // ─── Drawing ────────────────────────────────────────────────────────────────

    _drawTree() {
        const canvas = this.elements.canvas;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Background
        ctx.fillStyle = '#FAFBFD';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Grid dots
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

        // Empty state
        if (!this.model || !this.model.root) {
            ctx.fillStyle = '#A0A8B8';
            ctx.font = '16px "Segoe UI", sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('Ingrese un mensaje y genere el árbol', canvas.width / 2, canvas.height / 2);
            return;
        }

        const layoutNodes = this.model.getLayoutNodes();

        ctx.save();
        ctx.translate(this._offsetX, this._offsetY);
        ctx.scale(this._scale, this._scale);

        // Draw edges
        for (const n of layoutNodes) {
            if (n.parentX !== null && n.parentY !== null) {
                this._drawEdge(ctx, n.parentX, n.parentY, n.x, n.y, n.edgeLabel);
            }
        }

        // Draw nodes
        for (const n of layoutNodes) {
            this._drawNode(ctx, n);
        }

        ctx.restore();
    }

    _drawEdge(ctx, x1, y1, x2, y2, label) {
        const r = this._nodeRadius;
        const dx = x2 - x1;
        const dy = y2 - y1;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist === 0) return;

        const sx = x1 + (dx / dist) * r;
        const sy = y1 + (dy / dist) * r;
        const ex = x2 - (dx / dist) * r;
        const ey = y2 - (dy / dist) * r;

        const edgeKey = `${x1},${y1}-${x2},${y2}`;
        const highlight = this._highlights.get(edgeKey);

        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(ex, ey);
        ctx.strokeStyle = highlight || '#8494AB';
        ctx.lineWidth = highlight ? 2.5 : 1.5;
        ctx.stroke();

        // Edge label (0 or 1)
        if (label) {
            const midX = (sx + ex) / 2;
            const midY = (sy + ey) / 2;
            const perpX = -(ey - sy) / dist * 14;
            const perpY = (ex - sx) / dist * 14;

            ctx.font = 'bold 12px "Segoe UI", sans-serif';
            ctx.fillStyle = highlight || '#5A6880';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(label, midX + perpX, midY + perpY);
        }
    }

    _drawNode(ctx, layoutNode) {
        const { node, x, y } = layoutNode;
        const r = this._nodeRadius;
        const highlight = this._highlights.get(node);

        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);

        if (highlight) {
            ctx.fillStyle = highlight;
            ctx.fill();
            ctx.strokeStyle = this._darken(highlight);
            ctx.lineWidth = 2.5;
        } else if (node.isLeaf) {
            // Leaf — filled with data color
            ctx.fillStyle = '#D6E4F0';
            ctx.fill();
            ctx.strokeStyle = '#2B579A';
            ctx.lineWidth = 2;
        } else {
            // Internal — white circle
            ctx.fillStyle = '#FFFFFF';
            ctx.fill();
            ctx.strokeStyle = '#8494AB';
            ctx.lineWidth = 2;
        }
        ctx.stroke();

        // Text: frequency label on top line, character below (for leaves)
        const textColor = highlight ? '#FFFFFF' : (node.isLeaf ? '#2B579A' : '#5A6880');
        ctx.fillStyle = textColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        if (node.isLeaf) {
            // Two lines: freq on top, key below
            ctx.font = 'bold 10px "Segoe UI", sans-serif';
            ctx.fillText(node.freqLabel, x, y - 6);
            ctx.font = 'bold 14px "Segoe UI", sans-serif';
            ctx.fillText(node.key, x, y + 8);
        } else {
            // Single line: freq
            ctx.font = 'bold 12px "Segoe UI", sans-serif';
            ctx.fillText(node.freqLabel, x, y);
        }
    }

    _darken(hex) {
        if (hex.startsWith('#')) {
            const r = Math.max(0, parseInt(hex.slice(1, 3), 16) - 40);
            const g = Math.max(0, parseInt(hex.slice(3, 5), 16) - 40);
            const b = Math.max(0, parseInt(hex.slice(5, 7), 16) - 40);
            return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
        }
        return hex;
    }

    // ─── Operations ─────────────────────────────────────────────────────────────

    _onGenerate() {
        if (this.isAnimating) {
            Validation.showWarning('Espere a que la animación actual termine.');
            return;
        }

        if (this.model.created) {
            Validation.showWarning('Debe limpiar el árbol actual antes de generar otro.');
            return;
        }

        const msg = this.elements.inputMsg.value;
        const result = this.model.buildTree(msg);

        if (!result.success) {
            Validation.showError(result.error);
            return;
        }

        this._addLog(`Árbol generado para "${this.model.message}".`, 'success');

        const encoded = this.model.encodeMessage();
        this._addLog(`Mensaje codificado: ${encoded}`, 'info');

        // Update right panel
        this._renderEncodingTable();
        this._renderConstructionTables();

        // Fit view and draw
        this._fitToView();

        this.elements.inputMsg.value = '';
        this.elements.inputMsg.focus();
    }

    async _onSearch() {
        if (this.isAnimating) {
            Validation.showWarning('Espere a que la animación actual termine.');
            return;
        }

        if (!this.model.created) {
            Validation.showError('Primero debe generar el árbol.');
            return;
        }

        const input = this.elements.inputMsg.value;

        if (!input || input.length === 0) {
            Validation.showError('Ingrese un carácter para buscar.');
            return;
        }

        if (input.length > 1) {
            Validation.showError('Solo puede buscar un carácter a la vez.');
            return;
        }

        const character = input;
        this._addLog(`Buscando "${character}"...`, 'info');

        const result = this.model.search(character);

        if (result.error && !result.found && result.steps.length === 0) {
            Validation.showError(result.error);
            this.elements.inputMsg.value = '';
            this.elements.inputMsg.focus();
            return;
        }

        this._fitToView();
        await this._animateSteps(result.steps);

        if (result.found) {
            this._addLog(`✔ Carácter "${character}" encontrado. Código: ${result.code}`, 'success');
        } else {
            this._addLog(`✘ ${result.error}`, 'error');
        }

        this.elements.inputMsg.value = '';
        this.elements.inputMsg.focus();
    }

    async _onClear() {
        if (this.model && this.model.created) {
            const confirmed = await Validation.confirm('Se eliminará el árbol actual. ¿Desea continuar?');
            if (!confirmed) return;
        }

        this.model.reset();
        this.logMessages = [];
        this.elements.logContent.innerHTML = '';
        this._highlights.clear();
        this._offsetX = 0;
        this._offsetY = 0;
        this._scale = 1;

        // Clear right panel
        this.elements.encodingBody.innerHTML = '<div class="huffman-empty-msg">Genere un árbol para ver la codificación.</div>';
        this.elements.constructionScroll.innerHTML = '<div class="huffman-empty-msg">Genere un árbol para ver las tablas.</div>';

        this._drawTree();
        this._addLog('Árbol limpiado.', 'info');
    }

    async _onLoad() {
        if (this.model && this.model.created) {
            Validation.showWarning('Debe limpiar el árbol actual antes de cargar otro.');
            return;
        }

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

        // Only accept files saved by Huffman (not compatible with other tree types)
        if (data.algorithm && data.algorithm !== this._algorithmName) {
            Validation.showError(`Este archivo fue creado para "${data.algorithm}" y no es compatible con Árboles de Huffman.`);
            return;
        }

        if (!data.structure || !data.structure.message) {
            Validation.showError('El archivo no tiene un formato válido para Árboles de Huffman.');
            return;
        }

        this.model.fromJSON(data.structure);

        // Update right panel
        this._renderEncodingTable();
        this._renderConstructionTables();

        this._fitToView();
        this._addLog('Árbol cargado desde archivo.', 'success');
    }

    _onSave() {
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
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `${this._algorithmName}_${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        Validation.showSuccess('Archivo guardado correctamente.');
    }

    // ─── Right Panel Rendering ──────────────────────────────────────────────────

    /** Escapes HTML special characters for safe display */
    _escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML.replace(/ /g, '&nbsp;');
    }

    _renderEncodingTable() {
        const body = this.elements.encodingBody;
        const entries = this.model.getEncodingTableArray();

        if (entries.length === 0) {
            body.innerHTML = '<div class="huffman-empty-msg">Sin datos.</div>';
            return;
        }

        let html = '<table class="data-table huffman-enc-table">';
        html += '<thead><tr><th>Clave</th><th>Binario</th></tr></thead><tbody>';
        for (const e of entries) {
            html += `<tr><td>${this._escapeHtml(e.key)}</td><td>${e.code}</td></tr>`;
        }
        html += '</tbody></table>';

        body.innerHTML = html;
    }

    _renderConstructionTables() {
        const container = this.elements.constructionScroll;
        const tables = this.model.getConstructionTablesReversed();

        if (tables.length === 0) {
            container.innerHTML = '<div class="huffman-empty-msg">Sin datos.</div>';
            return;
        }

        let html = '';
        tables.forEach((tableObj, idx) => {
            const rows = tableObj.rows;
            const mergeKeys = tableObj.mergeKeys; // two keys that will be combined next (or null)

            html += `<div class="huffman-step-table">`;
            html += `<table class="data-table huffman-ct-table">`;
            html += '<thead><tr><th>Clave</th><th>Frecuencia</th></tr></thead><tbody>';
            for (const row of rows) {
                let cls = '';
                if (idx === 0 && rows.length === 1) {
                    // Final table (root with freq=1) → green
                    cls = ' class="huffman-root-row"';
                } else if (mergeKeys && mergeKeys.includes(row.key)) {
                    // These two will be combined in the next step → yellow
                    cls = ' class="huffman-combined-row"';
                }
                html += `<tr${cls}><td>${this._escapeHtml(row.key)}</td><td>${row.freqLabel}</td></tr>`;
            }
            html += '</tbody></table></div>';
        });

        container.innerHTML = html;
    }

    // ─── Animation ──────────────────────────────────────────────────────────────

    async _animateSteps(steps) {
        this.isAnimating = true;
        this._disableButtons(true);

        const DELAY = 500;
        let primaryNode = null;
        let primaryColor = null;

        for (const step of steps) {
            this._highlights.clear();

            let color;
            switch (step.action) {
                case 'visit':
                    color = '#F0AD4E';
                    break;
                case 'found':
                    color = '#28A745';
                    primaryNode = step.node;
                    primaryColor = color;
                    break;
                case 'error':
                    color = '#DC3545';
                    primaryNode = step.node;
                    primaryColor = color;
                    break;
                default:
                    color = '#F0AD4E';
            }

            if (step.node) {
                this._highlights.set(step.node, color);
            }
            this._drawTree();
            await new Promise(r => setTimeout(r, DELAY));
        }

        // Final lingering highlight
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
        el.btnGenerate.disabled = disabled;
        el.btnSearch.disabled = disabled;
    }

    // ─── Log ────────────────────────────────────────────────────────────────────

    _addLog(message, type = 'info') {
        this.logMessages.push({ message, type, time: new Date() });

        const logContent = this.elements.logContent;
        const entry = document.createElement('div');
        entry.classList.add('log-entry', `log-${type}`);
        entry.textContent = message;
        logContent.appendChild(entry);
        logContent.scrollTop = logContent.scrollHeight;
    }

    // ─── Print ──────────────────────────────────────────────────────────────────

    _onPrint() {
        if (!this.model || !this.model.root) {
            Validation.showError('No hay árbol para imprimir.');
            return;
        }

        const titleEl = this.container.querySelector('.algo-title');
        const title = titleEl ? titleEl.textContent : 'Árbol de Huffman';

        // Render tree to temp off-screen canvas
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

        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, w, h);

        ctx.save();
        ctx.translate(-minX + 20, -minY + 20);

        const savedHighlights = new Map(this._highlights);
        this._highlights.clear();

        for (const n of layoutNodes) {
            if (n.parentX !== null && n.parentY !== null) {
                this._drawEdge(ctx, n.parentX, n.parentY, n.x, n.y, n.edgeLabel);
            }
        }
        for (const n of layoutNodes) {
            this._drawNode(ctx, n);
        }

        ctx.restore();
        this._highlights = savedHighlights;

        // Encoding table HTML
        const entries = this.model.getEncodingTableArray();
        let encodingHtml = '<table style="border-collapse:collapse;margin:0 auto 20px;"><tr><th style="border:1px solid #ccc;padding:6px 14px;background:#2B579A;color:white;">Clave</th><th style="border:1px solid #ccc;padding:6px 14px;background:#2B579A;color:white;">Binario</th></tr>';
        for (const e of entries) {
            encodingHtml += `<tr><td style="border:1px solid #ccc;padding:4px 14px;text-align:center;">${e.key}</td><td style="border:1px solid #ccc;padding:4px 14px;text-align:center;">${e.code}</td></tr>`;
        }
        encodingHtml += '</table>';

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
                    h2 { font-size: 14px; color: #333; margin: 16px 0 8px; }
                    img { max-width: 100%; height: auto; }
                </style>
            </head>
            <body>
                <h1>${title}</h1>
                <h2>Mensaje: ${this.model.message}</h2>
                <img src="${imgData}" />
                <h2>Codificación Binaria</h2>
                ${encodingHtml}
            </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.onload = () => {
            printWindow.print();
        };
    }
}
