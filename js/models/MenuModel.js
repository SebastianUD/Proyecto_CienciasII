export class MenuModel {
    constructor() {
        this.temas = [
            {
                titulo: "Inicio",
                accion: "inicio" // ID para futura navegación
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
                                    { titulo: "Función hash modulo", accion: "hash_modulo" },
                                    { titulo: "Función Cuadrado", accion: "hash_cuadrado" },
                                    { titulo: "Función Plegamiento", accion: "hash_plegamiento" },
                                    { titulo: "Función Truncamiento", accion: "hash_truncamiento" }
                                ]
                            },
                            {
                                titulo: "Por residuos",
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

    obtenerDatos() {
        return this.temas;
    }
}