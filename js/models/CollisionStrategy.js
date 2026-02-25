/**
 * @fileoverview Estrategias de resolución de colisiones para tablas hash.
 * Consolida todos los métodos de colisión en una sola clase resolver.
 * @module models/CollisionStrategy
 */

/**
 * Clase que resuelve colisiones en una tabla hash.
 * Contiene los métodos para diferentes estrategias de resolución.
 */
class CollisionResolver {
    /**
     * @param {DataStructure} dataStructure - Referencia a la estructura de datos.
     */
    constructor(dataStructure) {
        this.ds = dataStructure;
    }

    _getExistingKeyFormula(key) {
        if (key === null || typeof key === 'object') return '';

        const k = this.ds.getNumericValue(key);
        const n = this.ds.size;

        if (this.ds.hashMethod === 'cuadrado') {
            const k2 = (BigInt(k) ** 2n).toString();
            const h = this.ds._getHashValue(k).hash;
            return `h(${key}) = digCent(${k}²) = digCent(${k2}) + 1 = ${h}`;
        } else if (this.ds.hashMethod === 'truncamiento') {
            const { hash: h, pickedDigits } = this.ds._getHashValue(k);
            return `h(${key}) = elegirdigitos impares(${pickedDigits}) + 1 = ${h}`;
        } else if (this.ds.hashMethod === 'plegamiento') {
            const { hash: h, blocks, sum, lastDigits } = this.ds._getHashValue(k);
            return `h(${key}) = digmensig(${blocks}) = digmensig(${sum}) = ${lastDigits} + 1 = ${h}`;
        } else {
            const h = (k % n) + 1;
            return `h(${key}) = (${k} mod ${n}) + 1 = ${h}`;
        }
    }



    /**
     * Aplica la función hash a una posición D para calcular la siguiente posición.
     * Usado en Doble Función Hash: H'(D) = aplicar_hash(D+1)
     * 
     * Según el método hash:
     * - Módulo: H'(D) = ((D + 1) mod size) + 1
     * - Cuadrado: H'(D) = digCent((D+1)²) + 1
     * - Truncamiento: H'(D) = elegirdigitos_impares(D+1) + 1
     * - Plegamiento: H'(D) = digmensig(bloques de D+1) + 1
     * 
     * @param {number} position - Posición actual (1-indexed)
     * @returns {number} Nueva posición calculada (1-indexed)
     * @private
     */
    _applyHashToPosition(position) {
        const input = position + 1; // D + 1
        const { hash } = this.ds._getHashValue(input);
        return hash;
    }

    /**
     * Genera la fórmula de texto para mostrar en los logs de Doble Hash.
     * 
     * @param {number} prevPosition - Posición anterior (1-indexed)
     * @param {number} newPosition - Nueva posición calculada (1-indexed)
     * @returns {string} Fórmula formateada
     * @private
     */
    _getDoubleHashFormula(prevPosition, newPosition) {
        const input = prevPosition + 1;
        const n = this.ds.size;

        if (this.ds.hashMethod === 'modulo') {
            return `H'(${prevPosition}) = ((${prevPosition} + 1) mod ${n}) + 1 = ${newPosition}`;
        } else if (this.ds.hashMethod === 'cuadrado') {
            const k2 = (BigInt(input) ** 2n).toString();
            return `H'(${prevPosition}) = digCent((${prevPosition}+1)²) = digCent(${input}²) = digCent(${k2}) + 1 = ${newPosition}`;
        } else if (this.ds.hashMethod === 'truncamiento') {
            const kStr = input.toString();
            const d = (n - 1).toString().length;
            let pickedDigits = '';
            for (let i = 0; i < kStr.length && pickedDigits.length < d; i++) {
                if (i % 2 === 0) pickedDigits += kStr[i];
            }
            return `H'(${prevPosition}) = elegirdigitos_impares(${prevPosition}+1) = elegirdigitos_impares(${input}) = ${pickedDigits} + 1 = ${newPosition}`;
        } else if (this.ds.hashMethod === 'plegamiento') {
            const kStr = input.toString();
            const d = (n - 1).toString().length;
            const blocks = [];
            for (let i = 0; i < kStr.length; i += d) {
                blocks.push(kStr.substring(i, i + d));
            }
            const sum = blocks.reduce((acc, block) => acc + parseInt(block, 10), 0);
            return `H'(${prevPosition}) = digmensig(${prevPosition}+1) = digmensig(${blocks.join(' + ')}) = digmensig(${sum}) + 1 = ${newPosition}`;
        }

        return `H'(${prevPosition}) = ${newPosition}`;
    }

