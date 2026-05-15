import { doc, getDoc, setDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";
import { db } from "./firebase-config.js";

const USAR_FIREBASE = true;

/**
 * core.js — Hub Interno
 * Responsabilidades:
 *  - Abstração do LocalStorage (Storage)
 *  - Utilitários globais (formatação, datas)
 *  - Sistema de Toasts
 *  - Sistema de Modal
 *  - Alternância de Tema
 *  - Roteamento entre módulos (sidebar)
 *  - Inicialização da aplicação
 */

/* ============================================================
   1. STORAGE — Abstração do LocalStorage / Firestore
   ============================================================ */
const Storage = {
  _showLoading() {
    let loader = document.getElementById('global-loader');
    if (!loader) {
      loader = document.createElement('div');
      loader.id = 'global-loader';
      loader.innerHTML = '<div class="spinner"></div><div class="text">Carregando dados...</div>';
      loader.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;color:white;font-family:sans-serif;';
      const style = document.createElement('style');
      style.innerHTML = '.spinner { border: 4px solid rgba(255,255,255,0.3); border-radius: 50%; border-top: 4px solid white; width: 40px; height: 40px; animation: spin 1s linear infinite; margin-bottom: 10px; } @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }';
      document.head.appendChild(style);
      document.body.appendChild(loader);
    }
    loader.style.display = 'flex';
  },

  _hideLoading() {
    const loader = document.getElementById('global-loader');
    if (loader) loader.style.display = 'none';
  },

  _getDocRef(key) {
    const sharedKeys = [
      'hub_employees', 'hub_hours', 'hub_products', 'hub_clients', 'hub_quotes',
      'hub_maintenance', 'hub_production', 'hub_pricing', 'hub_raw_prices',
      'hub_mkt_fees', 'hub_debts', 'hub_audit', 'hub_dispute_scripts',
      'hub_prod_goal', 'hub_products_seeded_v1'
    ];

    // hub_session é especial — sempre localStorage
    if (key === 'hub_session') return null;

    if (sharedKeys.includes(key)) {
      // Caminho válido: compartilhado/{key}/dados/value  (4 segmentos)
      return doc(db, 'compartilhado', key, 'dados', 'value');
    } else {
      const session = this._getLocal('hub_session');
      const userName = session ? session.name : 'anonymous';
      // Caminho válido: usuarios/{userName}/dados/{key}  (4 segmentos)
      return doc(db, 'usuarios', userName, 'dados', key);
    }
  },

  _getLocal(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key);
      return raw !== null ? JSON.parse(raw) : fallback;
    } catch (e) {
      console.warn(`[Storage._getLocal] Erro ao ler "${key}":`, e);
      return fallback;
    }
  },

  _setLocal(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error(`[Storage._setLocal] Erro ao salvar "${key}":`, e);
      Toast.error('Erro ao salvar dados. LocalStorage pode estar cheio.');
    }
  },

  _removeLocal(key) {
    localStorage.removeItem(key);
  },

  /**
   * Lê e desserializa um item.
   * @param {string} key
   * @param {*} fallback — valor padrão se a chave não existir
   */
  async get(key, fallback = null) {
    if (!USAR_FIREBASE || key === 'hub_session') {
      return this._getLocal(key, fallback);
    }

    try {
      this._showLoading();
      const docRef = this._getDocRef(key);
      if (!docRef) return this._getLocal(key, fallback);

      const docSnap = await getDoc(docRef);
      this._hideLoading();
      
      if (docSnap.exists()) {
        return docSnap.data().value;
      } else {
        // Se não existe no Firebase, tenta pegar do localStorage (migração)
        const localData = this._getLocal(key);
        if (localData !== null) {
          // Salva no Firebase para a próxima vez
          await this.set(key, localData);
          return localData;
        }
        return fallback;
      }
    } catch (e) {
      this._hideLoading();
      console.warn(`[Storage.get] Erro ao ler "${key}" do Firestore:`, e);
      return this._getLocal(key, fallback); // Fallback para localStorage em caso de erro
    }
  },

  /**
   * Serializa e salva um item.
   * @param {string} key
   * @param {*} value
   */
  async set(key, value) {
    // Sempre salva no localStorage também como backup/fallback
    this._setLocal(key, value);

    if (!USAR_FIREBASE || key === 'hub_session') {
      return;
    }

    try {
      const docRef = this._getDocRef(key);
      if (!docRef) return;

      await setDoc(docRef, { value: value });
    } catch (e) {
      console.error(`[Storage.set] Erro ao salvar "${key}" no Firestore:`, e);
      Toast.error('Erro ao salvar dados na nuvem. Salvo apenas localmente.');
    }
  },

  /**
   * Remove um item.
   * @param {string} key
   */
  async remove(key) {
    this._removeLocal(key);

    if (!USAR_FIREBASE || key === 'hub_session') {
      return;
    }

    try {
      const docRef = this._getDocRef(key);
      if (!docRef) return;

      await deleteDoc(docRef);
    } catch (e) {
      console.error(`[Storage.remove] Erro ao remover "${key}" do Firestore:`, e);
    }
  },

  // Acesso síncrono (localStorage direto) — usado pelos módulos para evitar
  // problemas de timing com Firebase. Firebase continua recebendo as escritas
  // em background para sincronização futura.
  getSync(key, fallback = null) {
    return this._getLocal(key, fallback);
  },
  setSync(key, value) {
    this._setLocal(key, value);
    this.set(key, value).catch(() => {});
  },
  removeSync(key) {
    this._removeLocal(key);
    this.remove(key).catch(() => {});
  },

  // Chaves centralizadas — evita typos espalhados pelo código
  KEYS: {
    THEME:        'hub_theme',
    EMPLOYEES:    'hub_employees',
    HOURS:        'hub_hours',       // { [employeeId]: [{ id, date, hours, period }] }
    DEBTS:        'hub_debts',       // { [employeeId]: number }
    RAW_PRICES:   'hub_raw_prices',  // { coex: number, pebd: number }
    PRODUCTS:     'hub_products',    // [{ id, name, type, weight }]
    MKT_FEES:     'hub_mkt_fees',    // { shopee: { commission, fixed }, ml: { commission, fixed } }
    PRICING:      'hub_pricing',     // { [productId]: { shopee_price, ml_price, sell_qty } }
    TASKS:        'hub_tasks',        // [{ id, date, item, notes }]
    LOGS:         'hub_audit',        // [{ timestamp, user, action }]
    PRODUCTION:   'hub_production',   // [{ id, date, operator, ... }]
    PROD_GOAL:    'hub_prod_goal',    // number
    SESSION:      'hub_session',      // { profile: 'master'|'colab', name: string }
    CLIENTS:      'hub_clients',      // [{ id, name, phone, email, whatsapp, notes }]
    QUOTES:       'hub_quotes',       // [{ id, clientId, date, items, grandTotal }]
    MAINTENANCE:  'hub_maintenance',  // [{ id, type, machine, date, ... }]
    DISPUTE_SCRIPTS: 'hub_dispute_scripts',
    PASSWORDS:       'hub_passwords',
    SIZE_CHANGES:    'hub_size_changes',
    INVENTORY:       'hub_inventory'
  }
};

