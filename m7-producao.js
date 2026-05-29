/**
 * m7-producao.js v2 — Controle de Produção
 *
 * records   = [{ id, date, operator, machine, prodType, micron, color, weight, size, startTime, endTime, packages, cuts, notes }]
 * prodGoals = [{ id, prodType, size, kgPerDay }]
 */

const M7 = (() => {

  const GOALS_KEY = 'hub_prod_goals';
  const $ = id => document.getElementById(id);

  let records    = [];
  let prodGoals  = [];
  let activeTab  = 'records';
  let histMode   = 'daily';
  let _editingId     = null;
  let _editingGoalId = null;

  let machines = ['01 (Saco)', '02 (Envelope)', '03 (Saco)'];
  let microns  = ['0.03', '0.035', '0.04'];
  let colors   = ['Preto'];

  /* ── Persistência ── */
  function save() {
    Storage.setSync(Storage.KEYS.PRODUCTION, records);
    Storage.setSync(GOALS_KEY, prodGoals);
  }

  function load() {
    records   = Storage.getSync(Storage.KEYS.PRODUCTION, []);
    prodGoals = Storage.getSync(GOALS_KEY, []);
  }

  /* ── Helpers de data ── */
  function getWeekStart(dateStr) {
    const d = new Date(dateStr + 'T12:00:00');
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    return d.toISOString().split('T')[0];
  }

  function fmtWeek(ws) {
    const start = new Date(ws + 'T12:00:00');
    const end   = new Date(ws + 'T12:00:00');
    end.setDate(end.getDate() + 6);
    return `${start.toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit' })} – ${end.toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit' })}`;
  }

  /* ── Cálculos ── */
  function calcGeneralStats() {
    const totalKg   = records.reduce((s, r) => s + (Number(r.weight)   || 0), 0);
    const totalPkgs = records.reduce((s, r) => s + (Number(r.packages) || 0), 0);
    const days      = new Set(records.map(r => r.date)).size || 1;
    const avgKg     = totalKg   / days;
    const avgPkgs   = totalPkgs / days;

    const todayStr  = new Date().toISOString().split('T')[0];
    const weekStr   = getWeekStart(todayStr);
    const todayRecs = records.filter(r => r.date === todayStr);
    const weekRecs  = records.filter(r => r.date >= weekStr);

    const todayKg   = todayRecs.reduce((s, r) => s + (Number(r.weight)   || 0), 0);
    const todayPkgs = todayRecs.reduce((s, r) => s + (Number(r.packages) || 0), 0);
    const weekKg    = weekRecs.reduce((s, r) => s + (Number(r.weight)    || 0), 0);
    const weekPkgs  = weekRecs.reduce((s, r) => s + (Number(r.packages)  || 0), 0);

    return { totalKg, totalPkgs, days, avgKg, avgPkgs, todayKg, todayPkgs, weekKg, weekPkgs };
  }

  function getDailyData() {
    const byDay = {};
    records.forEach(r => {
      if (!byDay[r.date]) byDay[r.date] = { date: r.date, totalKg: 0, totalPkgs: 0, rows: [] };
      byDay[r.date].totalKg   += Number(r.weight)   || 0;
      byDay[r.date].totalPkgs += Number(r.packages) || 0;
      byDay[r.date].rows.push(r);
    });
    return Object.values(byDay).sort((a, b) => b.date.localeCompare(a.date));
  }

  function getWeeklyData() {
    const byWeek = {};
    records.forEach(r => {
      const ws = getWeekStart(r.date);
      if (!byWeek[ws]) byWeek[ws] = { weekStart: ws, totalKg: 0, totalPkgs: 0, days: new Set() };
      byWeek[ws].totalKg   += Number(r.weight)   || 0;
      byWeek[ws].totalPkgs += Number(r.packages) || 0;
      byWeek[ws].days.add(r.date);
    });
    return Object.values(byWeek).sort((a, b) => b.weekStart.localeCompare(a.weekStart));
  }

  /* Médias por máquina e por tamanho dentro de cada máquina */
  function getMachineAverages() {
    const byMachine = {};
    records.forEach(r => {
      const machine = (r.machine || 'Desconhecida').trim();
      const size    = (r.size || '').trim() || '—';
      if (!byMachine[machine]) byMachine[machine] = { totalKg: 0, days: new Set(), bySizes: {} };
      const m = byMachine[machine];
      m.totalKg += Number(r.weight) || 0;
      m.days.add(r.date);
      if (!m.bySizes[size]) m.bySizes[size] = { totalKg: 0, days: new Set() };
      m.bySizes[size].totalKg += Number(r.weight) || 0;
      m.bySizes[size].days.add(r.date);
    });
    return Object.entries(byMachine)
      .map(([machine, m]) => ({
        machine,
        totalKg: m.totalKg,
        days:    m.days.size,
        avgKg:   m.days.size ? m.totalKg / m.days.size : 0,
        sizes:   Object.entries(m.bySizes)
          .map(([size, s]) => ({
            size,
            totalKg: s.totalKg,
            days:    s.days.size,
            avgKg:   s.days.size ? s.totalKg / s.days.size : 0,
          }))
          .sort((a, b) => b.avgKg - a.avgKg),
      }))
      .sort((a, b) => a.machine.localeCompare(b.machine));
  }

  function renderMachineAverages() {
    const el = $('m7-machine-averages');
    if (!el) return;
    const machineAvgs = getMachineAverages();
    if (!machineAvgs.length) { el.innerHTML = ''; return; }

    // Média geral diária (todos os dias com pelo menos 1 registro)
    const allDays  = new Set(records.map(r => r.date));
    const totalKg  = records.reduce((s, r) => s + (Number(r.weight) || 0), 0);
    const avgGeral = allDays.size ? totalKg / allDays.size : 0;

    el.innerHTML = `
      <!-- Média geral -->
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
        <i class="fa-solid fa-chart-line" style="color:var(--accent);font-size:13px"></i>
        <span style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--text-sec)">Médias de Produção</span>
        <span class="badge badge-info" style="margin-left:auto">Geral: ${Utils.num(avgGeral, 1)} kg/dia</span>
      </div>

      <!-- Cards por máquina -->
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px">
        ${machineAvgs.map(m => `
          <div style="background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:14px">
            <!-- Cabeçalho da máquina -->
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
              <div>
                <div style="font-size:13px;font-weight:700;color:var(--text)">
                  <i class="fa-solid fa-gears" style="color:var(--accent);font-size:11px;margin-right:5px"></i>
                  Máquina ${Utils.esc(m.machine)}
                </div>
                <div class="text-xs text-muted mt-1">${m.days} dia(s) com registro</div>
              </div>
              <div style="text-align:right">
                <div style="font-size:16px;font-weight:700;font-family:'DM Mono',monospace;color:var(--accent)">${Utils.num(m.avgKg, 1)}</div>
                <div class="text-xs text-muted">kg/dia</div>
              </div>
            </div>
            <!-- Breakdown por tamanho -->
            ${m.sizes.length > 1 ? `
            <div style="border-top:1px solid var(--border);padding-top:8px;display:flex;flex-direction:column;gap:5px">
              <div class="text-xs font-bold" style="color:var(--text-sec);text-transform:uppercase;letter-spacing:.05em;margin-bottom:2px">Por Tamanho</div>
              ${m.sizes.map(sz => `
                <div style="display:flex;align-items:center;justify-content:space-between;font-size:12px">
                  <span style="color:var(--text-sec)">${Utils.esc(sz.size)}</span>
                  <span class="font-mono font-bold">${Utils.num(sz.avgKg, 1)} <span style="font-weight:400;color:var(--text-sec)">kg/dia</span></span>
                </div>`).join('')}
            </div>` : m.sizes.length === 1 ? `
            <div style="border-top:1px solid var(--border);padding-top:6px">
              <div style="font-size:11px;color:var(--text-sec)">Tamanho: <strong>${Utils.esc(m.sizes[0].size)}</strong></div>
            </div>` : ''}
          </div>`).join('')}
      </div>`;
  }

  function getGoalForDay(date, prodType, size) {
    const g = prodGoals.find(g =>
      g.prodType === prodType &&
      (!g.size || g.size.trim() === '' || g.size.trim() === size?.trim())
    );
    return g ? Number(g.kgPerDay) : null;
  }

  function getTotalGoalForDay() {
    return prodGoals.reduce((s, g) => s + (Number(g.kgPerDay) || 0), 0);
  }

  function goalStatus(actual, goalKg) {
    if (!goalKg || goalKg <= 0) return null;
    const pct = (actual / goalKg) * 100;
    if (pct >= 120) return { label: `${Utils.num(pct,0)}% — Acima`, color: '#2dd4bf', icon: 'fa-arrow-up' };
    if (pct < 80)  return { label: `${Utils.num(pct,0)}% — Abaixo`, color: '#ef4444', icon: 'fa-arrow-down' };
    return { label: `${Utils.num(pct,0)}% — OK`, color: '#22c55e', icon: 'fa-check' };
  }

  /* ── Renders ── */
  function renderStats() {
    const masterView = $('m7-master-view');
    if (masterView) masterView.classList.toggle('hidden', !Auth.isMaster());
    if (!Auth.isMaster()) return;

    const s = calcGeneralStats();
    const totalGoal = getTotalGoalForDay();

    [
      ['m7-stat-total-kg',   `${Utils.num(s.totalKg, 1)} kg`],
      ['m7-stat-total-pkgs', s.totalPkgs.toLocaleString('pt-BR')],
      ['m7-stat-avg-kg',     `${Utils.num(s.avgKg, 1)} kg/dia`],
      ['m7-stat-today-kg',   `${Utils.num(s.todayKg, 1)} kg`],
      ['m7-stat-week-kg',    `${Utils.num(s.weekKg, 1)} kg`],
      ['m7-stat-week-pkgs',  s.weekPkgs.toLocaleString('pt-BR')],
    ].forEach(([id, val]) => { const el = $(id); if (el) el.textContent = val; });

    // Barra de progresso hoje vs meta
    const bar = $('m7-goal-progress-bar');
    const barLabel = $('m7-goal-progress-label');
    if (bar && totalGoal > 0) {
      const pct = Math.min(100, (s.todayKg / totalGoal) * 100);
      bar.style.width = pct + '%';
      bar.style.background = pct >= 100 ? '#2dd4bf' : pct >= 80 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#ef4444';
      if (barLabel) barLabel.textContent = `Hoje: ${Utils.num(s.todayKg, 1)} kg / Meta: ${Utils.num(totalGoal, 1)} kg (${Utils.num(pct, 0)}%)`;
    } else if (bar) {
      bar.style.width = '0%';
      if (barLabel) barLabel.textContent = 'Nenhuma meta definida';
    }

    renderAlertBanner(s);
    renderMachineAverages();
  }

  function renderAlertBanner(s) {
    const banner = $('m7-alert-banner');
    const text   = $('m7-alert-text');
    if (!banner || !text) return;

    const totalGoal = getTotalGoalForDay();
    if (!totalGoal || totalGoal <= 0) { banner.classList.add('hidden'); return; }

    const todayStr  = new Date().toISOString().split('T')[0];
    const todayRecs = records.filter(r => r.date === todayStr);
    if (todayRecs.length === 0) { banner.classList.add('hidden'); return; }

    const pct = (s.todayKg / totalGoal) * 100;
    if (pct < 80) {
      banner.className = 'm7-alert danger';
      text.textContent = `Produção hoje (${Utils.num(s.todayKg,1)} kg) está ${Utils.num(100-pct,0)}% abaixo da meta diária (${Utils.num(totalGoal,1)} kg).`;
    } else if (pct >= 120) {
      banner.className = 'm7-alert success';
      text.textContent = `Produção hoje (${Utils.num(s.todayKg,1)} kg) está ${Utils.num(pct-100,0)}% acima da meta diária — excelente!`;
    } else {
      banner.classList.add('hidden'); return;
    }
    banner.classList.remove('hidden');
  }

  function setTab(tab) {
    activeTab = tab;
    ['records','history','goals'].forEach(t => {
      $(`m7-tab-${t}`)?.classList.toggle('active', activeTab === t);
      $(`m7-tabpanel-${t}`)?.classList.toggle('hidden', activeTab !== t);
    });
    if (tab === 'history') renderHistory();
    if (tab === 'goals')   renderGoalsTable();
  }

  function renderTable() {
    const tbody = $('m7-production-tbody');
    if (!tbody) return;
    const session  = Auth.getSession();
    const isMaster = Auth.isMaster();
    let display = isMaster ? [...records] : records.filter(r => r.operator === session?.name);
    display.sort((a, b) => ((b.date || '') + (b.startTime || '')).localeCompare((a.date || '') + (a.startTime || '')));

    if (display.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9" class="empty-state"><i class="fa-solid fa-industry"></i><p>Nenhum registro.</p></td></tr>`;
      return;
    }

    tbody.innerHTML = display.map(r => `
      <tr>
        <td class="font-mono text-xs">${Utils.fmtDate(r.date)}</td>
        <td><span class="badge badge-info">${Utils.esc(r.operator)}</span></td>
        <td class="font-mono text-xs">${Utils.esc(r.machine || '—')}</td>
        <td class="text-xs">${Utils.esc(r.prodType || '—')}</td>
        <td class="font-mono text-xs">${Utils.esc(r.size || '—')}</td>
        <td class="font-mono text-xs">${Utils.num(Number(r.weight), 2)} kg</td>
        <td class="font-mono font-bold text-accent">${Number(r.packages || 0).toLocaleString('pt-BR')}</td>
        <td class="font-mono text-xs">${r.startTime || '—'} ${r.endTime ? '→ ' + r.endTime : ''}</td>
        <td>
          <div class="flex gap-1">
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

  function renderHistory() {
    const container = $('m7-history-container');
    if (!container) return;

    if (histMode === 'daily') {
      const daily = getDailyData();
      if (daily.length === 0) {
        container.innerHTML = `<div class="empty-state" style="padding:32px"><p>Nenhum registro encontrado.</p></div>`;
        return;
      }
      const totalGoal = getTotalGoalForDay();
      container.innerHTML = `
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Kg Produzidos</th>
                <th>Pacotes</th>
                <th>Registros</th>
                ${totalGoal > 0 ? '<th>Meta kg/dia</th><th>% Meta</th>' : ''}
                <th>Detalhe</th>
              </tr>
            </thead>
            <tbody>
              ${daily.map(d => {
                const gs = goalStatus(d.totalKg, totalGoal);
                const statusHtml = gs
                  ? `<span style="color:${gs.color};font-size:12px;font-weight:600"><i class="fa-solid ${gs.icon}"></i> ${gs.label}</span>`
                  : '—';
                const dayNames = [...new Set(d.rows.map(r => r.operator))].join(', ');
                return `<tr>
                  <td class="font-mono">${Utils.fmtDate(d.date)}</td>
                  <td class="font-mono font-bold text-accent">${Utils.num(d.totalKg, 2)} kg</td>
                  <td class="font-mono">${d.totalPkgs.toLocaleString('pt-BR')}</td>
                  <td class="text-xs text-muted">${d.rows.length} reg. — ${Utils.esc(dayNames)}</td>
                  ${totalGoal > 0 ? `<td class="font-mono">${Utils.num(totalGoal,1)} kg</td><td>${statusHtml}</td>` : ''}
                  <td class="text-xs text-muted">${[...new Set(d.rows.map(r => `${r.prodType} ${r.size||''}`))].join(' | ')}</td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>`;
    } else {
      const weekly = getWeeklyData();
      if (weekly.length === 0) {
        container.innerHTML = `<div class="empty-state" style="padding:32px"><p>Nenhum registro encontrado.</p></div>`;
        return;
      }
      const totalGoal = getTotalGoalForDay();
      container.innerHTML = `
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Semana</th>
                <th>Dias com prod.</th>
                <th>Total kg</th>
                <th>Total pacotes</th>
                <th>Média kg/dia</th>
                ${totalGoal > 0 ? '<th>Meta semanal (5 dias)</th><th>Status</th>' : ''}
              </tr>
            </thead>
            <tbody>
              ${weekly.map(w => {
                const avgKg = w.totalKg / (w.days.size || 1);
                const weekGoal = totalGoal * 5;
                const gs = goalStatus(w.totalKg, weekGoal);
                const statusHtml = gs
                  ? `<span style="color:${gs.color};font-size:12px;font-weight:600"><i class="fa-solid ${gs.icon}"></i> ${gs.label}</span>`
                  : '—';
                return `<tr>
                  <td class="font-mono text-sm">${fmtWeek(w.weekStart)}</td>
                  <td class="text-center">${w.days.size}</td>
                  <td class="font-mono font-bold text-accent">${Utils.num(w.totalKg, 2)} kg</td>
                  <td class="font-mono">${w.totalPkgs.toLocaleString('pt-BR')}</td>
                  <td class="font-mono">${Utils.num(avgKg, 2)} kg</td>
                  ${totalGoal > 0 ? `<td class="font-mono">${Utils.num(weekGoal,1)} kg</td><td>${statusHtml}</td>` : ''}
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>`;
    }
  }

  function renderGoalsTable() {
    const tbody = $('m7-goals-tbody');
    if (!tbody) return;
    if (prodGoals.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="empty-state"><p>Nenhuma meta definida. Clique em "Adicionar Meta".</p></td></tr>`;
      return;
    }
    tbody.innerHTML = prodGoals.map(g => `
      <tr>
        <td>${Utils.esc(g.prodType)}</td>
        <td class="font-mono">${Utils.esc(g.size || '(qualquer)')}</td>
        <td class="font-mono font-bold text-accent">${Utils.num(Number(g.kgPerDay), 1)} kg/dia</td>
        <td>
          <div class="flex gap-1">
            <button class="btn btn-xs btn-secondary" onclick="M7.editGoal('${g.id}')">
              <i class="fa-solid fa-pen"></i>
            </button>
            <button class="btn btn-xs btn-danger" onclick="M7.removeGoal('${g.id}')">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </td>
      </tr>`).join('');
  }

  /* ── Modal: Registro ── */
  function buildSelect(selectId, list) {
    const sel = $(selectId);
    if (!sel) return;
    const current = sel.value;
    sel.innerHTML = list.map(v => `<option value="${Utils.esc(v)}">${Utils.esc(v)}</option>`).join('')
      + `<option value="__other__">+ Adicionar nova...</option>`;
    if (list.includes(current)) sel.value = current;
  }

  function handleSelectOther(selectId, list, label) {
    const sel = $(selectId);
    if (!sel || sel.value !== '__other__') return;
    sel.value = list[0] || ''; // reverte enquanto modal está aberto
    Modal.input({
      title: `Nova opção: ${label}`,
      placeholder: label,
      confirmText: 'Adicionar',
      onConfirm: (val) => {
        const newVal = (val || '').trim();
        if (!newVal) return;
        list.push(newVal);
        buildSelect(selectId, list);
        sel.value = newVal;
      }
    });
  }

  function populateModal() {
    buildSelect('m7-machine', machines);
    buildSelect('m7-micron', microns);
    buildSelect('m7-color', colors);
    ['m7-machine','m7-micron','m7-color'].forEach(id => {
      const sel = $(id);
      if (!sel) return;
      const clone = sel.cloneNode(true);
      sel.parentNode.replaceChild(clone, sel);
      clone.addEventListener('change', () => {
        if (id === 'm7-machine') handleSelectOther(id, machines, 'Máquina');
        if (id === 'm7-micron')  handleSelectOther(id, microns,  'Micragem');
        if (id === 'm7-color')   handleSelectOther(id, colors,   'Cor');
      });
    });
    const dateEl = $('m7-date');
    if (dateEl && !dateEl.value) dateEl.value = new Date().toISOString().split('T')[0];
    const session = Auth.getSession();
    const opEl = $('m7-operator');
    if (opEl) { opEl.value = session?.name || ''; opEl.readOnly = !Auth.isMaster(); }
  }

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
    const session = Auth.getSession();
    if (!Auth.isMaster() && r.operator !== session?.name) {
      Toast.error('Você só pode editar seus próprios registros.'); return;
    }
    _editingId = id;
    $('modal-production-record-title').textContent = 'Editar Registro';
    populateModal();
    $('m7-date').value       = r.date;
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

  async function saveRecord() {
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

    const data = { date, operator, machine, prodType, micron, color, weight, size, startTime, endTime, packages, cuts, notes };

    if (_editingId) {
      const idx = records.findIndex(r => r.id === _editingId);
      if (idx !== -1) records[idx] = { ...records[idx], ...data };
      Logger.log(`Editou produção: ${packages} pacotes em ${date}`);
    } else {
      records.push({ id: Utils.uid(), ...data });
      Logger.log(`Registrou produção: ${packages} pacotes (${machine}) em ${date}`);
    }

    save(); closeModal(); renderStats(); renderTable();
    if (activeTab === 'history') renderHistory();
    Toast.success(_editingId ? 'Registro atualizado.' : 'Produção registrada.');
  }

  async function removeRecord(id) {
    const r = records.find(x => x.id === id);
    if (!r) return;
    Modal.confirm({
      title: 'Remover Registro',
      body: `<p>Remover registro de <strong>${r.packages} pacotes</strong> em ${Utils.fmtDate(r.date)}?</p>`,
      confirmText: 'Remover', confirmClass: 'btn-danger',
      async onConfirm() {
        records = records.filter(x => x.id !== id);
        save(); renderStats(); renderTable();
        if (activeTab === 'history') renderHistory();
        Logger.log(`Removeu registro de produção de ${Utils.fmtDate(r.date)}`);
        Toast.success('Registro removido.');
      }
    });
  }

  /* ── Modal: Metas ── */
  function openAddGoal() {
    _editingGoalId = null;
    $('m7-goal-modal-title').textContent = 'Nova Meta Diária';
    $('m7-goal-prodtype').value  = 'Saco de Lixo';
    $('m7-goal-size').value      = '';
    $('m7-goal-kgday').value     = '';
    $('modal-goal').classList.add('open');
  }

  function editGoal(id) {
    const g = prodGoals.find(x => x.id === id);
    if (!g) return;
    _editingGoalId = id;
    $('m7-goal-modal-title').textContent = 'Editar Meta';
    $('m7-goal-prodtype').value  = g.prodType;
    $('m7-goal-size').value      = g.size || '';
    $('m7-goal-kgday').value     = g.kgPerDay;
    $('modal-goal').classList.add('open');
  }

  function closeGoalModal() {
    $('modal-goal').classList.remove('open');
    _editingGoalId = null;
  }

  async function saveGoal() {
    const prodType = $('m7-goal-prodtype').value;
    const size     = $('m7-goal-size').value.trim();
    const kgPerDay = parseFloat($('m7-goal-kgday').value);

    if (!prodType)              { Toast.error('Selecione o produto.'); return; }
    if (isNaN(kgPerDay) || kgPerDay <= 0) { Toast.error('Informe a meta em kg/dia.'); return; }

    if (_editingGoalId) {
      const idx = prodGoals.findIndex(g => g.id === _editingGoalId);
      if (idx !== -1) prodGoals[idx] = { ...prodGoals[idx], prodType, size, kgPerDay };
    } else {
      prodGoals.push({ id: Utils.uid(), prodType, size, kgPerDay });
    }

    save(); closeGoalModal(); renderGoalsTable(); renderStats();
    Logger.log(`${_editingGoalId ? 'Editou' : 'Definiu'} meta: ${Utils.num(kgPerDay,1)} kg/dia para ${prodType} ${size||''}`);
    Toast.success('Meta salva.');
  }

  async function removeGoal(id) {
    Modal.confirm({
      title: 'Remover Meta',
      body: '<p>Remover esta meta?</p>',
      confirmText: 'Remover', confirmClass: 'btn-danger',
      async onConfirm() {
        prodGoals = prodGoals.filter(g => g.id !== id);
        save(); renderGoalsTable(); renderStats();
        Toast.success('Meta removida.');
      }
    });
  }

  /* ── Toggle histórico ── */
  function setHistMode(mode) {
    histMode = mode;
    $('m7-hist-daily-btn')?.classList.toggle('active', mode === 'daily');
    $('m7-hist-week-btn')?.classList.toggle('active', mode === 'weekly');
    renderHistory();
  }

  /* ── Init ── */
  async function init() {
    await Storage.syncBatch([Storage.KEYS.PRODUCTION, GOALS_KEY]);
    load();

    Storage.subscribe(Storage.KEYS.PRODUCTION, data => { records = data ?? []; renderStats(); renderTable(); if (activeTab === 'history') renderHistory(); });
    Storage.subscribe(GOALS_KEY, data => { prodGoals = data ?? []; if (activeTab === 'goals') renderGoalsTable(); });

    $('m7-add-btn')?.addEventListener('click', openAdd);
    $('m7-save-btn')?.addEventListener('click', saveRecord);
    $('m7-cancel-btn')?.addEventListener('click', closeModal);
    $('m7-tab-records')?.addEventListener('click', () => setTab('records'));
    $('m7-tab-history')?.addEventListener('click', () => setTab('history'));
    $('m7-tab-goals')?.addEventListener('click',   () => setTab('goals'));
    $('m7-hist-daily-btn')?.addEventListener('click', () => setHistMode('daily'));
    $('m7-hist-week-btn')?.addEventListener('click',  () => setHistMode('weekly'));
    $('m7-add-goal-btn')?.addEventListener('click', openAddGoal);
    $('m7-save-goal-btn')?.addEventListener('click', saveGoal);
    $('m7-cancel-goal-btn')?.addEventListener('click', closeGoalModal);

    renderStats(); renderTable();

    document.addEventListener('route:change', async (e) => {
      if (e.detail.route !== 'm7') return;
      await Storage.syncBatch([Storage.KEYS.PRODUCTION, GOALS_KEY]);
      load(); renderStats(); renderTable();
      if (activeTab === 'history') renderHistory();
      if (activeTab === 'goals')   renderGoalsTable();
    });
  }

  return {
    init, openAdd, editRecord, removeRecord, saveRecord, closeModal,
    setTab, setHistMode,
    editGoal, removeGoal, openAddGoal, closeGoalModal, saveGoal,
  };

})();
window.M7 = M7;
