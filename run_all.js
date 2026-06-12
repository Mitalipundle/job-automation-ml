// ============================================================
// RUN_ALL.JS - ONE COMMAND TO RUN EVERYTHING
// ============================================================
// Usage: node run_all.js
// ============================================================

const fs = require('fs');
const path = require('path');
const config = require('./config');
const { scrapeAllSources } = require('./job_scraper');
const { JobScorer, filterAndRank } = require('./scorer');
const { editCVForJob } = require('./cv_editor');
const { generateCVForJob } = require('./pdf_generator');
const { generateCoverLetter } = require('./cover_letter_generator');

// ── ENSURE DIRECTORIES EXIST ─────────────────────────────────
function ensureDirs() {
  const dirs = [
    './output', './output/pdfs', './output/logs',
    './cvs', './dashboard'
  ];
  dirs.forEach(d => {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  });
}

// ── VALIDATE CONFIG ───────────────────────────────────────────
function validateConfig() {
  const errors = [];
  if (!config.APIFY_API_KEY || config.APIFY_API_KEY.includes('YOUR_')) {
    errors.push('❌ APIFY_API_KEY missing in config.js');
  }
  if (!config.ANTHROPIC_API_KEY || config.ANTHROPIC_API_KEY.includes('YOUR_')) {
    errors.push('❌ ANTHROPIC_API_KEY missing in config.js');
  }
  if (!fs.existsSync(config.PATHS.masterEnglishCV)) {
    errors.push('❌ Master English CV not found at: ' + config.PATHS.masterEnglishCV);
  }
  if (!fs.existsSync(config.PATHS.masterGermanCV)) {
    errors.push('❌ Master German CV not found at: ' + config.PATHS.masterGermanCV);
  }
  return errors;
}

