/**
 * @fileoverview Vista de Árboles Digitales.
 * @extends TreeView
 * @module views/ArbolesDigitalesView
 */

class ArbolesDigitalesView extends TreeView {
    constructor(containerEl) {
        super(containerEl);
        this._algorithmName = 'arboles-digitales';
    }

    show() {
        this.model = new DigitalTreeModel();
        this.render('Árboles de Búsqueda Digitales');
    }
}