    // === MÉTODOS DE PRUEBA LINEAL ===

    /**
     * Inserta una clave usando Prueba Lineal.
     * @param {string} key - Clave a insertar.
     * @param {number} hashValue - Valor hash inicial (1-indexed).
     * @returns {Object} Resultado de la operación.
     */
    linearInsert(key, hashValue) {
        let position = hashValue - 1; // Convertir a 0-indexed
        let collisions = 0;
        let attempts = 0;
        const steps = [];

        while (attempts < this.ds.size) {
            const currentPosLabel = position + 1;

            if (this.ds.keys[position] === null) {
                this.ds.keys[position] = key;
                this.ds.count++;
                steps.push({
                    position,
                    action: 'inserted',
                    formula: attempts === 0 ? null : `${hashValue} + ${attempts} = ${currentPosLabel}`
                });
                return { success: true, position, collisions, error: null, steps };
            }

            steps.push({
                position,
                action: 'collision',
                key: this.ds.keys[position],
                formula: this._getExistingKeyFormula(this.ds.keys[position])
            });

            collisions++;
            position = (hashValue - 1 + (attempts + 1)) % this.ds.size;
            attempts++;
        }

        return { success: false, position: -1, collisions, error: 'La tabla está llena.', steps };
    }

    /**
     * Busca una clave usando Prueba Lineal.
     * @param {string} key - Clave a buscar.
     * @param {number} hashValue - Valor hash inicial (1-indexed).
     * @returns {Object} Resultado de la búsqueda.
     */
    linearSearch(key, hashValue) {
        let position = hashValue - 1;
        let attempts = 0;
        const steps = [];

        while (attempts < this.ds.size) {
            const currentKey = this.ds.keys[position];
            const currentPosLabel = position + 1;

            const isMatch = currentKey === key;

            if (currentKey === null) {
                steps.push({
                    index: position,
                    key: null,
                    hashValue,
                    action: 'vacio',
                    formula: attempts === 0 ? null : `${hashValue} + ${attempts} = ${currentPosLabel}`
                });
                return { found: false, position: -1, steps };
            } else {
                steps.push({
                    index: position,
                    key: currentKey,
                    hashValue,
                    action: isMatch ? 'encontrada' : 'colision',
                    formula: isMatch
                        ? (attempts === 0 ? null : `${hashValue} + ${attempts} = ${currentPosLabel}`)
                        : this._getExistingKeyFormula(currentKey)
                });

                if (isMatch) {
                    return { found: true, position, steps };
                }
            }

            position = (position + 1) % this.ds.size;
            attempts++;
        }

        return { found: false, position: -1, steps };
    }

    /**
     * Elimina una clave usando Prueba Lineal.
     * @param {string} key - Clave a eliminar.
     * @param {number} hashValue - Valor hash inicial (1-indexed).
     * @returns {Object} Resultado de la eliminación.
     */
    linearDelete(key, hashValue) {
        const result = this.linearSearch(key, hashValue);
        if (!result.found) {
            return { success: false, position: -1, error: `La clave "${key}" no fue encontrada.` };
        }

        const n = this.ds.size;
        let holeIdx = result.position;
        this.ds.keys[holeIdx] = null;
        this.ds.count--;

        // Reordenamiento para Prueba Lineal
        let currentIdx = (holeIdx + 1) % n;

        for (let i = 0; i < n - 1; i++) {
            const targetKey = this.ds.keys[currentIdx];
            if (targetKey === null) break;

            const k = this.ds.getNumericValue(targetKey);
            const { hash: startPosLabel } = this.ds._getHashValue(k);
            const startIdx = startPosLabel - 1;

            // Verificar si el hueco está en el camino circular desde startIdx hasta currentIdx
            // En Prueba Lineal el camino es secuencial.
            let inPath = false;
            let checkIdx = startIdx;
            for (let j = 0; j < n; j++) {
                if (checkIdx === holeIdx) {
                    inPath = true;
                    break;
                }
                if (checkIdx === currentIdx) {
                    break;
                }
                checkIdx = (checkIdx + 1) % n;
            }

            if (inPath) {
                this.ds.keys[holeIdx] = targetKey;
                this.ds.keys[currentIdx] = null;
                holeIdx = currentIdx;
            }

            currentIdx = (currentIdx + 1) % n;
        }

        return { success: true, position: result.position, error: null };
    }

