/**
 * Modelo (Model) del Menú
 * -----------------------
 * En el patrón MVC, el Modelo se encarga de:
 * 1. Almacenar la estructura de datos (en este caso, la jerarquía del menú).
 * 2. Proveer métodos para acceder a esta información.
 * 3. No tiene conocimiento de la Vista (DOM).
 */
export class MenuModel {
    constructor() {
        // Estructura jerárquica del menú.
        // Cada objeto representa un ítem que puede tener:
        // - titulo: Texto a mostrar.
        // - url: Archivo HTML al que redirige (sin ruta relativa, la vista la resuelve).
        // - accion: Identificador opcional para lógica futura.
        // - subtemas: Array recursivo de ítems hijos.
        this.temas = [
            {
                titulo: "Inicio",
                url: "index",
                accion: "inicio"
            },
            {
                titulo: "Búsquedas",
                subtemas: [
                    {
                        titulo: "Internas",
                        subtemas: [
                            { titulo: "Secuencial", url: "secuencial.html", accion: "secuencial" },
                            { titulo: "Binario", url: "binario.html", accion: "binario" },
                            {
                                titulo: "Transformación de Claves",
                                subtemas: [
                                    { titulo: "Función Hash Módulo", url: "hash_modulo.html", accion: "hash_modulo" },
                                    { titulo: "Función Hash Cuadrado", url: "hash_cuadrado.html", accion: "hash_cuadrado" },
                                    { titulo: "Función Hash Plegamiento", url: "hash_plegamiento.html", accion: "hash_plegamiento" },
                                    { titulo: "Función Hash Truncamiento", url: "hash_truncamiento.html", accion: "hash_truncamiento" }
                                ]
                            },
                            {
                                titulo: "Por Residuos",
                                subtemas: [
                                    { titulo: "Árboles de búsqueda digital", url: "arb_digital.html", accion: "arb_digital" },
                                    { titulo: "Árboles de búsqueda por residuo", url: "arb_residuo.html", accion: "arb_residuo" },
                                    { titulo: "Árboles por residuo múltiples", url: "arb_multiple.html", accion: "arb_multiple" },
                                    { titulo: "Árboles de Huffman", url: "arb_huffman.html", accion: "arb_huffman" }
                                ]
                            }
                        ]
                    },
                    {
                        titulo: "Externas (Próximamente)"
                    }
                ]
            },
            {
                titulo: "Grafos (Próximamente)",
                accion: "grafos"
            },
        ];
    }

    /**
     * Retorna la lista completa de temas para el menú.
     * @returns {Array} Array de objetos con la configuración del menú.
     */
    obtenerDatos() {
        return this.temas;
    }
}