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

        /** @type {Array<{message: string, type: string, time: Date, operation: string}>} Historial de mensajes del log */
        this.logMessages = [];

        /** @type {boolean} Indica si hay una animación de búsqueda en curso */
        this.isSearchAnimating = false;

        /** @type {Object} Referencias a los elementos DOM de la vista */
        this.elements = {};

        /** @type {string|null} Última operación registrada en el log */
        this._lastOperation = null;

        /** @type {boolean} Si se muestra el historial completo del log */
        this._showFullHistory = false;
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
                                <span class="toggle-label" id="toggle-yes">Sí</span>
                                <div class="toggle-switch off" id="toggle-duplicates" title="Permitir claves repetidas">
                                    <div class="toggle-knob"></div>
                                </div>
                                <span class="toggle-label active" id="toggle-no">No</span>
                            </div>
                        </div>
                    </div>
                    <div class="config-buttons">
                        <button class="btn btn-primary" id="btn-create">Crear</button>
                        <button class="btn btn-info" id="btn-load">Cargar</button>
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
                    <div class="log-header">
                        Mensajes y Resultados
                        <button class="log-history-toggle" id="log-history-toggle" title="Ver historial completo">📋 Historial</button>
                    </div>
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
            logHistoryToggle: document.getElementById('log-history-toggle'),
            btnSave: document.getElementById('btn-save'),
            btnPrint: document.getElementById('btn-print')
        };

        /** @type {boolean} Estado del toggle de claves repetidas */
        this._allowDuplicates = false;
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
        // Se usa un pequeño retraso para que el keyup de Enter se procese
        // antes de que aparezca cualquier diálogo SweetAlert2, evitando
        // que el mismo Enter cierre el aviso inmediatamente.
        el.inputKey.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                setTimeout(() => el.btnInsert.click(), 10);
            }
        });

        // Toggle historial del log
        el.logHistoryToggle.addEventListener('click', () => this._toggleLogHistory());

        // Resize listener — recalcular tabla al cambiar tamaño de ventana
        this._resizeTimer = null;
        this._onResizeBound = () => {
            clearTimeout(this._resizeTimer);
            this._resizeTimer = setTimeout(() => {
                if (this.dataStructure.created) {
                    this._renderTable();
                }
            }, 150);
        };
        window.addEventListener('resize', this._onResizeBound);
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
        this._setOperation('create');
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
        this._allowDuplicates = false;
        this._lastOperation = null;
        this._showFullHistory = false;

        const el = this.elements;

        if (el.logHistoryToggle) {
            el.logHistoryToggle.textContent = '📋 Historial';
            el.logHistoryToggle.title = 'Ver historial completo';
            el.logHistoryToggle.classList.remove('active');
        }

        // Reiniciar configuración
        el.dataType.value = '';
        el.dataType.disabled = false;
        el.keyLength.value = '';
        el.keyLength.disabled = false;
        el.range.value = '';
        el.range.disabled = false;
        if (el.toggleDuplicates) {
            el.toggleDuplicates.classList.add('off');
            el.toggleDuplicates.style.pointerEvents = '';
            el.toggleDuplicates.style.opacity = '';
        }
        if (el.toggleYes) el.toggleYes.classList.remove('active');
        if (el.toggleNo) el.toggleNo.classList.add('active');
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

        // Validar que el archivo corresponda a un algoritmo compatible
        if (data.algorithm && this._algorithmName && !FileCompat.areCompatible(data.algorithm, this._algorithmName)) {
            Validation.showError(`Este archivo fue creado para "${data.algorithm}" y no es compatible con la vista actual ("${this._algorithmName}").`);
            return;
        }

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
        this._setOperation('load');
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

        this._setOperation('insert');
        this._renderTable();
        this._addLog(`Clave "${this.dataStructure.keys[result.position]}" insertada en la posición ${result.position + 1}.`, 'success');
        el.inputKey.value = '';
        el.inputKey.focus();
    }

    /**
     * Maneja el evento de eliminación de una clave de la estructura.
     * Primero anima la búsqueda correspondiente y luego realiza la eliminación.
     * @private
     * @async
     */
    async _onDelete() {
        const el = this.elements;
        const key = el.inputKey.value.trim();

        if (key === '') {
            Validation.showError('Debe ingresar la clave que desea borrar.', el.inputKey);
            return;
        }

        if (this.isSearchAnimating) {
            Validation.showWarning('Espere a que la animación actual termine.');
            return;
        }

        // Normalizar la clave para mostrar en los mensajes
        let displayKey = key;
        if (this.dataStructure.dataType === 'numerico' && /^\d+$/.test(key) && key.length < this.dataStructure.keyLength) {
            displayKey = key.padStart(this.dataStructure.keyLength, '0');
        }

        // Ejecutar la búsqueda para obtener los pasos de animación
        const searchResult = this.dataStructure.sequentialSearch(key);

        this._clearHighlights();
        this.isSearchAnimating = true;

        // Deshabilitar botones durante la animación
        el.btnSearch.disabled = true;
        el.btnInsert.disabled = true;
        el.btnDelete.disabled = true;

        this._setOperation('delete');
        this._addLog(`Buscando clave "${displayKey}" para eliminar...`, 'info');

        // Animar la búsqueda
        await this._animateSearch(searchResult, displayKey);

        // Ahora ejecutar la eliminación real
        const deleteResult = this.dataStructure.delete(key);

        if (!deleteResult.success) {
            this.isSearchAnimating = false;
            el.btnSearch.disabled = false;
            el.btnInsert.disabled = false;
            el.btnDelete.disabled = false;
            this._addLog(`✘ No se pudo eliminar: ${deleteResult.error}`, 'error');
            el.inputKey.value = '';
            el.inputKey.focus();
            return;
        }

        // Resaltar la fila en rojo antes de eliminar visualmente
        const tbody = this.elements.tableBody;
        const row = tbody.querySelector(`tr[data-index="${deleteResult.position}"]`);
        if (row) {
            this._clearHighlights();
            row.classList.add('highlight-deleting');
            this._addLog(`Clave "${displayKey}" encontrada en posición ${deleteResult.position + 1}. Eliminando...`, 'warning');

            // Esperar para que se vea el rojo
            await new Promise(r => setTimeout(r, 800));

            // Fade out
            row.classList.add('fade-out');
            await new Promise(r => setTimeout(r, 500));
        }

        this._renderTable();
        this._clearHighlights();
        this.isSearchAnimating = false;
        el.btnSearch.disabled = false;
        el.btnInsert.disabled = false;
        el.btnDelete.disabled = false;
        this._addLog(`Clave "${displayKey}" borrada de la posición ${deleteResult.position + 1}. Se realizó corrimiento del arreglo.`, 'success');
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
     * Renderiza la tabla. Si el rango de la estructura es mayor a 11
     * usa modo compacto: muestra la primera posición, la última,
     * todas las ocupadas, y separadores "…" entre huecos.
     * Con rango de 11 o menos muestra todas las posiciones normalmente.
     * @private
     */
    /**
     * Determina si la tabla debería usar modo compacto.
     * Compara la altura estimada de todas las filas contra la altura
     * disponible en el contenedor de scroll.
     * @private
     * @param {number} size - Número total de posiciones.
     * @returns {boolean}
     */
    _shouldUseCompact(size) {
        // Use the content-area (which fills available space) as reference
        const contentArea = this.container.querySelector('.content-area');
        const headerLabelHeight = 36; // table-header-label + thead
        const rowHeight = 35;
        const totalNeeded = size * rowHeight + headerLabelHeight;

        if (contentArea && contentArea.clientHeight > 0) {
            return totalNeeded > contentArea.clientHeight;
        }
        // Fallback: estimate from viewport
        const estimatedAvailable = window.innerHeight * 0.45;
        return totalNeeded > estimatedAvailable;
    }

    _renderTable() {
        const tbody = this.elements.tableBody;
        tbody.innerHTML = '';

        const size = this.dataStructure.size;
        if (size === 0) return;

        // Determinar modo dinámico
        const useCompact = this._shouldUseCompact(size);

        if (!useCompact) {
            // Modo normal: mostrar todas las posiciones
            for (let i = 0; i < size; i++) {
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
        } else {
            // Modo compacto: solo posiciones relevantes con separadores
            const visiblePositions = new Set();
            visiblePositions.add(0);         // primera
            visiblePositions.add(size - 1);  // última

            for (let i = 0; i < size; i++) {
                if (this.dataStructure.keys[i] !== null) {
                    visiblePositions.add(i);
                }
            }

            const sorted = Array.from(visiblePositions).sort((a, b) => a - b);
            let lastRendered = -1;

            for (const pos of sorted) {
                // Separador si hay hueco
                if (lastRendered !== -1 && pos > lastRendered + 1) {
                    const ellipsisTr = document.createElement('tr');
                    ellipsisTr.classList.add('ellipsis-row');
                    const ellipsisTd = document.createElement('td');
                    ellipsisTd.colSpan = 2;
                    ellipsisTd.textContent = '\u2026';
                    ellipsisTr.appendChild(ellipsisTd);
                    tbody.appendChild(ellipsisTr);
                }

                const tr = document.createElement('tr');
                tr.dataset.index = pos;

                const tdPos = document.createElement('td');
                tdPos.textContent = pos + 1;

                const tdKey = document.createElement('td');
                if (this.dataStructure.keys[pos] !== null) {
                    tdKey.textContent = this.dataStructure.keys[pos];
                } else {
                    tdKey.textContent = '-';
                    tdKey.classList.add('empty-cell');
                }

                tr.appendChild(tdPos);
                tr.appendChild(tdKey);
                tbody.appendChild(tr);

                lastRendered = pos;
            }
        }

        // Alinear el cuerpo de la tabla al fondo si hay espacio sobrante
        requestAnimationFrame(() => {
            const tableScroll = document.getElementById('table-scroll');
            const dataTable = document.getElementById('data-table');
            if (tableScroll && dataTable) {
                const tbodyEl = dataTable.querySelector('tbody');
                if (tbodyEl) tbodyEl.style.marginTop = '';
                const gap = tableScroll.clientHeight - dataTable.offsetHeight;
                if (gap > 0 && tbodyEl) {
                    tbodyEl.style.marginTop = gap + 'px';
                }
                tableScroll.scrollTop = tableScroll.scrollHeight;
            }
        });
    }

    /**
     * Inserta dinámicamente una fila para un índice que no estaba en el
     * renderizado compacto (necesario durante animaciones de búsqueda).
     * @protected
     * @param {number} index - Índice 0-based de la posición a insertar.
     * @returns {HTMLTableRowElement|null}
     */
    _insertDynamicRow(index) {
        const tbody = this.elements.tableBody;

        const tr = document.createElement('tr');
        tr.dataset.index = index;

        const tdPos = document.createElement('td');
        tdPos.textContent = index + 1;

        const tdKey = document.createElement('td');
        const value = this.dataStructure.keys[index];
        if (value !== null && value !== undefined) {
            tdKey.textContent = value;
        } else {
            tdKey.textContent = '-';
            tdKey.classList.add('empty-cell');
        }

        tr.appendChild(tdPos);
        tr.appendChild(tdKey);

        // Insertar en posición correcta (ordenado por data-index)
        let insertBefore = null;
        for (const existingRow of tbody.rows) {
            const existingIndex = parseInt(existingRow.dataset.index);
            if (!isNaN(existingIndex) && existingIndex > index) {
                insertBefore = existingRow;
                break;
            }
        }

        if (insertBefore) {
            tbody.insertBefore(tr, insertBefore);
        } else {
            tbody.appendChild(tr);
        }

        return tr;
    }

    /**
     * Establece la operación actual. Si cambia, limpia el log visible
     * (salvo en modo historial completo).
     * @private
     * @param {string} operation - Tipo de operación: 'insert', 'delete', 'search', etc.
     */
    _setOperation(operation) {
        const keepLog = operation === 'insert' && this._lastOperation === 'insert';
        if (!keepLog && !this._showFullHistory) {
            this.elements.logContent.innerHTML = '';
        }
        this._lastOperation = operation;
    }

    /**
     * Agrega un mensaje al panel de log con el tipo especificado.
     * @private
     * @param {string} message - Texto del mensaje a mostrar.
     * @param {string} [type='info'] - Tipo del mensaje: 'info', 'success', 'error', 'warning'.
     */
    _addLog(message, type = 'info') {
        this.logMessages.push({ message, type, time: new Date(), operation: this._lastOperation });

        const logContent = this.elements.logContent;
        const entry = document.createElement('div');
        entry.classList.add('log-entry', `log-${type}`);
        entry.textContent = message;
        logContent.appendChild(entry);

        // Auto-scroll al final del log
        logContent.scrollTop = logContent.scrollHeight;
    }

    /**
     * Renderiza todo el historial de log o solo los mensajes de la operación actual.
     * @private
     */
    _renderLogView() {
        const logContent = this.elements.logContent;
        logContent.innerHTML = '';

        const messages = this._showFullHistory
            ? this.logMessages
            : this.logMessages.filter(m => m.operation === this._lastOperation);

        for (const msg of messages) {
            const entry = document.createElement('div');
            entry.classList.add('log-entry', `log-${msg.type}`);
            entry.textContent = msg.message;
            logContent.appendChild(entry);
        }

        logContent.scrollTop = logContent.scrollHeight;
    }

    /**
     * Alterna entre mostrar el historial completo y el modo normal de log.
     * @private
     */
    _toggleLogHistory() {
        this._showFullHistory = !this._showFullHistory;
        const btn = this.elements.logHistoryToggle;
        if (this._showFullHistory) {
            btn.title = 'Volver al modo normal';
            btn.textContent = '↩ Atrás';
        } else {
            btn.title = 'Ver historial completo';
            btn.textContent = '📋 Historial';
            this.elements.logContent.innerHTML = '';
            return;
        }
        this._renderLogView();
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