    // === MÉTODOS DE PRUEBA CUADRÁTICA (Quadratic Probing) ===

    /**
     * Inserta una clave usando Prueba Cuadrática.
     * @param {string} key - Clave a insertar.
     * @param {number} hashValue - Valor hash inicial (1-indexed).
     * @returns {Object} Resultado de la operación.
     */
    quadraticInsert(key, hashValue) {
        let collisions = 0;
        const steps = [];

        for (let i = 0; i < this.ds.size; i++) {
            const position = (hashValue - 1 + i * i) % this.ds.size;
            const currentPosLabel = position + 1;

            if (this.ds.keys[position] === null) {
                this.ds.keys[position] = key;
                this.ds.count++;
                steps.push({
                    position,
                    action: 'inserted',
                    offset: i,
                    formula: i === 0 ? null : `${hashValue} + ${i}² = ${currentPosLabel}`
                });
                return { success: true, position, collisions, error: null, steps };
            }

            steps.push({
                position,
                action: 'collision',
                key: this.ds.keys[position],
                offset: i,
                formula: this._getExistingKeyFormula(this.ds.keys[position])
            });
            collisions++;
        }

        return { success: false, position: -1, collisions, error: 'No se encontró espacio disponible.', steps };
    }

    /**
     * Busca una clave usando Prueba Cuadrática.
     * @param {string} key - Clave a buscar.
     * @param {number} hashValue - Valor hash inicial (1-indexed).
     * @returns {Object} Resultado de la búsqueda.
     */
    quadraticSearch(key, hashValue) {
        const steps = [];

        for (let i = 0; i < this.ds.size; i++) {
            const position = (hashValue - 1 + i * i) % this.ds.size;
            const currentKey = this.ds.keys[position];
            const currentPosLabel = position + 1;

            const isMatch = currentKey === key;

            if (currentKey === null) {
                steps.push({
                    index: position,
                    key: null,
                    hashValue,
                    action: 'vacio',
                    offset: i,
                    formula: i === 0 ? null : `${hashValue} + ${i}² = ${currentPosLabel}`
                });
                return { found: false, position: -1, steps };
            } else {
                steps.push({
                    index: position,
                    key: currentKey,
                    hashValue,
                    action: isMatch ? 'encontrada' : 'colision',
                    offset: i,
                    formula: isMatch
                        ? (i === 0 ? null : `${hashValue} + ${i}² = ${currentPosLabel}`)
                        : this._getExistingKeyFormula(currentKey)
                });

                if (isMatch) {
                    return { found: true, position, steps };
                }
            }
        }

        return { found: false, position: -1, steps };
    }

    /**
     * Elimina una clave usando Prueba Cuadrática.
     * @param {string} key - Clave a eliminar.
     * @param {number} hashValue - Valor hash inicial (1-indexed).
     * @returns {Object} Resultado de la eliminación.
     */
    quadraticDelete(key, hashValue) {
        const result = this.quadraticSearch(key, hashValue);
        if (!result.found) {
            return { success: false, position: -1, error: `La clave "${key}" no fue encontrada.` };
        }

        const n = this.ds.size;
        let holeIdx = result.position;
        this.ds.keys[holeIdx] = null;
        this.ds.count--;

        // Reordenamiento para Prueba Cuadrática
        // Escaneamos toda la tabla para encontrar elementos que deban moverse
        for (let i = 0; i < n; i++) {
            const targetKey = this.ds.keys[i];
            if (targetKey === null) continue;

            const k = this.ds.getNumericValue(targetKey);
            const { hash: startPosLabel } = this.ds._getHashValue(k);
            const startPos = startPosLabel - 1;

            // Verificar si el hueco está en la secuencia cuadrática de targetKey antes de su posición actual i
            let inPath = false;
            let j_hole = -1;
            let j_curr = -1;

            for (let j = 0; j < n; j++) {
                const pos = (startPos + j * j) % n;
                if (pos === holeIdx) j_hole = j;
                if (pos === i) {
                    j_curr = j;
                    break;
                }
            }

            if (j_hole !== -1 && j_hole < j_curr) {
                this.ds.keys[holeIdx] = targetKey;
                this.ds.keys[i] = null;
                holeIdx = i; // El nuevo hueco es la posición que acabamos de vaciar
                // Reiniciar el bucle para asegurar que no queden huecos intermedios
                i = -1;
            }
        }

        return { success: true, position: result.position, error: null };
    }

