/**
 * @fileoverview Vista base compartida para todos los algoritmos de búsqueda.
 * Renderiza la interfaz completa: panel de configuración, panel de inserción,
 * tabla de datos, área de log y botones de pie de página.
 * @module views/AlgorithmView
 */

/**
 * Clase base que genera el layout compartido para todas las vistas de algoritmos.
 * Las subclases deben sobrescribir el método {@link AlgorithmView#_onSearch}
 * para implementar la lógica de búsqueda específica de cada algoritmo.
 */
class AlgorithmView {
    /**
     * Crea una instancia de AlgorithmView.
     * @param {HTMLElement} containerEl - Elemento contenedor donde se renderiza la vista.
     */
    constructor(containerEl) {
        /** @type {HTMLElement} Contenedor principal de la vista */
        this.container = containerEl;

        /** @type {DataStructure} Modelo de la estructura de datos */
        this.dataStructure = new DataStructure();

        /** @type {Array<{message: string, type: string, time: Date}>} Historial de mensajes del log */
        this.logMessages = [];

        /** @type {boolean} Indica si hay una animación de búsqueda en curso */
        this.isSearchAnimating = false;

        /** @type {Object} Referencias a los elementos DOM de la vista */
        this.elements = {};
    }

    /**
     * Renderiza el layout completo del algoritmo dentro del contenedor.
     * @param {string} title - Nombre del algoritmo a mostrar como título.
     */
    render(title) {
        this.container.innerHTML = '';
        this.container.classList.remove('hidden');

        // Ocultar pantalla de bienvenida
        const welcome = document.getElementById('welcome-screen');
        if (welcome) welcome.classList.add('hidden');

        this.container.innerHTML = `
            <!-- Título del Algoritmo -->
            <div class="algo-title">${title}</div>

            <!-- Sección: Creación de la Estructura -->
            <div class="section-block">
                <div class="section-title">Creación de la Estructura</div>
                <div class="config-panel">
                    <div class="config-fields">
                        <div class="config-group">
                            <label for="cfg-datatype">Tipo de Dato</label>
                            <select id="cfg-datatype">
                                <option value="">-- Seleccione --</option>
                                <option value="numerico">Numérico</option>
                                <option value="texto">Cadena de Texto</option>
                                <option value="alfanumerico">Alfanumérico</option>
                            </select>
                        </div>
                        <div class="config-group">
                            <label for="cfg-keylength">Tamaño Clave</label>
                            <input type="number" id="cfg-keylength" min="1" max="100" placeholder="Ej: 3">
                        </div>
                        <div class="config-group">
                            <label for="cfg-range">Rango Estructura</label>
                            <input type="number" id="cfg-range" min="1" placeholder="Ej: 10">
                        </div>
                        <div class="config-group">
                            <label>Claves Repetidas</label>
                            <div class="toggle-container">
                                <span class="toggle-label active" id="toggle-yes">Sí</span>
                                <div class="toggle-switch" id="toggle-duplicates" title="Permitir claves repetidas">
                                    <div class="toggle-knob"></div>
                                </div>
                                <span class="toggle-label" id="toggle-no">No</span>
                            </div>
                        </div>
                    </div>
                    <div class="config-buttons">
                        <button class="btn btn-primary" id="btn-create">Crear</button>
                        <button class="btn btn-success" id="btn-load">Cargar</button>
                        <button class="btn btn-secondary" id="btn-clear">Limpiar</button>
                    </div>
                </div>
            </div>

            <!-- Sección: Modificación de la Estructura -->
            <div class="section-block">
                <div class="section-title">Modificación de la Estructura</div>
                <div class="insert-panel">
                    <label for="input-key">Digite la Clave</label>
                    <input type="text" id="input-key" placeholder="Ingrese la clave..." disabled>
                    <div class="insert-buttons">
                        <button class="btn btn-primary" id="btn-insert" disabled>Insertar</button>
                        <button class="btn btn-danger" id="btn-delete" disabled>Borrar</button>
                        <button class="btn btn-success" id="btn-search" disabled>Buscar</button>
                    </div>
                </div>
            </div>

            <!-- Área de contenido: Tabla + Log -->
            <div class="content-area">
                <div class="table-container" id="table-container" style="display:none;">
                    <div class="table-header-label">Estructura de Datos</div>
                    <div class="table-scroll" id="table-scroll">
                        <table class="data-table" id="data-table">
                            <thead>
                                <tr>
                                    <th>Posición</th>
                                    <th>Clave</th>
                                </tr>
                            </thead>
                            <tbody id="table-body"></tbody>
                        </table>
                    </div>
                </div>
                <div class="log-container" id="log-container" style="display:none;">
                    <div class="log-header">Mensajes y Resultados</div>
                    <div class="log-content" id="log-content"></div>
                </div>
            </div>

            <!-- Botones de pie de página -->
            <div class="footer-buttons">
                <button class="btn btn-success" id="btn-save" disabled>Guardar</button>
                <button class="btn btn-primary" id="btn-print" disabled>Imprimir</button>
            </div>
        `;

        this._cacheElements();
        this._bindEvents();
    }

