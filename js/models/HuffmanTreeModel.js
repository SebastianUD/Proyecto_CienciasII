/**
 * @fileoverview Modelo del Árbol de Huffman.
 * Construye un árbol de codificación óptimo basado en las frecuencias
 * de los caracteres de un mensaje.
 * @module models/HuffmanTreeModel
 */

// ─── Nodo de Huffman ──────────────────────────────────────────────────────────

class HuffmanNode {
    /**
     * @param {string|null} key - Carácter (hojas) o etiqueta combinada (internos)
     * @param {number} freq - Frecuencia numérica
     * @param {string} freqLabel - Etiqueta de frecuencia como fracción (e.g. "1/6")
     */
    constructor(key, freq, freqLabel) {
        this.key = key;
        this.freq = freq;
        this.freqLabel = freqLabel;
        /** @type {HuffmanNode|null} */
        this.left = null;
        /** @type {HuffmanNode|null} */
        this.right = null;
        /** @type {boolean} */
        this.isLeaf = true;
        /** Orden de inserción original (para desempate) */
        this.order = 0;
        /** Profundidad de anidamiento para los corchetes */
        this.depth = 0;
    }
}

// ─── Modelo del Árbol de Huffman ──────────────────────────────────────────────

class HuffmanTreeModel {
    constructor() {
        /** @type {HuffmanNode|null} */
        this.root = null;
        /** @type {string} Mensaje original */
        this.message = '';
        /** @type {Object<string, string>} Tabla de codificación {char: binaryCode} */
        this.encodingTable = {};
        /** @type {Array<Array<{key: string, freq: number, freqLabel: string}>>} Tablas intermedias */
        this.constructionTables = [];
    }

    /** @returns {boolean} */
    get created() { return this.root !== null; }

    /** Reinicia el modelo. */
    reset() {
        this.root = null;
        this.message = '';
        this.encodingTable = {};
        this.constructionTables = [];
    }

    // ─── Construcción del Árbol ─────────────────────────────────────────────────

    /**
     * Construye el árbol de Huffman a partir de un mensaje.
     * @param {string} message - Texto a codificar.
     * @returns {{success: boolean, error: string|null}}
     */
    buildTree(message) {
        const input = (message || '');

        if (input.length === 0) {
            return { success: false, error: 'Debe ingresar un mensaje.' };
        }

        this.reset();
        this.message = input;

        // 1. Contar frecuencias
        const freqMap = {};
        for (const ch of input) {
            freqMap[ch] = (freqMap[ch] || 0) + 1;
        }

        const totalChars = input.length;

        // 2. Crear nodos hoja ordenados por frecuencia ascendente, luego por orden de aparición
        const charOrder = [];
        for (const ch of input) {
            if (!charOrder.includes(ch)) charOrder.push(ch);
        }

        let nodes = charOrder.map((ch, idx) => {
            const count = freqMap[ch];
            const node = new HuffmanNode(ch, count / totalChars, `${count}/${totalChars}`);
            node.order = idx;
            return node;
        });

        // Ordenar: menor frecuencia primero; empates: el que apareció primero va primero (más abajo)
        nodes.sort((a, b) => a.freq - b.freq || a.order - b.order);

        // Guardar tabla inicial de frecuencias (orden descendente para visualización)
        this.constructionTables.push({
            rows: [...nodes].reverse().map(n => ({ key: n.key, freq: n.freq, freqLabel: n.freqLabel })),
            mergeKeys: null  // will be set before first merge
        });

        // Caso especial: un solo carácter distinto
        if (nodes.length === 1) {
            const leaf = nodes[0];
            const parent = new HuffmanNode(
                `(${leaf.key})`, leaf.freq, leaf.freqLabel
            );
            parent.isLeaf = false;
            parent.left = leaf;
            this.root = parent;
            this.encodingTable = { [leaf.key]: '0' };
            return { success: true, error: null };
        }

        // 3. Construir el árbol bottom-up
        let orderCounter = charOrder.length;

        while (nodes.length > 1) {
            // Tomar los dos nodos con menor frecuencia
            const left = nodes.shift();
            const right = nodes.shift();

            // Marcar en la tabla ANTERIOR cuáles dos claves se van a combinar
            this.constructionTables[this.constructionTables.length - 1].mergeKeys = [left.key, right.key];

            // Crear nodo padre con la suma de frecuencias
            const combinedFreq = left.freq + right.freq;
            const combinedLabel = this._buildFreqLabel(left, right, totalChars);
            const combinedKey = this._buildCombinedKey(left, right);

            const parent = new HuffmanNode(combinedKey, combinedFreq, combinedLabel);
            parent.isLeaf = false;
            parent.left = left;
            parent.right = right;
            parent.order = orderCounter++;
            parent.depth = Math.max(left.depth, right.depth) + 1;

            // Insertar el padre en la posición correcta (mantener orden)
            let inserted = false;
            for (let i = 0; i < nodes.length; i++) {
                if (parent.freq < nodes[i].freq ||
                    (parent.freq === nodes[i].freq && parent.order < nodes[i].order)) {
                    nodes.splice(i, 0, parent);
                    inserted = true;
                    break;
                }
            }
            if (!inserted) nodes.push(parent);

            // Guardar tabla intermedia (orden descendente para visualización)
            this.constructionTables.push({
                rows: [...nodes].reverse().map(n => ({ key: n.key, freq: n.freq, freqLabel: n.freqLabel })),
                mergeKeys: null
            });
        }

        this.root = nodes[0];
        // Root always shows '1' (the total frequency is 1)
        if (this.root) {
            this.root.freqLabel = '1';
            // Also update the last construction table entry
            const lastTable = this.constructionTables[this.constructionTables.length - 1];
            if (lastTable && lastTable.rows.length === 1) {
                lastTable.rows[0].freqLabel = '1';
            }
        }

        // 4. Generar tabla de codificación
        this.encodingTable = {};
        this._buildEncodingTable(this.root, '');

        return { success: true, error: null };
    }