    // === MÉTODOS DE DOBLE FUNCIÓN HASH (Double Hashing) ===



    /**
     * Inserta una clave usando Doble Hash.
     * Para todos los métodos, se vuelve a aplicar la función hash usando D+1 como entrada,
     * donde D es la posición (1-indexed) donde ocurrió la colisión.
     * 
     * Ejemplos:
     * - Módulo: H'(D) = ((D + 1) mod size) + 1
     * - Cuadrado: H'(D) = digCent((D+1)²) + 1
     * - Truncamiento: H'(D) = elegirdigitos_impares(D+1) + 1
     * - Plegamiento: H'(D) = digmensig(bloques de D+1) + 1
     * 
     * @param {string} key - Clave a insertar.
     * @param {number} hashValue - Valor hash inicial (1-indexed).
     * @returns {Object} Resultado de la operación.
     */
    doubleHashInsert(key, hashValue) {
        let collisions = 0;
        const steps = [];
        const n = this.ds.size;
        let currentPos = hashValue;

        for (let i = 0; i < n; i++) {
            const index = currentPos - 1;

            if (this.ds.keys[index] === null) {
                this.ds.keys[index] = key;
                this.ds.count++;
                steps.push({
                    position: index,
                    action: 'inserted',
                    formula: i === 0 ? null : this._getDoubleHashFormula(steps[i - 1].position + 1, currentPos)
                });
                return { success: true, position: index, collisions, error: null, steps };
            }

            steps.push({
                position: index,
                action: 'collision',
                key: this.ds.keys[index],
                formula: this._getExistingKeyFormula(this.ds.keys[index])
            });
            collisions++;

            // Calcular siguiente posición: aplicar la función hash a D+1
            currentPos = this._applyHashToPosition(currentPos);
        }

        return { success: false, position: -1, collisions, error: 'No se encontró espacio disponible tras recorrer la tabla.', steps };
    }

    /**
     * Busca una clave usando Doble Hash.
     * Aplica la función hash a D+1 para calcular la siguiente posición.
     * 
     * @param {string} key - Clave a buscar.
     * @param {number} hashValue - Valor hash inicial (1-indexed).
     * @returns {Object} Resultado de la búsqueda.
     */
    doubleHashSearch(key, hashValue) {
        const steps = [];
        const n = this.ds.size;
        let currentPos = hashValue;

        for (let i = 0; i < n; i++) {
            const index = currentPos - 1;
            const currentKey = this.ds.keys[index];

            if (currentKey === null) {
                steps.push({
                    index,
                    action: 'vacio',
                    formula: i === 0 ? null : this._getDoubleHashFormula(steps[i - 1].index + 1, currentPos)
                });
                return { found: false, position: -1, steps };
            }

            const isMatch = currentKey === key;
            steps.push({
                index,
                key: currentKey,
                action: isMatch ? 'encontrada' : 'colision',
                formula: isMatch
                    ? (i === 0 ? null : this._getDoubleHashFormula(steps[i - 1].index + 1, currentPos))
                    : this._getExistingKeyFormula(currentKey)
            });

            if (isMatch) {
                return { found: true, position: index, steps };
            }

            // Calcular siguiente posición: aplicar la función hash a D+1
            currentPos = this._applyHashToPosition(currentPos);
        }

        return { found: false, position: -1, steps };
    }

