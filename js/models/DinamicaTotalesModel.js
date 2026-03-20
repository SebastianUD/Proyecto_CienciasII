/**
 * Modelo de estructura hash dinámica con expansión total.
 */
class DinamicaTotalesModel {
    /**
     * Crea una instancia de DinamicaTotalesModel e inicializa su estado.
     */
    constructor() {
        this.reset();
    }

    /**
     * Restablece todas las propiedades del modelo a sus valores iniciales.
     */
    reset() {
        this.numBuckets = 0; // N (Columnas)
        this.recordsPerRow = 0; // M (Filas)
        this.occupancyThreshold = 70;
        this.reductionThreshold = 30;
        this.keyLength = 0;
        this.dataType = '';
        this.created = false;
        this.count = 0;
        this.matrix = [];
        this.collisionBlocks = [];
        this.insertionOrder = [];
        this.history = [];
        this.historyIndex = -1;
    }

    /**
     * Crea e inicializa la estructura con la configuración proporcionada.
     * @param {Object} config - Configuración de la estructura.
     * @param {number} config.keyLength - Longitud fija de las claves.
     * @param {string} config.dataType - Tipo de datos ('numerico' o 'alfanumerico').
     * @param {number} [config.occupancyDensity=70] - Umbral de densidad para expansión.
     * @param {number} [config.reductionDensity=30] - Umbral de densidad para reducción.
     */
    create(config) {
        this.numBuckets = config.numBuckets || 2;
        this.recordsPerRow = config.recordsPerRow || 2;
        this.occupancyThreshold = config.occupancyDensity || 70;
        this.reductionThreshold = config.reductionDensity || 30;
        this.keyLength = config.keyLength;
        this.dataType = config.dataType;
        this.created = true;
        this._initializeMatrix();
        this.saveSnapshot('Estructura inicial creada.', false);
    }

    /**
     * Inicializa la matriz de cubetas y bloques de colisión.
     * @private
     */
    _initializeMatrix() {
        // En este modelo horizontal: matrix[columna][fila]
        this.matrix = [];
        this.collisionBlocks = [];
        for (let i = 0; i < this.numBuckets; i++) {
            this.matrix.push(new Array(this.recordsPerRow).fill(null));
            this.collisionBlocks.push([]);
        }
    }

    /**
     * Guarda una captura del estado actual en el historial.
     * @param {string} description - Descripción del cambio o estado.
     * @param {boolean} [isStructural=false] - Indica si el cambio altera la estructura física.
     */
    saveSnapshot(description, isStructural = false) {
        // Eliminar estados futuros si estamos en el pasado y realizamos un cambio
        if (this.historyIndex < this.history.length - 1) {
            this.history = this.history.slice(0, this.historyIndex + 1);
        }

        const snapshot = {
            matrix: this.matrix.map(col => [...col]),
            collisionBlocks: this.collisionBlocks.map(block => [...block]),
            numBuckets: this.numBuckets,
            recordsPerRow: this.recordsPerRow,
            count: this.count,
            expansionDO: this.getOccupancyDensity(),
            reductionDO: this.getReductionDensity(),
            description: description,
            isStructural: isStructural
        };

        this.history.push(snapshot);
        this.historyIndex = this.history.length - 1;
    }

    /**
     * Calcula la densidad de ocupación actual para expansión.
     * @returns {number} Porcentaje de ocupación (0-100).
     */
    getOccupancyDensity() {
        if (!this.created || this.numBuckets === 0) return 0;
        const totalSlots = this.numBuckets * this.recordsPerRow;
        return (this.count / totalSlots) * 100;
    }

    /**
     * Calcula la densidad de ocupación actual para reducción.
     * @returns {number} Porcentaje relativo (Claves/Cubetas).
     */
    getReductionDensity() {
        if (!this.created || this.numBuckets === 0) return 0;
        // Fórmula : (Claves / Número de cubetas) * 100
        return (this.count / this.numBuckets) * 100;
    }

