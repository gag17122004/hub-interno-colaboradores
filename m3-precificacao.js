/**
 * m3-precificacao.js — Módulo 3: Precificação e Lucro Líquido (v2)
 * Agora trabalha com variações do M2 (getFlatVariations).
 */

const M3 = (() => {

  const $ = (id) => document.getElementById(id);

  /* ── Estado ────────────────────────────────────────────── */
  let pricing  = {};
  let mktFees  = {
    shopee: { commission: 14, fixed: 0 },
    ml:     { commission: 12, fixed: 5 },
  };
  let activeVariationId = null;
  let variations = [];

  /* ── Persistência ──────────────────────────────────────── */
  function save() {
    Storage.set(Storage.KEYS.PRICING,  pricing);
    Storage.set(Storage.KEYS.MKT_FEES, mktFees);
  }

  function load() {
    pricing  = Storage.get(Storage.KEYS.PRICING,  {});
    mktFees  = Storage.get(Storage.KEYS.MKT_FEES, {
      shopee: { commission: 14, fixed: 0 },
      ml:     { commission: 12, fixed: 5 },
    });
  }

  /* ── Helpers ───────────────────────────────────────────── */
  function calcProfit(sellPrice, unitCost, qty, fees) {
    const totalRevenue = sellPrice * qty;
    const totalCost    = unitCost  * qty;
    const commission   = totalRevenue * (Number(fees.commission) / 100);
    const fixed        = Number(fees.fixed);
    const net          = totalRevenue - totalCost - commission - fixed;
    const pct          = totalRevenue > 0 ? (net / totalRevenue) * 100 : 0;
    return { net, pct, breakdown: { totalRevenue, totalCost, commission, fixed } };
  }

  /* ── Renderização ──────────────────────────────────────── */

  function renderFees() {
    if (!$('m3-shopee-commission')) return;
    $('m3-shopee-commission').value = mktFees.shopee.commission;
    $('m3-shopee-fixed').value      = mktFees.shopee.fixed;
    $('m3-ml-commission').value     = mktFees.ml.commission;
    $('m3-ml-fixed').value          = mktFees.ml.fixed;
  }

  function renderProductList() {
    const list = $('m3-product-list');
    if (!list) return;

    variations = M2.getFlatVariations();

    if (variations.length === 0) {
      list.innerHTML = `<div class="empty-state" style="padding:16px">
        <i class="fa-solid fa-box-open"></i>
        <p>Cadastre produtos no Módulo 2</p>
      </div>`;
      return;
    }

    // Agrupar por groupName
    const groups = {};
    variations.forEach(v => {
      if (!groups[v.groupId]) groups[v.groupId] = { name: v.groupName, vars: [] };
      groups[v.groupId].vars.push(v);
    });

    list.innerHTML = Object.values(groups).map(g => {
      const varItems = g.vars.map(v => {
        const isActive = activeVariationId === v.id;
        return `
          <div class="m3-prod-item ${isActive ? 'active' : ''}" style="padding-left:28px"
               onclick="M3.selectVariation('${v.id}')">
            <div>
              <div style="font-size:13px;font-weight:600;font-family:'DM Mono',monospace">${Utils.esc(v.sku)}</div>
              <div class="text-xs text-muted mt-1">${v.qty} un · custo ${Utils.brl(v.unitCost)}</div>
            </div>
            <i class="fa-solid fa-chevron-right" style="font-size:11px;color:var(--text-sec)"></i>
          </div>`;
      }).join('');
      return `
        <div style="margin-bottom:8px">
          <div style="padding:8px 12px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--text-sec)">
            ${Utils.esc(g.name)}
          </div>
          ${varItems}
        </div>`;
    }).join('');
  }

  function renderPricingPanel() {
    const panel      = $('m3-pricing-panel');
    const emptyState = $('m3-empty');
    if (!panel || !emptyState) return;

    if (!activeVariationId) {
      panel.classList.add('hidden');
      emptyState.classList.remove('hidden');
      return;
    }

    panel.classList.remove('hidden');
    emptyState.classList.add('hidden');

    const v = variations.find(x => x.id === activeVariationId);
    if (!v) return;

    $('m3-prod-title').textContent = `${v.groupName} — ${v.sku}`;
    $('m3-unit-cost').textContent  = Utils.brl(v.unitCost);

    const pd = pricing[activeVariationId] || { sell_price: 0, sell_qty: 1 };
    $('m3-sell-price').value = pd.sell_price || '';
    $('m3-sell-qty').value   = pd.sell_qty   || 1;

    calcAndRender();
  }

  function calcAndRender() {
    if (!activeVariationId) return;
    const v = variations.find(x => x.id === activeVariationId);
    if (!v) return;

    const unitCost  = M2.getVariationCost(activeVariationId);
    const sellPrice = parseFloat($('m3-sell-price')?.value) || 0;
    const qty       = parseInt($('m3-sell-qty')?.value)     || 1;

    renderProfitCard('shopee', calcProfit(sellPrice, unitCost, qty, mktFees.shopee));
    renderProfitCard('ml',     calcProfit(sellPrice, unitCost, qty, mktFees.ml));
  }

  function renderProfitCard(marketplace, result) {
    const prefix = `m3-${marketplace}`;
    const valEl = $(`${prefix}-net`);
    const pctEl = $(`${prefix}-pct`);
    const bkEl  = $(`${prefix}-breakdown`);
    if (!valEl) return;

    const pos = result.net >= 0;
    valEl.textContent = Utils.brl(result.net);
    valEl.className   = `profit-value ${pos ? 'positive' : 'negative'}`;
    pctEl.textContent = `${Utils.num(result.pct, 2)}% de margem`;
    pctEl.className   = `profit-pct ${pos ? 'positive' : 'negative'}`;

    if (bkEl) {
      const bk = result.breakdown;
      bkEl.innerHTML = `
        Receita total: <span>${Utils.brl(bk.totalRevenue)}</span><br>
        Custo total:   <span>- ${Utils.brl(bk.totalCost)}</span><br>
        Comissão:      <span>- ${Utils.brl(bk.commission)}</span><br>
        Taxa fixa:     <span>- ${Utils.brl(bk.fixed)}</span>
      `;
    }
  }

  /* ── Ações ─────────────────────────────────────────────── */

  function saveFees() {
    const g = (id) => parseFloat($(id)?.value) || 0;
    mktFees = {
      shopee: { commission: g('m3-shopee-commission'), fixed: g('m3-shopee-fixed') },
      ml:     { commission: g('m3-ml-commission'),     fixed: g('m3-ml-fixed') },
    };
    save();
    calcAndRender();
    Toast.success('Taxas dos marketplaces salvas.');
  }

  function selectVariation(id) {
    activeVariationId = id;
    renderProductList();
    renderPricingPanel();
  }

  function savePricingInputs() {
    if (!activeVariationId) return;
    const sellPrice = parseFloat($('m3-sell-price')?.value) || 0;
    const sellQty   = parseInt($('m3-sell-qty')?.value)     || 1;
    pricing[activeVariationId] = { sell_price: sellPrice, sell_qty: sellQty };
    save();
    calcAndRender();
  }

  /* ── Inicialização ─────────────────────────────────────── */
  function init() {
    load();

    const saveFeesBtn = $('m3-save-fees-btn');
    if (saveFeesBtn) saveFeesBtn.addEventListener('click', saveFees);

    ['m3-sell-price', 'm3-sell-qty'].forEach(id => {
      const el = $(id);
      if (el) el.addEventListener('input', savePricingInputs);
    });

    document.addEventListener('m2:prices:updated',   () => {
      variations = M2.getFlatVariations();
      calcAndRender();
    });
    document.addEventListener('m2:products:updated', () => {
      variations = M2.getFlatVariations();
      renderProductList();
      if (activeVariationId && !variations.find(v => v.id === activeVariationId)) {
        activeVariationId = null;
      }
      renderPricingPanel();
    });
    document.addEventListener('route:change', (e) => {
      if (e.detail.route === 'm3') {
        load();
        variations = M2.getFlatVariations();
        renderFees();
        renderProductList();
        renderPricingPanel();
      }
    });

    renderFees();
  }

  return { init, selectVariation, saveFees, savePricingInputs, calcAndRender };

})();
