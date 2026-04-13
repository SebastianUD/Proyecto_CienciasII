/**
 * @class GraphAlgorithmsModel
 * @description Contiene la lógica matemática y de generación de pasos (HTML visual)
 * para los algoritmos de grafos: Floyd, Dijkstra y Bellman.
 *
 * @module models/GraphAlgorithmsModel
 */
class GraphAlgorithmsModel {

    // ─── ALGORITMO DE FLOYD ────────────────────────────────────────────────

    static executeFloyd(nodeCount, D, src = null, tgt = null) {
        const n = nodeCount;
        const INF = Infinity;
        const D0 = D.map(row => [...row]);
        const P = Array.from({length: n}, () => new Array(n).fill(-1));

        for (let i = 0; i < n; i++) {
            for (let k = 0; k < n; k++) {
                if (i !== k && D[i][k] !== INF) P[i][k] = i;
            }
        }

        let html = `<div style="padding:10px 10px 4px; font-size:0.8rem; color:var(--text-secondary); font-style:italic;">
            Se evaluará la condición <b>Dij + Djk &lt; Dik</b> para j = 1..${n}.<br>
            Los valores en <b style="color:#E53935;">rojo</b> fueron actualizados en esa iteración.
        </div>`;

        html += this._floydMatrixHTML(D, n, `Matriz Inicial`, null, -1, null);

        let totalChanges = 0;

        for (let j = 0; j < n; j++) {
            const changed = {}; // { i: Set<k> }

            for (let i = 0; i < n; i++) {
                for (let k = 0; k < n; k++) {
                    if (D[i][j] < INF && D[j][k] < INF) {
                        const via = D[i][j] + D[j][k];
                        if (via < D[i][k]) {
                            D[i][k] = via;
                            P[i][k] = P[j][k];
                            if (!changed[i]) changed[i] = new Set();
                            changed[i].add(k);
                            totalChanges++;
                        }
                    }
                }
            }

            const countChanged = Object.values(changed).reduce((s, set) => s + set.size, 0);
            const note = countChanged > 0
                ? `${countChanged} valor(es) actualizado(s).`
                : 'Sin cambios en esta iteración.';

            html += this._floydMatrixHTML(D, n, `Iteración j = ${j + 1}`, changed, j, note);
        }

        const finalChanged = {};
        for (let i = 0; i < n; i++) {
            for (let k = 0; k < n; k++) {
                if (D[i][k] !== D0[i][k]) {
                    if (!finalChanged[i]) finalChanged[i] = new Set();
                    finalChanged[i].add(k);
                }
            }
        }
        html += this._floydMatrixHTML(D, n, `Matriz Final`, finalChanged, -1, null);

        let edgeHL = {};
        let nodeHL = {};
        let isPathFound = false;

        if (src !== null && tgt !== null && src > 0 && tgt > 0) {
            let s = src - 1;
            let t = tgt - 1;
            if (D[s][t] !== INF) {
                isPathFound = true;
                let curr = t;
                let pathNodes = [t + 1];
                while (curr !== s) {
                    let prev = P[s][curr];
                    if (prev === -1) { isPathFound = false; break; }
                    edgeHL[`${prev + 1}-${curr + 1}`] = '#E53935';
                    curr = prev;
                    pathNodes.push(curr + 1);
                }
                if (isPathFound) {
                    for (let nodeNum of pathNodes) {
                        nodeHL[nodeNum] = '#FFCDD2';
                    }
                    nodeHL[src] = '#4CAF50';
                    nodeHL[tgt] = '#F44336';
                }
            }
        }

        for (let i = 0; i < n; i++) {
            if (D[i][i] < 0) {
                nodeHL[i + 1] = '#EF5350'; // Ciclo negativo
            }
        }

        return { html, nodeHL, edgeHL, nodeExtraLabel: {}, totalChanges, isPathFound, finalDist: (src && tgt) ? D[src - 1][tgt - 1] : 0 };
    }

