/**
 * hub.test.js — Suíte de testes completa do Hub Interno
 *
 * Mini test-runner embutido (sem dependências externas).
 * Executa no browser via tests/index.html ou no Node via:
 *   node -e "$(cat tests/hub.test.js)" 2>&1
 *
 * Cobertura:
 *   ✓ Calc.*           — cálculos de negócio (happy path, edge cases, sad paths)
 *   ✓ Arr.*            — utilitários de array
 *   ✓ Validators.*     — validações
 *   ✓ Utils.*          — formatação (via stubs)
 *   ✓ Store.*          — factory CRUD
 *   ✓ Auth (unit)      — lógica de senha e sessão
 *   ✓ Storage._getDocRef — caminhos Firestore
 */

/* ═══════════════════════════════════════════════════════════
   MINI TEST RUNNER
   ═══════════════════════════════════════════════════════════ */

const _results = { passed: 0, failed: 0, errors: [] };

function describe(suite, fn) {
  console.group?.(`📦 ${suite}`) ?? console.log(`\n── ${suite}`);
  fn();
  console.groupEnd?.();
}

function it(name, fn) {
  try {
    fn();
    _results.passed++;
    console.log(`  ✅ ${name}`);
  } catch (e) {
    _results.failed++;
    _results.errors.push({ name, error: e.message });
    console.error(`  ❌ ${name}\n     ${e.message}`);
  }
}

function expect(actual) {
  return {
    toBe(expected) {
      if (actual !== expected)
        throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    },
    toEqual(expected) {
      if (JSON.stringify(actual) !== JSON.stringify(expected))
        throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    },
    toBeCloseTo(expected, decimals = 2) {
      const factor = Math.pow(10, decimals);
      if (Math.round(actual * factor) !== Math.round(expected * factor))
        throw new Error(`Expected ≈${expected} (${decimals} decimals), got ${actual}`);
    },
    toBeGreaterThan(n) {
      if (!(actual > n)) throw new Error(`Expected ${actual} > ${n}`);
    },
    toBeLessThanOrEqual(n) {
      if (!(actual <= n)) throw new Error(`Expected ${actual} <= ${n}`);
    },
    toBeNull() {
      if (actual !== null) throw new Error(`Expected null, got ${JSON.stringify(actual)}`);
    },
    toBeTruthy() {
      if (!actual) throw new Error(`Expected truthy, got ${JSON.stringify(actual)}`);
    },
    toBeFalsy() {
      if (actual) throw new Error(`Expected falsy, got ${JSON.stringify(actual)}`);
    },
    toContain(item) {
      if (!Array.isArray(actual) && typeof actual !== 'string')
        throw new Error('toContain requires Array or string');
      if (!actual.includes(item))
        throw new Error(`Expected ${JSON.stringify(actual)} to contain ${JSON.stringify(item)}`);
    },
    toHaveLength(n) {
      if (!actual || actual.length !== n)
        throw new Error(`Expected length ${n}, got ${actual?.length}`);
    },
    toThrow() {
      if (typeof actual !== 'function') throw new Error('toThrow requires a function');
      try { actual(); throw new Error('Function did not throw'); }
      catch (e) { if (e.message === 'Function did not throw') throw e; }
    },
  };
}

/* ═══════════════════════════════════════════════════════════
   STUBS — substituem dependências do browser
   ═══════════════════════════════════════════════════════════ */

// Stub Utils (apenas funções puras usadas nos testes)
const Utils = {
  uid()         { return Math.random().toString(36).slice(2); },
  brl(v)        { return `R$ ${Number(v||0).toFixed(2).replace('.',',')}` ; },
  num(v, d=2)   { return Number(v||0).toFixed(d); },
  fmtDate(iso)  { if (!iso) return '—'; const [y,m,d]=iso.split('-'); return `${d}/${m}/${y}`; },
  esc(s)        { return String(s??''); },
  currentMonth(){ const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; },
};

// Stub Toast (captura chamadas para asserção)
const _toasts = [];
const Toast = {
  success(m) { _toasts.push({type:'success',msg:m}); },
  error(m)   { _toasts.push({type:'error',  msg:m}); },
  info(m)    { _toasts.push({type:'info',   msg:m}); },
  _reset()   { _toasts.length = 0; },
  _last()    { return _toasts[_toasts.length - 1]; },
};

