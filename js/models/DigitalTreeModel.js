/**
 * @fileoverview Modelo del Árbol Digital.
 * La clave puede almacenarse en cualquier nodo (raíz, interno u hoja).
 * Recorrido bit a bit: 0 → izquierda, 1 → derecha.
 * @module models/DigitalTreeModel
 */

/**
 * Utilidades compartidas para codificación letra → binario.
 */
const TreeUtils = {
    /**
     * Convierte una letra (A-Z) a su código binario de 5 bits.
     * @param {string} letter - Letra mayúscula.
     * @returns {string} Cadena de 5 caracteres '0'/'1'.
     */
    letterToBinary(letter) {
        const code = letter.toUpperCase().charCodeAt(0) - 64; // A=1 … Z=26
        return code.toString(2).padStart(5, '0');
    },

    /**
     * Convierte código binario de 5 bits a su letra correspondiente.
     * @param {string} binary - Cadena de 5 bits.
     * @returns {string} Letra mayúscula.
     */
    binaryToLetter(binary) {
        return String.fromCharCode(parseInt(binary, 2) + 64);
    },

    /**
     * Valida que el input sea una sola letra A-Z.
     * @param {string} input
     * @returns {{valid: boolean, letter: string|null, error: string|null}}
     */
    validateLetter(input) {
        const trimmed = (input || '').trim().toUpperCase();
        if (trimmed.length === 0) {
            return { valid: false, letter: null, error: 'Debe ingresar una letra.' };
        }
        if (trimmed.length > 1) {
            return { valid: false, letter: null, error: 'Solo se permite una letra a la vez.' };
        }
        if (!/^[A-Z]$/.test(trimmed)) {
            return { valid: false, letter: null, error: 'Solo se permiten letras del abecedario (A-Z).' };
        }
        return { valid: true, letter: trimmed, error: null };
    }
};

// ─── Nodo del Árbol Digital ────────────────────────────────────────────────────

class DigitalTreeNode {
    constructor() {
        /** @type {string|null} Letra almacenada, o null si vacío */
        this.key = null;
        /** @type {DigitalTreeNode|null} Hijo izquierdo (bit 0) */
        this.left = null;
        /** @type {DigitalTreeNode|null} Hijo derecho (bit 1) */
        this.right = null;
    }
}

// ─── Modelo del Árbol Digital ──────────────────────────────────────────────────

class DigitalTreeModel {
    constructor() {
        /** @type {DigitalTreeNode|null} */
        this.root = null;
        /** @type {Set<string>} Conjunto de letras insertadas */
        this.keys = new Set();
        /** @type {string[]} Orden de inserción */
        this.insertionOrder = [];
    }

    /** @returns {boolean} */
    get created() { return this.keys.size > 0; }

    /** Reinicia el árbol. */
    reset() {
        this.root = null;
        this.keys = new Set();
        this.insertionOrder = [];
    }

