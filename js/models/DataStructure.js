/**
 * @fileoverview Modelo de la estructura de datos principal.
 * Gestiona el arreglo de claves y su configuración (tipo, tamaño, duplicados).
 * Provee operaciones de inserción, eliminación, búsqueda secuencial y binaria,
 * así como métodos de serialización para guardar/cargar.
 * @module models/DataStructure
 */

/**
 * Clase que representa la estructura de datos (arreglo de claves).
 */
class DataStructure {
    /** Inicializa la estructura en estado vacío. */
    constructor() {
        this.reset();
    }

    /**
     * Reinicia todos los campos al estado inicial.
     */
    reset() {
        /** @type {Array<string|null>} Arreglo de claves (null = vacío) */
        this.keys = [];
        /** @type {number} Tamaño máximo del arreglo */
        this.size = 0;
        /** @type {number} Longitud de cada clave */
        this.keyLength = 0;
        /** @type {string} Tipo de dato: 'numerico', 'texto', 'alfanumerico' */
        this.dataType = '';
        /** @type {boolean} Indica si se permiten claves repetidas */
        this.allowDuplicates = true;
        /** @type {boolean} Indica si la estructura fue creada */
        this.created = false;
        /** @type {number} Cantidad de claves insertadas */
        this.count = 0;
    }

    /**
     * Crea la estructura con los parámetros dados.
     * @param {number} size - Número máximo de posiciones.
     * @param {number} keyLength - Longitud de cada clave.
     * @param {string} dataType - Tipo de dato aceptado.
     * @param {boolean} allowDuplicates - Si se permiten claves repetidas.
     */
    create(size, keyLength, dataType, allowDuplicates) {
        this.size = size;
        this.keyLength = keyLength;
        this.dataType = dataType;
        this.allowDuplicates = allowDuplicates;
        this.keys = new Array(size).fill(null);
        this.created = true;
        this.count = 0;
    }

    /**
     * Valida y normaliza una clave de acuerdo a la configuración.
     * Para claves numéricas más cortas que keyLength, aplica zero-padding.
     * @param {string} rawKey - Clave ingresada por el usuario.
     * @returns {{valid: boolean, key: string|null, error: string|null}}
     */
    validateKey(rawKey) {
        if (rawKey === undefined || rawKey === null || rawKey.toString().trim() === '') {
            return { valid: false, key: null, error: 'Debe ingresar una clave.' };
        }

        let key = rawKey.toString().trim();

        // Validar tipo de dato
        if (this.dataType === 'numerico') {
            if (!/^\d+$/.test(key)) {
                return { valid: false, key: null, error: 'La clave debe ser numérica. Solo se permiten dígitos (0-9).' };
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
                return { valid: false, key: null, error: 'La clave debe ser alfanumérica (letras y/o números, sin espacios ni símbolos).' };
            }
        }

        // Validar longitud
        if (key.length !== this.keyLength) {
            if (this.dataType === 'numerico' && key.length > this.keyLength) {
                return { valid: false, key: null, error: `La clave numérica excede el tamaño definido de ${this.keyLength} dígitos.` };
            } else if (this.dataType !== 'numerico') {
                return { valid: false, key: null, error: `El tamaño de la clave debe ser exactamente ${this.keyLength} carácter(es). Tamaño actual: ${key.length}.` };
            }
        }

        // Verificar duplicados
        if (!this.allowDuplicates && this.keys.includes(key)) {
            return { valid: false, key: null, error: `La clave "${key}" ya existe y no se permiten claves repetidas.` };
        }

        return { valid: true, key: key, error: null };
    }

