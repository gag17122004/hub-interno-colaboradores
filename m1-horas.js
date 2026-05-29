/**
 * m1-horas.js v3 — Horas Extras & Devedoras
 *
 * Estrutura: timeRecords[empId] = [{ id, date, type:'extra'|'devida', hours, note, createdBy }]
 * Sem ponto, sem GPS, sem batidas — apenas lançamentos manuais de horas.
 */
const M1 = (() => {
  const TRK = 'hub_time_records';
  const $   = id => document.getElementById(id);

  let employees     = [];
  let timeRecords   = {};
  let activeEmployee = null;

  /* ── Persistência ── */
  function save() {
    Storage.setSync(Storage.KEYS.EMPLOYEES, employees);
    Storage.setSync(TRK, timeRecords);
  }

  async function load() {
    await Storage.syncBatch([Storage.KEYS.EMPLOYEES, TRK]);
    employees   = Storage.getSync(Storage.KEYS.EMPLOYEES, []);
    timeRecords = Storage.getSync(TRK, {});
  }

  /* ── Cálculos ── */
  function calcTotals(empId) {
    const recs   = timeRecords[empId] || [];
    const extras  = recs.filter(r => r.type === 'extra').reduce((s, r)  => s + (Number(r.hours) || 0), 0);
    const devidas = recs.filter(r => r.type === 'devida').reduce((s, r) => s + (Number(r.hours) || 0), 0);
    return { extras, devidas, saldo: extras - devidas };
  }

  /* ── Renderização ── */
  function renderEmployeeList() {
    const list = $('m1-employee-list');
    if (!list) return;
    if (!employees.length) {
      list.innerHTML = `<div class="empty-state"><i class="fa-solid fa-users"></i><p>Nenhum colaborador</p></div>`;
      return;
    }
    list.innerHTML = employees.map(e => {
      const { saldo } = calcTotals(e.id);
      const color     = saldo >= 0 ? 'var(--success)' : 'var(--danger)';
      const initials  = (e.name || '?').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
      return `
        <div class="m1-emp-item ${e.id === activeEmployee ? 'active' : ''}"
             onclick="M1.selectEmployee('${e.id}')">
          <div class="m1-emp-avatar" style="background:${color};color:#fff;font-size:11px;font-weight:700">
            ${Utils.esc(initials)}
          </div>
          <div class="m1-emp-info">
            <div class="m1-emp-name">${Utils.esc(e.name)}</div>
            <div class="m1-emp-bal text-muted">${saldo >= 0 ? '+' : ''}${Utils.num(saldo, 1)}h saldo</div>
          </div>
          <button class="btn btn-xs btn-danger master-only"
                  style="margin-left:auto;flex-shrink:0"
                  onclick="event.stopPropagation();M1.removeEmployee('${e.id}')">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>`;
    }).join('');
  }

  function renderPanel() {
    const hasEmp = !!activeEmployee;
    $('m1-empty')?.classList.toggle('hidden', hasEmp);
    $('m1-hours-panel')?.classList.toggle('hidden', !hasEmp);
    if (!hasEmp) return;

    const emp = employees.find(e => e.id === activeEmployee);
    if ($('m1-panel-name')) $('m1-panel-name').textContent = emp?.name || '—';

    const { extras, devidas, saldo } = calcTotals(activeEmployee);
    if ($('m1-stat-extras'))  $('m1-stat-extras').textContent  = Utils.num(extras, 1) + 'h';
    if ($('m1-stat-devidas')) $('m1-stat-devidas').textContent = Utils.num(devidas, 1) + 'h';
    const saldoEl = $('m1-stat-saldo');
    if (saldoEl) {
      saldoEl.textContent   = (saldo >= 0 ? '+' : '') + Utils.num(saldo, 1) + 'h';
      saldoEl.style.color   = saldo >= 0 ? 'var(--success)' : 'var(--danger)';
    }

    const recs  = (timeRecords[activeEmployee] || []).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    const tbody = $('m1-records-tbody');
    if (!tbody) return;

    if (!recs.length) {
      tbody.innerHTML = `<tr><td colspan="6" class="empty-state"><i class="fa-solid fa-clock"></i><p>Nenhum lançamento.</p></td></tr>`;
      return;
    }

    const isMaster = Auth.isMaster();
    tbody.innerHTML = recs.map(r => {
      const isExtra = r.type === 'extra';
      return `<tr>
        <td>${Utils.fmtDate(r.date)}</td>
        <td><span class="badge ${isExtra ? 'badge-success' : 'badge-danger'}">${isExtra ? 'Extra' : 'Devedora'}</span></td>
        <td class="font-mono">${Utils.num(Number(r.hours) || 0, 2)}h</td>
        <td class="text-sm text-muted">${Utils.esc(r.note || '—')}</td>
        <td class="text-xs text-muted">${Utils.esc(r.createdBy || '—')}</td>
        <td>${isMaster ? `<button class="btn btn-xs btn-danger" onclick="M1.removeRecord('${r.id}')"><i class="fa-solid fa-trash"></i></button>` : ''}</td>
      </tr>`;
    }).join('');
  }

  function renderPasswordPanel() {
    const panel = $('m1-password-panel');
    if (!panel || !Auth.isMaster()) return;
    panel.innerHTML = employees.map(e => `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)">
        <div>
          <div style="font-weight:600;font-size:13px">${Utils.esc(e.name)}</div>
          <div class="text-xs text-muted">${Auth.hasPassword(e.name) ? 'Senha definida' : 'Sem senha'}</div>
        </div>
        <button class="btn btn-xs btn-secondary" onclick="Auth.resetColabPassword('${Utils.esc(e.name)}')">
          <i class="fa-solid fa-key"></i>
        </button>
      </div>`).join('') || '<div class="text-xs text-muted">Nenhum colaborador.</div>';
  }

  /* ── Colaboradores ── */
  function addEmployee() {
    const inp  = $('m1-new-employee');
    const name = inp?.value?.trim();
    if (!name) { Toast.error('Informe o nome.'); return; }
    if (employees.find(e => e.name.toLowerCase() === name.toLowerCase())) {
      Toast.error('Colaborador já existe.'); return;
    }
    employees.push({ id: Utils.uid(), name });
    if (inp) inp.value = '';
    save();
    renderEmployeeList();
    renderPasswordPanel();
    Logger.log('Adicionou colaborador: ' + name);
    Toast.success('Colaborador adicionado.');
  }

  function removeEmployee(id) {
    const emp = employees.find(e => e.id === id);
    if (!emp) return;
    Modal.confirm({
      title: 'Remover Colaborador',
      body: `<p>Remover <strong>${Utils.esc(emp.name)}</strong>? Os lançamentos de horas são mantidos.</p>`,
      confirmText: 'Remover', confirmClass: 'btn-danger',
      onConfirm() {
        employees = employees.filter(e => e.id !== id);
        if (activeEmployee === id) activeEmployee = null;
        save(); renderEmployeeList(); renderPasswordPanel(); renderPanel();
        Toast.success('Colaborador removido.');
      }
    });
  }

  function selectEmployee(id) {
    activeEmployee = id;
    renderEmployeeList();
    renderPanel();
  }

  /* ── Modal: lançar horas ── */
  function openAddRecord() {
    if (!Auth.isMaster() || !activeEmployee) return;
    const emp = employees.find(e => e.id === activeEmployee);
    if ($('m1-rec-emp-name')) $('m1-rec-emp-name').textContent = emp?.name || '';
    if ($('m1-rec-date'))  $('m1-rec-date').value  = new Date().toISOString().split('T')[0];
    if ($('m1-rec-hours')) $('m1-rec-hours').value = '';
    if ($('m1-rec-note'))  $('m1-rec-note').value  = '';
    if ($('m1-rec-type'))  $('m1-rec-type').value  = 'extra';
    $('modal-m1-record')?.classList.add('open');
  }

  function saveRecord() {
    const date  = $('m1-rec-date')?.value;
    const type  = $('m1-rec-type')?.value;
    const hours = parseFloat($('m1-rec-hours')?.value) || 0;
    const note  = $('m1-rec-note')?.value?.trim() || '';

    if (!date)      { Toast.error('Informe a data.'); return; }
    if (hours <= 0) { Toast.error('Informe as horas (maior que zero).'); return; }

    const session = Auth.getSession();
    if (!timeRecords[activeEmployee]) timeRecords[activeEmployee] = [];
    timeRecords[activeEmployee].push({
      id: Utils.uid(), date, type, hours, note,
      createdBy: session?.name || '—',
      createdAt: new Date().toISOString()
    });

    save();
    $('modal-m1-record')?.classList.remove('open');
    renderEmployeeList();
    renderPanel();
    const empName = employees.find(e => e.id === activeEmployee)?.name || '';
    Logger.log(`Lançou ${hours}h ${type} para ${empName}`);
    Toast.success(`${hours}h ${type === 'extra' ? 'extras' : 'devedoras'} lançadas.`);
  }

  function removeRecord(id) {
    Modal.confirm({
      title: 'Remover Lançamento', confirmText: 'Remover', confirmClass: 'btn-danger',
      body: '<p>Remover este lançamento do histórico?</p>',
      onConfirm() {
        timeRecords[activeEmployee] = (timeRecords[activeEmployee] || []).filter(r => r.id !== id);
        save(); renderEmployeeList(); renderPanel();
        Toast.success('Lançamento removido.');
      }
    });
  }

  /* ── Exportar ── */
  function exportHours() {
    if (!activeEmployee) return;
    const emp  = employees.find(e => e.id === activeEmployee);
    const recs = (timeRecords[activeEmployee] || []).sort((a, b) => b.date.localeCompare(a.date));
    const { extras, devidas, saldo } = calcTotals(activeEmployee);

    const rows = recs.map(r => `
      <tr>
        <td>${Utils.fmtDate(r.date)}</td>
        <td style="color:${r.type === 'extra' ? '#16a34a' : '#dc2626'}">${r.type === 'extra' ? 'Extra' : 'Devedora'}</td>
        <td style="font-family:monospace">${Utils.num(Number(r.hours) || 0, 2)}h</td>
        <td>${Utils.esc(r.note || '—')}</td>
        <td style="color:#6b7280;font-size:11px">${Utils.esc(r.createdBy || '—')}</td>
      </tr>`).join('');

    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
      <title>Horas — ${Utils.esc(emp?.name || '')}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 32px; color: #111; }
        h1   { font-size: 20px; margin-bottom: 4px; }
        .sub { color: #6b7280; font-size: 13px; margin-bottom: 24px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th { background: #f3f4f6; text-align: left; padding: 8px 12px; font-size: 12px; text-transform: uppercase; letter-spacing: .05em; }
        td { padding: 8px 12px; border-bottom: 1px solid #e5e7eb; font-size: 13px; }
        .stats { display: flex; gap: 32px; background: #f9fafb; padding: 16px 20px; border-radius: 8px; margin-bottom: 24px; }
        .stat-label { font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: .05em; }
        .stat-value { font-size: 22px; font-weight: 700; font-family: monospace; }
        @media print { body { padding: 16px; } }
      </style></head><body>
      <h1>${Utils.esc(emp?.name || '—')}</h1>
      <div class="sub">Relatório de Horas Extras — gerado em ${new Date().toLocaleDateString('pt-BR', { day:'2-digit', month:'long', year:'numeric' })}</div>
      <div class="stats">
        <div><div class="stat-label">Horas Extras</div><div class="stat-value" style="color:#16a34a">+${Utils.num(extras,2)}h</div></div>
        <div><div class="stat-label">Horas Devedoras</div><div class="stat-value" style="color:#dc2626">-${Utils.num(devidas,2)}h</div></div>
        <div><div class="stat-label">Saldo</div><div class="stat-value" style="color:${saldo>=0?'#16a34a':'#dc2626'}">${saldo>=0?'+':''}${Utils.num(saldo,2)}h</div></div>
      </div>
      <table><thead><tr><th>Data</th><th>Tipo</th><th>Horas</th><th>Observação</th><th>Lançado por</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="5" style="text-align:center;color:#9ca3af;padding:24px">Nenhum lançamento.</td></tr>'}</tbody></table>
      <script>window.print();window.onafterprint=()=>window.close();<\/script>
      </body></html>`;

    const w = window.open('', '_blank');
    if (w) {
      w.document.write(html);
      w.document.close();
    } else {
      // Fallback para browsers que bloqueiam popup (iOS Safari, etc.)
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url;
      a.download = `horas-${(emp?.name || 'relatorio').replace(/\s+/g, '-')}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  }

  /* ── Init ── */
  async function init() {
    await load();

    Storage.subscribe(Storage.KEYS.EMPLOYEES, data => {
      employees = data ?? [];
      renderEmployeeList();
      renderPasswordPanel();
    });
    Storage.subscribe(TRK, data => {
      timeRecords = data ?? {};
      renderEmployeeList();
      if (activeEmployee) renderPanel();
    });

    $('m1-add-employee-btn')?.addEventListener('click', addEmployee);
    $('m1-export-btn')?.addEventListener('click', exportHours);
    $('m1-new-employee')?.addEventListener('keydown', e => { if (e.key === 'Enter') addEmployee(); });
    $('m1-add-record-btn')?.addEventListener('click', openAddRecord);
    $('m1-save-record-btn')?.addEventListener('click', saveRecord);
    $('m1-cancel-record-btn')?.addEventListener('click', () => $('modal-m1-record')?.classList.remove('open'));

    renderEmployeeList();
    renderPasswordPanel();

    if (employees.length) {
      activeEmployee = employees[0].id;
      renderPanel();
    }

    document.addEventListener('route:change', async e => {
      if (e.detail.route !== 'm1') return;
      await load();
      renderEmployeeList();
      renderPasswordPanel();
      if (activeEmployee) renderPanel();
    });
  }

  return {
    init, addEmployee, removeEmployee, selectEmployee,
    openAddRecord, saveRecord, removeRecord,
    renderPasswordPanel, exportHours
  };
})();
window.M1 = M1;
window.renderPasswordPanel = () => M1.renderPasswordPanel();
