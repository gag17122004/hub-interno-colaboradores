/**
 * m2-custos.js — Módulo 2 (v2): Custos, Matéria-Prima e Produtos
 *
 * Estrutura de dados:
 *   products = [
 *     {
 *       id,
 *       name,          // ex: "Saco 50L"
 *       variations: [
 *         {
 *           id,
 *           sku,        // ex: "TQ 50 100"  ou "LCQ 15 20 1000"
 *           qty,        // extraído da nomenclatura (último número)
 *           lotWeight,  // peso total do lote (kg)
 *           width,      // cm (embalagem)
 *           height,     // cm
 *           length,     // cm
 *           micron,     // ex: "0.03"
 *         }
 *       ]
 *     }
 *   ]
 *
 * Preço/kg único compartilhado: rawPrice (R$/kg)
 * COEX = Envelopes (SKU inicia com LCQ)
 * PEBD = Sacos (SKU inicia com TQ)
 */

/* ── Seed de produtos padrão ─────────────────────────────── */
const _SEED_KEY = 'hub_products_seeded_v1';
const _DEFAULT_PRICE = 9.85;
const _DEFAULT_PRODUCTS = [
  { name: 'Saco de Lixo', variations: [
    { sku:'TQ 50 50',    qty:50,   lotWeight:0.405,  width:20, height:26, length:5,   micron:'0.03'  },
    { sku:'TQ 50 100',   qty:100,  lotWeight:0.990,  width:24, height:31, length:6,   micron:'0.03'  },
    { sku:'TQ 60 50',    qty:50,   lotWeight:0.600,  width:26, height:31, length:5,   micron:'0.03'  },
    { sku:'TQ 60 100',   qty:100,  lotWeight:1.216,  width:27, height:32, length:7,   micron:'0.03'  },
    { sku:'TQ 100 50',   qty:50,   lotWeight:0.916,  width:30, height:31, length:5,   micron:'0.03'  },
    { sku:'TQ 100 100',  qty:100,  lotWeight:1.800,  width:31, height:39, length:7,   micron:'0.03'  },
    { sku:'TQ 200 50',   qty:50,   lotWeight:1.380,  width:35, height:31, length:6,   micron:'0.03'  },
    { sku:'TQ 200 100',  qty:100,  lotWeight:2.682,  width:33, height:36, length:7,   micron:'0.03'  },
    { sku:'TQ 300 50',   qty:50,   lotWeight:2.366,  width:34, height:36, length:8,   micron:'0.04'  },
    { sku:'TQ 300 100',  qty:100,  lotWeight:4.756,  width:34, height:36, length:10,  micron:'0.04'  },
  ]},
  { name: 'Envelope de Segurança', variations: [
    { sku:'LCQ 15 20 100',  qty:100,  lotWeight:0.230,  width:14, height:21, length:3,   micron:'0.035' },
    { sku:'LCQ 15 20 250',  qty:250,  lotWeight:0.575,  width:14, height:21, length:4,   micron:'0.035' },
    { sku:'LCQ 15 20 500',  qty:500,  lotWeight:1.140,  width:14, height:21, length:9,   micron:'0.035' },
    { sku:'LCQ 15 20 1000', qty:1000, lotWeight:2.280,  width:28, height:21, length:9,   micron:'0.035' },
    { sku:'LCQ 25 20 100',  qty:100,  lotWeight:0.374,  width:14, height:32, length:4,   micron:'0.035' },
    { sku:'LCQ 25 20 250',  qty:250,  lotWeight:0.936,  width:14, height:32, length:5,   micron:'0.035' },
    { sku:'LCQ 25 20 500',  qty:500,  lotWeight:1.850,  width:14, height:32, length:10,  micron:'0.035' },
    { sku:'LCQ 25 20 1000', qty:1000, lotWeight:3.700,  width:14, height:32, length:20,  micron:'0.035' },
    { sku:'LCQ 20 30 100',  qty:100,  lotWeight:0.404,  width:16, height:30, length:4,   micron:'0.035' },
    { sku:'LCQ 20 30 250',  qty:250,  lotWeight:1.010,  width:16, height:30, length:5,   micron:'0.035' },
    { sku:'LCQ 20 30 500',  qty:500,  lotWeight:2.056,  width:16, height:30, length:10,  micron:'0.035' },
    { sku:'LCQ 20 30 1000', qty:1000, lotWeight:4.146,  width:16, height:30, length:20,  micron:'0.035' },
    { sku:'LCQ 26 36 100',  qty:100,  lotWeight:0.669,  width:24, height:33, length:4,   micron:'0.035' },
    { sku:'LCQ 26 36 250',  qty:250,  lotWeight:1.674,  width:24, height:33, length:5,   micron:'0.035' },
    { sku:'LCQ 26 36 500',  qty:500,  lotWeight:2.300,  width:24, height:33, length:10,  micron:'0.035' },
    { sku:'LCQ 26 36 1000', qty:1000, lotWeight:4.600,  width:24, height:33, length:20,  micron:'0.035' },
    { sku:'LCQ 30 40 100',  qty:100,  lotWeight:0.784,  width:38, height:25, length:5,   micron:'0.035' },
    { sku:'LCQ 30 40 250',  qty:250,  lotWeight:2.144,  width:38, height:25, length:8,   micron:'0.035' },
    { sku:'LCQ 30 40 500',  qty:500,  lotWeight:4.288,  width:38, height:25, length:16,  micron:'0.035' },
    { sku:'LCQ 30 40 1000', qty:1000, lotWeight:8.576,  width:38, height:25, length:32,  micron:'0.035' },
    { sku:'LCQ 32 40 100',  qty:100,  lotWeight:0.901,  width:38, height:25, length:5,   micron:'0.035' },
    { sku:'LCQ 32 40 250',  qty:250,  lotWeight:2.252,  width:38, height:25, length:8,   micron:'0.035' },
    { sku:'LCQ 32 40 500',  qty:500,  lotWeight:4.504,  width:38, height:25, length:16,  micron:'0.035' },
    { sku:'LCQ 32 40 1000', qty:1000, lotWeight:9.008,  width:38, height:25, length:32,  micron:'0.035' },
    { sku:'LCQ 40 40 100',  qty:100,  lotWeight:1.123,  width:45, height:27, length:5,   micron:'0.035' },
    { sku:'LCQ 40 40 250',  qty:250,  lotWeight:2.808,  width:45, height:27, length:9,   micron:'0.035' },
    { sku:'LCQ 40 40 500',  qty:500,  lotWeight:5.616,  width:45, height:27, length:18,  micron:'0.035' },
    { sku:'LCQ 40 40 1000', qty:1000, lotWeight:11.232, width:45, height:27, length:36,  micron:'0.035' },
    { sku:'LCQ 50 40 100',  qty:100,  lotWeight:1.346,  width:48, height:29, length:5,   micron:'0.035' },
    { sku:'LCQ 50 40 250',  qty:250,  lotWeight:3.366,  width:48, height:29, length:10,  micron:'0.035' },
    { sku:'LCQ 50 40 500',  qty:500,  lotWeight:6.838,  width:48, height:29, length:20,  micron:'0.035' },
    { sku:'LCQ 50 40 1000', qty:1000, lotWeight:13.610, width:48, height:29, length:40,  micron:'0.035' },
    { sku:'LCQ 60 40 100',  qty:100,  lotWeight:1.700,  width:52, height:32, length:5,   micron:'0.035' },
    { sku:'LCQ 60 40 250',  qty:250,  lotWeight:4.250,  width:52, height:32, length:10,  micron:'0.035' },
    { sku:'LCQ 60 40 500',  qty:500,  lotWeight:8.500,  width:52, height:32, length:20,  micron:'0.035' },
    { sku:'LCQ 60 40 1000', qty:1000, lotWeight:17.000, width:52, height:32, length:40,  micron:'0.035' },
    { sku:'LCQ 40 60 100',  qty:100,  lotWeight:0,      width:52, height:32, length:5,   micron:'0.035' },
    { sku:'LCQ 40 60 250',  qty:250,  lotWeight:0,      width:52, height:32, length:10,  micron:'0.035' },
    { sku:'LCQ 40 60 500',  qty:500,  lotWeight:0,      width:52, height:32, length:20,  micron:'0.035' },
    { sku:'LCQ 40 60 1000', qty:1000, lotWeight:0,      width:52, height:32, length:40,  micron:'0.035' },
    { sku:'LCQ 50 60 100',  qty:100,  lotWeight:2.266,  width:53, height:36, length:13,  micron:'0.035' },
    { sku:'LCQ 50 60 1000', qty:1000, lotWeight:22.660, width:53, height:36, length:130, micron:'0.035' },
  ]},
];