    static _floydMatrixHTML(D, n, title, changed, pivotIdx, note) {
        const fmt = (v) => (v === Infinity) ? '∞' : String(v);

        let h = `
        <div class="huffman-step-table" style="margin-bottom:12px;">
            <div class="section-title" style="
                font-size:0.8rem;
                background:var(--bg-main);
                border-bottom:1px solid var(--border-light);
                border-top-left-radius:4px;
                border-top-right-radius:4px;
                padding:6px 10px;
            ">${title}</div>
            <div style="padding:8px; overflow-x:auto;">`;

        if (note !== null) {
            const noteColor = note.startsWith('Sin cambios') ? '#888' : '#E53935';
            h += `<div style="font-size:0.74rem; color:${noteColor}; margin-bottom:5px; font-style:italic;">${note}</div>`;
        }

        h += `<table style="border-collapse:collapse; font-size:0.8rem; width:100%;">
            <thead>
                <tr>
                    <th style="
                        background:#2B579A; color:white;
                        padding:4px 8px; border:1px solid #ccd3df;
                        text-align:center; font-size:0.75rem;
                    ">i \\ k</th>`;

        for (let k = 0; k < n; k++) {
            const isPivotCol = k === pivotIdx;
            h += `<th style="
                background:${isPivotCol ? '#174a8f' : '#2B579A'};
                color:white; padding:4px 8px;
                border:1px solid #ccd3df;
                text-align:center; font-size:0.75rem;
                ${isPivotCol ? 'text-decoration:underline;' : ''}
            ">${k + 1}</th>`;
        }
        h += `</tr></thead><tbody>`;

        for (let i = 0; i < n; i++) {
            const isPivotRow = i === pivotIdx;
            const rowBg      = isPivotRow ? '#FFF8EE' : (i % 2 === 0 ? '#F9FAFB' : '#fff');

            h += `<tr>
                <td style="
                    font-weight:bold; text-align:center;
                    padding:4px 8px; border:1px solid #ccd3df;
                    background:${isPivotRow ? '#FFF0D0' : '#EEF2F7'};
                    ${isPivotRow ? 'text-decoration:underline;' : ''}
                ">${i + 1}</td>`;

            for (let k = 0; k < n; k++) {
                const isChanged   = changed && changed[i] && changed[i].has(k);
                const isPivotArea = i === pivotIdx || k === pivotIdx;

                let bg = isPivotArea ? '#FFF8EE' : rowBg;
                let fg = '#333';
                let fw = 'normal';

                if (isChanged) {
                    bg = '#FFF0F0';
                    fg = '#E53935';
                    fw = 'bold';
                }

                h += `<td style="
                    padding:4px 8px; border:1px solid #ccd3df;
                    text-align:center;
                    background:${bg}; color:${fg}; font-weight:${fw};
                ">${fmt(D[i][k])}</td>`;
            }
            h += `</tr>`;
        }
        h += `</tbody></table></div></div>`;
        return h;
    }

    // ─── ALGORITMO DE DIJKSTRA ─────────────────────────────────────────────

