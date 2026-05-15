/**
 * m2-custos.js v2 — Custos, Matéria-Prima e Produtos
 *
 * products = [{ id, name, variations: [{ id, sku, qty, lotWeight, width, height, length, micron }] }]
 * rawPrice  = R$/kg único (COEX + PEBD)
 *
 * Fórmulas:
 *   unitReal sacos:    (lotWeight × price) ÷ 100
 *   unitReal envelopes:(lotWeight × price) ÷ 1000
 *   pratik:            lotWeight × price × 2
 *   loteCost sacos:    unitReal ÷ 100
 *   loteCost envelopes:unitReal ÷ 1000
 *
 * Peso estimado: largura × comprimento × (micragem/10) × 0,92 × 2 camadas (em gramas)
 */

/* ── Seed ── */
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

  /* ── Estado ── */
  let rawPrice = 0;
  let products = [];
  let _editingProductId  = null;
  let _editingVariationId = null;
  let _currentGroupId    = null;

  /* ── Persistência ── */
  function save() {
    Storage.setSync(Storage.KEYS.RAW_PRICES, { single: rawPrice });
    Storage.setSync(Storage.KEYS.PRODUCTS, products);
  }

  function load() {
    const stored = Storage.getSync(Storage.KEYS.RAW_PRICES, {});
    rawPrice = stored.single ?? stored.coex ?? stored.pebd ?? 0;
    const rawProds = Storage.getSync(Storage.KEYS.PRODUCTS, []);
    products = rawProds.map(p => {
      if (p.variations) return p;
      return {
        id: p.id, name: p.name,
        variations: [{
          id: Utils.uid(), sku: p.name,
          qty: p.type === 'Envelope' ? 1000 : 100,
          lotWeight: Number(p.weight) * (p.type === 'Envelope' ? 1000 : 100),
          width: 0, height: 0, length: 0, micron: ''
        }]
      };
    });
  }

  /* ── Helpers de SKU ── */
  function qtyFromSku(sku = '') {
    const parts = sku.trim().split(/\s+/);
    const last = parseInt(parts[parts.length - 1]);
    return isNaN(last) ? 1 : last;
  }

  function typeFromSku(sku = '') {
    return sku.trim().toUpperCase().startsWith('LCQ') ? 'Envelope' : 'Saco';
  }

  /* ── Cálculos ── */
  function calcVariationCosts(v) {
    const lotWeight = Number(v.lotWeight) || 0;
    const qty       = Number(v.qty) || 1;
    const price     = Number(rawPrice) || 0;
    const type      = typeFromSku(v.sku);
    const lotCost   = lotWeight * price;

    // Custo Unitário Real: ÷100 sacos, ÷1000 envelopes
    const unitReal = type === 'Saco' ? lotCost / 100 : lotCost / 1000;

    // Custo Pratik: lote × preço × 2
    const pratik = lotWeight * price * 2;

    // Custo Lote referência: unitReal ÷100 sacos, ÷1000 envelopes
    const loteCostRef = type === 'Saco' ? unitReal / 100 : unitReal / 1000;

    const unitWeight = qty > 0 ? lotWeight / qty : 0;

    return { unitReal, pratik, lotCost, loteCostRef, qty, unitWeight, type };
  }

  /* ── Renders de produtos ── */
  function renderPrice() {
    const inp = document.getElementById('m2-price-kg');
    if (inp) inp.value = rawPrice || '';
  }

  function renderProducts() {
    const container = document.getElementById('m2-products-container');
    if (!container) return;
    if (products.length === 0) {
      container.innerHTML = `<div class="empty-state"><i class="fa-solid fa-box-open"></i><p>Nenhum produto cadastrado.</p></div>`;
      renderSalesTable();
      return;
    }
    renderSalesTable();
    container.innerHTML = products.map(prod => {
      const varRows = (prod.variations || []).map(v => {
        const c = calcVariationCosts(v);
        const isMaster = Auth.isMaster();
        const pricesHTML = isMaster
          ? `<span class="font-mono" style="font-size:11px;color:var(--text-sec)">
               Unit: <strong>${Utils.brl(c.unitReal)}</strong>
               | Pratik: <strong>${Utils.brl(c.pratik)}</strong>
               | Lote: <strong>${Utils.brl(c.lotCost)}</strong>
             </span>`
          : `<span class="font-mono text-xs text-muted">
               ${Utils.num(c.unitWeight * 1000, 1)}g/un | ${Utils.num(Number(v.lotWeight) * 1000, 0)}g total
             </span>`;
        return `
          <div class="m2-var-row" data-var-id="${v.id}">
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
            <div id="vd-${v.id}" style="display:none;padding:10px 16px 10px 36px;background:var(--surface2);font-size:12px">
              <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:8px">
                <div><span class="text-muted">Largura:</span> <strong>${v.width || '—'} cm</strong></div>
                <div><span class="text-muted">Altura:</span> <strong>${v.height || '—'} cm</strong></div>
                <div><span class="text-muted">Compr.:</span> <strong>${v.length || '—'} cm</strong></div>
                <div><span class="text-muted">Micragem:</span> <strong>${v.micron || '—'} mm</strong></div>
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
            ${varRows || `<div class="text-xs text-muted" style="padding:12px 16px">Nenhuma variação cadastrada.</div>`}
          </div>
        </div>`;
    }).join('');
  }

  /* ── Tabela de Vendas Físicas ── */
  function renderSalesTable() {
    const tbody = document.getElementById('m2-sales-tbody');
    if (!tbody) return;
    if (products.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="empty-state"><i class="fa-solid fa-box-open"></i><p>Nenhum produto.</p></td></tr>`;
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
    tbody.innerHTML = rows.length ? rows.join('') : `<tr><td colspan="7" class="empty-state"><p>Nenhuma variação.</p></td></tr>`;
  }

  /* ── Toggle UI ── */
  function toggleGroup(prodId) {
    const el   = document.getElementById(`group-${prodId}`);
    const chev = document.getElementById(`chev-${prodId}`);
    if (!el) return;
    const open = el.style.display === 'none';
    el.style.display = open ? 'block' : 'none';
    if (chev) chev.style.transform = open ? 'rotate(180deg)' : '';
  }

  function toggleVarDetails(varId) {
    const el = document.getElementById(`vd-${varId}`);
    if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
  }

  /* ── Modal: Grupo ── */
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

  async function saveGroup() {
    const name = document.getElementById('m2-group-name').value.trim();
    if (!name) { Toast.error('Informe o nome do grupo.'); return; }
    if (_editingProductId) {
      const idx = products.findIndex(p => p.id === _editingProductId);
      if (idx !== -1) products[idx].name = name;
      Logger.log(`Editou grupo: ${name}`);
    } else {
      products.push({ id: Utils.uid(), name, variations: [] });
      Logger.log(`Criou grupo: ${name}`);
    }
    save();
    closeGroupModal();
    renderProducts();
    document.dispatchEvent(new CustomEvent('m2:products:updated'));
    Toast.success(_editingProductId ? 'Grupo atualizado.' : 'Grupo criado.');
  }

  async function removeGroup(prodId) {
    const prod = products.find(p => p.id === prodId);
    if (!prod) return;
    Modal.confirm({
      title: 'Remover Grupo',
      body: `<p>Remover <strong>${Utils.esc(prod.name)}</strong> e todas as variações?</p><p class="text-sm text-muted mt-2">Esta ação não pode ser desfeita.</p>`,
      confirmText: 'Remover', confirmClass: 'btn-danger',
      async onConfirm() {
        products = products.filter(p => p.id !== prodId);
        save(); renderProducts();
        document.dispatchEvent(new CustomEvent('m2:products:updated'));
        Logger.log(`Removeu grupo: ${prod.name}`);
        Toast.success('Grupo removido.');
      }
    });
  }

  /* ── Modal: Variação ── */
  function openAddVariation(prodId) {
    _currentGroupId = prodId;
    _editingVariationId = null;
    document.getElementById('m2-var-modal-title').textContent = 'Nova Variação';
    ['m2-var-sku','m2-var-lotweight','m2-var-width','m2-var-height','m2-var-length','m2-var-micron']
      .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
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
    const qtyEl = document.getElementById('m2-var-qty-display');
    if (qtyEl) qtyEl.textContent = qtyFromSku(sku);
  }

  async function saveVariation() {
    const sku       = document.getElementById('m2-var-sku').value.trim();
    const lotWeight = parseFloat(document.getElementById('m2-var-lotweight').value);
    const width     = parseFloat(document.getElementById('m2-var-width').value)  || 0;
    const height    = parseFloat(document.getElementById('m2-var-height').value) || 0;
    const length    = parseFloat(document.getElementById('m2-var-length').value) || 0;
    const micron    = document.getElementById('m2-var-micron').value.trim();

    if (!sku) { Toast.error('Informe a nomenclatura.'); return; }
    if (isNaN(lotWeight) || lotWeight < 0) { Toast.error('Informe o peso do lote (kg).'); return; }

    const qty  = qtyFromSku(sku);
    const prod = products.find(p => p.id === _currentGroupId);
    if (!prod) return;

    const varData = { sku, qty, lotWeight, width, height, length, micron };

    if (_editingVariationId) {
      const idx = prod.variations.findIndex(v => v.id === _editingVariationId);
      if (idx !== -1) prod.variations[idx] = { ...prod.variations[idx], ...varData };
      Logger.log(`Editou variação ${sku}`);
    } else {
      prod.variations.push({ id: Utils.uid(), ...varData });
      Logger.log(`Adicionou variação ${sku}`);
    }

    save(); closeVariationModal(); renderProducts();
    document.dispatchEvent(new CustomEvent('m2:products:updated'));
    Toast.success(_editingVariationId ? 'Variação atualizada.' : 'Variação adicionada.');
  }

  async function removeVariation(prodId, varId) {
    const prod = products.find(p => p.id === prodId);
    if (!prod) return;
    const v = (prod.variations || []).find(v => v.id === varId);
    if (!v) return;
    Modal.confirm({
      title: 'Remover Variação',
      body: `<p>Remover <strong>${Utils.esc(v.sku)}</strong>?</p>`,
      confirmText: 'Remover', confirmClass: 'btn-danger',
      async onConfirm() {
        prod.variations = prod.variations.filter(x => x.id !== varId);
        save(); renderProducts();
        document.dispatchEvent(new CustomEvent('m2:products:updated'));
        Logger.log(`Removeu variação ${v.sku}`);
        Toast.success('Variação removida.');
      }
    });
  }

  /* ── Preço/kg ── */
  async function savePrice() {
    const val = parseFloat(document.getElementById('m2-price-kg')?.value);
    if (isNaN(val) || val < 0) { Toast.error('Preço inválido.'); return; }
    rawPrice = val;
    save(); renderProducts();
    document.dispatchEvent(new CustomEvent('m2:prices:updated'));
    Logger.log(`Atualizou preço/kg para R$ ${Utils.num(val, 2)}`);
    Toast.success('Preço atualizado e custos recalculados.');
    updateWeightCalc(); // recalcular estimativas
  }

  /* ── Importação XLSX ── */
  async function importXlsx(file) {
    if (!window.XLSX) { Toast.error('Biblioteca XLSX não carregada.'); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });

        let added = 0, updated = 0;
        const skusInFile = new Set();

        rows.forEach(row => {
          const groupName = String(row['Grupo'] || row['grupo'] || '').trim();
          const sku       = String(row['SKU']   || row['sku']   || '').trim();
          const lotWeight = parseFloat(row['PesoLote'] || row['Peso'] || 0);
          if (!groupName || !sku) return;
          skusInFile.add(sku);
          const varData = {
            sku, qty: qtyFromSku(sku), lotWeight,
            width:  parseFloat(row['Largura']     || 0) || 0,
            height: parseFloat(row['Altura']      || 0) || 0,
            length: parseFloat(row['Comprimento'] || 0) || 0,
            micron: String(row['Micragem'] || '').trim()
          };
          let prod = products.find(p => p.name.toLowerCase() === groupName.toLowerCase());
          if (!prod) { prod = { id: Utils.uid(), name: groupName, variations: [] }; products.push(prod); }
          const existingIdx = prod.variations.findIndex(v => v.sku === sku);
          if (existingIdx !== -1) { prod.variations[existingIdx] = { ...prod.variations[existingIdx], ...varData }; updated++; }
          else { prod.variations.push({ id: Utils.uid(), ...varData }); added++; }
        });

        const removedSkus = [];
        products.forEach(prod => {
          prod.variations.forEach(v => {
            if (!skusInFile.has(v.sku)) removedSkus.push({ prodId: prod.id, varId: v.id, sku: v.sku });
          });
        });

        const finalize = async () => {
          save(); renderProducts();
          document.dispatchEvent(new CustomEvent('m2:products:updated'));
          Logger.log(`Importou XLSX: +${added} adicionados, ${updated} atualizados`);
          Toast.success(`Importação: ${added} adicionados, ${updated} atualizados.`);
        };

        if (removedSkus.length > 0) {
          Modal.confirm({
            title: 'Variações ausentes na planilha',
            body: `<p>${removedSkus.length} variação(ões) não encontradas:</p>
                   <ul class="text-sm text-muted mt-2" style="padding-left:16px">
                     ${removedSkus.map(r => `<li>${Utils.esc(r.sku)}</li>`).join('')}
                   </ul>
                   <p class="mt-2">Deseja <strong>remover</strong> estas variações?</p>`,
            confirmText: 'Remover', confirmClass: 'btn-danger',
            async onConfirm() {
              removedSkus.forEach(({ prodId, varId }) => {
                const p = products.find(x => x.id === prodId);
                if (p) p.variations = p.variations.filter(v => v.id !== varId);
              });
              finalize();
            }
          });
          setTimeout(finalize, 100);
        } else { finalize(); }
      } catch (err) {
        console.error(err);
        Toast.error('Erro ao processar o arquivo XLSX.');
      }
    };
    reader.readAsBinaryString(file);
  }

  /* ══════════════════════════════════════════════════════════
     CALCULADORA DE PESO ESTIMADO
     ══════════════════════════════════════════════════════════ */

  // Estado da calculadora
  let _calcW  = 20;   // largura cm
  let _calcC  = 30;   // comprimento cm
  let _calcM  = 0.035; // micragem mm
  let _calcTipo = 'Envelope'; // Envelope | Saco

  // Formula: largura × comprimento × (micragem/10) × 0.92 × 2 camadas → gramas
  function calcEstimatedWeight(w, c, m) {
    return w * c * (m / 10) * 0.92 * 2; // gramas
  }

  function updateWeightCalc() {
    const w = parseFloat(document.getElementById('m2-calc-w')?.value) || _calcW;
    const c = parseFloat(document.getElementById('m2-calc-c')?.value) || _calcC;
    const m = parseFloat(document.getElementById('m2-calc-m')?.value) || _calcM;
    _calcW = w; _calcC = c; _calcM = m;
    const prevTipo = _calcTipo;
    _calcTipo = document.getElementById('m2-calc-tipo')?.value || _calcTipo;
    // Auto-preenche micron padrão quando o tipo muda
    if (_calcTipo !== prevTipo) {
      const defaultMicron = _calcTipo === 'Envelope' ? 0.035 : 0.03;
      const micEl = document.getElementById('m2-calc-m');
      if (micEl) { micEl.value = defaultMicron; _calcM = defaultMicron; }
    }

    const pesoG  = calcEstimatedWeight(w, c, m);
    const pesoKg = pesoG / 1000;
    const custPratik = pesoKg * rawPrice * 2;
    const custUnit   = rawPrice * pesoKg;

    const elPeso = document.getElementById('m2-calc-result-peso');
    if (elPeso) elPeso.textContent = `${Utils.num(pesoG, 2)} g (${Utils.num(pesoKg, 4)} kg)`;

    const elCusto = document.getElementById('m2-calc-result-custo');
    if (elCusto) {
      if (Auth.isMaster()) {
        elCusto.textContent = `Custo unit.: ${Utils.brl(custUnit)} | Pratik: ${Utils.brl(custPratik)}`;
        elCusto.closest('.m2-calc-cost-row')?.classList.remove('hidden');
      } else {
        elCusto.closest('.m2-calc-cost-row')?.classList.add('hidden');
      }
    }

    draw2D(w, c, m);
  }

  /* ══════════════════════════════════════════════════════════
     VISUALIZAÇÃO 2D INTERATIVA
     ══════════════════════════════════════════════════════════ */

  let _canvas   = null;
  let _ctx      = null;
  let _dragging = null;
  let _dragStartX = 0;
  let _dragStartY = 0;
  let _dragStartW = 0;
  let _dragStartC = 0;
  let _dragFixedScale = 1;   // escala capturada no início do drag — não muda durante
  let _rightHandleX = 0, _rightHandleY = 0;
  let _bottomHandleX = 0, _bottomHandleY = 0;

  const PAD = 40;

  function initCanvas() {
    _canvas = document.getElementById('m2-canvas-2d');
    if (!_canvas) return;
    _ctx = _canvas.getContext('2d');
    _canvas.addEventListener('mousedown',  onCanvasMouseDown);
    _canvas.addEventListener('mousemove',  onCanvasMouseMove);
    _canvas.addEventListener('mouseup',    onCanvasMouseUp);
    _canvas.addEventListener('mouseleave', onCanvasMouseUp);
    // Touch
    _canvas.addEventListener('touchstart', e => { e.preventDefault(); onCanvasMouseDown(e.touches[0]); }, { passive: false });
    _canvas.addEventListener('touchmove',  e => { e.preventDefault(); onCanvasMouseMove(e.touches[0]); }, { passive: false });
    _canvas.addEventListener('touchend',   onCanvasMouseUp);
  }

  function _shapeScale(w, c) {
    // Escala proporcional: usa a menor razão para que ambas as dimensões caibam
    // O limite máximo (8px/cm) evita que objetos muito pequenos fiquem gigantes
    const maxW = _canvas.width  - PAD * 2;
    const maxH = _canvas.height - PAD * 2 - 30; // 30px reservados para labels
    return Math.min(maxW / w, maxH / c, 8);
  }

  /* ── Saco de Lixo — visual realista (saco preto amassado) ── */
  function _drawSaco(ctx, rx, ry, rw, rh) {
    ctx.save();
    const rad = Math.min(rw, rh) * 0.05;

    // Corpo principal do saco
    const grd = ctx.createLinearGradient(rx, ry, rx + rw, ry + rh);
    grd.addColorStop(0,   '#252525');
    grd.addColorStop(0.4, '#1a1a1a');
    grd.addColorStop(1,   '#111111');
    ctx.fillStyle = grd;
    ctx.strokeStyle = '#3a3a3a';
    ctx.lineWidth = 1.5;
    ctx.shadowBlur = 12; ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.beginPath();
    ctx.moveTo(rx + rad, ry);
    ctx.lineTo(rx + rw - rad, ry);
    ctx.quadraticCurveTo(rx + rw, ry,       rx + rw, ry + rad);
    ctx.lineTo(rx + rw, ry + rh - rad);
    ctx.quadraticCurveTo(rx + rw, ry + rh,  rx + rw - rad, ry + rh);
    ctx.lineTo(rx + rad, ry + rh);
    ctx.quadraticCurveTo(rx, ry + rh,        rx, ry + rh - rad);
    ctx.lineTo(rx, ry + rad);
    ctx.quadraticCurveTo(rx, ry,             rx + rad, ry);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.stroke();

    // Rugas / dobras do plástico
    ctx.strokeStyle = '#2e2e2e';
    ctx.lineWidth = 0.7;
    ctx.globalAlpha = 0.7;
    const wrinkles = [
      [0.08,0.12, 0.38,0.32, 0.14,0.22],
      [0.04,0.42, 0.42,0.62, 0.10,0.50],
      [0.12,0.68, 0.48,0.85, 0.22,0.75],
      [0.58,0.08, 0.88,0.28, 0.68,0.16],
      [0.52,0.38, 0.82,0.58, 0.60,0.46],
      [0.62,0.65, 0.94,0.88, 0.72,0.74],
      [0.22,0.25, 0.65,0.45, 0.40,0.32],
      [0.28,0.55, 0.72,0.72, 0.46,0.60],
      [0.10,0.78, 0.38,0.90, 0.20,0.82],
    ];
    wrinkles.forEach(([x1,y1,x2,y2,cx,cy]) => {
      ctx.beginPath();
      ctx.moveTo(rx + x1*rw, ry + y1*rh);
      ctx.quadraticCurveTo(rx + cx*rw, ry + cy*rh, rx + x2*rw, ry + y2*rh);
      ctx.stroke();
    });
    ctx.globalAlpha = 1;

    // Brilho sutil no canto superior esquerdo
    const grdShine = ctx.createRadialGradient(rx+rw*0.2, ry+rh*0.15, 0, rx+rw*0.2, ry+rh*0.15, rw*0.4);
    grdShine.addColorStop(0,   'rgba(255,255,255,0.06)');
    grdShine.addColorStop(1,   'rgba(255,255,255,0)');
    ctx.fillStyle = grdShine;
    ctx.beginPath(); ctx.rect(rx, ry, rw, rh); ctx.fill();

    ctx.restore();
  }

  /* ── Envelope de Segurança — visual realista (mailer escuro c/ tarja azul) ── */
  function _drawEnvelope(ctx, rx, ry, rw, rh) {
    ctx.save();

    // Corpo principal
    const grd = ctx.createLinearGradient(rx, ry, rx + rw, ry + rh);
    grd.addColorStop(0, '#30384a');
    grd.addColorStop(1, '#252d3a');
    ctx.fillStyle = grd;
    ctx.strokeStyle = '#4a5568';
    ctx.lineWidth = 2;
    ctx.shadowBlur = 8; ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.beginPath(); ctx.rect(rx, ry, rw, rh); ctx.fill();
    ctx.shadowBlur = 0; ctx.stroke();

    // Tarjas de segurança no topo (3 faixas)
    const stripeH = Math.max(10, rh * 0.09);
    const stripes = [
      { color: '#5bc8d8', h: stripeH * 0.33 },
      { color: '#1e3a5f', h: stripeH * 0.34 },
      { color: '#4db8c8', h: stripeH * 0.33 },
    ];
    let sy = ry + 2;
    stripes.forEach(s => {
      ctx.fillStyle = s.color;
      ctx.fillRect(rx + 2, sy, rw - 4, s.h);
      sy += s.h;
    });

    // Linha de picote (separação faixa / corpo)
    ctx.strokeStyle = '#4a5568';
    ctx.lineWidth = 0.5;
    ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(rx + 2, ry + stripeH + 2); ctx.lineTo(rx + rw - 2, ry + stripeH + 2); ctx.stroke();
    ctx.setLineDash([]);

    // Reflexo sutil na superfície
    const shine = ctx.createLinearGradient(rx, ry, rx, ry + rh * 0.4);
    shine.addColorStop(0,   'rgba(255,255,255,0.04)');
    shine.addColorStop(1,   'rgba(255,255,255,0)');
    ctx.fillStyle = shine;
    ctx.fillRect(rx, ry, rw, rh * 0.4);

    ctx.restore();
  }

  function draw2D(w, c, m) {
    if (!_canvas || !_ctx) return;
    const ctx = _ctx;
    const CW = _canvas.width, CH = _canvas.height;
    ctx.clearRect(0, 0, CW, CH);

    // Grade de fundo
    const borderColor = getComputedStyle(document.documentElement).getPropertyValue('--border') || '#334155';
    ctx.strokeStyle = borderColor; ctx.lineWidth = 0.5;
    for (let x = 0; x < CW; x += 20) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,CH); ctx.stroke(); }
    for (let y = 0; y < CH; y += 20) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(CW,y); ctx.stroke(); }

    const sc = _shapeScale(w, c);
    const rw = w * sc;
    const rh = c * sc;
    const rx = (CW - rw) / 2;
    const ry = (CH - rh) / 2 + 8;
    const isSaco = _calcTipo !== 'Envelope';

    // Desenha o produto selecionado
    if (isSaco) _drawSaco(ctx, rx, ry, rw, rh);
    else        _drawEnvelope(ctx, rx, ry, rw, rh);

    // Alças de arrastar
    const handleColor = isSaco ? '#f97316' : '#2dd4bf';
    ctx.fillStyle = handleColor;
    ctx.shadowBlur = 4; ctx.shadowColor = handleColor + '66';
    _rightHandleX = rx + rw; _rightHandleY = ry + rh / 2;
    ctx.beginPath(); ctx.arc(_rightHandleX, _rightHandleY, 5, 0, Math.PI*2); ctx.fill();
    _bottomHandleX = rx + rw / 2; _bottomHandleY = ry + rh;
    ctx.beginPath(); ctx.arc(_bottomHandleX, _bottomHandleY, 5, 0, Math.PI*2); ctx.fill();
    ctx.shadowBlur = 0; ctx.shadowColor = 'transparent';

    // Labels de dimensão
    const accent = isSaco ? '#f97316' : '#2dd4bf';
    ctx.fillStyle = accent;
    ctx.font = 'bold 11px DM Mono, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${Utils.num(w, 1)} cm`, rx + rw / 2, ry - 10);
    ctx.save();
    ctx.translate(rx - 10, ry + rh / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.fillText(`${Utils.num(c, 1)} cm`, 0, 0);
    ctx.restore();

    // Info central (peso + micragem)
    const pesoG = calcEstimatedWeight(w, c, m);
    const textColor = getComputedStyle(document.documentElement).getPropertyValue('--text') || '#e2e8f0';
    ctx.fillStyle = textColor;
    ctx.font = 'bold 12px DM Mono, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${Utils.num(pesoG, 1)} g / un`, rx + rw / 2, ry + rh / 2 - 6);
    ctx.fillStyle = accent + 'cc';
    ctx.font = '10px DM Mono, monospace';
    ctx.fillText(`${Utils.num(m, 3)} mm`, rx + rw / 2, ry + rh / 2 + 10);
  }

  function getHandleArea(x, y) {
    const d = 14;
    if (Math.abs(x - _rightHandleX)  < d && Math.abs(y - _rightHandleY)  < d) return 'right';
    if (Math.abs(x - _bottomHandleX) < d && Math.abs(y - _bottomHandleY) < d) return 'bottom';
    return null;
  }

  function getCanvasPos(e) {
    const rect = _canvas.getBoundingClientRect();
    const sx = _canvas.width  / rect.width;
    const sy = _canvas.height / rect.height;
    return { x: (e.clientX - rect.left) * sx, y: (e.clientY - rect.top) * sy };
  }

  function onCanvasMouseDown(e) {
    if (!_canvas) return;
    const { x, y } = getCanvasPos(e);
    const area = getHandleArea(x, y);
    if (area) {
      _dragging = area;
      _dragStartX = x; _dragStartY = y;
      _dragStartW = _calcW; _dragStartC = _calcC;
      _dragFixedScale = _shapeScale(_calcW, _calcC); // escala fixa para este drag
      _canvas.style.cursor = area === 'right' ? 'ew-resize' : 'ns-resize';
    }
  }

  function onCanvasMouseMove(e) {
    if (!_canvas) return;
    const { x, y } = getCanvasPos(e);

    if (!_dragging) {
      const area = getHandleArea(x, y);
      _canvas.style.cursor = area === 'right' ? 'ew-resize' : area === 'bottom' ? 'ns-resize' : 'default';
      return;
    }

    const sc = _dragFixedScale; // usa escala fixa do início do drag
    if (_dragging === 'right') {
      const delta = (x - _dragStartX) / sc;
      _calcW = Math.max(1, Math.round((_dragStartW + delta) * 10) / 10);
      const inp = document.getElementById('m2-calc-w');
      if (inp) inp.value = _calcW;
    } else {
      const delta = (y - _dragStartY) / sc;
      _calcC = Math.max(1, Math.round((_dragStartC + delta) * 10) / 10);
      const inp = document.getElementById('m2-calc-c');
      if (inp) inp.value = _calcC;
    }
    updateWeightCalc();
  }

  function onCanvasMouseUp() {
    _dragging = null;
    if (_canvas) _canvas.style.cursor = 'default';
  }

  /* ── API para outros módulos ── */
  function getProducts()    { return [...products]; }
  function getRawPrice()    { return rawPrice; }
  function getVariationCost(varId) {
    for (const prod of products) {
      const v = (prod.variations || []).find(v => v.id === varId);
      if (v) return calcVariationCosts(v).unitReal;
    }
    return 0;
  }
  function getFlatVariations() {
    const result = [];
    products.forEach(prod => {
      (prod.variations || []).forEach(v => {
        const costs = calcVariationCosts(v);
        result.push({
          id: v.id, sku: v.sku, groupName: prod.name, groupId: prod.id,
          qty: v.qty, lotWeight: v.lotWeight, type: typeFromSku(v.sku),
          unitCost: costs.unitReal, pratik: costs.pratik, loteCost: costs.lotCost,
        });
      });
    });
    return result;
  }

  /* ── Seed ── */
  async function seedIfEmpty() {
    if (Storage.getSync(_SEED_KEY)) return;
    if (products.length > 0) { Storage.setSync(_SEED_KEY, true); return; }
    rawPrice = _DEFAULT_PRICE;
    products = _DEFAULT_PRODUCTS.map(group => ({
      id: Utils.uid(), name: group.name,
      variations: group.variations.map(v => ({ id: Utils.uid(), ...v }))
    }));
    save(); Storage.setSync(_SEED_KEY, true);
    renderPrice(); renderProducts();
    document.dispatchEvent(new CustomEvent('m2:products:updated'));
    Toast.info('Produtos padrão carregados. Preço/kg: R$ 9,85.');
  }

  /* ── Init ── */
  async function init() {
    load();

    document.getElementById('m2-save-price-btn')?.addEventListener('click', savePrice);
    document.getElementById('m2-add-group-btn')?.addEventListener('click', openAddGroup);
    document.getElementById('m2-save-group-btn')?.addEventListener('click', saveGroup);
    document.getElementById('m2-cancel-group-btn')?.addEventListener('click', closeGroupModal);
    document.getElementById('m2-save-var-btn')?.addEventListener('click', saveVariation);
    document.getElementById('m2-cancel-var-btn')?.addEventListener('click', closeVariationModal);
    document.getElementById('m2-var-sku')?.addEventListener('input', onSkuInput);

    // XLSX
    const xlsxInput = document.getElementById('m2-xlsx-input');
    if (xlsxInput) xlsxInput.addEventListener('change', e => { if (e.target.files[0]) importXlsx(e.target.files[0]); e.target.value = ''; });
    document.getElementById('m2-xlsx-btn')?.addEventListener('click', () => xlsxInput?.click());

    // Calculadora de peso
    ['m2-calc-w', 'm2-calc-c', 'm2-calc-m'].forEach(id => {
      document.getElementById(id)?.addEventListener('input', updateWeightCalc);
    });
    document.getElementById('m2-calc-tipo')?.addEventListener('change', updateWeightCalc);

    renderPrice(); renderProducts(); renderSalesTable(); seedIfEmpty();

    // Canvas 2D
    initCanvas();
    updateWeightCalc();

    document.addEventListener('route:change', async (e) => {
      if (e.detail.route !== 'm2') return;
      load(); renderPrice(); renderProducts(); renderSalesTable();
      updateWeightCalc();
    });
  }

  return {
    init, savePrice,
    openAddGroup, editGroup, closeGroupModal, saveGroup, removeGroup,
    openAddVariation, editVariation, closeVariationModal, saveVariation, removeVariation,
    toggleGroup, toggleVarDetails, onSkuInput,
    getProducts, getRawPrice, getVariationCost, getFlatVariations,
    updateWeightCalc,
  };

})();
window.M2 = M2;
