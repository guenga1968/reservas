const { chromium } = require('playwright');

async function runTests() {
  console.log('Starting tests...\n');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const results = [];
  const errors = [];
  
  page.on('console', msg => {
    if (msg.type() === 'error' && !msg.text().includes('favicon')) {
      errors.push(msg.text());
    }
  });

  const log = (test, passed, error = null) => {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    const msg = passed ? test : `${test} - ${error}`;
    console.log(`${status}: ${msg}`);
    results.push({ test, passed, error });
  };

  try {
    // Test 1: Login page loads
    console.log('\n--- Testing Login Page ---');
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    const loginContent = await page.content();
    log('Login page loads', loginContent.includes('Iniciar') || loginContent.includes('Gestor'));

    const emailInput = await page.locator('input[type="email"], input[name="email"]').count();
    const passwordInput = await page.locator('input[type="password"]').count();
    log('Login form elements exist', emailInput > 0 && passwordInput > 0);

    // Test 2: Dashboard (/) loads
    console.log('\n--- Testing Dashboard ---');
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    const dashboardContent = await page.content();
    const isAuthenticated = !dashboardContent.includes('Cargando...') || dashboardContent.includes('Gestor');
    log('Dashboard page loads', isAuthenticated);

    // Test 3: Calendar page
    console.log('\n--- Testing Calendar ---');
    await page.goto('http://localhost:3000/calendar', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    const calendarContent = await page.content();
    log('Calendar page loads', calendarContent.includes('Calendario') || calendarContent.includes('📅'));

    // Test 4: Reservations page
    console.log('\n--- Testing Reservations ---');
    await page.goto('http://localhost:3000/reservations', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    const reservationsContent = await page.content();
    log('Reservations page loads', reservationsContent.includes('Reserva') || reservationsContent.includes('reserva'));

    // Test 5: Guests page
    console.log('\n--- Testing Guests ---');
    await page.goto('http://localhost:3000/guests', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    const guestsContent = await page.content();
    log('Guests page loads', guestsContent.includes('Huésped') || guestsContent.includes('hué') || guestsContent.includes('Cargando'));

    // Test 6: Reports page
    console.log('\n--- Testing Reports ---');
    await page.goto('http://localhost:3000/reports', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    const reportsContent = await page.content();
    log('Reports page loads', reportsContent.includes('Report') || reportsContent.includes('report') || reportsContent.includes('Ingreso'));

    // Test 7: New Reservation page
    console.log('\n--- Testing New Reservation ---');
    await page.goto('http://localhost:3000/reservations/new', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    const newResContent = await page.content();
    log('New Reservation page loads', newResContent.includes('Reserva') || newResContent.includes('reserva') || newResContent.includes('Cargando'));

    // Test 8: Check no 404 errors on routes
    console.log('\n--- Testing Routes ---');
    const routes = ['/', '/login', '/calendar', '/reservations', '/guests', '/reports', '/reservations/new'];
    for (const route of routes) {
      const response = await page.goto(`http://localhost:3000${route}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(500);
      const status = response.status();
      log(`Route ${route} returns ${status}`, status !== 404, `Got ${status}`);
    }

    // Test 9: Check for critical console errors
    console.log('\n--- Console Errors ---');
    const criticalErrors = errors.filter(e => 
      !e.includes('favicon') && 
      !e.includes('404') &&
      !e.includes('supabase') &&
      !e.includes('net::')
    );
    log('No critical console errors', criticalErrors.length === 0, criticalErrors.slice(0, 3).join(', '));

  } catch (error) {
    console.error('\n❌ Test error:', error.message);
    log('Test execution', false, error.message);
  } finally {
    await browser.close();
  }

  // Summary
  console.log('\n========== SUMMARY ==========');
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  console.log(`Passed: ${passed}/${total}`);
  if (errors.length > 0) {
    console.log(`Console errors found: ${errors.length}`);
  }
  console.log('==============================\n');

  process.exit(passed === total ? 0 : 1);
}

runTests();
