/**
 * @fileoverview Modelo del Árbol por Residuos.
 * Nodos internos = nodos de enlace (vacíos). Hojas = nodos de información (con clave).
 * @module models/ResidueTreeModel
 */

class ResidueTreeNode {
    constructor() {
        /** @type {string|null} Clave, solo en hojas */
        this.key = null;
        /** @type {boolean} true si es nodo de enlace (interno) */
        this.isLink = false;
        /** @type {ResidueTreeNode|null} */
        this.left = null;
        /** @type {ResidueTreeNode|null} */
        this.right = null;
    }

    /** @returns {boolean} true si es hoja con datos */
    get isLeaf() { return this.key !== null && !this.isLink; }
}

class ResidueTreeModel {
    constructor() {
        /** @type {ResidueTreeNode|null} Raíz siempre es nodo de enlace */
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
        const steps = [];

        // Primer nodo: raíz enlace + hoja
        if (!this.root) {
            this.root = new ResidueTreeNode();
            this.root.isLink = true;

            const bit = binary[0];
            const leaf = new ResidueTreeNode();
            leaf.key = letter;

            steps.push({ node: this.root, action: 'visit-link', bitIndex: 0, bit });

            if (bit === '0') {
                this.root.left = leaf;
            } else {
                this.root.right = leaf;
            }

            steps.push({ node: leaf, action: 'insert', bitIndex: 0 });
            this.keys.add(letter);
            this.insertionOrder.push(letter);
            return { success: true, steps, error: null };
        }

        // Recorrer el árbol
        let current = this.root;
        let bitIndex = 0;

        while (bitIndex < binary.length) {
            const bit = binary[bitIndex];
            steps.push({ node: current, action: 'visit-link', bitIndex, bit });

            const child = bit === '0' ? current.left : current.right;

            // Posición vacía → crear hoja
            if (!child) {
                const leaf = new ResidueTreeNode();
                leaf.key = letter;
                if (bit === '0') current.left = leaf;
                else current.right = leaf;
                steps.push({ node: leaf, action: 'insert', bitIndex });
                this.keys.add(letter);
                this.insertionOrder.push(letter);
                return { success: true, steps, error: null };
            }

            // Colisión con hoja existente
            if (child.isLeaf) {
                steps.push({ node: child, action: 'collision', bitIndex });
                const existingKey = child.key;
                const existingBinary = TreeUtils.letterToBinary(existingKey);

                // Transformar hoja en nodo enlace y re-insertar ambas claves
                child.key = null;
                child.isLink = true;

                let splitNode = child;
                let splitBit = bitIndex + 1;

                // Construir caminos compartidos hasta que los bits difieran
                while (splitBit < binary.length && splitBit < existingBinary.length &&
                    binary[splitBit] === existingBinary[splitBit]) {
                    const sharedBit = binary[splitBit];
                    const linkNode = new ResidueTreeNode();
                    linkNode.isLink = true;
                    if (sharedBit === '0') splitNode.left = linkNode;
                    else splitNode.right = linkNode;
                    steps.push({ node: linkNode, action: 'create-link', bitIndex: splitBit, bit: sharedBit });
                    splitNode = linkNode;
                    splitBit++;
                }

                // Bifurcar
                if (splitBit < binary.length && splitBit < existingBinary.length) {
                    const newLeaf = new ResidueTreeNode();
                    newLeaf.key = letter;
                    const oldLeaf = new ResidueTreeNode();
                    oldLeaf.key = existingKey;

                    if (binary[splitBit] === '0') {
                        splitNode.left = newLeaf;
                        splitNode.right = oldLeaf;
                    } else {
                        splitNode.right = newLeaf;
                        splitNode.left = oldLeaf;
                    }

                    steps.push({ node: newLeaf, action: 'insert', bitIndex: splitBit });
                    steps.push({ node: oldLeaf, action: 'reinsert', bitIndex: splitBit, key: existingKey });
                }

                this.keys.add(letter);
                this.insertionOrder.push(letter);
                return { success: true, steps, error: null };
            }

            // Es nodo enlace → seguir bajando
            current = child;
            bitIndex++;
        }

        return { success: false, steps, error: 'No se pudo insertar: bits agotados.' };
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
        const steps = [];

        if (!this.root) return { found: false, steps, error: null };

        let current = this.root;
        let bitIndex = 0;

        while (current && bitIndex <= binary.length) {
            if (current.isLeaf) {
                if (current.key === letter) {
                    steps.push({ node: current, action: 'found', bitIndex });
                    return { found: true, steps, error: null };
                } else {
                    steps.push({ node: current, action: 'not-found', bitIndex });
                    return { found: false, steps, error: null };
                }
            }

            if (bitIndex >= binary.length) break;

            const bit = binary[bitIndex];
            steps.push({ node: current, action: 'visit-link', bitIndex, bit });
            current = bit === '0' ? current.left : current.right;
            bitIndex++;
        }

        if (steps.length > 0) steps[steps.length - 1].action = 'not-found';
        return { found: false, steps, error: null };
    }