// Stub Storage (localStorage em memória)
const _store = {};
const Storage = {
  KEYS: {
    EMPLOYEES:'hub_employees', SESSION:'hub_session', TASKS:'hub_tasks',
    PRODUCTS:'hub_products', RAW_PRICES:'hub_raw_prices',
    PASSWORDS:'hub_passwords',
  },
  _getLocal(k, fb=null) { return k in _store ? JSON.parse(_store[k]) : fb; },
  _setLocal(k, v)       { _store[k] = JSON.stringify(v); },
  _removeLocal(k)       { delete _store[k]; },
  getSync(k, fb=null)   { return this._getLocal(k, fb); },
  setSync(k, v)         { this._setLocal(k, v); },
  removeSync(k)         { this._removeLocal(k); },
  _reset()              { Object.keys(_store).forEach(k => delete _store[k]); },
};

// Stub Modal (captura confirmações)
let _pendingConfirm = null;
const Modal = {
  confirm(opts) { _pendingConfirm = opts; },
  _resolve()    { _pendingConfirm?.onConfirm?.(); _pendingConfirm = null; },
  _reset()      { _pendingConfirm = null; },
};

/* ═══════════════════════════════════════════════════════════
   CARREGAR shared.js INLINE (funções puras, sem DOM)
   ═══════════════════════════════════════════════════════════ */

// Arr
const Arr = {
  safeArray(v, fb=[]) { return Array.isArray(v) ? v : fb; },
  findById(arr, id)   { return Arr.safeArray(arr).find(x => x.id === id) ?? null; },
  groupBy(arr, keyFn) {
    return Arr.safeArray(arr).reduce((acc, item) => {
      const k = keyFn(item); (acc[k]=acc[k]||[]).push(item); return acc;
    }, {});
  },
  sumBy(arr, keyFn) {
    return Arr.safeArray(arr).reduce((sum, item) => sum + (Number(keyFn(item))||0), 0);
  },
};

// Validators
const Validators = {
  required(v, fn) {
    const val = typeof v==='string' ? v.trim() : v;
    if (!val && val!==0) { Toast.error(`${fn} é obrigatório.`); return false; }
    return true;
  },
  minLength(v, min, fn) {
    if (!v || String(v).length < min) { Toast.error(`${fn} deve ter no mínimo ${min} caracteres.`); return false; }
    return true;
  },
  isDate(v, fn='Data') {
    if (!v || !/^\d{4}-\d{2}-\d{2}/.test(v)) { Toast.error(`${fn} inválida.`); return false; }
    return true;
  },
  all(...checks) { return checks.every(Boolean); },
};

// Calc
const Calc = {
  unitCostPratik(lotWeight, pricePerKg, qty) {
    const q = Math.max(1, Number(qty)||1);
    const w = Math.max(0, Number(lotWeight)||0);
    const p = Math.max(0, Number(pricePerKg)||0);
    return (w * p * 2) / q;
  },
  estimatedWeightGrams(w, c, m) {
    return Math.max(0,Number(w)||0) * Math.max(0,Number(c)||0) * (Math.max(0,Number(m)||0)/10) * 0.92 * 2;
  },
  marketplaceProfit(sellPrice, unitCost, qty, commissionPct, freightAmt=0) {
    const sp  = Math.max(0, Number(sellPrice)||0);
    const uc  = Math.max(0, Number(unitCost)||0);
    const q   = Math.max(1, Number(qty)||1);
    const com = Math.max(0, Number(commissionPct)||0);
    const fr  = Math.max(0, Number(freightAmt)||0);
    const revenue     = sp * q;
    const cost        = uc * q;
    const commission  = revenue * (com/100);
    const operational = revenue * 0.05;
    const net = revenue - cost - commission - operational - fr;
    return { net, pct: revenue > 0 ? (net/revenue)*100 : 0,
             breakdown:{ revenue, cost, commission, operational, freight:fr } };
  },
  workedMinutes(p1, p2, p3, p4) {
    const toMin = t => { if(!t) return 0; const [h,m]=String(t).split(':').map(Number); return (h||0)*60+(m||0); };
    if (!p1||!p4) return 0;
    const morning    = p2 ? Math.max(0, toMin(p2)-toMin(p1)) : 0;
    const afternoon  = p3 ? Math.max(0, toMin(p4)-toMin(p3)) : 0;
    return morning + afternoon;
  },
  overtimeMinutes(workedMin) { return Math.max(0, (Number(workedMin)||0)-480); },
  cubicWeight(h, w, l)       { return ((Number(h)||0)*(Number(w)||0)*(Number(l)||0))/6000; },
};