    /**
     * Inserta una letra en el árbol.
     * @param {string} letter - Letra A-Z.
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

        if (!this.root) {
            this.root = new DigitalTreeNode();
            this.root.key = letter;
            steps.push({ node: this.root, action: 'insert', bitIndex: -1 });
            this.keys.add(letter);
            this.insertionOrder.push(letter);
            return { success: true, steps, error: null };
        }

        let current = this.root;
        let bitIndex = 0;

        while (true) {
            if (current.key === null) {
                // Nodo vacío → insertar aquí
                current.key = letter;
                steps.push({ node: current, action: 'insert', bitIndex });
                this.keys.add(letter);
                this.insertionOrder.push(letter);
                return { success: true, steps, error: null };
            }

            // Nodo ocupado → marcar como visitado y avanzar
            steps.push({ node: current, action: 'visit', bitIndex, bit: binary[bitIndex] });

            if (bitIndex >= binary.length) {
                // Bits agotados — no debería pasar con claves únicas de 5 bits y 26 letras
                return { success: false, steps, error: 'No se pudo insertar: bits agotados.' };
            }

            const bit = binary[bitIndex];
            if (bit === '0') {
                if (!current.left) current.left = new DigitalTreeNode();
                current = current.left;
            } else {
                if (!current.right) current.right = new DigitalTreeNode();
                current = current.right;
            }
            bitIndex++;
        }
    }

    /**
     * Busca una letra en el árbol.
     * @param {string} letter
     * @returns {{found: boolean, steps: Array, error: string|null}}
     */
    search(letter) {
        const v = TreeUtils.validateLetter(letter);
        if (!v.valid) return { found: false, steps: [], error: v.error };

        letter = v.letter;
        const binary = TreeUtils.letterToBinary(letter);
        const steps = [];

        if (!this.root) {
            return { found: false, steps, error: null };
        }

        let current = this.root;
        let bitIndex = 0;

        while (current) {
            if (current.key === letter) {
                steps.push({ node: current, action: 'found', bitIndex });
                return { found: true, steps, error: null };
            }

            steps.push({ node: current, action: 'visit', bitIndex, bit: bitIndex < binary.length ? binary[bitIndex] : null });

            if (bitIndex >= binary.length) break;

            const bit = binary[bitIndex];
            current = bit === '0' ? current.left : current.right;
            bitIndex++;
        }

        // Marcar último paso como no encontrado
        if (steps.length > 0) {
            steps[steps.length - 1].action = 'not-found';
        }
        return { found: false, steps, error: null };
    }

    /**
     * Elimina una letra del árbol.
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

        // Localizar el nodo y su padre
        let current = this.root;
        let parent = null;
        let parentDir = null; // 'left' | 'right'
        let bitIndex = 0;

        while (current) {
            if (current.key === letter) {
                steps.push({ node: current, action: 'found', bitIndex });
                break;
            }
            steps.push({ node: current, action: 'visit', bitIndex, bit: binary[bitIndex] });
            parent = current;
            if (bitIndex < binary.length) {
                const bit = binary[bitIndex];
                parentDir = bit === '0' ? 'left' : 'right';
                current = bit === '0' ? current.left : current.right;
            } else {
                current = null;
            }
            bitIndex++;
        }

        if (!current || current.key !== letter) {
            return { success: false, steps, error: `La clave "${letter}" no se encontró.` };
        }

        // Caso 1: Nodo hoja (sin hijos)
        if (!current.left && !current.right) {
            if (parent) {
                parent[parentDir] = null;
            } else {
                this.root = null;
            }
            steps.push({ node: current, action: 'delete-leaf', bitIndex });
        }
        // Caso 2: Nodo con hijos — reemplazar con el nodo más profundo
        else {
            const replacement = this._findDeepestLeaf(current);
            const replacementKey = replacement.key;
            // Delete the replacement from its position
            this._removeNode(current, replacement);
            current.key = replacementKey;
            steps.push({ node: current, action: 'replace', newKey: replacementKey, bitIndex });
        }

        this.keys.delete(letter);
        this.insertionOrder = this.insertionOrder.filter(l => l !== letter);

        // Limpiar ramas vacías (nodos sin clave y sin hijos)
        this._pruneEmpty(this.root, null, null);

        return { success: true, steps, error: null };
    }

    /**
     * Encuentra la hoja más profunda en un subárbol para reemplazar un nodo eliminado.
     * @private
     */
    _findDeepestLeaf(node) {
        let deepest = null;
        let maxDepth = -1;

        const dfs = (n, depth) => {
            if (!n) return;
            if (n.key !== null && !n.left && !n.right && n !== node) {
                if (depth > maxDepth) {
                    maxDepth = depth;
                    deepest = n;
                }
            }
            // Preferir subárbol que tenga hojas
            if (n.left) dfs(n.left, depth + 1);
            if (n.right) dfs(n.right, depth + 1);
        };

        // Buscar en los hijos del nodo
        dfs(node.left, 1);
        dfs(node.right, 1);

        // Si no se encontró hoja sin clave, buscar cualquier nodo con clave
        if (!deepest) {
            const dfs2 = (n, depth) => {
                if (!n || n === node) return;
                if (n.key !== null) {
                    if (depth > maxDepth) {
                        maxDepth = depth;
                        deepest = n;
                    }
                }
                if (n.left) dfs2(n.left, depth + 1);
                if (n.right) dfs2(n.right, depth + 1);
            };
            dfs2(node.left, 1);
            dfs2(node.right, 1);
        }

        return deepest;
    }

