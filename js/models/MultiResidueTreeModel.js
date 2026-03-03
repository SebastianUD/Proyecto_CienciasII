/**
 * @fileoverview Modelo del Árbol por Residuos Múltiples.
 * Consume bits en bloques de m (m=2..5 → 4..32 salidas por nodo).
 * Las claves siempre llegan a nodos hoja (profundidad máxima según m).
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
        /** @type {boolean} */
        this.isGhost = false;
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

    /** Total de niveles internos (link levels) en el árbol */
    get _totalDepth() {
        return Math.ceil(5 / this.m);
    }

    reset() {
        this.root = null;
        this.keys = new Set();
        this.insertionOrder = [];
    }

    /**
     * Divide el binario en bloques de m bits.
     * El último bloque se rellena con ceros a la derecha si es necesario
     * para tener exactamente m bits, garantizando profundidad uniforme.
     * @param {string} binary
     * @returns {string[]}
     */
    _getBlocks(binary) {
        const blocks = [];
        for (let i = 0; i < binary.length; i += this.m) {
            let block = binary.substring(i, i + this.m);
            // Pad the last block to m bits for uniform depth
            if (block.length < this.m) {
                block = block.padEnd(this.m, '0');
            }
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
     * Inserta una letra. La clave siempre llega a la profundidad máxima (nodo hoja).
     * Se crean nodos de enlace intermedios según sea necesario.
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

        // Create root if needed
        if (!this.root) {
            this.root = new MultiResidueTreeNode(this.m);
            this.root.isLink = true;
        }

        let current = this.root;

        // Traverse all blocks — keys always go to the deepest level
        for (let blockIndex = 0; blockIndex < blocks.length; blockIndex++) {
            const block = blocks[blockIndex];
            const idx = this._blockToIndex(block);
            const isLastBlock = blockIndex === blocks.length - 1;

            steps.push({ node: current, action: 'visit-link', blockIndex, block });

            const child = current.children[idx];

            if (isLastBlock) {
                // Last block — place the key here as a leaf
                if (!child) {
                    const leaf = new MultiResidueTreeNode(this.m);
                    leaf.key = letter;
                    current.children[idx] = leaf;
                    steps.push({ node: leaf, action: 'insert', blockIndex });
                } else if (child.isLeaf && child.key === null) {
                    // Ghost node — fill it with the key
                    child.key = letter;
                    child.isGhost = false;
                    steps.push({ node: child, action: 'insert', blockIndex });
                } else {
                    // Should not happen with valid 5-bit unique keys
                    return { success: false, steps, error: 'Conflicto en posición hoja.' };
                }
            } else {
                // Not the last block — need a link node here
                if (!child) {
                    const linkNode = new MultiResidueTreeNode(this.m);
                    linkNode.isLink = true;
                    current.children[idx] = linkNode;
                    steps.push({ node: linkNode, action: 'create-link', blockIndex, block });
                    current = linkNode;
                } else if (child.isLeaf) {
                    // There's a leaf here but we need to go deeper
                    // This shouldn't happen since all keys go to max depth
                    // But handle gracefully: convert to link and push existing key down
                    const existingKey = child.key;
                    child.key = null;
                    child.isLink = true;
                    child.isGhost = false;
                    steps.push({ node: child, action: 'collision', blockIndex });

                    // Re-insert the existing key from this point down
                    if (existingKey) {
                        const existingBinary = TreeUtils.letterToBinary(existingKey);
                        const existingBlocks = this._getBlocks(existingBinary);
                        let reinsertNode = child;
                        for (let ri = blockIndex + 1; ri < existingBlocks.length; ri++) {
                            const reBlock = existingBlocks[ri];
                            const reIdx = this._blockToIndex(reBlock);
                            const isReLast = ri === existingBlocks.length - 1;
                            if (isReLast) {
                                const reLeaf = new MultiResidueTreeNode(this.m);
                                reLeaf.key = existingKey;
                                reinsertNode.children[reIdx] = reLeaf;
                                steps.push({ node: reLeaf, action: 'reinsert', blockIndex: ri, key: existingKey });
                            } else {
                                const reLinkNode = new MultiResidueTreeNode(this.m);
                                reLinkNode.isLink = true;
                                reinsertNode.children[reIdx] = reLinkNode;
                                reinsertNode = reLinkNode;
                            }
                        }
                    }
                    current = child;
                } else {
                    // It's already a link node — just descend
                    current = child;
                }
            }
        }

        this.keys.add(letter);
        this.insertionOrder.push(letter);
        return { success: true, steps, error: null };
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

        for (let blockIndex = 0; blockIndex < blocks.length; blockIndex++) {
            const block = blocks[blockIndex];
            const idx = this._blockToIndex(block);

            steps.push({ node: current, action: 'visit-link', blockIndex, block });

            const child = current.children[idx];

            if (!child) {
                steps[steps.length - 1].action = 'not-found';
                return { found: false, steps, error: null };
            }

            if (child.isLeaf) {
                if (child.key === letter) {
                    steps.push({ node: child, action: 'found', blockIndex });
                    return { found: true, steps, error: null };
                } else {
                    steps.push({ node: child, action: 'not-found', blockIndex });
                    return { found: false, steps, error: null };
                }
            }

            // Ghost node check
            if (child.isGhost) {
                steps.push({ node: child, action: 'not-found', blockIndex });
                return { found: false, steps, error: null };
            }

            current = child;
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

        const edgeLabels = this._getEdgeLabels();

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

            const childInfos = [];
            for (let i = 0; i < node.children.length; i++) {
                if (node.children[i]) {
                    childInfos.push({
                        info: assignPositions(node.children[i], depth + 1),
                        label: edgeLabels[i] || i.toString(2)
                    });
                }
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
