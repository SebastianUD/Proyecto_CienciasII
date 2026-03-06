/**
 * @fileoverview Modelo de estructura de cubetas/bloques para búsqueda hash externa.
 * Gestiona cubetas con bloques de tamaño fijo y un área de colisiones dinámica.
 * @module models/HashBucketStructure
 */

/**
 * Estructura de cubetas con bloques para búsqueda hash externa.
 */
class HashBucketStructure {
    constructor() {
        this.reset();
    }

    /** Reinicia todos los campos. */
    reset() {
        /** @type {number} Número de cubetas (rango del hash) */
        this.numBuckets = 0;
        /** @type {number} Bloques máximos por cubeta */
        this.blocksPerBucket = 0;
        /** @type {number} Claves máximas por bloque */
        this.keysPerBlock = 0;
        /** @type {number} Longitud de cada clave */
        this.keyLength = 0;
        /** @type {string} Tipo de dato */
        this.dataType = '';
        /** @type {string} 'secuencial' o 'binaria' */
        this.searchMode = 'secuencial';
        /** @type {boolean} */
        this.created = false;
        /** @type {number} Total de claves insertadas */
        this.count = 0;
        /**
         * Arreglo de cubetas. Cada cubeta:
         * { blocks: Array<{keys: string[], count: number}>, collisionBlock: {keys: string[], count: number} | null }
         * @type {Array<Object>}
         */
        this.buckets = [];
        /** @type {string} Método hash */
        this.hashMethod = 'modulo';
        /** @type {number} Base para conversión de base */
        this.hashBase = 0;
    }

    /**
     * Crea la estructura.
     * @param {Object} config
     */
    create(config) {
        this.numBuckets = config.numBuckets;
        this.blocksPerBucket = config.blocksPerBucket;
        this.keysPerBlock = config.keysPerBlock;
        this.keyLength = config.keyLength;
        this.dataType = config.dataType;
        this.searchMode = config.searchMode || 'secuencial';
        this.hashMethod = config.hashMethod || 'modulo';
        this.hashBase = config.hashBase || 0;
        this.created = true;
        this.count = 0;

        // Inicializar cubetas vacías (sin bloques hasta que se inserte)
        this.buckets = [];
        for (let i = 0; i < this.numBuckets; i++) {
            this.buckets.push({ blocks: [], collisionBlock: null });
        }
    }

    // ──────────────────────────────────────────
    // Key Validation (reutiliza lógica de DataStructure)
    // ──────────────────────────────────────────

    /**
     * Valida y normaliza una clave.
     * @param {string} rawKey
     * @returns {{valid: boolean, key: string|null, error: string|null}}
     */
    validateKey(rawKey) {
        if (rawKey === undefined || rawKey === null || rawKey.toString().trim() === '') {
            return { valid: false, key: null, error: 'Debe ingresar una clave.' };
        }

        let key = rawKey.toString().trim();

        if (this.dataType === 'numerico') {
            if (!/^\d+$/.test(key)) {
                return { valid: false, key: null, error: 'La clave debe ser numérica.' };
            }
            if (key.length < this.keyLength) {
                key = key.padStart(this.keyLength, '0');
            }
        } else if (this.dataType === 'texto') {
            if (!/^[a-zA-ZáéíóúñÁÉÍÓÚÑüÜ\s]+$/.test(key)) {
                return { valid: false, key: null, error: 'La clave debe contener solo letras.' };
            }
        } else if (this.dataType === 'alfanumerico') {
            if (!/^[a-zA-Z0-9áéíóúñÁÉÍÓÚÑüÜ]+$/.test(key)) {
                return { valid: false, key: null, error: 'La clave debe ser alfanumérica.' };
            }
        }

        if (key.length !== this.keyLength) {
            if (this.dataType === 'numerico' && key.length > this.keyLength) {
                return { valid: false, key: null, error: `La clave numérica excede el tamaño de ${this.keyLength} dígitos.` };
            } else if (this.dataType !== 'numerico') {
                return { valid: false, key: null, error: `El tamaño de la clave debe ser exactamente ${this.keyLength} carácter(es).` };
            }
        }

        // No duplicados
        if (this._findKeyGlobal(key)) {
            return { valid: false, key: null, error: `La clave "${key}" ya existe. No se permiten claves repetidas.` };
        }

        return { valid: true, key, error: null };
    }