    /**
     * Inserta una clave en la estructura, manejando colisiones y expansiones totales.
     * @param {string|number} rawKey - Clave a insertar.
     * @returns {Object} Resultado de la operación (success, bucketIndex, etc).
     */
    insert(rawKey) {
        if (!this.created) return { success: false, error: 'Debe crear la estructura.' };

        // Si estamos viendo el pasado, no permitimos cambios sin volver al presente o simplemente forzamos el presente
        this.historyIndex = this.history.length - 1;

        const { valid, key, error } = this.validateKey(rawKey);
        if (!valid) return { success: false, error };

        const k = this.getNumericValue(key);
        const bucketIndex = k % this.numBuckets;
        const formula = `h(${k}) = ${k} mod ${this.numBuckets} = ${bucketIndex}`;

        let inserted = false;
        let slotIndex = -1;

        // Buscar espacio en la columna (cubeta)
        for (let j = 0; j < this.recordsPerRow; j++) {
            if (this.matrix[bucketIndex][j] === null) {
                this.matrix[bucketIndex][j] = key;
                this.insertionOrder.push(key);
                this.count++;
                slotIndex = j;
                inserted = true;
                break;
            }
        }

        if (!inserted) {
            // Colisión: Insertar de forma ordenada en el bloque de colisión dinámico
            const collBlock = this.collisionBlocks[bucketIndex];
            let insertPos = collBlock.length;
            for (let i = 0; i < collBlock.length; i++) {
                if (this._compareKeys(key, collBlock[i]) < 0) {
                    insertPos = i;
                    break;
                }
            }
            collBlock.splice(insertPos, 0, key);
            this.insertionOrder.push(key);
            this.count++;

            this.saveSnapshot(`Colisión: clave "${key}" enviada a bloque de colisión ${bucketIndex}.`, false);
        }

        const currentDO = this.getOccupancyDensity();
        let expanded = false;
        let expansionDetails = null;

        if (currentDO > this.occupancyThreshold) {
            this.saveSnapshot(`Estado antes de expansión (> ${this.occupancyThreshold}%).`, true);
            expansionDetails = this._expand();
            expanded = true;
            this.saveSnapshot(`Expansión a ${this.numBuckets} cubetas.`, true);
        } else {
            if (inserted) {
                this.saveSnapshot(`Clave "${key}" insertada.`, false);
            }
        }

        // Determinar estado final para el reporte
        const finalSearch = this.search(key);

        return {
            success: true,
            bucketIndex: finalSearch.bucketIndex,
            slotIndex: finalSearch.slotIndex,
            isCollision: finalSearch.isCollision,
            collisionIndex: finalSearch.isCollision ? finalSearch.collisionIndex : -1,
            formula,
            density: currentDO,
            expanded,
            expansionDetails
        };
    }

    /**
     * Realiza la expansión total (duplicado) de la estructura.
     * @private
     * @returns {Object} Detalles de la expansión realizada.
     */
    _expand() {
        const oldBuckets = this.numBuckets;
        const allKeysOrdered = [...this.insertionOrder];

        this.numBuckets *= 2;
        this.count = 0;
        this.insertionOrder = []; // Se volverá a llenar al re-insertar
        this._initializeMatrix();

        // Re-hashear en el mismo orden original
        for (const key of allKeysOrdered) {
            const k = this.getNumericValue(key);
            const bucketIndex = k % this.numBuckets;
            let placed = false;
            for (let j = 0; j < this.recordsPerRow; j++) {
                if (this.matrix[bucketIndex][j] === null) {
                    this.matrix[bucketIndex][j] = key;
                    this.insertionOrder.push(key);
                    this.count++;
                    placed = true;
                    break;
                }
            }
            if (!placed) {
                // Si incluso después de expandir sigue habiendo colisión (extremadamente raro con Dinamica Totales pero posible si M es muy pequeño)
                const collBlock = this.collisionBlocks[bucketIndex];
                collBlock.push(key); // El orden se mantendrá por el orden de inserción original + compareKeys si fuera necesario, pero aquí basta push
                collBlock.sort((a, b) => this._compareKeys(a, b));
                this.insertionOrder.push(key);
                this.count++;
            }
        }

        return {
            oldBuckets,
            newBuckets: this.numBuckets,
            newDensity: this.getOccupancyDensity()
        };
    }

    /**
     * Realiza la reducción total (división) de la estructura.
     * @private
     * @returns {Object|null} Detalles de la reducción o null si no es posible.
     */
    _reduce() {
        if (this.numBuckets <= 2) return null; // Mínimo 2 cubetas

        const oldBuckets = this.numBuckets;
        const allKeysOrdered = [...this.insertionOrder];

        this.numBuckets /= 2;
        this.count = 0;
        this.insertionOrder = [];
        this._initializeMatrix();

        // Re-hashear
        for (const key of allKeysOrdered) {
            const k = this.getNumericValue(key);
            const bucketIndex = k % this.numBuckets;
            let placed = false;
            for (let j = 0; j < this.recordsPerRow; j++) {
                if (this.matrix[bucketIndex][j] === null) {
                    this.matrix[bucketIndex][j] = key;
                    this.insertionOrder.push(key);
                    this.count++;
                    placed = true;
                    break;
                }
            }
            if (!placed) {
                const collBlock = this.collisionBlocks[bucketIndex];
                collBlock.push(key);
                collBlock.sort((a, b) => this._compareKeys(a, b));
                this.insertionOrder.push(key);
                this.count++;
            }
        }

        return {
            oldBuckets,
            newBuckets: this.numBuckets,
            newDensity: this.getOccupancyDensity()
        };
    }

