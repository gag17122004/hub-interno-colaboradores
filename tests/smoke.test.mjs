/**
 * Smoke Tests — Hub Interno Pratik
 * Executa contra a URL de produção após cada deploy.
 * Uso: node tests/smoke.test.mjs [URL]
 * Ex:  node tests/smoke.test.mjs https://hub-interno-colaboradores.web.app
 */
import { chromium } from 'playwright';

const BASE        = process.argv[2] || 'https://hub-interno-colaboradores.web.app';
const MASTER_PASS = 'master123';

let passed = 0, failed = 0;

async function step(name, fn) {
  try {
    await fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (e) {
    console.log(`  ❌ ${name}: ${e.message.split('\n')[0]}`);
    failed++;
  }
}

(async () => {
  console.log(`\n🔥 Smoke Tests — ${BASE}\n`);
  const browser = await chromium.launch({ headless: true });
  const ctx     = await browser.newContext();
  const page    = await ctx.newPage();
  const jsErrors = [];
  page.on('pageerror', e => jsErrors.push(e.message));

  await step('app carrega sem erro de rede (status 200)', async () => {
    const res = await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 20000 });
    if (!res || res.status() >= 400) throw new Error(`HTTP ${res?.status()}`);
  });

  await step('tela de login aparece', async () => {
    await page.waitForSelector('#login-screen:not(.hidden)', { timeout: 8000 });
  });

  await step('select de nomes carregado', async () => {
    await page.waitForSelector('#login-name-select', { timeout: 8000 });
    const opts = await page.$$eval('#login-name-select option', os => os.length);
    if (opts < 2) throw new Error(`Apenas ${opts} opção(ões) no select`);
  });

  await step('login master com senha padrão funciona', async () => {
    await page.selectOption('#login-name-select', 'Administrador');
    await page.fill('#login-pass', MASTER_PASS);
    await page.click('#btn-login-finish');
    await page.waitForSelector('#login-screen.hidden', { state: 'attached', timeout: 10000 });
  });

  await step('sidebar com módulos visível', async () => {
    const n = await page.$$eval('.nav-item', els => els.length);
    if (n < 10) throw new Error(`Apenas ${n} nav-items`);
  });

  await step('Service Worker registrado', async () => {
    const swRegistered = await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.getRegistration();
      return !!reg;
    });
    if (!swRegistered) throw new Error('SW não registrado');
  });

  await step('Firebase auth anônima ativa (sem permission-denied)', async () => {
    // Aguarda 2s para sincronia inicial e verifica se houve toast de erro
    await page.waitForTimeout(2000);
    const toast = await page.$('.toast.error');
    if (toast) {
      const txt = await toast.textContent();
      if (txt.includes('permissão') || txt.includes('permission')) {
        throw new Error(`Toast de permissão: ${txt}`);
      }
    }
  });

  await step('nenhum erro JS crítico durante a carga', async () => {
    const critical = jsErrors.filter(e =>
      e.includes('ReferenceError') || e.includes('is not a function') || e.includes('Cannot read')
    );
    if (critical.length) throw new Error(critical[0]);
  });

  await browser.close();

  const total = passed + failed;
  console.log('\n════════════════════════════════════════════');
  console.log(`  ${failed === 0 ? '✅ PASS' : '❌ FAIL'} — ${passed}/${total} testes passaram`);
  console.log('════════════════════════════════════════════\n');
  process.exit(failed > 0 ? 1 : 0);
})();