    /**
     * Elimina una clave usando Doble Hash y reordena la secuencia de colisiones.
     * Al eliminar, se debe asegurar que los elementos posteriores en la secuencia
     * que dependen de la posición liberada sean movidos para no romper la cadena de búsqueda.
     * 
     * @param {string} key - Clave a eliminar.
     * @param {number} hashValue - Valor hash inicial (1-indexed).
     * @returns {Object} Resultado de la eliminación.
     */
    doubleHashDelete(key, hashValue) {
        const result = this.doubleHashSearch(key, hashValue);
        if (!result.found) {
            return { success: false, error: 'Clave no encontrada.' };
        }

        const n = this.ds.size;
        let holeIdx = result.position; // 0-indexed
        this.ds.keys[holeIdx] = null;
        this.ds.count--;

        // Reordenamiento para mantener la consistencia de la secuencia
        let currentPos = holeIdx + 1; // 1-indexed para usar _applyHashToPosition
        currentPos = this._applyHashToPosition(currentPos);

        for (let i = 0; i < n - 1; i++) {
            const index = currentPos - 1;
            const targetKey = this.ds.keys[index];

            if (targetKey === null) break;

            // Calcular dónde empezaría la búsqueda de targetKey
            const k = this.ds.getNumericValue(targetKey);
            const { hash: startPos } = this.ds._getHashValue(k);

            // Verificar si el "hueco" está en el camino de startPos a currentPos
            // Si recorremos desde startPos y encontramos holeIdx+1 antes de currentPos,
            // significa que targetKey debe ser movida al hueco.
            let inPath = false;
            let checkPos = startPos;
            for (let j = 0; j < n; j++) {
                if (checkPos === holeIdx + 1) {
                    inPath = true;
                    break;
                }
                if (checkPos === currentPos) {
                    break;
                }
                checkPos = this._applyHashToPosition(checkPos);
            }

            if (inPath) {
                this.ds.keys[holeIdx] = targetKey;
                this.ds.keys[index] = null;
                holeIdx = index;
            }

            currentPos = this._applyHashToPosition(currentPos);
        }

        return { success: true, position: result.position };
    }

    // === MÉTODOS DE ARREGLOS ANIDADOS (Nested Arrays) ===

    /**
     * Inserta una clave usando Arreglos Anidados.
     * @param {string} key - Clave a insertar.
     * @param {number} hashValue - Valor hash inicial (1-indexed).
     * @returns {Object} Resultado de la operación.
     */
    nestedArrayInsert(key, hashValue) {
        const index = hashValue - 1;
        const steps = [];

        // Verificar si la clave ya existe en esta posición (Evitar duplicados)
        const bucket = this.ds.keys[index];
        if (bucket !== null) {
            const exists = Array.isArray(bucket) ? bucket.includes(key) : bucket === key;
            if (exists) {
                return { success: false, error: 'La clave ya existe en esta posición.' };
            }
        }

        if (this.ds.keys[index] === null) {
            this.ds.keys[index] = [key];
            this.ds.count++;
            steps.push({
                position: index,
                action: 'inserted',
                formula: null
            });
            return { success: true, position: index, collisions: 0, error: null, steps };
        }

        // Ya hay un arreglo (colisión)
        steps.push({
            position: index,
            action: 'collision',
            key: Array.isArray(this.ds.keys[index]) ? this.ds.keys[index][0] : this.ds.keys[index],
            formula: this._getExistingKeyFormula(Array.isArray(this.ds.keys[index]) ? this.ds.keys[index][0] : this.ds.keys[index])
        });

        if (!Array.isArray(this.ds.keys[index])) {
            this.ds.keys[index] = [this.ds.keys[index]];
        }

        this.ds.keys[index].push(key);
        this.ds.count++;
        steps.push({
            position: index,
            action: 'inserted',
            formula: null
        });

        return { success: true, position: index, collisions: this.ds.keys[index].length - 1, error: null, steps };
    }