    /**
     * Elimina un nodo específico del subárbol.
     * @private
     */
    _removeNode(subtreeRoot, targetNode) {
        const dfs = (n) => {
            if (!n) return false;
            if (n.left === targetNode) {
                if (!targetNode.left && !targetNode.right) {
                    n.left = null;
                } else {
                    targetNode.key = null;
                }
                return true;
            }
            if (n.right === targetNode) {
                if (!targetNode.left && !targetNode.right) {
                    n.right = null;
                } else {
                    targetNode.key = null;
                }
                return true;
            }
            return dfs(n.left) || dfs(n.right);
        };
        dfs(subtreeRoot);
    }

    /**
     * Elimina nodos vacíos (sin clave ni hijos) del árbol.
     * @private
     */
    _pruneEmpty(node, parent, dir) {
        if (!node) return;
        this._pruneEmpty(node.left, node, 'left');
        this._pruneEmpty(node.right, node, 'right');

        if (node.key === null && !node.left && !node.right) {
            if (parent) {
                parent[dir] = null;
            } else if (node === this.root) {
                this.root = null;
            }
        }
    }

    // ─── Serialización ─────────────────────────────────────────────────────────

    /**
     * Serializa el árbol a JSON.
     * @returns {Object}
     */
    toJSON() {
        return {
            type: 'digital-tree',
            insertionOrder: [...this.insertionOrder]
        };
    }

    /**
     * Reconstruye el árbol desde JSON.
     * @param {Object} data
     */
    fromJSON(data) {
        this.reset();
        if (data.insertionOrder) {
            for (const letter of data.insertionOrder) {
                this.insert(letter);
            }
        }
    }

    // ─── Utilidad para layout ──────────────────────────────────────────────────

    /**
     * Recorre el árbol y genera posiciones para el renderizado.
     * Uses a slot-based layout: each leaf gets a unique horizontal slot,
     * parent nodes are centered above their children. This prevents overlap.
     * @returns {Array<{node: DigitalTreeNode, x: number, y: number, parentX: number|null, parentY: number|null, edgeLabel: string|null}>}
     */
    getLayoutNodes() {
        if (!this.root) return [];

        const nodes = [];
        const hGap = 60;
        const vGap = 70;

        // Count leaves in subtree
        const leafCount = (node) => {
            if (!node) return 0;
            if (!node.left && !node.right) return 1;
            return leafCount(node.left) + leafCount(node.right);
        };

        // Assign positions: each leaf gets a slot, parents are centered
        let slotIndex = 0;

        const assignPositions = (node, depth) => {
            if (!node) return null;

            const y = depth * vGap;

            // Leaf node — assign the next horizontal slot
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

        // Flatten into array with parent info
        const flatten = (info, parentX, parentY, edgeLabel) => {
            if (!info) return;
            nodes.push({
                node: info.node,
                x: info.x,
                y: info.y,
                parentX,
                parentY,
                edgeLabel
            });
            if (info.leftChild) flatten(info.leftChild, info.x, info.y, '0');
            if (info.rightChild) flatten(info.rightChild, info.x, info.y, '1');
        };

        flatten(tree, null, null, null);

        // Center the tree horizontally around 0
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
