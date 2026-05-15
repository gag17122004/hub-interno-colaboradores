/**
 * shared.js — Utilitários compartilhados DRY
 *
 * Centraliza padrões repetidos em todos os módulos:
 *   UI        → emptyState, modal, tabs, confirmDelete
 *   Store     → factory para módulos CRUD simples
 *   Arr       → findById, groupBy, safeArray
 *   Validators → required, minLength, isDate
 *   Fmt       → currency, hours, date (aliases de Utils)
 */

/* ── UI Helpers ─────────────────────────────────────────── */
const UI = {
  /**
   * Gera HTML de estado vazio padronizado.
   * Elimina 35 duplicações inline de empty-state HTML.
   */
  emptyState(icon, message) {
    return `<div class="empty-state">
      <i class="fa-solid ${icon}"></i>
      <p>${Utils.esc(message)}</p>
    </div>`;
  },

  /** Abre modal pelo id. Centraliza 23 chamadas a classList.add('open'). */
  openModal(id) {
    document.getElementById(id)?.classList.add('open');
  },

  /** Fecha modal pelo id. Centraliza 24 chamadas a classList.remove('open'). */
  closeModal(id) {
    document.getElementById(id)?.classList.remove('open');
  },

  /**
   * Modal de confirmação de exclusão padronizado.
   * Elimina 17 blocos Modal.confirm repetidos.
   *
   * @param {string}   title      – título do modal
   * @param {string}   itemLabel  – descrição do item (exibida no body)
   * @param {Function} onConfirm  – callback executado na confirmação
   */
  confirmDelete(title, itemLabel, onConfirm) {
    Modal.confirm({
      title,
      body: `<p>Remover <strong>${Utils.esc(itemLabel)}</strong>?</p>
             <p class="text-sm text-muted mt-2">Esta ação não pode ser desfeita.</p>`,
      confirmText: 'Remover',
      confirmClass: 'btn-danger',
      onConfirm,
    });
  },

  /**
   * Gerencia abas (tabs) de forma genérica.
   * Elimina a função setTab() reimplementada em M1, M7, M11, M12.
   *
   * @param {string}   prefix  – prefixo dos ids (ex: 'm1')
   * @param {string[]} tabs    – lista de nomes de aba (ex: ['records','pending'])
   * @param {string}   active  – aba ativa
   */
  setTab(prefix, tabs, active) {
    tabs.forEach(t => {
      document.getElementById(`${prefix}-tab-${t}`)?.classList.toggle('active', t === active);
      document.getElementById(`${prefix}-tabpanel-${t}`)?.classList.toggle('hidden', t !== active);
    });
  },

  /**
   * Renderiza lista de stats-cards a partir de um array de { label, value, sub?, variant? }.
   * Usado em M1, M7, M9 com estrutura idêntica.
   */
  renderStatCards(containerId, stats) {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = stats.map(s => `
      <div class="stat-card ${s.variant || ''}">
        <div class="stat-label">${Utils.esc(s.label)}</div>
        <div class="stat-value font-mono">${Utils.esc(String(s.value))}</div>
        ${s.sub ? `<div class="stat-sub">${Utils.esc(s.sub)}</div>` : ''}
      </div>`).join('');
  },

  /**
   * Registra listener de route:change para um módulo.
   * Elimina o `document.addEventListener('route:change', ...)` idêntico em 21 módulos.
   *
   * @param {string|string[]} routes  – rota(s) que disparam o callback
   * @param {Function}        handler – callback recebendo o objeto de evento
   */
  onRoute(routes, handler) {
    const list = Array.isArray(routes) ? routes : [routes];
    document.addEventListener('route:change', e => {
      if (list.includes(e.detail.route)) handler(e);
    });
  },
};

/* ── Store Factory ──────────────────────────────────────── */
const Store = {
  /**
   * Cria um módulo de persistência síncrona para um array de itens.
   * Elimina o padrão load/save/getAll repetido em 7 módulos.
   *
   * @param {string} key      – chave do Storage
   * @param {Array}  defaults – valor padrão se a chave não existir
   * @returns {{ load, save, getAll, findById, add, update, remove }}
   */
  createModule(key, defaults = []) {
    return {
      load() {
        return Arr.safeArray(Storage.getSync(key, defaults));
      },
      save(items) {
        Storage.setSync(key, Arr.safeArray(items));
      },
      getAll() {
        return this.load();
      },
      findById(items, id) {
        return Arr.findById(items, id);
      },
      add(items, item) {
        const next = [...items, { id: Utils.uid(), createdAt: new Date().toISOString(), ...item }];
        this.save(next);
        return next;
      },
      update(items, id, patch) {
        const next = items.map(x => x.id === id ? { ...x, ...patch, updatedAt: new Date().toISOString() } : x);
        this.save(next);
        return next;
      },
      remove(items, id) {
        const next = items.filter(x => x.id !== id);
        this.save(next);
        return next;
      },
    };
  },
};

