/**
 * @fileoverview Vista de Árboles por Residuos Múltiples.
 * Agrega un selector de m (bits por bloque) al panel de modificación.
 * @extends TreeView
 * @module views/ArbolesResiduosMultiplesView
 */

class ArbolesResiduosMultiplesView extends TreeView {
    constructor(containerEl) {
        super(containerEl);
        this._algorithmName = 'arboles-residuos-multiples';
    }

    show() {
        this.model = new MultiResidueTreeModel(2); // m=2 por defecto
        this.render('Árboles por Residuos Múltiples');
        this._injectMSelector();
    }

    /**
     * Inyecta el selector de m justo debajo del input-row y arriba de los
     * botones de insertar/borrar/buscar.
     */
    _injectMSelector() {
        const modPanel = this.container.querySelector('.tree-mod-panel');
        if (!modPanel) return;

        // Ubicar el label del input (para insertar arriba de él)
        const inputLabel = modPanel.querySelector('label[for="tree-input-key"]');
        if (!inputLabel) return;

        // Crear la fila del selector
        const selectorRow = document.createElement('div');
        selectorRow.classList.add('tree-m-selector-row');
        selectorRow.innerHTML = `
            <label for="tree-m-select">Bits por Bloque (m)</label>
            <select id="tree-m-select">
                <option value="2" selected>m = 2 (4 hijos)</option>
                <option value="3">m = 3 (8 hijos)</option>
                <option value="4">m = 4 (16 hijos)</option>
                <option value="5">m = 5 (32 hijos)</option>
            </select>
        `;

        // Insertar antes del label del input
        modPanel.insertBefore(selectorRow, inputLabel);

        // Cachear y enlazar evento
        this.elements.mSelect = document.getElementById('tree-m-select');
        this.elements.mSelect.addEventListener('change', () => this._onMChange());
    }

    /**
     * Maneja el cambio de m: recrea el modelo y redibuja.
     */
    _onMChange() {
        const newM = parseInt(this.elements.mSelect.value);

        if (this.model && this.model.created) {
            // Rebuild the tree with the same keys but new m
            const savedOrder = [...this.model.insertionOrder];
            this.model = new MultiResidueTreeModel(newM);
            for (const letter of savedOrder) {
                this.model.insert(letter);
            }
            this._setOperation('config');
            this._addLog(`Valor de m cambiado a ${newM}. Árbol reconstruido con ${savedOrder.length} clave(s).`, 'info');
            this._fitToView();
        } else {
            this.model = new MultiResidueTreeModel(newM);
            this._drawTree();
        }
    }

    /**
     * Al cargar desde archivo, sincronizar el selector de m.
     * @override
     */
    async _onLoad() {
        await super._onLoad();
        // Sync the m selector with the loaded model
        if (this.model && this.model.created && this.elements.mSelect) {
            this.elements.mSelect.value = this.model.m.toString();
        }
    }

    /**
     * Al limpiar, resetear el selector de m a su valor por defecto.
     * @override
     */
    async _onClear() {
        await super._onClear();
        if (this.elements.mSelect) {
            this.elements.mSelect.value = '2';
        }
        this.model = new MultiResidueTreeModel(2);
    }
}
