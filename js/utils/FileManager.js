/**
 * @fileoverview Gestor de archivos para guardar, cargar e imprimir.
 * Permite descargar la estructura como JSON, cargar un archivo JSON
 * previamente guardado e invocar la funcionalidad de impresión del navegador.
 * @module utils/FileManager
 */

/**
 * Módulo de gestión de archivos.
 * @namespace
 */
const FileManager = {
    /**
     * Guarda la estructura de datos como un archivo JSON descargable.
     * Genera un archivo con la fecha actual en el nombre.
     * @param {DataStructure} dataStructure - Instancia de la estructura de datos a guardar.
     * @param {string} [algorithmName='estructura'] - Nombre del algoritmo para el nombre del archivo.
     */
    save(dataStructure, algorithmName = 'estructura') {
        if (!dataStructure.created) {
            Validation.showError('No hay estructura creada para guardar.');
            return;
        }

        const data = {
            algorithm: algorithmName,
            timestamp: new Date().toISOString(),
            structure: dataStructure.toJSON()
        };

        const jsonString = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `${algorithmName}_${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        Validation.showSuccess('Archivo guardado correctamente.');
    },

    /**
     * Carga un archivo JSON previamente guardado mediante un selector de archivos.
     * Valida que el archivo tenga el formato esperado (estructura con claves).
     * @returns {Promise<Object|null>} Objeto parseado del archivo JSON, o null si falla.
     */
    load() {
        return new Promise((resolve) => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';

            input.onchange = (e) => {
                const file = e.target.files[0];
                if (!file) {
                    resolve(null);
                    return;
                }

                const reader = new FileReader();
                reader.onload = (event) => {
                    try {
                        const data = JSON.parse(event.target.result);
                        if (!data.structure || !data.structure.keys) {
                            Validation.showError('El archivo no tiene un formato válido.');
                            resolve(null);
                            return;
                        }
                        resolve(data);
                    } catch (err) {
                        Validation.showError('Error al leer el archivo. Asegúrese de que sea un archivo JSON válido.');
                        resolve(null);
                    }
                };
                reader.readAsText(file);
            };

            input.click();
        });
    },

    /**
     * Invoca la funcionalidad de impresión nativa del navegador.
     */
    print() {
        window.print();
    }
};
