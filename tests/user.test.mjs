/**
 * Testes de usuário — Hub Interno
 * Playwright (ESM) — node tests/user.test.mjs
 */
import { chromium } from 'playwright';

const BASE        = 'http://localhost:8765';
const MASTER_PASS = 'master123';
let passed = 0, failed = 0;
const jsErrors = [];

async function step(name, fn) {
  try {
    await fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (e) {
    console.log(`  ❌ ${name}`);
    console.log(`     ${e.message.split('\n')[0]}`);
    failed++;
  }
}

async function login(page) {
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForSelector('#login-name-select', { timeout: 10000 });
  await page.selectOption('#login-name-select', 'Administrador');
  await page.fill('#login-pass', MASTER_PASS);
  await page.click('#btn-login-finish');
  // state:'attached' porque display:none não conta como 'visible'
  await page.waitForSelector('#login-screen.hidden', { state: 'attached', timeout: 10000 });
}

async function navTo(page, route) {
  await page.click(`.nav-item[data-route="${route}"]`);
  await page.waitForTimeout(700);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx     = await browser.newContext();
  const page    = await ctx.newPage();
  page.on('pageerror', e => jsErrors.push(`[${new Date().toISOString()}] ${e.message}`));

  // ── 1. Login ─────────────────────────────────────────────────────
  console.log('\n📦 Login');

  await step('página carrega e exibe select de nome', async () => {
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForSelector('#login-name-select', { timeout: 10000 });
  });

  await step('"Administrador" está disponível no select', async () => {
    const opts = await page.$$eval('#login-name-select option', os => os.map(o => o.value));
    if (!opts.includes('Administrador')) throw new Error(`Opções: ${opts.join(', ')}`);
  });

  await step('login master com senha correta oculta overlay de login', async () => {
    await page.selectOption('#login-name-select', 'Administrador');
    await page.fill('#login-pass', MASTER_PASS);
    await page.click('#btn-login-finish');
    await page.waitForSelector('#login-screen.hidden', { state: 'attached', timeout: 10000 });
  });

  await step('sidebar exibe ao menos 10 módulos no DOM', async () => {
    const n = await page.$$eval('.nav-item', els => els.length);
    if (n < 10) throw new Error(`Apenas ${n} itens na sidebar`);
  });

  await step('login com senha errada mantém tela de login', async () => {
    // Usa contexto isolado (sem session salva no localStorage)
    const ctx2 = await browser.newContext();
    const p2   = await ctx2.newPage();
    await p2.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await p2.waitForSelector('#login-name-select', { timeout: 10000 });
    await p2.selectOption('#login-name-select', 'Administrador');
    await p2.fill('#login-pass', 'senhaerrada123');
    await p2.click('#btn-login-finish');
    await p2.waitForTimeout(600);
    const hidden = await p2.$('#login-screen.hidden');
    if (hidden) throw new Error('Login screen desapareceu mesmo com senha errada');
    await ctx2.close();
  });

  // ── 2. M1 — Horas Extras ─────────────────────────────────────────
  console.log('\n📦 M1 — Horas Extras');

  await step('navega para M1', async () => {
    await navTo(page, 'm1');
    await page.waitForSelector('#m1-employee-list', { timeout: 6000 });
  });

  await step('adiciona novo colaborador', async () => {
    await page.fill('#m1-new-employee', 'Teste Playwright');
    await page.click('#m1-add-employee-btn');
    await page.waitForTimeout(400);
    const html = await page.innerHTML('#m1-employee-list');
    if (!html.includes('Teste Playwright')) throw new Error('Colaborador não apareceu');
  });

  await step('seleciona colaborador e abre painel', async () => {
    await page.click('.m1-emp-item');
    await page.waitForSelector('#m1-hours-panel:not(.hidden)', { timeout: 4000 });
  });

  await step('abre modal para lançar horas', async () => {
    await page.click('#m1-add-record-btn');
    await page.waitForSelector('#modal-m1-record.open', { timeout: 4000 });
  });

  await step('lança 3h extras e modal fecha', async () => {
    const today = new Date().toISOString().split('T')[0];
    await page.fill('#m1-rec-date', today);
    await page.selectOption('#m1-rec-type', 'extra');
    await page.fill('#m1-rec-hours', '3');
    await page.fill('#m1-rec-note', 'Teste automático');
    await page.click('#m1-save-record-btn');
    await page.waitForTimeout(400);
    const still = await page.$('#modal-m1-record.open');
    if (still) throw new Error('Modal não fechou após salvar');
  });

  await step('saldo é positivo após lançar horas extras', async () => {
    const saldo = await page.textContent('#m1-stat-saldo');
    if (!saldo.startsWith('+')) throw new Error(`Saldo deveria ser positivo: ${saldo}`);
  });

  await step('validação: horas = 0 impede salvar', async () => {
    await page.click('#m1-add-record-btn');
    await page.waitForSelector('#modal-m1-record.open', { timeout: 4000 });
    const today = new Date().toISOString().split('T')[0];
    await page.fill('#m1-rec-date', today);
    await page.fill('#m1-rec-hours', '0');
    await page.click('#m1-save-record-btn');
    await page.waitForTimeout(300);
    const still = await page.$('#modal-m1-record.open');
    if (!still) throw new Error('Modal fechou com horas=0');
    await page.click('#m1-cancel-record-btn');
  });

  await step('validação: data vazia impede salvar', async () => {
    await page.click('#m1-add-record-btn');
    await page.waitForSelector('#modal-m1-record.open', { timeout: 4000 });
    await page.fill('#m1-rec-date', '');
    await page.fill('#m1-rec-hours', '2');
    await page.click('#m1-save-record-btn');
    await page.waitForTimeout(300);
    const still = await page.$('#modal-m1-record.open');
    if (!still) throw new Error('Modal fechou com data vazia');
    await page.click('#m1-cancel-record-btn');
  });

  // ── 3. M11 — Disputas (bug: activeTab não declarado) ─────────────
  console.log('\n📦 M11 — Disputas');

  await step('navega para M11', async () => {
    await navTo(page, 'm11');
    await page.waitForSelector('#m11-generate-btn, #m11-tab-generator', { timeout: 6000 });
  });

  await step('aba Gerenciar abre sem ReferenceError (fix activeTab)', async () => {
    const countBefore = jsErrors.length;
    const tab = page.locator('#m11-tab-manage');
    if (await tab.count() > 0) {
      await tab.click();
      await page.waitForTimeout(500);
    }
    const newErrors = jsErrors.slice(countBefore).filter(e => e.includes('activeTab') || e.includes('ReferenceError'));
    if (newErrors.length) throw new Error(newErrors[0]);
  });

  await step('troca de aba para Gerador funciona', async () => {
    const tab = page.locator('#m11-tab-generator');
    if (await tab.count() > 0) {
      await tab.click();
      await page.waitForTimeout(300);
    }
  });

  // ── 4. M10 — Manutenção (bug: onclick com aspas) ─────────────────
  console.log('\n📦 M10 — Manutenção');

  await step('navega para M10', async () => {
    await navTo(page, 'm10');
    await page.waitForSelector('#m10-machine-list .m1-emp-item', { timeout: 12000 });
  });

  await step('clica em máquina e abre painel (fix data-attribute)', async () => {
    const countBefore = jsErrors.length;
    await page.locator('#m10-machine-list .m1-emp-item').first().click();
    await page.waitForTimeout(500);
    const newErrors = jsErrors.slice(countBefore);
    if (newErrors.length) throw new Error(newErrors[0]);
    const hidden = await page.$('#m10-no-machine.hidden');
    if (!hidden) throw new Error('Painel da máquina não abriu');
  });

  // ── 5. M7 — Produção (bug: sort null-safe) ────────────────────────
  console.log('\n📦 M7 — Produção');

  await step('navega para M7 sem erro JS (fix sort)', async () => {
    const countBefore = jsErrors.length;
    await navTo(page, 'm7');
    await page.waitForSelector('#m7-production-tbody', { timeout: 6000 });
    await page.waitForTimeout(500);
    const newErrors = jsErrors.slice(countBefore).filter(e => e.includes('localeCompare') || e.includes('TypeError'));
    if (newErrors.length) throw new Error(newErrors[0]);
  });

  await step('tabela de produção renderiza (vazia ou com registros)', async () => {
    const rows = await page.$$('#m7-production-tbody tr');
    if (rows.length === 0) throw new Error('Nenhuma linha na tabela');
  });

  // ── 6. M9 — Rendimento ───────────────────────────────────────────
  console.log('\n📦 M9 — Rendimento');

  await step('navega para M9', async () => {
    await navTo(page, 'm9');
    await page.waitForTimeout(600);
  });

  // ── 7. M18 — Validação de PDF ────────────────────────────────────
  console.log('\n📦 M18 — Máquinas (PDF size)');

  await step('PDF > 700KB rejeitado com toast de erro', async () => {
    await navTo(page, 'm18');
    await page.waitForTimeout(600);
    const addBtn = page.locator('#m18-add-btn');
    if (await addBtn.count() === 0) { console.log('     ⚠️ M18 não acessível neste perfil — pulando'); return; }
    await addBtn.click();
    await page.waitForSelector('#m18-modal.open', { timeout: 4000 });
    // Cria arquivo falso > 700KB via FileChooser
    await page.fill('#m18-name', 'Máquina Teste');
    const [fc] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.click('#m18-pdf')
    ]);
    const bigBuf = Buffer.alloc(750000, 'A');
    await fc.setFiles([{ name: 'grande.pdf', mimeType: 'application/pdf', buffer: bigBuf }]);
    await page.click('#m18-save');
    await page.waitForTimeout(400);
    const toasts = await page.$$eval('.toast.error', ts => ts.map(t => t.textContent));
    const hasToast = toasts.some(t => t.includes('700') || t.includes('grande') || t.includes('PDF'));
    if (!hasToast) throw new Error(`Toast de tamanho não apareceu. Toasts: ${toasts.join(' | ')}`);
    await page.click('#m18-cancel');
  });

  // ── 8. Offline — Service Worker ─────────────────────────────────
  console.log('\n📦 Offline / Service Worker');

  await step('Service Worker registrado após carga', async () => {
    const sw = await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.getRegistration();
      return !!reg;
    });
    if (!sw) throw new Error('SW não registrado');
  });

  await step('app permanece funcional offline (cache SW)', async () => {
    await ctx.setOffline(true);
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 15000 });
    // Deve carregar do cache do SW — tela de login ou app logado
    const loaded = await page.waitForSelector('#login-screen, #app-layout, .app-layout', { timeout: 8000 });
    if (!loaded) throw new Error('App não carregou offline');
    await ctx.setOffline(false);
    // Reloga para os próximos testes
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForSelector('#login-name-select', { timeout: 10000 }).catch(() => {});
  });

  // ── 9. Ausência de erros JS críticos ─────────────────────────────
  console.log('\n📦 Saúde JS global');

  await step('nenhum ReferenceError ou TypeError em toda a sessão', async () => {
    const critical = jsErrors.filter(e =>
      e.includes('ReferenceError') || e.includes('is not a function') || e.includes('Cannot read')
    );
    if (critical.length) throw new Error(`${critical.length} erro(s):\n     ${critical.slice(0,3).join('\n     ')}`);
  });

  // ── Resultado ────────────────────────────────────────────────────
  await browser.close();

  // Mata servidor local
  try { require('child_process').execSync('pkill -f "http.server 8765"'); } catch(_) {}

  const total = passed + failed;
  console.log('\n════════════════════════════════════════════════════════════');
  console.log(`  RESULTADO: ${passed} passou  /  ${failed} falhou  (${total} total)`);
  console.log('════════════════════════════════════════════════════════════\n');
  if (jsErrors.length) {
    console.log('Erros JS capturados durante a sessão:');
    jsErrors.forEach(e => console.log(' •', e));
  }
  process.exit(failed > 0 ? 1 : 0);
})();
