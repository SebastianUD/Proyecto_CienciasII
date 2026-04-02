/**
 * @fileoverview Modelo para cálculos de Índices en archivos.
 * Implementa los cálculos de Índice Primario (No Denso), Índice Secundario (Denso),
 * Índice Multinivel Primario e Índice Multinivel Secundario.
 * @module models/IndicesModel
 */

/**
 * Tipos de índice soportados.
 * @readonly
 * @enum {string}
 */
const IndexType = {
    PRIMARY: 'primario',
    SECONDARY: 'secundario',
    MULTILEVEL_PRIMARY: 'multinivel-primario',
    MULTILEVEL_SECONDARY: 'multinivel-secundario'
};

/**
 * Modelo de cálculos de índices.
 */
class IndicesModel {
    constructor() {
        /** @type {boolean} */
        this.created = false;

        /** @type {string} Tipo de índice */
        this.indexType = '';

        /** @type {number} Número total de registros */
        this.r = 0;

        /** @type {number} Tamaño del bloque (bytes) */
        this.B = 0;

        /** @type {number} Longitud del registro de datos (bytes) */
        this.R = 0;

        /** @type {number} Longitud del registro índice (bytes) */
        this.Ri = 0;

        /** @type {Object} Resultados de los cálculos */
        this.results = {};
    }

    /**
     * Crea y calcula el índice a partir de los parámetros dados.
     * @param {string} indexType - Tipo de índice (IndexType enum).
     * @param {number} r - Número total de registros.
     * @param {number} B - Tamaño de bloque en bytes.
     * @param {number} R - Longitud del registro de datos en bytes.
     * @param {number} Ri - Longitud del registro índice en bytes.
     * @returns {{success: boolean, error?: string}}
     */
    create(indexType, r, B, R, Ri) {
        if (!indexType) return { success: false, error: 'Debe seleccionar un tipo de índice.' };
        if (!r || r <= 0) return { success: false, error: 'El número de registros (r) debe ser un entero positivo.' };
        if (!B || B <= 0) return { success: false, error: 'El tamaño del bloque (B) debe ser un entero positivo.' };
        if (!R || R <= 0) return { success: false, error: 'La longitud del registro (R) debe ser un entero positivo.' };
        if (!Ri || Ri <= 0) return { success: false, error: 'La longitud del registro índice (Ri) debe ser un entero positivo.' };
        if (R > B) return { success: false, error: 'La longitud del registro (R) no puede ser mayor que el tamaño del bloque (B).' };
        if (Ri > B) return { success: false, error: 'La longitud del registro índice (Ri) no puede ser mayor que el tamaño del bloque (B).' };

        this.indexType = indexType;
        this.r = r;
        this.B = B;
        this.R = R;
        this.Ri = Ri;

        this._calculate();
        this.created = true;

        return { success: true };
    }

    /**
     * Realiza todos los cálculos según el tipo de índice.
     * @private
     */
    _calculate() {
        const { r, B, R, Ri } = this;

        // === Cálculos Estructura de Datos (común a todos) ===
        const bfr = Math.floor(B / R);           // Registros dato por bloque
        const b = Math.ceil(r / bfr);             // Bloques de datos
        const accessData = Math.ceil(Math.log2(b)); // Accesos sin índice (búsqueda binaria)

        // === Cálculos de Índice ===
        const bfri = Math.floor(B / Ri);          // Entradas índice por bloque (fan-out)

        let ri, bi, accessIndex, totalAccess;
        let levels = [];

        switch (this.indexType) {
            case IndexType.PRIMARY:
                // No Denso: una entrada por cada bloque de datos
                ri = b;
                bi = Math.ceil(ri / bfri);
                accessIndex = Math.ceil(Math.log2(bi));
                totalAccess = accessIndex + 1;
                break;

            case IndexType.SECONDARY:
                // Denso: una entrada por cada registro
                ri = r;
                bi = Math.ceil(ri / bfri);
                accessIndex = Math.ceil(Math.log2(bi));
                totalAccess = accessIndex + 1;
                break;

            case IndexType.MULTILEVEL_PRIMARY:
                // Multinivel sobre primario (no denso)
                ri = b;  // 1er nivel: entradas = bloques datos
                bi = Math.ceil(ri / bfri);
                levels.push({ level: 1, bi: bi });

                // Iterar hasta llegar a 1 bloque
                let currentBi_mp = bi;
                let levelNum_mp = 2;
                while (currentBi_mp > 1) {
                    currentBi_mp = Math.ceil(currentBi_mp / bfri);
                    levels.push({ level: levelNum_mp, bi: currentBi_mp });
                    levelNum_mp++;
                }

                accessIndex = levels.length; // t = número de niveles
                totalAccess = accessIndex + 1;
                break;

            case IndexType.MULTILEVEL_SECONDARY:
                // Multinivel sobre secundario (denso)
                ri = r;  // 1er nivel: entradas = registros
                bi = Math.ceil(ri / bfri);
                levels.push({ level: 1, bi: bi });

                let currentBi_ms = bi;
                let levelNum_ms = 2;
                while (currentBi_ms > 1) {
                    currentBi_ms = Math.ceil(currentBi_ms / bfri);
                    levels.push({ level: levelNum_ms, bi: currentBi_ms });
                    levelNum_ms++;
                }

                accessIndex = levels.length;
                totalAccess = accessIndex + 1;
                break;
        }

        // Desperdicio en estructura de datos
        const wasteData = (b * bfr) - r;

        // Desperdicio en estructura de índice (1er nivel)
        const wasteIndex = (bi * bfri) - ri;

        this.results = {
            // Estructura de datos
            bfr,
            b,
            accessData,
            wasteData,
            // Estructura de índice
            bfri,
            ri,
            bi,
            accessIndex,
            totalAccess,
            wasteIndex,
            // Multinivel
            levels,
            // Helpers for drawing
            isDense: this.indexType === IndexType.SECONDARY || this.indexType === IndexType.MULTILEVEL_SECONDARY,
            isMultilevel: this.indexType === IndexType.MULTILEVEL_PRIMARY || this.indexType === IndexType.MULTILEVEL_SECONDARY
        };
    }

    /**
     * Resetea el modelo.
     */
    reset() {
        this.created = false;
        this.indexType = '';
        this.r = 0;
        this.B = 0;
        this.R = 0;
        this.Ri = 0;
        this.results = {};
    }

    /**
     * Serializa el modelo para guardar en archivo.
     * @returns {Object}
     */
    toJSON() {
        return {
            indexType: this.indexType,
            r: this.r,
            B: this.B,
            R: this.R,
            Ri: this.Ri,
            results: this.results
        };
    }

    /**
     * Restaura el modelo desde un JSON.
     * @param {Object} data
     */
    fromJSON(data) {
        this.indexType = data.indexType;
        this.r = data.r;
        this.B = data.B;
        this.R = data.R;
        this.Ri = data.Ri;
        this.results = data.results;
        this.created = true;
    }
}