// Store
const Store = {
  createModule(key, defaults=[]) {
    return {
      load()            { return Arr.safeArray(Storage.getSync(key, defaults)); },
      save(items)       { Storage.setSync(key, Arr.safeArray(items)); },
      getAll()          { return this.load(); },
      findById(arr, id) { return Arr.findById(arr, id); },
      add(items, item)  {
        const next=[...items,{id:Utils.uid(),createdAt:new Date().toISOString(),...item}];
        this.save(next); return next;
      },
      update(items, id, patch) {
        const next=items.map(x=>x.id===id?{...x,...patch,updatedAt:new Date().toISOString()}:x);
        this.save(next); return next;
      },
      remove(items, id) {
        const next=items.filter(x=>x.id!==id);
        this.save(next); return next;
      },
    };
  },
};

// Auth (lógica pura de senha/sessão)
const Auth = {
  MASTER_NAME: 'Administrador',
  DEFAULT_MASTER_PASS: 'master123',
  getPasswords()      { return Storage._getLocal(Storage.KEYS.PASSWORDS, {}); },
  savePasswords(pw)   { Storage._setLocal(Storage.KEYS.PASSWORDS, pw); },
  getPassword(name)   {
    const pw = this.getPasswords();
    return name===this.MASTER_NAME ? (pw[name]||this.DEFAULT_MASTER_PASS) : (pw[name]||null);
  },
  setPassword(name, pass) { const pw=this.getPasswords(); pw[name]=pass; this.savePasswords(pw); },
  hasPassword(name)  { return name===this.MASTER_NAME ? true : !!this.getPasswords()[name]; },
  getSession()        { return Storage._getLocal(Storage.KEYS.SESSION); },
  isMaster()          { const s=this.getSession(); return !!(s&&s.profile==='master'); },
};

/* ═══════════════════════════════════════════════════════════
   TESTES
   ═══════════════════════════════════════════════════════════ */

// ── Calc.unitCostPratik ──────────────────────────────────
describe('Calc.unitCostPratik', () => {
  it('happy path: calcula custo pratik corretamente', () => {
    // (1kg × R$10 × 2) / 100 unid = R$ 0.20/unid
    expect(Calc.unitCostPratik(1, 10, 100)).toBeCloseTo(0.20, 4);
  });

  it('happy path: envelope 0.23kg × 9.85 × 2 / 100', () => {
    expect(Calc.unitCostPratik(0.23, 9.85, 100)).toBeCloseTo(0.04531, 4);
  });

  it('edge case: qty=0 não divide por zero (usa qty=1)', () => {
    const result = Calc.unitCostPratik(1, 10, 0);
    expect(Number.isFinite(result)).toBeTruthy();
    expect(result).toBe(20); // (1×10×2)/1
  });

  it('edge case: lotWeight negativo tratado como 0', () => {
    expect(Calc.unitCostPratik(-5, 10, 100)).toBe(0);
  });

  it('sad path: NaN em pricePerKg retorna 0', () => {
    expect(Calc.unitCostPratik(1, NaN, 100)).toBe(0);
  });

  it('sad path: undefined em todos os parâmetros retorna 0', () => {
    expect(Calc.unitCostPratik(undefined, undefined, undefined)).toBe(0);
  });
});

// ── Calc.estimatedWeightGrams ────────────────────────────
describe('Calc.estimatedWeightGrams', () => {
  it('happy path: 20×30cm micron 0.035 = 3.86g', () => {
    // 20 × 30 × (0.035/10) × 0.92 × 2 = 3.864
    expect(Calc.estimatedWeightGrams(20, 30, 0.035)).toBeCloseTo(3.86, 1);
  });

  it('happy path: valores inteiros pequenos', () => {
    const result = Calc.estimatedWeightGrams(15, 20, 0.03);
    expect(result).toBeGreaterThan(0);
  });

  it('edge case: largura=0 retorna 0', () => {
    expect(Calc.estimatedWeightGrams(0, 30, 0.035)).toBe(0);
  });

  it('edge case: micron negativo tratado como 0', () => {
    expect(Calc.estimatedWeightGrams(20, 30, -0.035)).toBe(0);
  });

  it('sad path: todos NaN retornam 0', () => {
    expect(Calc.estimatedWeightGrams(NaN, NaN, NaN)).toBe(0);
  });
});