/* ============================================================
   1.1 LOGGER — Registro de Auditoria (M6)
   ============================================================ */
const Logger = {
  async log(action) {
    const session = await Auth.getSession();
    if (!session) return;
    const logs = await Storage.get(Storage.KEYS.LOGS, []);
    logs.unshift({
      timestamp: new Date().toISOString(),
      user: session.name,
      action: action
    });
    // Limite de 1000 logs para não estourar o Storage
    await Storage.set(Storage.KEYS.LOGS, logs.slice(0, 1000));
    // Dispara evento para atualizar M6 se estiver aberto
    document.dispatchEvent(new CustomEvent('audit:new'));
  },
  async getLogs() {
    // Migrar dados da chave antiga
    const old = localStorage.getItem('hub_audit_logs');
    if (old && !localStorage.getItem('hub_audit')) {
      localStorage.setItem('hub_audit', old);
      localStorage.removeItem('hub_audit_logs');
    }
    return await Storage.get(Storage.KEYS.LOGS, []);
  },
  async clear() {
    await Storage.remove(Storage.KEYS.LOGS);
    document.dispatchEvent(new CustomEvent('audit:new'));
  }
};

/* ============================================================
   1.2 AUTH — Sistema de Login e Permissões
   ============================================================ */
const Auth = {
  MASTER_NAME: 'Administrador',
  DEFAULT_MASTER_PASS: 'master123',
  COLAB_BLOCKED: ['m3', 'm4', 'm6', 'm8', 'm9', 'm11', 'm12'],
  _pendingName: null,

  getPasswords() { return Storage._getLocal(Storage.KEYS.PASSWORDS, {}); },
  savePasswords(pw) { Storage._setLocal(Storage.KEYS.PASSWORDS, pw); },
  getPassword(name) {
    const pw = this.getPasswords();
    return name === this.MASTER_NAME ? (pw[this.MASTER_NAME] || this.DEFAULT_MASTER_PASS) : (pw[name] || null);
  },
  setPassword(name, pass) { const pw = this.getPasswords(); pw[name] = pass; this.savePasswords(pw); },
  hasPassword(name) { return name === this.MASTER_NAME ? true : !!this.getPasswords()[name]; },

  confirmPunchPassword(cb) {
    const session = this.getSession();
    if (!session) return;
    const modal = document.getElementById('modal-punch-pass');
    if (!modal) { cb(); return; }
    document.getElementById('punch-pass-name').textContent = session.name;
    document.getElementById('punch-pass-input').value = '';
    modal.classList.add('open');
    const confirm = () => {
      const val = document.getElementById('punch-pass-input').value;
      const expected = this.getPassword(session.name);
      if (!expected || val === expected) {
        modal.classList.remove('open');
        cb();
      } else {
        Toast.error('Senha incorreta. Nao e possivel bater ponto.');
        document.getElementById('punch-pass-input').value = '';
      }
    };
    document.getElementById('btn-punch-pass-confirm').onclick = confirm;
    document.getElementById('btn-punch-pass-cancel').onclick = () => modal.classList.remove('open');
    document.getElementById('punch-pass-input').onkeydown = e => { if (e.key === 'Enter') confirm(); };
    setTimeout(() => document.getElementById('punch-pass-input').focus(), 100);
  },

  resetColabPassword(name) {
    const newPass = prompt('Nova senha para "' + name + '":');
    if (!newPass || newPass.length < 4) { Toast.error('Senha muito curta (minimo 4 caracteres).'); return; }
    this.setPassword(name, newPass);
    Logger.log('Master redefiniu senha de: ' + name);
    Toast.success('Senha de "' + name + '" redefinida.');
    if (typeof renderPasswordPanel === 'function') renderPasswordPanel();
  },

  init() {
    const session = this.getSession();
    if (session) {
      this._applySession(session);
    } else {
      this.showLogin();
    }
    document.getElementById('btn-login-next')?.addEventListener('click', () => this.handleSelectName());
    document.getElementById('btn-login-finish')?.addEventListener('click', () => this.handlePassword());
    document.getElementById('btn-login-back')?.addEventListener('click', () => this.showStep(1));
    document.getElementById('btn-login-back3')?.addEventListener('click', () => this.showStep(1));
    document.getElementById('btn-login-set-pass')?.addEventListener('click', () => this.handleSetPassword());
    document.getElementById('btn-logout')?.addEventListener('click', () => this.logout());
    document.getElementById('login-pass')?.addEventListener('keypress', e => { if (e.key === 'Enter') this.handlePassword(); });
    document.getElementById('login-confirm-pass')?.addEventListener('keypress', e => { if (e.key === 'Enter') this.handleSetPassword(); });
    this._populateNameSelect();
  },

  _populateNameSelect() {
    const sel = document.getElementById('login-name-select');
    if (!sel) return;
    const employees = Storage._getLocal(Storage.KEYS.EMPLOYEES, []);
    sel.innerHTML = '<option value="">Selecione seu nome...</option>' +
      '<option value="' + Utils.esc(this.MASTER_NAME) + '">' + Utils.esc(this.MASTER_NAME) + '</option>' +
      employees.map(e => '<option value="' + Utils.esc(e.name) + '">' + Utils.esc(e.name) + '</option>').join('');
  },

  handleSelectName() {
    const sel = document.getElementById('login-name-select');
    const name = sel?.value?.trim();
    if (!name) { Toast.error('Selecione seu nome.'); return; }
    this._pendingName = name;
    if (!this.hasPassword(name)) {
      this.showStep(3);
    } else {
      const lbl = document.getElementById('login-step2-label');
      if (lbl) lbl.textContent = 'Ola, ' + name + '! Digite sua senha:';
      const passEl = document.getElementById('login-pass');
      if (passEl) passEl.value = '';
      this.showStep(2);
      setTimeout(() => passEl?.focus(), 80);
    }
  },

  handlePassword() {
    const pass = document.getElementById('login-pass')?.value;
    const name = this._pendingName;
    if (!name) { this.showStep(1); return; }
    if (pass !== this.getPassword(name)) { Toast.error('Senha incorreta.'); return; }
    this.login(name === this.MASTER_NAME ? 'master' : 'colab', name);
  },

  handleSetPassword() {
    const p1 = document.getElementById('login-new-pass')?.value;
    const p2 = document.getElementById('login-confirm-pass')?.value;
    const name = this._pendingName;
    if (!name) { this.showStep(1); return; }
    if (p1.length < 4) { Toast.error('Senha deve ter no minimo 4 caracteres.'); return; }
    if (p1 !== p2) { Toast.error('As senhas nao coincidem.'); return; }
    this.setPassword(name, p1);
    Logger.log('Definiu senha no primeiro acesso: ' + name);
    this.login('colab', name);
  },

  login(profile, name) {
    const session = { profile, name };
    Storage._setLocal(Storage.KEYS.SESSION, session);
    this._applySession(session);
    Logger.log('Fez login no sistema');
    Toast.success('Bem-vindo, ' + name + '!');
  },

  logout() {
    Modal.confirm({
      title: 'Sair do Sistema',
      body: 'Deseja realmente encerrar sua sessao?',
      onConfirm: () => {
        Logger.log('Fez logout do sistema');
        Storage._removeLocal(Storage.KEYS.SESSION);
        window.location.reload();
      }
    });
  },

  getSession() { return Storage._getLocal(Storage.KEYS.SESSION); },
  isMaster()   { const s = this.getSession(); return !!(s && s.profile === 'master'); },

  showLogin() {
    document.getElementById('login-screen')?.classList.remove('hidden');
    this._populateNameSelect();
    this.showStep(1);
  },

  showStep(n) {
    [1, 2, 3].forEach(i => {
      const el = document.getElementById('login-step-' + i);
      if (el) el.classList.toggle('hidden', i !== n);
    });
  },

  _applySession(session) {
    document.getElementById('login-screen')?.classList.add('hidden');
    document.getElementById('user-info')?.classList.remove('hidden');
    const nameEl = document.getElementById('user-display-name');
    if (nameEl) nameEl.textContent = session.name;
    document.body.classList.remove('is-master', 'is-colab');
    document.body.classList.add(session.profile === 'master' ? 'is-master' : 'is-colab');
    document.querySelectorAll('[data-route]').forEach(el => {
      const route = el.dataset.route;
      const masterOnly = el.classList.contains('master-only');
      const colabOnly  = el.classList.contains('colab-only');
      if (session.profile === 'colab') {
        el.classList.toggle('hidden', Auth.COLAB_BLOCKED.includes(route) || masterOnly);
      } else {
        el.classList.toggle('hidden', colabOnly);
      }
    });
    Router.init();
  }
};
/* ============================================================
   2. UTILS — Funções utilitárias globais
   ============================================================ */
