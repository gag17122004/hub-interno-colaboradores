/**
 * colaboradores.js — Banco central de colaboradores
 * Fonte de dados para M1 (ponto), M5 (tarefas), M9 (rendimento), M15 (to-do), etc.
 */
const Colaboradores = (() => {
  const $ = id => document.getElementById(id);
  const KEY = Storage.KEYS.EMPLOYEES;

  let employees = [];
  let editId    = null;
  let _query    = '';

  function load() { employees = Storage.getSync(KEY, []); }
  function save() { Storage.setSync(KEY, employees); }

  /* ── Renderização dos cards ── */
  function render() {
    load();
    const el = $('colab-list');
    if (!el) return;

    const q       = _query.toLowerCase();
    const visible = q
      ? employees.filter(e =>
          (e.name||'').toLowerCase().includes(q) ||
          (e.info||'').toLowerCase().includes(q))
      : employees;

    if (!visible.length) {
      el.innerHTML = `<div class="empty-state"><i class="fa-solid fa-users"></i><p>${q ? 'Nenhum colaborador encontrado.' : 'Nenhum colaborador cadastrado. Clique em "Novo Colaborador" para começar.'}</p></div>`;
      return;
    }

    el.innerHTML = `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:14px;margin-top:4px">
      ${visible.map(e => {
        const initials = (e.name||'?').split(' ').slice(0,2).map(w => w[0]).join('').toUpperCase();
        const phone    = (e.contact||'').replace(/\D/g,'');
        const waUrl    = phone ? `https://wa.me/${phone}` : null;
        const hasPass  = Auth.hasPassword(e.name);
        const isMaster = e.profile === 'master';
        return `
          <div style="background:var(--surface2);border:1px solid var(--border);border-radius:12px;padding:16px;display:flex;flex-direction:column;gap:12px">
            <!-- avatar + nome -->
            <div style="display:flex;align-items:center;gap:12px">
              <div style="width:46px;height:46px;border-radius:50%;background:var(--accent-bg);border:2px solid var(--accent-bd);display:flex;align-items:center;justify-content:center;font-size:17px;font-weight:700;color:var(--accent);flex-shrink:0">${Utils.esc(initials)}</div>
              <div style="flex:1;min-width:0">
                <div style="font-size:14px;font-weight:700;color:var(--text)">${Utils.esc(e.name)}</div>
                ${e.info ? `<div class="text-xs text-muted mt-1" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${Utils.esc(e.info)}">${Utils.esc(e.info)}</div>` : ''}
              </div>
            </div>
            <!-- badges -->
            <div style="display:flex;gap:6px;flex-wrap:wrap">
              <span class="badge ${isMaster ? 'badge-warning' : 'badge-muted'}">${isMaster ? 'Master' : 'Colaborador'}</span>
              <span class="badge ${hasPass ? 'badge-success' : 'badge-danger'}">${hasPass ? 'Senha OK' : 'Sem senha'}</span>
              ${e.contact ? `<span class="badge badge-muted"><i class="fa-solid fa-phone" style="font-size:9px"></i> ${Utils.esc(e.contact)}</span>` : ''}
            </div>
            <!-- ações -->
            <div style="display:flex;gap:6px">
              ${waUrl ? `<a href="${waUrl}" target="_blank" rel="noopener" class="btn btn-sm" style="background:rgba(37,211,102,.12);color:#25d366;border:1px solid rgba(37,211,102,.3);padding:7px 10px" title="WhatsApp"><i class="fa-brands fa-whatsapp"></i></a>` : ''}
              <button class="btn btn-xs btn-secondary" style="flex:1" onclick="Colaboradores.openSetPass('${e.id}')">
                <i class="fa-solid fa-key"></i> ${hasPass ? 'Alterar Senha' : 'Definir Senha'}
              </button>
              <button class="btn btn-xs btn-secondary" onclick="Colaboradores.edit('${e.id}')"><i class="fa-solid fa-pen"></i></button>
              <button class="btn btn-xs btn-danger"    onclick="Colaboradores.remove('${e.id}')"><i class="fa-solid fa-trash"></i></button>
            </div>
          </div>`;
      }).join('')}
    </div>`;
  }

  /* ── Modal: add / edit ── */
  function open(emp) {
    editId = emp?.id || null;
    $('colab-modal-title').textContent = editId ? 'Editar Colaborador' : 'Novo Colaborador';
    $('colab-name').value    = emp?.name    || '';
    $('colab-contact').value = emp?.contact || '';
    $('colab-info').value    = emp?.info    || '';
    $('colab-profile').value = emp?.profile || 'colab';
    $('colab-modal').classList.add('open');
  }

  function saveColab() {
    const name    = $('colab-name').value.trim();
    const contact = $('colab-contact').value.trim();
    const info    = $('colab-info').value.trim();
    const profile = $('colab-profile').value;

    if (!name) { Toast.error('Informe o nome.'); return; }

    if (editId) {
      const emp = employees.find(e => e.id === editId);
      if (!emp) return;
      const oldName = emp.name;
      Object.assign(emp, { name, contact, info, profile });
      // migra senha se o nome mudou
      if (oldName !== name) {
        const pw = Auth.getPasswords();
        if (pw[oldName]) { pw[name] = pw[oldName]; delete pw[oldName]; Auth.savePasswords(pw); }
      }
    } else {
      if (employees.find(e => e.name.toLowerCase() === name.toLowerCase())) {
        Toast.error('Já existe um colaborador com este nome.'); return;
      }
      employees.push({ id: Utils.uid(), name, contact, info, profile });
    }

    save();
    $('colab-modal').classList.remove('open');
    render();
    Toast.success('Colaborador salvo.');
    Logger.log(`${editId ? 'Editou' : 'Adicionou'} colaborador: ${name}`);
  }

  function remove(id) {
    const emp = employees.find(e => e.id === id);
    if (!emp) return;
    Modal.confirm({
      title: 'Remover Colaborador',
      body: `<p>Remover <strong>${Utils.esc(emp.name)}</strong>?</p><p class="text-sm text-muted mt-2">Registros de ponto e histórico são mantidos.</p>`,
      confirmText: 'Remover', confirmClass: 'btn-danger',
      onConfirm() {
        employees = employees.filter(e => e.id !== id);
        save(); render();
        Toast.success('Colaborador removido.');
        Logger.log(`Removeu colaborador: ${emp.name}`);
      }
    });
  }

  /* ── Modal: senha ── */
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
    if (!p1 || p1.length < 4) { Toast.error('Senha deve ter mínimo 4 caracteres.'); return; }
    if (p1 !== p2)             { Toast.error('As senhas não coincidem.'); return; }
    Auth.setPassword(emp.name, p1);
    $('colab-pass-modal').classList.remove('open');
    render();
    Toast.success(`Senha de "${emp.name}" definida.`);
    Logger.log(`Definiu senha para: ${emp.name}`);
  }

  /* ── Utilitário global: popula selects de colaboradores em outros módulos ── */
  function populateSelect(selectId, { includeAll = false, selected = '' } = {}) {
    const sel = document.getElementById(selectId);
    if (!sel) return;
    load();
    const opts = includeAll ? `<option value="">Todos / Geral</option>` : '';
    sel.innerHTML = opts + employees.map(e =>
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

    document.addEventListener('route:change', e => {
      if (e.detail.route === 'colaboradores') render();
    });

    render();
  }

  return {
    init, render, populateSelect,
    edit(id)        { open(employees.find(e => e.id === id)); },
    remove, openSetPass, savePassword,
    getAll()        { load(); return [...employees]; }
  };
})();
window.Colaboradores = Colaboradores;
