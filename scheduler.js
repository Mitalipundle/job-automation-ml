// ============================================================
// SCHEDULER.JS - Runs job automation daily at 08:00 AM
// ============================================================
// Usage: node scheduler.js
// Keep this terminal window OPEN for automation to work!
// ============================================================

const schedule = require('node-schedule');
const { execSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const LOG_FILE = './output/logs/scheduler.log';

function log(msg) {
  const line = `[${new Date().toLocaleString('en-DE', { timeZone: 'Europe/Berlin' })}] ${msg}`;
  console.log(line);
  try {
    if (!fs.existsSync('./output/logs')) fs.mkdirSync('./output/logs', { recursive: true });
    fs.appendFileSync(LOG_FILE, line + '\n');
  } catch (e) {}
}

function runAutomation() {
  return new Promise((resolve) => {
    log('🚀 Starting daily job automation...');

    const child = spawn('node', ['run_all.js'], {
      cwd: __dirname,
      stdio: 'pipe'
    });

    child.stdout.on('data', (data) => {
      process.stdout.write(data);
    });

    child.stderr.on('data', (data) => {
      process.stderr.write(data);
    });

    child.on('close', (code) => {
      if (code === 0) {
        log('✅ Automation completed successfully!');
      } else {
        log(`❌ Automation failed with exit code: ${code}`);
      }
      resolve(code);
    });
  });
}

// ── DISPLAY STARTUP INFO ─────────────────────────────────────
console.log('\n' + '═'.repeat(60));
console.log('  ⏰ MITALI\'S JOB AUTOMATION SCHEDULER');
console.log('═'.repeat(60));
console.log('  📅 Runs daily at: 08:00 AM (Berlin time)');
console.log('  📂 Saves to:      ./output/');
console.log('  📊 Dashboard:     ./dashboard/index.html');
console.log('  ⚠️   Keep this window OPEN!');
console.log('═'.repeat(60));

// ── SCHEDULE: EVERY DAY AT 08:00 AM BERLIN TIME ─────────────
const job = schedule.scheduleJob({ hour: 8, minute: 0, tz: 'Europe/Berlin' }, async () => {
  await runAutomation();
  log(`⏳ Next run: tomorrow at 08:00 AM Berlin time`);
});

// ── SHOW NEXT SCHEDULED RUN ──────────────────────────────────
const next = job.nextInvocation();
console.log(`\n✅ Scheduler active!`);
console.log(`⏭  Next run: ${next.toLocaleString('en-DE', { timeZone: 'Europe/Berlin' })}`);
console.log(`\n💡 To run IMMEDIATELY (for testing), type:`);
console.log(`   node run_all.js\n`);
console.log(`📋 Logs saved to: ${LOG_FILE}`);
console.log(`\nPress Ctrl+C to stop the scheduler.\n`);

// ── RUN ONCE ON START (OPTIONAL) ────────────────────────────
const args = process.argv.slice(2);
if (args.includes('--now')) {
  console.log('🔄 --now flag detected: running immediately...\n');
  runAutomation().then(() => {
    console.log('\n✅ Initial run complete. Scheduler continues...\n');
  });
}

// ── GRACEFUL SHUTDOWN ────────────────────────────────────────
process.on('SIGINT', () => {
  log('👋 Scheduler stopped by user.');
  console.log('\n👋 Scheduler stopped. Goodbye!\n');
  process.exit(0);
});

process.on('uncaughtException', (e) => {
  log(`❌ Uncaught error: ${e.message}`);
});
