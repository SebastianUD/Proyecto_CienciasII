/**
 * @fileoverview Vista base para todos los algoritmos de búsqueda hash.
 * Extiende {@link AlgorithmView} para proveer funcionalidad común de hash:
 * configuración de colisiones, renderizado de tablas con soporte para colisiones
 * y animaciones de búsqueda hash.
 * @module views/HashView
 */

/**
 * Clase base para vistas que implementan algoritmos hash.
 * @extends AlgorithmView
 */
class HashView extends AlgorithmView {
    /**
     * Crea una instancia de HashView.
     * @param {HTMLElement} containerEl - Elemento contenedor de la vista.
     */
    constructor(containerEl) {
        super(containerEl);
        console.log("Entrando al algoritmo")
        /** @type {string} Estrategia de colisión seleccionada */
        this._collisionStrategy = '';
        /** @type {boolean} No permitir duplicados en tablas hash por defecto */
        this._allowDuplicates = false;
        /** @type {string} Identificador interno del algoritmo para guardado */
        this._algorithmName = 'hash';
    }

    /**
     * Retorna las opciones HTML para el selector de estrategias de colisión.
     * Puede ser sobrescrito por subclases para filtrar estrategias.
     * @protected
     * @returns {string}
     */
    _getCollisionStrategiesOptions() {
        return `
            <option value="">-- Seleccione --</option>
            <option value="prueba-lineal">P. Lineal</option>
            <option value="prueba-cuadratica">P. Cuadrática</option>
            <option value="doble-hash">D. F. Hash</option>
        `;
    }