    /**
     * Elimina una letra.
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

        const binary = TreeUtils.letterToBinary(letter);
        const steps = [];

        // Construir camino al nodo
        const path = []; // {node, parent, dir}
        let current = this.root;
        let bitIndex = 0;

        while (current) {
            if (current.isLeaf && current.key === letter) {
                steps.push({ node: current, action: 'found', bitIndex });
                break;
            }

            if (bitIndex >= binary.length) break;
            const bit = binary[bitIndex];
            steps.push({ node: current, action: 'visit-link', bitIndex, bit });

            const dir = bit === '0' ? 'left' : 'right';
            path.push({ node: current, dir });
            current = current[dir];
            bitIndex++;
        }

        if (!current || !current.isLeaf || current.key !== letter) {
            return { success: false, steps, error: `No se encontró la clave "${letter}".` };
        }

        // Eliminar la hoja
        if (path.length === 0) {
            // Era la raíz — no debería pasar porque raíz siempre es enlace
            this.root = null;
        } else {
            const parentInfo = path[path.length - 1];
            parentInfo.node[parentInfo.dir] = null;
            steps.push({ node: current, action: 'delete-leaf', bitIndex });

            // Simplificar: si el padre enlace tiene solo un hijo ahora,
            // y ese hijo es hoja, eliminar el enlace y subir la hoja
            this._simplifyChain(path, steps);
        }

        this.keys.delete(letter);
        this.insertionOrder = this.insertionOrder.filter(l => l !== letter);
        return { success: true, steps, error: null };
    }

    /**
     * Simplifica cadena de nodos enlace redundantes.
     * @private
     */
    _simplifyChain(path, steps) {
        for (let i = path.length - 1; i >= 0; i--) {
            const { node } = path[i];
            if (!node.isLink) continue;

            const leftChild = node.left;
            const rightChild = node.right;

            // Si ambos hijos son null, eliminar este enlace
            if (!leftChild && !rightChild) {
                if (i > 0) {
                    path[i - 1].node[path[i - 1].dir] = null;
                } else {
                    // Es la raíz
                    this.root = null;
                }
                steps.push({ node, action: 'remove-link' });
                continue;
            }

            // Si solo tiene un hijo y ese hijo es hoja, promoverlo
            if (!leftChild && rightChild && rightChild.isLeaf) {
                if (i > 0) {
                    path[i - 1].node[path[i - 1].dir] = rightChild;
                } else {
                    // Nodo raíz no se reemplaza por hoja, se mantiene como enlace
                    // pero si es raíz, dejamos la hoja como hijo
                    break;
                }
                steps.push({ node, action: 'simplify', promoted: rightChild.key });
                continue;
            }

            if (leftChild && !rightChild && leftChild.isLeaf) {
                if (i > 0) {
                    path[i - 1].node[path[i - 1].dir] = leftChild;
                } else {
                    break;
                }
                steps.push({ node, action: 'simplify', promoted: leftChild.key });
                continue;
            }

            // Si tiene dos hijos o un hijo interno, no se puede simplificar más
            break;
        }
    }

    // ─── Serialización ─────────────────────────────────────────────────────────

    toJSON() {
        return {
            type: 'residue-tree',
            insertionOrder: [...this.insertionOrder]
        };
    }

    fromJSON(data) {
        this.reset();
        if (data.insertionOrder) {
            for (const letter of data.insertionOrder) {
                this.insert(letter);
            }
        }
    }

    // ─── Layout ────────────────────────────────────────────────────────────────

    getLayoutNodes() {
        if (!this.root) return [];

        const nodes = [];
        const hGap = 60;
        const vGap = 70;

        let slotIndex = 0;

        const assignPositions = (node, depth) => {
            if (!node) return null;

            const y = depth * vGap;

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
