/**
 * @fileoverview Vista de Árboles por Residuos Múltiples.
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
    }
}
