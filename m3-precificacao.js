/**
 * m3-precificacao.js — Módulo 3: Precificação e Lucro Líquido (v3)
 * Marketplaces: Shein 18%, ML 26%, Shopee 23%, TikTok 12%
 * Fórmula: Revenue - custo - comissão_plataforma - 5%_operacional - frete
 */

const M3 = (() => {

  const $ = (id) => document.getElementById(id);

  /* ── Estado ────────────────────────────────────────────── */
  let pricing  = {};
  let mktFees  = {
    shein:  { commission: 18 },
    ml:     { commission: 26 },
    shopee: { commission: 23 },
    tiktok: { commission: 12 },
  };
  let activeVariationId = null;
  let variations = [];

  /* ── Persistência ──────────────────────────────────────── */
  async function save() {
    await Storage.set(Storage.KEYS.PRICING,  pricing);
    await Storage.set(Storage.KEYS.MKT_FEES, mktFees);
  }

  async function load() {
    pricing = await Storage.get(Storage.KEYS.PRICING, {});
    const stored = await Storage.get(Storage.KEYS.MKT_FEES, null);
    if (stored && stored.shein) {
      mktFees = stored;
    } else if (stored && stored.shopee && !stored.shein) {
      // migrar formato antigo (Shopee/ML com fixed) para novo
      mktFees = {
        shein:  { commission: 18 },
        ml:     { commission: stored.ml?.commission ?? 26 },
        shopee: { commission: stored.shopee?.commission ?? 23 },
        tiktok: { commission: 12 },
      };
    }
  }

  /* ── Helpers ───────────────────────────────────────────── */
  /**
   * @param {number} sellPrice  preço de venda unitário
   * @param {number} unitCost   custo unitário real
   * @param {number} qty        quantidade por venda
   * @param {number} commission comissão da plataforma (%)
   * @param {number} freight    frete (R$, opcional)
   */
  function calcProfit(sellPrice, unitCost, qty, commission, freight) {
    const totalRevenue  = sellPrice * qty;
    const totalCost     = unitCost  * qty;
    const commissionAmt = totalRevenue * (Number(commission) / 100);
    const operational   = totalRevenue * 0.05;
    const freightAmt    = Number(freight || 0);
    const net           = totalRevenue - totalCost - commissionAmt - operational - freightAmt;
    const pct           = totalRevenue > 0 ? (net / totalRevenue) * 100 : 0;
    return { net, pct, breakdown: { totalRevenue, totalCost, commissionAmt, operational, freightAmt } };
  }

  /* ── Renderização ──────────────────────────────────────── */

  function renderFees() {
    if (!$('m3-shein-commission')) return;
    $('m3-shein-commission').value  = mktFees.shein.commission;
    $('m3-ml-commission').value     = mktFees.ml.commission;
    $('m3-shopee-commission').value = mktFees.shopee.commission;
    $('m3-tiktok-commission').value = mktFees.tiktok.commission;
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

    const pd = pricing[activeVariationId] || { sell_price: 0, sell_qty: 1, freight: 0 };
    $('m3-sell-price').value = pd.sell_price || '';
    $('m3-sell-qty').value   = pd.sell_qty   || 1;
    if ($('m3-freight')) $('m3-freight').value = pd.freight || '';

    calcAndRender();
  }

  function calcAndRender() {
    if (!activeVariationId) return;
    const v = variations.find(x => x.id === activeVariationId);
    if (!v) return;

    const unitCost  = M2.getVariationCost(activeVariationId);
    const sellPrice = parseFloat($('m3-sell-price')?.value) || 0;
    const qty       = parseInt($('m3-sell-qty')?.value)     || 1;
    const freight   = parseFloat($('m3-freight')?.value)    || 0;

    renderProfitCard('shein',  calcProfit(sellPrice, unitCost, qty, mktFees.shein.commission,  freight));
    renderProfitCard('ml',     calcProfit(sellPrice, unitCost, qty, mktFees.ml.commission,     freight));
    renderProfitCard('shopee', calcProfit(sellPrice, unitCost, qty, mktFees.shopee.commission, freight));
    renderProfitCard('tiktok', calcProfit(sellPrice, unitCost, qty, mktFees.tiktok.commission, freight));
  }

  function renderProfitCard(marketplace, result) {
    const prefix = `m3-${marketplace}`;
    const valEl  = $(`${prefix}-net`);
    const pctEl  = $(`${prefix}-pct`);
    const bkEl   = $(`${prefix}-breakdown`);
    if (!valEl) return;

    const pos = result.net >= 0;
    valEl.textContent = Utils.brl(result.net);
    valEl.className   = `profit-value ${pos ? 'positive' : 'negative'}`;
    pctEl.textContent = `${Utils.num(result.pct, 2)}% de margem`;
    pctEl.className   = `profit-pct ${pos ? 'positive' : 'negative'}`;

    if (bkEl) {
      const bk = result.breakdown;
      bkEl.innerHTML = `
        Receita total:    <span>${Utils.brl(bk.totalRevenue)}</span><br>
        Custo produto:    <span>- ${Utils.brl(bk.totalCost)}</span><br>
        Comissão:         <span>- ${Utils.brl(bk.commissionAmt)}</span><br>
        5% Operacional:   <span>- ${Utils.brl(bk.operational)}</span><br>
        Frete:            <span>- ${Utils.brl(bk.freightAmt)}</span>
      `;
    }
  }

  /* ── Ações ─────────────────────────────────────────────── */

  async function saveFees() {
    const g = (id) => parseFloat($(id)?.value) || 0;
    mktFees = {
      shein:  { commission: g('m3-shein-commission')  },
      ml:     { commission: g('m3-ml-commission')     },
      shopee: { commission: g('m3-shopee-commission') },
      tiktok: { commission: g('m3-tiktok-commission') },
    };
    await save();
    calcAndRender();
    Toast.success('Taxas dos marketplaces salvas.');
  }

  function selectVariation(id) {
    activeVariationId = id;
    renderProductList();
    renderPricingPanel();
  }

  async function savePricingInputs() {
    if (!activeVariationId) return;
    const sellPrice = parseFloat($('m3-sell-price')?.value) || 0;
    const sellQty   = parseInt($('m3-sell-qty')?.value)     || 1;
    const freight   = parseFloat($('m3-freight')?.value)    || 0;
    pricing[activeVariationId] = { sell_price: sellPrice, sell_qty: sellQty, freight };
    await save();
    calcAndRender();
  }

  /* ── Inicialização ─────────────────────────────────────── */
  async function init() {
    await load();

    const saveFeesBtn = $('m3-save-fees-btn');
    if (saveFeesBtn) saveFeesBtn.addEventListener('click', saveFees);

    ['m3-sell-price', 'm3-sell-qty', 'm3-freight'].forEach(id => {
      const el = $(id);
      if (el) el.addEventListener('input', savePricingInputs);
    });

    document.addEventListener('m2:prices:updated', () => {
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
    document.addEventListener('route:change', async (e) => {
      if (e.detail.route === 'm3') {
        await load();
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