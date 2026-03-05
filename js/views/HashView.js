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
            <option value="prueba-lineal">Prueba Lineal</option>
            <option value="prueba-cuadratica">Prueba Cuadrática</option>
            <option value="doble-hash">Doble Función Hash</option>
            <option value="arreglos-anidados">Arreglos Anidados</option>
            <option value="encadenamiento">Encadenamiento</option>
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
        const welcome = document.getElementById('welcome-screen');
        if (welcome) welcome.classList.add('hidden');

        // Mostrar el contenedor de la vista
        this.container.classList.remove('hidden');

        this.container.innerHTML = `
            <!-- Título del Algoritmo -->
            <div class="algo-title">${title}</div>

            <!-- Top row: Configuración (izq) + Modificación (der) -->
            <div class="block-top-row">
                <!-- Panel Configuración -->
                <div class="block-panel-creation">
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
                            <button class="btn btn-primary" id="btn-create">CREAR</button>
                            <button class="btn btn-info" id="btn-load">CARGAR</button>
                            <button class="btn btn-secondary" id="btn-clear">LIMPIAR</button>
                        </div>
                    </div>
                </div>
                <!-- Panel Modificación -->
                <div class="block-panel-modification">
                    <div class="section-title">Modificación de la Estructura</div>
                    <div class="block-mod-body">
                        <div class="block-mod-left">
                            <label for="input-key">Digite la Clave</label>
                            <input type="text" id="input-key" placeholder="Ingrese la clave..." disabled>
                        </div>
                        <div class="insert-buttons">
                            <button class="btn btn-primary" id="btn-insert" disabled>INSERTAR</button>
                            <button class="btn btn-danger" id="btn-delete" disabled>BORRAR</button>
                            <button class="btn btn-success" id="btn-search" disabled>BUSCAR</button>
                        </div>
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
                <button class="btn btn-success" id="btn-save" disabled>GUARDAR</button>
                <button class="btn btn-primary" id="btn-print" disabled>IMPRIMIR</button>
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
        this.elements.tableScroll = document.getElementById('table-scroll');

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
        this.dataStructure.create(size, keyLength, dataType, false, collisionStrategy, this._getHashMethod());

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

        // Validar que el archivo corresponda a un algoritmo compatible
        if (data.algorithm && this._algorithmName && !FileCompat.areCompatible(data.algorithm, this._algorithmName)) {
            Validation.showError(`Este archivo fue creado para "${data.algorithm}" y no es compatible con la vista actual ("${this._algorithmName}").`);
            return;
        }

        const structure = data.structure;
        const el = this.elements;

        // Check if loading from a different hash algorithm
        const isDifferentAlgo = data.algorithm && data.algorithm !== this._algorithmName;

        if (isDifferentAlgo) {
            // Cross-hash loading: extract keys and re-insert with this algorithm
            const originalKeys = [];
            if (structure.keys) {
                for (const k of structure.keys) {
                    if (k !== null && k !== undefined) originalKeys.push(k);
                }
            }

            if (originalKeys.length === 0) {
                Validation.showWarning('El archivo no contiene claves para cargar.');
                return;
            }

            // Use the collision strategy saved in the file
            const collisionStrategy = structure.collisionStrategy || '';
            if (!collisionStrategy) {
                Validation.showError('El archivo no contiene un método de colisión válido.');
                return;
            }

            this._collisionStrategy = collisionStrategy;

            // Create fresh structure with this view's hash method
            const hashMethod = this._getHashMethod();
            this.dataStructure.create(
                structure.size,
                structure.keyLength,
                structure.dataType,
                false,
                collisionStrategy,
                hashMethod
            );

            // Re-insert all keys silently
            let insertedCount = 0;
            for (const key of originalKeys) {
                const result = this.dataStructure.hashInsert(key, this._collisionStrategy);
                if (result.success) insertedCount++;
            }

            // UI setup
            el.dataType.value = structure.dataType;
            el.keyLength.value = structure.keyLength;
            el.range.value = structure.size;
            if (el.collisionStrategy) {
                el.collisionStrategy.value = collisionStrategy;
                el.collisionStrategy.disabled = true;
            }
            el.dataType.disabled = true;
            el.keyLength.disabled = true;
            el.range.disabled = true;
            el.btnCreate.disabled = true;
            el.btnLoad.disabled = true;
            el.inputKey.disabled = false;
            el.btnInsert.disabled = false;
            el.btnDelete.disabled = false;
            el.btnSearch.disabled = false;
            el.btnSave.disabled = false;
            el.btnPrint.disabled = false;
            el.tableContainer.style.display = '';
            el.logContainer.style.display = '';

            this._renderTable();
            this._setOperation('load');
            this._addLog(`Archivo de "${data.algorithm}" cargado y re-procesado con ${this._algorithmName}. ${insertedCount} clave(s) insertadas.`, 'success');

            const strategyName = CollisionStrategyFactory.create(collisionStrategy, this.dataStructure).getName();
            this._addLog(`Método de colisión recuperado: ${strategyName}.`, 'info');

        } else {
            // Same algorithm — direct load
            this.dataStructure.fromJSON(structure);
            this._collisionStrategy = structure.collisionStrategy || '';

            el.dataType.value = structure.dataType;
            el.keyLength.value = structure.keyLength;
            el.range.value = structure.size;

            if (el.collisionStrategy) {
                el.collisionStrategy.value = this._collisionStrategy;
                el.collisionStrategy.disabled = true;
            }

            el.dataType.disabled = true;
            el.keyLength.disabled = true;
            el.range.disabled = true;
            el.btnCreate.disabled = true;
            el.btnLoad.disabled = true;
            el.inputKey.disabled = false;
            el.btnInsert.disabled = false;
            el.btnDelete.disabled = false;
            el.btnSearch.disabled = false;
            el.btnSave.disabled = false;
            el.btnPrint.disabled = false;
            el.tableContainer.style.display = '';
            el.logContainer.style.display = '';

            this._renderTable();
            this._setOperation('load');
            this._addLog('Estructura hash cargada desde archivo.', 'success');

            if (this._collisionStrategy) {
                const strategyName = CollisionStrategyFactory.create(this._collisionStrategy, this.dataStructure).getName();
                this._addLog(`Método de colisión recuperado: ${strategyName}.`, 'info');
            }
        }
    }

    /**
     * Returns the hash method for this view. Override in subclasses.
     * @protected
     * @returns {string}
     */
    _getHashMethod() {
        return 'modulo'; // Default for HashModView
    }

    /**
     * Gancho para personalizar el log de creación en subclases.
     * @protected
     */
    _onCreationSuccess(size, keyLength, dataType, strategyName) {
        this._setOperation('create');
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
     * Sobrescribe la eliminación para animar la búsqueda hash antes de borrar.
     * @override
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

        // Ejecutar la búsqueda hash para obtener los pasos de animación
        const searchResult = this.dataStructure.hashSearch(key, this._collisionStrategy);

        this._clearHighlights();
        this.isSearchAnimating = true;

        // Deshabilitar botones durante la animación
        el.btnSearch.disabled = true;
        el.btnInsert.disabled = true;
        el.btnDelete.disabled = true;

        this._setOperation('delete');
        this._addLog(`Buscando clave "${displayKey}" para eliminar...`, 'info');

        // Animar la búsqueda hash
        await this._animateSearch(searchResult, displayKey);

        // Ahora ejecutar la eliminación real
        const deleteResult = this.dataStructure.hashDelete(key, this._collisionStrategy);

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

        const tbody = this.elements.tableBody;
        const row = tbody.querySelector(`tr[data-index="${deleteResult.position}"]`);

        if (row) {
            this._clearHighlights();
            const logMsg = `Clave "${displayKey}" encontrada en posición ${deleteResult.position + 1}. Eliminando...`;
            this._addLog(logMsg, 'warning');

            // Determinar si es una eliminación granular (específica de un nodo/columna)
            const isGranular = deleteResult.subIndex !== undefined &&
                (this._collisionStrategy === 'encadenamiento' || this._collisionStrategy === 'arreglos-anidados');

            if (isGranular) {
                const subElement = row.querySelector(`.node-item[data-sub-index="${deleteResult.subIndex}"], .nested-column[data-sub-index="${deleteResult.subIndex}"]`);
                if (subElement) {
                    subElement.classList.add('highlight-deleting');
                    await new Promise(r => setTimeout(r, 800));
                    subElement.classList.add('fade-out');
                    await new Promise(r => setTimeout(r, 500));
                } else {
                    // Fallback a fila si no se encuentra el sub-elemento
                    row.classList.add('highlight-deleting');
                    await new Promise(r => setTimeout(r, 800));
                    row.classList.add('fade-out');
                    await new Promise(r => setTimeout(r, 500));
                }
            } else {
                // Comportamiento estándar para prueba lineal/cuadrática/doble hash
                row.classList.add('highlight-deleting');
                await new Promise(r => setTimeout(r, 800));
                row.classList.add('fade-out');
                await new Promise(r => setTimeout(r, 500));
            }
        }

        this._renderTable();
        this._clearHighlights();
        this.isSearchAnimating = false;
        el.btnSearch.disabled = false;
        el.btnInsert.disabled = false;
        el.btnDelete.disabled = false;
        this._addLog(`Clave "${displayKey}" borrada de la posición ${deleteResult.position + 1}.`, 'success');
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
        const item = this.dataStructure.keys[position];
        if (item === null || item === undefined) return '-';
        if (typeof item === 'object' && item.value !== undefined) {
            // Para Encadenamiento (retornar valor del primer nodo para el log base, o el que se acaba de insertar)
            // En _onInsert se usa para el mensaje final. El modelo inserta al final.
            let last = item;
            while (last.next !== null) last = last.next;
            return last.value;
        }
        if (Array.isArray(item)) {
            // Para Arreglos Anidados
            return item[item.length - 1];
        }
        return item;
    }

    /**
     * Anima la búsqueda hash paso a paso según la estrategia.
     * Inserta dinámicamente filas faltantes si la tabla compacta no las tiene.
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
                let row = tbody.querySelector(`tr[data-index="${step.index}"]`);

                // Si la fila no existe en la tabla compacta, insertarla dinámicamente
                if (!row) {
                    row = this._insertDynamicRow(step.index);
                }

                if (row) {
                    row.classList.add('highlight-checking');
                    const scrollContainer = this.elements.tableScroll; // Use this.elements.tableScroll
                    if (scrollContainer) {
                        const rowTop = row.offsetTop;
                        const rowHeight = row.offsetHeight;
                        const containerHeight = scrollContainer.clientHeight;
                        scrollContainer.scrollTop = rowTop - (containerHeight / 2) + (rowHeight / 2);
                    }

                    // Resaltar sub-elemento si existe (para Arreglos Anidados o Encadenamiento)
                    if (step.subIndex !== undefined) {
                        const subElement = row.querySelector(`.nested-column[data-sub-index="${step.subIndex}"], .node-item[data-sub-index="${step.subIndex}"]`);
                        const arrow = row.querySelector(`.link-arrow[data-sub-index="${step.subIndex}"]`);

                        if (subElement) {
                            subElement.classList.add('highlight-checking');
                            // Scroll horizontal del contenedor principal si el elemento está fuera de vista
                            const subRect = subElement.getBoundingClientRect();
                            const scrollRect = scrollContainer.getBoundingClientRect();

                            const isLeftBound = subRect.left < scrollRect.left;
                            const isRightBound = subRect.right > scrollRect.right;

                            if (isLeftBound || isRightBound) {
                                // Centrar horizontalmente en el scrollContainer
                                const scrollOffset = (subRect.left - scrollRect.left) + scrollContainer.scrollLeft;
                                scrollContainer.scrollLeft = scrollOffset - (scrollRect.width / 2) + (subRect.width / 2);
                            }
                        }
                        if (arrow) arrow.classList.add('highlight-checking');
                    }
                }

                if (step.action === 'encontrada') {
                    if (row) {
                        row.classList.remove('highlight-checking');
                        row.classList.add('highlight-found');
                        if (step.subIndex !== undefined) {
                            const subElement = row.querySelector(`.nested-column[data-sub-index="${step.subIndex}"], .node-item[data-sub-index="${step.subIndex}"]`);
                            if (subElement) {
                                subElement.classList.remove('highlight-checking');
                                subElement.classList.add('highlight-found');
                                // Contrast is handled by CSS, but we ensure it's applied
                            }
                        }
                    }
                    let foundMsg = `✔ Posición ${step.index + 1}: ¡Clave encontrada!`;
                    if (step.subIndex !== undefined) {
                        const typeLabel = this._collisionStrategy === 'encadenamiento' ? 'nodo' : 'índice';
                        foundMsg = `✔ Posición ${step.index + 1}, ${typeLabel} ${step.subIndex + 1}: ¡Clave encontrada!`;
                    }
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
                    if (step.subIndex !== undefined) {
                        const typeLabel = this._collisionStrategy === 'encadenamiento' ? 'nodo' : 'índice';
                        collMsg = `ℹ Posición ${step.index + 1}, ${typeLabel} ${step.subIndex + 1}: Colisión con clave "${step.key}".`;
                    }
                    if (step.formula) collMsg += ` (${step.formula})`;
                    this._addLog(collMsg, 'info');

                    stepIndex++;
                    setTimeout(() => {
                        if (row) {
                            row.classList.remove('highlight-checking');
                            if (step.subIndex !== undefined) {
                                const subElement = row.querySelector(`.nested-column[data-sub-index="${step.subIndex}"], .node-item[data-sub-index="${step.subIndex}"]`);
                                const arrow = row.querySelector(`.link-arrow[data-sub-index="${step.subIndex}"]`);
                                if (subElement) subElement.classList.remove('highlight-checking');
                                if (arrow) arrow.classList.remove('highlight-checking');
                            }
                        }
                        animateStep();
                    }, this.animationSpeed || 500);
                }
            };

            animateStep();
        });
    }

    /**
     * Inserta una fila dinámica en la tabla compacta para una posición
     * que no estaba visible previamente.
     * @private
     * @param {number} index - Índice (0-based) de la posición a insertar.
     * @returns {HTMLTableRowElement|null} La fila insertada.
     */
    _insertDynamicRow(index) {
        const tbody = this.elements.tableBody;
        const rows = Array.from(tbody.querySelectorAll('tr[data-index]'));

        const tr = document.createElement('tr');
        tr.dataset.index = index;

        const tdPos = document.createElement('td');
        tdPos.textContent = index + 1;

        const value = this.dataStructure.keys[index];
        const tdKey = this._renderKeyCell(value);

        tr.appendChild(tdPos);
        tr.appendChild(tdKey);

        // Encontrar la posición correcta para insertar la fila
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
     * Renderiza la tabla hash. Si el rango de la estructura es mayor a 11
     * usa modo compacto: solo muestra la primera posición, la última posición,
     * y las posiciones que tienen claves insertadas, con separadores "…".
     * Con rango de 11 o menos muestra todas las posiciones normalmente.
     * @override
     * @private
     */
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

                const value = this.dataStructure.keys[i];
                const tdKey = this._renderKeyCell(value);

                tr.appendChild(tdPos);
                tr.appendChild(tdKey);
                tbody.appendChild(tr);
            }
        } else {
            // Modo compacto: solo posiciones relevantes con separadores
            const visiblePositions = new Set();
            visiblePositions.add(0);           // primera
            visiblePositions.add(size - 1);    // última

            for (let i = 0; i < size; i++) {
                if (this.dataStructure.keys[i] !== null && this.dataStructure.keys[i] !== undefined) {
                    visiblePositions.add(i);
                }
            }

            const sorted = Array.from(visiblePositions).sort((a, b) => a - b);
            let lastRendered = -1;

            for (const pos of sorted) {
                // Si hay un hueco entre la posición anterior y esta, insertar separador
                if (lastRendered !== -1 && pos > lastRendered + 1) {
                    const ellipsisTr = document.createElement('tr');
                    ellipsisTr.classList.add('ellipsis-row');
                    const ellipsisTd = document.createElement('td');
                    ellipsisTd.colSpan = 2;
                    ellipsisTd.textContent = '…';
                    ellipsisTr.appendChild(ellipsisTd);
                    tbody.appendChild(ellipsisTr);
                }

                const tr = document.createElement('tr');
                tr.dataset.index = pos;

                const tdPos = document.createElement('td');
                tdPos.textContent = pos + 1;

                const value = this.dataStructure.keys[pos];
                const tdKey = this._renderKeyCell(value);

                tr.appendChild(tdPos);
                tr.appendChild(tdKey);
                tbody.appendChild(tr);

                lastRendered = pos;
            }
        }

        // Alinear el cuerpo de la tabla al fondo si hay espacio sobrante
        requestAnimationFrame(() => {
            const tableScroll = this.elements.tableScroll || document.getElementById('table-scroll');
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
     * Elimina todos los resaltados de búsqueda de las filas de la tabla.
     * También elimina filas dinámicas insertadas durante la animación de búsqueda.
     * @override
     * @private
     */
    _clearHighlights() {
        const rows = this.elements.tableBody.querySelectorAll('tr');
        rows.forEach(row => {
            row.classList.remove(
                'highlight-checking',
                'highlight-found',
                'highlight-not-found',
                'highlight-deleting',
                'fade-out',
                'highlight-discarded',
                'highlight-mid'
            );
            // También limpiar sub-elementos (para arreglos y listas)
            const subItems = row.querySelectorAll('.nested-column, .node-item, .link-arrow');
            subItems.forEach(item => {
                item.classList.remove('highlight-checking', 'highlight-found');
            });
        });

        // Eliminar solo las filas dinámicas
        this.elements.tableBody.querySelectorAll('tr[data-dynamic="true"]').forEach(row => row.remove());
    }

    /**
     * Obtiene la clave a mostrar en una posición (maneja arreglos y listas).
     * @protected
     * @param {number} position - Posición en la tabla.
     * @returns {string}
     */
    _getDisplayKey(position) {
        const item = this.dataStructure.keys[position];
        if (item === null || item === undefined) return '-';
        if (typeof item === 'object' && item.value !== undefined) {
            // Para Encadenamiento (retornar valor del último nodo insertado)
            let last = item;
            while (last.next !== null) last = last.next;
            return last.value;
        }
        if (Array.isArray(item)) {
            // Para Arreglos Anidados
            return item[item.length - 1];
        }
        return item;
    }


    /**
     * Renderiza el contenido de la celda de la clave, manejando colisiones.
     * @private
     * @param {any} value - Valor(es) a renderizar.
     * @returns {HTMLTableCellElement} Celda renderizada.
     */
    _renderKeyCell(value) {
        const tdKey = document.createElement('td');

        if (this._collisionStrategy === 'arreglos-anidados') {
            if (value === null || value === undefined) {
                tdKey.textContent = '-';
                tdKey.classList.add('empty-cell');
            } else if (Array.isArray(value)) {
                const container = document.createElement('div');
                container.classList.add('nested-container');

                value.forEach((val, i) => {
                    const col = document.createElement('div');
                    col.classList.add('nested-column');
                    col.dataset.subIndex = i;
                    col.textContent = val;
                    container.appendChild(col);
                });

                tdKey.appendChild(container);
                tdKey.classList.add('nested-cell');
            } else {
                tdKey.textContent = value;
            }
        } else if (this._collisionStrategy === 'encadenamiento') {
            if (value === null || value === undefined) {
                tdKey.textContent = '-';
                tdKey.classList.add('empty-cell');
            } else {
                const container = document.createElement('div');
                container.classList.add('nested-container', 'chaining-container');

                let current = value;
                let subIndex = 0;
                while (current !== null) {
                    if (subIndex > 0) {
                        const arrow = document.createElement('div');
                        arrow.classList.add('link-arrow', 'horizontal-arrow');
                        arrow.dataset.subIndex = subIndex;
                        container.appendChild(arrow);
                    }

                    const node = document.createElement('div');
                    node.classList.add('node-item', 'horizontal-node');
                    node.textContent = current.value;
                    node.dataset.subIndex = subIndex;
                    container.appendChild(node);

                    current = current.next;
                    subIndex++;
                }

                tdKey.appendChild(container);
                tdKey.classList.add('nested-cell');
            }
        } else {
            if (value === null || value === undefined) {
                tdKey.textContent = '-';
                tdKey.classList.add('empty-cell');
            } else {
                tdKey.textContent = value;
            }
        }

        return tdKey;
    }
}
