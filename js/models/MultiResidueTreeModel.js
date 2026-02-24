/**
 * @fileoverview Modelo del Árbol por Residuos Múltiples.
 * Consume bits en bloques de m (por defecto m=2 → 4 salidas por nodo).
 * @module models/MultiResidueTreeModel
 */

class MultiResidueTreeNode {
    /**
     * @param {number} m - Cantidad de bits por bloque.
     */
    constructor(m = 2) {
        /** @type {string|null} Clave, solo en hojas */
        this.key = null;
        /** @type {boolean} */
        this.isLink = false;
        /** @type {number} Bits por bloque */
        this.m = m;
        /** @type {(MultiResidueTreeNode|null)[]} Hijos indexados por valor del bloque */
        this.children = new Array(Math.pow(2, m)).fill(null);
    }

    get isLeaf() { return this.key !== null && !this.isLink; }

    /** Cuenta cuántos hijos no-null tiene */
    get childCount() { return this.children.filter(c => c !== null).length; }
}

class MultiResidueTreeModel {
    /**
     * @param {number} m - Bits por bloque (default 2).
     */
    constructor(m = 2) {
        /** @type {number} */
        this.m = m;
        /** @type {number} */
        this.branches = Math.pow(2, m);
        /** @type {MultiResidueTreeNode|null} */
        this.root = null;
        /** @type {Set<string>} */
        this.keys = new Set();
        /** @type {string[]} */
        this.insertionOrder = [];
    }

    get created() { return this.keys.size > 0; }

    reset() {
        this.root = null;
        this.keys = new Set();
        this.insertionOrder = [];
    }

    /**
     * Divide el binario en bloques de m bits.
     * El último bloque puede tener menos de m bits (ej: 1 bit para claves de 5 bits con m=2).
     * @param {string} binary
     * @returns {string[]}
     */
    _getBlocks(binary) {
        const blocks = [];
        for (let i = 0; i < binary.length; i += this.m) {
            let block = binary.substring(i, i + this.m);
            // Do NOT pad the last block — with 5-bit keys and m=2,
            // the last block is just 1 bit (0 or 1).
            blocks.push(block);
        }
        return blocks;
    }

    /**
     * Convierte bloque de bits a índice numérico.
     * @param {string} block
     * @returns {number}
     */
    _blockToIndex(block) {
        return parseInt(block, 2);
    }

    /**
     * Inserta una letra.
     * @param {string} letter
     * @returns {{success: boolean, steps: Array, error: string|null}}
     */
    insert(letter) {
        const v = TreeUtils.validateLetter(letter);
        if (!v.valid) return { success: false, steps: [], error: v.error };
        letter = v.letter;

        if (this.keys.has(letter)) {
            return { success: false, steps: [], error: `La clave "${letter}" ya existe en el árbol.` };
        }

        const binary = TreeUtils.letterToBinary(letter);
        const blocks = this._getBlocks(binary);
        const steps = [];

        // Primer nodo
        if (!this.root) {
            this.root = new MultiResidueTreeNode(this.m);
            this.root.isLink = true;

            const idx = this._blockToIndex(blocks[0]);
            const leaf = new MultiResidueTreeNode(this.m);
            leaf.key = letter;
            this.root.children[idx] = leaf;

            steps.push({ node: this.root, action: 'visit-link', blockIndex: 0, block: blocks[0] });
            steps.push({ node: leaf, action: 'insert', blockIndex: 0 });

            this.keys.add(letter);
            this.insertionOrder.push(letter);
            return { success: true, steps, error: null };
        }

        let current = this.root;
        let blockIndex = 0;

        while (blockIndex < blocks.length) {
            const block = blocks[blockIndex];
            const idx = this._blockToIndex(block);
            steps.push({ node: current, action: 'visit-link', blockIndex, block });

            const child = current.children[idx];

            // Vacío → crear hoja
            if (!child) {
                const leaf = new MultiResidueTreeNode(this.m);
                leaf.key = letter;
                current.children[idx] = leaf;
                steps.push({ node: leaf, action: 'insert', blockIndex });
                this.keys.add(letter);
                this.insertionOrder.push(letter);
                return { success: true, steps, error: null };
            }

            // Colisión con hoja
            if (child.isLeaf) {
                steps.push({ node: child, action: 'collision', blockIndex });
                const existingKey = child.key;
                const existingBinary = TreeUtils.letterToBinary(existingKey);
                const existingBlocks = this._getBlocks(existingBinary);

                // Transformar en enlace
                child.key = null;
                child.isLink = true;

                let splitNode = child;
                let splitIdx = blockIndex + 1;

                // Compartir bloques iguales
                while (splitIdx < blocks.length && splitIdx < existingBlocks.length &&
                    blocks[splitIdx] === existingBlocks[splitIdx]) {
                    const sharedBlock = blocks[splitIdx];
                    const sharedChildIdx = this._blockToIndex(sharedBlock);
                    const linkNode = new MultiResidueTreeNode(this.m);
                    linkNode.isLink = true;
                    splitNode.children[sharedChildIdx] = linkNode;
                    steps.push({ node: linkNode, action: 'create-link', blockIndex: splitIdx, block: sharedBlock });
                    splitNode = linkNode;
                    splitIdx++;
                }

                // Bifurcar
                if (splitIdx < blocks.length && splitIdx < existingBlocks.length) {
                    const newLeaf = new MultiResidueTreeNode(this.m);
                    newLeaf.key = letter;
                    const oldLeaf = new MultiResidueTreeNode(this.m);
                    oldLeaf.key = existingKey;

                    splitNode.children[this._blockToIndex(blocks[splitIdx])] = newLeaf;
                    splitNode.children[this._blockToIndex(existingBlocks[splitIdx])] = oldLeaf;

                    steps.push({ node: newLeaf, action: 'insert', blockIndex: splitIdx });
                    steps.push({ node: oldLeaf, action: 'reinsert', blockIndex: splitIdx, key: existingKey });
                }

                this.keys.add(letter);
                this.insertionOrder.push(letter);
                return { success: true, steps, error: null };
            }

            // Enlace → bajar
            current = child;
            blockIndex++;
        }

        return { success: false, steps, error: 'No se pudo insertar: bloques agotados.' };
    }

