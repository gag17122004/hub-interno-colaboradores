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
   1. STORAGE — Abstração do LocalStorage
   ============================================================ */
const Storage = {
  /**
   * Lê e desserializa um item.
   * @param {string} key
   * @param {*} fallback — valor padrão se a chave não existir
   */
  get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key);
      return raw !== null ? JSON.parse(raw) : fallback;
    } catch (e) {
      console.warn(`[Storage.get] Erro ao ler "${key}":`, e);
      return fallback;
    }
  },

  /**
   * Serializa e salva um item.
   * @param {string} key
   * @param {*} value
   */
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error(`[Storage.set] Erro ao salvar "${key}":`, e);
      Toast.error('Erro ao salvar dados. LocalStorage pode estar cheio.');
    }
  },

  /**
   * Remove um item.
   * @param {string} key
   */
  remove(key) {
    localStorage.removeItem(key);
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
    DISPUTE_SCRIPTS: 'hub_dispute_scripts' // { reasons, justifications, scripts }
  }
};

/* ============================================================
   1.1 LOGGER — Registro de Auditoria (M6)
   ============================================================ */
const Logger = {
  log(action) {
    const session = Auth.getSession();
    if (!session) return;
    const logs = Storage.get(Storage.KEYS.LOGS, []);
    logs.unshift({
      timestamp: new Date().toISOString(),
      user: session.name,
      action: action
    });
    // Limite de 1000 logs para não estourar o Storage
    Storage.set(Storage.KEYS.LOGS, logs.slice(0, 1000));
    // Dispara evento para atualizar M6 se estiver aberto
    document.dispatchEvent(new CustomEvent('audit:new'));
  },
  getLogs() {
    // Migrar dados da chave antiga
    const old = localStorage.getItem('hub_audit_logs');
    if (old && !localStorage.getItem('hub_audit')) {
      localStorage.setItem('hub_audit', old);
      localStorage.removeItem('hub_audit_logs');
    }
    return Storage.get(Storage.KEYS.LOGS, []);
  },
  clear() {
    Storage.remove(Storage.KEYS.LOGS);
    document.dispatchEvent(new CustomEvent('audit:new'));
  }
};

/* ============================================================
   1.2 AUTH — Sistema de Login e Permissões
   ============================================================ */
const Auth = {
  PASSWORDS: {
    MASTER: 'master123',
    COLAB:  'colab123'
  },

  /* Rotas bloqueadas para colaboradores */
  COLAB_BLOCKED: ['m3', 'm4', 'm6', 'm8', 'm9', 'm11', 'm12'],

  init() {
    const session = this.getSession();
    if (session) {
      this._applySession(session);
    } else {
      this.showLogin();
    }

    // Eventos de Login
    document.getElementById('btn-login-next').addEventListener('click', () => this.handleNext());
    document.getElementById('btn-login-finish').addEventListener('click', () => this.handleFinish());
    document.getElementById('btn-login-back').addEventListener('click', () => this.showStep(1));
    document.getElementById('btn-logout').addEventListener('click', () => this.logout());

    // Enter na senha
    document.getElementById('login-pass').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.handleNext();
    });
  },

  handleNext() {
    const pass = document.getElementById('login-pass').value;
    if (pass === this.PASSWORDS.MASTER) {
      this.login('master', 'Administrador');
    } else if (pass === this.PASSWORDS.COLAB) {
      this.showStep(2);
      this.loadColabSelect();
    } else {
      Toast.error('Senha incorreta.');
    }
  },

  handleFinish() {
    const name = document.getElementById('login-colab-select').value;
    if (!name) return Toast.error('Selecione seu nome.');
    this.login('colab', name);
  },

  login(profile, name) {
    const session = { profile, name };
    Storage.set(Storage.KEYS.SESSION, session);
    this._applySession(session);
    Logger.log('Fez login no sistema');
    Toast.success(`Bem-vindo, ${name}!`);
  },

  logout() {
    Modal.confirm({
      title: 'Sair do Sistema',
      body: 'Deseja realmente encerrar sua sessão?',
      onConfirm: () => {
        Logger.log('Fez logout do sistema');
        Storage.remove(Storage.KEYS.SESSION);
        window.location.reload();
      }
    });
  },

  getSession() {
    return Storage.get(Storage.KEYS.SESSION);
  },

  isMaster() {
    const s = this.getSession();
    return s && s.profile === 'master';
  },

  showLogin() {
    document.getElementById('login-screen').classList.remove('hidden');
    this.showStep(1);
  },

  showStep(n) {
    document.getElementById('login-step-1').classList.toggle('hidden', n !== 1);
    document.getElementById('login-step-2').classList.toggle('hidden', n !== 2);
  },

  loadColabSelect() {
    const select = document.getElementById('login-colab-select');
    const employees = Storage.get(Storage.KEYS.EMPLOYEES, []);
    if (employees.length === 0) {
      select.innerHTML = '<option value="">Nenhum colaborador cadastrado</option>';
      return;
    }
    select.innerHTML = '<option value="">Selecione seu nome...</option>' +
      employees.map(e => `<option value="${Utils.esc(e.name)}">${Utils.esc(e.name)}</option>`).join('');
  },

  _applySession(session) {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('user-info').classList.remove('hidden');
    document.getElementById('user-display-name').textContent = session.name;
    
    document.body.classList.remove('is-master', 'is-colab');
    document.body.classList.add(session.profile === 'master' ? 'is-master' : 'is-colab');

    // Restrição de sidebar: oculta itens conforme perfil
    document.querySelectorAll('[data-route]').forEach(el => {
      const route      = el.dataset.route;
      const masterOnly = el.classList.contains('master-only');
      const colabOnly  = el.classList.contains('colab-only');

      if (session.profile === 'colab') {
        const blocked = Auth.COLAB_BLOCKED.includes(route) || masterOnly;
        el.classList.toggle('hidden', blocked);
      } else {
        // Master: esconde itens exclusivos do colaborador
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

  init() {
    this._current = Storage.get(Storage.KEYS.THEME, 'dark');
    this._apply();
    document.getElementById('theme-toggle').addEventListener('click', () => this.toggle());
  },

  toggle() {
    this._current = this._current === 'dark' ? 'light' : 'dark';
    Storage.set(Storage.KEYS.THEME, this._current);
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

  init() {
    document.querySelectorAll('[data-route]').forEach(item => {
      item.addEventListener('click', () => this.navigate(item.dataset.route));
    });
    // Rota inicial: colaborador vai para "Meu Espaço", master para M1
    const session = Auth.getSession();
    const defaultRoute = session?.profile === 'colab' ? 'me' : 'm1';
    const hash = window.location.hash.replace('#', '');
    const initial = hash && !(session?.profile === 'colab' && Auth.COLAB_BLOCKED.includes(hash))
      ? hash : defaultRoute;
    this.navigate(initial);
  },

  navigate(route) {
    const session = Auth.getSession();
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
  init() {
    Theme.init();
    Auth.init();

    // Inicializa cada módulo na ordem
    MePanel.init();
    M1.init();
    M2.init();
    M3.init();
    M4.init();
    M5.init();
    M6.init();
    M7.init();
    M8.init();
    M9.init();
    M10.init();
    M11.init();
    M12.init();

    console.info('[Hub Interno] Aplicação iniciada com sucesso.');
  }
};

// Aguarda o DOM estar pronto
document.addEventListener('DOMContentLoaded', () => App.init());
