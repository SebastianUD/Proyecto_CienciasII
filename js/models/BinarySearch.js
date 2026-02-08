import { BaseListModel } from './base/BaseList.js';

/**
 * Modelo para Búsqueda Binaria
 * ----------------------------
 * Extiende BaseListModel e implementa el algoritmo de búsqueda binaria.
 */
export class BinarySearchModel extends BaseListModel {
    constructor() {
        super();
    }

    /**
     * Busca un número utilizando el algoritmo de Búsqueda Binaria.
     * @param {number} objetivo - El número a buscar.
     * @returns {number} - El índice del número o -1 si no se encuentra.
     */
    buscar(objetivo) {
        const lista = this.lista;
        let inicio = 0;
        let fin = lista.length - 1;

        while (inicio <= fin) {
            let medio = Math.floor((inicio + fin) / 2);
            let valorMedio = lista[medio];

            if (valorMedio === objetivo) {
                return medio;
            } else if (valorMedio < objetivo) {
                inicio = medio + 1;
            } else {
                fin = medio - 1;
            }
        }

        return -1;
    }

    /**
     * Sobrescribe cargarLista para validar que el archivo esté ordenado.
     * @param {Array<number>} nuevaLista
     */
    cargarLista(nuevaLista) {
        if (!Array.isArray(nuevaLista)) {
            throw new Error("El formato del archivo no es válido.");
        }
        if (nuevaLista.some(n => typeof n !== 'number' || n < 0 || n > 99)) {
            throw new Error("La lista contiene elementos no válidos (solo números 0-99).");
        }

        if (!this.#estaOrdenada(nuevaLista)) {
            const error = new Error("La lista no está ordenada.");
            error.code = 'UNSORTED';
            error.data = nuevaLista;
            throw error;
        }

        this.cargarFisica(nuevaLista);
    }

    /**
     * Carga una lista desordenada y la ordena.
     */
    cargarListaOrdenada(nuevaLista) {
        this.cargarFisica(nuevaLista);
        this.ordenar();
    }

    /**
     * Verifica si una lista está ordenada ascendentemente.
     * @private (#)
     */
    #estaOrdenada(lista) {
        for (let i = 0; i < lista.length - 1; i++) {
            if (lista[i] > lista[i + 1]) {
                return false;
            }
        }
        return true;
    }
}