    /**
     * Construye la etiqueta de frecuencia para un nodo combinado.
     * @private
     */
    _buildFreqLabel(left, right, total) {
        const numerator = Math.round(left.freq * total) + Math.round(right.freq * total);
        return `${numerator}/${total}`;
    }

    /**
     * Construye la clave combinada usando (), [], {} según la profundidad.
     * depth 0 (hoja) → (key)
     * depth 1         → [key]
     * depth 2         → {key}
     * depth 3+        → ciclo
     * @private
     */
    _buildCombinedKey(left, right) {
        const wrapNode = (node) => {
            const brackets = [['(', ')'], ['[', ']'], ['{', '}']];
            const bracketIdx = node.depth % 3;
            const [open, close] = brackets[bracketIdx];
            return `${open}${node.key}${close}`;
        };
        return `${wrapNode(left)} + ${wrapNode(right)}`;
    }

    /**
     * Recorre el árbol para construir la tabla de codificación.
     * @private
     */
    _buildEncodingTable(node, prefix) {
        if (!node) return;

        if (node.isLeaf) {
            this.encodingTable[node.key] = prefix || '0';
            return;
        }

        this._buildEncodingTable(node.left, prefix + '0');
        this._buildEncodingTable(node.right, prefix + '1');
    }

    // ─── Codificación del Mensaje ───────────────────────────────────────────────

    /**
     * Codifica el mensaje original usando la tabla de Huffman.
     * @returns {string} Cadena de bits.
     */
    encodeMessage() {
        return this.message.split('').map(ch => this.encodingTable[ch] || '').join('');
    }

    // ─── Búsqueda ───────────────────────────────────────────────────────────────