    /** Busca una clave en toda la estructura (para validación de duplicados). */
    _findKeyGlobal(key) {
        for (const bucket of this.buckets) {
            for (const block of bucket.blocks) {
                if (block.keys.includes(key)) return true;
            }
            if (bucket.collisionBlock && bucket.collisionBlock.keys.includes(key)) return true;
        }
        return false;
    }

    // ──────────────────────────────────────────
    // Key comparison
    // ──────────────────────────────────────────

    _compareKeys(a, b) {
        if (this.dataType === 'numerico') {
            if (a < b) return -1;
            if (a > b) return 1;
            return 0;
        }
        for (let i = 0; i < Math.min(a.length, b.length); i++) {
            const diff = a.charCodeAt(i) - b.charCodeAt(i);
            if (diff !== 0) return diff;
        }
        return a.length - b.length;
    }

    // ──────────────────────────────────────────
    // Hash Calculation (delegates to DataStructure logic)
    // ──────────────────────────────────────────

    getNumericValue(key) {
        if (this.dataType === 'numerico') return parseInt(key, 10);
        let sum = 0;
        for (let i = 0; i < key.length; i++) sum += key.charCodeAt(i);
        return sum;
    }

    /**
     * Calcula la posición de cubeta (0-indexed) para una clave.
     * @param {string} key - Clave normalizada.
     * @returns {{bucketIndex: number, formula: string, details: Object}}
     */
    getHashPosition(key) {
        const k = this.getNumericValue(key);
        const n = this.numBuckets;

        if (this.hashMethod === 'modulo') {
            const hash = k % n;
            return {
                bucketIndex: hash,
                formula: `h(${k}) = ${k} mod ${n} = ${hash}`,
                details: { k, hash }
            };
        }

        if (this.hashMethod === 'cuadrado') {
            const k2 = (BigInt(k) ** 2n).toString();
            const d = (n - 1).toString().length;
            const start = Math.max(0, Math.floor((k2.length - d) / 2));
            const picked = k2.substring(start, start + d);
            const val = parseInt(picked, 10);
            const hash = val % n;
            return {
                bucketIndex: hash,
                formula: `h(${k}) = digCent(${k}²) = digCent(${k2}) mod ${n} = ${hash}`,
                details: { k, k2, picked, hash }
            };
        }

        if (this.hashMethod === 'truncamiento') {
            const kStr = k.toString();
            const d = (n - 1).toString().length;
            let pickedDigits = '';
            for (let i = 0; i < kStr.length && pickedDigits.length < d; i++) {
                if (i % 2 === 0) pickedDigits += kStr[i];
            }
            const val = parseInt(pickedDigits, 10) || 0;
            const hash = val % n;
            return {
                bucketIndex: hash,
                formula: `h(${k}) = elegirdigitos(${pickedDigits}) mod ${n} = ${hash}`,
                details: { k, pickedDigits, hash }
            };
        }

        if (this.hashMethod === 'plegamiento') {
            const kStr = k.toString();
            const d = (n - 1).toString().length;
            const blocks = [];
            for (let i = 0; i < kStr.length; i += d) {
                blocks.push(kStr.substring(i, i + d));
            }
            const sum = blocks.reduce((acc, b) => acc + parseInt(b, 10), 0);
            const sumStr = sum.toString();
            const lastDigits = sumStr.length > d ? sumStr.substring(sumStr.length - d) : sumStr;
            const val = parseInt(lastDigits, 10);
            const hash = val % n;
            return {
                bucketIndex: hash,
                formula: `h(${k}) = digmensig(${blocks.join(' + ')}) = digmensig(${sum}) = ${lastDigits} mod ${n} = ${hash}`,
                details: { k, blocks, sum, lastDigits, hash }
            };
        }

        if (this.hashMethod === 'conversion-base') {
            const base = this.hashBase;
            const kStr = k.toString();
            const d = (n - 1).toString().length;
            let converted = 0;
            const parts = [];
            for (let i = 0; i < kStr.length; i++) {
                const digit = parseInt(kStr[i], 10);
                const power = kStr.length - 1 - i;
                converted += digit * Math.pow(base, power);
                parts.push(`${digit} * ${base}^${power}`);
            }
            const convStr = converted.toString();
            const lastDigits = convStr.length > d ? convStr.substring(convStr.length - d) : convStr;
            const val = parseInt(lastDigits, 10);
            const hash = val % n;
            return {
                bucketIndex: hash,
                formula: `h(${k}) = digmensig(${parts.join(' + ')}) = digmensig(${converted}) = ${lastDigits} mod ${n} = ${hash}`,
                details: { k, base, converted, parts, lastDigits, hash }
            };
        }

        // Fallback
        const hash = k % n;
        return { bucketIndex: hash, formula: `h(${k}) = ${k} mod ${n} = ${hash}`, details: { k, hash } };
    }

