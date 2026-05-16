(() => {
  const $ = id => document.getElementById(id);
  // Wrappers sincrono (localStorage) para dados pessoais de M13-M20
  const getSync = (key, fb) => Storage._getLocal(key, fb ?? null);
  const setSync = (key, v)  => { Storage._setLocal(key, v); Storage.set(key, v).catch(() => {}); };
  const KEYS = {
    manualsPlatform: 'hub_m13_platform_manuals', manualsResolution: 'hub_m14_resolution_manuals',
    todos: 'hub_m15_periodic_todos', events: 'hub_m16_calendar_events', notices: 'hub_m17_announcements', machines: 'hub_m18_machines',
    sizeChanges: Storage.KEYS.SIZE_CHANGES, inventory: Storage.KEYS.INVENTORY
  };
  const esc = value => Utils.esc(value || '');
  const ensureAccess = () => {
    if (!Array.isArray(Auth.COLAB_BLOCKED)) return;
    ['m13', 'm17', 'settings'].forEach(route => { if (!Auth.COLAB_BLOCKED.includes(route)) Auth.COLAB_BLOCKED.push(route); });
  };
  const periodLabel = v => ({ none: 'Sem repetição', daily: 'Diária', weekly: 'Semanal', monthly: 'Mensal' }[v] || 'Sem repetição');
  const eventTypeLabel = v => ({ fulls: 'Fulls', visitas: 'Visitas', recebimento: 'Recebimento de fornecedor', outros: 'Outros' }[v] || v);

  function manualModule(route, key, defaults, icon) {
    let items = [], selected = null, editingId = null;
    const load = async () => {
      await Storage.syncBatch([key]);
      items = getSync(key, null);
      if (!items) { items = defaults; setSync(key, items); }
      if (!selected && items[0]) selected = items[0].id;
    };
    const save = () => setSync(key, items);
    const render = () => {
      load();
      const list = $(`${route}-list`), detail = $(`${route}-detail`);
      if (!list || !detail) return;
      list.innerHTML = items.length ? items.map(item => `
        <div class="p5-item ${item.id === selected ? 'active' : ''}" onclick="${route.toUpperCase()}.select('${item.id}')">
          <i class="fa-solid ${icon} text-accent"></i><div><div class="p5-item-title">${esc(item.name)}</div><div class="p5-item-sub">Manual</div></div>
        </div>`).join('') : `<div class="empty-state"><i class="fa-solid fa-book-open"></i><p>Nenhum manual cadastrado.</p></div>`;
      const item = items.find(i => i.id === selected);
      detail.innerHTML = item ? `
        <div class="p5-mini-card">
          <div class="card-header" style="padding:0;margin-bottom:12px">
            <div class="card-title-lg">${esc(item.name)}</div>
            <div class="p5-toolbar master-only">
              <button class="btn btn-secondary btn-sm" onclick="${route.toUpperCase()}.edit('${item.id}')"><i class="fa-solid fa-pen"></i> Editar</button>
              <button class="btn btn-danger btn-sm" onclick="${route.toUpperCase()}.remove('${item.id}')"><i class="fa-solid fa-trash"></i> Remover</button>
            </div>
          </div>
          <div class="p5-content">${esc(item.content)}</div>
        </div>` : `<div class="empty-state"><i class="fa-solid fa-book-open"></i><p>Selecione um manual.</p></div>`;
    };
    const open = item => {
      editingId = item?.id || null;
      $('p5-manual-save').dataset.route = route;
      $('p5-manual-title').textContent = editingId ? 'Editar Manual' : 'Novo Manual';
      $('p5-manual-name').value = item?.name || '';
      $('p5-manual-content').value = item?.content || '';
      $('p5-manual-modal').classList.add('open');
    };
    return {
      async init() { await load(); $(`${route}-add-btn`)?.addEventListener('click', () => open(null)); document.addEventListener('route:change', async e => { if (e.detail.route === route) { await load(); render(); } }); render(); },
      render, select(id) { selected = id; render(); }, edit(id) { open(items.find(i => i.id === id)); },
      saveModal() {
        const name = $('p5-manual-name').value.trim(), content = $('p5-manual-content').value.trim();
        if (!name || !content) return Toast.error('Preencha nome e conteúdo.');
        if (editingId) Object.assign(items.find(i => i.id === editingId), { name, content });
        else { const item = { id: Utils.uid(), name, content }; items.push(item); selected = item.id; }
        save(); $('p5-manual-modal').classList.remove('open'); render(); Toast.success('Manual salvo.'); Logger.log(`Salvou manual ${route.toUpperCase()}: ${name}`);
      },
      remove(id) {
        const item = items.find(i => i.id === id); if (!item) return;
        Modal.confirm({ title: 'Remover manual', body: `Remover <strong>${esc(item.name)}</strong>?`, confirmText: 'Remover', onConfirm() { items = items.filter(i => i.id !== id); selected = items[0]?.id || null; save(); render(); Toast.success('Manual removido.'); } });
      }
    };
  }

  window.M13 = manualModule('m13', KEYS.manualsPlatform, [
    { id: 'm13-shopee', name: 'Shopee', content: '1. Acesse a central do vendedor.\n2. Confira título, fotos, peso e dimensões.\n3. Defina estoque, preço e categoria.\n4. Revise taxas, prazo e publique o anúncio.' },
    { id: 'm13-ml', name: 'Mercado Livre', content: '1. Crie o anúncio pelo catálogo quando disponível.\n2. Informe variação, ficha técnica e dimensões.\n3. Revise frete, preço final e exposição.\n4. Publique e acompanhe perguntas.' }
  ], 'fa-store');
  window.M14 = manualModule('m14', KEYS.manualsResolution, [
    { id: 'm14-printer', name: 'Impressora não imprime', content: '1. Verifique energia, cabo USB/rede e papel.\n2. Confira se há fila travada.\n3. Reinicie impressora e computador.\n4. Se persistir, registre ocorrência técnica.' },
    { id: 'm14-pc', name: 'Computador lento', content: '1. Feche programas desnecessários.\n2. Reinicie o computador.\n3. Verifique espaço em disco.\n4. Chame o responsável técnico se continuar.' }
  ], 'fa-screwdriver-wrench');

  window.M15 = (() => {
    let tasks = [], editId = null;
    const load = () => tasks = getSync(KEYS.todos, []);
    const save = () => setSync(KEYS.todos, tasks);
    const visible = () => { const s = Auth.getSession(); return tasks.filter(t => Auth.isMaster() || t.scope === 'all' || t.scope === 'general' || t.owner === s?.name); };
    function renderMini() {
      const box = $('me-p5-tasks'); if (!box) return; const s = Auth.getSession();
      const rows = tasks.filter(t => !(t.doneBy || []).includes(s?.name) && (t.scope === 'all' || t.scope === 'general' || t.owner === s?.name)).slice(0, 5);
      box.innerHTML = rows.length ? rows.map(t => `<div class="p5-mini-card" style="margin-bottom:8px"><strong>${esc(t.title)}</strong><div class="text-xs text-muted mt-1">${t.date ? Utils.fmtDate(t.date) + ' • ' : ''}${periodLabel(t.period)}</div></div>`).join('') : `<div class="empty-state"><i class="fa-solid fa-list-check"></i><p>Nenhuma tarefa periódica.</p></div>`;
    }
    function render() {
      load(); const el = $('m15-list'); if (!el) { renderMini(); return; } const s = Auth.getSession();
      const rows = visible().sort((a, b) => (a.date || '9999').localeCompare(b.date || '9999'));
      el.innerHTML = rows.length ? rows.map(t => {
        const done = (t.doneBy || []).includes(s?.name);
        return `<div class="p5-mini-card" style="margin-bottom:10px"><div style="display:flex;gap:12px;align-items:flex-start"><button class="btn btn-xs ${done ? 'btn-secondary' : 'btn-primary'}" onclick="M15.toggle('${t.id}')"><i class="fa-solid ${done ? 'fa-rotate-left' : 'fa-check'}"></i></button><div style="flex:1"><div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><strong>${esc(t.title)}</strong><span class="badge badge-info">${periodLabel(t.period)}</span><span class="badge badge-muted">${t.scope === 'all' ? 'Todos' : t.scope === 'general' ? 'Geral' : 'Pessoal'}</span>${t.date ? `<span class="text-xs text-muted">${Utils.fmtDate(t.date)}</span>` : ''}</div>${t.notes ? `<div class="text-sm text-muted mt-1" style="white-space:pre-wrap">${esc(t.notes)}</div>` : ''}</div><div class="p5-toolbar">${(Auth.isMaster() || t.owner === s?.name) ? `<button class="btn btn-xs btn-secondary" onclick="M15.edit('${t.id}')"><i class="fa-solid fa-pen"></i></button><button class="btn btn-xs btn-danger" onclick="M15.remove('${t.id}')"><i class="fa-solid fa-trash"></i></button>` : ''}</div></div></div>`;
      }).join('') : `<div class="empty-state"><i class="fa-solid fa-list-check"></i><p>Nenhuma tarefa criada.</p></div>`;
      renderMini();
    }
    function open(t) { editId = t?.id || null; $('m15-modal-title').textContent = editId ? 'Editar Tarefa' : 'Nova Tarefa'; $('m15-date').value = t?.date || ''; $('m15-period').value = t?.period || 'none'; $('m15-title').value = t?.title || ''; $('m15-notes').value = t?.notes || ''; $('m15-scope').value = Auth.isMaster() ? (t?.scope || 'all') : 'personal'; $('m15-modal').classList.add('open'); }
    function saveTask() { const s = Auth.getSession(), title = $('m15-title').value.trim(); if (!title) return Toast.error('Informe a tarefa.'); const data = { date: $('m15-date').value, period: $('m15-period').value, scope: Auth.isMaster() ? $('m15-scope').value : 'personal', title, notes: $('m15-notes').value.trim() }; if (editId) Object.assign(tasks.find(t => t.id === editId), data); else tasks.push({ id: Utils.uid(), owner: s?.name, doneBy: [], ...data }); save(); $('m15-modal').classList.remove('open'); render(); Toast.success('Tarefa salva.'); }
    return { init() { load(); $('m15-add-btn')?.addEventListener('click', () => open(null)); $('m15-save')?.addEventListener('click', saveTask); $('m15-cancel')?.addEventListener('click', () => $('m15-modal').classList.remove('open')); document.addEventListener('route:change', async e => { if (['m15', 'me'].includes(e.detail.route)) { await Storage.syncBatch([KEYS.todos]); render(); } }); render(); }, render, toggle(id) { const s = Auth.getSession(), t = tasks.find(x => x.id === id); if (!t || !s) return; t.doneBy = t.doneBy || []; t.doneBy = t.doneBy.includes(s.name) ? t.doneBy.filter(n => n !== s.name) : [...t.doneBy, s.name]; save(); render(); }, edit(id) { open(tasks.find(t => t.id === id)); }, remove(id) { tasks = tasks.filter(t => t.id !== id); save(); render(); Toast.success('Tarefa removida.'); } };
  })();

  window.M16 = (() => {
    let events = [];
    let _year  = new Date().getFullYear();
    let _month = new Date().getMonth(); // 0-indexed

    const load    = () => { events = getSync(KEYS.events, []); };
    const save    = () => setSync(KEYS.events, events);
    const visible = () => events.filter(e => Auth.isMaster() || e.target === 'colab' || e.target === 'both');

    const MONTHS   = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
    const DAYS     = ['D','S','T','Q','Q','S','S'];
    const TYPE_CLR = {
      fulls:       { bg:'rgba(34,197,94,.18)',   text:'#22c55e' },
      visitas:     { bg:'rgba(99,102,241,.18)',  text:'#818cf8' },
      recebimento: { bg:'rgba(251,191,36,.18)',  text:'#fbbf24' },
      outros:      { bg:'rgba(148,163,184,.12)', text:'#94a3b8' },
    };

    function renderMini() {
      const box = $('me-p5-events');
      if (!box) return;
      const rows = events.filter(e => e.target === 'colab' || e.target === 'both')
        .sort((a,b) => a.date.localeCompare(b.date)).slice(0,5);
      box.innerHTML = rows.length
        ? rows.map(e => `<div class="p5-mini-card" style="margin-bottom:8px"><strong>${esc(e.title)}</strong><div class="text-xs text-muted mt-1">${Utils.fmtDate(e.date)} • ${eventTypeLabel(e.type)}</div></div>`).join('')
        : `<div class="empty-state"><i class="fa-solid fa-calendar-days"></i><p>Nenhum evento direcionado.</p></div>`;
    }

    function render() {
      load();
      const el = $('m16-list');
      if (!el) { renderMini(); return; }

      const todayStr  = new Date().toISOString().split('T')[0];
      const firstDay  = new Date(_year, _month, 1);
      const lastDay   = new Date(_year, _month + 1, 0);
      const startDow  = firstDay.getDay();   // 0=Dom
      const totalDays = lastDay.getDate();

      // Agrupar eventos por data
      const byDate = {};
      visible().forEach(e => { if (e.date) { (byDate[e.date] = byDate[e.date] || []).push(e); } });

      // Cabeçalho de navegação
      let html = `
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
          <button class="btn btn-ghost btn-sm" onclick="M16.prevMonth()"><i class="fa-solid fa-chevron-left"></i></button>
          <span style="font-size:16px;font-weight:700;color:var(--text)">${MONTHS[_month]} ${_year}</span>
          <button class="btn btn-ghost btn-sm" onclick="M16.nextMonth()"><i class="fa-solid fa-chevron-right"></i></button>
        </div>
        <div style="display:grid;grid-template-columns:repeat(7,1fr);border:1px solid var(--border);border-radius:10px;overflow:hidden">`;

      // Cabeçalho dias da semana
      DAYS.forEach((d,i) => {
        const wknd = i===0||i===6;
        html += `<div style="padding:8px 2px;text-align:center;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;background:var(--surface2);color:${wknd?'var(--danger)':'var(--text-sec)'};border-bottom:1px solid var(--border)">${d}</div>`;
      });

      // Células vazias antes do dia 1
      let cells = 0;
      for (let i=0; i<startDow; i++) {
        html += `<div style="background:var(--surface);min-height:88px;border-right:1px solid var(--border);border-bottom:1px solid var(--border);opacity:.35"></div>`;
        cells++;
      }

      // Dias do mês
      for (let day=1; day<=totalDays; day++) {
        const m2   = String(_month+1).padStart(2,'0');
        const d2   = String(day).padStart(2,'0');
        const ds   = `${_year}-${m2}-${d2}`;
        const isToday = ds === todayStr;
        const dow  = (startDow+day-1)%7;
        const wknd = dow===0||dow===6;
        const evs  = byDate[ds] || [];
        const show = evs.slice(0,3);
        const more = evs.length > 3 ? evs.length-3 : 0;

        const numHtml = isToday
          ? `<span style="background:var(--accent);color:#fff;border-radius:50%;width:22px;height:22px;display:inline-flex;align-items:center;justify-content:center;font-size:12px">${day}</span>`
          : `<span style="color:${wknd?'var(--danger)':'var(--text)'}${isToday?';font-weight:700':''}">${day}</span>`;

        html += `<div style="background:${isToday?'var(--accent-bg)':'var(--surface)'};min-height:88px;padding:4px;border-right:1px solid var(--border);border-bottom:1px solid var(--border);vertical-align:top">
          <div style="text-align:right;font-size:12px;font-weight:600;margin-bottom:3px">${numHtml}</div>
          ${show.map(e => {
            const c = TYPE_CLR[e.type]||TYPE_CLR.outros;
            return `<div style="background:${c.bg};color:${c.text};padding:2px 5px;border-radius:3px;font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:2px;line-height:1.4" title="${esc(e.title)}">${esc(e.title)}</div>`;
          }).join('')}
          ${more>0?`<div style="font-size:9px;color:var(--text-sec);padding:1px 4px">+${more} mais</div>`:''}
        </div>`;
        cells++;
      }

      // Células vazias para completar a última linha
      const tail = (7-(cells%7))%7;
      for (let i=0; i<tail; i++) {
        html += `<div style="background:var(--surface);min-height:88px;border-right:1px solid var(--border);border-bottom:1px solid var(--border);opacity:.35"></div>`;
      }

      html += `</div>`;

      // Lista compacta de eventos do mês logo abaixo (para excluir via botão)
      const monthEvents = visible().filter(e => (e.date||'').startsWith(`${_year}-${String(_month+1).padStart(2,'0')}`)).sort((a,b)=>a.date.localeCompare(b.date));
      if (monthEvents.length) {
        html += `<div style="margin-top:14px;display:flex;flex-direction:column;gap:6px">`;
        monthEvents.forEach(e => {
          const c = TYPE_CLR[e.type]||TYPE_CLR.outros;
          html += `<div style="display:flex;align-items:center;gap:10px;padding:8px 12px;background:var(--surface2);border-radius:8px;border:1px solid var(--border)">
            <span style="width:8px;height:8px;border-radius:50%;background:${c.text};flex-shrink:0"></span>
            <div style="flex:1;min-width:0">
              <div style="font-size:13px;font-weight:600">${esc(e.title)}</div>
              <div style="font-size:11px;color:var(--text-sec)">${Utils.fmtDate(e.date)} • ${eventTypeLabel(e.type)}</div>
            </div>
            ${Auth.isMaster()?`<button class="btn btn-xs btn-danger" onclick="M16.remove('${e.id}')"><i class="fa-solid fa-trash"></i></button>`:''}
          </div>`;
        });
        html += `</div>`;
      }

      el.innerHTML = html;
      renderMini();
    }

    function prevMonth() { if (_month===0){_year--;_month=11;}else _month--; render(); }
    function nextMonth() { if (_month===11){_year++;_month=0;}else _month++; render(); }

    return {
      init() {
        load();
        $('m16-save-btn')?.addEventListener('click', () => {
          const title = $('m16-title').value.trim(), date = $('m16-date').value;
          if (!title||!date) return Toast.error('Preencha data e título.');
          events.push({ id:Utils.uid(), title, date, type:$('m16-type').value, target:$('m16-target').value, notes:$('m16-notes').value.trim() });
          save();
          ['m16-title','m16-date','m16-notes'].forEach(id => $(id).value='');
          render(); Toast.success('Evento criado.');
        });
        document.addEventListener('route:change', e => { if (['m16','me'].includes(e.detail.route)) render(); });
        render();
      },
      render, prevMonth, nextMonth,
      remove(id) { events=events.filter(e=>e.id!==id); save(); render(); Toast.success('Evento removido.'); }
    };
  })();

  window.M17 = (() => {
    let notices = []; const load = () => notices = getSync(KEYS.notices, []); const save = () => setSync(KEYS.notices, notices); const active = () => notices.filter(n => !n.resolved);
    function renderMini() { const box = $('me-p5-notices'); if (!box) return; const rows = active().slice(0, 5); box.innerHTML = rows.length ? rows.map(n => `<div class="p5-mini-card" style="margin-bottom:8px"><span class="p5-tag ${n.type === 'emergency' ? 'emergency' : 'alert'}">${n.type === 'emergency' ? 'Emergência' : 'Alerta'}</span><strong style="display:block;margin-top:8px">${esc(n.title)}</strong><div class="text-sm text-muted mt-1">${esc(n.message)}</div></div>`).join('') : `<div class="empty-state"><i class="fa-solid fa-bullhorn"></i><p>Nenhum comunicado ativo.</p></div>`; }
    function render() { load(); const el = $('m17-list'); if (!el) { renderMini(); return; } const rows = active(); el.innerHTML = rows.length ? rows.map(n => `<div class="p5-mini-card" style="margin-bottom:10px"><div style="display:flex;justify-content:space-between;gap:12px"><div><span class="p5-tag ${n.type === 'emergency' ? 'emergency' : 'alert'}">${n.type === 'emergency' ? 'Emergência' : 'Alerta'}</span><strong style="display:block;margin-top:8px">${esc(n.title)}</strong><div class="text-sm text-muted mt-1">${esc(n.message)}</div><div class="text-xs text-muted mt-2">Visto por: ${(n.seenBy || []).length} colaborador(es)</div></div><button class="btn btn-sm btn-secondary" onclick="M17.resolve('${n.id}')"><i class="fa-solid fa-check"></i> Resolvido</button></div></div>`).join('') : `<div class="empty-state"><i class="fa-solid fa-bullhorn"></i><p>Nenhum comunicado ativo.</p></div>`; renderMini(); }
    function showPending() { const s = Auth.getSession(); if (!s || s.profile !== 'colab') return; load(); const n = active().find(x => !(x.seenBy || []).includes(s.name)); if (!n) return; $('m17-popup').classList.toggle('emergency', n.type === 'emergency'); $('m17-popup-title').textContent = n.type === 'emergency' ? `Emergência: ${n.title}` : `Alerta: ${n.title}`; $('m17-popup-body').textContent = n.message; $('m17-popup').dataset.id = n.id; $('m17-popup').classList.add('open'); }
    return { init() { load(); $('m17-save-btn')?.addEventListener('click', () => { const title = $('m17-title').value.trim(), message = $('m17-message').value.trim(); if (!title || !message) return Toast.error('Preencha título e mensagem.'); notices.unshift({ id: Utils.uid(), type: $('m17-type').value, title, message, createdAt: new Date().toISOString(), seenBy: [], resolved: false }); save(); $('m17-title').value = ''; $('m17-message').value = ''; render(); Toast.success('Comunicado publicado.'); }); $('m17-popup-ok')?.addEventListener('click', () => { const s = Auth.getSession(), n = notices.find(x => x.id === $('m17-popup').dataset.id); if (n && s) { n.seenBy = n.seenBy || []; if (!n.seenBy.includes(s.name)) n.seenBy.push(s.name); save(); } $('m17-popup').classList.remove('open'); renderMini(); }); document.addEventListener('auth:login', () => setTimeout(showPending, 250)); document.addEventListener('route:change', async e => { if (['m17', 'me'].includes(e.detail.route)) { await Storage.syncBatch([KEYS.notices]); render(); } }); render(); setTimeout(showPending, 450); }, render, resolve(id) { const n = notices.find(x => x.id === id); if (n) n.resolved = true; save(); render(); Toast.success('Comunicado marcado como resolvido.'); } };
  })();

  window.M18 = (() => {
    let machines = [], selected = null, editId = null; const load = () => { machines = getSync(KEYS.machines, []); if (!selected && machines[0]) selected = machines[0].id; }; const save = () => setSync(KEYS.machines, machines);
    function render() { load(); const list = $('m18-list'), detail = $('m18-detail'); if (!list || !detail) return; list.innerHTML = machines.length ? machines.map(m => `<div class="p5-item ${m.id === selected ? 'active' : ''}" onclick="M18.select('${m.id}')"><i class="fa-solid fa-gears text-accent"></i><div><div class="p5-item-title">${esc(m.name)}</div><div class="p5-item-sub">${m.pdfName ? esc(m.pdfName) : 'Manual em texto'}</div></div></div>`).join('') : `<div class="empty-state"><i class="fa-solid fa-gears"></i><p>Nenhuma máquina cadastrada.</p></div>`; const m = machines.find(x => x.id === selected); if (!m) { detail.innerHTML = `<div class="empty-state"><i class="fa-solid fa-gears"></i><p>Selecione uma máquina.</p></div>`; return; } const wa = `https://wa.me/${(m.phone || '').replace(/\D/g, '')}?text=${encodeURIComponent(m.waMessage || 'Olá, preciso de suporte técnico.')}`; detail.innerHTML = `<div class="p5-mini-card"><div class="card-header" style="padding:0;margin-bottom:12px"><div class="card-title-lg">${esc(m.name)}</div><div class="p5-toolbar master-only"><button class="btn btn-secondary btn-sm" onclick="M18.edit('${m.id}')"><i class="fa-solid fa-pen"></i> Editar</button><button class="btn btn-danger btn-sm" onclick="M18.remove('${m.id}')"><i class="fa-solid fa-trash"></i> Remover</button></div></div><div class="p5-content">${esc(m.manual)}</div><div class="p5-toolbar" style="margin-top:14px">${m.pdfData ? `<a class="btn btn-secondary btn-sm" href="${m.pdfData}" download="${esc(m.pdfName || 'manual.pdf')}"><i class="fa-solid fa-file-pdf"></i> Baixar PDF</a>` : ''}${m.phone ? `<a class="btn btn-primary btn-sm" target="_blank" rel="noopener" href="${wa}"><i class="fa-brands fa-whatsapp"></i> Chamar HECE</a>` : ''}</div></div>`; }
    function open(m) { editId = m?.id || null; $('m18-modal-title').textContent = editId ? 'Editar Máquina' : 'Nova Máquina'; $('m18-name').value = m?.name || ''; $('m18-phone').value = m?.phone || ''; $('m18-wa-message').value = m?.waMessage || ''; $('m18-manual').value = m?.manual || ''; $('m18-pdf').value = ''; $('m18-pdf-label').textContent = m?.pdfName ? `PDF atual: ${m.pdfName}` : ''; $('m18-modal').classList.add('open'); }
    function saveMachine() { const name = $('m18-name').value.trim(), manual = $('m18-manual').value.trim(); if (!name) return Toast.error('Informe o nome da máquina.'); const file = $('m18-pdf').files[0]; const persist = (pdfData, pdfName) => { const data = { name, manual, phone: $('m18-phone').value.trim(), waMessage: $('m18-wa-message').value.trim(), pdfData, pdfName }; if (editId) { const cur = machines.find(m => m.id === editId); Object.assign(cur, data, { pdfData: pdfData || cur.pdfData, pdfName: pdfName || cur.pdfName }); selected = editId; } else { const item = { id: Utils.uid(), ...data }; machines.push(item); selected = item.id; } save(); $('m18-modal').classList.remove('open'); render(); Toast.success('Máquina salva.'); }; if (file) { const reader = new FileReader(); reader.onload = () => persist(reader.result, file.name); reader.readAsDataURL(file); } else persist('', ''); }
    return { init() { load(); $('m18-add-btn')?.addEventListener('click', () => open(null)); $('m18-cancel')?.addEventListener('click', () => $('m18-modal').classList.remove('open')); $('m18-save')?.addEventListener('click', saveMachine); document.addEventListener('route:change', async e => { if (e.detail.route === 'm18') { await Storage.syncBatch([KEYS.machines]); render(); } }); render(); }, render, select(id) { selected = id; render(); }, edit(id) { open(machines.find(m => m.id === id)); }, remove(id) { machines = machines.filter(m => m.id !== id); selected = machines[0]?.id || null; save(); render(); Toast.success('Máquina removida.'); } };
  })();

  window.M19 = (() => {
    let setups = [], editId = null, _query = '';
    const load = () => { setups = getSync(KEYS.sizeChanges, []); };
    const save = () => setSync(KEYS.sizeChanges, setups);

    const PARAM_LABELS = [
      { key: 'temperature', icon: 'fa-temperature-half', label: 'Temperatura'  },
      { key: 'speed',       icon: 'fa-gauge-high',       label: 'Velocidade'   },
      { key: 'scale',       icon: 'fa-weight-hanging',   label: 'Balança'      },
    ];

    function render() {
      load();
      const el = $('m19-list'); if (!el) return;
      const q = _query.toLowerCase();
      const visible = setups.filter(s =>
        !q || (s.machine||'').toLowerCase().includes(q) || (s.sizeName||'').toLowerCase().includes(q)
      );

      if (!visible.length) {
        el.innerHTML = `<div class="empty-state"><i class="fa-solid fa-ruler-combined"></i><p>${_query ? 'Nenhum setup encontrado.' : 'Nenhum setup cadastrado. Clique em "Novo Setup" para começar.'}</p></div>`;
        return;
      }

      // Agrupar por máquina
      const grouped = {};
      visible.forEach(s => { const k = s.machine||'Sem máquina'; (grouped[k]=grouped[k]||[]).push(s); });

      el.innerHTML = Object.keys(grouped).sort().map(machine => `
        <div style="margin-bottom:20px">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
            <i class="fa-solid fa-gears" style="color:var(--accent);font-size:14px"></i>
            <span style="font-size:14px;font-weight:700;color:var(--text)">${esc(machine)}</span>
            <span class="badge badge-muted">${grouped[machine].length} setup(s)</span>
          </div>
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px">
            ${grouped[machine].map(s => {
              const isMaster = Auth.isMaster();
              const productBadge = s.productType === 'Envelope'
                ? `<span class="badge badge-info" style="font-size:10px">Envelope</span>`
                : `<span class="badge" style="background:rgba(249,115,22,.15);color:#f97316;font-size:10px">Saco de Lixo</span>`;
              const params = PARAM_LABELS.filter(p => s[p.key]).map(p =>
                `<div style="display:flex;align-items:center;gap:6px;font-size:12px">
                  <i class="fa-solid ${p.icon}" style="width:14px;text-align:center;color:var(--accent);font-size:11px"></i>
                  <span class="text-muted">${p.label}:</span>
                  <span class="font-mono font-bold">${esc(s[p.key])}</span>
                </div>`
              ).join('');
              const extras = [s.adjustments, s.notes].filter(Boolean);
              return `
                <div style="background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:14px;display:flex;flex-direction:column;gap:10px">
                  <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px">
                    <div>
                      <div style="font-size:14px;font-weight:700;color:var(--text)">${esc(s.sizeName||'—')}</div>
                      <div style="margin-top:4px">${productBadge}</div>
                    </div>
                    ${isMaster ? `<div class="flex gap-1" style="flex-shrink:0">
                      <button class="btn btn-xs btn-secondary" onclick="M19.edit('${s.id}')"><i class="fa-solid fa-pen"></i></button>
                      <button class="btn btn-xs btn-danger" onclick="M19.remove('${s.id}')"><i class="fa-solid fa-trash"></i></button>
                    </div>` : ''}
                  </div>
                  ${params ? `<div style="display:flex;flex-direction:column;gap:5px;padding:10px;background:var(--surface);border-radius:8px;border:1px solid var(--border)">${params}</div>` : ''}
                  ${extras.length ? `<div style="font-size:11px;color:var(--text-sec);white-space:pre-wrap;border-top:1px solid var(--border);padding-top:8px">${extras.map(x => esc(x)).join('\n')}</div>` : ''}
                </div>`;
            }).join('')}
          </div>
        </div>`).join('');
    }

    function open(s) {
      editId = s?.id || null;
      $('m19-modal-title').textContent = editId ? 'Editar Setup' : 'Novo Setup de Tamanho';
      $('m19-machine').value     = s?.machine     || '';
      $('m19-size-name').value   = s?.sizeName    || '';
      $('m19-product-type').value= s?.productType || 'Saco de Lixo';
      $('m19-temp').value        = s?.temperature || '';
      $('m19-speed').value       = s?.speed       || '';
      $('m19-scale').value       = s?.scale       || '';
      $('m19-adjustments').value = s?.adjustments || '';
      $('m19-notes').value       = s?.notes       || '';
      $('m19-modal').classList.add('open');
    }

    function saveSetup() {
      const machine   = $('m19-machine').value.trim();
      const sizeName  = $('m19-size-name').value.trim();
      if (!machine || !sizeName) return Toast.error('Preencha máquina e nome do setup.');
      const data = {
        machine, sizeName,
        productType:  $('m19-product-type').value,
        temperature:  $('m19-temp').value.trim(),
        speed:        $('m19-speed').value.trim(),
        scale:        $('m19-scale').value.trim(),
        adjustments:  $('m19-adjustments').value.trim(),
        notes:        $('m19-notes').value.trim(),
        updatedAt:    new Date().toISOString(),
        updatedBy:    Auth.getSession()?.name || '—',
      };
      if (editId) {
        Object.assign(setups.find(s => s.id === editId), data);
      } else {
        setups.push({ id: Utils.uid(), createdAt: new Date().toISOString(), ...data });
      }
      save();
      $('m19-modal').classList.remove('open');
      render();
      Logger.log(`${editId?'Editou':'Criou'} setup de tamanho: ${machine} — ${sizeName}`);
      Toast.success('Setup salvo.');
    }

    function remove(id) {
      const s = setups.find(x => x.id === id);
      if (!s) return;
      Modal.confirm({
        title: 'Remover Setup',
        body: `<p>Remover o setup <strong>${esc(s.sizeName)}</strong> da máquina ${esc(s.machine)}?</p>`,
        confirmText: 'Remover', confirmClass: 'btn-danger',
        onConfirm() { setups = setups.filter(x => x.id !== id); save(); render(); Toast.success('Setup removido.'); }
      });
    }

    return {
      init() {
        load();
        $('m19-add-btn')?.addEventListener('click', () => open(null));
        $('m19-save')?.addEventListener('click', saveSetup);
        $('m19-cancel')?.addEventListener('click', () => $('m19-modal').classList.remove('open'));
        $('m19-search')?.addEventListener('input', e => { _query = e.target.value; render(); });
        document.addEventListener('route:change', async e => { if (e.detail.route === 'm19') { await Storage.syncBatch([KEYS.sizeChanges]); render(); } });
        render();
      },
      render, edit(id) { open(setups.find(s => s.id === id)); }, remove
    };
  })();

  window.M20 = (() => {
    let items = [], editId = null;
    const load = () => items = getSync(KEYS.inventory, []);
    const save = () => setSync(KEYS.inventory, items);
    function render() {
      load(); const tbody = $('m20-tbody'); if (!tbody) return;
      if (!items.length) { tbody.innerHTML = `<tr><td colspan="6" class="empty-state"><p>Nenhum item cadastrado.</p></td></tr>`; return; }
      tbody.innerHTML = items.map(i => {
        const last = (i.history || [])[0];
        return `<tr>
          <td><strong>${esc(i.item)}</strong><div class="text-xs text-muted">${esc(i.notes || '')}</div></td>
          <td class="font-mono">${Utils.num(i.qty, 2)}</td>
          <td>${esc(i.supplier || '—')}</td>
          <td><span class="badge badge-info">${esc(i.createdBy || '—')}</span><div class="text-xs text-muted">${new Date(i.createdAt || Date.now()).toLocaleString('pt-BR')}</div></td>
          <td class="text-xs">${last ? `${esc(last.by)} — ${new Date(last.when).toLocaleString('pt-BR')}<br>${esc(last.what)}` : '—'}</td>
          <td><button class="btn btn-xs btn-secondary" onclick="M20.edit('${i.id}')"><i class="fa-solid fa-pen"></i></button> <button class="btn btn-xs btn-ghost" onclick="M20.history('${i.id}')"><i class="fa-solid fa-clock-rotate-left"></i></button></td>
        </tr>`;
      }).join('');
    }
    function open(item) {
      editId = item?.id || null;
      $('m20-modal-title').textContent = editId ? 'Editar Item' : 'Novo Item';
      $('m20-item').value = item?.item || '';
      $('m20-qty').value = item?.qty ?? '';
      $('m20-supplier').value = item?.supplier || '';
      $('m20-notes').value = item?.notes || '';
      $('m20-modal').classList.add('open');
    }
    function saveItem() {
      const s = Auth.getSession();
      const data = { item: $('m20-item').value.trim(), qty: parseFloat($('m20-qty').value) || 0, supplier: $('m20-supplier').value.trim(), notes: $('m20-notes').value.trim() };
      if (!data.item) return Toast.error('Informe o item.');
      if (editId) {
        const cur = items.find(i => i.id === editId);
        const before = `Qtd ${cur.qty} → ${data.qty}; fornecedor ${cur.supplier || '—'} → ${data.supplier || '—'}`;
        Object.assign(cur, data, { updatedAt: new Date().toISOString(), updatedBy: s?.name });
        cur.history = cur.history || [];
        cur.history.unshift({ by: s?.name || '—', when: new Date().toISOString(), what: before });
      } else {
        items.unshift({ id: Utils.uid(), createdBy: s?.name || '—', createdAt: new Date().toISOString(), history: [{ by: s?.name || '—', when: new Date().toISOString(), what: 'Criação do item' }], ...data });
      }
      save(); $('m20-modal').classList.remove('open'); render(); Logger.log(`Atualizou inventário: ${data.item}`); Toast.success('Item salvo.');
    }
    return { init() { load(); $('m20-add-btn')?.addEventListener('click', () => open(null)); $('m20-save')?.addEventListener('click', saveItem); $('m20-cancel')?.addEventListener('click', () => $('m20-modal').classList.remove('open')); document.addEventListener('route:change', async e => { if (e.detail.route === 'm20') { await Storage.syncBatch([KEYS.inventory]); render(); } }); render(); }, render, edit(id) { open(items.find(i => i.id === id)); }, history(id) { const item = items.find(i => i.id === id); if (!item) return; Modal.confirm({ title: `Histórico: ${esc(item.item)}`, body: `<div style="font-size:12px;color:var(--text-sec);display:flex;flex-direction:column;gap:8px">${(item.history || []).map(h => `<div><strong>${esc(h.by)}</strong> — ${new Date(h.when).toLocaleString('pt-BR')}<br>${esc(h.what)}</div>`).join('') || 'Sem histórico.'}</div>`, confirmText: 'Fechar', confirmClass: 'btn-primary', onConfirm(){} }); } };
  })();

  // Listeners dos botoes do modal — DOM ja parsed (script defer)
  document.getElementById('p5-manual-save')?.addEventListener('click', () => {
    const route = document.getElementById('p5-manual-save')?.dataset?.route;
    (route === 'm13' ? window.M13 : window.M14)?.saveModal();
  });
  document.getElementById('p5-manual-cancel')?.addEventListener('click', () =>
    document.getElementById('p5-manual-modal')?.classList.remove('open')
  );

  // Init + override Auth.login quando core.js ja terminou (hub:ready)
  document.addEventListener('hub:ready', () => {
    ensureAccess();
    if (window.Auth?.login) {
      const orig = window.Auth.login.bind(window.Auth);
      window.Auth.login = function(profile, name) {
        orig(profile, name);
        document.dispatchEvent(new CustomEvent('auth:login', { detail: { profile, name } }));
      };
    }
    window.M13?.init(); window.M14?.init(); window.M15?.init(); window.M16?.init();
    window.M17?.init(); window.M18?.init(); window.M19?.init(); window.M20?.init();
  });
})();