    /**
     * Obtiene todas las claves insertadas en su orden original.
     * @private
     * @returns {string[]} Lista de claves.
     */
    _getAllKeysOrdered() {
        return [...this.insertionOrder];
    }

    /**
     * Busca una clave en el snapshot actual de la estructura.
     * @param {string|number} rawKey - Clave a buscar.
     * @returns {Object} Resultado de la búsqueda (found, bucketIndex, etc).
     */
    search(rawKey) {
        // Buscar en el estado que se está visualizando actualmente
        const currentSnapshot = this.getCurrentSnapshot();
        const key = this._prepareKey(rawKey);
        const k = this.getNumericValue(key);
        const n = currentSnapshot.numBuckets;
        const bucketIndex = k % n;
        const formula = `h(${k}) = ${k} mod ${n} = ${bucketIndex}`;

        for (let j = 0; j < currentSnapshot.recordsPerRow; j++) {
            if (currentSnapshot.matrix[bucketIndex][j] === key) {
                return { found: true, bucketIndex, slotIndex: j, isCollision: false, formula };
            }
        }

        // Buscar en bloque de colisión
        const collBlock = currentSnapshot.collisionBlocks[bucketIndex];
        if (collBlock) {
            const cIdx = collBlock.indexOf(key);
            if (cIdx !== -1) {
                return { found: true, bucketIndex, slotIndex: -1, isCollision: true, collisionIndex: cIdx, formula };
            }
        }

        return { found: false, bucketIndex, formula };
    }

    /**
     * Elimina una clave de la estructura y maneja la reducción si es necesaria.
     * @param {string|number} rawKey - Clave a eliminar.
     * @returns {Object} Resultado de la operación (success, error, etc).
     */
    delete(rawKey) {
        // Solo permitimos eliminar en el presente real
        this.historyIndex = this.history.length - 1;
        const result = this.search(rawKey);
        if (result.found) {
            if (result.isCollision) {
                this.collisionBlocks[result.bucketIndex].splice(result.collisionIndex, 1);
            } else {
                this.matrix[result.bucketIndex][result.slotIndex] = null;
            }
            this.count--;

            // Eliminar de insertionOrder
            const keyToDel = this._prepareKey(rawKey);
            const idx = this.insertionOrder.indexOf(keyToDel);
            if (idx !== -1) this.insertionOrder.splice(idx, 1);

            const expansionDO = this.getOccupancyDensity();
            const reductionDO = this.getReductionDensity();
            let reduced = false;
            let reductionDetails = null;
            let reductionSkippedByGuard = false;

            // Verificamos reducción con la fórmula específica
            if (reductionDO < this.reductionThreshold && this.numBuckets > 2) {
                // GUARD (Rebound Protection): Evitar reducir si la nueva estructura expandiría inmediatamente
                const projectedBuckets = this.numBuckets / 2;
                const projectedSlots = projectedBuckets * this.recordsPerRow;
                const projectedExpansionDO = (this.count / projectedSlots) * 100;

                if (projectedExpansionDO <= this.occupancyThreshold) {
                    this.saveSnapshot(`Estado antes de reducción (< ${this.reductionThreshold}%).`, true);
                    reductionDetails = this._reduce();
                    reduced = true;
                    this.saveSnapshot(`Reducción a ${this.numBuckets} cubetas.`, true);
                } else {
                    reductionSkippedByGuard = true;
                    this.saveSnapshot(`Clave "${rawKey}" eliminada. Reducción cancelada: evitaría expansión inmediata.`, false);
                }
            } else {
                this.saveSnapshot(`Clave "${rawKey}" eliminada.`, false);
            }

            return {
                success: true,
                ...result,
                density: expansionDO,
                reductionDensity: reductionDO,
                reduced,
                reductionDetails,
                reductionSkippedByGuard
            };
        }
        return { success: false, error: 'Clave no encontrada.' };
    }

    /**
     * Determina si es posible retroceder en el historial estructural.
     * @returns {boolean}
     */
    canGoBack() {
        return this._findPrevStructuralIndex() !== -1;
    }

    /**
     * Determina si es posible avanzar en el historial estructural.
     * @returns {boolean}
     */
    canGoForward() {
        return this._findNextStructuralIndex() !== -1;
    }