    // ──────────────────────────────────────────
    // INSERT
    // ──────────────────────────────────────────

    /**
     * Inserta una clave en la estructura.
     * @param {string} rawKey
     * @returns {{success: boolean, error?: string, bucketIndex?: number, blockIndex?: number, position?: number, isCollision?: boolean, formula?: string}}
     */
    insert(rawKey) {
        if (!this.created) return { success: false, error: 'Debe crear la estructura.' };

        const { valid, key, error } = this.validateKey(rawKey);
        if (!valid) return { success: false, error };

        const { bucketIndex, formula } = this.getHashPosition(key);
        const bucket = this.buckets[bucketIndex];

        // Intentar insertar en un bloque existente de la cubeta
        for (let b = 0; b < bucket.blocks.length; b++) {
            const block = bucket.blocks[b];
            if (block.count < this.keysPerBlock) {
                // Insertar de forma ordenada
                const pos = this._sortedInsertInBlock(block, key);
                this.count++;
                return {
                    success: true, bucketIndex, blockIndex: b,
                    position: pos, isCollision: false, formula
                };
            }
        }

        // Crear nuevo bloque si hay espacio en la cubeta
        if (bucket.blocks.length < this.blocksPerBucket) {
            const newBlock = { keys: new Array(this.keysPerBlock).fill(null), count: 0 };
            bucket.blocks.push(newBlock);
            const bIdx = bucket.blocks.length - 1;
            const pos = this._sortedInsertInBlock(newBlock, key);
            this.count++;
            return {
                success: true, bucketIndex, blockIndex: bIdx,
                position: pos, isCollision: false, formula
            };
        }

        // Colisión: cubeta llena → enviar al bloque de colisión
        if (!bucket.collisionBlock) {
            bucket.collisionBlock = { keys: [], count: 0 };
        }
        const collBlock = bucket.collisionBlock;
        // Insertar de forma ordenada en el bloque de colisión (dinámico)
        const pos = this._sortedInsertDynamic(collBlock, key);
        this.count++;
        return {
            success: true, bucketIndex, blockIndex: -1,
            position: pos, isCollision: true, formula
        };
    }

    /**
     * Inserta una clave de forma ordenada en un bloque de tamaño fijo.
     * @private
     */
    _sortedInsertInBlock(block, key) {
        let insertPos = block.count;
        for (let i = 0; i < block.count; i++) {
            if (this._compareKeys(key, block.keys[i]) < 0) {
                insertPos = i;
                break;
            }
        }
        // Desplazar a la derecha
        for (let i = block.count; i > insertPos; i--) {
            block.keys[i] = block.keys[i - 1];
        }
        block.keys[insertPos] = key;
        block.count++;
        return insertPos;
    }

    /**
     * Inserta de forma ordenada en un bloque de colisión (dinámico/sin tamaño fijo).
     * @private
     */
    _sortedInsertDynamic(block, key) {
        let insertPos = block.count;
        for (let i = 0; i < block.count; i++) {
            if (this._compareKeys(key, block.keys[i]) < 0) {
                insertPos = i;
                break;
            }
        }
        block.keys.splice(insertPos, 0, key);
        block.count++;
        return insertPos;
    }

    // ──────────────────────────────────────────
    // SEARCH
    // ──────────────────────────────────────────