// ── GENERATE DASHBOARD ────────────────────────────────────────
function generateDashboard(jobs) {
  const jobsData = JSON.stringify(jobs.map(j => ({
    id: j.id,
    title: j.title,
    company: j.company,
    location: j.location,
    source: j.source,
    language: j.language,
    postedDate: j.postedDate,
    url: j.url,
    salary: j.salary,
    score: j.score,
    cvFile: j.cvFile || null
  })));

  const strongCount = jobs.filter(j => j.score?.total >= 80).length;
  const goodCount = jobs.filter(j => j.score?.total >= 65 && j.score?.total < 80).length;
  const avgScore = jobs.length ? Math.round(jobs.reduce((s,j) => s + (j.score?.total || 0), 0) / jobs.length) : 0;
  const timestamp = new Date().toLocaleString('en-DE', { timeZone: 'Europe/Berlin' });

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Mitali's Job Dashboard — ${new Date().toLocaleDateString()}</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Inter', sans-serif; background: #0f172a; color: #e2e8f0; min-height: 100vh; padding: 20px; }
  .container { max-width: 1400px; margin: 0 auto; }

  header { text-align: center; margin-bottom: 30px; }
  header h1 { font-size: 28px; font-weight: 800; color: #fff; }
  header p { color: #94a3b8; font-size: 13px; margin-top: 6px; }

  .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 28px; }
  .stat { background: rgba(30,41,59,0.8); border: 1px solid #334155; border-radius: 8px; padding: 16px; text-align: center; }
  .stat-n { font-size: 28px; font-weight: 800; color: #22c55e; }
  .stat-l { font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin-top: 4px; }

  .controls { display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap; }
  .controls select, .controls input { background: #1e293b; color: #f1f5f9; border: 1px solid #334155; border-radius: 6px; padding: 8px 12px; font-size: 13px; }

  table { width: 100%; border-collapse: collapse; }
  thead { background: #1e293b; }
  th { padding: 12px 14px; text-align: left; font-size: 11px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #334155; }
  tr.job-row { cursor: pointer; border-bottom: 1px solid #1e293b; transition: background 0.15s; }
  tr.job-row:hover { background: rgba(30,41,59,0.6); }
  tr.job-row.selected { background: rgba(30,41,59,0.9); border-left: 3px solid #22c55e; }
  td { padding: 12px 14px; font-size: 13px; }

  .score-badge { display: inline-block; padding: 3px 10px; border-radius: 14px; font-size: 11px; font-weight: 700; }
  .score-high { background: #22c55e; color: #0f172a; }
  .score-med { background: #3b82f6; color: #fff; }
  .score-low { background: #eab308; color: #0f172a; }
  .score-weak { background: #6b7280; color: #fff; }

  .lang-badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: 600; }
  .lang-en { background: #1e3a5f; color: #8EC5FC; }
  .lang-de { background: #3b1e1e; color: #fca5a5; }

  .job-title-cell { font-weight: 600; color: #f1f5f9; }
  .job-company-cell { color: #94a3b8; font-size: 12px; }

  .panel { display: none; background: rgba(15,23,42,0.9); border: 1px solid #334155; border-radius: 8px; padding: 20px; margin-top: 20px; }
  .panel.active { display: block; }
  .panel h3 { color: #f1f5f9; font-size: 16px; font-weight: 700; margin-bottom: 4px; }
  .panel .company { color: #94a3b8; font-size: 13px; margin-bottom: 14px; }

  .score-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 14px 0; }
  .score-item { background: #1e293b; border-radius: 6px; padding: 10px; text-align: center; }
  .score-item .n { font-size: 20px; font-weight: 700; color: #22c55e; }
  .score-item .l { font-size: 10px; color: #94a3b8; margin-top: 2px; }

  .keyword-wrap { display: flex; flex-wrap: wrap; gap: 6px; margin: 10px 0; }
  .kw { background: #1e293b; color: #22c55e; padding: 3px 8px; border-radius: 4px; font-size: 11px; font-family: monospace; }

  .btn { display: inline-block; padding: 8px 14px; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; border: none; text-decoration: none; margin-right: 6px; margin-top: 12px; }
  .btn-apply { background: #22c55e; color: #0f172a; }
  .btn-cv { background: #3b82f6; color: #fff; }
  .btn-cv.no-cv { background: #334155; color: #94a3b8; cursor: not-allowed; }

  .section-label { font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin: 12px 0 6px; }

  footer { text-align: center; margin-top: 40px; color: #475569; font-size: 11px; }

  @media (max-width: 768px) {
    .stats { grid-template-columns: repeat(2, 1fr); }
    .score-grid { grid-template-columns: repeat(2, 1fr); }
  }
</style>
</head>
<body>
<div class="container">

  <header>
    <h1>🚀 Mitali's Job Dashboard</h1>
    <p>Last updated: ${timestamp} · All jobs scored against your profile</p>
  </header>

  <div class="stats">
    <div class="stat"><div class="stat-n" id="totalCount">${jobs.length}</div><div class="stat-l">Total Jobs</div></div>
    <div class="stat"><div class="stat-n" style="color:#22c55e">${strongCount}</div><div class="stat-l">Strong Matches (80+)</div></div>
    <div class="stat"><div class="stat-n" style="color:#3b82f6">${goodCount}</div><div class="stat-l">Good Matches (65-79)</div></div>
    <div class="stat"><div class="stat-n" style="color:#eab308">${avgScore}</div><div class="stat-l">Avg Score</div></div>
  </div>

  <div class="controls">
    <select id="filterScore" onchange="applyFilters()">
      <option value="0">All Scores</option>
      <option value="80">80+ Strong Match</option>
      <option value="65">65+ Good Match</option>
      <option value="50">50+ Potential</option>
    </select>
    <select id="filterLang" onchange="applyFilters()">
      <option value="">All Languages</option>
      <option value="English">English JDs</option>
      <option value="German">German JDs</option>
    </select>
    <select id="filterSource" onchange="applyFilters()">
      <option value="">All Sources</option>
      <option value="LinkedIn">LinkedIn</option>
      <option value="Indeed.de">Indeed.de</option>
      <option value="Stepstone.de">Stepstone.de</option>
      <option value="Arbeitsagentur.de">Arbeitsagentur.de</option>
      <option value="Arbeitnow.com">Arbeitnow.com</option>
      <option value="BerlinStartupJobs">Berlin Startup Jobs</option>
    </select>
    <input type="text" id="searchBox" placeholder="Search jobs..." oninput="applyFilters()">
  </div>

  <table>
    <thead>
      <tr>
        <th>Score</th>
        <th>Position</th>
        <th>Company</th>
        <th>Location</th>
        <th>Source</th>
        <th>Lang</th>
        <th>CV Ready</th>
      </tr>
    </thead>
    <tbody id="jobsTable"></tbody>
  </table>

  <div class="panel" id="detailPanel"></div>

  <footer>Mitali Pundle Job Automation System · Powered by Claude Sonnet 4.5 + Apify</footer>
</div>

<script>
const JOBS = ${jobsData};
let filtered = [...JOBS];

function getScoreClass(s) {
  if (s >= 80) return 'score-high';
  if (s >= 65) return 'score-med';
  if (s >= 50) return 'score-low';
  return 'score-weak';
}

function render(jobs) {
  document.getElementById('totalCount').textContent = jobs.length;
  const tbody = document.getElementById('jobsTable');
  tbody.innerHTML = jobs.map(j => \`
    <tr class="job-row" onclick="showDetail('\${j.id}')">
      <td><span class="score-badge \${getScoreClass(j.score?.total || 0)}">\${j.score?.total || 0}</span></td>
      <td><div class="job-title-cell">\${j.title}</div><div class="job-company-cell">\${j.company}</div></td>
      <td style="color:#cbd5e1">\${j.company}</td>
      <td style="color:#94a3b8;font-size:12px">\${j.location}</td>
      <td style="color:#94a3b8;font-size:11px">\${j.source}</td>
      <td><span class="lang-badge \${j.language === 'German' ? 'lang-de' : 'lang-en'}">\${j.language === 'German' ? 'DE' : 'EN'}</span></td>
      <td>\${j.cvFile ? '<span style="color:#22c55e;font-size:12px">✓ Ready</span>' : '<span style="color:#475569;font-size:12px">Pending</span>'}</td>
    </tr>
  \`).join('');
}

function showDetail(id) {
  document.querySelectorAll('.job-row').forEach(r => r.classList.remove('selected'));
  event.currentTarget.classList.add('selected');
  const job = JOBS.find(j => j.id === id);
  if (!job) return;
  const panel = document.getElementById('detailPanel');
  panel.className = 'panel active';
  panel.innerHTML = \`
    <h3>\${job.title}</h3>
    <div class="company">\${job.company} · \${job.location} · \${job.source}</div>
    <div class="score-grid">
      <div class="score-item"><div class="n">\${job.score?.total || 0}</div><div class="l">Total Score</div></div>
      <div class="score-item"><div class="n" style="color:#3b82f6">\${job.score?.skills || 0}%</div><div class="l">Skills Match</div></div>
      <div class="score-item"><div class="n" style="color:#eab308">\${job.score?.role || 0}%</div><div class="l">Role Fit</div></div>
      <div class="score-item"><div class="n" style="color:#a78bfa">\${job.score?.location || 0}%</div><div class="l">Location</div></div>
    </div>
    <div class="section-label">Matched Keywords</div>
    <div class="keyword-wrap">\${(job.score?.matchedKeywords || []).map(k => \`<span class="kw">\${k}</span>\`).join('')}</div>
    <div class="section-label">Recommendation</div>
    <div style="font-weight:700;color:\${job.score?.recommendation?.color || '#fff'}">\${job.score?.recommendation?.emoji || ''} \${job.score?.recommendation?.label || ''}</div>
    \${job.salary ? \`<div style="color:#94a3b8;font-size:12px;margin-top:8px">💰 Salary: \${job.salary}</div>\` : ''}
    <div>
      \${job.url ? \`<a href="\${job.url}" target="_blank" class="btn btn-apply">View &amp; Apply →</a>\` : ''}
      \${job.cvFile
        ? \`<a href="\${job.cvFile}" class="btn btn-cv" download>⬇ Download Custom CV</a>\`
        : \`<span class="btn btn-cv no-cv">CV Generating...</span>\`
      }
    </div>
  \`;
}

function applyFilters() {
  const score = parseInt(document.getElementById('filterScore').value) || 0;
  const lang = document.getElementById('filterLang').value;
  const source = document.getElementById('filterSource').value;
  const search = document.getElementById('searchBox').value.toLowerCase();
  filtered = JOBS.filter(j =>
    (j.score?.total || 0) >= score &&
    (!lang || j.language === lang) &&
    (!source || j.source === source) &&
    (!search || j.title?.toLowerCase().includes(search) || j.company?.toLowerCase().includes(search))
  );
  render(filtered);
}

render(JOBS);
</script>
</body>
</html>`;

  fs.writeFileSync(config.PATHS.dashboard, html);
  console.log(`\n✅ Dashboard saved: ${config.PATHS.dashboard}`);
}

// ── MAIN RUNNER ───────────────────────────────────────────────
async function main() {
  console.log('\n' + '═'.repeat(60));
  console.log('  🚀 MITALI\'S JOB AUTOMATION SYSTEM');
  console.log('  ' + new Date().toLocaleString('en-DE', { timeZone: 'Europe/Berlin' }));
  console.log('═'.repeat(60));

  // Step 0: Setup
  ensureDirs();

  // Step 0.5: Validate config
  const errors = validateConfig();
  if (errors.length > 0) {
    console.log('\n⛔ CONFIG ERRORS — Please fix before running:');
    errors.forEach(e => console.log('  ' + e));
    console.log('\n📝 Edit config.js and add your API keys, then run again.\n');
    process.exit(1);
  }

  // ── STEP 1: SCRAPE JOBS ──────────────────────────────────
  console.log('\n📡 STEP 1: SCRAPING JOBS...');
  let jobs = [];
  try {
    jobs = await scrapeAllSources();
    console.log(`✅ Scraped ${jobs.length} unique jobs`);
  } catch (e) {
    console.log(`❌ Scraping failed: ${e.message}`);
    process.exit(1);
  }

  // ── STEP 2: SCORE JOBS ───────────────────────────────────
  console.log('\n🎯 STEP 2: SCORING JOBS...');
  const scorer = new JobScorer();
  jobs.forEach(job => {
    job.score = scorer.score(job);
    job.score.atsKeywords = scorer.extractJDKeywords(job);
  });

  const topJobs = filterAndRank(jobs, config.SEARCH.minScore)
    .slice(0, config.SEARCH.maxResults);

  console.log(`✅ Top matches (${config.SEARCH.minScore}+ score): ${topJobs.length} jobs`);
  console.log(`   🔥 Strong matches (80+): ${topJobs.filter(j => j.score.total >= 80).length}`);
  console.log(`   ✅ Good matches (65-79): ${topJobs.filter(j => j.score.total >= 65 && j.score.total < 80).length}`);

  // Save raw jobs data
  fs.writeFileSync(config.PATHS.jobs, JSON.stringify({ timestamp: new Date().toISOString(), total: topJobs.length, jobs: topJobs }, null, 2));

  // ── STEP 3: EDIT CVs ─────────────────────────────────────
  console.log('\n✏️  STEP 3: EDITING CVs WITH CLAUDE SONNET 4.5...');
  console.log('   (This takes ~1-2 minutes for all jobs)');
  console.log('─'.repeat(50));

  let cvSuccess = 0;
  let cvFailed = 0;

  for (let i = 0; i < topJobs.length; i++) {
    const job = topJobs[i];
    process.stdout.write(`   [${i+1}/${topJobs.length}] ${job.title.slice(0,35)}... `);

    // Edit CV
    const editResult = await editCVForJob(job);

    if (!editResult.success) {
      console.log(`✗ Edit failed`);
      cvFailed++;
      continue;
    }

    // Generate PDF
    const pdfResult = await generateCVForJob(job, editResult.edits);

    if (pdfResult.success) {
      job.cvFile = pdfResult.path;
      job.atsScore = pdfResult.atsScore;
      console.log(`✓ Score: ${pdfResult.atsScore}% ATS | ${pdfResult.format.toUpperCase()}`);
      cvSuccess++;
    } else {
      console.log(`✗ PDF failed`);
      cvFailed++;
    }

    // Small delay to avoid rate limits
    if (i < topJobs.length - 1) {
      await new Promise(r => setTimeout(r, 500));
    }
  }

  console.log(`\n✅ CVs generated: ${cvSuccess} success, ${cvFailed} failed`);

  // ── STEP 4: COVER LETTERS ────────────────────────────────
  console.log('\n📝 STEP 4: GENERATING COVER LETTERS...');
  console.log('   English JDs → English (C1) · German JDs → German (A2)');
  let clSuccess = 0; let clFailed = 0;
  for (let i = 0; i < topJobs.length; i++) {
    const job = topJobs[i];
    process.stdout.write(`   [${i+1}/${topJobs.length}] ${job.title.slice(0,35)}... `);
    const clResult = await generateCoverLetter(job);
    if (clResult.success) { job.coverLetterFile = clResult.path; console.log(`✓ ${clResult.language === 'german' ? 'DE A2' : 'EN C1'}`); clSuccess++; }
    else { console.log(`✗ ${clResult.error}`); clFailed++; }
    if (i < topJobs.length - 1) await new Promise(r => setTimeout(r, 500));
  }
  console.log(`\n✅ Cover letters: ${clSuccess} success, ${clFailed} failed`);

  // ── STEP 4: GENERATE DASHBOARD ───────────────────────────
  console.log('\n📊 STEP 4: GENERATING DASHBOARD...');
  generateDashboard(topJobs);

  // ── SUMMARY ──────────────────────────────────────────────
  console.log('\n' + '═'.repeat(60));
  console.log('  ✅ AUTOMATION COMPLETE!');
  console.log('═'.repeat(60));
  console.log(`\n  📊 Dashboard:   ${config.PATHS.dashboard}`);
  console.log(`  📄 CVs folder:  ${config.PATHS.pdfs}`);
  console.log(`  📋 Jobs data:   ${config.PATHS.jobs}`);
  console.log(`\n  🎯 TOP 5 JOBS:`);
  topJobs.slice(0, 5).forEach((j, i) => {
    console.log(`  ${i+1}. [${j.score.total}] ${j.title} @ ${j.company} (${j.source})`);
  });
  console.log('\n  👉 Open dashboard/index.html in your browser to apply!\n');
}

// Run it
main().catch(e => {
  console.error('\n❌ Fatal error:', e.message);
  process.exit(1);
});
