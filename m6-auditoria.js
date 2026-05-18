/**
 * m6-auditoria.js — Módulo 6: Log de Auditoria (Master Only)
 */

const M6 = (() => {

  const $ = (id) => document.getElementById(id);

  async function render() {
    const tbody = $('m6-logs-tbody');
    if (!tbody) return;

    const logs = await Logger.getLogs();

    if (!Array.isArray(logs) || logs.length === 0) {
      tbody.innerHTML = `<tr><td colspan="3" class="empty-state">
        <i class="fa-solid fa-shield-halved"></i>
        <p>Nenhum registro de auditoria.</p>
      </td></tr>`;
      return;
    }

    tbody.innerHTML = logs.map(log => {
      const dt = new Date(log.timestamp);
      const dateStr = dt.toLocaleDateString('pt-BR');
      const timeStr = dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      return `
        <tr>
          <td class="font-mono" style="white-space:nowrap;font-size:12px">
            ${dateStr} ${timeStr}
          </td>
          <td>
            <span class="badge badge-info">${Utils.esc(log.user || '—')}</span>
          </td>
          <td>${Utils.esc(log.action)}</td>
        </tr>`;
    }).join('');
  }

  function clearLogs() {
    if (!Auth.isMaster()) { Toast.error('Apenas o administrador pode limpar os logs.'); return; }
    Modal.confirm({
      title: 'Limpar Todos os Logs',
      body: '<p>Esta ação removerá <strong>todos</strong> os registros de auditoria.</p><p class="text-sm text-muted mt-2">Esta ação não pode ser desfeita.</p>',
      confirmText: 'Limpar',
      confirmClass: 'btn-danger',
      onConfirm() {
        Logger.clear();
        render();
        Toast.success('Logs de auditoria limpos.');
      }
    });
  }

  function init() {
    const clearBtn = $('m6-clear-btn');
    if (clearBtn) clearBtn.addEventListener('click', clearLogs);

    // Atualiza em tempo real quando um novo log é gerado
    document.addEventListener('audit:new', () => render());

    // Atualiza também via Firestore (logs gerados em outros dispositivos)
    Storage.subscribe(Storage.KEYS.LOGS, () => render());

    document.addEventListener('route:change', (e) => {
      if (e.detail.route === 'm6') render();
    });
  }

  return { init };
})();
window.M6 = M6;
