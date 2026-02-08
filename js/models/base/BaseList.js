/**
 * BaseList - Clase Base para Modelos de Lista
 * -------------------------------------------
 * PATRÓN DE DISEÑO: Herencia (Inheritance)
 * USO DE CAMPOS PRIVADOS (#): JavaScript moderno para encapsulación real.
 */
export class BaseListModel {
    #lista;
    #maxSize;

    constructor() {
        this.#lista = [];
        this.#maxSize = null;
    }

    /**
     * Getter para la lista (Permite acceso de lectura a clases hijas y vista).
     */
    get lista() {
        return this.#lista;
    }

    /**
     * Getter para el tamaño máximo.
     */
    get maxSize() {
        return this.#maxSize;
    }

    /**
     * Define el tamaño máximo de la lista y la reinicia.
     */
    definirTamano(size) {
        if (size <= 0) {
            throw new Error("El tamaño debe ser mayor a 0.");
        }
        this.#maxSize = size;
        this.#lista = [];
    }

    /**
     * Agrega un número a la lista si hay espacio y es válido.
     */
    agregarNumero(numero) {
        if (this.#lista.length >= this.#maxSize) {
            throw new Error("La lista está llena.");
        }
        if (numero < 0 || numero > 99) {
            throw new Error("El número debe estar entre 0 y 99.");
        }

        this.#lista.push(numero);
        this.ordenar(); // Usamos el método público de ordenamiento
    }

    /**
     * Elimina la primera ocurrencia de un número en la lista.
     */
    eliminarNumero(numero) {
        const index = this.#lista.indexOf(numero);
        if (index !== -1) {
            this.#lista.splice(index, 1);
        } else {
            throw new Error(`El número ${numero} no se encuentra en la lista.`);
        }
    }

    /**
     * Retorna una copia de la lista actual.
     */
    obtenerLista() {
        return [...this.#lista];
    }

    /**
     * Verifica si la lista está llena.
     */
    estaLleno() {
        return this.#lista.length >= this.#maxSize;
    }

    /**
     * Ordena la lista utilizando Bubble Sort.
     * Se deja como método público para que clases hijas (como Binaria)
     * puedan forzar el ordenamiento si es necesario.
     */
    ordenar() {
        let n = this.#lista.length;
        let intercambiado;
        do {
            intercambiado = false;
            for (let i = 0; i < n - 1; i++) {
                if (this.#lista[i] > this.#lista[i + 1]) {
                    let temp = this.#lista[i];
                    this.#lista[i] = this.#lista[i + 1];
                    this.#lista[i + 1] = temp;
                    intercambiado = true;
                }
            }
            n--;
        } while (intercambiado);
    }

    /**
     * Exporta la lista actual a formato JSON string.
     */
    exportarLista() {
        return JSON.stringify(this.#lista);
    }

    /**
     * Carga una lista básica.
     * La clase BinarySearch sobrescribe este metodo ya que verifica si esta ordenada
     */
    cargarLista(nuevaLista) {
        if (!Array.isArray(nuevaLista)) {
            throw new Error("El formato del archivo no es válido.");
        }
        if (nuevaLista.some(n => typeof n !== 'number' || n < 0 || n > 99)) {
            throw new Error("La lista contiene elementos no válidos (solo números 0-99).");
        }

        this.cargarFisica(nuevaLista);
    }

    /**
     * Método para realizar la carga física de datos.
     * Se deja público/protegido para ser usado por clases hijas.
     * Si el tamaño de la lista es cero se asigna de manera predeterminada el valor de 10 (Cambiarlo si es necesario xd)
     */
    cargarFisica(lista) {
        this.#maxSize = lista.length > 0 ? lista.length : 10;
        this.#lista = lista;
    }

    /**
     * MÉTODO ABSTRACTO: Busca un número en la lista.
     */
    buscar(objetivo) {
        throw new Error("El método buscar() debe ser implementado por la clase hija.");
    }
}