    static executeDijkstra(nodeCount, edges, src, tgt) {
        const n = nodeCount;
        const INF = Infinity;

        let dist = new Array(n + 1).fill(INF);
        let pred = new Array(n + 1).fill(-1);
        let permanent = new Array(n + 1).fill(false);
        let labels = Array.from({length: n + 1}, () => []);

        dist[src] = 0;
        labels[src].push({ d: 0, p: '-' });

        let html = `<div style="padding:10px; font-size:0.85rem; color:var(--text-main);">
            <div style="font-weight:bold; margin-bottom:8px; border-bottom:1px solid #ccc; padding-bottom:4px;">Operaciones de Dijkstra</div>
            <p style="margin-bottom:6px; font-style:italic;">Formato de etiqueta: [distancia, predecesor]</p>`;

        let iter = 1;
        while (true) {
            let u = -1;
            let minDist = INF;
            for (let i = 1; i <= n; i++) {
                if (!permanent[i] && dist[i] < minDist) {
                    minDist = dist[i];
                    u = i;
                }
            }

            if (u === -1) break;
            
            permanent[u] = true;
            let curLabelStr = `[${dist[u]}, ${pred[u] === -1 ? '-' : pred[u]}]`;

            html += `<div style="margin-bottom:8px;">
                <div style="color:#2B579A; font-weight:bold; margin-bottom:4px;">Paso ${iter}: Seleccionado Nodo ${u} -> Permanente ${curLabelStr}*</div>
                <ul style="padding-left:18px; margin-top:0;">`;

            if (u === tgt) {
                html += `<li style="color:#388E3C; font-weight:bold;">¡El nodo final ${tgt} es permanente! Finalizando algoritmo.</li>`;
                html += `</ul></div>`;
                break;
            }

            let relaxed = false;
            for (let e of edges) {
                if (e.from === u) {
                    let v = e.to;
                    if (!permanent[v]) {
                        let newDist = dist[u] + e.weight;
                        let oldLabels = labels[v].map(l => `[${l.d}, ${l.p}]X`).join(', ');
                        
                        if (newDist < dist[v]) {
                            dist[v] = newDist;
                            pred[v] = u;
                            labels[v].push({ d: newDist, p: u });
                            
                            let lblStr = `[${newDist}, ${u}]`;
                            html += `<li>Arista ${u}→${v} (peso ${e.weight}): Genera etiqueta <span style="color:#E53935; font-weight:bold;">${lblStr}</span> en Nodo ${v}. ${(oldLabels ? 'Anula etiquetas anteriores: ' + oldLabels : '')}</li>`;
                            relaxed = true;
                        } else {
                            labels[v].push({ d: newDist, p: u, isDiscarded: true });
                            html += `<li style="color:#777;">Arista ${u}→${v} (peso ${e.weight}): Etiqueta [${newDist}, ${u}] en Nodo ${v} descartada (X) por ser mayor o igual a [${dist[v]}, ${pred[v]}].</li>`;
                            relaxed = true;
                        }
                    }
                }
            }
            if(!relaxed) {
                html += `<li style="color:#777;">No hay ramificaciones viables no permanentes.</li>`;
            }
            html += `</ul></div>`;
            iter++;
        }
        html += `</div>`;

        let nodeExtraLabel = {};
        for (let i = 1; i <= n; i++) {
            if (labels[i].length > 0) {
                let lblArr = [];
                for (let j = 0; j < labels[i].length; j++) {
                    let l = labels[i][j];
                    let isPerm = permanent[i];
                    
                    let str = `[${l.d}, ${l.p}]`;
                    let color = '#2B579A'; 
                    
                    let isCurrentBest = !l.isDiscarded && (l.d === dist[i] && (l.p === pred[i] || (l.p === '-' && pred[i] === -1)));
                    
                    if (isCurrentBest) {
                        str += isPerm ? '*' : '';
                        color = isPerm ? '#388E3C' : '#E53935'; 
                    } else {
                        str += 'X';
                        color = '#BDBDBD';
                    }
                    lblArr.push({ text: str, color: color });
                }
                nodeExtraLabel[i] = lblArr;
            }
        }

        let edgeHL = {};
        let nodeHL = {};
        let pathNodes = [];
        let curr = tgt;
        let isPathFound = false;
        if (permanent[tgt]) {
            isPathFound = true;
            while (curr !== -1 && curr !== src) {
                pathNodes.push(curr);
                let p = pred[curr];
                if (p !== -1) {
                    edgeHL[`${p}-${curr}`] = '#E53935';
                }
                curr = p;
            }
            if (curr === src) pathNodes.push(src);
            
            for (let num of pathNodes) {
                nodeHL[num] = '#FFCDD2'; 
            }
            nodeHL[src] = '#4CAF50';
            nodeHL[tgt] = '#F44336';
        }

        return {
            html,
            nodeExtraLabel,
            edgeHL,
            nodeHL,
            isPathFound,
            finalDist: dist[tgt]
        };
    }

    // ─── ALGORITMO DE BELLMAN ──────────────────────────────────────────────