const Utils = {
  /**
   * Gera um ID único simples.
   */
  uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  },

  /**
   * Formata número como moeda BRL.
   * @param {number} value
   */
  brl(value) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  },

  /**
   * Formata número com casas decimais.
   * @param {number} value
   * @param {number} decimals
   */
  num(value, decimals = 2) {
    return Number(value || 0).toFixed(decimals);
  },

  /**
   * Formata data ISO (YYYY-MM-DD) para DD/MM/YYYY.
   * @param {string} iso
   */
  fmtDate(iso) {
    if (!iso) return '—';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  },

  /**
   * Retorna o nome do dia da semana para uma data ISO.
   * @param {string} iso — YYYY-MM-DD
   * @returns {'weekday'|'weekend'}
   */
  dayType(iso) {
    if (!iso) return 'weekday';
    // Usar T12:00:00 para evitar problemas de fuso
    const d = new Date(`${iso}T12:00:00`);
    const dow = d.getDay(); // 0=Dom, 6=Sáb
    return (dow === 0 || dow === 6) ? 'weekend' : 'weekday';
  },

  /**
   * Calcula o período de hora extra para dias úteis.
   * Início fixo: 16:00. Soma as horas informadas.
   * @param {number} hours — Ex: 1.5
   * @returns {string} — Ex: "16:00 ÀS 17:30"
   */
  calcPeriod(hours) {
    const startMinutes = 16 * 60; // 16:00 em minutos
    const endMinutes   = startMinutes + Math.round(Number(hours) * 60);
    const fmtTime = (mins) => {
      const h = Math.floor(mins / 60).toString().padStart(2, '0');
      const m = (mins % 60).toString().padStart(2, '0');
      return `${h}:${m}`;
    };
    return `${fmtTime(startMinutes)} ÀS ${fmtTime(endMinutes)}`;
  },

  /**
   * Sanitiza string para evitar XSS ao inserir no DOM.
   * @param {string} str
   */
  esc(str) {
    const d = document.createElement('div');
    d.textContent = str ?? '';
    return d.innerHTML;
  },

  /**
   * Retorna o mês/ano atual no formato YYYY-MM para uso em filtros.
   */
  currentMonth() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  },

  /**
   * Converte "YYYY-MM" para "Mês/YYYY" em português.
   * @param {string} ym — YYYY-MM
   */
  fmtMonth(ym) {
    if (!ym) return '';
    const months = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                    'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
    const [y, m] = ym.split('-');
    return `${months[parseInt(m, 10) - 1]} / ${y}`;
  }
};

