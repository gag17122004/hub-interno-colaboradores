/**
 * m1-horas.js — Módulo 1: Gestão de Horas Extras
 *
 * Responsabilidades:
 *  - CRUD de colaboradores
 *  - Registro de horas extras por colaborador
 *  - Automação de período (dias úteis x fim de semana)
 *  - Horas devedoras por colaborador
 *  - Filtro por mês
 *  - Exportação/impressão do mês (somente saldo positivo)
 */

const M1 = (() => {

  /* ── Estado local ──────────────────────────────────────── */
  let employees = [];  // [{ id, name }]
  let hours     = {};  // { [employeeId]: [{ id, date, hours, period }] }
  let debts     = {};  // { [employeeId]: number }
  let activeEmployee = null;
  let filterMonth    = Utils.currentMonth();

  /* ── Seletores de DOM ──────────────────────────────────── */
  const $ = (id) => document.getElementById(id);

  /* ── Persistência ──────────────────────────────────────── */
  function save() {
    Storage.set(Storage.KEYS.EMPLOYEES, employees);
    Storage.set(Storage.KEYS.HOURS,     hours);
    Storage.set(Storage.KEYS.DEBTS,     debts);
  }

  function load() {
    employees = Storage.get(Storage.KEYS.EMPLOYEES, []);
    hours     = Storage.get(Storage.KEYS.HOURS,     {});
    debts     = Storage.get(Storage.KEYS.DEBTS,     {});
  }

  /* ── Helpers ───────────────────────────────────────────── */
  /**
   * Calcula o total de horas extras de um colaborador no mês filtrado.
   * @param {string} empId
   */
  function totalHoursInMonth(empId) {
    const records = (hours[empId] || []).filter(r => r.date && r.date.startsWith(filterMonth));
    return records.reduce((acc, r) => acc + Number(r.hours || 0), 0);
  }

  /**
   * Calcula o saldo líquido: horas_extras - horas_devedoras
   * @param {string} empId
   */
  function netBalance(empId) {
    return totalHoursInMonth(empId) - Number(debts[empId] || 0);
  }

  /* ── Renderização ──────────────────────────────────────── */

  /** Renderiza a aba lateral de colaboradores */
  function renderEmployeeList() {
    const list = $('m1-employee-list');
    if (!list) return;

    const session = Auth.getSession();
    let displayEmployees = employees;

    // Se for colaborador, só vê a si mesmo
    if (session && session.profile === 'colab') {
      displayEmployees = employees.filter(e => e.name === session.name);
    }

    if (displayEmployees.length === 0) {
      list.innerHTML = `<div class="empty-state" style="padding:16px">
        <i class="fa-solid fa-users"></i>
        <p>Nenhum colaborador</p>
      </div>`;
      return;
    }

    list.innerHTML = displayEmployees.map(emp => {
      const balance = netBalance(emp.id);
      const cls = balance > 0 ? 'text-success' : balance < 0 ? 'text-danger' : 'text-muted';
      const isActive = activeEmployee === emp.id;
      const isMaster = Auth.isMaster();
      
      return `
        <div class="m1-emp-item ${isActive ? 'active' : ''}"
             data-emp-id="${emp.id}" onclick="M1.selectEmployee('${emp.id}')">
          <div class="m1-emp-avatar">${Utils.esc(emp.name).charAt(0).toUpperCase()}</div>
          <div class="m1-emp-info">
            <div class="m1-emp-name">${Utils.esc(emp.name)}</div>
            <div class="m1-emp-bal ${cls}">${Utils.num(balance, 2)}h líquidas</div>
          </div>
          ${isMaster ? `
          <button class="btn btn-xs btn-ghost btn-icon" title="Remover"
                  onclick="event.stopPropagation(); M1.removeEmployee('${emp.id}')">
            <i class="fa-solid fa-xmark"></i>
          </button>` : ''}
        </div>
      `;
    }).join('');
  }

  /** Renderiza o painel de horas do colaborador ativo */
  function renderHoursPanel() {
    const panel = $('m1-hours-panel');
    const emptyState = $('m1-empty');
    if (!panel || !emptyState) return;

    if (!activeEmployee) {
      panel.classList.add('hidden');
      emptyState.classList.remove('hidden');
      return;
    }

    panel.classList.remove('hidden');
    emptyState.classList.add('hidden');

    const emp = employees.find(e => e.id === activeEmployee);
    if (!emp) return;

    // Cabeçalho do painel
    $('m1-panel-name').textContent = emp.name;

    // Horas devedoras
    $('m1-debt-input').value = debts[emp.id] || 0;

    // Filtro de mês
    $('m1-month-filter').value = filterMonth;

    // Stats
    const total   = totalHoursInMonth(emp.id);
    const debt    = Number(debts[emp.id] || 0);
    const balance = total - debt;

    $('m1-stat-total').textContent   = `${Utils.num(total, 2)}h`;
    $('m1-stat-debt').textContent    = `${Utils.num(debt, 2)}h`;
    $('m1-stat-balance').textContent = `${Utils.num(balance, 2)}h`;

    const balanceCard = $('m1-stat-balance-card');
    balanceCard.className = `stat-card ${balance > 0 ? 'accent' : balance < 0 ? 'danger' : ''}`;

    // Visibilidade de campos Master
    const isMaster = Auth.isMaster();
    document.querySelectorAll('#m1-hours-panel .master-only').forEach(el => {
      el.classList.toggle('hidden', !isMaster);
    });
    
    // Tabela
    renderHoursTable();
  }

  /** Renderiza a tabela de registros de horas */
  function renderHoursTable() {
    const tbody = $('m1-hours-tbody');
    if (!tbody || !activeEmployee) return;

    const records = (hours[activeEmployee] || [])
      .filter(r => r.date && r.date.startsWith(filterMonth))
      .sort((a, b) => a.date.localeCompare(b.date));

    if (records.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="empty-state">
        <i class="fa-regular fa-calendar-xmark"></i>
        <p>Nenhum registro em ${Utils.fmtMonth(filterMonth)}</p>
      </td></tr>`;
      return;
    }

    tbody.innerHTML = records.map(r => {
      const isWeekend = Utils.dayType(r.date) === 'weekend';
      const badge = isWeekend
        ? `<span class="badge badge-warning">Final de Semana</span>`
        : `<span class="badge badge-info">Dia Útil</span>`;

      return `
        <tr>
          <td>${Utils.fmtDate(r.date)}</td>
          <td class="font-mono">${Utils.num(r.hours, 2)}h</td>
          <td>${badge}</td>
          <td class="font-mono text-sm">${Utils.esc(r.period)}</td>
          <td>
            <div class="flex gap-2">
              <button class="btn btn-xs btn-secondary" onclick="M1.editRecord('${r.id}')">
                <i class="fa-solid fa-pen"></i>
              </button>
              <button class="btn btn-xs btn-danger" onclick="M1.removeRecord('${r.id}')">
                <i class="fa-solid fa-trash"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  /* ── Formulário de adição de horas ────────────────────── */

  /** Ao mudar a data, atualiza automaticamente o campo de período */
  function onDateChange() {
    const dateInput  = $('m1-rec-date');
    const hoursInput = $('m1-rec-hours');
    const periodInput = $('m1-rec-period');
    const periodField = $('m1-period-field');

    if (!dateInput || !periodInput) return;

    const date  = dateInput.value;
    const hrsVal = parseFloat(hoursInput.value) || 0;

    if (Utils.dayType(date) === 'weekday') {
      periodInput.readOnly = true;
      periodInput.value    = hrsVal > 0 ? Utils.calcPeriod(hrsVal) : '16:00 ÀS —';
      periodField.querySelector('label').textContent = 'Período (automático)';
    } else {
      periodInput.readOnly = false;
      periodInput.value    = '';
      periodField.querySelector('label').textContent = 'Período (manual)';
    }
  }

  /** Ao mudar as horas, recalcula o período se for dia útil */
  function onHoursChange() {
    const dateInput   = $('m1-rec-date');
    const hoursInput  = $('m1-rec-hours');
    const periodInput = $('m1-rec-period');
    if (!dateInput || !periodInput) return;

    if (dateInput.value && Utils.dayType(dateInput.value) === 'weekday') {
      const hrs = parseFloat(hoursInput.value) || 0;
      periodInput.value = hrs > 0 ? Utils.calcPeriod(hrs) : '16:00 ÀS —';
    }
  }

  /* ── API Pública ───────────────────────────────────────── */

  function addEmployee() {
    const input = $('m1-new-employee');
    const name  = input.value.trim();
    if (!name) { Toast.error('Digite o nome do colaborador.'); return; }
    if (employees.some(e => e.name.toLowerCase() === name.toLowerCase())) {
      Toast.error('Colaborador já cadastrado.'); return;
    }
    const emp = { id: Utils.uid(), name };
    employees.push(emp);
    hours[emp.id] = [];
    debts[emp.id] = 0;
    save();
    input.value = '';
    selectEmployee(emp.id);
    renderEmployeeList();
    Toast.success(`"${name}" adicionado(a).`);
  }

  function removeEmployee(id) {
    const emp = employees.find(e => e.id === id);
    if (!emp) return;
    Modal.confirm({
      title: 'Remover Colaborador',
      body: `<p>Remover <strong>${Utils.esc(emp.name)}</strong> e todos os registros de horas?</p>
             <p class="text-sm text-muted mt-2">Esta ação não pode ser desfeita.</p>`,
      confirmText: 'Remover',
      confirmClass: 'btn-danger',
      onConfirm() {
        employees = employees.filter(e => e.id !== id);
        delete hours[id];
        delete debts[id];
        if (activeEmployee === id) {
          activeEmployee = employees.length > 0 ? employees[0].id : null;
        }
        save();
        renderEmployeeList();
        renderHoursPanel();
        Toast.success('Colaborador removido.');
      }
    });
  }

  function selectEmployee(id) {
    activeEmployee = id;
    renderEmployeeList();
    renderHoursPanel();
  }

  function saveDebt() {
    if (!activeEmployee) return;
    const val = parseFloat($('m1-debt-input').value) || 0;
    debts[activeEmployee] = val;
    save();
    renderEmployeeList();
    renderHoursPanel();
    Toast.success('Horas devedoras salvas.');
  }

  function onFilterChange() {
    filterMonth = $('m1-month-filter').value;
    renderHoursPanel();
  }

  let _editingRecordId = null;

  function openAddRecord() {
    _editingRecordId = null;
    $('m1-rec-modal-title').textContent = 'Adicionar Horas Extras';
    $('m1-rec-date').value  = '';
    $('m1-rec-hours').value = '';
    $('m1-rec-period').value = '';
    $('m1-rec-period').readOnly = true;
    $('modal-record').classList.add('open');
  }

  function editRecord(id) {
    if (!activeEmployee) return;
    const record = (hours[activeEmployee] || []).find(r => r.id === id);
    if (!record) return;
    _editingRecordId = id;
    $('m1-rec-modal-title').textContent = 'Editar Registro';
    $('m1-rec-date').value   = record.date;
    $('m1-rec-hours').value  = record.hours;
    $('m1-rec-period').value = record.period;

    const isWeekend = Utils.dayType(record.date) === 'weekend';
    $('m1-rec-period').readOnly = !isWeekend;
    $('modal-record').classList.add('open');
  }

  function closeRecordModal() {
    $('modal-record').classList.remove('open');
    _editingRecordId = null;
  }

  function saveRecord() {
    const date  = $('m1-rec-date').value;
    const hrs   = parseFloat($('m1-rec-hours').value);
    const period = $('m1-rec-period').value.trim();

    if (!date)         { Toast.error('Selecione a data.'); return; }
    if (isNaN(hrs) || hrs <= 0) { Toast.error('Informe as horas (ex: 1.5).'); return; }
    if (!period)       { Toast.error('Informe o período.'); return; }

    if (!hours[activeEmployee]) hours[activeEmployee] = [];

    if (_editingRecordId) {
      const idx = hours[activeEmployee].findIndex(r => r.id === _editingRecordId);
      if (idx !== -1) {
        hours[activeEmployee][idx] = { ...hours[activeEmployee][idx], date, hours: hrs, period };
      }
    } else {
      hours[activeEmployee].push({ id: Utils.uid(), date, hours: hrs, period });
    }

    save();
    Logger.log(`${_editingRecordId ? 'Editou' : 'Adicionou'} registro de horas para ${employees.find(e => e.id === activeEmployee)?.name}`);
    closeRecordModal();
    renderEmployeeList();
    renderHoursPanel();
    Toast.success(_editingRecordId ? 'Registro atualizado.' : 'Horas registradas.');
  }

  function removeRecord(id) {
    if (!activeEmployee) return;
    Modal.confirm({
      title: 'Remover Registro',
      body: '<p>Deseja remover este registro de horas?</p>',
      confirmText: 'Remover',
      onConfirm() {
        hours[activeEmployee] = (hours[activeEmployee] || []).filter(r => r.id !== id);
        save();
        renderEmployeeList();
        renderHoursPanel();
        Toast.success('Registro removido.');
      }
    });
  }

  /** Gera tela de impressão do mês — somente colaboradores com saldo positivo */
  function printMonth() {
    const positiveEmployees = employees.filter(emp => netBalance(emp.id) > 0);

    if (positiveEmployees.length === 0) {
      Toast.info('Nenhum colaborador com saldo positivo em ' + Utils.fmtMonth(filterMonth) + '.');
      return;
    }

    const rows = positiveEmployees.map(emp => {
      const empHours = (hours[emp.id] || [])
        .filter(r => r.date && r.date.startsWith(filterMonth))
        .sort((a, b) => a.date.localeCompare(b.date));

      const recordRows = empHours.map(r => `
        <tr>
          <td>${Utils.fmtDate(r.date)}</td>
          <td>${Utils.num(r.hours, 2)}h</td>
          <td>${Utils.dayType(r.date) === 'weekend' ? 'Fim de Semana' : 'Dia Útil'}</td>
          <td>${Utils.esc(r.period)}</td>
        </tr>
      `).join('');

      return `
        <div class="emp-block">
          <h3>${Utils.esc(emp.name)}</h3>
          <table>
            <thead><tr><th>Data</th><th>Horas</th><th>Tipo</th><th>Período</th></tr></thead>
            <tbody>${recordRows}</tbody>
          </table>
          <div class="summary">
            <span>Total: <strong>${Utils.num(totalHoursInMonth(emp.id), 2)}h</strong></span>
            <span>Devedoras: <strong>${Utils.num(debts[emp.id] || 0, 2)}h</strong></span>
            <span>Saldo líquido: <strong>${Utils.num(netBalance(emp.id), 2)}h</strong></span>
          </div>
        </div>
      `;
    }).join('');

    const win = window.open('', '_blank');
    win.document.write(`<!DOCTYPE html><html lang="pt-BR"><head>
      <meta charset="UTF-8"/>
      <title>Horas Extras — ${Utils.fmtMonth(filterMonth)}</title>
      <style>
        body { font-family: 'Courier New', Courier, monospace; padding: 40px; color: #000; background: #fff; line-height: 1.2; }
        h1   { font-size: 18px; text-transform: uppercase; border-bottom: 2px solid #000; padding-bottom: 5px; margin-bottom: 5px; }
        h2   { font-size: 14px; margin-bottom: 30px; font-weight: bold; }
        .emp-block { margin-bottom: 40px; border: 1px solid #000; padding: 15px; page-break-inside: avoid; }
        .emp-name { font-size: 16px; font-weight: bold; margin-bottom: 10px; text-transform: uppercase; }
        table  { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 15px; }
        th, td { padding: 5px 8px; text-align: left; border: 1px solid #000; }
        th     { background: #eee; font-weight: bold; text-transform: uppercase; }
        .summary { display: flex; justify-content: flex-end; gap: 30px; font-size: 12px; font-weight: bold; border-top: 1px dashed #000; padding-top: 10px; }
        @media print { body { padding: 0; } .emp-block { border: 1px solid #000; } }
      </style>
    </head><body>
      <h1>Folha de Registros - Horas Extras</h1>
      <h2>Mês de Referência: ${Utils.fmtMonth(filterMonth)}</h2>
      ${rows}
      <div style="margin-top: 50px; font-size: 10px; text-align: center; color: #666;">
        Relatório gerado em ${new Date().toLocaleString('pt-BR')} - Hub Interno
      </div>
      <script>window.onload = () => { window.print(); }<\/script>
    </body></html>`);
    win.document.close();
    Logger.log('Exportou relatório formal de horas');
  }

  /* ── Inicialização ─────────────────────────────────────── */
  function init() {
    load();

    // Bind eventos do formulário de colaborador
    const addBtn = $('m1-add-employee-btn');
    if (addBtn) addBtn.addEventListener('click', addEmployee);

    const empInput = $('m1-new-employee');
    if (empInput) {
      empInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') addEmployee(); });
    }

    // Bind data/horas para automação de período
    const dateInput  = $('m1-rec-date');
    const hoursInput = $('m1-rec-hours');
    if (dateInput)  dateInput.addEventListener('change',  onDateChange);
    if (hoursInput) hoursInput.addEventListener('input',  onHoursChange);

    // Bind salvar registro
    const saveRecBtn = $('m1-save-record-btn');
    if (saveRecBtn) saveRecBtn.addEventListener('click', saveRecord);

    // Bind modal cancelar
    const cancelRecBtn = $('m1-cancel-record-btn');
    if (cancelRecBtn) cancelRecBtn.addEventListener('click', closeRecordModal);

    // Bind adicionar registro
    const addRecBtn = $('m1-add-record-btn');
    if (addRecBtn) addRecBtn.addEventListener('click', openAddRecord);

    // Bind salvar dívida
    const debtBtn = $('m1-save-debt-btn');
    if (debtBtn) debtBtn.addEventListener('click', saveDebt);

    // Bind filtro de mês
    const monthFilter = $('m1-month-filter');
    if (monthFilter) monthFilter.addEventListener('change', onFilterChange);

    // Bind imprimir
    const printBtn = $('m1-print-btn');
    if (printBtn) printBtn.addEventListener('click', printMonth);

    // Renderiza estado inicial
    renderEmployeeList();
    if (employees.length > 0 && !activeEmployee) {
      selectEmployee(employees[0].id);
    } else {
      renderHoursPanel();
    }

    // Reage a mudanças de rota
    document.addEventListener('route:change', (e) => {
      if (e.detail.route === 'm1') {
        renderEmployeeList();
        renderHoursPanel();
      }
    });
  }

  /* ── Exportação Pública ────────────────────────────────── */
  return {
    init,
    addEmployee,
    removeEmployee,
    selectEmployee,
    saveDebt,
    onFilterChange,
    openAddRecord,
    editRecord,
    closeRecordModal,
    saveRecord,
    removeRecord,
    printMonth,
    onDateChange,
    onHoursChange,
  };

})();
