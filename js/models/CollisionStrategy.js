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
            const h = this.ds._getHashValue(key).hash; // Ya optimizado en DataStructure
            return `h(${key}) = digCent(${k}²) = digCent(${k2}) + 1 = ${h}`;
        } else {
            const h = (k % n) + 1;
            return `h(${key}) = (${k} mod ${n}) + 1 = ${h}`;
        }
    }

    // === MÉTODOS DE PRUEBA LINEAL (Linear Probing) ===

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
        let emptyCount = 0;
        const steps = [];

        while (attempts < this.ds.size) {
            const currentKey = this.ds.keys[position];
            const currentPosLabel = position + 1;

            const isMatch = currentKey === key;

            if (currentKey === null) {
                emptyCount++;
                steps.push({
                    index: position,
                    key: null,
                    hashValue,
                    action: 'vacio',
                    formula: attempts === 0 ? null : `${hashValue} + ${attempts} = ${currentPosLabel}`
                });

                if (emptyCount >= 2) {
                    return { found: false, position: -1, steps };
                }
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

            position = (hashValue - 1 + (attempts + 1)) % this.ds.size;
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

        this.ds.keys[result.position] = null;
        this.ds.count--;
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
        let emptyCount = 0;

        for (let i = 0; i < this.ds.size; i++) {
            const position = (hashValue - 1 + i * i) % this.ds.size;
            const currentKey = this.ds.keys[position];
            const currentPosLabel = position + 1;

            const isMatch = currentKey === key;

            if (currentKey === null) {
                emptyCount++;
                steps.push({
                    index: position,
                    key: null,
                    hashValue,
                    action: 'vacio',
                    offset: i,
                    formula: i === 0 ? null : `${hashValue} + ${i}² = ${currentPosLabel}`
                });

                if (emptyCount >= 2) {
                    return { found: false, position: -1, steps };
                }
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

        this.ds.keys[result.position] = null;
        this.ds.count--;
        return { success: true, position: result.position, error: null };
    }

    // === MÉTODOS DE DOBLE FUNCIÓN HASH (Double Hashing) ===



    /**
     * Inserta una clave usando Doble Hash.
     * @param {string} key - Clave a insertar.
     * @param {number} hashValue - Valor hash inicial (1-indexed).
     * @returns {Object} Resultado de la operación.
     */
    doubleHashInsert(key, hashValue) {
        let collisions = 0;
        const steps = [];
        const n = this.ds.size;

        // El usuario pide H'(D) = ((D + 1) mod size) + 1
        // D es la posición (1..N). Empezamos en hashValue.
        let currentPos = hashValue;

        for (let i = 0; i < n; i++) {
            const index = currentPos - 1;

            if (this.ds.keys[index] === null) {
                this.ds.keys[index] = key;
                this.ds.count++;
                steps.push({
                    position: index,
                    action: 'inserted',
                    formula: i === 0 ? null : `H'(${steps[i - 1].position + 1}) = ((${steps[i - 1].position + 1} + 1) mod ${n}) + 1 = ${currentPos}`
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

            // Calcular siguiente posición usando la fórmula de Cairó
            currentPos = ((currentPos + 1) % n) + 1;
        }

        return { success: false, position: -1, collisions, error: 'No se encontró espacio disponible tras recorrer la tabla.', steps };
    }

    /**
     * Busca una clave usando Doble Hash.
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
                    formula: i === 0 ? null : `H'(${steps[i - 1].index + 1}) = ((${steps[i - 1].index + 1} + 1) mod ${n}) + 1 = ${currentPos}`
                });
                return { found: false, position: -1, steps };
            }

            const isMatch = currentKey === key;
            steps.push({
                index,
                key: currentKey,
                action: isMatch ? 'encontrada' : 'colision',
                formula: isMatch
                    ? (i === 0 ? null : `H'(${steps[i - 1].index + 1}) = ((${steps[i - 1].index + 1} + 1) mod ${n}) + 1 = ${currentPos}`)
                    : this._getExistingKeyFormula(currentKey)
            });

            if (isMatch) {
                return { found: true, position: index, steps };
            }

            currentPos = ((currentPos + 1) % n) + 1;
        }

        return { found: false, position: -1, steps };
    }

    /**
     * Elimina una clave usando Doble Hash.
     * @param {string} key - Clave a eliminar.
     * @param {number} hashValue - Valor hash inicial (1-indexed).
     * @returns {Object} Resultado de la eliminación.
     */
    doubleHashDelete(key, hashValue) {
        const result = this.doubleHashSearch(key, hashValue);
        if (result.found) {
            this.ds.keys[result.position] = null;
            this.ds.count--;
            return { success: true, position: result.position };
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
            default:
                throw new Error(`Estrategia de colisión desconocida: "${strategyName}"`);
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
            { value: 'doble-hash', label: 'Doble Función Hash' }
        ];
    }
}