// ── Calc.marketplaceProfit ───────────────────────────────
describe('Calc.marketplaceProfit', () => {
  const cost = 0.05; // custo unitário R$0,05
  const price = 0.30; // venda R$0,30
  const qty = 100;
  const commission = 23; // Shopee 23%

  it('happy path: lucro positivo com margem razoável', () => {
    const { net, pct } = Calc.marketplaceProfit(price, cost, qty, commission);
    expect(net).toBeGreaterThan(0);
    expect(pct).toBeGreaterThan(0);
  });

  it('happy path: breakdown soma corretamente à receita', () => {
    const { net, breakdown } = Calc.marketplaceProfit(price, cost, qty, commission);
    const { revenue, cost:c, commission:com, operational, freight } = breakdown;
    expect(net).toBeCloseTo(revenue - c - com - operational - freight, 10);
  });

  it('happy path: frete reduz lucro', () => {
    const sem = Calc.marketplaceProfit(price, cost, qty, commission, 0);
    const com = Calc.marketplaceProfit(price, cost, qty, commission, 5);
    expect(com.net).toBeLessThanOrEqual(sem.net);
  });

  it('edge case: preço=custo resulta em prejuízo (taxas)', () => {
    const { net } = Calc.marketplaceProfit(cost, cost, 1, 23);
    expect(net).toBeLessThanOrEqual(0);
  });

  it('edge case: sellPrice=0 → net negativo (só custos)', () => {
    const { net } = Calc.marketplaceProfit(0, 0.05, 1, 23);
    expect(net).toBeLessThanOrEqual(0);
  });

  it('edge case: qty=0 usa qty=1', () => {
    const { net } = Calc.marketplaceProfit(price, cost, 0, commission);
    expect(Number.isFinite(net)).toBeTruthy();
  });

  it('sad path: todos NaN retornam net=0', () => {
    const { net } = Calc.marketplaceProfit(NaN, NaN, NaN, NaN);
    expect(net).toBe(0);
  });
});

// ── Calc.workedMinutes ───────────────────────────────────
describe('Calc.workedMinutes', () => {
  it('happy path: jornada completa 08:00-12:00 / 13:00-17:00 = 480min', () => {
    expect(Calc.workedMinutes('08:00', '12:00', '13:00', '17:00')).toBe(480);
  });

  it('happy path: hora extra 08:00-12:00 / 13:00-18:30 = 570min', () => {
    // manhã 240min + tarde 330min = 570min
    expect(Calc.workedMinutes('08:00', '12:00', '13:00', '18:30')).toBe(570);
  });

  it('edge case: sem punch4 retorna 0', () => {
    expect(Calc.workedMinutes('08:00', '12:00', '13:00', null)).toBe(0);
  });

  it('edge case: sem punch1 retorna 0', () => {
    expect(Calc.workedMinutes(null, '12:00', '13:00', '17:00')).toBe(0);
  });

  it('edge case: punch2 > punch4 (erro de digitação) retorna valor do período válido', () => {
    // Apenas afternoon: 13:00→17:00 = 240min, morning com punch2>punch1=0
    const result = Calc.workedMinutes('08:00', '06:00', '13:00', '17:00');
    expect(result).toBe(240); // morning=0 (clamped), afternoon=240
  });
});

// ── Calc.overtimeMinutes ─────────────────────────────────
describe('Calc.overtimeMinutes', () => {
  it('happy path: 510min trabalhados → 30min extra', () => {
    expect(Calc.overtimeMinutes(510)).toBe(30);
  });

  it('happy path: exatamente 480min → 0 extra', () => {
    expect(Calc.overtimeMinutes(480)).toBe(0);
  });

  it('edge case: menos de 480 → 0 (não negativo)', () => {
    expect(Calc.overtimeMinutes(400)).toBe(0);
  });

  it('sad path: NaN → 0', () => {
    expect(Calc.overtimeMinutes(NaN)).toBe(0);
  });
});