    /**
     * Busca una letra.
     * @param {string} letter
     * @returns {{found: boolean, steps: Array, error: string|null}}
     */
    search(letter) {
        const v = TreeUtils.validateLetter(letter);
        if (!v.valid) return { found: false, steps: [], error: v.error };
        letter = v.letter;

        const binary = TreeUtils.letterToBinary(letter);
        const blocks = this._getBlocks(binary);
        const steps = [];

        if (!this.root) return { found: false, steps, error: null };

        let current = this.root;
        let blockIndex = 0;

        while (current && blockIndex <= blocks.length) {
            if (current.isLeaf) {
                if (current.key === letter) {
                    steps.push({ node: current, action: 'found', blockIndex });
                    return { found: true, steps, error: null };
                } else {
                    steps.push({ node: current, action: 'not-found', blockIndex });
                    return { found: false, steps, error: null };
                }
            }

            if (blockIndex >= blocks.length) break;

            const block = blocks[blockIndex];
            const idx = this._blockToIndex(block);
            steps.push({ node: current, action: 'visit-link', blockIndex, block });
            current = current.children[idx];
            blockIndex++;
        }

        if (steps.length > 0) steps[steps.length - 1].action = 'not-found';
        return { found: false, steps, error: null };
    }

    /**
     * Elimina una letra reconstruyendo el árbol sin ella.
     * @param {string} letter
     * @returns {{success: boolean, steps: Array, error: string|null}}
     */
    delete(letter) {
        const v = TreeUtils.validateLetter(letter);
        if (!v.valid) return { success: false, steps: [], error: v.error };
        letter = v.letter;

        if (!this.keys.has(letter)) {
            return { success: false, steps: [], error: `La clave "${letter}" no existe en el árbol.` };
        }

        const newOrder = this.insertionOrder.filter(l => l !== letter);
        this.root = null;
        this.keys = new Set();
        this.insertionOrder = [];
        for (const l of newOrder) this.insert(l);

        return { success: true, steps: [], error: null };
    }

    // ─── Serialización ─────────────────────────────────────────────────────────

    toJSON() {
        return {
            type: 'multi-residue-tree',
            m: this.m,
            insertionOrder: [...this.insertionOrder]
        };
    }

    fromJSON(data) {
        this.reset();
        if (data.m) this.m = data.m;
        this.branches = Math.pow(2, this.m);
        if (data.insertionOrder) {
            for (const letter of data.insertionOrder) {
                this.insert(letter);
            }
        }
    }

    // ─── Layout ────────────────────────────────────────────────────────────────

    /**
     * Genera etiquetas para las aristas (bloques de bits).
     */
    _getEdgeLabels() {
        const labels = [];
        for (let i = 0; i < this.branches; i++) {
            labels.push(i.toString(2).padStart(this.m, '0'));
        }
        return labels;
    }

    getLayoutNodes() {
        if (!this.root) return [];

        const nodes = [];
        const hGap = 60;
        const vGap = 80;
        const totalBits = 5; // Letters A-Z use 5-bit codes

        // Compute the block size and edge labels at each depth
        const getBlockSizeAtDepth = (depth) => {
            const bitStart = depth * this.m;
            const remaining = totalBits - bitStart;
            if (remaining <= 0) return 0;
            return Math.min(this.m, remaining);
        };

        const getEdgeLabelsAtDepth = (depth) => {
            const blockSize = getBlockSizeAtDepth(depth);
            const count = Math.pow(2, blockSize);
            const labels = [];
            for (let i = 0; i < count; i++) {
                labels.push(i.toString(2).padStart(blockSize, '0'));
            }
            return labels;
        };

        let slotIndex = 0;

        const assignPositions = (node, depth) => {
            if (!node) return null;

            const y = depth * vGap;

            // Leaf — assign next slot
            if (node.isLeaf) {
                const x = slotIndex * hGap;
                slotIndex++;
                return { node, x, y, childInfos: [] };
            }

            const depthLabels = getEdgeLabelsAtDepth(depth);
            const childInfos = [];
            for (let i = 0; i < node.children.length; i++) {
                childInfos.push({
                    info: assignPositions(node.children[i], depth + 1),
                    label: depthLabels[i] || i.toString(2)
                });
            }

            const validChildren = childInfos.filter(c => c.info !== null);
            let x;
            if (validChildren.length > 0) {
                const xs = validChildren.map(c => c.info.x);
                x = (Math.min(...xs) + Math.max(...xs)) / 2;
            } else {
                x = slotIndex * hGap;
                slotIndex++;
            }

            return { node, x, y, childInfos };
        };

        const tree = assignPositions(this.root, 0);

        const flatten = (info, parentX, parentY, edgeLabel) => {
            if (!info) return;
            nodes.push({
                node: info.node, x: info.x, y: info.y,
                parentX, parentY, edgeLabel
            });
            if (info.childInfos) {
                for (const ci of info.childInfos) {
                    if (ci.info) flatten(ci.info, info.x, info.y, ci.label);
                }
            }
        };

        flatten(tree, null, null, null);

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
