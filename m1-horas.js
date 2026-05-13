/**
 * m1-horas.js v2 — Ponto + Horas Extras
 *
 * timeRecords[empId] = [{ id, date, punch1-4, geo1-4, workedMinutes, overtimeMinutes, status, masterNote }]
 * absences[empId]    = [{ id, date, reason, obs, attachName, attachB64 }]
 * debts[empId]       = number (horas devedoras manuais)
 */

const M1 = (() => {

  const TRK = 'hub_time_records';
  const ABK = 'hub_absences';
  const $ = id => document.getElementById(id);

  let employees   = [];
  let timeRecords = {};
  let absences    = {};
  let debts       = {};
  let activeEmployee = null;
  let filterMonth    = Utils.currentMonth();
  let activeTab      = 'records';

  /* ── Persistência ── */
  function save() {
    Storage.set(Storage.KEYS.EMPLOYEES, employees);
    Storage.set(TRK, timeRecords);
    Storage.set(ABK, absences);
    Storage.set(Storage.KEYS.DEBTS, debts);
  }

  function load() {
    employees   = Storage.get(Storage.KEYS.EMPLOYEES, []);
    timeRecords = Storage.get(TRK, {});
    absences    = Storage.get(ABK, {});
    debts       = Storage.get(Storage.KEYS.DEBTS, {});

    // Migrar formato antigo (hub_hours)
    if (Object.keys(timeRecords).length === 0) {
      const oldHours = Storage.get(Storage.KEYS.HOURS, null);
      if (oldHours) {
        Object.keys(oldHours).forEach(empId => {
          timeRecords[empId] = (oldHours[empId] || []).map(r => ({
            id: r.id, date: r.date,
            punch1: '08:00', punch2: '12:00', punch3: '13:00',
            punch4: null, geo1: null, geo2: null, geo3: null, geo4: null,
            workedMinutes: 480 + Math.round(Number(r.hours || 0) * 60),
            overtimeMinutes: Math.round(Number(r.hours || 0) * 60),
            status: 'approved',
            masterNote: r.period ? `Migrado: ${r.period}` : 'Migrado do sistema anterior',
          }));
        });
        save();
      }
    }
  }

  /* ── Cálculos ── */
  function toMin(t) {
    if (!t) return 0;
    const [h, m] = t.split(':').map(Number);
    return h * 60 + (m || 0);
  }

  function calcWorked(r) {
    if (!r.punch1 || !r.punch4) return 0;
    const total = toMin(r.punch4) - toMin(r.punch1);
    const lunch = (r.punch2 && r.punch3)
      ? Math.max(60, toMin(r.punch3) - toMin(r.punch2))
      : 60;
    return Math.max(0, total - lunch);
  }

  function calcOvertime(r) {
    return Math.max(0, calcWorked(r) - 480);
  }

  function totalApprovedOT(empId) {
    return (timeRecords[empId] || [])
      .filter(r => r.status === 'approved' && r.date?.startsWith(filterMonth))
      .reduce((s, r) => s + (r.overtimeMinutes || 0), 0) / 60;
  }

  function netBalance(empId) {
    return totalApprovedOT(empId) - Number(debts[empId] || 0);
  }

  function fmtMin(min) {
    const h = Math.floor(Math.abs(min) / 60);
    const m = Math.abs(min) % 60;
    return m > 0 ? `${h}h ${m}min` : `${h}h`;
  }

  function geoLink(geo) {
    if (!geo?.lat) return null;
    return `https://maps.google.com/?q=${geo.lat},${geo.lng}`;
  }

  /* ── Geolocalização ── */
  function getGeo(cb) {
    if (!navigator.geolocation) { cb(null); return; }
    navigator.geolocation.getCurrentPosition(
      p => cb({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => cb(null),
      { timeout: 8000 }
    );
  }

  /* ── Ponto ── */
  function punch(punchNum) {
    const session = Auth.getSession();
    if (!session) return;

    let empId = activeEmployee;
    if (session.profile === 'colab') {
      const myEmp = employees.find(e => e.name === session.name);
      if (!myEmp) { Toast.error('Colaborador não encontrado. Peça ao master para cadastrá-lo.'); return; }
      empId = myEmp.id;
    }
    if (!empId) { Toast.error('Nenhum colaborador selecionado.'); return; }

    const today = new Date().toISOString().split('T')[0];
    const now   = new Date().toTimeString().slice(0, 5);

    getGeo(geo => {
      if (!timeRecords[empId]) timeRecords[empId] = [];
      let rec = timeRecords[empId].find(r => r.date === today && r.status !== 'rejected');

      if (!rec) {
        if (punchNum !== 1) { Toast.error('Registre primeiro a entrada.'); return; }
        rec = {
          id: Utils.uid(), date: today,
          punch1: null, punch2: null, punch3: null, punch4: null,
          geo1: null, geo2: null, geo3: null, geo4: null,
          workedMinutes: 0, overtimeMinutes: 0, status: 'pending', masterNote: ''
        };
        timeRecords[empId].unshift(rec);
      }

      const labels = ['Entrada', 'Saída Almoço', 'Retorno Almoço', 'Saída'];
      if (punchNum === 1 && rec.punch1) { Toast.error('Entrada já registrada hoje.'); return; }
      if (punchNum === 2 && !rec.punch1) { Toast.error('Registre a entrada primeiro.'); return; }
      if (punchNum === 2 && rec.punch2) { Toast.error('Saída almoço já registrada.'); return; }
      if (punchNum === 3 && !rec.punch2) { Toast.error('Registre a saída do almoço primeiro.'); return; }
      if (punchNum === 3 && rec.punch3) { Toast.error('Retorno almoço já registrado.'); return; }
      if (punchNum === 4 && !rec.punch3) { Toast.error('Registre o retorno do almoço primeiro.'); return; }
      if (punchNum === 4 && rec.punch4) { Toast.error('Saída já registrada hoje.'); return; }

      rec[`punch${punchNum}`] = now;
      rec[`geo${punchNum}`]   = geo;

      if (rec.punch1 && rec.punch4) {
        rec.workedMinutes   = calcWorked(rec);
        rec.overtimeMinutes = calcOvertime(rec);
      }

      save();
      Logger.log(`Ponto ${labels[punchNum - 1]} — ${session.name} — ${now}${geo ? '' : ' (sem geo)'}`);
      renderPunchPanel(empId);
      renderEmployeeList();
      Toast.success(`${labels[punchNum - 1]}: ${now}${geo ? '' : ' (localização negada)'}`);
    });
  }

  /* ── Renders ── */
  function renderEmployeeList() {
    const list = $('m1-employee-list');
    if (!list) return;
    const session = Auth.getSession();
    let displayEmps = employees;
    if (session?.profile === 'colab') {
      displayEmps = employees.filter(e => e.name === session.name);
    }
    if (displayEmps.length === 0) {
      list.innerHTML = `<div class="empty-state" style="padding:16px"><i class="fa-solid fa-users"></i><p>Nenhum colaborador</p></div>`;
      return;
    }
    list.innerHTML = displayEmps.map(emp => {
      const balance = netBalance(emp.id);
      const cls = balance > 0 ? 'text-success' : balance < 0 ? 'text-danger' : 'text-muted';
      const pendCt = (timeRecords[emp.id] || []).filter(r => r.status === 'pending').length;
      return `
        <div class="m1-emp-item ${activeEmployee === emp.id ? 'active' : ''}" onclick="M1.selectEmployee('${emp.id}')">
          <div class="m1-emp-avatar">${Utils.esc(emp.name).charAt(0).toUpperCase()}</div>
          <div class="m1-emp-info">
            <div class="m1-emp-name">${Utils.esc(emp.name)}</div>
            <div class="m1-emp-bal ${cls}">${Utils.num(balance, 2)}h saldo</div>
          </div>
          ${pendCt > 0 && Auth.isMaster() ? `<span class="badge badge-warning" style="font-size:10px;padding:2px 6px">${pendCt}</span>` : ''}
          ${Auth.isMaster() ? `<button class="btn btn-xs btn-ghost btn-icon" onclick="event.stopPropagation();M1.removeEmployee('${emp.id}')"><i class="fa-solid fa-xmark"></i></button>` : ''}
        </div>`;
    }).join('');
  }

  function renderPanel() {
    const panel = $('m1-hours-panel');
    const empty = $('m1-empty');
    if (!panel || !empty) return;

    if (!activeEmployee) {
      panel.classList.add('hidden');
      empty.classList.remove('hidden');
      return;
    }
    panel.classList.remove('hidden');
    empty.classList.add('hidden');

    const emp = employees.find(e => e.id === activeEmployee);
    if (!emp) return;

    $('m1-panel-name').textContent = emp.name;
    $('m1-month-filter').value     = filterMonth;
    $('m1-debt-input').value       = debts[emp.id] || 0;

    const ot      = totalApprovedOT(emp.id);
    const debt    = Number(debts[emp.id] || 0);
    const balance = ot - debt;
    $('m1-stat-ot').textContent      = `${Utils.num(ot, 2)}h`;
    $('m1-stat-debt').textContent    = `${Utils.num(debt, 2)}h`;
    $('m1-stat-balance').textContent = `${Utils.num(balance, 2)}h`;
    $('m1-stat-balance-card').className = `stat-card ${balance > 0 ? 'accent' : balance < 0 ? 'danger' : ''}`;

    const pendCt = (timeRecords[activeEmployee] || []).filter(r => r.status === 'pending').length;
    const badge = $('m1-tab-pending-badge');
    if (badge) badge.textContent = pendCt > 0 ? pendCt : '';

    // Mostrar ponto hoje se for o próprio colaborador ou master
    const session = Auth.getSession();
    const punchCard = $('m1-punch-card');
    if (punchCard) {
      const isOwnRecord = session?.profile === 'master' || (session?.name && emp.name === session.name);
      punchCard.classList.toggle('hidden', !isOwnRecord);
      if (isOwnRecord) renderPunchPanel(activeEmployee);
    }

    // Visibilidade das abas master
    document.querySelectorAll('#m1-hours-panel .master-tab').forEach(el => {
      el.classList.toggle('hidden', !Auth.isMaster());
    });

    renderActiveTab();
  }

  function renderActiveTab() {
    ['records', 'pending', 'absences'].forEach(t => {
      $(`m1-tab-${t}`)?.classList.toggle('active', activeTab === t);
      $(`m1-tabpanel-${t}`)?.classList.toggle('hidden', activeTab !== t);
    });
    if (activeTab === 'records')  renderRecordsTable();
    if (activeTab === 'pending')  renderPendingTable();
    if (activeTab === 'absences') renderAbsencesTable();
  }

  function renderPunchPanel(empId) {
    const container = $('m1-punch-container');
    if (!container) return;
    const today = new Date().toISOString().split('T')[0];
    const rec = (timeRecords[empId] || []).find(r => r.date === today && r.status !== 'rejected');
    const punches = [
      { num: 1, label: 'Entrada',        icon: 'fa-right-to-bracket',  key: 'punch1' },
      { num: 2, label: 'Saída Almoço',   icon: 'fa-utensils',          key: 'punch2' },
      { num: 3, label: 'Retorno Almoço', icon: 'fa-rotate-left',       key: 'punch3' },
      { num: 4, label: 'Saída',          icon: 'fa-right-from-bracket', key: 'punch4' },
    ];
    container.innerHTML = punches.map(p => {
      const done = rec && rec[p.key];
      const geo  = done && rec[`geo${p.num}`];
      return `
        <div class="m1-punch-btn-wrap">
          <button class="btn ${done ? 'btn-ghost' : 'btn-primary'} m1-punch-btn" ${done ? 'disabled' : ''}
                  onclick="M1.punch(${p.num})">
            <i class="fa-solid ${p.icon}"></i>
          </button>
          <div class="m1-punch-label">${p.label}</div>
          <div class="m1-punch-time ${done ? 'text-accent' : 'text-muted'}">${done ? rec[p.key] : '—:—'}</div>
          ${geo ? `<a href="${geoLink(geo)}" target="_blank" class="m1-punch-geo"><i class="fa-solid fa-location-dot"></i></a>` : ''}
        </div>`;
    }).join('');

    if (rec?.punch1 && rec?.punch4) {
      const wMin  = calcWorked(rec);
      const otMin = calcOvertime(rec);
      const statusColors = { pending: 'var(--warning, #f59e0b)', approved: 'var(--success, #22c55e)', rejected: 'var(--danger, #ef4444)' };
      container.insertAdjacentHTML('beforeend', `
        <div class="m1-punch-summary">
          <span>Trabalhado: <strong class="font-mono">${fmtMin(wMin)}</strong></span>
          ${otMin > 0 ? `<span style="color:${statusColors[rec.status] || ''}">Extra: <strong>${fmtMin(otMin)}</strong>
            <span class="badge" style="font-size:10px;background:${statusColors[rec.status]}20;color:${statusColors[rec.status]}">${
              rec.status === 'approved' ? 'Aprovado' : rec.status === 'rejected' ? 'Rejeitado' : 'Aguardando'}</span>
          </span>` : '<span class="text-muted text-xs">Sem horas extras hoje</span>'}
        </div>`);
    }
  }

  function renderRecordsTable() {
    const tbody = $('m1-records-tbody');
    if (!tbody || !activeEmployee) return;
    const records = (timeRecords[activeEmployee] || [])
      .filter(r => r.date?.startsWith(filterMonth))
      .sort((a, b) => b.date.localeCompare(a.date));
    if (records.length === 0) {
      tbody.innerHTML = `<tr><td colspan="10" class="empty-state"><i class="fa-regular fa-calendar-xmark"></i><p>Nenhum registro em ${Utils.fmtMonth(filterMonth)}.</p></td></tr>`;
      return;
    }
    const isMaster = Auth.isMaster();
    tbody.innerHTML = records.map(r => {
      const statusBadge = {
        pending:  `<span class="badge badge-warning">Pendente</span>`,
        approved: `<span class="badge badge-success">Aprovado</span>`,
        rejected: `<span class="badge badge-danger">Rejeitado</span>`,
      }[r.status] || '';
      const geoIcons = [1,2,3,4].map(n => {
        const g = r[`geo${n}`];
        return g ? `<a href="${geoLink(g)}" target="_blank" title="P${n}" style="margin-right:3px;font-size:11px"><i class="fa-solid fa-location-dot"></i>${n}</a>` : '';
      }).filter(Boolean).join('');
      return `
        <tr>
          <td>${Utils.fmtDate(r.date)}</td>
          <td class="font-mono text-sm">${r.punch1 || '—'}</td>
          <td class="font-mono text-sm">${r.punch2 || '—'}</td>
          <td class="font-mono text-sm">${r.punch3 || '—'}</td>
          <td class="font-mono text-sm">${r.punch4 || '—'}</td>
          <td class="font-mono text-sm">${r.workedMinutes ? fmtMin(r.workedMinutes) : '—'}</td>
          <td class="font-mono text-sm" style="color:var(--accent)">${r.overtimeMinutes > 0 ? fmtMin(r.overtimeMinutes) : '—'}</td>
          <td>${statusBadge}</td>
          ${isMaster ? `<td>${geoIcons || '<span class="text-muted text-xs">—</span>'}</td>` : ''}
          ${isMaster ? `<td><div class="flex gap-1">
            <button class="btn btn-xs btn-secondary" onclick="M1.openEditRecord('${r.id}')"><i class="fa-solid fa-pen"></i></button>
            <button class="btn btn-xs btn-danger" onclick="M1.removeRecord('${r.id}')"><i class="fa-solid fa-trash"></i></button>
          </div></td>` : ''}
        </tr>`;
    }).join('');
  }

  function renderPendingTable() {
    const tbody = $('m1-pending-tbody');
    if (!tbody) return;
    const pending = (timeRecords[activeEmployee] || []).filter(r => r.status === 'pending');
    if (pending.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="empty-state"><i class="fa-solid fa-circle-check"></i><p>Nenhum registro pendente.</p></td></tr>`;
      return;
    }
    tbody.innerHTML = pending.map(r => {
      const wMin  = calcWorked(r);
      const otMin = calcOvertime(r);
      const batidas = [r.punch1, r.punch2, r.punch3, r.punch4].filter(Boolean).join(' → ');
      return `
        <tr>
          <td>${Utils.fmtDate(r.date)}</td>
          <td class="font-mono text-sm">${batidas || '—'}</td>
          <td class="font-mono">${wMin ? fmtMin(wMin) : '—'}</td>
          <td class="font-mono" style="color:var(--accent)">${otMin > 0 ? fmtMin(otMin) : '—'}</td>
          <td><div class="flex gap-1">
            <button class="btn btn-xs btn-primary" onclick="M1.approveRecord('${r.id}')"><i class="fa-solid fa-check"></i> Aprovar</button>
            <button class="btn btn-xs btn-secondary" onclick="M1.openEditRecord('${r.id}')"><i class="fa-solid fa-pen"></i> Editar</button>
            <button class="btn btn-xs btn-danger" onclick="M1.rejectRecord('${r.id}')"><i class="fa-solid fa-xmark"></i></button>
          </div></td>
        </tr>`;
    }).join('');
  }

  function renderAbsencesTable() {
    const tbody = $('m1-absences-tbody');
    if (!tbody || !activeEmployee) return;
    const abs = (absences[activeEmployee] || [])
      .filter(a => a.date?.startsWith(filterMonth))
      .sort((a, b) => b.date.localeCompare(a.date));
    if (abs.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="empty-state"><p>Nenhuma ausência em ${Utils.fmtMonth(filterMonth)}.</p></td></tr>`;
      return;
    }
    const reasonLabels = { justified: 'Falta Justificada', medical: 'Atestado Médico', unjustified: 'Falta Injustificada', dayoff: 'Folga' };
    tbody.innerHTML = abs.map(a => `
      <tr>
        <td>${Utils.fmtDate(a.date)}</td>
        <td><span class="badge badge-muted">${reasonLabels[a.reason] || a.reason}</span></td>
        <td class="text-sm">${Utils.esc(a.obs || '—')}</td>
        <td>${a.attachB64 ? `<button class="btn btn-xs btn-ghost" onclick="M1.downloadAttach('${a.id}')"><i class="fa-solid fa-paperclip"></i> ${Utils.esc(a.attachName || 'Anexo')}</button>` : '<span class="text-muted text-xs">—</span>'}</td>
        <td><button class="btn btn-xs btn-danger" onclick="M1.removeAbsence('${a.id}')"><i class="fa-solid fa-trash"></i></button></td>
      </tr>`).join('');
  }

  /* ── Aprovação ── */
  function approveRecord(recId) {
    if (!activeEmployee) return;
    const rec = (timeRecords[activeEmployee] || []).find(r => r.id === recId);
    if (!rec) return;
    rec.workedMinutes   = calcWorked(rec);
    rec.overtimeMinutes = calcOvertime(rec);
    rec.status = 'approved';
    save();
    Logger.log(`Aprovou registro de ponto de ${employees.find(e => e.id === activeEmployee)?.name} — ${rec.date}`);
    renderPanel();
    renderEmployeeList();
    Toast.success('Registro aprovado.');
  }

  function rejectRecord(recId) {
    if (!activeEmployee) return;
    const rec = (timeRecords[activeEmployee] || []).find(r => r.id === recId);
    if (!rec) return;
    rec.status = 'rejected';
    save();
    Logger.log(`Rejeitou registro de ponto de ${employees.find(e => e.id === activeEmployee)?.name} — ${rec.date}`);
    renderPanel();
    renderEmployeeList();
    Toast.info('Registro rejeitado.');
  }

  /* ── Modal: editar registro ── */
  let _editingRecId = null;

  function openEditRecord(recId) {
    const rec = (timeRecords[activeEmployee] || []).find(r => r.id === recId);
    if (!rec) return;
    _editingRecId = recId;
    $('m1-edit-date').value  = rec.date;
    $('m1-edit-p1').value    = rec.punch1 || '';
    $('m1-edit-p2').value    = rec.punch2 || '';
    $('m1-edit-p3').value    = rec.punch3 || '';
    $('m1-edit-p4').value    = rec.punch4 || '';
    $('m1-edit-note').value  = rec.masterNote || '';
    $('modal-edit-record').classList.add('open');
  }

  function closeEditRecord() {
    $('modal-edit-record').classList.remove('open');
    _editingRecId = null;
  }

  function saveEditRecord() {
    const rec = (timeRecords[activeEmployee] || []).find(r => r.id === _editingRecId);
    if (!rec) return;
    rec.date       = $('m1-edit-date').value || rec.date;
    rec.punch1     = $('m1-edit-p1').value  || null;
    rec.punch2     = $('m1-edit-p2').value  || null;
    rec.punch3     = $('m1-edit-p3').value  || null;
    rec.punch4     = $('m1-edit-p4').value  || null;
    rec.masterNote = $('m1-edit-note').value.trim();
    rec.workedMinutes   = calcWorked(rec);
    rec.overtimeMinutes = calcOvertime(rec);
    rec.status = 'approved';
    save();
    closeEditRecord();
    renderPanel();
    renderEmployeeList();
    Toast.success('Registro editado e aprovado.');
  }

  function removeRecord(recId) {
    if (!activeEmployee) return;
    Modal.confirm({
      title: 'Remover Registro',
      body: '<p>Remover este registro de ponto?</p>',
      confirmText: 'Remover',
      onConfirm() {
        timeRecords[activeEmployee] = (timeRecords[activeEmployee] || []).filter(r => r.id !== recId);
        save();
        renderPanel();
        Toast.success('Registro removido.');
      }
    });
  }

  /* ── Modal: ausência ── */
  let _absAttach = null;

  function openAddAbsence() {
    _absAttach = null;
    $('m1-abs-date').value   = '';
    $('m1-abs-reason').value = 'justified';
    $('m1-abs-obs').value    = '';
    $('m1-abs-attach-name').textContent = 'Nenhum arquivo';
    $('modal-absence').classList.add('open');
  }

  function closeAbsenceModal() {
    $('modal-absence').classList.remove('open');
    _absAttach = null;
  }

  function onAbsAttach(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      _absAttach = { name: file.name, b64: ev.target.result };
      $('m1-abs-attach-name').textContent = file.name;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  function saveAbsence() {
    const date   = $('m1-abs-date').value;
    const reason = $('m1-abs-reason').value;
    const obs    = $('m1-abs-obs').value.trim();
    if (!date)   { Toast.error('Selecione a data.'); return; }
    if (!reason) { Toast.error('Selecione o motivo.'); return; }
    if (!absences[activeEmployee]) absences[activeEmployee] = [];
    absences[activeEmployee].push({
      id: Utils.uid(), date, reason, obs,
      attachName: _absAttach?.name || null,
      attachB64:  _absAttach?.b64  || null,
    });
    save();
    closeAbsenceModal();
    renderAbsencesTable();
    Logger.log(`Ausência marcada — ${employees.find(e => e.id === activeEmployee)?.name} — ${date}`);
    Toast.success('Ausência registrada.');
  }

  function removeAbsence(absId) {
    Modal.confirm({
      title: 'Remover Ausência',
      body: '<p>Remover esta ausência?</p>',
      confirmText: 'Remover',
      onConfirm() {
        absences[activeEmployee] = (absences[activeEmployee] || []).filter(a => a.id !== absId);
        save();
        renderAbsencesTable();
        Toast.success('Ausência removida.');
      }
    });
  }

  function downloadAttach(absId) {
    const ab = (absences[activeEmployee] || []).find(a => a.id === absId);
    if (!ab?.attachB64) return;
    const a = document.createElement('a');
    a.href     = ab.attachB64;
    a.download = ab.attachName || 'anexo';
    a.click();
  }

  /* ── Colaboradores ── */
  function addEmployee() {
    const input = $('m1-new-employee');
    const name  = input?.value.trim();
    if (!name) { Toast.error('Digite o nome do colaborador.'); return; }
    if (employees.some(e => e.name.toLowerCase() === name.toLowerCase())) {
      Toast.error('Colaborador já cadastrado.'); return;
    }
    const emp = { id: Utils.uid(), name };
    employees.push(emp);
    timeRecords[emp.id] = [];
    absences[emp.id]    = [];
    debts[emp.id]       = 0;
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
      body: `<p>Remover <strong>${Utils.esc(emp.name)}</strong> e todos os registros?</p><p class="text-sm text-muted mt-2">Esta ação não pode ser desfeita.</p>`,
      confirmText: 'Remover',
      confirmClass: 'btn-danger',
      onConfirm() {
        employees = employees.filter(e => e.id !== id);
        delete timeRecords[id];
        delete absences[id];
        delete debts[id];
        if (activeEmployee === id) activeEmployee = employees[0]?.id || null;
        save();
        renderEmployeeList();
        renderPanel();
        Toast.success('Colaborador removido.');
      }
    });
  }

  function selectEmployee(id) {
    activeEmployee = id;
    renderEmployeeList();
    renderPanel();
  }

  function saveDebt() {
    if (!activeEmployee) return;
    const val = parseFloat($('m1-debt-input').value) || 0;
    debts[activeEmployee] = val;
    save();
    renderPanel();
    renderEmployeeList();
    Toast.success('Horas devedoras salvas.');
  }

  function onFilterChange() {
    filterMonth = $('m1-month-filter').value;
    renderPanel();
  }

  function setTab(tab) {
    activeTab = tab;
    renderActiveTab();
  }

  /* ── Exportação ── */
  function printMonth() {
    const positiveEmps = employees.filter(e => netBalance(e.id) > 0);
    if (positiveEmps.length === 0) {
      Toast.info('Nenhum colaborador com saldo positivo em ' + Utils.fmtMonth(filterMonth) + '.'); return;
    }
    const rows = positiveEmps.map(emp => {
      const recs = (timeRecords[emp.id] || [])
        .filter(r => r.date?.startsWith(filterMonth) && r.status === 'approved' && r.overtimeMinutes > 0)
        .sort((a, b) => a.date.localeCompare(b.date));
      const tableRows = recs.map(r => `
        <tr>
          <td>${Utils.fmtDate(r.date)}</td>
          <td>${fmtMin(r.overtimeMinutes || 0)}</td>
          <td>${[r.punch1, r.punch2, r.punch3, r.punch4].filter(Boolean).join(' / ')}</td>
        </tr>`).join('');
      const ot      = totalApprovedOT(emp.id);
      const debt    = Number(debts[emp.id] || 0);
      const balance = ot - debt;
      return `
        <div class="emp-block">
          <div class="emp-name">${Utils.esc(emp.name)}</div>
          <table>
            <thead><tr><th>DATA</th><th>HORAS</th><th>PERÍODO(S)</th></tr></thead>
            <tbody>${tableRows}</tbody>
          </table>
          <div class="summary">
            <span>Horas extras: <strong>${Utils.num(ot, 2)}h</strong></span>
            <span>Devedoras: <strong>${Utils.num(debt, 2)}h</strong></span>
            <span>Saldo líquido: <strong>${Utils.num(balance, 2)}h</strong></span>
          </div>
        </div>`;
    }).join('');

    const win = window.open('', '_blank');
    win.document.write(`<!DOCTYPE html><html lang="pt-BR"><head>
      <meta charset="UTF-8"/>
      <title>Horas Extras — ${Utils.fmtMonth(filterMonth)}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 32px; color:#000; background:#fff; }
        h1   { font-size:15px; text-transform:uppercase; letter-spacing:.05em; border-bottom:2px solid #000; padding-bottom:6px; margin-bottom:4px; }
        h2   { font-size:12px; color:#555; margin-bottom:28px; font-weight:400; }
        .emp-block { margin-bottom:32px; page-break-inside:avoid; }
        .emp-name  { font-size:14px; font-weight:bold; font-style:italic; margin-bottom:8px; }
        table { width:100%; border-collapse:collapse; font-size:12px; margin-bottom:10px; }
        th { background:#1e293b; color:#fff; font-weight:700; padding:7px 10px; text-align:left; border:1px solid #1e293b; text-transform:uppercase; letter-spacing:.04em; }
        td { padding:6px 10px; border:1px solid #94a3b8; }
        tr:nth-child(odd) td  { background:#ffffff; }
        tr:nth-child(even) td { background:#dbeafe; }
        .summary { display:flex; justify-content:flex-end; gap:24px; font-size:11px; padding-top:6px; border-top:1px dashed #94a3b8; }
        @media print { body { padding:12px; } }
      </style>
    </head><body>
      <h1>Horas Extras</h1>
      <h2>Mês de Referência: ${Utils.fmtMonth(filterMonth)}</h2>
      ${rows}
      <script>window.onload = () => { window.print(); }<\/script>
    </body></html>`);
    win.document.close();
    Logger.log('Exportou relatório de horas — ' + Utils.fmtMonth(filterMonth));
  }

  /* ── Init ── */
  function init() {
    load();

    const session = Auth.getSession();
    if (session?.profile === 'colab') {
      const myEmp = employees.find(e => e.name === session.name);
      if (myEmp) activeEmployee = myEmp.id;
    } else if (employees.length > 0) {
      activeEmployee = employees[0].id;
    }

    $('m1-add-employee-btn')?.addEventListener('click', addEmployee);
    $('m1-new-employee')?.addEventListener('keydown', e => { if (e.key === 'Enter') addEmployee(); });
    $('m1-save-debt-btn')?.addEventListener('click', saveDebt);
    $('m1-month-filter')?.addEventListener('change', onFilterChange);
    $('m1-print-btn')?.addEventListener('click', printMonth);
    $('m1-tab-records')?.addEventListener('click', () => setTab('records'));
    $('m1-tab-pending')?.addEventListener('click', () => setTab('pending'));
    $('m1-tab-absences')?.addEventListener('click', () => setTab('absences'));
    $('m1-save-edit-btn')?.addEventListener('click', saveEditRecord);
    $('m1-cancel-edit-btn')?.addEventListener('click', closeEditRecord);
    $('m1-add-absence-btn')?.addEventListener('click', openAddAbsence);
    $('m1-save-absence-btn')?.addEventListener('click', saveAbsence);
    $('m1-cancel-absence-btn')?.addEventListener('click', closeAbsenceModal);
    $('m1-abs-attach-btn')?.addEventListener('click', () => $('m1-abs-attach-input')?.click());
    $('m1-abs-attach-input')?.addEventListener('change', onAbsAttach);

    renderEmployeeList();
    renderPanel();
    if (activeEmployee) renderPunchPanel(activeEmployee);

    document.addEventListener('route:change', e => {
      if (e.detail.route !== 'm1') return;
      const s = Auth.getSession();
      if (s?.profile === 'colab') {
        const myEmp = employees.find(emp => emp.name === s.name);
        if (myEmp) activeEmployee = myEmp.id;
      }
      renderEmployeeList();
      renderPanel();
      if (activeEmployee) renderPunchPanel(activeEmployee);
    });
  }

  return {
    init, addEmployee, removeEmployee, selectEmployee,
    saveDebt, onFilterChange, setTab, punch,
    approveRecord, rejectRecord, openEditRecord, closeEditRecord, saveEditRecord, removeRecord,
    openAddAbsence, closeAbsenceModal, saveAbsence, removeAbsence, downloadAttach, printMonth,
  };
})();
