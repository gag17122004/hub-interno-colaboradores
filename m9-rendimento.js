/**
 * m9-rendimento.js — Informe de Rendimento (Master Only)
 * Consolida M1 + M7 + M5 + M10 por colaborador
 * Gera relatório analítico via Claude Haiku on demand
 */
const M9 = (() => {
  const API_KEY_KEY = 'hub_api_key';
  const $ = id => document.getElementById(id);

  function getApiKey() {
    return Storage.get(API_KEY_KEY, '');
  }

  function saveApiKey() {
    const key = $('m9-api-key')?.value?.trim();
    if (!key) { Toast.error('Informe a chave API.'); return; }
    Storage.set(API_KEY_KEY, key);
    Toast.success('Chave API salva.');
    Logger.log('Configurou chave API Claude');
  }

  function getEmployeeData(name, dateFrom, dateTo) {
    // M1 — horas extras e ausências
    const timeRecords = Storage.get('hub_time_records', {});
    const employees   = Storage.get(Storage.KEYS.EMPLOYEES, []);
    const emp = employees.find(e => e.name === name);
    let overtimeH = 0, absencesCount = 0;
    if (emp) {
      const recs = (timeRecords[emp.id] || []).filter(r => r.date >= dateFrom && r.date <= dateTo);
      overtimeH = recs
        .filter(r => r.status === 'approved')
        .reduce((s, r) => s + (Number(r.overtimeMinutes) || 0) / 60, 0);
      const abs = Storage.get('hub_absences', {});
      absencesCount = (abs[emp.id] || []).filter(a => a.date >= dateFrom && a.date <= dateTo).length;
    }

    // M7 — produção
    const production = Storage.get(Storage.KEYS.PRODUCTION, [])
      .filter(r => r.operator === name && r.date >= dateFrom && r.date <= dateTo);
    const totalKg   = production.reduce((s, r) => s + (Number(r.weight)   || 0), 0);
    const totalPkgs = production.reduce((s, r) => s + (Number(r.packages) || 0), 0);
    const prodDays  = new Set(production.map(r => r.date)).size;

    // M5 — tarefas
    const tasks = Storage.get(Storage.KEYS.TASKS, [])
      .filter(t => t.owner === name && (!t.date || (t.date >= dateFrom && t.date <= dateTo)));

    // M10 — paradas de máquina
    const maint = Storage.get('hub_maintenance', [])
      .filter(m => m.type === 'operator' && m.createdBy === name && m.date >= dateFrom && m.date <= dateTo);
    const totalDowntime = maint.reduce((s, m) => s + (Number(m.downtime) || 0), 0);

    return { name, overtimeH, absencesCount, totalKg, totalPkgs, prodDays, tasks: tasks.length, stops: maint.length, totalDowntime };
  }

  function buildSummary(data, dateFrom, dateTo) {
    return data.map(d =>
      `=== ${d.name} ===\n` +
      `Período: ${Utils.fmtDate(dateFrom)} a ${Utils.fmtDate(dateTo)}\n` +
      `Horas extras aprovadas: ${Utils.num(d.overtimeH, 2)}h\n` +
      `Ausências no período: ${d.absencesCount}\n` +
      `Produção total: ${Utils.num(d.totalKg, 2)} kg / ${d.totalPkgs.toLocaleString('pt-BR')} pacotes em ${d.prodDays} dias\n` +
      `Média diária: ${d.prodDays > 0 ? Utils.num(d.totalKg / d.prodDays, 2) : '0.00'} kg/dia\n` +
      `Tarefas registradas: ${d.tasks}\n` +
      `Paradas de máquina registradas: ${d.stops} (total ${Utils.num(d.totalDowntime, 0)} min)`
    ).join('\n\n');
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
    const apiKey = getApiKey();
    if (!apiKey) { Toast.error('Configure a chave API primeiro.'); return; }
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
      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 2048,
          messages: [{
            role: 'user',
            content: `Você é analista de RH de uma fábrica de embalagens plásticas (sacos de lixo e envelopes). Analise os dados de desempenho abaixo e gere um relatório analítico em português, claro e profissional. Destaque pontos fortes, pontos de atenção e sugira ações concretas para o gestor. Use formatação markdown com seções claras.\n\n${summary}`
          }]
        })
      });
      const json = await resp.json();
      if (json.error) throw new Error(json.error.message);
      const text = json.content?.[0]?.text || '';
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
    const employees = Storage.get(Storage.KEYS.EMPLOYEES, []);
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
    $('m9-save-key-btn')?.addEventListener('click', saveApiKey);
    $('m9-generate-btn')?.addEventListener('click', generateReport);

    const saved = getApiKey();
    if (saved && $('m9-api-key')) $('m9-api-key').value = saved;

    const today    = new Date().toISOString().split('T')[0];
    const firstDay = Utils.currentMonth() + '-01';
    if ($('m9-date-from')) $('m9-date-from').value = firstDay;
    if ($('m9-date-to'))   $('m9-date-to').value   = today;

    renderEmployeeCheckboxes();

    document.addEventListener('route:change', e => {
      if (e.detail.route !== 'm9') return;
      const saved = getApiKey();
      if (saved && $('m9-api-key')) $('m9-api-key').value = saved;
      renderEmployeeCheckboxes();
    });
  }

  return { init };
})();