    /**
     * Inserta una clave en la siguiente posición vacía (inserción lineal).
     * @param {string} rawKey - Clave a insertar.
     * @returns {{success: boolean, position: number, error: string|null}}
     */
    insert(rawKey) {
        if (!this.created) {
            return { success: false, position: -1, error: 'Debe crear la estructura antes de insertar claves.' };
        }
        if (this.count >= this.size) {
            return { success: false, position: -1, error: 'La estructura está llena. No se pueden insertar más claves.' };
        }

        const validation = this.validateKey(rawKey);
        if (!validation.valid) {
            return { success: false, position: -1, error: validation.error };
        }

        for (let i = 0; i < this.size; i++) {
            if (this.keys[i] === null) {
                this.keys[i] = validation.key;
                this.count++;
                return { success: true, position: i, error: null };
            }
        }
        return { success: false, position: -1, error: 'No se encontró espacio disponible.' };
    }

    /**
     * Compara dos claves según el tipo de dato.
     * Para claves numéricas (ya paddeadas a igual longitud) usa comparación
     * lexicográfica, que preserva el orden numérico correcto y evita
     * pérdida de precisión con números grandes (>16 dígitos).
     * Para texto/alfanumérico usa comparación carácter por carácter por código ASCII.
     * @param {string} a - Primera clave.
     * @param {string} b - Segunda clave.
     * @returns {number} Negativo si a < b, 0 si iguales, positivo si a > b.
     */
    _compareKeys(a, b) {
        if (this.dataType === 'numerico') {
            // Las claves numéricas ya están paddeadas con ceros a la misma longitud,
            // por lo que la comparación lexicográfica preserva el orden numérico.
            if (a < b) return -1;
            if (a > b) return 1;
            return 0;
        }
        // Para texto y alfanumérico: comparación carácter por carácter por código ASCII
        for (let i = 0; i < Math.min(a.length, b.length); i++) {
            const diff = a.charCodeAt(i) - b.charCodeAt(i);
            if (diff !== 0) return diff;
        }
        return a.length - b.length;
    }

    /**
     * Inserta una clave manteniendo el arreglo ordenado ascendentemente.
     * Desplaza los elementos mayores una posición a la derecha.
     * Para claves no numéricas se ordena por código ASCII.
     * @param {string} rawKey - Clave a insertar.
     * @returns {{success: boolean, position: number, error: string|null}}
     */
    sortedInsert(rawKey) {
        if (!this.created) {
            return { success: false, position: -1, error: 'Debe crear la estructura antes de insertar claves.' };
        }
        if (this.count >= this.size) {
            return { success: false, position: -1, error: 'La estructura está llena. No se pueden insertar más claves.' };
        }

        const validation = this.validateKey(rawKey);
        if (!validation.valid) {
            return { success: false, position: -1, error: validation.error };
        }

        const key = validation.key;

        // Encontrar la posición correcta dentro de las claves existentes
        let insertPos = this.count; // por defecto al final de los datos
        for (let i = 0; i < this.count; i++) {
            if (this._compareKeys(key, this.keys[i]) < 0) {
                insertPos = i;
                break;
            }
        }

        // Desplazar elementos a la derecha desde el final hasta la posición de inserción
        for (let i = this.count; i > insertPos; i--) {
            this.keys[i] = this.keys[i - 1];
        }

        this.keys[insertPos] = key;
        this.count++;
        return { success: true, position: insertPos, error: null };
    }

    /**
     * Elimina una clave y realiza corrimiento hacia la izquierda.
     * @param {string} rawKey - Clave a eliminar.
     * @returns {{success: boolean, position: number, error: string|null}}
     */
    delete(rawKey) {
        if (!this.created) {
            return { success: false, position: -1, error: 'No hay estructura creada.' };
        }

        const key = rawKey.toString().trim();
        if (key === '') {
            return { success: false, position: -1, error: 'Debe ingresar la clave a borrar.' };
        }

        let searchKey = key;
        if (this.dataType === 'numerico' && /^\d+$/.test(key) && key.length < this.keyLength) {
            searchKey = key.padStart(this.keyLength, '0');
        }

        const index = this.keys.indexOf(searchKey);
        if (index === -1) {
            return { success: false, position: -1, error: `La clave "${searchKey}" no fue encontrada en la estructura.` };
        }

        this.keys.splice(index, 1);
        this.keys.push(null);
        this.count--;
        return { success: true, position: index, error: null };
    }

