/**
 * meu-espaco.js — Visão consolidada do colaborador (rota: "me")
 * Mostra horas do mês, tarefas próprias e produção da semana.
 * Expansível: cada seção é independente e pode receber novos dados nas próximas partes.
 */
const MePanel = (() => {
  const $ = id => document.getElementById(id);

  /* ── Render principal ────────────────────────────────────── */
  async function render() {
    const session = Auth.getSession();
    if (!session) return;

    const nameEl = $('me-greeting-name');
    if (nameEl) nameEl.textContent = session.name;

    const avatarEl = $('me-avatar-initial');
    if (avatarEl) avatarEl.textContent = session.name.charAt(0).toUpperCase();

    const dateEl = $('me-today-date');
    if (dateEl) {
      dateEl.textContent = new Date().toLocaleDateString('pt-BR', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
      });
    }

    const monthEl = $('me-month-label');
    if (monthEl) {
      const [y, m] = Utils.currentMonth().split('-');
      const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
      monthEl.textContent = `${meses[+m - 1]}/${y}`;
    }

    renderStats(session);
    renderTasks(session);
    renderHours(session);
  }

  /* ── Stats rápidos ───────────────────────────────────────── */
  async function renderStats(session) {
    // Horas extras aprovadas do mês atual (novo formato)
    const timeRecords = Storage.getSync('hub_time_records', {});
    const employees   = Storage.getSync(Storage.KEYS.EMPLOYEES, []);
    const emp = employees.find(e => e.name === session.name);
    let monthHours = 0;
    if (emp) {
      const thisMonth = Utils.currentMonth();
      monthHours = (timeRecords[emp.id] || [])
        .filter(r => r.status === 'approved' && (r.date || '').startsWith(thisMonth))
        .reduce((s, r) => s + (Number(r.overtimeMinutes) || 0), 0) / 60;
    }
    const hoursEl = $('me-stat-hours');
    if (hoursEl) hoursEl.textContent = Utils.num(monthHours, 1) + 'h';

    // Tarefas próprias
    const tasks = Storage.getSync(Storage.KEYS.TASKS, []);
    const myTasks = tasks.filter(t => !t.owner || t.owner === session.name);
    const tasksEl = $('me-stat-tasks');
    if (tasksEl) tasksEl.textContent = myTasks.length;

    // Produção da semana (pacotes)
    const records = Storage.getSync(Storage.KEYS.PRODUCTION, []);
    const today = new Date();
    const dow = today.getDay();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - dow);
    const wsStr = weekStart.toISOString().split('T')[0];
    const weekProd = records
      .filter(r => r.operator === session.name && r.date >= wsStr)
      .reduce((s, r) => s + (Number(r.packages) || 0), 0);
    const prodEl = $('me-stat-prod');
    if (prodEl) prodEl.textContent = weekProd.toLocaleString('pt-BR');
  }

  /* ── Tarefas ─────────────────────────────────────────────── */
  async function renderTasks(session) {
    const list = $('me-tasks-list');
    if (!list) return;

    const tasks = Storage.getSync(Storage.KEYS.TASKS, [])
      .filter(t => !t.owner || t.owner === session.name)
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
      .slice(0, 6);

    if (tasks.length === 0) {
      list.innerHTML = `<div class="empty-state">
        <i class="fa-solid fa-circle-check"></i>
        <p>Nenhuma tarefa registrada.</p>
      </div>`;
      return;
    }

    list.innerHTML = tasks.map(t => `
      <div style="display:flex;align-items:flex-start;gap:12px;padding:10px 0;border-bottom:1px solid var(--border)">
        <i class="fa-regular fa-circle-dot text-accent" style="margin-top:2px;flex-shrink:0"></i>
        <div style="flex:1;min-width:0">
          <div style="font-weight:600;font-size:13px">${Utils.esc(t.item)}</div>
          ${t.notes ? `<div class="text-xs text-muted mt-1" style="white-space:pre-wrap">${Utils.esc(t.notes.substring(0, 100))}</div>` : ''}
        </div>
        <span class="text-xs text-muted" style="flex-shrink:0;padding-top:2px">${Utils.fmtDate(t.date)}</span>
      </div>`).join('');
  }

  /* ── Ponto do mês ────────────────────────────────────────── */
  async function renderHours(session) {
    const list = $('me-hours-list');
    if (!list) return;

    const employees = Storage.getSync(Storage.KEYS.EMPLOYEES, []);
    const emp = employees.find(e => e.name === session.name);

    if (!emp) {
      list.innerHTML = `<div class="empty-state">
        <i class="fa-solid fa-user-slash"></i>
        <p>Colaborador não encontrado. Peça ao administrador para cadastrá-lo.</p>
      </div>`;
      return;
    }

    const timeRecords = Storage.getSync('hub_time_records', {});
    const thisMonth   = Utils.currentMonth();
    const records     = (timeRecords[emp.id] || [])
      .filter(r => (r.date || '').startsWith(thisMonth))
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 10);

    if (records.length === 0) {
      list.innerHTML = `<div class="empty-state">
        <i class="fa-solid fa-clock"></i>
        <p>Nenhum registro no mês atual.</p>
      </div>`;
      return;
    }

    const statusColors = { pending: '#f59e0b', approved: '#22c55e', rejected: '#ef4444' };
    const statusLabels = { pending: 'Pendente', approved: 'Aprovado', rejected: 'Rejeitado' };

    list.innerHTML = records.map(r => {
      const batidas = [r.punch1, r.punch2, r.punch3, r.punch4].filter(Boolean).join(' → ');
      const otH = ((r.overtimeMinutes || 0) / 60);
      const statusColor = statusColors[r.status] || '#94a3b8';
      return `
        <div style="display:flex;align-items:center;gap:12px;padding:8px 0;border-bottom:1px solid var(--border)">
          <span class="font-mono text-xs text-muted" style="min-width:72px">${Utils.fmtDate(r.date)}</span>
          <span class="font-mono text-xs text-muted">${batidas || '—'}</span>
          ${r.overtimeMinutes > 0 ? `<span class="font-mono font-bold" style="color:var(--accent)">+${Utils.num(otH, 2)}h extra</span>` : '<span class="text-xs text-muted">Sem extra</span>'}
          <span class="badge" style="font-size:10px;background:${statusColor}20;color:${statusColor};border:1px solid ${statusColor}40;margin-left:auto">${statusLabels[r.status] || ''}</span>
        </div>`;
    }).join('');
  }

  /* ── Init ────────────────────────────────────────────────── */
  function init() {
    document.addEventListener('route:change', async (e) => {
      if (e.detail.route === 'me') render();
    });
  }

  return { init, render };
})();
window.MePanel = MePanel;