    /**
     * Busca una clave en la estructura.
     * @param {string} rawKey
     * @returns {{found: boolean, bucketIndex: number, blockIndex: number, position: number, isCollision: boolean, steps: Array, formula: string}}
     */
    search(rawKey) {
        const key = this._prepareKey(rawKey);
        const { bucketIndex, formula } = this.getHashPosition(key);
        const bucket = this.buckets[bucketIndex];
        const steps = [];
        const mode = this.searchMode;

        if (bucket.blocks.length === 0) {
            steps.push({ type: 'bucket-empty', bucketIndex });
            return { found: false, bucketIndex, blockIndex: -1, position: -1, isCollision: false, steps, formula };
        }

        // Fase 1: Buscar en qué bloque podría estar (verificando último registro de cada bloque)
        let targetBlock = -1;

        if (mode === 'binaria' && bucket.blocks.length > 1) {
            // Búsqueda binaria sobre bloques
            let low = 0, high = bucket.blocks.length - 1;
            while (low <= high) {
                const mid = Math.floor((low + high) / 2);
                const block = bucket.blocks[mid];
                const lastKey = block.keys[block.count - 1];
                const cmp = this._compareKeys(key, lastKey);

                if (cmp === 0) {
                    steps.push({ type: 'block-binary', bucketIndex, low, high, mid, lastKey, action: 'found-at-boundary' });
                    return {
                        found: true, bucketIndex, blockIndex: mid,
                        position: block.count - 1, isCollision: false, steps, formula
                    };
                } else if (cmp < 0) {
                    steps.push({ type: 'block-binary', bucketIndex, low, high, mid, lastKey, action: 'discard-right' });
                    targetBlock = mid;
                    high = mid - 1;
                } else {
                    steps.push({ type: 'block-binary', bucketIndex, low, high, mid, lastKey, action: 'discard-left' });
                    low = mid + 1;
                }
            }
        } else {
            // Búsqueda secuencial sobre bloques
            for (let b = 0; b < bucket.blocks.length; b++) {
                const block = bucket.blocks[b];
                const lastKey = block.keys[block.count - 1];
                const cmp = this._compareKeys(key, lastKey);

                if (cmp === 0) {
                    steps.push({ type: 'block-seq', bucketIndex, blockIndex: b, lastKey, action: 'found-at-boundary' });
                    return {
                        found: true, bucketIndex, blockIndex: b,
                        position: block.count - 1, isCollision: false, steps, formula
                    };
                } else if (cmp < 0) {
                    steps.push({ type: 'block-seq', bucketIndex, blockIndex: b, lastKey, action: 'enter-block' });
                    targetBlock = b;
                    break;
                } else {
                    steps.push({ type: 'block-seq', bucketIndex, blockIndex: b, lastKey, action: 'skip-block' });
                }
            }
        }

        // Fase 2: Buscar dentro del bloque encontrado
        if (targetBlock !== -1) {
            const block = bucket.blocks[targetBlock];
            const innerResult = this._searchInBlock(block, key, targetBlock, bucketIndex, false, steps);
            if (innerResult.found) {
                return { ...innerResult, formula };
            }
        }

        // Fase 3: Buscar en bloque de colisión
        if (bucket.collisionBlock && bucket.collisionBlock.count > 0) {
            steps.push({ type: 'enter-collision', bucketIndex });
            const collResult = this._searchInBlock(bucket.collisionBlock, key, -1, bucketIndex, true, steps);
            if (collResult.found) {
                return { ...collResult, formula };
            }
        }

        return { found: false, bucketIndex, blockIndex: -1, position: -1, isCollision: false, steps, formula };
    }

    /**
     * Busca dentro de un bloque (secuencial o binaria según searchMode).
     * @private
     */
    _searchInBlock(block, key, blockIndex, bucketIndex, isCollision, steps) {
        const mode = this.searchMode;

        if (mode === 'binaria' && block.count > 1) {
            // Búsqueda binaria dentro del bloque
            let low = 0, high = block.count - 1;
            while (low <= high) {
                const mid = Math.floor((low + high) / 2);
                const midKey = block.keys[mid];
                const cmp = this._compareKeys(key, midKey);

                if (cmp === 0) {
                    steps.push({
                        type: 'inner-binary', bucketIndex, blockIndex,
                        isCollision, low, high, mid, midKey, action: 'found'
                    });
                    return { found: true, bucketIndex, blockIndex, position: mid, isCollision, steps };
                } else if (cmp < 0) {
                    steps.push({
                        type: 'inner-binary', bucketIndex, blockIndex,
                        isCollision, low, high, mid, midKey, action: 'discard-right'
                    });
                    high = mid - 1;
                } else {
                    steps.push({
                        type: 'inner-binary', bucketIndex, blockIndex,
                        isCollision, low, high, mid, midKey, action: 'discard-left'
                    });
                    low = mid + 1;
                }
            }
        } else {
            // Búsqueda secuencial dentro del bloque
            for (let i = 0; i < block.count; i++) {
                const curKey = block.keys[i];
                const cmp = this._compareKeys(key, curKey);

                if (cmp === 0) {
                    steps.push({
                        type: 'inner-seq', bucketIndex, blockIndex,
                        isCollision, index: i, key: curKey, action: 'found'
                    });
                    return { found: true, bucketIndex, blockIndex, position: i, isCollision, steps };
                }

                steps.push({
                    type: 'inner-seq', bucketIndex, blockIndex,
                    isCollision, index: i, key: curKey, action: 'compare'
                });

                // Si la clave actual es mayor, no seguir (está ordenado)
                if (cmp < 0) break;
            }
        }

        return { found: false, bucketIndex, blockIndex, position: -1, isCollision, steps };
    }

