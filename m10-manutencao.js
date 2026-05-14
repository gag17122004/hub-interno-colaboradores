/**
 * m10-manutencao.js — Manutenção de Máquinas
 * Operadores: ocorrências de parada (tipo operator)
 * Master: ocorrências de assistência técnica HECE (tipo technical)
 * Ficha por máquina + alertas de padrão anormal
 */
const M10 = (() => {
  const KEY = 'hub_maintenance';
  const $ = id => document.getElementById(id);

  let records = [];
  let selectedMachine = null;

  const DEFAULT_MACHINES = ['01 (Saco)', '02 (Envelope)', '03 (Saco)'];

  function save() { Storage.set(KEY, records); }
  function load() { records = Storage.get(KEY, []); }

  function getMachines() {
    const all = new Set(DEFAULT_MACHINES);
    records.forEach(r => { if (r.machine) all.add(r.machine); });
    return [...all];
  }

  /* Alert: se a taxa de paradas nos últimos 7 dias for > 2× a média histórica */
  function checkAlert(machine) {
    const recs = records.filter(r => r.machine === machine && r.type === 'operator');
    if (recs.length < 4) return false;
    const todayStr = new Date().toISOString().split('T')[0];
    const d7 = new Date(); d7.setDate(d7.getDate() - 7);
    const w7Str = d7.toISOString().split('T')[0];
    const recent = recs.filter(r => r.date >= w7Str);
    const older  = recs.filter(r => r.date < w7Str);
    if (older.length === 0) return false;
    const olderDays = new Set(older.map(r => r.date)).size || 1;
    return (recent.length / 7) > (older.length / olderDays) * 2;
  }

  function renderMachineList() {
    const list = $('m10-machine-list');
    if (!list) return;
    const machines = getMachines();
    list.innerHTML = machines.map(m => {
      const recs    = records.filter(r => r.machine === m);
      const last    = recs.filter(r => r.type === 'operator').sort((a, b) => b.date.localeCompare(a.date))[0];
      const alert   = checkAlert(m);
      const color   = alert ? 'var(--danger)' : 'var(--success)';
      const icon    = alert ? 'fa-triangle-exclamation' : 'fa-check';
      return `
        <div class="m1-emp-item ${selectedMachine === m ? 'active' : ''}"
             onclick="M10.selectMachine('${Utils.esc(m).replace(/'/g, "\\'")}')">
          <div class="m1-emp-avatar" style="background:${color}">
            <i class="fa-solid ${icon}" style="font-size:11px"></i>
          </div>
          <div class="m1-emp-info">
            <div class="m1-emp-name">${Utils.esc(m)}</div>
            <div class="m1-emp-bal text-muted">${recs.length} ocor. ${last ? '— última ' + Utils.fmtDate(last.date) : ''}</div>
          </div>
        </div>`;
    }).join('');
  }

  function selectMachine(m) {
    selectedMachine = m;
    renderMachineList();
    renderMachinePanel();
  }

  function renderMachinePanel() {
    $('m10-no-machine')?.classList.toggle('hidden', !!selectedMachine);
    $('m10-machine-panel')?.classList.toggle('hidden', !selectedMachine);
    if (!selectedMachine) return;

    if ($('m10-machine-title')) $('m10-machine-title').textContent = `Máquina ${selectedMachine}`;

    const alert = checkAlert(selectedMachine);
    const banner = $('m10-alert-banner');
    if (banner) {
      banner.classList.toggle('hidden', !alert);
      const txt = $('m10-alert-text');
      if (txt && alert)
        txt.textContent = `Padrão de paradas acima do normal nos últimos 7 dias — verificar máquina ${selectedMachine}.`;
    }

    const recs = records
      .filter(r => r.machine === selectedMachine)
      .sort((a, b) => (b.date + (b.time || '')).localeCompare(a.date + (a.time || '')));

    renderStats(recs);
    renderRecordsTable(recs);
  }

  function renderStats(recs) {
    const operRecs = recs.filter(r => r.type === 'operator');
    const techRecs = recs.filter(r => r.type === 'technical');
    const totalDown = operRecs.reduce((s, r) => s + (Number(r.downtime) || 0), 0);
    if ($('m10-stat-stops')) $('m10-stat-stops').textContent = operRecs.length;
    if ($('m10-stat-tech'))  $('m10-stat-tech').textContent  = techRecs.length;
    if ($('m10-stat-down'))  $('m10-stat-down').textContent  = `${Utils.num(totalDown / 60, 1)}h`;
  }

  function renderRecordsTable(recs) {
    const tbody = $('m10-records-tbody');
    if (!tbody) return;
    if (recs.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="empty-state"><i class="fa-solid fa-wrench"></i><p>Nenhuma ocorrência.</p></td></tr>`;
      return;
    }
    tbody.innerHTML = recs.map(r => {
      const badge = r.type === 'technical'
        ? `<span class="badge badge-warning">HECE</span>`
        : `<span class="badge badge-info">Operador</span>`;
      const detail = r.type === 'technical'
        ? Utils.esc(r.technician || '—')
        : Utils.esc(r.action || '—');
      const extra = r.type === 'technical'
        ? (r.visitDate ? Utils.fmtDate(r.visitDate) : '—')
        : (r.downtime ? r.downtime + ' min' : '—');
      return `<tr>
        <td>${badge}</td>
        <td class="font-mono text-xs">${Utils.fmtDate(r.date)} ${r.time ? r.time : ''}</td>
        <td style="max-width:220px;white-space:pre-wrap;font-size:12px">${Utils.esc(r.description)}</td>
        <td class="text-xs">${detail}</td>
        <td class="font-mono text-xs">${extra}</td>
        <td class="text-xs text-muted">${Utils.esc(r.createdBy || '—')}</td>
        <td>
          <button class="btn btn-xs btn-danger" onclick="M10.removeRecord('${r.id}')">
            <i class="fa-solid fa-trash"></i>
          </button>
        </td>
      </tr>`;
    }).join('');
  }

  /* ── Modal ── */
  function openAddRecord() {
    $('m10-modal-title').textContent = 'Nova Ocorrência';
    // populate machine select
    const sel = $('m10-rec-machine');
    if (sel) {
      sel.innerHTML = getMachines().map(m => `<option value="${Utils.esc(m)}">${Utils.esc(m)}</option>`).join('');
      if (selectedMachine) sel.value = selectedMachine;
    }
    if ($('m10-rec-date')) $('m10-rec-date').value = new Date().toISOString().split('T')[0];
    if ($('m10-rec-time')) $('m10-rec-time').value = new Date().toTimeString().slice(0, 5);
    ['m10-rec-description','m10-rec-action','m10-rec-downtime',
     'm10-rec-technician','m10-rec-visit','m10-rec-whatdone'].forEach(id => {
      const el = $(id); if (el) el.value = '';
    });
    if ($('m10-type-hece')) $('m10-type-hece').checked = false;
    updateTypeVisibility();
    $('modal-m10-record').classList.add('open');
  }

  function updateTypeVisibility() {
    const isHece = $('m10-type-hece')?.checked || false;
    // hide/show only for master; non-master can never see HECE option
    if (!Auth.isMaster()) {
      $('m10-hece-row')?.classList.add('hidden');
    }
    $('m10-operator-fields')?.classList.toggle('hidden', isHece);
    $('m10-hece-fields')?.classList.toggle('hidden', !isHece);
  }

  function saveRecord() {
    const machine     = $('m10-rec-machine')?.value?.trim();
    const date        = $('m10-rec-date')?.value;
    const time        = $('m10-rec-time')?.value || '';
    const description = $('m10-rec-description')?.value?.trim();
    if (!machine || !date || !description) {
      Toast.error('Preencha máquina, data e descrição.'); return;
    }
    const isHece  = (Auth.isMaster() && $('m10-type-hece')?.checked) || false;
    const session = Auth.getSession();

    const rec = {
      id: Utils.uid(),
      type: isHece ? 'technical' : 'operator',
      machine, date, time, description,
      createdBy: session?.name || '',
      ...(isHece ? {
        technician: $('m10-rec-technician')?.value?.trim() || '',
        visitDate:  $('m10-rec-visit')?.value || '',
        whatDone:   $('m10-rec-whatdone')?.value?.trim() || ''
      } : {
        action:   $('m10-rec-action')?.value?.trim() || '',
        downtime: parseInt($('m10-rec-downtime')?.value) || 0
      })
    };

    records.push(rec);
    save();
    $('modal-m10-record').classList.remove('open');
    if (!selectedMachine) selectedMachine = machine;
    renderMachineList();
    renderMachinePanel();
    Logger.log(`Ocorrência registrada: ${machine} — ${description.substring(0, 60)}`);
    Toast.success('Ocorrência registrada.');
  }

  function removeRecord(id) {
    Modal.confirm({
      title: 'Remover Ocorrência',
      body: '<p>Remover esta ocorrência do histórico?</p>',
      confirmText: 'Remover', confirmClass: 'btn-danger',
      onConfirm() {
        records = records.filter(r => r.id !== id);
        save(); renderMachineList();
        if (selectedMachine) renderMachinePanel();
        Toast.success('Ocorrência removida.');
      }
    });
  }

  function init() {
    load();
    $('m10-add-record-btn')?.addEventListener('click', openAddRecord);
    $('m10-save-record-btn')?.addEventListener('click', saveRecord);
    $('m10-cancel-record-btn')?.addEventListener('click', () => $('modal-m10-record').classList.remove('open'));
    $('m10-type-hece')?.addEventListener('change', updateTypeVisibility);

    renderMachineList();

    document.addEventListener('route:change', e => {
      if (e.detail.route !== 'm10') return;
      load(); renderMachineList();
      if (selectedMachine) renderMachinePanel();
    });
  }

  return { init, selectMachine, removeRecord, openAddRecord };
})();