/* ============================================================
   3. TOAST — Notificações não-intrusivas
   ============================================================ */
const Toast = {
  _container: null,

  _init() {
    if (!this._container) {
      this._container = document.getElementById('toast-container');
    }
  },

  _show(message, type = 'info', duration = 3200) {
    this._init();
    const icons = { success: 'fa-circle-check', error: 'fa-circle-xmark', info: 'fa-circle-info' };
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `<i class="fa-solid ${icons[type] || icons.info}"></i> ${Utils.esc(message)}`;
    this._container.appendChild(el);
    setTimeout(() => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(6px)';
      el.style.transition = '.2s ease';
      setTimeout(() => el.remove(), 220);
    }, duration);
  },

  success(msg, duration) { this._show(msg, 'success', duration); },
  error(msg, duration)   { this._show(msg, 'error',   duration); },
  info(msg, duration)    { this._show(msg, 'info',    duration); },
};

/* ============================================================
   4. MODAL — Diálogo de confirmação/formulário genérico
   ============================================================ */
const Modal = {
  _el:  null,
  _title: null,
  _body:  null,
  _confirmBtn: null,
  _cancelBtn:  null,
  _onConfirm: null,

  _init() {
    if (this._el) return;
    this._el         = document.getElementById('global-modal');
    this._title      = document.getElementById('modal-title');
    this._body       = document.getElementById('modal-body');
    this._confirmBtn = document.getElementById('modal-confirm');
    this._cancelBtn  = document.getElementById('modal-cancel');

    this._cancelBtn.addEventListener('click', () => this.close());
    this._el.addEventListener('click', (e) => {
      if (e.target === this._el) this.close();
    });
    this._confirmBtn.addEventListener('click', () => {
      if (typeof this._onConfirm === 'function') this._onConfirm();
      this.close();
    });
  },

  /**
   * Abre o modal de confirmação.
   * @param {object} opts
   * @param {string}   opts.title
   * @param {string}   opts.body       — HTML permitido
   * @param {string}   [opts.confirmText]
   * @param {string}   [opts.confirmClass]
   * @param {Function} [opts.onConfirm]
   */
  confirm({ title, body, confirmText = 'Confirmar', confirmClass = 'btn-danger', onConfirm }) {
    this._init();
    this._title.textContent       = title;
    this._body.innerHTML          = body;
    this._confirmBtn.textContent  = confirmText;
    this._confirmBtn.className    = `btn ${confirmClass}`;
    this._onConfirm               = onConfirm;
    this._el.classList.add('open');
  },

  close() {
    this._init();
    this._el.classList.remove('open');
    this._onConfirm = null;
  }
};

