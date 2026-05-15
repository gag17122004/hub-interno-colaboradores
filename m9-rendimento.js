/**
 * m9-rendimento.js — Informe de Rendimento (Master Only)
 * Consolida M1 + M7 + M5 + M10 + anotações manuais por colaborador
 * Gera relatório analítico via Groq on demand
 */
const M9 = (() => {
  const NOTES_KEY = 'hub_m9_notes';
  const $ = id => document.getElementById(id);

  /* ── Anotações manuais ── */
  function getNotes() {
    const data = Storage.getSync(NOTES_KEY, []);
    return Array.isArray(data) ? data : [];
  }

  function saveNote() {
    const empName = $('m9-note-emp')?.value?.trim();
    const date    = $('m9-note-date')?.value;
    const text    = $('m9-note-text')?.value?.trim();
    if (!empName || !date || !text) { Toast.error('Preencha colaborador, data e ocorrência.'); return; }

    const notes = getNotes();
    notes.push({ id: Date.now(), empName, date, text });
    Storage.setSync(NOTES_KEY, notes);
    if ($('m9-note-text'))  $('m9-note-text').value  = '';
    Toast.success('Anotação salva.');
    renderNotes();
    Logger.log(`Anotação M9: ${empName} — ${text.substring(0, 40)}`);
  }

  function deleteNote(id) {
    const notes = getNotes().filter(n => n.id !== id);
    Storage.setSync(NOTES_KEY, notes);
    renderNotes();
  }

  function renderNotes() {
    const container = $('m9-notes-list');
    if (!container) return;
    const notes = getNotes();
    if (notes.length === 0) {
      container.innerHTML = '<p class="text-xs text-muted" style="padding:8px 0">Nenhuma anotação ainda.</p>';
      return;
    }
    const sorted = [...notes].sort((a, b) => b.date.localeCompare(a.date));
    container.innerHTML = sorted.map(n => `
      <div style="display:flex;gap:10px;align-items:flex-start;padding:10px 0;border-bottom:1px solid var(--border)">
        <div style="flex:1;min-width:0">
          <div style="display:flex;gap:8px;align-items:center;margin-bottom:3px">
            <span style="font-size:12px;font-weight:600;color:var(--accent)">${Utils.esc(n.empName)}</span>
            <span style="font-size:11px;color:var(--text-sec)">${Utils.fmtDate(n.date)}</span>
          </div>
          <div style="font-size:13px;color:var(--text);line-height:1.5">${Utils.esc(n.text)}</div>
        </div>
        <button class="btn btn-xs btn-danger" onclick="M9.deleteNote(${n.id})" title="Excluir">
          <i class="fa-solid fa-times"></i>
        </button>
      </div>`).join('');
  }

  function populateNoteEmpSelect() {
    const sel = $('m9-note-emp');
    if (!sel) return;
    const employees = Storage.getSync(Storage.KEYS.EMPLOYEES, []);
    sel.innerHTML = `<option value="">Selecione o colaborador...</option>` +
      employees.map(e => `<option value="${Utils.esc(e.name)}">${Utils.esc(e.name)}</option>`).join('');
  }

  function getEmployeeData(name, dateFrom, dateTo) {
    // M1 — horas extras e ausências
    const timeRecords = Storage.getSync('hub_time_records', {});
    const employees   = Storage.getSync(Storage.KEYS.EMPLOYEES, []);
    const emp = employees.find(e => e.name === name);
    let overtimeH = 0, absencesCount = 0;
    if (emp) {
      const recs = (timeRecords[emp.id] || []).filter(r => r.date >= dateFrom && r.date <= dateTo);
      overtimeH = recs
        .filter(r => r.status === 'approved')
        .reduce((s, r) => s + (Number(r.overtimeMinutes) || 0) / 60, 0);
      const abs = Storage.getSync('hub_absences', {});
      absencesCount = (abs[emp.id] || []).filter(a => a.date >= dateFrom && a.date <= dateTo).length;
    }

    // M7 — produção
    const production = Storage.getSync(Storage.KEYS.PRODUCTION, [])
      .filter(r => r.operator === name && r.date >= dateFrom && r.date <= dateTo);
    const totalKg   = production.reduce((s, r) => s + (Number(r.weight)   || 0), 0);
    const totalPkgs = production.reduce((s, r) => s + (Number(r.packages) || 0), 0);
    const prodDays  = new Set(production.map(r => r.date)).size;

    // M5 — tarefas
    const tasks = Storage.getSync(Storage.KEYS.TASKS, [])
      .filter(t => t.owner === name && (!t.date || (t.date >= dateFrom && t.date <= dateTo)));

    // M10 — paradas de máquina
    const maint = Storage.getSync('hub_maintenance', [])
      .filter(m => m.type === 'operator' && m.createdBy === name && m.date >= dateFrom && m.date <= dateTo);
    const totalDowntime = maint.reduce((s, m) => s + (Number(m.downtime) || 0), 0);

    // Anotações manuais do M9
    const notes = getNotes()
      .filter(n => n.empName === name && n.date >= dateFrom && n.date <= dateTo)
      .sort((a, b) => a.date.localeCompare(b.date));

    return { name, overtimeH, absencesCount, totalKg, totalPkgs, prodDays, tasks: tasks.length, stops: maint.length, totalDowntime, notes };
  }

  function buildSummary(data, dateFrom, dateTo) {
    return data.map(d => {
      let block =
        `=== ${d.name} ===\n` +
        `Período: ${Utils.fmtDate(dateFrom)} a ${Utils.fmtDate(dateTo)}\n` +
        `Horas extras aprovadas: ${Utils.num(d.overtimeH, 2)}h\n` +
        `Ausências no período: ${d.absencesCount}\n` +
        `Produção total: ${Utils.num(d.totalKg, 2)} kg / ${d.totalPkgs.toLocaleString('pt-BR')} pacotes em ${d.prodDays} dias\n` +
        `Média diária: ${d.prodDays > 0 ? Utils.num(d.totalKg / d.prodDays, 2) : '0.00'} kg/dia\n` +
        `Tarefas registradas: ${d.tasks}\n` +
        `Paradas de máquina registradas: ${d.stops} (total ${Utils.num(d.totalDowntime, 0)} min)`;

      if (d.notes.length > 0) {
        block += `\n\nAnotações e ocorrências registradas (${d.notes.length}):\n` +
          d.notes.map(n => `  [${Utils.fmtDate(n.date)}] ${n.text}`).join('\n');
      }

      return block;
    }).join('\n\n');
  }

  function mdToHtml(md) {
    return md
      .replace(/^### (.+)$/gm, '<h3 style="margin:14px 0 6px;color:var(--text);font-size:14px">$1</h3>')
      .replace(/^## (.+)$/gm, '<h2 style="margin:18px 0 8px;color:var(--accent);font-size:15px">$1</h2>')
      .replace(/^# (.+)$/gm,  '<h1 style="margin:20px 0 10px;color:var(--accent);font-size:17px">$1</h1>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/^- (.+)$/gm, '<li style="margin:3px 0 3px 20px;list-style:disc">$1</li>')
      .replace(/\n\n/g, '</p><p style="margin:8px 0">')
      .replace(/\n/g, '<br>');
  }

  async function generateReport() {
    const dateFrom = $('m9-date-from')?.value;
    const dateTo   = $('m9-date-to')?.value;
    if (!dateFrom || !dateTo) { Toast.error('Informe o período.'); return; }

    const checkboxes = document.querySelectorAll('.m9-emp-check:checked');
    if (checkboxes.length === 0) { Toast.error('Selecione ao menos um colaborador.'); return; }
    const names = [...checkboxes].map(cb => cb.value);
    const data  = names.map(n => getEmployeeData(n, dateFrom, dateTo));
    const summary = buildSummary(data, dateFrom, dateTo);

    const btn = $('m9-generate-btn');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Gerando...'; }
    $('m9-report-container')?.classList.add('hidden');

    try {
      const text = await GroqAI.call([{
        role: 'user',
        content: `Você é analista de RH de uma fábrica de embalagens plásticas (sacos de lixo e envelopes). Analise os dados de desempenho abaixo e gere um relatório analítico em português, claro e profissional. Destaque pontos fortes, pontos de atenção e sugira ações concretas para o gestor. Use formatação markdown com seções claras.\n\n${summary}`
      }]);
      const output = $('m9-report-output');
      if (output) output.innerHTML = mdToHtml(text);
      $('m9-report-container')?.classList.remove('hidden');
      Logger.log(`Gerou relatório de rendimento: ${names.join(', ')}`);
    } catch (err) {
      Toast.error('Erro ao chamar API: ' + err.message);
    } finally {
      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Gerar Relatório'; }
    }
  }

  function renderEmployeeCheckboxes() {
    const container = $('m9-emp-list');
    if (!container) return;
    const employees = Storage.getSync(Storage.KEYS.EMPLOYEES, []);
    if (employees.length === 0) {
      container.innerHTML = '<p class="text-xs text-muted">Nenhum colaborador cadastrado em M1.</p>';
      return;
    }
    container.innerHTML = employees.map(e => `
      <label style="display:flex;align-items:center;gap:8px;padding:6px 0;cursor:pointer;font-size:13px">
        <input type="checkbox" class="m9-emp-check" value="${Utils.esc(e.name)}" checked
          style="width:16px;height:16px;accent-color:var(--accent)" />
        ${Utils.esc(e.name)}
      </label>`).join('');
  }

  function init() {
    $('m9-generate-btn')?.addEventListener('click', generateReport);
    $('m9-save-note-btn')?.addEventListener('click', saveNote);

    const today    = new Date().toISOString().split('T')[0];
    const firstDay = Utils.currentMonth() + '-01';
    if ($('m9-date-from')) $('m9-date-from').value = firstDay;
    if ($('m9-date-to'))   $('m9-date-to').value   = today;
    if ($('m9-note-date')) $('m9-note-date').value  = today;

    populateNoteEmpSelect();
    renderNotes();
    renderEmployeeCheckboxes();

    document.addEventListener('route:change', e => {
      if (e.detail.route !== 'm9') return;
      // Recarrega datas padrão ao abrir o módulo
      const today2    = new Date().toISOString().split('T')[0];
      const firstDay2 = Utils.currentMonth() + '-01';
      if ($('m9-date-from') && !$('m9-date-from').value) $('m9-date-from').value = firstDay2;
      if ($('m9-date-to')   && !$('m9-date-to').value)   $('m9-date-to').value   = today2;
      populateNoteEmpSelect();
      renderNotes();
      renderEmployeeCheckboxes();
    });
  }

  return { init, deleteNote };
})();
window.M9 = M9;