// ── Calc.cubicWeight ─────────────────────────────────────
describe('Calc.cubicWeight', () => {
  it('happy path: 20×30×10cm = 1kg cúbico', () => {
    expect(Calc.cubicWeight(20, 30, 10)).toBe(1);
  });

  it('happy path: pacote típico 30×20×5 = 0.5kg', () => {
    expect(Calc.cubicWeight(30, 20, 5)).toBe(0.5);
  });

  it('edge case: dimensão zero = 0', () => {
    expect(Calc.cubicWeight(0, 30, 10)).toBe(0);
  });

  it('sad path: strings não-numéricas = 0', () => {
    expect(Calc.cubicWeight('abc', 30, 10)).toBe(0);
  });
});

// ── Arr.safeArray ────────────────────────────────────────
describe('Arr.safeArray', () => {
  it('happy path: array retorna o mesmo array', () => {
    const a = [1,2,3];
    expect(Arr.safeArray(a)).toEqual(a);
  });

  it('edge case: null retorna []', () => {
    expect(Arr.safeArray(null)).toEqual([]);
  });

  it('edge case: undefined retorna []', () => {
    expect(Arr.safeArray(undefined)).toEqual([]);
  });

  it('edge case: objeto retorna []', () => {
    expect(Arr.safeArray({ length: 2 })).toEqual([]);
  });

  it('edge case: string retorna [] (string não é array)', () => {
    expect(Arr.safeArray('hello')).toEqual([]);
  });

  it('happy path: fallback customizado', () => {
    expect(Arr.safeArray(null, ['default'])).toEqual(['default']);
  });
});

// ── Arr.findById ─────────────────────────────────────────
describe('Arr.findById', () => {
  const items = [{ id: 'a', name: 'Alpha' }, { id: 'b', name: 'Beta' }];

  it('happy path: encontra item pelo id', () => {
    expect(Arr.findById(items, 'a')?.name).toBe('Alpha');
  });

  it('happy path: encontra segundo item', () => {
    expect(Arr.findById(items, 'b')?.name).toBe('Beta');
  });

  it('edge case: id inexistente retorna null', () => {
    expect(Arr.findById(items, 'z')).toBeNull();
  });

  it('edge case: array vazio retorna null', () => {
    expect(Arr.findById([], 'a')).toBeNull();
  });

  it('sad path: array null retorna null (não lança)', () => {
    expect(Arr.findById(null, 'a')).toBeNull();
  });
});

// ── Arr.groupBy ──────────────────────────────────────────
describe('Arr.groupBy', () => {
  const records = [
    { machine: 'M01', value: 1 },
    { machine: 'M02', value: 2 },
    { machine: 'M01', value: 3 },
  ];

  it('happy path: agrupa por chave corretamente', () => {
    const groups = Arr.groupBy(records, r => r.machine);
    expect(groups['M01'].length).toBe(2);
    expect(groups['M02'].length).toBe(1);
  });

  it('happy path: agrupa por função derivada', () => {
    const groups = Arr.groupBy(records, r => r.value > 1 ? 'big' : 'small');
    expect(groups['small'].length).toBe(1);
    expect(groups['big'].length).toBe(2);
  });

  it('edge case: array vazio retorna objeto vazio', () => {
    expect(Arr.groupBy([], r => r.x)).toEqual({});
  });

  it('sad path: null retorna {}', () => {
    expect(Arr.groupBy(null, r => r)).toEqual({});
  });
});

// ── Arr.sumBy ────────────────────────────────────────────
describe('Arr.sumBy', () => {
  it('happy path: soma campo numérico', () => {
    expect(Arr.sumBy([{v:1},{v:2},{v:3}], x => x.v)).toBe(6);
  });

  it('edge case: array vazio retorna 0', () => {
    expect(Arr.sumBy([], x => x.v)).toBe(0);
  });

  it('edge case: campo undefined soma 0 sem crash', () => {
    expect(Arr.sumBy([{v:1},{},{v:2}], x => x.v)).toBe(3);
  });

  it('sad path: null não lança erro', () => {
    expect(Arr.sumBy(null, x => x.v)).toBe(0);
  });
});

// ── Validators ───────────────────────────────────────────
describe('Validators.required', () => {
  beforeEachReset(() => Toast._reset());

  it('happy path: valor preenchido retorna true', () => {
    expect(Validators.required('valor', 'Campo')).toBeTruthy();
  });

  it('edge case: string vazia retorna false e mostra toast', () => {
    Toast._reset();
    expect(Validators.required('', 'Campo')).toBeFalsy();
    expect(Toast._last()?.type).toBe('error');
  });

  it('edge case: null retorna false', () => {
    expect(Validators.required(null, 'Campo')).toBeFalsy();
  });

  it('edge case: 0 (número zero) é válido', () => {
    expect(Validators.required(0, 'Campo')).toBeTruthy();
  });

  it('edge case: espaços em branco retorna false', () => {
    expect(Validators.required('   ', 'Campo')).toBeFalsy();
  });
});