/* ============================================================
   5. TEMA — Alternância dark/light
   ============================================================ */
const Theme = {
  _current: 'dark',

  async init() {
    this._current = await Storage.get(Storage.KEYS.THEME, 'dark');
    this._apply();
    document.getElementById('theme-toggle').addEventListener('click', () => this.toggle());
  },

  async toggle() {
    this._current = this._current === 'dark' ? 'light' : 'dark';
    await Storage.set(Storage.KEYS.THEME, this._current);
    this._apply();
  },

  _apply() {
    document.documentElement.setAttribute('data-theme', this._current);
    const pill = document.getElementById('theme-pill');
    const label = document.getElementById('theme-label');
    if (pill)  pill.className  = `toggle-pill ${this._current === 'light' ? 'on' : ''}`;
    if (label) label.textContent = this._current === 'dark' ? 'Tema Escuro' : 'Tema Claro';
  }
};

/* ============================================================
   6. ROUTER — Navegação entre módulos via sidebar
   ============================================================ */
const Router = {
  _current: null,

  async init() {
    document.querySelectorAll('[data-route]').forEach(item => {
      item.addEventListener('click', () => this.navigate(item.dataset.route));
    });
    // Rota inicial: colaborador vai para "Meu Espaço", master para M1
    const session = await Auth.getSession();
    const defaultRoute = session?.profile === 'colab' ? 'me' : 'm1';
    const hash = window.location.hash.replace('#', '');
    const initial = hash && !(session?.profile === 'colab' && Auth.COLAB_BLOCKED.includes(hash))
      ? hash : defaultRoute;
    this.navigate(initial);
  },

  async navigate(route) {
    const session = await Auth.getSession();
    if (!session) return;

    // Verificar permissão
    if (session.profile === 'colab' && Auth.COLAB_BLOCKED.includes(route)) {
      Toast.error('Você não tem permissão para acessar este módulo.');
      return;
    }

    // Atualiza sidebar
    document.querySelectorAll('[data-route]').forEach(item => {
      item.classList.toggle('active', item.dataset.route === route);
    });

    // Mostra painel correto
    document.querySelectorAll('.module-panel').forEach(panel => {
      panel.classList.toggle('active', panel.id === `panel-${route}`);
    });

    // Atualiza topbar
    const navItem = document.querySelector(`[data-route="${route}"]`);
    if (navItem) {
      document.getElementById('topbar-title').textContent =
        navItem.querySelector('span')?.textContent || '';
      document.getElementById('topbar-sub').textContent =
        navItem.dataset.sub || '';
    }

    this._current = route;
    window.location.hash = route;

    // Dispara evento para que cada módulo possa reagir (ex: re-renderizar)
    document.dispatchEvent(new CustomEvent('route:change', { detail: { route } }));
  }
};

/* ============================================================
   7. APP — Inicialização global
   ============================================================ */
const App = {
  async init() {
    Theme.init();
    Auth.init();
    document.dispatchEvent(new CustomEvent('hub:ready'));
    console.info('[Hub Interno] Aplicação iniciada com sucesso.');
  }
};

window.Storage = Storage;
window.Auth    = Auth;
window.Logger  = Logger;
window.Utils   = Utils;
window.Toast   = Toast;
window.Modal   = Modal;
window.Theme   = Theme;
window.Router  = Router;
window.App     = App;

// Aguarda o DOM estar pronto
document.addEventListener('DOMContentLoaded', () => App.init());