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
     * Usa el diálogo nativo "Guardar como" si está disponible.
     * @param {DataStructure} dataStructure - Instancia de la estructura de datos a guardar.
     * @param {string} [algorithmName='estructura'] - Nombre del algoritmo para el nombre del archivo.
     */
    async save(dataStructure, algorithmName = 'estructura') {
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
        const defaultName = `${algorithmName}_${Date.now()}.json`;

        await FileManager.saveJSON(jsonString, defaultName);
    },

    /**
     * Guarda un string JSON en un archivo, permitiendo al usuario
     * elegir la ubicación y el nombre del archivo.
     * Usa showSaveFilePicker (File System Access API) si está disponible;
     * si no, pide el nombre con SweetAlert2 y descarga normalmente.
     * @param {string} jsonString - Contenido JSON a guardar.
     * @param {string} defaultFileName - Nombre de archivo por defecto.
     */
    async saveJSON(jsonString, defaultFileName) {
        // Intentar usar la File System Access API (Chrome, Edge, Opera)
        if (window.showSaveFilePicker) {
            try {
                const handle = await window.showSaveFilePicker({
                    suggestedName: defaultFileName,
                    types: [{
                        description: 'Archivo JSON',
                        accept: { 'application/json': ['.json'] }
                    }]
                });

                const writable = await handle.createWritable();
                await writable.write(jsonString);
                await writable.close();

                Validation.showSuccess('Archivo guardado correctamente.');
                return;
            } catch (err) {
                // Si el usuario cancela el diálogo, no mostrar error
                if (err.name === 'AbortError') return;
                // Si falla por otra razón, caer al método alternativo
                console.warn('showSaveFilePicker falló, usando método alternativo:', err);
            }
        }

        // Fallback: descargar directamente con el nombre por defecto.
        // Si el navegador tiene "Preguntar siempre dónde guardar archivos"
        // activado, abrirá el explorador nativo para elegir nombre y ubicación.
        // Nota: no se muestra mensaje de éxito porque no es posible saber
        // si el usuario realmente guardó el archivo o canceló el diálogo.
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = defaultFileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
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