describe('Validators.minLength', () => {
  it('happy path: comprimento suficiente retorna true', () => {
    Toast._reset();
    expect(Validators.minLength('abcd', 4, 'Senha')).toBeTruthy();
  });

  it('sad path: comprimento insuficiente retorna false', () => {
    Toast._reset();
    expect(Validators.minLength('abc', 4, 'Senha')).toBeFalsy();
    expect(Toast._last()?.type).toBe('error');
  });

  it('edge case: null retorna false', () => {
    expect(Validators.minLength(null, 4, 'Senha')).toBeFalsy();
  });
});

describe('Validators.isDate', () => {
  it('happy path: data ISO válida', () => {
    expect(Validators.isDate('2025-05-15', 'Data')).toBeTruthy();
  });

  it('sad path: formato errado (DD/MM/YYYY)', () => {
    Toast._reset();
    expect(Validators.isDate('15/05/2025', 'Data')).toBeFalsy();
  });

  it('edge case: string vazia retorna false', () => {
    expect(Validators.isDate('', 'Data')).toBeFalsy();
  });

  it('edge case: null retorna false sem crash', () => {
    expect(Validators.isDate(null, 'Data')).toBeFalsy();
  });
});

describe('Validators.all', () => {
  it('happy path: todos true retorna true', () => {
    expect(Validators.all(true, true, true)).toBeTruthy();
  });

  it('sad path: um false retorna false', () => {
    expect(Validators.all(true, false, true)).toBeFalsy();
  });

  it('edge case: sem argumentos retorna true (vacuamente verdadeiro)', () => {
    expect(Validators.all()).toBeTruthy();
  });
});

// ── Store.createModule ───────────────────────────────────
describe('Store.createModule', () => {
  const KEY = '__test_store__';

  it('happy path: load retorna array vazio quando chave não existe', () => {
    Storage._reset();
    const mod = Store.createModule(KEY, []);
    expect(mod.load()).toEqual([]);
  });

  it('happy path: add cria item com id e createdAt', () => {
    Storage._reset();
    const mod = Store.createModule(KEY, []);
    const items = mod.add([], { name: 'Test' });
    expect(items).toHaveLength(1);
    expect(items[0].id).toBeTruthy();
    expect(items[0].name).toBe('Test');
    expect(items[0].createdAt).toBeTruthy();
  });

  it('happy path: save + load persiste dados', () => {
    Storage._reset();
    const mod = Store.createModule(KEY, []);
    const items = mod.add([], { name: 'Alpha' });
    const loaded = mod.load();
    expect(loaded[0].name).toBe('Alpha');
  });

  it('happy path: update modifica item por id', () => {
    Storage._reset();
    const mod = Store.createModule(KEY, []);
    let items = mod.add([], { name: 'Old' });
    const id = items[0].id;
    items = mod.update(items, id, { name: 'New' });
    expect(items[0].name).toBe('New');
    expect(items[0].updatedAt).toBeTruthy();
  });

  it('happy path: remove elimina item pelo id', () => {
    Storage._reset();
    const mod = Store.createModule(KEY, []);
    let items = mod.add([], { name: 'A' });
    items = mod.add(items, { name: 'B' });
    const idA = items[0].id;
    items = mod.remove(items, idA);
    expect(items).toHaveLength(1);
    expect(items[0].name).toBe('B');
  });

  it('edge case: remove id inexistente não altera array', () => {
    Storage._reset();
    const mod = Store.createModule(KEY, []);
    const items = mod.add([], { name: 'A' });
    const after = mod.remove(items, 'nao-existe');
    expect(after).toHaveLength(1);
  });

  it('edge case: update id inexistente não altera array', () => {
    Storage._reset();
    const mod = Store.createModule(KEY, []);
    const items = mod.add([], { name: 'A' });
    const after = mod.update(items, 'nao-existe', { name: 'X' });
    expect(after[0].name).toBe('A');
  });

  it('sad path: load com dado corrompido retorna []', () => {
    Storage._reset();
    const mod = Store.createModule(KEY, []);
    Storage._setLocal(KEY, null);
    expect(mod.load()).toEqual([]);
  });
});