    /**
     * Busca una clave en Arreglos Anidados.
     * @param {string} key - Clave a buscar.
     * @param {number} hashValue - Valor hash inicial (1-indexed).
     * @returns {Object} Resultado de la búsqueda.
     */
    nestedArraySearch(key, hashValue) {
        const index = hashValue - 1;
        const steps = [];
        const bucket = this.ds.keys[index];

        if (bucket === null) {
            steps.push({
                index,
                action: 'vacio',
                formula: null
            });
            return { found: false, position: -1, steps };
        }

        if (Array.isArray(bucket)) {
            let found = false;
            for (let i = 0; i < bucket.length; i++) {
                const isMatch = bucket[i] === key;
                steps.push({
                    index,
                    subIndex: i,
                    key: bucket[i],
                    action: isMatch ? 'encontrada' : 'colision',
                    formula: i === 0 ? this._getExistingKeyFormula(bucket[0]) : null
                });
                if (isMatch) {
                    found = true;
                    break;
                }
            }
            return { found, position: index, steps };
        } else {
            const isMatch = bucket === key;
            steps.push({
                index,
                key: bucket,
                action: isMatch ? 'encontrada' : 'colision',
                formula: this._getExistingKeyFormula(bucket)
            });
            return { found: isMatch, position: index, steps };
        }
    }

    /**
     * Elimina una clave de Arreglos Anidados.
     * @param {string} key - Clave a eliminar.
     * @param {number} hashValue - Valor hash inicial (1-indexed).
     * @returns {Object} Resultado de la eliminación.
     */
    nestedArrayDelete(key, hashValue) {
        const index = hashValue - 1;
        const bucket = this.ds.keys[index];

        if (bucket === null) {
            return { success: false, error: 'Clave no encontrada.' };
        }

        if (Array.isArray(bucket)) {
            const keyIndex = bucket.indexOf(key);
            if (keyIndex !== -1) {
                bucket.splice(keyIndex, 1);
                if (bucket.length === 0) {
                    this.ds.keys[index] = null;
                }
                this.ds.count--;
                return { success: true, position: index, subIndex: keyIndex };
            }
        } else if (bucket === key) {
            this.ds.keys[index] = null;
            this.ds.count--;
            return { success: true, position: index, subIndex: 0 };
        }

        return { success: false, error: 'Clave no encontrada.' };
    }

    // === MÉTODOS DE ENCADENAMIENTO (Linked List) ===

    /**
     * Inserta una clave usando Encadenamiento (Listas Enlazadas).
     * @param {string} key - Clave a insertar.
     * @param {number} hashValue - Valor hash inicial (1-indexed).
     * @returns {Object} Resultado de la operación.
     */
    linkedListInsert(key, hashValue) {
        const index = hashValue - 1;
        const steps = [];

        // Verificar duplicados
        let current = this.ds.keys[index];
        while (current !== null) {
            if (current.value === key) {
                return { success: false, error: 'La clave ya existe en esta posición.' };
            }
            current = current.next;
        }

        const newNode = { value: key, next: null };

        if (this.ds.keys[index] === null) {
            this.ds.keys[index] = newNode;
            this.ds.count++;
            steps.push({
                position: index,
                action: 'inserted',
                formula: null
            });
            return { success: true, position: index, collisions: 0, error: null, steps };
        }

        // Colisión: insertar al final de la lista
        current = this.ds.keys[index];
        let collisions = 0;

        while (current !== null) {
            steps.push({
                position: index,
                subIndex: collisions,
                action: 'collision',
                key: current.value,
                formula: collisions === 0 ? this._getExistingKeyFormula(current.value) : null
            });

            collisions++;
            if (current.next === null) {
                current.next = newNode;
                break;
            }
            current = current.next;
        }

        this.ds.count++;

        steps.push({
            position: index,
            subIndex: collisions,
            action: 'inserted',
            formula: null
        });

        return { success: true, position: index, collisions: collisions, error: null, steps };
    }

    /**
     * Busca una clave en Encadenamiento (Listas Enlazadas).
     * @param {string} key - Clave a buscar.
     * @param {number} hashValue - Valor hash inicial (1-indexed).
     * @returns {Object} Resultado de la búsqueda.
     */
    linkedListSearch(key, hashValue) {
        const index = hashValue - 1;
        const steps = [];
        let current = this.ds.keys[index];

        if (current === null) {
            steps.push({
                index,
                action: 'vacio',
                formula: null
            });
            return { found: false, position: -1, steps };
        }

        let nodeIndex = 0;
        while (current !== null) {
            const isMatch = current.value === key;
            steps.push({
                index,
                subIndex: nodeIndex,
                key: current.value,
                action: isMatch ? 'encontrada' : 'colision',
                formula: nodeIndex === 0 ? this._getExistingKeyFormula(current.value) : null
            });

            if (isMatch) {
                return { found: true, position: index, steps };
            }

            current = current.next;
            nodeIndex++;
        }

        return { found: false, position: -1, steps };
    }

