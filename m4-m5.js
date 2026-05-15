/**
 * m4-frete.js — Módulo 4: Calculadora de Frete E-commerce
 */
const M4 = (() => {

  function update3DBox(h, w, l) {
    const box      = document.getElementById('box3d');
    const emptyMsg = document.getElementById('box3d-empty');
    const label    = document.getElementById('box3d-label');
    if (!box) return;

    if (!h || !w || !l) {
      box.style.display = 'none';
      if (emptyMsg) emptyMsg.style.display = 'flex';
      if (label) label.textContent = '—';
      return;
    }

    box.style.display = 'block';
    if (emptyMsg) emptyMsg.style.display = 'none';

    const maxDim = Math.max(h, w, l);
    const scale  = 140 / maxDim;
    const pH = h * scale;
    const pW = w * scale;
    const pL = l * scale;

    const applyFace = (cls, fw, fh, transform) => {
      const el = box.querySelector(cls);
      if (!el) return;
      el.style.width      = fw + 'px';
      el.style.height     = fh + 'px';
      el.style.left       = '50%';
      el.style.top        = '50%';
      el.style.marginLeft = -(fw / 2) + 'px';
      el.style.marginTop  = -(fh / 2) + 'px';
      el.style.transform  = transform;
    };

    applyFace('.box3d-front',  pW, pH, `translateZ(${pL/2}px)`);
    applyFace('.box3d-back',   pW, pH, `rotateY(180deg) translateZ(${pL/2}px)`);
    applyFace('.box3d-left',   pL, pH, `rotateY(-90deg) translateZ(${pW/2}px)`);
    applyFace('.box3d-right',  pL, pH, `rotateY(90deg) translateZ(${pW/2}px)`);
    applyFace('.box3d-top',    pW, pL, `rotateX(90deg) translateZ(${pH/2}px)`);
    applyFace('.box3d-bottom', pW, pL, `rotateX(-90deg) translateZ(${pH/2}px)`);

    if (label) label.textContent = `Largura ${w}cm × Altura ${h}cm × Comprimento ${l}cm`;
  }

  function calc() {
    const h = parseFloat(document.getElementById('m4-height')?.value)  || 0;
    const w = parseFloat(document.getElementById('m4-width')?.value)   || 0;
    const l = parseFloat(document.getElementById('m4-length')?.value)  || 0;
    const real = parseFloat(document.getElementById('m4-weight')?.value) || 0;

    const cubic = (h * w * l) / 6000;
    update3DBox(h, w, l);

    const realEl  = document.getElementById('m4-real-val');
    const cubicEl = document.getElementById('m4-cubic-val');
    const realCard  = document.getElementById('m4-real-card');
    const cubicCard = document.getElementById('m4-cubic-card');
    const realTag   = document.getElementById('m4-real-tag');
    const cubicTag  = document.getElementById('m4-cubic-tag');
    const chargedEl = document.getElementById('m4-charged');

    if (!realEl) return;

    realEl.textContent  = `${Utils.num(real,  3)} kg`;
    cubicEl.textContent = `${Utils.num(cubic, 3)} kg`;

    const realWins = real >= cubic;
    realCard.classList.toggle('winner',  realWins);
    cubicCard.classList.toggle('winner', !realWins);
    realTag.textContent  = realWins  ? '⬆ COBRADO'  : '';
    cubicTag.textContent = !realWins ? '⬆ COBRADO'  : '';

    chargedEl.textContent = `Peso cobrado: ${Utils.num(Math.max(real, cubic), 3)} kg`;
  }

  function reset() {
    ['m4-height','m4-width','m4-length','m4-weight'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    calc();
  }

  async function init() {
    ['m4-height','m4-width','m4-length','m4-weight'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('input', calc);
    });
    const resetBtn = document.getElementById('m4-reset-btn');
    if (resetBtn) resetBtn.addEventListener('click', reset);

    document.addEventListener('route:change', async (e) => {
      if (e.detail.route === 'm4') calc();
    });
  }

  return { init };
})();

/* ============================================================
   m5-tarefas.js — Módulo 5: Tarefas e Anotações Gerais
   ============================================================ */