    static executeBellman(nodeCount, edges, src, tgt) {
        const n = nodeCount;

        // Validar DAG
        let inDegree = new Array(n + 1).fill(0);
        let adj = Array.from({length: n + 1}, () => []);
        
        for (let e of edges) {
            adj[e.from].push({ to: e.to, w: e.weight });
            inDegree[e.to]++;
        }

        let q = [];
        for (let i = 1; i <= n; i++) {
            if (inDegree[i] === 0) q.push(i);
        }

        let topoOrder = [];
        while (q.length > 0) {
            let u = q.shift();
            topoOrder.push(u);
            for (let edge of adj[u]) {
                inDegree[edge.to]--;
                if (inDegree[edge.to] === 0) {
                    q.push(edge.to);
                }
            }
        }

        if (topoOrder.length < n) {
            return { error: 'El grafo contiene ciclos. Este algoritmo de Bellman exige un DAG sin ciclos.' };
        }

        const INF = Infinity;
        let lambda = new Array(n + 1).fill(INF);
        let pred   = new Array(n + 1).fill(-1);
        lambda[src] = 0;

        let html = `<div style="padding:10px 10px 4px; font-size:0.8rem; color:var(--text-secondary); font-style:italic;">
            Bellman (DAG) — Nodo Inicial: <b>${src}</b>.<br>
            Condición principal: λ<sub>j</sub> = min(λ<sub>i</sub> + V<sub>ij</sub>).<br>
            Cálculo de valor por ramas predecesoras.
        </div>`;

        html += `<div class="huffman-step-table" style="margin-bottom:12px;">
            <div class="section-title" style="font-size:0.8rem; background:var(--bg-main); border-bottom:1px solid var(--border-light); border-top-left-radius:4px; border-top-right-radius:4px; padding:6px 10px;">Nodo Inicial ${src}</div>
            <div style="padding:10px; font-family:monospace; font-size:0.9rem; font-weight:bold; color:#2B579A;">
                λ<sub>${src}</sub> = 0
            </div>
        </div>`;

        for (let u of topoOrder) {
            if (u === src) continue;
            
            let predecessors = [];
            for (let e of edges) {
                if (e.to === u) predecessors.push(e);
            }

            if (predecessors.length > 0) {
                let calcArr = [];
                let minVal = INF;
                let bestPred = -1;

                for (let e of predecessors) {
                    let fromLambda = lambda[e.from];
                    let val = fromLambda + e.weight;
                    let text = fromLambda === INF ? `∞ + ${e.weight}` : `${fromLambda} + ${e.weight}`;
                    calcArr.push(`&nbsp;&nbsp;λ<sub>${e.from}</sub> + V<sub>${e.from},${u}</sub> = ${text} = ${val === INF ? '∞' : val}`);
                    
                    if (val < minVal) {
                        minVal = val;
                        bestPred = e.from;
                    }
                }

                lambda[u] = minVal;
                pred[u] = bestPred;

                html += `<div class="huffman-step-table" style="margin-bottom:12px;">
                    <div class="section-title" style="font-size:0.8rem; background:var(--bg-main); border-bottom:1px solid var(--border-light); border-top-left-radius:4px; border-top-right-radius:4px; padding:6px 10px;">Nodo ${u}</div>
                    <div style="padding:10px; font-size:0.85rem; line-height:1.5;">
                        λ<sub>${u}</sub> = min(<br>
                        <div style="margin:4px 0;">${calcArr.join('<br>')}</div>
                        )<br>
                        <div style="margin-top:6px; color:#E53935; font-weight:bold; font-size:0.95rem;">λ<sub>${u}</sub> = ${minVal === INF ? '∞' : minVal}</div>
                    </div>
                </div>`;
            } else {
                html += `<div class="huffman-step-table" style="margin-bottom:12px;">
                    <div class="section-title" style="font-size:0.8rem; background:var(--bg-main); border-bottom:1px solid var(--border-light); border-top-left-radius:4px; border-top-right-radius:4px; padding:6px 10px;">Nodo ${u}</div>
                    <div style="padding:10px; font-size:0.85rem; color:#888; font-style:italic;">
                        Sin predecesores alcanzables.<br>
                        <div style="margin-top:6px; font-style:normal; font-weight:bold; color:#E53935;">λ<sub>${u}</sub> = ∞</div>
                    </div>
                </div>`;
            }
        }

        const toSubscript = (num) => {
            const subs = ['₀','₁','₂','₃','₄','₅','₆','₇','₈','₉'];
            return String(num).split('').map(c => subs[c] || c).join('');
        };

        let nodeExtraLabel = {};
        for (let i = 1; i <= n; i++) {
            let lam = lambda[i] === INF ? '∞' : lambda[i];
            nodeExtraLabel[i] = `λ${toSubscript(i)} = ${lam}`;
        }

        let edgeHL = {};
        let nodeHL = {};
        let pathNodes = [];
        let curr = tgt;
        let isPathFound = false;

        if (lambda[tgt] !== INF) {
            isPathFound = true;
            while (curr !== -1 && curr !== src) {
                pathNodes.push(curr);
                let p = pred[curr];
                if (p !== -1) {
                    edgeHL[`${p}-${curr}`] = '#E53935';
                }
                curr = p;
            }
            if (curr === src) pathNodes.push(src);
            
            for (let num of pathNodes) {
                nodeHL[num] = '#FFCDD2';
            }
            nodeHL[src] = '#4CAF50';
            nodeHL[tgt] = '#F44336';
        }

        return {
            html,
            nodeExtraLabel,
            edgeHL,
            nodeHL,
            isPathFound,
            finalDist: lambda[tgt]
        };
    }
}