    /**
     * Busca un carácter en el árbol de Huffman.
     * Recorre el árbol siguiendo el código binario del carácter.
     * @param {string} character - Carácter a buscar.
     * @returns {{found: boolean, steps: Array, code: string|null, error: string|null}}
     */
    search(character) {
        if (!character || character.length === 0) {
            return { found: false, steps: [], code: null, error: 'Debe ingresar un carácter para buscar.' };
        }

        if (character.length > 1) {
            return { found: false, steps: [], code: null, error: 'Solo puede buscar un carácter a la vez.' };
        }

        if (!this.root) {
            return { found: false, steps: [], code: null, error: 'Primero debe generar el árbol.' };
        }

        const code = this.encodingTable[character];
        if (!code && code !== '0') {
            return { found: false, steps: [], code: null, error: `El carácter "${character}" no existe en el árbol.` };
        }

        const steps = [];
        let current = this.root;

        // Caso especial: árbol de un solo carácter
        if (this.root.left && this.root.left.isLeaf && !this.root.right) {
            steps.push({ node: this.root, action: 'visit', bitIndex: 0, bit: '0' });
            steps.push({ node: this.root.left, action: 'found', bitIndex: 0 });
            return { found: true, steps, code, error: null };
        }

        // Seguir el código binario bit a bit desde la raíz
        for (let i = 0; i < code.length; i++) {
            const bit = code[i];
            steps.push({ node: current, action: 'visit', bitIndex: i, bit });

            if (bit === '0') {
                current = current.left;
            } else {
                current = current.right;
            }

            if (!current) {
                return { found: false, steps, code: null, error: 'Error interno: ruta inválida.' };
            }

            if (current.isLeaf && current.key === character) {
                steps.push({ node: current, action: 'found', bitIndex: i });
                return { found: true, steps, code, error: null };
            }
        }

        return { found: false, steps, code: null, error: `El carácter "${character}" no se encontró.` };
    }

    // ─── Acceso a Tablas ────────────────────────────────────────────────────────

    /**
     * Retorna la tabla de codificación como array de objetos {key, code}.
     * Ordenada por longitud de código (más corto primero).
     */
    getEncodingTableArray() {
        return Object.entries(this.encodingTable)
            .map(([key, code]) => ({ key, code }))
            .sort((a, b) => a.code.length - b.code.length || a.key.localeCompare(b.key));
    }

    /**
     * Retorna las tablas de construcción en orden inverso
     * (la última tabla con frecuencia total 1 primero, la tabla inicial de frecuencias al final).
     */
    getConstructionTablesReversed() {
        return [...this.constructionTables].reverse();
    }

    // ─── Serialización ─────────────────────────────────────────────────────────

    toJSON() {
        return {
            type: 'huffman-tree',
            message: this.message
        };
    }

    fromJSON(data) {
        this.reset();
        if (data.message) {
            this.buildTree(data.message);
        }
    }

    // ─── Layout ────────────────────────────────────────────────────────────────

    /**
     * Genera posiciones para renderizado del árbol en canvas.
     * @returns {Array<{node: HuffmanNode, x: number, y: number, parentX: number|null, parentY: number|null, edgeLabel: string|null}>}
     */
    getLayoutNodes() {
        if (!this.root) return [];

        const nodes = [];
        const hGap = 60;
        const vGap = 80;

        let slotIndex = 0;

        const assignPositions = (node, depth) => {
            if (!node) return null;

            const y = depth * vGap;

            // Hoja: asignar slot horizontal
            if (!node.left && !node.right) {
                const x = slotIndex * hGap;
                slotIndex++;
                return { node, x, y };
            }

            const leftInfo = assignPositions(node.left, depth + 1);
            const rightInfo = assignPositions(node.right, depth + 1);

            let x;
            if (leftInfo && rightInfo) {
                x = (leftInfo.x + rightInfo.x) / 2;
            } else if (leftInfo) {
                x = leftInfo.x;
            } else {
                x = rightInfo.x;
            }

            return { node, x, y, leftChild: leftInfo, rightChild: rightInfo };
        };

        const tree = assignPositions(this.root, 0);

        const flatten = (info, parentX, parentY, edgeLabel) => {
            if (!info) return;
            nodes.push({
                node: info.node, x: info.x, y: info.y,
                parentX, parentY, edgeLabel
            });
            if (info.leftChild) flatten(info.leftChild, info.x, info.y, '0');
            if (info.rightChild) flatten(info.rightChild, info.x, info.y, '1');
        };

        flatten(tree, null, null, null);

        // Centrar horizontalmente
        if (nodes.length > 0) {
            const minX = Math.min(...nodes.map(n => n.x));
            const maxX = Math.max(...nodes.map(n => n.x));
            const centerOffset = (minX + maxX) / 2;
            for (const n of nodes) {
                n.x -= centerOffset;
                if (n.parentX !== null) n.parentX -= centerOffset;
            }
        }

        return nodes;
    }
}
