/**
 * colaboradores.js — Banco de RH de Colaboradores
 * Campos: nome, telefone, email, endereço, RG, CPF,
 *         perfil, data de contratação, status (ativo/inativo)
 * Integra: ponto (hub_time_records), ausências (hub_absences), banco de horas (hub_debts)
 */
const Colaboradores = (() => {
  const $ = id => document.getElementById(id);
  const KEY = Storage.KEYS.EMPLOYEES;

  let employees  = [];
  let editId     = null;
  let detailId   = null;   // colaborador aberto no painel de detalhes
  let _query     = '';
  let _filterStatus = 'active'; // 'active' | 'inactive' | 'all'

  function load() { employees = Storage.getSync(KEY, []); }
  function save() { Storage.setSync(KEY, employees); }

  /* ── Renderização da lista ── */
  function render() {
    load();
    const el = $('colab-list');
    if (!el) return;

    const q = _query.toLowerCase();
    let visible = employees.filter(e => {
      const matchStatus = _filterStatus === 'all' || (e.status || 'active') === _filterStatus;
      const matchQuery  = !q || (e.name||'').toLowerCase().includes(q) || (e.info||'').toLowerCase().includes(q);
      return matchStatus && matchQuery;
    });

    if (!visible.length) {
      el.innerHTML = `<div class="empty-state"><i class="fa-solid fa-users"></i><p>${q ? 'Nenhum colaborador encontrado.' : _filterStatus === 'inactive' ? 'Nenhum colaborador inativo.' : 'Nenhum colaborador ativo. Clique em "Contratar" para começar.'}</p></div>`;
      return;
    }

    el.innerHTML = `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:14px;margin-top:4px">
      ${visible.map(e => {
        const initials = (e.name||'?').split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase();
        const isActive = (e.status || 'active') === 'active';
        const isMaster = e.profile === 'master';
        const debts    = Storage.getSync(Storage.KEYS.DEBTS, {});
        const hBank    = debts[e.id] || 0;
        const phone    = (e.phone||e.contact||'').replace(/\D/g,'');
        const waUrl    = phone ? `https://wa.me/${phone}` : null;
        return `
          <div style="background:var(--surface2);border:1px solid ${isActive ? 'var(--border)' : 'var(--danger-bd)'};border-radius:12px;padding:16px;display:flex;flex-direction:column;gap:12px;${!isActive ? 'opacity:.7' : ''}">
            <div style="display:flex;align-items:center;gap:12px">
              <div style="width:46px;height:46px;border-radius:50%;background:var(--accent-bg);border:2px solid var(--accent-bd);display:flex;align-items:center;justify-content:center;font-size:17px;font-weight:700;color:var(--accent);flex-shrink:0">${Utils.esc(initials)}</div>
              <div style="flex:1;min-width:0">
                <div style="font-size:14px;font-weight:700;color:var(--text)">${Utils.esc(e.name)}</div>
                ${e.info ? `<div class="text-xs text-muted mt-1" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${Utils.esc(e.info)}</div>` : ''}
              </div>
            </div>
            <div style="display:flex;gap:6px;flex-wrap:wrap">
              <span class="badge ${isMaster ? 'badge-warning' : 'badge-muted'}">${isMaster ? 'Master' : 'Colaborador'}</span>
              <span class="badge ${isActive ? 'badge-success' : 'badge-danger'}">${isActive ? 'Ativo' : 'Inativo'}</span>
              ${hBank !== 0 ? `<span class="badge ${hBank > 0 ? 'badge-info' : 'badge-danger'}" title="Banco de horas">${hBank > 0 ? '+' : ''}${hBank}h</span>` : ''}
            </div>
            <div style="display:flex;gap:6px">
              <button class="btn btn-xs btn-secondary" style="flex:1" onclick="Colaboradores.openDetail('${e.id}')"><i class="fa-solid fa-id-card"></i> Perfil</button>
              ${waUrl ? `<a href="${waUrl}" target="_blank" rel="noopener" class="btn btn-xs" style="background:rgba(37,211,102,.12);color:#25d366;border:1px solid rgba(37,211,102,.3);padding:6px 10px" title="WhatsApp"><i class="fa-brands fa-whatsapp"></i></a>` : ''}
              <button class="btn btn-xs btn-secondary" onclick="Colaboradores.edit('${e.id}')"><i class="fa-solid fa-pen"></i></button>
              ${isActive
                ? `<button class="btn btn-xs btn-danger" onclick="Colaboradores.demitir('${e.id}')" title="Demitir"><i class="fa-solid fa-user-minus"></i></button>`
                : `<button class="btn btn-xs btn-secondary" onclick="Colaboradores.reativar('${e.id}')" title="Reativar"><i class="fa-solid fa-user-check"></i></button>`}
            </div>
          </div>`;
      }).join('')}
    </div>`;
  }

  /* ── Painel de detalhes ── */
  function openDetail(id) {
    detailId = id;
    const e = employees.find(x => x.id === id);
    if (!e) return;
    const panel = $('colab-detail-panel');
    if (!panel) return;

    const timeRecords = Storage.getSync('hub_time_records', {});
    const absences    = Storage.getSync('hub_absences', {});
    const debts       = Storage.getSync(Storage.KEYS.DEBTS, {});

    const empRecords  = timeRecords[id] || [];
    const empAbsences = absences[id]    || [];
    const hBank       = debts[id]       || 0;

    const thisYear  = new Date().getFullYear();
    const absThisYear = empAbsences.filter(a => (a.date||'').startsWith(String(thisYear)));
    const recentAbs   = empAbsences.slice(0, 5);

    panel.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
        <div style="display:flex;align-items:center;gap:12px">
          <div style="width:52px;height:52px;border-radius:50%;background:var(--accent-bg);border:2px solid var(--accent-bd);display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:700;color:var(--accent)">
            ${Utils.esc((e.name||'?').split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase())}
          </div>
          <div>
            <div style="font-size:16px;font-weight:700">${Utils.esc(e.name)}</div>
            <div class="text-xs text-muted">${Utils.esc(e.info || (e.profile === 'master' ? 'Master' : 'Colaborador'))}</div>
          </div>
        </div>
        <button class="btn btn-xs btn-ghost" onclick="Colaboradores.closeDetail()"><i class="fa-solid fa-xmark"></i></button>
      </div>

      <!-- Dados pessoais -->
      <div class="card" style="margin-bottom:12px">
        <div class="card-title" style="margin-bottom:10px">Dados Pessoais</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:13px">
          ${_detailRow('fa-phone',     'Telefone',    e.phone || e.contact || '—')}
          ${_detailRow('fa-envelope',  'Email',       e.email || '—')}
          ${_detailRow('fa-location-dot', 'Endereço', e.address || '—')}
          ${_detailRow('fa-id-card',   'RG',          e.rg  || '—')}
          ${_detailRow('fa-file-lines','CPF',          e.cpf || '—')}
          ${_detailRow('fa-calendar',  'Contratado em', e.hiringDate ? Utils.fmtDate(e.hiringDate) : '—')}
          ${e.firedDate ? _detailRow('fa-calendar-xmark', 'Desligado em', Utils.fmtDate(e.firedDate)) : ''}
        </div>
      </div>

      <!-- Banco de horas e ausências -->
      <div class="card" style="margin-bottom:12px">
        <div class="card-title" style="margin-bottom:10px">Controle de Ponto & Ausências</div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:14px">
          <div style="text-align:center;padding:10px;background:var(--surface2);border-radius:8px">
            <div style="font-size:20px;font-weight:700;color:${hBank >= 0 ? 'var(--success)' : 'var(--danger)'}">${hBank >= 0 ? '+' : ''}${hBank}h</div>
            <div class="text-xs text-muted">Banco de horas</div>
          </div>
          <div style="text-align:center;padding:10px;background:var(--surface2);border-radius:8px">
            <div style="font-size:20px;font-weight:700;color:var(--text)">${empRecords.length}</div>
            <div class="text-xs text-muted">Registros de ponto</div>
          </div>
          <div style="text-align:center;padding:10px;background:var(--surface2);border-radius:8px">
            <div style="font-size:20px;font-weight:700;color:${absThisYear.length > 3 ? 'var(--danger)' : 'var(--text)'}">${absThisYear.length}</div>
            <div class="text-xs text-muted">Ausências em ${thisYear}</div>
          </div>
        </div>
        ${recentAbs.length ? `
          <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--text-sec);margin-bottom:8px">Últimas ausências</div>
          ${recentAbs.map(a => `
            <div style="display:flex;gap:10px;align-items:center;padding:8px 0;border-bottom:1px solid var(--border);font-size:12px">
              <span class="badge badge-muted">${Utils.fmtDate(a.date)}</span>
              <span>${Utils.esc(a.reason || '—')}</span>
              ${a.obs ? `<span class="text-muted">${Utils.esc(a.obs)}</span>` : ''}
            </div>`).join('')}
        ` : '<div class="text-xs text-muted">Nenhuma ausência registrada.</div>'}
      </div>

      <button class="btn btn-secondary btn-sm" onclick="Colaboradores.openSetPass('${e.id}')"><i class="fa-solid fa-key"></i> Alterar PIN de ponto</button>
    `;

    $('colab-detail-panel')?.classList.remove('hidden');
    $('colab-list-panel')?.classList.add('hidden');
  }

  function _detailRow(icon, label, value) {
    return `<div style="padding:6px 0">
      <div class="text-xs text-muted"><i class="fa-solid ${icon}" style="width:12px;text-align:center;margin-right:4px"></i>${label}</div>
      <div style="font-size:13px;font-weight:500;margin-top:2px">${Utils.esc(String(value))}</div>
    </div>`;
  }

  function closeDetail() {
    detailId = null;
    $('colab-detail-panel')?.classList.add('hidden');
    $('colab-list-panel')?.classList.remove('hidden');
  }

  /* ── Modal: add / edit ── */
  function open(emp) {
    editId = emp?.id || null;
    $('colab-modal-title').textContent = editId ? 'Editar Colaborador' : 'Contratar Colaborador';
    $('colab-name').value       = emp?.name       || '';
    $('colab-email').value      = emp?.email      || '';
    $('colab-phone').value      = emp?.phone || emp?.contact || '';
    $('colab-address').value    = emp?.address    || '';
    $('colab-rg').value         = emp?.rg         || '';
    $('colab-cpf').value        = emp?.cpf        || '';
    $('colab-info').value       = emp?.info       || '';
    $('colab-profile').value    = emp?.profile    || 'colab';
    $('colab-hiring-date').value= emp?.hiringDate || new Date().toISOString().split('T')[0];
    const passSection = $('colab-pass-section');
    if (passSection) passSection.classList.toggle('hidden', !!editId);
    $('colab-initial-pass').value = '';
    $('colab-modal').classList.add('open');
  }

  async function saveColab() {
    const name    = $('colab-name').value.trim();
    const email   = $('colab-email').value.trim().toLowerCase();
    const phone   = $('colab-phone').value.trim();
    const address = $('colab-address').value.trim();
    const rg      = $('colab-rg').value.trim();
    const cpf     = $('colab-cpf').value.trim();
    const info    = $('colab-info').value.trim();
    const profile = $('colab-profile').value;
    const hiringDate = $('colab-hiring-date').value;
    const initPass= $('colab-initial-pass')?.value?.trim();

    if (!name) { Toast.error('Informe o nome.'); return; }

    const isGoogleUser = email && !email.endsWith('@hub-interno.app');

    if (!editId && !isGoogleUser && initPass && initPass.length < 4) { Toast.error('Senha deve ter mínimo 4 caracteres.'); return; }

    if (editId) {
      const emp = employees.find(e => e.id === editId);
      if (!emp) return;
      const oldName = emp.name;
      Object.assign(emp, { name, email, phone, address, rg, cpf, info, profile, hiringDate });
      if (oldName !== name) {
        const pw = Auth.getPasswords();
        if (pw[oldName]) { pw[name] = pw[oldName]; delete pw[oldName]; Auth.savePasswords(pw); }
      }
    } else {
      if (employees.find(e => e.name.toLowerCase() === name.toLowerCase())) { Toast.error('Já existe um colaborador com este nome.'); return; }
      // Se informou senha inicial, salva em hub_passwords
      if (!isGoogleUser && initPass) {
        Auth.setPassword(name, initPass);
      }
      employees.push({ id: Utils.uid(), name, email: isGoogleUser ? email : '', phone, address, rg, cpf, info, profile, hiringDate, status: 'active' });
    }

    save();
    $('colab-modal').classList.remove('open');
    render();
    Toast.success('Colaborador salvo.');
    Logger.log(`${editId ? 'Editou' : 'Contratou'} colaborador: ${name}`);
  }

  function demitir(id) {
    const emp = employees.find(e => e.id === id);
    if (!emp) return;
    Modal.confirm({
      title: 'Demitir Colaborador',
      body: `<p>Marcar <strong>${Utils.esc(emp.name)}</strong> como inativo?</p><p class="text-sm text-muted mt-2">O histórico de ponto e dados são mantidos.</p>`,
      confirmText: 'Demitir', confirmClass: 'btn-danger',
      onConfirm() {
        emp.status    = 'inactive';
        emp.firedDate = new Date().toISOString().split('T')[0];
        save(); render();
        Toast.success(`${emp.name} marcado como inativo.`);
        Logger.log(`Demitiu colaborador: ${emp.name}`);
      }
    });
  }

  function reativar(id) {
    const emp = employees.find(e => e.id === id);
    if (!emp) return;
    Modal.confirm({
      title: 'Reativar Colaborador',
      body: `<p>Reativar <strong>${Utils.esc(emp.name)}</strong>?</p>`,
      confirmText: 'Reativar', confirmClass: 'btn-primary',
      onConfirm() {
        emp.status    = 'active';
        emp.firedDate = null;
        save(); render();
        Toast.success(`${emp.name} reativado.`);
      }
    });
  }

  /* ── Modal: PIN de ponto ── */
  function openSetPass(id) {
    const emp = employees.find(e => e.id === id);
    if (!emp) return;
    $('colab-pass-name').textContent = emp.name;
    $('colab-pass-id').value         = id;
    $('colab-pass-1').value          = '';
    $('colab-pass-2').value          = '';
    $('colab-pass-modal').classList.add('open');
  }

  function savePassword() {
    const id  = $('colab-pass-id').value;
    const emp = employees.find(e => e.id === id);
    if (!emp) return;
    const p1 = $('colab-pass-1').value;
    const p2 = $('colab-pass-2').value;
    if (!p1 || p1.length < 4) { Toast.error('PIN deve ter mínimo 4 caracteres.'); return; }
    if (p1 !== p2)             { Toast.error('Os PINs não coincidem.'); return; }
    Auth.setPassword(emp.name, p1);
    $('colab-pass-modal').classList.remove('open');
    render();
    Toast.success(`PIN de ponto de "${emp.name}" definido.`);
    Logger.log(`Definiu PIN de ponto para: ${emp.name}`);
  }

  /* ── Utilitário global ── */
  function populateSelect(selectId, { includeAll = false, selected = '' } = {}) {
    const sel = document.getElementById(selectId);
    if (!sel) return;
    load();
    const opts = includeAll ? `<option value="">Todos / Geral</option>` : '';
    sel.innerHTML = opts + employees.filter(e => (e.status||'active') === 'active').map(e =>
      `<option value="${Utils.esc(e.name)}"${e.name === selected ? ' selected' : ''}>${Utils.esc(e.name)}</option>`
    ).join('');
  }

  /* ── Init ── */
  function init() {
    load();
    Storage.subscribe(KEY, data => { employees = data ?? []; render(); });

    $('colab-add-btn')?.addEventListener('click', () => open(null));
    $('colab-save')?.addEventListener('click', saveColab);
    $('colab-cancel')?.addEventListener('click', () => $('colab-modal').classList.remove('open'));

    $('colab-pass-save')?.addEventListener('click', savePassword);
    $('colab-pass-cancel')?.addEventListener('click', () => $('colab-pass-modal').classList.remove('open'));

    $('colab-search')?.addEventListener('input', e => { _query = e.target.value; render(); });

    // Filtros de status
    document.querySelectorAll('[data-colab-filter]').forEach(btn => {
      btn.addEventListener('click', () => {
        _filterStatus = btn.dataset.colabFilter;
        document.querySelectorAll('[data-colab-filter]').forEach(b => b.classList.toggle('active', b === btn));
        render();
      });
    });

    document.addEventListener('route:change', e => {
      if (e.detail.route === 'colaboradores') {
        closeDetail();
        render();
      }
    });

    render();
  }

  return {
    init, render, populateSelect, closeDetail, openDetail,
    edit(id)      { open(employees.find(e => e.id === id)); },
    demitir, reativar, openSetPass, savePassword,
    getAll()      { load(); return [...employees]; }
  };
})();
window.Colaboradores = Colaboradores;
