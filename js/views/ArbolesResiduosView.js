/**
 * @fileoverview Vista de Árboles por Residuos.
 * @extends TreeView
 * @module views/ArbolesResiduosView
 */

class ArbolesResiduosView extends TreeView {
    constructor(containerEl) {
        super(containerEl);
        this._algorithmName = 'arboles-residuos';
    }

    show() {
        this.model = new ResidueTreeModel();
        this.render('Árboles por Residuos');
    }
}