    /**
     * Renderiza la interfaz común para algoritmos hash.
     * Reemplaza el toggle de duplicados por el selector de colisiones.
     * @override
     * @param {string} title - Título de la vista.
     */
    render(title) {
        // Ocultar pantalla de bienvenida
        console.log("Esta entrando al render con ", title)
        const welcome = document.getElementById('welcome-screen');
        if (welcome) welcome.classList.add('hidden');

        // Mostrar el contenedor de la vista
        this.container.classList.remove('hidden');

        this.container.innerHTML = `
            <!-- Título del Algoritmo -->
            <div class="algo-title">${title}</div>

            <!-- Sección: Configuración de la Estructura -->
            <div class="section-block">
                <div class="section-title">Configuración de la Estructura</div>
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
                            <label for="cfg-collision">Método de Colisión</label>
                            <select id="cfg-collision">
                                ${this._getCollisionStrategiesOptions()}
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
     * Cachea los elementos DOM de la vista hash.
     * @override
     * @private
     */
    _cacheElements() {
        super._cacheElements();
        this.elements.collisionStrategy = document.getElementById('cfg-collision');

        // El toggle de duplicados no existe en esta vista
        delete this.elements.toggleDuplicates;
        delete this.elements.toggleYes;
        delete this.elements.toggleNo;

        /** @type {boolean} Forzar no permitir duplicados */
        this._allowDuplicates = false;
    }

    /**
     * Asigna los eventos a los botones y controles.
     * @override
     * @private
     */
    _bindEvents() {
        const el = this.elements;

        // Sobrescribir el evento de toggle que ya no existe por AlgorithmView._bindEvents()
        // En AlgorithmView se asigna el evento, pero aquí no tenemos el elemento.
        // Como super._bindEvents() asigna eventos a el.toggleDuplicates, y este no existe,
        // _bindEvents de AlgorithmView podría fallar si no tiene null checks (ya se los puse a _onClear, pero no a _bindEvents).
        // Vamos a implementar una versión manual sin llamar a super._bindEvents() para evitar conflictos.

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

        // Botón Buscar
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
     * Sobrescribe la creación para validar estrategia de colisión y resetear campos hash.
     * @override
     * @private
     */
    _onCreate() {
        const el = this.elements;

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

        const collisionStrategy = el.collisionStrategy.value;
        if (!collisionStrategy || collisionStrategy === '') {
            Validation.showError('Debe seleccionar un método de resolución de colisiones.');
            return;
        }

        const size = parseInt(el.range.value);
        const keyLength = parseInt(el.keyLength.value);
        const dataType = el.dataType.value;

        if (size > 10000) {
            Validation.showWarning(`Va a crear una estructura con ${size.toLocaleString()} posiciones. Esto puede afectar el rendimiento visual.`);
        }

        this._collisionStrategy = collisionStrategy;
        this.dataStructure.create(size, keyLength, dataType, false); // Hash no usa allowDuplicates del base aquí

        // Habilitar controles
        el.inputKey.disabled = false;
        el.btnInsert.disabled = false;
        el.btnDelete.disabled = false;
        el.btnSearch.disabled = false;
        el.btnSave.disabled = false;
        el.btnPrint.disabled = false;

        // Deshabilitar configuración
        el.dataType.disabled = true;
        el.keyLength.disabled = true;
        el.range.disabled = true;
        el.collisionStrategy.disabled = true;
        el.btnCreate.disabled = true;
        el.btnLoad.disabled = true;

        el.tableContainer.style.display = '';
        el.logContainer.style.display = '';

        this._renderTable();

        const strategyName = CollisionStrategyFactory.create(collisionStrategy, this.dataStructure).getName();
        this._onCreationSuccess(size, keyLength, dataType, strategyName);
    }

    /**
     * Sobrescribe la carga para recuperar la estrategia de colisión.
     * @override
     * @private
     * @async
     */
    async _onLoad() {
        if (this.dataStructure.created) {
            Validation.showWarning('Ya existe una estructura activa. Debe limpiarla antes de cargar otra.');
            return;
        }

        const data = await FileManager.load();
        if (!data) return;

        // Validar que el archivo cargado sea una tabla hash o compatible
        if (!data.structure || data.structure.collisionStrategy === undefined) {
            // Si no tiene estrategia, podría ser de una versión vieja o de otra vista
            // Pero vamos a intentar cargarla si tiene los campos básicos
        }

        const structure = data.structure;
        this.dataStructure.fromJSON(structure);

        // Recuperar estrategia
        this._collisionStrategy = structure.collisionStrategy || '';

        const el = this.elements;
        el.dataType.value = structure.dataType;
        el.keyLength.value = structure.keyLength;
        el.range.value = structure.size;

        if (el.collisionStrategy) {
            el.collisionStrategy.value = this._collisionStrategy;
            el.collisionStrategy.disabled = true;
        }

        // Deshabilitar configuración
        el.dataType.disabled = true;
        el.keyLength.disabled = true;
        el.range.disabled = true;
        el.btnCreate.disabled = true;
        el.btnLoad.disabled = true;

        // Habilitar controles
        el.inputKey.disabled = false;
        el.btnInsert.disabled = false;
        el.btnDelete.disabled = false;
        el.btnSearch.disabled = false;
        el.btnSave.disabled = false;
        el.btnPrint.disabled = false;

        el.tableContainer.style.display = '';
        el.logContainer.style.display = '';

        this._renderTable();
        this._addLog('Estructura hash cargada desde archivo.', 'success');

        if (this._collisionStrategy) {
            const strategyName = CollisionStrategyFactory.create(this._collisionStrategy, this.dataStructure).getName();
            this._addLog(`Método de colisión recuperado: ${strategyName}.`, 'info');
        }
    }

    /**
     * Gancho para personalizar el log de creación en subclases.
     * @protected
     */
    _onCreationSuccess(size, keyLength, dataType, strategyName) {
        this._addLog(`Estructura hash creada: ${size} posiciones, clave de ${keyLength} carácter(es), tipo: ${dataType}, estrategia: ${strategyName}.`, 'info');
    }

    /**
     * Maneja el evento de limpiar/reiniciar la estructura hash.
     * @override
     * @private
     * @async
     */
    async _onClear() {
        await super._onClear();
        const el = this.elements;
        if (el.collisionStrategy) {
            el.collisionStrategy.value = '';
            el.collisionStrategy.disabled = false;
        }
    }

    /**
     * Sobrescribe la eliminación para usar hashDelete con estrategia.
     * @override
     * @private
     */
    _onDelete() {
        const el = this.elements;
        const key = el.inputKey.value.trim();

        if (key === '') {
            Validation.showError('Debe ingresar la clave que desea borrar.', el.inputKey);
            return;
        }

        const result = this.dataStructure.hashDelete(key, this._collisionStrategy);

        if (!result.success) {
            Validation.showError(result.error, el.inputKey);
            return;
        }

        this._renderTable();
        this._addLog(`Clave borrada de la posición ${result.position + 1}.`, 'warning');
        el.inputKey.value = '';
        el.inputKey.focus();
    }

    /**
     * Obtiene la clave a mostrar en una posición (maneja arreglos y listas).
     * @protected
     * @param {number} position - Posición en la tabla.
     * @returns {string}
     */
    _getDisplayKey(position) {
        return this.dataStructure.keys[position];
    }

    /**
     * Anima la búsqueda hash paso a paso según la estrategia.
     * @protected
     * @param {Object} result - Resultado de hashSearch.
     * @param {string} displayKey - Clave normalizada para mostrar en los logs.
     * @returns {Promise<void>}
     */
    _animateSearch(result, displayKey) {
        return new Promise((resolve) => {
            const steps = result.steps;
            const tbody = this.elements.tableBody;
            let stepIndex = 0;

            const animateStep = () => {
                if (stepIndex >= steps.length) {
                    this._addLog(`✘ Clave "${displayKey}" no encontrada. Se revisaron ${steps.length} posición(es).`, 'error');
                    resolve();
                    return;
                }

                const step = steps[stepIndex];
                const row = tbody.rows[step.index];

                if (row) {
                    row.classList.add('highlight-checking');
                    row.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }

                if (step.action === 'encontrada') {
                    if (row) {
                        row.classList.remove('highlight-checking');
                        row.classList.add('highlight-found');
                    }
                    let foundMsg = `✔ Posición ${step.index + 1}: ¡Clave encontrada!`;
                    if (step.formula) foundMsg += ` (${step.formula})`;
                    this._addLog(foundMsg, 'success');
                    resolve();
                } else if (step.action === 'vacio') {
                    if (row) {
                        row.classList.remove('highlight-checking');
                        row.classList.add('highlight-not-found');
                    }
                    let emptyMsg = `✘ Posición ${step.index + 1}: Vacío.`;
                    if (step.formula) emptyMsg += ` (${step.formula})`;
                    this._addLog(emptyMsg, 'error');

                    stepIndex++;
                    setTimeout(() => {
                        if (row) row.classList.remove('highlight-not-found');
                        animateStep();
                    }, this.animationSpeed || 500);
                } else {
                    let collMsg = `ℹ Posición ${step.index + 1}: Colisión con clave "${step.key}".`;
                    if (step.formula) collMsg += ` (${step.formula})`;
                    this._addLog(collMsg, 'info');

                    stepIndex++;
                    setTimeout(() => {
                        if (row) row.classList.remove('highlight-checking');
                        animateStep();
                    }, this.animationSpeed || 500);
                }
            };

            animateStep();
        });
    }

    /**
     * Renderiza la tabla adaptada para mostrar arreglos anidados y listas enlazadas.
     * @override
     * @private
     */
    _renderTable() {
        const tbody = this.elements.tableBody;
        tbody.innerHTML = '';

        const maxRender = Math.min(this.dataStructure.size, 10000);

        for (let i = 0; i < maxRender; i++) {
            const tr = document.createElement('tr');
            tr.dataset.index = i;

            const tdPos = document.createElement('td');
            tdPos.textContent = i + 1;

            const tdKey = document.createElement('td');
            const value = this.dataStructure.keys[i];

            if (value === null || value === undefined) {
                tdKey.textContent = '-';
                tdKey.classList.add('empty-cell');
            } else {
                tdKey.textContent = value;
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
}