const M5 = (() => {

  let tasks = [];

  async function save() { await Storage.set(Storage.KEYS.TASKS, tasks); }
  async function load() { tasks = await Storage.get(Storage.KEYS.TASKS, []); }

  /* ── Renderização ──────────────────────────────────────── */
  function render() {
    const tbody = document.getElementById('m5-tasks-tbody');
    if (!tbody) return;

    const session = Auth.getSession();
    const isMaster = Auth.isMaster();

    // Colaborador vê apenas as próprias tarefas
    let visible = isMaster
      ? [...tasks]
      : tasks.filter(t => !t.owner || t.owner === session?.name);

    const sorted = visible.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    if (sorted.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" class="empty-state">
        <i class="fa-regular fa-folder-open"></i>
        <p>Nenhuma tarefa registrada.</p>
      </td></tr>`;
      return;
    }

    tbody.innerHTML = sorted.map(t => {
      const canEdit = isMaster || !t.owner || t.owner === session?.name;
      return `
      <tr>
        <td style="white-space:nowrap">${Utils.fmtDate(t.date)}</td>
        <td><strong>${Utils.esc(t.item)}</strong></td>
        <td style="max-width:320px">
          <div style="white-space:pre-wrap;font-size:12px;color:var(--text-sec)">${Utils.esc(t.notes)}</div>
        </td>
        <td>
          <div class="flex gap-2">
            ${canEdit ? `
            <button class="btn btn-xs btn-secondary" onclick="M5.editTask('${t.id}')">
              <i class="fa-solid fa-pen"></i>
            </button>
            <button class="btn btn-xs btn-danger" onclick="M5.removeTask('${t.id}')">
              <i class="fa-solid fa-trash"></i>
            </button>` : '<span class="text-xs text-muted">—</span>'}
          </div>
        </td>
      </tr>`;
    }).join('');
  }

  function updateCount() {
    const el = document.getElementById('m5-count');
    if (!el) return;
    const session = Auth.getSession();
    const isMaster = Auth.isMaster();
    const count = isMaster
      ? tasks.length
      : tasks.filter(t => !t.owner || t.owner === session?.name).length;
    el.textContent = count;
  }

  /* ── Modal ─────────────────────────────────────────────── */
  let _editId = null;

  function openAdd() {
    _editId = null;
    document.getElementById('m5-modal-title').textContent = 'Nova Tarefa';
    document.getElementById('m5-task-date').value  = '';
    document.getElementById('m5-task-item').value  = '';
    document.getElementById('m5-task-notes').value = '';
    document.getElementById('modal-task').classList.add('open');
  }

  function editTask(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    _editId = id;
    document.getElementById('m5-modal-title').textContent = 'Editar Tarefa';
    document.getElementById('m5-task-date').value  = task.date;
    document.getElementById('m5-task-item').value  = task.item;
    document.getElementById('m5-task-notes').value = task.notes;
    document.getElementById('modal-task').classList.add('open');
  }

  function closeModal() {
    document.getElementById('modal-task').classList.remove('open');
    _editId = null;
  }

  async function saveTask() {
    const date  = document.getElementById('m5-task-date').value;
    const item  = document.getElementById('m5-task-item').value.trim();
    const notes = document.getElementById('m5-task-notes').value.trim();

    if (!date) { Toast.error('Selecione a data.'); return; }
    if (!item) { Toast.error('Informe o item/tarefa.'); return; }

    const session = Auth.getSession();
    const owner = session?.name || 'master';

    if (_editId) {
      const idx = tasks.findIndex(t => t.id === _editId);
      if (idx !== -1) tasks[idx] = { ...tasks[idx], date, item, notes };
    } else {
      tasks.push({ id: Utils.uid(), date, item, notes, owner });
    }

    await save();
    Logger.log(`${_editId ? 'Editou' : 'Adicionou'} tarefa: ${item}`);
    closeModal();
    render();
    updateCount();
    Toast.success(_editId ? 'Tarefa atualizada.' : 'Tarefa adicionada.');
  }

  async function removeTask(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    Modal.confirm({
      title: 'Remover Tarefa',
      body: `<p>Remover <strong>"${Utils.esc(task.item)}"</strong>?</p>`,
      confirmText: 'Remover',
      confirmClass: 'btn-danger',
      async onConfirm() {
        tasks = tasks.filter(t => t.id !== id);
        await save();
        Logger.log(`Removeu tarefa: ${task.item}`);
        render();
        updateCount();
        Toast.success('Tarefa removida.');
      }
    });
  }

  /* ── Init ──────────────────────────────────────────────── */
  async function init() {
    await load();

    const addBtn = document.getElementById('m5-add-btn');
    if (addBtn) addBtn.addEventListener('click', openAdd);

    const saveBtn = document.getElementById('m5-save-task-btn');
    if (saveBtn) saveBtn.addEventListener('click', saveTask);

    const cancelBtn = document.getElementById('m5-cancel-task-btn');
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

    render();
    updateCount();

    document.addEventListener('route:change', async (e) => {
      if (e.detail.route === 'm5') {
        await load();
        render();
        updateCount();
      }
    });
  }

  return { init, editTask, removeTask };
})();