    /**
     * Almacena referencias a los elementos DOM de la vista para acceso rápido.
     * @private
     */
    _cacheElements() {
        this.elements = {
            dataType: document.getElementById('cfg-datatype'),
            keyLength: document.getElementById('cfg-keylength'),
            range: document.getElementById('cfg-range'),
            toggleDuplicates: document.getElementById('toggle-duplicates'),
            toggleYes: document.getElementById('toggle-yes'),
            toggleNo: document.getElementById('toggle-no'),
            btnCreate: document.getElementById('btn-create'),
            btnClear: document.getElementById('btn-clear'),
            btnLoad: document.getElementById('btn-load'),
            inputKey: document.getElementById('input-key'),
            btnInsert: document.getElementById('btn-insert'),
            btnDelete: document.getElementById('btn-delete'),
            btnSearch: document.getElementById('btn-search'),
            tableContainer: document.getElementById('table-container'),
            tableBody: document.getElementById('table-body'),
            logContainer: document.getElementById('log-container'),
            logContent: document.getElementById('log-content'),
            btnSave: document.getElementById('btn-save'),
            btnPrint: document.getElementById('btn-print')
        };

        /** @type {boolean} Estado del toggle de claves repetidas */
        this._allowDuplicates = true;
    }

    /**
     * Asigna los eventos a los botones y controles de la vista.
     * @private
     */
    _bindEvents() {
        const el = this.elements;

        // Toggle de claves repetidas
        el.toggleDuplicates.addEventListener('click', () => {
            this._allowDuplicates = !this._allowDuplicates;
            el.toggleDuplicates.classList.toggle('off', !this._allowDuplicates);
            el.toggleYes.classList.toggle('active', this._allowDuplicates);
            el.toggleNo.classList.toggle('active', !this._allowDuplicates);
        });

        // Botón Crear
        el.btnCreate.addEventListener('click', () => this._onCreate());

        // Botón Limpiar
        el.btnClear.addEventListener('click', () => this._onClear());

        // Botón Cargar
        el.btnLoad.addEventListener('click', () => this._onLoad());

        // Botón Insertar
        el.btnInsert.addEventListener('click', () => this._onInsert());

        // Botón Borrar
        el.btnDelete.addEventListener('click', () => this._onDelete());

        // Botón Buscar — sobrescrito por subclases
        el.btnSearch.addEventListener('click', () => this._onSearch());

        // Botón Guardar
        el.btnSave.addEventListener('click', () => this._onSave());

        // Botón Imprimir
        el.btnPrint.addEventListener('click', () => FileManager.print());

        // Tecla Enter en el input de clave
        el.inputKey.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                el.btnInsert.click();
            }
        });
    }

    /**
     * Maneja el evento de creación de la estructura de datos.
     * Valida los parámetros de configuración, crea la estructura
     * y habilita los controles de inserción.
     * @private
     */
    _onCreate() {
        const el = this.elements;

        // Impedir crear si ya existe una estructura activa
        if (this.dataStructure.created) {
            Validation.showWarning('Ya existe una estructura activa. Debe limpiarla antes de crear una nueva.');
            return;
        }

        const validation = Validation.validateCreateParams(
            el.range.value,
            el.keyLength.value,
            el.dataType.value
        );

        if (!validation.valid) {
            Validation.showError(validation.error);
            return;
        }

        const size = parseInt(el.range.value);
        const keyLength = parseInt(el.keyLength.value);
        const dataType = el.dataType.value;

        // Advertir si el arreglo es muy grande
        if (size > 10000) {
            Validation.showWarning(`Va a crear una estructura con ${size.toLocaleString()} posiciones. Esto puede afectar el rendimiento visual. Se recomienda un máximo de 10,000 para visualización óptima.`);
        }

        this.dataStructure.create(size, keyLength, dataType, this._allowDuplicates);

        // Habilitar controles de inserción
        el.inputKey.disabled = false;
        el.btnInsert.disabled = false;
        el.btnDelete.disabled = false;
        el.btnSearch.disabled = false;
        el.btnSave.disabled = false;
        el.btnPrint.disabled = false;

        // Deshabilitar configuración para evitar cambios con estructura activa
        el.dataType.disabled = true;
        el.keyLength.disabled = true;
        el.range.disabled = true;
        el.toggleDuplicates.style.pointerEvents = 'none';
        el.toggleDuplicates.style.opacity = '0.5';
        el.btnCreate.disabled = true;
        el.btnLoad.disabled = true;

        // Mostrar tabla y log
        el.tableContainer.style.display = '';
        el.logContainer.style.display = '';

        this._renderTable();
        this._addLog(`Estructura creada: ${size} posiciones, clave de ${keyLength} carácter(es), tipo: ${dataType}, repetidas: ${this._allowDuplicates ? 'Sí' : 'No'}.`, 'info');
    }

    /**
     * Maneja el evento de limpiar/reiniciar la estructura.
     * Muestra un diálogo de confirmación si hay una estructura activa.
     * @private
     * @async
     */
    async _onClear() {
        if (this.dataStructure.created) {
            const confirmed = await Validation.confirm('Se eliminará la estructura actual y todos los datos. ¿Desea continuar?');
            if (!confirmed) return;
        }

        this.dataStructure.reset();
        this.logMessages = [];
        this._allowDuplicates = true;

        const el = this.elements;

        // Reiniciar configuración
        el.dataType.value = '';
        el.dataType.disabled = false;
        el.keyLength.value = '';
        el.keyLength.disabled = false;
        el.range.value = '';
        el.range.disabled = false;
        el.toggleDuplicates.classList.remove('off');
        el.toggleDuplicates.style.pointerEvents = '';
        el.toggleDuplicates.style.opacity = '';
        el.toggleYes.classList.add('active');
        el.toggleNo.classList.remove('active');
        el.btnCreate.disabled = false;
        el.btnLoad.disabled = false;

        // Deshabilitar controles de inserción
        el.inputKey.value = '';
        el.inputKey.disabled = true;
        el.btnInsert.disabled = true;
        el.btnDelete.disabled = true;
        el.btnSearch.disabled = true;
        el.btnSave.disabled = true;
        el.btnPrint.disabled = true;

        // Ocultar tabla y log
        el.tableContainer.style.display = 'none';
        el.logContainer.style.display = 'none';
        el.tableBody.innerHTML = '';
        el.logContent.innerHTML = '';
    }

    /**
     * Maneja el evento de cargar una estructura desde un archivo JSON.
     * Utiliza {@link FileManager.load} para seleccionar y leer el archivo.
     * @private
     * @async
     */
    async _onLoad() {
        // Impedir cargar si ya existe una estructura activa
        if (this.dataStructure.created) {
            Validation.showWarning('Ya existe una estructura activa. Debe limpiarla antes de cargar otra.');
            return;
        }

        const data = await FileManager.load();
        if (!data) return;

        this.dataStructure.fromJSON(data.structure);
        this._allowDuplicates = data.structure.allowDuplicates;

        const el = this.elements;

        // Rellenar campos de configuración con los datos cargados
        el.dataType.value = data.structure.dataType;
        el.keyLength.value = data.structure.keyLength;
        el.range.value = data.structure.size;
        el.toggleDuplicates.classList.toggle('off', !this._allowDuplicates);
        el.toggleYes.classList.toggle('active', this._allowDuplicates);
        el.toggleNo.classList.toggle('active', !this._allowDuplicates);

        // Deshabilitar configuración
        el.dataType.disabled = true;
        el.keyLength.disabled = true;
        el.range.disabled = true;
        el.toggleDuplicates.style.pointerEvents = 'none';
        el.toggleDuplicates.style.opacity = '0.5';
        el.btnCreate.disabled = true;
        el.btnLoad.disabled = true;

        // Habilitar controles
        el.inputKey.disabled = false;
        el.btnInsert.disabled = false;
        el.btnDelete.disabled = false;
        el.btnSearch.disabled = false;
        el.btnSave.disabled = false;
        el.btnPrint.disabled = false;

        // Mostrar tabla y log
        el.tableContainer.style.display = '';
        el.logContainer.style.display = '';

        this._renderTable();
        this._addLog('Estructura cargada desde archivo.', 'success');
    }

    /**
     * Maneja el evento de inserción de una clave en la estructura.
     * Valida la clave y la inserta en la siguiente posición disponible.
     * @private
     */
    _onInsert() {
        const el = this.elements;
        const result = this.dataStructure.insert(el.inputKey.value);

        if (!result.success) {
            Validation.showError(result.error, el.inputKey);
            return;
        }

        this._renderTable();
        this._addLog(`Clave "${this.dataStructure.keys[result.position]}" insertada en la posición ${result.position + 1}.`, 'success');
        el.inputKey.value = '';
        el.inputKey.focus();
    }

    /**
     * Maneja el evento de eliminación de una clave de la estructura.
     * Realiza un corrimiento de los elementos restantes hacia la izquierda.
     * @private
     */
    _onDelete() {
        const el = this.elements;
        const key = el.inputKey.value.trim();

        if (key === '') {
            Validation.showError('Debe ingresar la clave que desea borrar.', el.inputKey);
            return;
        }

        const result = this.dataStructure.delete(key);

        if (!result.success) {
            Validation.showError(result.error, el.inputKey);
            return;
        }

        this._renderTable();
        this._addLog(`Clave borrada de la posición ${result.position + 1}. Se realizó corrimiento del arreglo.`, 'warning');
        el.inputKey.value = '';
        el.inputKey.focus();
    }

    /**
     * Método de búsqueda base. Debe ser sobrescrito por las subclases
     * para implementar el algoritmo de búsqueda específico.
     * @private
     * @abstract
     */
    _onSearch() {
        // Implementación base vacía — sobrescrita en subclases
    }

    /**
     * Guarda la estructura de datos actual en un archivo JSON descargable.
     * @private
     */
    _onSave() {
        FileManager.save(this.dataStructure, this._algorithmName || 'estructura');
    }

    /**
     * Renderiza la tabla de datos a partir del estado actual de la estructura.
     * Para arreglos muy grandes (>10,000), limita el renderizado y muestra un indicador.
     * @private
     */
    _renderTable() {
        const tbody = this.elements.tableBody;
        tbody.innerHTML = '';

        // Limitar renderizado para arreglos grandes
        const maxRender = Math.min(this.dataStructure.size, 10000);

        for (let i = 0; i < maxRender; i++) {
            const tr = document.createElement('tr');
            tr.dataset.index = i;

            const tdPos = document.createElement('td');
            tdPos.textContent = i + 1;

            const tdKey = document.createElement('td');
            if (this.dataStructure.keys[i] !== null) {
                tdKey.textContent = this.dataStructure.keys[i];
            } else {
                tdKey.textContent = '-';
                tdKey.classList.add('empty-cell');
            }

            tr.appendChild(tdPos);
            tr.appendChild(tdKey);
            tbody.appendChild(tr);
        }

        if (this.dataStructure.size > maxRender) {
            const tr = document.createElement('tr');
            const td = document.createElement('td');
            td.colSpan = 2;
            td.textContent = `... ${(this.dataStructure.size - maxRender).toLocaleString()} posiciones más`;
            td.style.fontStyle = 'italic';
            td.style.color = '#888';
            tr.appendChild(td);
            tbody.appendChild(tr);
        }
    }

    /**
     * Agrega un mensaje al panel de log con el tipo especificado.
     * @private
     * @param {string} message - Texto del mensaje a mostrar.
     * @param {string} [type='info'] - Tipo del mensaje: 'info', 'success', 'error', 'warning'.
     */
    _addLog(message, type = 'info') {
        this.logMessages.push({ message, type, time: new Date() });

        const logContent = this.elements.logContent;
        const entry = document.createElement('div');
        entry.classList.add('log-entry', `log-${type}`);
        entry.textContent = message;
        logContent.appendChild(entry);

        // Auto-scroll al final del log
        logContent.scrollTop = logContent.scrollHeight;
    }

    /**
     * Elimina todos los resaltados de búsqueda de las filas de la tabla.
     * @private
     */
    _clearHighlights() {
        const rows = this.elements.tableBody.querySelectorAll('tr');
        rows.forEach(row => {
            row.classList.remove(
                'highlight-checking',
                'highlight-found',
                'highlight-not-found',
                'highlight-discarded',
                'highlight-mid'
            );
        });
    }
}
