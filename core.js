import { doc, getDoc, setDoc, deleteDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";
import { signInWithPopup, signInWithRedirect, getRedirectResult, GoogleAuthProvider, signInAnonymously, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";
import { db, auth, apiKey as fbApiKey } from "./firebase-config.js";

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

  _showSyncStatus(state) {
    if (!document.getElementById('hub-sync-style')) {
      const style = document.createElement('style');
      style.id = 'hub-sync-style';
      style.innerHTML = '#hub-sync-indicator{position:fixed;bottom:16px;left:16px;display:flex;align-items:center;gap:8px;padding:6px 12px;border-radius:8px;background:rgba(30,30,40,0.88);color:#fff;font-family:sans-serif;font-size:.82rem;box-shadow:0 2px 8px rgba(0,0,0,.3);z-index:9990;transition:opacity .3s ease;} @keyframes hub-cloud-spin{0%{transform:rotate(0deg);}100%{transform:rotate(360deg);}} #hub-sync-indicator.saving i{animation:hub-cloud-spin 1s linear infinite;display:inline-block;}';
      document.head.appendChild(style);
    }
    let el = document.getElementById('hub-sync-indicator');
    if (!el) { el = document.createElement('div'); el.id = 'hub-sync-indicator'; document.body.appendChild(el); }
    clearTimeout(el._hideTimer);
    el.style.opacity = '1';
    el.className = state;
    const cfg = {
      saving: { icon: 'fa-cloud-arrow-up', label: 'Salvando...',    hide: 0    },
      saved:  { icon: 'fa-circle-check',   label: 'Salvo',          hide: 2000 },
      error:  { icon: 'fa-circle-xmark',   label: 'Erro ao salvar', hide: 4000 },
    };
    const { icon, label, hide } = cfg[state] || cfg.error;
    el.innerHTML = `<i class="fa-solid ${icon}"></i><span>${label}</span>`;
    if (hide > 0) {
      el._hideTimer = setTimeout(() => {
        el.style.opacity = '0';
        setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 320);
      }, hide);
    }
  },

  _getDocRef(key) {
    const sharedKeys = [
      'hub_employees', 'hub_hours', 'hub_products', 'hub_clients', 'hub_quotes',
      'hub_maintenance', 'hub_production', 'hub_pricing', 'hub_raw_prices',
      'hub_mkt_fees', 'hub_debts', 'hub_audit', 'hub_dispute_scripts',
      'hub_prod_goal', 'hub_products_seeded_v1',
      // adicionados: chaves que faltavam no caminho compartilhado
      'hub_time_records', 'hub_absences', 'hub_tasks', 'hub_passwords', 'hub_prod_goals', 'hub_m9_notes',
      'hub_size_changes', 'hub_inventory',
      'hub_m13_platform_manuals', 'hub_m14_resolution_manuals',
      'hub_m15_periodic_todos', 'hub_m16_calendar_events',
      'hub_m17_announcements', 'hub_m18_machines', 'hub_contacts', 'hub_help_config'
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
      if (e.name === 'QuotaExceededError' || e.code === 22) {
        // Auto-cleanup: trunca logs de auditoria (maior consumidor de espaço)
        try {
          const logs = JSON.parse(localStorage.getItem(Storage.KEYS.LOGS) || '[]');
          if (logs.length > 50) {
            localStorage.setItem(Storage.KEYS.LOGS, JSON.stringify(logs.slice(0, 50)));
            localStorage.setItem(key, JSON.stringify(value));
            console.warn('[Storage] QuotaExceeded — logs antigos removidos automaticamente.');
            return;
          }
        } catch {}
        console.error(`[Storage._setLocal] QuotaExceededError ao salvar "${key}".`);
        Toast.error('Armazenamento local cheio. Libere espaço no dispositivo.');
      } else {
        console.error(`[Storage._setLocal] Erro ao salvar "${key}":`, e);
        Toast.error('Erro ao salvar dados localmente.');
      }
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
    if (!USAR_FIREBASE || key === 'hub_session' || key === 'hub_theme') {
      return this._getLocal(key, fallback);
    }

    try {
      this._showLoading();
      const docRef = this._getDocRef(key);
      if (!docRef) return this._getLocal(key, fallback);

      const docSnap = await getDoc(docRef);
      this._hideLoading();
      
      if (docSnap.exists()) {
        const value = docSnap.data().value;
        this._setLocal(key, value); // write-back: mantém localStorage em sincronia com Firestore
        return value;
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
      _warnOfflineOnce();
      return this._getLocal(key, fallback); // Fallback para localStorage em caso de erro
    }
  },

  _sanitize(value) {
    try {
      return JSON.parse(JSON.stringify(value, (k, v) => {
        if (typeof v === 'function') { console.warn(`[Storage] Campo "${k}" é função — ignorado`); return undefined; }
        return v;
      }));
    } catch (e) {
      console.error('[Storage._sanitize] Payload não serializável:', e.message);
      return null;
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

    if (!USAR_FIREBASE || key === 'hub_session' || key === 'hub_theme') {
      return;
    }

    const safe = this._sanitize(value);
    if (safe === null) return; // payload corrompido — não envia ao Firestore

    try {
      const docRef = this._getDocRef(key);
      if (!docRef) return;

      await setDoc(docRef, { value: safe });
    } catch (e) {
      const code = e.code || 'unknown';
      this._logSyncError(key, code, e.message);
      console.warn(`[Storage.set] Falha em "${key}": ${code}`);
      switch (code) {
        case 'permission-denied':
          Toast.error(`Sem permissão no servidor ("${key}"). Dado salvo localmente apenas.`);
          break;
        case 'resource-exhausted':
          Toast.error('Cota do servidor atingida. Tente novamente mais tarde.');
          break;
        case 'invalid-argument':
          console.error(`[Storage.set] Payload inválido para "${key}":`, safe);
          break;
        case 'unavailable':
        case 'deadline-exceeded':
          break; // rede instável — silencioso, dado está no localStorage
        default:
          if (code !== 'unknown') console.error(`[Storage.set] Erro inesperado (${code}):`, e.message);
      }
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
  _writeTimers: {},
  _syncErrors:  [],
  _logSyncError(key, code, msg) {
    this._syncErrors.unshift({ ts: new Date().toISOString(), key, code, msg });
    if (this._syncErrors.length > 50) this._syncErrors.pop();
  },
  setSync(key, value) {
    this._setLocal(key, value);
    // Debounce por chave: evita rajada de escritas no Firestore em saves rápidos
    clearTimeout(this._writeTimers[key]);
    this._writeTimers[key] = setTimeout(() => this.set(key, value).catch(() => {}), 400);
  },
  removeSync(key) {
    this._removeLocal(key);
    this.remove(key).catch(() => {});
  },

  // Sincroniza um conjunto de chaves do Firestore para o localStorage em paralelo.
  // Sincroniza TODAS as chaves conhecidas do Firestore → localStorage.
  // Chamado após login para restaurar dados em dispositivo novo/limpo.
  async syncAll() {
    if (!USAR_FIREBASE) return;
    const allKeys = Object.values(this.KEYS).filter(k => k !== 'hub_session' && k !== 'hub_theme');
    await this.syncBatch(allKeys);
  },

  // Não exibe loading global — uso interno nos módulos ao abrir uma rota.
  async syncBatch(keys) {
    if (!USAR_FIREBASE) return;
    // Permite sync mesmo sem sessão de app (auth anônima Firebase já garante acesso)
    await Promise.all((keys || []).map(key => {
      if (key === 'hub_session' || key === 'hub_theme') return Promise.resolve();
      return (async () => {
        try {
          const docRef = this._getDocRef(key);
          if (!docRef) return;
          const snap = await getDoc(docRef);
          if (snap.exists()) this._setLocal(key, snap.data().value);
        } catch (_) {}
      })();
    }));
  },

  // Escuta mudanças em tempo real para uma chave. Chama callback(value) sempre
  // que o documento mudar no Firestore (qualquer dispositivo). Retorna unsubscribe.
  subscribe(key, callback) {
    if (!USAR_FIREBASE || key === 'hub_session' || key === 'hub_theme') return () => {};
    try {
      const docRef = this._getDocRef(key);
      if (!docRef) return () => {};
      return onSnapshot(docRef, snap => {
        if (snap.exists()) {
          const value = snap.data().value;
          this._setLocal(key, value);
          callback(value);
        }
      }, err => console.warn(`[Storage.subscribe] "${key}":`, err.code));
    } catch (e) {
      return () => {};
    }
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
    INVENTORY:       'hub_inventory',
    CONTACTS:        'hub_contacts'
  }
};

/* ============================================================
   1.1 LOGGER — Registro de Auditoria (M6)
   ============================================================ */
const Logger = {
  log(action) {
    const session = Auth.getSession();
    if (!session) return;
    const logs = Storage.getSync(Storage.KEYS.LOGS, []);
    logs.unshift({
      timestamp: new Date().toISOString(),
      user: session.name,
      action: action
    });
    Storage.setSync(Storage.KEYS.LOGS, logs.slice(0, 1000));
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
   1.2 AUTH — Sistema de Login
   Estratégia: auth anônima Firebase (Firestore) + senha local (UI)
   - Senhas ficam em hub_passwords (localStorage + Firestore)
   - Firebase anônimo garante acesso ao Firestore sem contas por usuário
   - Google Sign-In opcional: se Gmail cadastrado em hub_employees, faz login
   ============================================================ */
const Auth = {
  MASTER_NAME:   'Administrador',
  COLAB_BLOCKED: ['m3', 'm4', 'm6', 'm8', 'm9', 'm11', 'm12'],

  /* ── Senhas (hub_passwords) ─────────────────────────────── */
  getPasswords()    { return Storage._getLocal(Storage.KEYS.PASSWORDS, {}); },
  savePasswords(pw) {
    Storage._setLocal(Storage.KEYS.PASSWORDS, pw);
    Storage.set(Storage.KEYS.PASSWORDS, pw).catch(() => {});
  },
  getPassword(name) {
    return this.getPasswords()[name] || null;
  },
  async hashPass(name, pass) {
    const data = new TextEncoder().encode(`hub-pratik|${name.toLowerCase()}|${pass}`);
    const buf  = await crypto.subtle.digest('SHA-256', data);
    return 'h1:' + [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
  },
  async _checkPass(name, input, stored) {
    if (stored.startsWith('h1:')) return (await this.hashPass(name, input)) === stored;
    // Legado plain-text: migra para hash de forma transparente
    if (input === stored) { this.setPassword(name, input).catch(() => {}); return true; }
    return false;
  },
  async setPassword(name, pass) {
    const hash = await this.hashPass(name, pass);
    const pw   = this.getPasswords();
    pw[name]   = hash;
    this.savePasswords(pw);
  },
  hasPassword(name) {
    return !!this.getPasswords()[name];
  },

  /* ── Login com nome + senha (sistema local) ─────────────── */
  async loginWithPassword(name, pass) {
    if (!name) { Toast.error('Selecione seu nome.'); return; }
    if (!pass)  { Toast.error('Digite sua senha.'); return; }
    const stored = this.getPassword(name);
    if (!stored) { Toast.error('Usuário não encontrado na lista de colaboradores.'); return; }
    const ok = await this._checkPass(name, pass, stored);
    if (!ok) { Toast.error('Senha incorreta.'); return; }
    const employees = Storage._getLocal(Storage.KEYS.EMPLOYEES, []);
    const emp = employees.find(e => e.name === name);
    const profile = name === this.MASTER_NAME ? 'master' : (emp?.profile || 'colab');
    this.login(profile, name);
  },

  async _promptFirstMasterPassword() {
    const p1 = prompt('Primeira entrada do Administrador.\nDefina uma senha (mínimo 4 caracteres):');
    if (!p1 || p1.length < 4) { Toast.error('Senha inválida. Mínimo 4 caracteres.'); return; }
    const p2 = prompt('Confirme a senha:');
    if (p1 !== p2) { Toast.error('As senhas não coincidem.'); return; }
    await this.setPassword(this.MASTER_NAME, p1);
    Toast.success('Senha definida. Faça login novamente.');
  },

  /* ── Login com Google (opcional, requer Gmail em hub_employees) ─ */
  async loginWithGoogle() {
    try {
      const provider  = new GoogleAuthProvider();
      const isMobile  = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
                        (navigator.maxTouchPoints > 1 && /Macintosh/i.test(navigator.userAgent));
      if (isMobile) {
        // iOS Safari bloqueia popup OAuth — usa redirect em vez disso
        await signInWithRedirect(auth, provider);
        return; // página recarrega após o redirect do Google
      }
      const result = await signInWithPopup(auth, provider);
      await this._handleGoogleUser(result.user);
    } catch (e) {
      if (e.code !== 'auth/popup-closed-by-user' && e.code !== 'auth/cancelled-popup-request')
        Toast.error('Erro ao entrar com Google.');
    }
  },

  /* Processa usuário Google após popup ou redirect */
  async _handleGoogleUser(user) {
    if (!user) return;
    let employees = Storage._getLocal(Storage.KEYS.EMPLOYEES, []);
    if (!employees.length) {
      try { employees = await Storage.get(Storage.KEYS.EMPLOYEES, []); } catch {}
    }
    let emp = employees.find(e => e.email?.toLowerCase() === user.email?.toLowerCase());
    if (!emp && user.displayName) {
      emp = employees.find(e => e.name.toLowerCase() === user.displayName.toLowerCase());
    }
    if (emp) {
      this.login(emp.profile || 'colab', emp.name);
    } else if (!employees.some(e => e.email)) {
      this.login('master', user.displayName || user.email.split('@')[0]);
    } else {
      signOut(auth).catch(() => {});
      Toast.error('Gmail não cadastrado. Peça ao administrador para adicioná-lo em Colaboradores.');
    }
  },

  login(profile, name) {
    const session = { profile, name };
    Storage._setLocal(Storage.KEYS.SESSION, session);
    this._applySession(session);
    Logger.log('Fez login no sistema');
    Toast.success('Bem-vindo, ' + name + '!');
    document.dispatchEvent(new CustomEvent('auth:login'));
    // Sync em segundo plano — não bloqueia o app
    Storage.syncAll().catch(() => {});
  },

  async verifySession() {
    const session = Storage._getLocal(Storage.KEYS.SESSION);
    if (!session) return;
    try {
      const snap = await getDoc(doc(db, 'usuarios', session.name, 'session', 'profile'));
      if (!snap.exists()) return; // doc ainda não existe (pré-deploy) — não forçar logout
      if (snap.data().profile !== session.profile) {
        // Divergência detectada: forçar logout imediato sem modal (contexto de segurança)
        Storage._removeLocal(Storage.KEYS.SESSION);
        signOut(auth).catch(() => {});
        window.location.reload();
      }
    } catch (_) {}
  },

  logout() {
    Modal.confirm({
      title: 'Sair do Sistema', body: 'Deseja encerrar sua sessão?',
      onConfirm: () => {
        Logger.log('Fez logout do sistema');
        Storage._removeLocal(Storage.KEYS.SESSION);
        signOut(auth).catch(() => {});
        window.location.reload();
      }
    });
  },

  getSession() { return Storage._getLocal(Storage.KEYS.SESSION); },
  isMaster()   { const s = this.getSession(); return !!(s && s.profile === 'master'); },

  /* ── PIN de confirmação de ponto ────────────────────────── */
  confirmPunchPassword(cb) {
    const session = this.getSession();
    if (!session) return;
    const modal = document.getElementById('modal-punch-pass');
    if (!modal) { cb(); return; }
    document.getElementById('punch-pass-name').textContent = session.name;
    document.getElementById('punch-pass-input').value = '';
    modal.classList.add('open');
    const confirm = async () => {
      const val      = document.getElementById('punch-pass-input').value;
      const stored   = this.getPassword(session.name);
      const ok       = !stored || await this._checkPass(session.name, val, stored);
      if (ok) {
        modal.classList.remove('open'); cb();
      } else {
        Toast.error('Senha incorreta. Não é possível bater ponto.');
        document.getElementById('punch-pass-input').value = '';
      }
    };
    document.getElementById('btn-punch-pass-confirm').onclick = confirm;
    document.getElementById('btn-punch-pass-cancel').onclick  = () => modal.classList.remove('open');
    document.getElementById('punch-pass-input').onkeydown = e => { if (e.key === 'Enter') confirm(); };
    setTimeout(() => document.getElementById('punch-pass-input')?.focus(), 100);
  },

  resetColabPassword(name) {
    Modal.input({
      title: `Nova senha para "${name}"`,
      placeholder: 'Mínimo 4 caracteres',
      confirmText: 'Salvar Senha',
      onConfirm: async (val) => {
        const newPass = (val || '').trim();
        if (newPass.length < 4) { Toast.error('Senha muito curta (mínimo 4 caracteres).'); return; }
        await this.setPassword(name, newPass);
        Logger.log('Master redefiniu senha de: ' + name);
        Toast.success('Senha de "' + name + '" redefinida.');
        if (typeof renderPasswordPanel === 'function') renderPasswordPanel();
      }
    });
  },

  /* Mantido para compatibilidade com módulo Colaboradores */
  async createAuthUser() { /* não necessário com auth anônima */ },

  showLogin() {
    document.getElementById('login-screen')?.classList.remove('hidden');
    this._populateNameSelect();
  },

  _populateNameSelect() {
    const sel = document.getElementById('login-name-select');
    if (!sel) return;
    const employees = Storage._getLocal(Storage.KEYS.EMPLOYEES, []);
    sel.innerHTML = `<option value="">Selecione seu nome...</option>
      <option value="${Utils.esc(this.MASTER_NAME)}">${Utils.esc(this.MASTER_NAME)}</option>` +
      employees.map(e => `<option value="${Utils.esc(e.name)}">${Utils.esc(e.name)}</option>`).join('');
  },

  init() {
    // Popula select imediatamente — sem esperar Firebase
    this._populateNameSelect();

    document.getElementById('btn-google-signin')?.addEventListener('click', () => this.loginWithGoogle());
    document.getElementById('btn-login-finish')?.addEventListener('click', () => {
      this.loginWithPassword(
        document.getElementById('login-name-select')?.value?.trim(),
        document.getElementById('login-pass')?.value
      );
    });
    document.getElementById('login-pass')?.addEventListener('keypress', e => {
      if (e.key === 'Enter') document.getElementById('btn-login-finish')?.click();
    });
    document.getElementById('btn-logout')?.addEventListener('click', () => this.logout());
  },

  _applySession(session) {
    Storage._setLocal(Storage.KEYS.SESSION, session);
    document.getElementById('login-screen')?.classList.add('hidden');
    document.getElementById('user-info')?.classList.remove('hidden');
    const nameEl = document.getElementById('user-display-name');
    if (nameEl) nameEl.textContent = session.name;
    document.body.classList.remove('is-master', 'is-colab');
    document.body.classList.add(session.profile === 'master' ? 'is-master' : 'is-colab');
    document.querySelectorAll('[data-route]').forEach(el => {
      const route     = el.dataset.route;
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

  debounce(fn, ms = 400) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
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
    const icons = { success: 'fa-circle-check', error: 'fa-circle-xmark', info: 'fa-circle-info', warning: 'fa-triangle-exclamation' };
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
  warning(msg, duration) { this._show(msg, 'warning', duration); },
};

function _warnOfflineOnce() {
  if (sessionStorage.getItem('hub_offline_warned')) return;
  sessionStorage.setItem('hub_offline_warned', '1');
  Toast.warning('Modo offline — dados locais', 4000);
}

function sanitizeHTML(str) {
  if (typeof DOMPurify !== 'undefined') return DOMPurify.sanitize(str);
  const p = document.createElement('div');
  p.textContent = str;
  return p.innerHTML;
}

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
    this._body.innerHTML          = sanitizeHTML(body);
    this._confirmBtn.textContent  = confirmText;
    this._confirmBtn.className    = `btn ${confirmClass}`;
    this._onConfirm               = onConfirm;
    this._el.classList.add('open');
  },

  /**
   * Modal com campo de texto — substitui prompt() que é bloqueado em iOS PWA.
   */
  input({ title, placeholder = '', defaultValue = '', confirmText = 'Confirmar', onConfirm }) {
    this._init();
    this._title.textContent       = title;
    this._confirmBtn.textContent  = confirmText;
    this._confirmBtn.className    = 'btn btn-primary';
    const inp = document.createElement('input');
    inp.type        = 'text';
    inp.placeholder = placeholder;
    inp.value       = defaultValue;
    inp.style.cssText = 'width:100%;margin-top:10px;padding:8px 12px;border:1px solid var(--border);border-radius:8px;background:var(--surface2);color:var(--text);font-size:14px;outline:none';
    this._body.innerHTML = '';
    this._body.appendChild(inp);
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') this._confirmBtn.click(); });
    this._onConfirm = () => onConfirm && onConfirm(inp.value);
    this._el.classList.add('open');
    setTimeout(() => inp.focus(), 80);
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
  _current: 'light',

  async init() {
    this._current = await Storage.get(Storage.KEYS.THEME, 'light');
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
  init() {
    // Splash screen
    let splashRemoved = false;
    const removeSplash = () => {
      if (splashRemoved) return;
      splashRemoved = true;
      const s = document.getElementById('hub-splash');
      if (s) { s.style.transition = 'opacity .3s ease'; s.style.opacity = '0'; setTimeout(() => s.remove(), 320); }
    };
    const splash = document.createElement('div');
    splash.id = 'hub-splash';
    splash.innerHTML = '<div class="hub-spin-el"></div><div style="font-size:1.3rem;font-weight:600;letter-spacing:.05em;">Hub Interno</div>';
    splash.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:#1a1a2e;z-index:99999;display:flex;flex-direction:column;gap:18px;align-items:center;justify-content:center;color:#fff;font-family:sans-serif;';
    if (!document.getElementById('hub-splash-style')) {
      const style = document.createElement('style');
      style.id = 'hub-splash-style';
      style.innerHTML = '.hub-spin-el{width:44px;height:44px;border:4px solid rgba(255,255,255,0.25);border-top:4px solid #fff;border-radius:50%;animation:hub-spin 1s linear infinite;} @keyframes hub-spin{0%{transform:rotate(0deg);}100%{transform:rotate(360deg);}}';
      document.head.appendChild(style);
    }
    document.body.appendChild(splash);
    const splashTimeout = setTimeout(removeSplash, 8000);

    Theme.init();
    Auth.init();

    // Mostra o app OU o login imediatamente — sem esperar Firebase
    const session = Auth.getSession();
    if (session) {
      Auth._applySession(session);
    } else {
      Auth.showLogin();
    }

    // Processa resultado de redirect Google (fluxo mobile)
    getRedirectResult(auth)
      .then(result => { if (result?.user) Auth._handleGoogleUser(result.user); })
      .catch(() => {});

    // hub:ready só dispara após Firebase auth estar pronto
    // (garante que onSnapshot dos módulos funciona com regras auth != null)
    let hubFired = false;
    const fireReady = () => {
      if (hubFired) return;
      hubFired = true;
      document.dispatchEvent(new CustomEvent('hub:ready'));
      console.info('[Hub Interno] pronto.');
    };

    // Fallback: se Firebase não responder em 3s, inicia o app mesmo assim
    const authTimeout = setTimeout(fireReady, 3000);
    const unsubAuth = onAuthStateChanged(auth, user => {
      if (!user) return; // aguarda login anônimo concluir
      clearTimeout(authTimeout);
      unsubAuth();
      fireReady();
    });

    signInAnonymously(auth).catch(e => {
      console.error('[Hub] signInAnonymously falhou:', e.code, e.message);
    });
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