// ── Auth (unit) ──────────────────────────────────────────
describe('Auth passwords', () => {
  beforeEachReset(() => Storage._reset());

  it('happy path: master sem senha usa DEFAULT_MASTER_PASS', () => {
    expect(Auth.getPassword('Administrador')).toBe('master123');
  });

  it('happy path: setPassword e getPassword roundtrip', () => {
    Auth.setPassword('João', 'senha123');
    expect(Auth.getPassword('João')).toBe('senha123');
  });

  it('happy path: hasPassword master sempre true', () => {
    expect(Auth.hasPassword('Administrador')).toBeTruthy();
  });

  it('happy path: hasPassword colab sem senha = false', () => {
    expect(Auth.hasPassword('Maria')).toBeFalsy();
  });

  it('happy path: hasPassword colab com senha = true', () => {
    Auth.setPassword('Pedro', 'abc123');
    expect(Auth.hasPassword('Pedro')).toBeTruthy();
  });

  it('edge case: getPassword colab sem senha retorna null', () => {
    expect(Auth.getPassword('NaoExiste')).toBeNull();
  });
});

describe('Auth session', () => {
  beforeEachReset(() => Storage._reset());

  it('happy path: getSession retorna null quando não logado', () => {
    expect(Auth.getSession()).toBeNull();
  });

  it('happy path: isMaster retorna false quando não logado', () => {
    expect(Auth.isMaster()).toBeFalsy();
  });

  it('happy path: isMaster retorna true após login master', () => {
    Storage._setLocal(Storage.KEYS.SESSION, { profile: 'master', name: 'Administrador' });
    expect(Auth.isMaster()).toBeTruthy();
  });

  it('happy path: isMaster retorna false para colab', () => {
    Storage._setLocal(Storage.KEYS.SESSION, { profile: 'colab', name: 'João' });
    expect(Auth.isMaster()).toBeFalsy();
  });

  it('edge case: session com JSON corrompido lança SyntaxError', () => {
    // Simula JSON inválido no storage via monkey-patch
    const orig = Storage._getLocal.bind(Storage);
    Storage._getLocal = (k, fb=null) => {
      if (k === Storage.KEYS.SESSION) throw new SyntaxError('Unexpected token');
      return orig(k, fb);
    };
    expect(() => Auth.getSession()).toThrow();
    Storage._getLocal = orig; // restaura
  });
});

// ── Utils formatação ─────────────────────────────────────
describe('Utils.fmtDate', () => {
  it('happy path: YYYY-MM-DD → DD/MM/YYYY', () => {
    expect(Utils.fmtDate('2025-05-15')).toBe('15/05/2025');
  });

  it('edge case: null retorna —', () => {
    expect(Utils.fmtDate(null)).toBe('—');
  });

  it('edge case: string vazia retorna —', () => {
    expect(Utils.fmtDate('')).toBe('—');
  });
});

describe('Utils.num', () => {
  it('happy path: arredonda corretamente', () => {
    expect(Utils.num(3.14159, 2)).toBe('3.14');
  });

  it('edge case: null retorna 0.00', () => {
    expect(Utils.num(null, 2)).toBe('0.00');
  });

  it('edge case: undefined retorna 0.00', () => {
    expect(Utils.num(undefined, 2)).toBe('0.00');
  });
});

/* ═══════════════════════════════════════════════════════════
   HELPER beforeEachReset (simula beforeEach sem framework)
   ═══════════════════════════════════════════════════════════ */
function beforeEachReset(fn) {
  // Executa o reset antes de cada `it` definido APÓS esta chamada no mesmo describe.
  // Implementação simplificada: executa imediatamente (reset do estado global).
  fn();
}

/* ═══════════════════════════════════════════════════════════
   RESULTADO FINAL
   ═══════════════════════════════════════════════════════════ */
console.log('\n' + '═'.repeat(60));
console.log(`  RESULTADO: ${_results.passed} passou  /  ${_results.failed} falhou`);
if (_results.errors.length) {
  console.log('\n  Falhas:');
  _results.errors.forEach(e => console.log(`    • ${e.name}: ${e.error}`));
}
console.log('═'.repeat(60) + '\n');

if (typeof module !== 'undefined') module.exports = { Calc, Arr, Validators, Store, Auth };
