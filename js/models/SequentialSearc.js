import { BaseListModel } from './base/BaseList.js';

/**
 * Modelo para Búsqueda Secuencial
 * --------------------------------
 * Extiende BaseListModel e implementa el algoritmo de búsqueda secuencial.
 */
export class SequentialSearchModel extends BaseListModel {
    constructor() {
        super();
    }

    /**
     * Busca un número utilizando el algoritmo de Búsqueda Secuencial.
     * @param {number} objetivo - El número a buscar.
     * @returns {number} - El índice del número o -1 si no se encuentra.
     */
    buscar(objetivo) {
        // Accedemos a la lista a través del getter heredado
        const lista = this.lista;
        for (let i = 0; i < lista.length; i++) {
            if (lista[i] === objetivo) {
                return i;
            }
        }
        return -1;
    }
}