const M2 = (() => {

  /* ── Estado ──────────────────────────────────────────────── */
  let rawPrice = 0;   // R$/kg único
  let products = [];  // ver estrutura acima
  let _editingProductId  = null;
  let _editingVariationId = null;

  /* ── Persistência ────────────────────────────────────────── */
  function save() {
    Storage.set(Storage.KEYS.RAW_PRICES, { single: rawPrice });
    Storage.set(Storage.KEYS.PRODUCTS, products);
  }

  function load() {
    const stored = Storage.get(Storage.KEYS.RAW_PRICES, {});
    // compatibilidade com versão anterior (coex/pebd separados)
    rawPrice = stored.single ?? stored.coex ?? stored.pebd ?? 0;
    // migrar produtos antigos (sem variações) se necessário
    const rawProds = Storage.get(Storage.KEYS.PRODUCTS, []);
    products = rawProds.map(p => {
      if (p.variations) return p; // já novo formato
      // migrar produto antigo para grupo com 1 variação
      const sku = p.type === 'Envelope' ? `LCQ 0 0 1000` : `TQ 0L 100`;
      return {
        id: p.id,
        name: p.name,
        variations: [{
          id: Utils.uid(),
          sku: p.name,
          qty: p.type === 'Envelope' ? 1000 : 100,
          lotWeight: Number(p.weight) * (p.type === 'Envelope' ? 1000 : 100),
          width: 0, height: 0, length: 0, micron: ''
        }]
      };
    });
  }

  /* ── Helpers de Cálculo ──────────────────────────────────── */

  /**
   * Extrai qty do último número da nomenclatura
   * "TQ 50 100" → 100,  "LCQ 15 20 1000" → 1000
   */
  function qtyFromSku(sku = '') {
    const parts = sku.trim().split(/\s+/);
    const last = parseInt(parts[parts.length - 1]);
    return isNaN(last) ? 1 : last;
  }

  /**
   * Detecta tipo pela nomenclatura
   * LCQ → Envelope (COEX)
   * TQ  → Saco (PEBD)
   */
  function typeFromSku(sku = '') {
    return sku.trim().toUpperCase().startsWith('LCQ') ? 'Envelope' : 'Saco';
  }

  /**
   * Calcula todos os custos de uma variação.
   * @param {{ lotWeight, qty, sku }} variation
   * @returns {{ unitReal, pratik, loteCost, qty, unitWeight }}
   */
  function calcVariationCosts(variation) {
    const lotWeight = Number(variation.lotWeight) || 0;
    const qty       = Number(variation.qty) || 1;
    const price     = Number(rawPrice) || 0;
    const type      = typeFromSku(variation.sku);

    const unitWeight = lotWeight / qty;            // kg por unidade
    const loteCost   = lotWeight * price;           // custo bruto do lote
    const unitReal   = qty > 0 ? loteCost / qty : 0;
    const pratik     = lotWeight * price * 2;      // custo Pratik — lote × preço × 2

    return { unitReal, pratik, loteCost, qty, unitWeight, type };
  }

  /* ── Renderização ────────────────────────────────────────── */

  function renderPrice() {
    const inp = document.getElementById('m2-price-kg');
    if (inp) inp.value = rawPrice || '';
  }

  function renderProducts() {
    const container = document.getElementById('m2-products-container');
    if (!container) return;

    if (products.length === 0) {
      container.innerHTML = `<div class="empty-state">
        <i class="fa-solid fa-box-open"></i>
        <p>Nenhum produto cadastrado. Clique em "Novo Grupo" para começar.</p>
      </div>`;
      renderSalesTable();
      return;
    }

    renderSalesTable();
    container.innerHTML = products.map(prod => {
      const varRows = (prod.variations || []).map(v => {
        const c = calcVariationCosts(v);
        const isMaster = Auth.isMaster();
        const pricesHTML = isMaster ? `
          <span class="font-mono" style="font-size:11px;color:var(--text-sec)">
            Unit: <strong>${Utils.brl(c.unitReal)}</strong>
            | Pratik: <strong>${Utils.brl(c.pratik)}</strong>
            | Lote: <strong>${Utils.brl(c.loteCost)}</strong>
          </span>` : `
          <span class="font-mono text-xs text-muted">
            ${Utils.num(c.unitWeight * 1000, 1)}g/un | ${Utils.num(Number(v.lotWeight) * 1000, 0)}g total
          </span>`;

        return `
          <div class="m2-var-row" data-var-id="${v.id}" data-prod-id="${prod.id}">
            <div style="display:flex;align-items:center;gap:10px;padding:10px 16px;border-bottom:1px solid var(--border)">
              <i class="fa-solid fa-diagram-successor text-muted" style="font-size:11px;margin-left:8px"></i>
              <div style="flex:1;min-width:0">
                <span class="font-mono" style="font-size:13px;font-weight:600">${Utils.esc(v.sku)}</span>
                <span class="text-xs text-muted ml-2">${v.qty} un · ${Utils.num(Number(v.lotWeight)*1000,0)}g lote</span>
              </div>
              ${pricesHTML}
              <div class="flex gap-2">
                <button class="btn btn-xs btn-ghost" title="Ver dimensões" onclick="M2.toggleVarDetails('${v.id}')">
                  <i class="fa-solid fa-ruler-combined"></i>
                </button>
                ${isMaster ? `
                <button class="btn btn-xs btn-secondary" onclick="M2.editVariation('${prod.id}','${v.id}')">
                  <i class="fa-solid fa-pen"></i>
                </button>
                <button class="btn btn-xs btn-danger" onclick="M2.removeVariation('${prod.id}','${v.id}')">
                  <i class="fa-solid fa-trash"></i>
                </button>` : ''}
              </div>
            </div>
            <div class="m2-var-details" id="vd-${v.id}" style="display:none;padding:10px 16px 10px 36px;background:var(--surface2);font-size:12px">
              <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:8px">
                <div><span class="text-muted">Largura:</span> <strong>${v.width || '—'} cm</strong></div>
                <div><span class="text-muted">Altura:</span> <strong>${v.height || '—'} cm</strong></div>
                <div><span class="text-muted">Compr.:</span> <strong>${v.length || '—'} cm</strong></div>
                <div><span class="text-muted">Micragem:</span> <strong>${v.micron || '—'}</strong></div>
                <div><span class="text-muted">Peso unit.:</span> <strong>${Utils.num(c.unitWeight * 1000, 2)} g</strong></div>
              </div>
            </div>
          </div>`;
      }).join('');

      const isMaster = Auth.isMaster();
      return `
        <div class="m2-prod-group">
          <div class="m2-prod-header" onclick="M2.toggleGroup('${prod.id}')">
            <div style="display:flex;align-items:center;gap:10px">
              <i class="fa-solid fa-boxes-stacked" style="color:var(--accent);font-size:13px"></i>
              <span style="font-weight:700;font-size:14px">${Utils.esc(prod.name)}</span>
              <span class="badge badge-muted">${(prod.variations||[]).length} variação(ões)</span>
            </div>
            <div class="flex gap-2" onclick="event.stopPropagation()">
              ${isMaster ? `
              <button class="btn btn-xs btn-primary" onclick="M2.openAddVariation('${prod.id}')">
                <i class="fa-solid fa-plus"></i> Variação
              </button>
              <button class="btn btn-xs btn-ghost" onclick="M2.editGroup('${prod.id}')">
                <i class="fa-solid fa-pen"></i>
              </button>
              <button class="btn btn-xs btn-danger" onclick="M2.removeGroup('${prod.id}')">
                <i class="fa-solid fa-trash"></i>
              </button>` : ''}
              <i class="fa-solid fa-chevron-down group-chevron" id="chev-${prod.id}" style="font-size:11px;color:var(--text-sec);transition:.2s"></i>
            </div>
          </div>
          <div class="m2-var-list" id="group-${prod.id}" style="display:none">
            ${varRows || `<div class="text-xs text-muted" style="padding:12px 16px">Nenhuma variação. Adicione uma acima.</div>`}
          </div>
        </div>`;
    }).join('');
  }

  /* ── Tabela de Vendas Físicas ────────────────────────────── */

  function renderSalesTable() {
    const tbody = document.getElementById('m2-sales-tbody');
    if (!tbody) return;

    if (products.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="empty-state">
        <i class="fa-solid fa-box-open"></i><p>Nenhum produto cadastrado.</p>
      </td></tr>`;
      return;
    }

    const rows = [];
    products.forEach(prod => {
      (prod.variations || []).forEach(v => {
        const c = calcVariationCosts(v);
        const pratikUnit = c.qty > 0 ? c.pratik / c.qty : 0;
        rows.push(`
          <tr>
            <td class="font-mono" style="font-weight:600">${Utils.esc(v.sku)}</td>
            <td class="text-muted text-xs">${Utils.esc(prod.name)}</td>
            <td class="font-mono">${v.qty} un</td>
            <td class="font-mono">${Utils.num(Number(v.lotWeight), 3)} kg</td>
            <td class="font-mono text-accent font-bold">${Utils.brl(c.pratik)}</td>
            <td class="font-mono text-xs">${Utils.brl(pratikUnit)}</td>
            <td class="font-mono text-xs">${Utils.brl(c.unitReal)}</td>
          </tr>`);
      });
    });

    tbody.innerHTML = rows.length ? rows.join('') : `<tr><td colspan="7" class="empty-state">
      <p>Nenhuma variação cadastrada.</p></td></tr>`;
  }

  /* ── Toggle UI ───────────────────────────────────────────── */

  function toggleGroup(prodId) {
    const el = document.getElementById(`group-${prodId}`);
    const chev = document.getElementById(`chev-${prodId}`);
    if (!el) return;
    const open = el.style.display === 'none';
    el.style.display = open ? 'block' : 'none';
    if (chev) chev.style.transform = open ? 'rotate(180deg)' : '';
  }

  function toggleVarDetails(varId) {
    const el = document.getElementById(`vd-${varId}`);
    if (!el) return;
    el.style.display = el.style.display === 'none' ? 'block' : 'none';
  }

  /* ── Modal: Grupo ────────────────────────────────────────── */

  function openAddGroup() {
    _editingProductId = null;
    document.getElementById('m2-group-modal-title').textContent = 'Novo Grupo de Produto';
    document.getElementById('m2-group-name').value = '';
    document.getElementById('modal-product-group').classList.add('open');
  }

  function editGroup(prodId) {
    const prod = products.find(p => p.id === prodId);
    if (!prod) return;
    _editingProductId = prodId;
    document.getElementById('m2-group-modal-title').textContent = 'Editar Grupo';
    document.getElementById('m2-group-name').value = prod.name;
    document.getElementById('modal-product-group').classList.add('open');
  }

  function closeGroupModal() {
    document.getElementById('modal-product-group').classList.remove('open');
    _editingProductId = null;
  }

  function saveGroup() {
    const name = document.getElementById('m2-group-name').value.trim();
    if (!name) { Toast.error('Informe o nome do grupo.'); return; }

    if (_editingProductId) {
      const idx = products.findIndex(p => p.id === _editingProductId);
      if (idx !== -1) products[idx].name = name;
      Logger.log(`Editou grupo de produto: ${name}`);
    } else {
      products.push({ id: Utils.uid(), name, variations: [] });
      Logger.log(`Adicionou grupo de produto: ${name}`);
    }

    save();
    closeGroupModal();
    renderProducts();
    document.dispatchEvent(new CustomEvent('m2:products:updated'));
    Toast.success(_editingProductId ? 'Grupo atualizado.' : 'Grupo criado.');
  }

  function removeGroup(prodId) {
    const prod = products.find(p => p.id === prodId);
    if (!prod) return;
    Modal.confirm({
      title: 'Remover Grupo',
      body: `<p>Remover <strong>${Utils.esc(prod.name)}</strong> e todas as suas variações?</p>
             <p class="text-sm text-muted mt-2">Esta ação não pode ser desfeita.</p>`,
      confirmText: 'Remover',
      confirmClass: 'btn-danger',
      onConfirm() {
        products = products.filter(p => p.id !== prodId);
        save();
        renderProducts();
        document.dispatchEvent(new CustomEvent('m2:products:updated'));
        Logger.log(`Removeu grupo de produto: ${prod.name}`);
        Toast.success('Grupo removido.');
      }
    });
  }

  /* ── Modal: Variação ─────────────────────────────────────── */

  let _currentGroupId = null;

  function openAddVariation(prodId) {
    _currentGroupId = prodId;
    _editingVariationId = null;
    document.getElementById('m2-var-modal-title').textContent = 'Nova Variação';
    ['m2-var-sku','m2-var-lotweight','m2-var-width','m2-var-height',
     'm2-var-length','m2-var-micron'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    document.getElementById('m2-var-qty-display').textContent = '—';
    document.getElementById('modal-variation').classList.add('open');
  }

  function editVariation(prodId, varId) {
    const prod = products.find(p => p.id === prodId);
    if (!prod) return;
    const v = (prod.variations || []).find(v => v.id === varId);
    if (!v) return;

    _currentGroupId = prodId;
    _editingVariationId = varId;
    document.getElementById('m2-var-modal-title').textContent = 'Editar Variação';
    document.getElementById('m2-var-sku').value       = v.sku;
    document.getElementById('m2-var-lotweight').value = v.lotWeight;
    document.getElementById('m2-var-width').value     = v.width || '';
    document.getElementById('m2-var-height').value    = v.height || '';
    document.getElementById('m2-var-length').value    = v.length || '';
    document.getElementById('m2-var-micron').value    = v.micron || '';
    document.getElementById('m2-var-qty-display').textContent = v.qty;
    document.getElementById('modal-variation').classList.add('open');
  }

  function closeVariationModal() {
    document.getElementById('modal-variation').classList.remove('open');
    _editingVariationId = null;
    _currentGroupId = null;
  }

  function onSkuInput() {
    const sku = document.getElementById('m2-var-sku')?.value || '';
    const qty = qtyFromSku(sku);
    const qtyEl = document.getElementById('m2-var-qty-display');
    if (qtyEl) qtyEl.textContent = qty;
  }

  function saveVariation() {
    const sku       = document.getElementById('m2-var-sku').value.trim();
    const lotWeight = parseFloat(document.getElementById('m2-var-lotweight').value);
    const width     = parseFloat(document.getElementById('m2-var-width').value) || 0;
    const height    = parseFloat(document.getElementById('m2-var-height').value) || 0;
    const length    = parseFloat(document.getElementById('m2-var-length').value) || 0;
    const micron    = document.getElementById('m2-var-micron').value.trim();

    if (!sku)                  { Toast.error('Informe a nomenclatura (SKU).'); return; }
    if (isNaN(lotWeight) || lotWeight < 0) { Toast.error('Informe o peso do lote (kg).'); return; }

    const qty = qtyFromSku(sku);
    const prod = products.find(p => p.id === _currentGroupId);
    if (!prod) return;

    const varData = { sku, qty, lotWeight, width, height, length, micron };

    if (_editingVariationId) {
      const idx = prod.variations.findIndex(v => v.id === _editingVariationId);
      if (idx !== -1) prod.variations[idx] = { ...prod.variations[idx], ...varData };
      Logger.log(`Editou variação ${sku} em ${prod.name}`);
    } else {
      prod.variations.push({ id: Utils.uid(), ...varData });
      Logger.log(`Adicionou variação ${sku} em ${prod.name}`);
    }

    save();
    closeVariationModal();
    renderProducts();
    document.dispatchEvent(new CustomEvent('m2:products:updated'));
    Toast.success(_editingVariationId ? 'Variação atualizada.' : 'Variação adicionada.');
  }

  function removeVariation(prodId, varId) {
    const prod = products.find(p => p.id === prodId);
    if (!prod) return;
    const v = (prod.variations || []).find(v => v.id === varId);
    if (!v) return;
    Modal.confirm({
      title: 'Remover Variação',
      body: `<p>Remover <strong>${Utils.esc(v.sku)}</strong>?</p>`,
      confirmText: 'Remover',
      confirmClass: 'btn-danger',
      onConfirm() {
        prod.variations = prod.variations.filter(x => x.id !== varId);
        save();
        renderProducts();
        document.dispatchEvent(new CustomEvent('m2:products:updated'));
        Logger.log(`Removeu variação ${v.sku} de ${prod.name}`);
        Toast.success('Variação removida.');
      }
    });
  }

  /* ── Preço/kg ─────────────────────────────────────────────── */

  function savePrice() {
    const val = parseFloat(document.getElementById('m2-price-kg')?.value);
    if (isNaN(val) || val < 0) { Toast.error('Preço inválido.'); return; }
    rawPrice = val;
    save();
    renderProducts();
    document.dispatchEvent(new CustomEvent('m2:prices:updated'));
    Logger.log(`Atualizou preço/kg para R$ ${Utils.num(val, 2)}`);
    Toast.success('Preço atualizado e custos recalculados.');
  }

  /* ── Importação XLSX ─────────────────────────────────────── */

  function importXlsx(file) {
    if (!window.XLSX) { Toast.error('Biblioteca XLSX não carregada.'); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });

        let added = 0, updated = 0, toRemove = [];
        const skusInFile = new Set();

        rows.forEach(row => {
          // Colunas esperadas: Grupo, SKU, PesoLote, Largura, Altura, Comprimento, Micragem
          const groupName  = String(row['Grupo'] || row['grupo'] || '').trim();
          const sku        = String(row['SKU']   || row['sku']   || '').trim();
          const lotWeight  = parseFloat(row['PesoLote'] || row['Peso'] || 0);

          if (!groupName || !sku) return;
          skusInFile.add(sku);

          const qty    = qtyFromSku(sku);
          const varData = {
            sku, qty, lotWeight,
            width:  parseFloat(row['Largura']     || 0) || 0,
            height: parseFloat(row['Altura']      || 0) || 0,
            length: parseFloat(row['Comprimento'] || 0) || 0,
            micron: String(row['Micragem'] || '').trim()
          };

          // Encontrar ou criar grupo
          let prod = products.find(p => p.name.toLowerCase() === groupName.toLowerCase());
          if (!prod) {
            prod = { id: Utils.uid(), name: groupName, variations: [] };
            products.push(prod);
          }

          // Verificar se variação já existe
          const existingIdx = prod.variations.findIndex(v => v.sku === sku);
          if (existingIdx !== -1) {
            prod.variations[existingIdx] = { ...prod.variations[existingIdx], ...varData };
            updated++;
          } else {
            prod.variations.push({ id: Utils.uid(), ...varData });
            added++;
          }
        });

        // Verificar variações que sumiram
        const removedSkus = [];
        products.forEach(prod => {
          prod.variations.forEach(v => {
            if (!skusInFile.has(v.sku)) removedSkus.push({ prodId: prod.id, varId: v.id, sku: v.sku });
          });
        });

        const finalize = () => {
          save();
          renderProducts();
          document.dispatchEvent(new CustomEvent('m2:products:updated'));
          Logger.log(`Importou planilha XLSX: +${added} adicionados, ${updated} atualizados`);
          Toast.success(`Importação concluída: ${added} adicionados, ${updated} atualizados.`);
        };

        if (removedSkus.length > 0) {
          Modal.confirm({
            title: 'Variações ausentes na planilha',
            body: `<p>${removedSkus.length} variação(ões) não encontradas na planilha:</p>
                   <ul class="text-sm text-muted mt-2" style="padding-left:16px">
                     ${removedSkus.map(r => `<li>${Utils.esc(r.sku)}</li>`).join('')}
                   </ul>
                   <p class="mt-2">Deseja <strong>remover</strong> estas variações?</p>`,
            confirmText: 'Remover',
            confirmClass: 'btn-danger',
            onConfirm() {
              removedSkus.forEach(({ prodId, varId }) => {
                const p = products.find(x => x.id === prodId);
                if (p) p.variations = p.variations.filter(v => v.id !== varId);
              });
              finalize();
            }
          });
          // Executar finalização mesmo que o modal seja cancelado (manter)
          // mas após o confirm fechar. Para o caso "Cancelar" = manter:
          setTimeout(finalize, 100);
        } else {
          finalize();
        }
      } catch (err) {
        console.error(err);
        Toast.error('Erro ao processar o arquivo XLSX.');
      }
    };
    reader.readAsBinaryString(file);
  }

  /* ── API para outros módulos ─────────────────────────────── */

  /** Retorna todos os produtos no novo formato (grupos + variações). */
  function getProducts() {
    return [...products];
  }

  /** Retorna o preço/kg atual. */
  function getRawPrice() {
    return rawPrice;
  }

  /**
   * Retorna custo unitário de uma variação específica.
   * @param {string} varId
   */
  function getVariationCost(varId) {
    for (const prod of products) {
      const v = (prod.variations || []).find(v => v.id === varId);
      if (v) return calcVariationCosts(v).unitReal;
    }
    return 0;
  }

  /** Compatibilidade com M3 legado: retorna lista plana de variações com metadados */
  function getFlatVariations() {
    const result = [];
    products.forEach(prod => {
      (prod.variations || []).forEach(v => {
        const costs = calcVariationCosts(v);
        result.push({
          id: v.id,
          sku: v.sku,
          groupName: prod.name,
          groupId: prod.id,
          qty: v.qty,
          lotWeight: v.lotWeight,
          type: typeFromSku(v.sku),
          unitCost: costs.unitReal,
          pratik: costs.pratik,
          loteCost: costs.loteCost,
        });
      });
    });
    return result;
  }

  /* ── Seed de produtos padrão ────────────────────────────── */
  function seedIfEmpty() {
    if (Storage.get(_SEED_KEY)) return;
    if (products.length > 0) { Storage.set(_SEED_KEY, true); return; }

    rawPrice = _DEFAULT_PRICE;
    products = _DEFAULT_PRODUCTS.map(group => ({
      id: Utils.uid(),
      name: group.name,
      variations: group.variations.map(v => ({ id: Utils.uid(), ...v }))
    }));
    save();
    Storage.set(_SEED_KEY, true);
    renderPrice();
    renderProducts();
    document.dispatchEvent(new CustomEvent('m2:products:updated'));
    Toast.info('Produtos padrão carregados. Preço/kg: R$ 9,85.');
  }

  /* ── Inicialização ───────────────────────────────────────── */
  function init() {
    load();

    const savePriceBtn = document.getElementById('m2-save-price-btn');
    if (savePriceBtn) savePriceBtn.addEventListener('click', savePrice);

    const addGroupBtn = document.getElementById('m2-add-group-btn');
    if (addGroupBtn) addGroupBtn.addEventListener('click', openAddGroup);

    const saveGroupBtn = document.getElementById('m2-save-group-btn');
    if (saveGroupBtn) saveGroupBtn.addEventListener('click', saveGroup);

    const cancelGroupBtn = document.getElementById('m2-cancel-group-btn');
    if (cancelGroupBtn) cancelGroupBtn.addEventListener('click', closeGroupModal);

    const saveVarBtn = document.getElementById('m2-save-var-btn');
    if (saveVarBtn) saveVarBtn.addEventListener('click', saveVariation);

    const cancelVarBtn = document.getElementById('m2-cancel-var-btn');
    if (cancelVarBtn) cancelVarBtn.addEventListener('click', closeVariationModal);

    const skuInput = document.getElementById('m2-var-sku');
    if (skuInput) skuInput.addEventListener('input', onSkuInput);

    // Importação XLSX
    const xlsxInput = document.getElementById('m2-xlsx-input');
    if (xlsxInput) {
      xlsxInput.addEventListener('change', (e) => {
        if (e.target.files[0]) importXlsx(e.target.files[0]);
        e.target.value = '';
      });
    }
    const xlsxBtn = document.getElementById('m2-xlsx-btn');
    if (xlsxBtn) xlsxBtn.addEventListener('click', () => xlsxInput?.click());

    renderPrice();
    renderProducts();
    renderSalesTable();
    seedIfEmpty();

    document.addEventListener('route:change', (e) => {
      if (e.detail.route === 'm2') {
        load();
        renderPrice();
        renderProducts();
        renderSalesTable();
      }
    });
  }

  return {
    init,
    savePrice,
    openAddGroup,
    editGroup,
    closeGroupModal,
    saveGroup,
    removeGroup,
    openAddVariation,
    editVariation,
    closeVariationModal,
    saveVariation,
    removeVariation,
    toggleGroup,
    toggleVarDetails,
    onSkuInput,
    getProducts,
    getRawPrice,
    getVariationCost,
    getFlatVariations,
  };

})();