    // ──────────────────────────────────────────
    // DELETE
    // ──────────────────────────────────────────

    /**
     * Elimina una clave de la estructura.
     * @param {string} rawKey
     * @returns {{success: boolean, error?: string, bucketIndex?: number, blockIndex?: number, position?: number, isCollision?: boolean, steps?: Array, formula?: string}}
     */
    delete(rawKey) {
        if (!this.created) return { success: false, error: 'No hay estructura creada.' };

        const key = this._prepareKey(rawKey);
        if (key === '') return { success: false, error: 'Ingrese una clave.' };

        // Primero buscar
        const searchResult = this.search(rawKey);
        if (!searchResult.found) {
            return { success: false, error: `La clave "${key}" no fue encontrada.`, steps: searchResult.steps, formula: searchResult.formula };
        }

        const { bucketIndex, blockIndex, position, isCollision } = searchResult;
        const bucket = this.buckets[bucketIndex];

        if (isCollision) {
            // Eliminar del bloque de colisión (dinámico)
            bucket.collisionBlock.keys.splice(position, 1);
            bucket.collisionBlock.count--;
            if (bucket.collisionBlock.count === 0) {
                bucket.collisionBlock = null;
            }
        } else {
            const block = bucket.blocks[blockIndex];
            // Eliminar y desplazar
            for (let i = position; i < block.count - 1; i++) {
                block.keys[i] = block.keys[i + 1];
            }
            block.keys[block.count - 1] = null;
            block.count--;

            // Si el bloque queda vacío, removerlo
            if (block.count === 0) {
                bucket.blocks.splice(blockIndex, 1);
            }
        }

        this.count--;

        return {
            success: true, bucketIndex, blockIndex, position,
            isCollision, steps: searchResult.steps, formula: searchResult.formula
        };
    }

    // ──────────────────────────────────────────
    // Utilities
    // ──────────────────────────────────────────

    _prepareKey(rawKey) {
        const key = rawKey.toString().trim();
        return (this.dataType === 'numerico' && key.length < this.keyLength && /^\d+$/.test(key))
            ? key.padStart(this.keyLength, '0') : key;
    }

    // ──────────────────────────────────────────
    // Serialization
    // ──────────────────────────────────────────

    toJSON() {
        return {
            numBuckets: this.numBuckets,
            blocksPerBucket: this.blocksPerBucket,
            keysPerBlock: this.keysPerBlock,
            keyLength: this.keyLength,
            dataType: this.dataType,
            searchMode: this.searchMode,
            hashMethod: this.hashMethod,
            hashBase: this.hashBase,
            count: this.count,
            buckets: this.buckets.map(b => ({
                blocks: b.blocks.map(bl => ({ keys: [...bl.keys], count: bl.count })),
                collisionBlock: b.collisionBlock
                    ? { keys: [...b.collisionBlock.keys], count: b.collisionBlock.count }
                    : null
            }))
        };
    }

    fromJSON(data) {
        this.numBuckets = data.numBuckets;
        this.blocksPerBucket = data.blocksPerBucket;
        this.keysPerBlock = data.keysPerBlock;
        this.keyLength = data.keyLength;
        this.dataType = data.dataType;
        this.searchMode = data.searchMode || 'secuencial';
        this.hashMethod = data.hashMethod || 'modulo';
        this.hashBase = data.hashBase || 0;
        this.count = data.count;
        this.buckets = data.buckets.map(b => ({
            blocks: b.blocks.map(bl => ({ keys: [...bl.keys], count: bl.count })),
            collisionBlock: b.collisionBlock
                ? { keys: [...b.collisionBlock.keys], count: b.collisionBlock.count }
                : null
        }));
        this.created = true;
    }
}