    /**
     * Búsqueda secuencial: recorre el arreglo posición por posición.
     * @param {string} rawKey - Clave a buscar.
     * @returns {{found: boolean, position: number, steps: Array<{index: number, key: string, match: boolean}>}}
     */
    sequentialSearch(rawKey) {
        const key = rawKey.toString().trim();
        let searchKey = key;
        if (this.dataType === 'numerico' && /^\d+$/.test(key) && key.length < this.keyLength) {
            searchKey = key.padStart(this.keyLength, '0');
        }

        const steps = [];
        for (let i = 0; i < this.size; i++) {
            if (this.keys[i] === null) break;
            const isMatch = this.keys[i] === searchKey;
            steps.push({ index: i, key: this.keys[i], match: isMatch });
            if (isMatch) {
                return { found: true, position: i, steps: steps };
            }
        }
        return { found: false, position: -1, steps: steps };
    }

    /**
     * Búsqueda binaria: requiere estructura ordenada.
     * La igualdad (==) se verifica al final, cuando el rango se reduce a un solo elemento,
     * para minimizar el costo computacional dentro del bucle.
     * @param {string} rawKey - Clave a buscar.
     * @returns {{found: boolean, position: number, steps: Array<{low: number, high: number, mid: number, midKey: string, action: string}>}}
     */
    binarySearch(rawKey) {
        const key = rawKey.toString().trim();
        let searchKey = key;
        if (this.dataType === 'numerico' && /^\d+$/.test(key) && key.length < this.keyLength) {
            searchKey = key.padStart(this.keyLength, '0');
        }

        const steps = [];
        let low = 0;
        let high = this.count - 1;

        while (low <= high) {
            const mid = Math.floor((low + high) / 2);
            const midKey = this.keys[mid];
            const cmp = this._compareKeys(searchKey, midKey);

            if (cmp === 0) {
                // Clave encontrada en el punto medio
                steps.push({ low, high, mid, midKey, action: 'encontrada' });
                return { found: true, position: mid, steps };
            } else if (cmp < 0) {
                // La clave buscada es menor, descarta mitad derecha
                steps.push({ low, high, mid, midKey, action: 'descarta-derecha' });
                high = mid - 1;
            } else {
                // La clave buscada es mayor, descarta mitad izquierda
                steps.push({ low, high, mid, midKey, action: 'descarta-izquierda' });
                low = mid + 1;
            }
        }

        // No encontrada — agregar paso final indicando fallo
        if (steps.length === 0) {
            steps.push({ low: 0, high: 0, mid: 0, midKey: this.keys[0] || '', action: 'no-encontrada' });
        } else {
            const last = steps[steps.length - 1];
            steps.push({ low: last.low, high: last.high, mid: last.mid, midKey: last.midKey, action: 'no-encontrada' });
        }

        return { found: false, position: -1, steps };
    }

    /**
     * Serializa la estructura a un objeto JSON para guardar.
     * @returns {Object} Objeto con los campos de la estructura.
     */
    toJSON() {
        return {
            keys: this.keys,
            size: this.size,
            keyLength: this.keyLength,
            dataType: this.dataType,
            allowDuplicates: this.allowDuplicates,
            count: this.count
        };
    }

    /**
     * Carga la estructura desde un objeto JSON previamente guardado.
     * @param {Object} data - Datos parseados del archivo JSON.
     */
    fromJSON(data) {
        this.keys = data.keys;
        this.size = data.size;
        this.keyLength = data.keyLength;
        this.dataType = data.dataType;
        this.allowDuplicates = data.allowDuplicates;
        this.count = data.count;
        this.created = true;
    }

    /**
     * Limpia todas las claves pero mantiene la configuración de la estructura.
     */
    clearKeys() {
        this.keys = new Array(this.size).fill(null);
        this.count = 0;
    }
}