    /**
     * Retrocede al estado estructural anterior en el historial.
     */
    goBack() {
        const prevIdx = this._findPrevStructuralIndex();
        if (prevIdx !== -1) {
            this.historyIndex = prevIdx;
        }
    }

    /**
     * Avanza al siguiente estado estructural en el historial.
     */
    goForward() {
        const nextIdx = this._findNextStructuralIndex();
        if (nextIdx !== -1) {
            this.historyIndex = nextIdx;
        }
    }

    /**
     * Busca el índice del estado estructural previo en el historial.
     * @private
     * @returns {number} Índice o -1 si no se encuentra.
     */
    _findPrevStructuralIndex() {
        for (let i = this.historyIndex - 1; i >= 0; i--) {
            if (this.history[i].isStructural) return i;
        }
        return -1;
    }

    /**
     * Busca el índice del siguiente estado estructural en el historial.
     * @private
     * @returns {number} Índice o -1 si no se encuentra.
     */
    _findNextStructuralIndex() {
        // Buscar el siguiente estado estructural
        for (let i = this.historyIndex + 1; i < this.history.length; i++) {
            if (this.history[i].isStructural) return i;
        }
        // Si no hay más estados estructurales hacia adelante, 
        // permitir ir al último estado (el presente) si no estamos ya ahí
        if (this.historyIndex < this.history.length - 1) {
            return this.history.length - 1;
        }
        return -1;
    }

    /**
     * Obtiene la captura del estado actual según el índice del historial.
     * @returns {Object} Estado de la estructura.
     */
    getCurrentSnapshot() {
        return this.history[this.historyIndex];
    }

    /**
     * Valida una clave según el tipo de datos, longitud y unicidad.
     * @param {string|number} rawKey - Clave a validar.
     * @returns {Object} Valid (boolean), key (padded) o error.
     */
    validateKey(rawKey) {
        if (!rawKey || rawKey.toString().trim() === '') return { valid: false, error: 'Ingrese una clave.' };
        let key = rawKey.toString().trim();
        if (this.dataType === 'numerico' && !/^\d+$/.test(key)) return { valid: false, error: 'Debe ser numérico.' };

        if (key.length > this.keyLength) {
            return { valid: false, error: `La clave debe tener máximo ${this.keyLength} caracteres.` };
        } else if (key.length < this.keyLength) {
            key = key.padStart(this.keyLength, '0');
        }

        if (this._getAllKeysOrdered().includes(key)) return { valid: false, error: 'La clave ya existe.' };
        return { valid: true, key };
    }

    /**
     * Valida una clave para operaciones de búsqueda o eliminación (sin duplicados).
     * @param {string|number} rawKey - Clave a validar.
     * @returns {Object} Valid (boolean), error, y showPopup flag.
     */
    validateSearchKey(rawKey) {
        if (!rawKey || rawKey.toString().trim() === '') return { valid: false, error: 'Ingrese una clave.', showPopup: true };
        let key = rawKey.toString().trim();
        if (this.dataType === 'numerico' && !/^\d+$/.test(key)) return { valid: false, error: 'Debe ser numérico.', showPopup: true };

        if (key.length > this.keyLength) {
            return { valid: false, error: `La clave debe tener máximo ${this.keyLength} caracteres.`, showPopup: false };
        } else if (key.length < this.keyLength) {
            key = key.padStart(this.keyLength, '0');
        }

        return { valid: true, key };
    }

    /**
     * Convierte una clave a su valor numérico base para cálculos hash.
     * @param {string} key - Clave normalizada.
     * @returns {number} Valor numérico resultante.
     */
    getNumericValue(key) {
        if (/^\d+$/.test(key)) return parseInt(key, 10);
        let sum = 0;
        for (let i = 0; i < key.length; i++) sum += key.charCodeAt(i);
        return sum;
    }

    /**
     * Normaliza y aplica padding a una clave según la configuración.
     * @private
     * @param {string|number} rawKey - Clave original.
     * @returns {string} Clave procesada.
     */
    _prepareKey(rawKey) {
        let key = rawKey.toString().trim();
        if (key.length < this.keyLength) {
            key = key.padStart(this.keyLength, '0');
        }
        return key;
    }

    /**
     * Compara dos claves numéricamente para ordenamiento.
     * @private
     * @param {string} a - Primera clave.
     * @param {string} b - Segunda clave.
     * @returns {number} Resultado de la resta (A - B).
     */
    _compareKeys(a, b) {
        const valA = this.getNumericValue(a);
        const valB = this.getNumericValue(b);
        return valA - valB;
    }
}