/* ── Array Utilities ────────────────────────────────────── */
const Arr = {
  /**
   * Garante que o valor é um Array.
   * Previne erros "is not iterable" quando Storage retorna null/undefined.
   */
  safeArray(value, fallback = []) {
    return Array.isArray(value) ? value : fallback;
  },

  /**
   * Busca item por id. Centraliza 53 ocorrências de `.find(x => x.id === id)`.
   */
  findById(arr, id) {
    return Arr.safeArray(arr).find(x => x.id === id) ?? null;
  },

  /**
   * Agrupa array por chave. Centraliza reduce de agrupamento em M1, M7, M10, M19.
   *
   * @param {Array}    arr   – array de itens
   * @param {Function} keyFn – função que retorna a chave de agrupamento
   * @returns {Object}       – { [chave]: item[] }
   */
  groupBy(arr, keyFn) {
    return Arr.safeArray(arr).reduce((acc, item) => {
      const key = keyFn(item);
      (acc[key] = acc[key] || []).push(item);
      return acc;
    }, {});
  },

  /**
   * Soma propriedade numérica de um array.
   * Centraliza o padrão `reduce((s, r) => s + (Number(r.x) || 0), 0)`.
   */
  sumBy(arr, keyFn) {
    return Arr.safeArray(arr).reduce((sum, item) => sum + (Number(keyFn(item)) || 0), 0);
  },
};

/* ── Validators ─────────────────────────────────────────── */
const Validators = {
  /**
   * Valida campo obrigatório. Mostra toast e retorna false se inválido.
   * Elimina `if (!value) { Toast.error(...); return; }` repetido em 15+ funções.
   */
  required(value, fieldName) {
    const v = typeof value === 'string' ? value.trim() : value;
    if (!v && v !== 0) {
      Toast.error(`${fieldName} é obrigatório.`);
      return false;
    }
    return true;
  },

  minLength(value, min, fieldName) {
    if (!value || String(value).length < min) {
      Toast.error(`${fieldName} deve ter no mínimo ${min} caracteres.`);
      return false;
    }
    return true;
  },

  isDate(value, fieldName = 'Data') {
    if (!value || !/^\d{4}-\d{2}-\d{2}/.test(value)) {
      Toast.error(`${fieldName} inválida.`);
      return false;
    }
    return true;
  },

  /** Executa múltiplas validações, retornando false no primeiro erro. */
  all(...checks) {
    return checks.every(Boolean);
  },
};

/* ── Business Logic — cálculos reutilizáveis ────────────── */
const Calc = {
  /**
   * Custo unitário Pratik: (lotWeight × pricePerKg × 2) ÷ qty.
   * Centraliza lógica duplicada em M2 e M8. Previne divisão por zero.
   */
  unitCostPratik(lotWeight, pricePerKg, qty) {
    const q = Math.max(1, Number(qty) || 1);
    const w = Math.max(0, Number(lotWeight) || 0);
    const p = Math.max(0, Number(pricePerKg) || 0);
    return (w * p * 2) / q;
  },

  /**
   * Peso estimado por unidade em gramas: L × C × (micron/10) × 0.92 × 2 camadas.
   * Centraliza fórmula de M2. Previne resultado negativo com entradas inválidas.
   */
  estimatedWeightGrams(widthCm, lengthCm, micronMm) {
    const w = Math.max(0, Number(widthCm)  || 0);
    const c = Math.max(0, Number(lengthCm) || 0);
    const m = Math.max(0, Number(micronMm) || 0);
    return w * c * (m / 10) * 0.92 * 2;
  },

  /**
   * Lucro líquido de uma venda em um marketplace.
   * Centraliza fórmula de M3, eliminando 4 cálculos idênticos.
   *
   * @returns {{ net, pct, breakdown }}
   */
  marketplaceProfit(sellPrice, unitCost, qty, commissionPct, freightAmt = 0) {
    const sp  = Math.max(0, Number(sellPrice)      || 0);
    const uc  = Math.max(0, Number(unitCost)        || 0);
    const q   = Math.max(1, Number(qty)             || 1);
    const com = Math.max(0, Number(commissionPct)   || 0);
    const fr  = Math.max(0, Number(freightAmt)      || 0);

    const revenue      = sp * q;
    const cost         = uc * q;
    const commission   = revenue * (com / 100);
    const operational  = revenue * 0.05;

    const net = revenue - cost - commission - operational - fr;
    const pct = revenue > 0 ? (net / revenue) * 100 : 0;

    return {
      net,
      pct,
      breakdown: { revenue, cost, commission, operational, freight: fr },
    };
  },

  /**
   * Minutos trabalhados (punch1→punch2: manhã, punch3→punch4: tarde).
   * Centraliza lógica de M1.
   */
  workedMinutes(punch1, punch2, punch3, punch4) {
    const toMin = t => {
      if (!t) return 0;
      const [h, m] = String(t).split(':').map(Number);
      return (h || 0) * 60 + (m || 0);
    };
    if (!punch1 || !punch4) return 0;
    const morning  = punch2 ? Math.max(0, toMin(punch2) - toMin(punch1)) : 0;
    const afternoon = punch3 ? Math.max(0, toMin(punch4) - toMin(punch3)) : 0;
    return morning + afternoon;
  },

  /** Horas extras: Math.max(0, trabalhado - 480 minutos). */
  overtimeMinutes(workedMin) {
    return Math.max(0, (Number(workedMin) || 0) - 480);
  },

  /**
   * Peso cúbico para frete: (A × L × C) ÷ 6000.
   * Centraliza fórmula de M4.
   */
  cubicWeight(heightCm, widthCm, lengthCm) {
    return ((Number(heightCm)||0) * (Number(widthCm)||0) * (Number(lengthCm)||0)) / 6000;
  },
};

/* ── Expõe globalmente ──────────────────────────────────── */
window.UI         = UI;
window.Store      = Store;
window.Arr        = Arr;
window.Validators = Validators;
window.Calc       = Calc;
