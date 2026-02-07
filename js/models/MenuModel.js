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
        // - accion: Identificador opcional para lógica futura.
        // - subtemas: Array recursivo de ítems hijos.
        this.temas = [
            {
                titulo: "Inicio",
                accion: "inicio"
            },
            {
                titulo: "Búsquedas",
                subtemas: [
                    {
                        titulo: "Internas",
                        subtemas: [
                            { titulo: "Secuencial", accion: "secuencial" },
                            { titulo: "Binario", accion: "binario" },
                            {
                                titulo: "Transformación de Claves",
                                subtemas: [
                                    { titulo: "Función Hash Módulo", accion: "hash_modulo" },
                                    { titulo: "Función Hash Cuadrado", accion: "hash_cuadrado" },
                                    { titulo: "Función Hash Plegamiento", accion: "hash_plegamiento" },
                                    { titulo: "Función Hash Truncamiento", accion: "hash_truncamiento" }
                                ]
                            },
                            {
                                titulo: "Por Residuos",
                                subtemas: [
                                    { titulo: "Árboles de búsqueda digital", accion: "arb_digital" },
                                    { titulo: "Árboles de búsqueda por residuo", accion: "arb_residuo" },
                                    { titulo: "Árboles por residuo múltiples", accion: "arb_multiple" },
                                    { titulo: "Árboles de Huffman", accion: "arb_huffman" }
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