    /**
     * Elimina una clave de Encadenamiento (Listas Enlazadas).
     * @param {string} key - Clave a eliminar.
     * @param {number} hashValue - Valor hash inicial (1-indexed).
     * @returns {Object} Resultado de la eliminación.
     */
    linkedListDelete(key, hashValue) {
        const index = hashValue - 1;
        let current = this.ds.keys[index];
        let prev = null;

        let nodeIndex = 0;
        while (current !== null) {
            if (current.value === key) {
                if (prev === null) {
                    this.ds.keys[index] = current.next;
                } else {
                    prev.next = current.next;
                }
                this.ds.count--;
                return { success: true, position: index, subIndex: nodeIndex };
            }
            prev = current;
            current = current.next;
            nodeIndex++;
        }

        return { success: false, error: 'Clave no encontrada.' };
    }

}

/**
 * Fábrica de estrategias de resolución de colisiones.
 * Mantiene compatibilidad con el código existente delegando a CollisionResolver.
 */
class CollisionStrategyFactory {
    /**
     * Crea una instancia de la "estrategia" especificada.
     * Retorna un objeto que imita la interfaz de las antiguas clases de estrategia.
     * @param {string} strategyName - Nombre de la estrategia.
     * @param {DataStructure} dataStructure - Referencia a la estructura de datos.
     * @returns {Object} Objeto con métodos insert, search, delete y getName.
     */
    static create(strategyName, dataStructure) {
        const resolver = new CollisionResolver(dataStructure);

        switch (strategyName) {
            case 'prueba-lineal':
                return {
                    insert: (k, h) => resolver.linearInsert(k, h),
                    search: (k, h) => resolver.linearSearch(k, h),
                    delete: (k, h) => resolver.linearDelete(k, h),
                    getName: () => 'Prueba Lineal'
                };
            case 'prueba-cuadratica':
                return {
                    insert: (k, h) => resolver.quadraticInsert(k, h),
                    search: (k, h) => resolver.quadraticSearch(k, h),
                    delete: (k, h) => resolver.quadraticDelete(k, h),
                    getName: () => 'Prueba Cuadrática'
                };
            case 'doble-hash':
                return {
                    insert: (k, h) => resolver.doubleHashInsert(k, h),
                    search: (k, h) => resolver.doubleHashSearch(k, h),
                    delete: (k, h) => resolver.doubleHashDelete(k, h),
                    getName: () => 'Doble Función Hash'
                };
            case 'arreglos-anidados':
                return {
                    insert: (k, h) => resolver.nestedArrayInsert(k, h),
                    search: (k, h) => resolver.nestedArraySearch(k, h),
                    delete: (k, h) => resolver.nestedArrayDelete(k, h),
                    getName: () => 'Arreglos Anidados'
                };
            case 'encadenamiento':
                return {
                    insert: (k, h) => resolver.linkedListInsert(k, h),
                    search: (k, h) => resolver.linkedListSearch(k, h),
                    delete: (k, h) => resolver.linkedListDelete(k, h),
                    getName: () => 'Encadenamiento'
                };
            default:
                throw new Error(`Estrategia no soportada: ${strategyName}`);
        }
    }

    /**
     * Retorna la lista de estrategias disponibles.
     * @returns {Array<{value: string, label: string}>}
     */
    static getAvailableStrategies() {
        return [
            { value: 'prueba-lineal', label: 'Prueba Lineal' },
            { value: 'prueba-cuadratica', label: 'Prueba Cuadrática' },
            { value: 'doble-hash', label: 'Doble Función Hash' },
            { value: 'arreglos-anidados', label: 'Arreglos Anidados' },
            { value: 'encadenamiento', label: 'Encadenamiento' }
        ];
    }
}
