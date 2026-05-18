/**
 * m8-orcamentos.js — Orçamentos
 * Clientes + catálogo M2 + margem (R$ ou %) + PDF + histórico
 */
const M8 = (() => {
  const CLIENTS_KEY = 'hub_clients';
  const QUOTES_KEY  = 'hub_quotes';
  const $ = id => document.getElementById(id);

  let clients = [];
  let quotes  = [];
  let selectedClient = null;
  let quoteItems = [];
  let editingQuoteId = null;

  function save() {
    Storage.setSync(CLIENTS_KEY, clients);
    Storage.setSync(QUOTES_KEY,  quotes);
  }
  function load() {
    clients = Storage.getSync(CLIENTS_KEY, []);
    quotes  = Storage.getSync(QUOTES_KEY,  []);
  }

  function getPriceKg() {
    const stored = Storage.getSync('hub_raw_prices', {});
    return stored.single ?? stored.coex ?? stored.pebd ?? 0;
  }

  function getAllVariations() {
    const products = Storage.getSync(Storage.KEYS.PRODUCTS, []);
    const vars = [];
    products.forEach(g => {
      (g.variations || []).forEach(v => {
        vars.push({
          prodId:    v.id,
          groupName: g.name,
          sku:       v.sku || '',
          lotWeight: Number(v.lotWeight) || 0,
          qty:       Number(v.qty) || 1,
        });
      });
    });
    return vars;
  }

  function calcUnitCostPratik(v) {
    return (v.lotWeight * getPriceKg() * 2) / (v.qty || 1);
  }

  /* ── Clientes ── */
  function renderClients() {
    const list = $('m8-client-list');
    if (!list) return;
    const q = ($('m8-client-search')?.value || '').toLowerCase();
    const filtered = clients.filter(c =>
      c.name.toLowerCase().includes(q) || (c.phone || '').includes(q) || (c.whatsapp || '').includes(q)
    );
    if (filtered.length === 0) {
      list.innerHTML = `<div class="empty-state" style="padding:20px"><p>Nenhum cliente encontrado.</p></div>`;
      return;
    }
    list.innerHTML = filtered.map(c => `
      <div class="m1-emp-item ${selectedClient?.id === c.id ? 'active' : ''}"
           onclick="M8.selectClient('${c.id}')">
        <div class="m1-emp-avatar" style="background:var(--indigo)">${Utils.esc(c.name.charAt(0).toUpperCase())}</div>
        <div class="m1-emp-info" style="flex:1;min-width:0">
          <div class="m1-emp-name">${Utils.esc(c.name)}</div>
          <div class="m1-emp-bal text-muted">${Utils.esc(c.phone || c.whatsapp || '—')}</div>
        </div>
        <div class="flex gap-1" onclick="event.stopPropagation()">
          <button class="btn btn-xs btn-ghost btn-icon" title="Editar" onclick="M8.editClient('${c.id}')"><i class="fa-solid fa-pen" style="font-size:10px"></i></button>
          <button class="btn btn-xs btn-ghost btn-icon" title="Remover" onclick="M8.deleteClient('${c.id}')"><i class="fa-solid fa-xmark" style="font-size:10px"></i></button>
        </div>
      </div>`).join('');
  }

  function selectClient(id) {
    selectedClient = clients.find(c => c.id === id) || null;
    renderClients();
    renderClientPanel();
  }

  function renderClientPanel() {
    $('m8-no-client')?.classList.toggle('hidden', !!selectedClient);
    $('m8-client-panel')?.classList.toggle('hidden', !selectedClient);
    if (!selectedClient) return;

    $('m8-client-name-display').textContent     = selectedClient.name;
    $('m8-client-phone-display').textContent    = selectedClient.phone    || '—';
    $('m8-client-email-display').textContent    = selectedClient.email    || '—';
    $('m8-client-whatsapp-display').textContent = selectedClient.whatsapp || '—';
    $('m8-client-notes-display').textContent    = selectedClient.notes    || '—';

    renderQuoteHistory();
    renderProductPicker();
    quoteItems = [];
    editingQuoteId = null;
    renderQuoteItemsList();
    recalcTotals();
    if ($('m8-quote-notes')) $('m8-quote-notes').value = '';
    if ($('m8-discount'))    $('m8-discount').value    = '';
  }

  /* ── Histórico de orçamentos ── */
  function renderQuoteHistory() {
    const tbody = $('m8-quotes-tbody');
    if (!tbody || !selectedClient) return;
    const myQuotes = quotes
      .filter(q => q.clientId === selectedClient.id)
      .sort((a, b) => b.date.localeCompare(a.date));

    if (myQuotes.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" class="empty-state"><p>Nenhum orçamento.</p></td></tr>`;
      return;
    }
    tbody.innerHTML = myQuotes.map(q => `
      <tr>
        <td class="font-mono text-xs">${Utils.fmtDate(q.date)}</td>
        <td class="text-xs">${q.items.length} item(ns)</td>
        <td class="font-mono font-bold text-accent">${Utils.brl(q.grandTotal)}</td>
        <td>
          <div class="flex gap-1">
            <button class="btn btn-xs btn-secondary" onclick="M8.printQuote('${q.id}')" title="Imprimir PDF">
              <i class="fa-solid fa-print"></i>
            </button>
            <button class="btn btn-xs btn-danger" onclick="M8.removeQuote('${q.id}')">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </td>
      </tr>`).join('');
  }

  /* ── Builder de orçamento ── */
  function renderProductPicker() {
    const sel = $('m8-prod-picker');
    if (!sel) return;
    const vars = getAllVariations();
    if (vars.length === 0) {
      sel.innerHTML = `<option value="">Nenhum produto cadastrado no M2</option>`;
      return;
    }
    sel.innerHTML = `<option value="">Selecione um produto...</option>` +
      vars.map(v => `<option value="${Utils.esc(v.prodId)}">${Utils.esc(v.groupName)} — ${Utils.esc(v.sku)}</option>`).join('');
  }

  function addItem() {
    const sel = $('m8-prod-picker');
    if (!sel?.value) { Toast.error('Selecione um produto.'); return; }
    const vars = getAllVariations();
    const v = vars.find(x => x.prodId === sel.value);
    if (!v) return;
    const unitCostPratik = calcUnitCostPratik(v);
    const marginVal = 30;
    const unitPrice = unitCostPratik * 1.3;
    quoteItems.push({
      _id: Utils.uid(),
      prodId: v.prodId,
      prodName: `${v.groupName}${v.sku ? ' — ' + v.sku : ''}`,
      unitCostPratik,
      qty: 1,
      marginType: 'pct',
      marginVal,
      unitPrice,
      total: unitPrice
    });
    sel.value = '';
    renderQuoteItemsList();
    recalcTotals();
  }

  function renderQuoteItemsList() {
    const list = $('m8-items-list');
    if (!list) return;
    if (quoteItems.length === 0) {
      list.innerHTML = `<div class="empty-state" style="padding:24px"><i class="fa-solid fa-cart-shopping"></i><p>Nenhum item adicionado.</p></div>`;
      return;
    }
    list.innerHTML = quoteItems.map((item, i) => `
      <div class="m8-item-row" style="display:grid;grid-template-columns:1fr 70px 52px 90px auto 36px;gap:8px;align-items:center;padding:10px 14px;border-bottom:1px solid var(--border)">
        <div>
          <div style="font-size:12px;font-weight:600">${Utils.esc(item.prodName)}</div>
          <div class="text-xs text-muted">${Utils.esc(item.variationName || '')}</div>
        </div>
        <input type="number" class="m8-item-qty"   data-idx="${i}" value="${item.qty}" min="1"
          style="font-size:12px;padding:4px 6px;text-align:center" />
        <select class="m8-item-mtype" data-idx="${i}" style="font-size:12px;padding:4px 6px">
          <option value="pct" ${item.marginType === 'pct' ? 'selected' : ''}>%</option>
          <option value="brl" ${item.marginType === 'brl' ? 'selected' : ''}>R$</option>
        </select>
        <input type="number" class="m8-item-mval" data-idx="${i}" value="${Utils.num(item.marginVal, 2)}"
          min="0" step="0.01" style="font-size:12px;padding:4px 6px" />
        <div class="font-mono font-bold text-accent" style="font-size:13px;text-align:right;min-width:80px" id="m8-item-total-${i}">${Utils.brl(item.total)}</div>
        <button class="btn btn-xs btn-danger" onclick="M8.removeItem(${i})">
          <i class="fa-solid fa-times"></i>
        </button>
      </div>`).join('');

    list.querySelectorAll('.m8-item-qty, .m8-item-mtype, .m8-item-mval').forEach(el => {
      el.addEventListener('change', () => updateItem(parseInt(el.dataset.idx)));
      el.addEventListener('input',  () => updateItem(parseInt(el.dataset.idx)));
    });
  }

  function updateItem(i) {
    const item = quoteItems[i];
    if (!item) return;
    item.qty        = parseInt(document.querySelector(`.m8-item-qty[data-idx="${i}"]`)?.value)   || 1;
    item.marginType = document.querySelector(`.m8-item-mtype[data-idx="${i}"]`)?.value || 'pct';
    item.marginVal  = parseFloat(document.querySelector(`.m8-item-mval[data-idx="${i}"]`)?.value) || 0;
    item.unitPrice  = item.marginType === 'pct'
      ? item.unitCostPratik * (1 + item.marginVal / 100)
      : item.unitCostPratik + item.marginVal;
    item.total = item.unitPrice * item.qty;
    const cell = $(`m8-item-total-${i}`);
    if (cell) cell.textContent = Utils.brl(item.total);
    recalcTotals();
  }

  function removeItem(i) {
    quoteItems.splice(i, 1);
    renderQuoteItemsList();
    recalcTotals();
  }

  function recalcTotals() {
    const subtotal = quoteItems.reduce((s, it) => s + it.total, 0);
    const discount = parseFloat($('m8-discount')?.value) || 0;
    const grand = Math.max(0, subtotal - discount);
    if ($('m8-subtotal'))  $('m8-subtotal').textContent  = Utils.brl(subtotal);
    if ($('m8-grandtotal')) $('m8-grandtotal').textContent = Utils.brl(grand);
  }

  function saveQuote() {
    if (!selectedClient)         { Toast.error('Selecione um cliente.'); return; }
    if (quoteItems.length === 0) { Toast.error('Adicione pelo menos um item.'); return; }
    const subtotal = quoteItems.reduce((s, it) => s + it.total, 0);
    const discount = parseFloat($('m8-discount')?.value) || 0;
    const grand = Math.max(0, subtotal - discount);
    const q = {
      id:         editingQuoteId || Utils.uid(),
      clientId:   selectedClient.id,
      clientName: selectedClient.name,
      date:       new Date().toISOString().split('T')[0],
      items:      quoteItems.map(it => ({ ...it })),
      subtotal, discount,
      grandTotal: grand,
      notes: $('m8-quote-notes')?.value?.trim() || ''
    };
    if (editingQuoteId) {
      const idx = quotes.findIndex(x => x.id === editingQuoteId);
      if (idx !== -1) quotes[idx] = q;
    } else {
      quotes.push(q);
    }
    save();
    editingQuoteId = null;
    quoteItems = [];
    renderQuoteItemsList();
    recalcTotals();
    renderQuoteHistory();
    if ($('m8-quote-notes')) $('m8-quote-notes').value = '';
    if ($('m8-discount'))    $('m8-discount').value    = '';
    Logger.log(`Orçamento salvo para ${selectedClient.name}: ${Utils.brl(grand)}`);
    Toast.success('Orçamento salvo!');
  }

  function printQuote(id) {
    const q = quotes.find(x => x.id === id);
    if (!q) return;
    const client = clients.find(c => c.id === q.clientId);
    const win = window.open('', '_blank');
    win.document.write(`<!DOCTYPE html><html lang="pt-BR"><head>
      <meta charset="UTF-8"><title>Orçamento — ${Utils.esc(q.clientName)}</title>
      <style>
        *{box-sizing:border-box;margin:0;padding:0}
        body{font-family:Arial,sans-serif;font-size:13px;color:#1a2035;padding:40px}
        h1{font-size:22px;color:#0d9488;margin-bottom:4px}
        .sub{color:#64748b;font-size:12px;margin-bottom:28px;border-bottom:2px solid #e2e8f0;padding-bottom:16px}
        .sec{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#64748b;margin:20px 0 8px}
        .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px 24px;margin-bottom:24px}
        .info-row{font-size:13px}.info-row strong{font-weight:700}
        table{width:100%;border-collapse:collapse;margin-bottom:20px}
        thead th{background:#f0f4f8;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;padding:8px 12px;text-align:left;border-bottom:2px solid #e2e8f0}
        tbody td{padding:9px 12px;border-bottom:1px solid #e2e8f0;font-size:13px}
        .tr{font-weight:700;font-size:14px}.gr{font-weight:700;font-size:16px;color:#0d9488}
        .footer{margin-top:40px;font-size:11px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:16px}
        @media print{body{padding:20px}}
      </style></head><body>
      <h1>Orçamento</h1>
      <div class="sub">Pratik Embalagens &nbsp;·&nbsp; ${Utils.fmtDate(q.date)}</div>
      <div class="sec">Cliente</div>
      <div class="info-grid">
        <div class="info-row">Nome: <strong>${Utils.esc(q.clientName)}</strong></div>
        ${client?.phone    ? `<div class="info-row">Telefone: <strong>${Utils.esc(client.phone)}</strong></div>`    : ''}
        ${client?.email    ? `<div class="info-row">E-mail: <strong>${Utils.esc(client.email)}</strong></div>`      : ''}
        ${client?.whatsapp ? `<div class="info-row">WhatsApp: <strong>${Utils.esc(client.whatsapp)}</strong></div>` : ''}
      </div>
      <div class="sec">Itens</div>
      <table>
        <thead><tr><th>Produto</th><th style="text-align:right">Qtd</th><th style="text-align:right">Preço Unit.</th><th style="text-align:right">Total</th></tr></thead>
        <tbody>
          ${q.items.map(it => `<tr>
            <td>${Utils.esc(it.prodName)}</td>
            <td style="text-align:right">${it.qty}</td>
            <td style="text-align:right">${Utils.brl(it.unitPrice)}</td>
            <td style="text-align:right">${Utils.brl(it.total)}</td>
          </tr>`).join('')}
          ${q.discount > 0 ? `
            <tr class="tr"><td colspan="3" style="text-align:right">Subtotal</td><td style="text-align:right">${Utils.brl(q.subtotal)}</td></tr>
            <tr><td colspan="3" style="text-align:right;color:#ef4444">Desconto</td><td style="text-align:right;color:#ef4444">- ${Utils.brl(q.discount)}</td></tr>` : ''}
          <tr class="gr"><td colspan="3" style="text-align:right">Total</td><td style="text-align:right">${Utils.brl(q.grandTotal)}</td></tr>
        </tbody>
      </table>
      ${q.notes ? `<div class="sec">Observações</div><p style="font-size:12px;color:#475569;margin-top:4px">${Utils.esc(q.notes)}</p>` : ''}
      <div class="footer">Documento gerado em ${new Date().toLocaleString('pt-BR')} &nbsp;·&nbsp; Pratik Embalagens</div>
      <script>window.onload=()=>{window.print()}<\/script>
    </body></html>`);
    win.document.close();
  }

  function removeQuote(id) {
    Modal.confirm({
      title: 'Remover Orçamento',
      body: '<p>Remover este orçamento do histórico?</p>',
      confirmText: 'Remover', confirmClass: 'btn-danger',
      onConfirm() {
        quotes = quotes.filter(q => q.id !== id);
        save(); renderQuoteHistory();
        Toast.success('Orçamento removido.');
      }
    });
  }

  /* ── CRUD clientes ── */
  let _editingClientId = null;

  function openAddClient() {
    _editingClientId = null;
    $('m8-client-modal-title').textContent = 'Novo Cliente';
    ['m8-c-name','m8-c-phone','m8-c-email','m8-c-whatsapp','m8-c-notes'].forEach(id => {
      const el = $(id); if (el) el.value = '';
    });
    $('modal-m8-client').classList.add('open');
  }

  function editClient(id) {
    const c = clients.find(x => x.id === id);
    if (!c) return;
    _editingClientId = id;
    $('m8-client-modal-title').textContent = 'Editar Cliente';
    $('m8-c-name').value     = c.name     || '';
    $('m8-c-phone').value    = c.phone    || '';
    $('m8-c-email').value    = c.email    || '';
    $('m8-c-whatsapp').value = c.whatsapp || '';
    $('m8-c-notes').value    = c.notes    || '';
    $('modal-m8-client').classList.add('open');
  }

  function deleteClient(id) {
    const c = clients.find(x => x.id === id);
    if (!c) return;
    Modal.confirm({
      title: 'Remover Cliente',
      body: `<p>Remover <strong>${Utils.esc(c.name)}</strong> e todos os orçamentos associados?</p>`,
      confirmText: 'Remover', confirmClass: 'btn-danger',
      onConfirm() {
        clients = clients.filter(x => x.id !== id);
        quotes  = quotes.filter(q => q.clientId !== id);
        if (selectedClient?.id === id) {
          selectedClient = null;
          $('m8-no-client')?.classList.remove('hidden');
          $('m8-client-panel')?.classList.add('hidden');
        }
        save();
        renderClients();
        Toast.success('Cliente removido.');
      }
    });
  }

  function saveClient() {
    const name = $('m8-c-name')?.value?.trim();
    if (!name) { Toast.error('Informe o nome do cliente.'); return; }
    const data = {
      name,
      phone:    $('m8-c-phone')?.value?.trim()    || '',
      email:    $('m8-c-email')?.value?.trim()    || '',
      whatsapp: $('m8-c-whatsapp')?.value?.trim() || '',
      notes:    $('m8-c-notes')?.value?.trim()    || '',
    };
    if (_editingClientId) {
      const idx = clients.findIndex(x => x.id === _editingClientId);
      if (idx !== -1) clients[idx] = { ...clients[idx], ...data };
      if (selectedClient?.id === _editingClientId) {
        selectedClient = clients[idx];
        renderClientPanel();
      }
      Logger.log(`Editou cliente: ${name}`);
      Toast.success('Cliente atualizado!');
    } else {
      clients.push({ id: Utils.uid(), createdAt: new Date().toISOString(), ...data });
      Logger.log(`Cadastrou cliente: ${name}`);
      Toast.success('Cliente cadastrado!');
    }
    save();
    closeClientModal();
    renderClients();
  }

  function closeClientModal() {
    $('modal-m8-client').classList.remove('open');
    _editingClientId = null;
  }

  function init() {
    load();
    $('m8-add-client-btn')?.addEventListener('click', openAddClient);
    $('m8-save-client-btn')?.addEventListener('click', saveClient);
    $('m8-cancel-client-btn')?.addEventListener('click', closeClientModal);
    $('m8-client-search')?.addEventListener('input', renderClients);
    $('m8-add-item-btn')?.addEventListener('click', addItem);
    $('m8-save-quote-btn')?.addEventListener('click', saveQuote);
    $('m8-discount')?.addEventListener('input', recalcTotals);
    renderClients();

    document.addEventListener('route:change', e => {
      if (e.detail.route !== 'm8') return;
      load(); renderClients(); renderProductPicker();
      if (selectedClient) {
        selectedClient = clients.find(c => c.id === selectedClient.id) || null;
        renderClientPanel();
      }
    });
  }

  return { init, selectClient, editClient, deleteClient, removeItem, removeQuote, printQuote, openAddClient };
})();
window.M8 = M8;
