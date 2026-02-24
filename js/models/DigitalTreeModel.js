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

        const ghost = () => ({ key: null, isGhost: true, left: null, right: null });

        let slotIndex = 0;

        const assignPositions = (node, depth) => {
            if (!node) return null;

            const y = depth * vGap;

            if (!node.left && !node.right) {
                const x = slotIndex * hGap;
                slotIndex++;
                return { node, x, y };
            }

            const hasLeft = !!node.left;
            const hasRight = !!node.right;

            const leftInfo = assignPositions(hasLeft ? node.left : ghost(), depth + 1);
            const rightInfo = assignPositions(hasRight ? node.right : ghost(), depth + 1);

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
