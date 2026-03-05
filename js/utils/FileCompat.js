/**
 * @fileoverview Defines file compatibility groups.
 * Files saved by algorithms within the same group can be loaded
 * by any other algorithm in that group.
 * @module utils/FileCompat
 */

const FileCompat = {
    /**
     * Compatibility groups.
     * Each group maps a group name to the set of algorithm names that are compatible.
     */
    _groups: {
        linear: ['busqueda-secuencial', 'busqueda-binaria'],
        hash: ['busqueda-hash-mod', 'busqueda-hash-cuadrado', 'hash-truncamiento', 'hash-plegamiento'],
        tree: ['arboles-digitales', 'arboles-residuos', 'arboles-residuos-multiples'],
        huffman: ['arboles-huffman'],
        blockSearch: ['ext-secuencial-bloques', 'ext-binaria-bloques']
    },

    /**
     * Returns the group name for a given algorithm, or null if not in any group.
     * @param {string} algorithmName
     * @returns {string|null}
     */
    getGroup(algorithmName) {
        for (const [group, members] of Object.entries(this._groups)) {
            if (members.includes(algorithmName)) return group;
        }
        return null;
    },

    /**
     * Checks if two algorithm names are compatible (in the same group).
     * If either is null/undefined, they are NOT compatible (strict check).
     * If both are the same string, they are compatible.
     * @param {string} algoA
     * @param {string} algoB
     * @returns {boolean}
     */
    areCompatible(algoA, algoB) {
        if (!algoA || !algoB) return false;
        if (algoA === algoB) return true;

        const groupA = this.getGroup(algoA);
        const groupB = this.getGroup(algoB);

        if (!groupA || !groupB) return false;
        return groupA === groupB;
    },

    /**
     * Returns a user-friendly name for the group.
     * @param {string} groupName
     * @returns {string}
     */
    getGroupDisplayName(groupName) {
        const names = {
            linear: 'Búsquedas Lineales (Secuencial/Binaria)',
            hash: 'Funciones Hash',
            tree: 'Árboles por Residuos'
        };
        return names[groupName] || groupName;
    }
};
