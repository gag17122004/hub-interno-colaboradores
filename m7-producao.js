/**
 * m7-producao.js — Módulo 7: Controle de Produção
 *
 * Estrutura de registro:
 * {
 *   id, date, operator, machine, prodType, micron, color,
 *   weight, size, startTime, endTime, packages, cuts, notes
 * }
 */

const M7 = (() => {

  const $ = (id) => document.getElementById(id);

  /* ── Estado ──────────────────────────────────────────────── */
  let records = [];
  let goal    = 0;
  let _editingId = null;

  // Listas expansíveis
  let machines = ['01 (Saco)', '02 (Envelope)', '03 (Saco)'];
  let microns  = ['0.03', '0.035', '0.04'];
  let colors   = ['Preto'];

  /* ── Persistência ────────────────────────────────────────── */
  function save() {
    Storage.set(Storage.KEYS.PRODUCTION, records);
    Storage.set(Storage.KEYS.PROD_GOAL, goal);
  }

  function load() {
    records = Storage.get(Storage.KEYS.PRODUCTION, []);
    goal    = Storage.get(Storage.KEYS.PROD_GOAL,  0);
  }

  /* ── Estatísticas ────────────────────────────────────────── */
  function calcStats() {
    const totalPackages = records.reduce((s, r) => s + (Number(r.packages) || 0), 0);
    const days = new Set(records.map(r => r.date)).size || 1;
    const avg  = Math.round(totalPackages / days);
    return { totalPackages, avg };
  }

  /* ── Renderização ────────────────────────────────────────── */

  function renderStats() {
    const isMaster = Auth.isMaster();
    const masterView = $('m7-master-view');
    if (masterView) masterView.classList.toggle('hidden', !isMaster);

    if (!isMaster) return;

    const { totalPackages, avg } = calcStats();
    const totalEl = $('m7-stat-total');
    const avgEl   = $('m7-stat-avg');
    const goalEl  = $('m7-goal-input');

    if (totalEl) totalEl.textContent = totalPackages.toLocaleString('pt-BR');
    if (avgEl)   avgEl.textContent   = avg.toLocaleString('pt-BR') + '/dia';
    if (goalEl)  goalEl.value        = goal || '';
  }

  function renderTable() {
    const tbody = $('m7-production-tbody');
    if (!tbody) return;

    const session = Auth.getSession();
    const isMaster = Auth.isMaster();

    // Colaborador vê apenas os próprios registros
    let displayRecords = isMaster
      ? [...records]
      : records.filter(r => r.operator === session?.name);

    // Ordenar por data desc
    displayRecords.sort((a, b) => (b.date + b.startTime).localeCompare(a.date + a.startTime));

    if (displayRecords.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" class="empty-state">
        <i class="fa-solid fa-industry"></i>
        <p>Nenhum registro de produção.</p>
      </td></tr>`;
      return;
    }

    tbody.innerHTML = displayRecords.map(r => `
      <tr>
        <td class="font-mono text-xs">${Utils.fmtDate(r.date)}</td>
        <td><span class="badge badge-info">${Utils.esc(r.operator)}</span></td>
        <td class="font-mono text-xs">${Utils.esc(r.machine)}</td>
        <td>${Utils.esc(r.prodType)}</td>
        <td class="font-mono text-xs">${Utils.esc(r.size || '—')}</td>
        <td class="font-mono text-xs">${Utils.num(r.weight, 2)} kg</td>
        <td class="font-mono font-bold text-accent">${Number(r.packages || 0).toLocaleString('pt-BR')}</td>
        <td>
          <div class="flex gap-2">
            <button class="btn btn-xs btn-secondary" onclick="M7.editRecord('${r.id}')">
              <i class="fa-solid fa-pen"></i>
            </button>
            ${isMaster ? `<button class="btn btn-xs btn-danger" onclick="M7.removeRecord('${r.id}')">
              <i class="fa-solid fa-trash"></i>
            </button>` : ''}
          </div>
        </td>
      </tr>`).join('');
  }

  /* ── Seletores dinâmicos ─────────────────────────────────── */

  function buildSelect(selectId, list) {
    const sel = $(selectId);
    if (!sel) return;
    const current = sel.value;
    sel.innerHTML = list.map(v => `<option value="${Utils.esc(v)}">${Utils.esc(v)}</option>`).join('')
      + `<option value="__other__">+ Adicionar nova opção...</option>`;
    if (list.includes(current)) sel.value = current;
  }

  function handleSelectOther(selectId, list, label) {
    const sel = $(selectId);
    if (!sel || sel.value !== '__other__') return;
    const newVal = prompt(`Adicionar nova opção de ${label}:`);
    if (newVal?.trim()) {
      list.push(newVal.trim());
      buildSelect(selectId, list);
      sel.value = newVal.trim();
    } else {
      sel.value = list[0] || '';
    }
  }

  function populateModal() {
    buildSelect('m7-machine', machines);
    buildSelect('m7-micron', microns);
    buildSelect('m7-color', colors);

    ['m7-machine','m7-micron','m7-color'].forEach(id => {
      const sel = $(id);
      if (sel) {
        const clone = sel.cloneNode(true);
        sel.parentNode.replaceChild(clone, sel);
        clone.addEventListener('change', () => {
          if (id === 'm7-machine') handleSelectOther(id, machines, 'Máquina');
          if (id === 'm7-micron')  handleSelectOther(id, microns,  'Micragem');
          if (id === 'm7-color')   handleSelectOther(id, colors,   'Cor');
        });
      }
    });

    // Data padrão: hoje
    const dateEl = $('m7-date');
    if (dateEl && !dateEl.value) {
      dateEl.value = new Date().toISOString().split('T')[0];
    }

    // Operador: preenchido automaticamente
    const session = Auth.getSession();
    const operatorEl = $('m7-operator');
    if (operatorEl) {
      operatorEl.value = session?.name || '';
      operatorEl.readOnly = !Auth.isMaster();
    }
  }

  /* ── Modal ───────────────────────────────────────────────── */

  function openAdd() {
    _editingId = null;
    $('modal-production-record-title').textContent = 'Novo Registro de Produção';
    ['m7-weight','m7-size','m7-start-time','m7-end-time','m7-packages','m7-cuts','m7-notes']
      .forEach(id => { const el = $(id); if (el) el.value = ''; });
    populateModal();
    $('modal-production-record').classList.add('open');
  }

  function editRecord(id) {
    const r = records.find(x => x.id === id);
    if (!r) return;

    // Colaborador só pode editar o próprio
    const session = Auth.getSession();
    if (!Auth.isMaster() && r.operator !== session?.name) {
      Toast.error('Você só pode editar seus próprios registros.'); return;
    }

    _editingId = id;
    $('modal-production-record-title').textContent = 'Editar Registro';
    populateModal();

    const dateEl = $('m7-date');
    if (dateEl) dateEl.value = r.date;
    $('m7-operator').value   = r.operator;
    $('m7-machine').value    = r.machine;
    $('m7-prod-type').value  = r.prodType;
    $('m7-micron').value     = r.micron;
    $('m7-color').value      = r.color;
    $('m7-weight').value     = r.weight;
    $('m7-size').value       = r.size || '';
    $('m7-start-time').value = r.startTime;
    $('m7-end-time').value   = r.endTime;
    $('m7-packages').value   = r.packages;
    $('m7-cuts').value       = r.cuts || '';
    $('m7-notes').value      = r.notes || '';

    $('modal-production-record').classList.add('open');
  }

  function closeModal() {
    $('modal-production-record').classList.remove('open');
    _editingId = null;
  }

  function saveRecord() {
    const date      = $('m7-date')?.value;
    const operator  = $('m7-operator')?.value?.trim();
    const machine   = $('m7-machine')?.value;
    const prodType  = $('m7-prod-type')?.value;
    const micron    = $('m7-micron')?.value;
    const color     = $('m7-color')?.value;
    const weight    = parseFloat($('m7-weight')?.value) || 0;
    const size      = $('m7-size')?.value?.trim();
    const startTime = $('m7-start-time')?.value;
    const endTime   = $('m7-end-time')?.value;
    const packages  = parseInt($('m7-packages')?.value) || 0;
    const cuts      = parseInt($('m7-cuts')?.value) || 0;
    const notes     = $('m7-notes')?.value?.trim();

    if (!date)     { Toast.error('Informe a data.'); return; }
    if (!operator) { Toast.error('Informe o operador.'); return; }
    if (packages <= 0) { Toast.error('Informe a quantidade de pacotes.'); return; }

    const recordData = { date, operator, machine, prodType, micron, color, weight, size, startTime, endTime, packages, cuts, notes };

    if (_editingId) {
      const idx = records.findIndex(r => r.id === _editingId);
      if (idx !== -1) records[idx] = { ...records[idx], ...recordData };
      Logger.log(`Editou registro de produção: ${packages} pacotes em ${date}`);
    } else {
      records.push({ id: Utils.uid(), ...recordData });
      Logger.log(`Registrou produção: ${packages} pacotes (${machine}) em ${date}`);
    }

    save();
    closeModal();
    renderStats();
    renderTable();
    Toast.success(_editingId ? 'Registro atualizado.' : 'Produção registrada.');
  }

  function removeRecord(id) {
    const r = records.find(x => x.id === id);
    if (!r) return;
    Modal.confirm({
      title: 'Remover Registro',
      body: `<p>Remover registro de <strong>${r.packages} pacotes</strong> em ${Utils.fmtDate(r.date)}?</p>`,
      confirmText: 'Remover',
      confirmClass: 'btn-danger',
      onConfirm() {
        records = records.filter(x => x.id !== id);
        save();
        renderStats();
        renderTable();
        Logger.log(`Removeu registro de produção de ${Utils.fmtDate(r.date)}`);
        Toast.success('Registro removido.');
      }
    });
  }

  function saveGoal() {
    const val = parseInt($('m7-goal-input')?.value) || 0;
    goal = val;
    save();
    Toast.success('Meta de produção salva.');
  }

  /* ── Inicialização ───────────────────────────────────────── */
  function init() {
    load();

    const addBtn = $('m7-add-btn');
    if (addBtn) addBtn.addEventListener('click', openAdd);

    const saveBtn = $('m7-save-btn');
    if (saveBtn) saveBtn.addEventListener('click', saveRecord);

    const cancelBtn = $('m7-cancel-btn');
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

    const goalInput = $('m7-goal-input');
    if (goalInput) goalInput.addEventListener('change', saveGoal);

    document.addEventListener('route:change', (e) => {
      if (e.detail.route === 'm7') {
        load();
        renderStats();
        renderTable();
      }
    });
  }

  return {
    init,
    editRecord,
    removeRecord,
    openAdd,
    saveRecord,
    closeModal,
  };

})();
