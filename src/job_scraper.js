// ============================================================
// JOB_SCRAPER.JS - ENHANCED VERSION
// Uses Apify rag-web-browser (full web search) + free APIs
// ============================================================

const https = require('https');
const config = require('./config');

// ── FETCH URL WITH TIMEOUT ────────────────────────────────────
async function fetchURL(url, timeoutMs = 10000) {
  return new Promise((resolve) => {
    try {
      const p = new URL(url);
      const req = https.request({
        hostname: p.hostname,
        path: p.pathname + p.search,
        method: 'GET',
        headers: { 
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json'
        }
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            resolve(parsed);
          } catch (e) {
            resolve(null);
          }
        });
      });

      req.on('error', (err) => {
        console.log(`      ⚠️  Network error: ${err.message}`);
        resolve(null);
      });

      req.setTimeout(timeoutMs, () => {
        req.destroy();
        resolve(null);
      });

      req.end();
    } catch (e) {
      console.log(`      ⚠️  Error: ${e.message}`);
      resolve(null);
    }
  });
}

// ── APIFY RAG WEB BROWSER (Full web search) ──────────────────
async function runRagWebBrowser(query, maxResults = 15) {
  return new Promise((resolve) => {
    const body = JSON.stringify({
      query: query,
      maxResults: maxResults,
      outputFormats: ['markdown']
    });

    const options = {
      hostname: 'api.apify.com',
      path: `/v2/acts/apify~rag-web-browser/run-sync-get-dataset-items?token=${config.APIFY_API_KEY}&timeout=60&memory=1024`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          const items = Array.isArray(parsed) ? parsed : (parsed.items || []);
          resolve(items);
        } catch (e) {
          resolve([]);
        }
      });
    });

    req.on('error', (e) => {
      console.log(`      ⚠️  RAG Browser error: ${e.message}`);
      resolve([]);
    });

    req.setTimeout(65000, () => {
      req.destroy();
      resolve([]);
    });

    req.write(body);
    req.end();
  });
}

// ── LANGUAGE DETECTOR ─────────────────────────────────────────
function detectLanguage(text) {
  if (!text) return 'English';
  const t = text.toLowerCase();
  const de = ['und', 'der', 'die', 'für', 'mit', 'wir', 'suchen', 'kenntnisse', 'erfahrung'];
  const en = ['and', 'the', 'for', 'with', 'we', 'you', 'our', 'experience', 'skills'];
  const deCount = de.filter(w => t.includes(w)).length;
  const enCount = en.filter(w => t.includes(w)).length;
  return deCount > enCount ? 'German' : 'English';
}

// ── SENIORITY FILTER ──────────────────────────────────────────
function isTooSenior(title) {
  const t = (title || '').toLowerCase();
  const keepWords = ['werkstudent', 'working student', 'junior', 'entry', 'intern', 'hiwi', 'trainee'];
  const skipWords = ['senior', 'lead', 'principal', 'director', 'chief', 'manager', 'leiter'];
  
  if (keepWords.some(w => t.includes(w))) return false;
  if (skipWords.some(w => t.includes(w))) return true;
  return false;
}

// ── NORMALIZE JOB DATA ────────────────────────────────────────
function normalize(raw, source) {
  return {
    id: `${source}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    title: (raw.title || raw.jobTitle || raw.position || raw.heading || '').trim(),
    company: (raw.company || raw.companyName || raw.employer || raw.metadata?.company || '').trim(),
    location: (raw.location || raw.city || raw.jobLocation || raw.metadata?.location || 'Germany').trim(),
    description: (raw.description || raw.jobDescription || raw.content || raw.text || raw.markdown || '').trim(),
    requirements: (raw.requirements || raw.skills || raw.qualifications || '').trim(),
    url: raw.url || raw.jobUrl || raw.applyUrl || raw.link || raw.metadata?.url || '',
    salary: raw.salary || raw.salaryRange || raw.metadata?.salary || '',
    postedDate: raw.postedDate || raw.publishedAt || new Date().toISOString(),
    source: source,
    language: detectLanguage((raw.description || raw.title || '') + (raw.requirements || '')),
    score: null
  };
}

// ── DEDUPLICATE JOBS ──────────────────────────────────────────
function deduplicate(jobs) {
  const seen = new Set();
  return jobs.filter(j => {
    const key = `${(j.title || '').toLowerCase().slice(0, 40)}_${(j.company || '').toLowerCase().slice(0, 20)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ── RELEVANCE CHECK - STRICT WHITELIST ────────────────────────
function isRelevant(job) {
  const title = (job.title || '').toLowerCase();
  const desc = (job.description || '').toLowerCase();
  const req = (job.requirements || '').toLowerCase();
  const text = title + ' ' + desc + ' ' + req;
  
  // WHITELIST: Only these keywords are relevant
  const relevantKeywords = [
    'data', 'analytics', 'analyst', 'intelligence', 'bi', 'dashboard', 'reporting',
    'hr', 'human resources', 'people', 'workforce',
    'python', 'sql', 'excel', 'power bi', 'tableau',
    'werkstudent', 'working student', 'junior'
  ];
  
  // MUST have at least one relevant keyword
  const hasRelevant = relevantKeywords.some(k => text.includes(k));
  if (!hasRelevant) return false;
  
  // REJECT: Non-data roles
  const badKeywords = ['marketing', 'sales', 'recruiting', 'finance', 'accounting', 'software developer', 'devops', 'backend', 'frontend', 'java', 'c++'];
  const hasBad = badKeywords.some(k => title.includes(k));
  if (hasBad) return false;
  
  return true;
}

// ══════════════════════════════════════════════════════════════
// SOURCE 1: RAG WEB BROWSER (Full web search - NEW!)
// ══════════════════════════════════════════════════════════════
async function scrapeWebWithRag() {
  console.log('  🔍 Web Search (rag-web-browser)...');
  const results = [];

  const searches = [
    'Werkstudent Data Analytics Berlin Germany jobs',
    'Werkstudent Business Intelligence Python SQL',
    'Junior Data Analyst Germany Werkstudent',
    'Power BI Werkstudent Berlin jobs',
    'Data Science Werkstudent Germany HR Analytics'
  ];

  for (const q of searches) {
    try {
      console.log(`      Searching: "${q}"`);
      const data = await runRagWebBrowser(q, 10);

      if (!Array.isArray(data) || data.length === 0) {
        console.log(`      ⚠️  No results`);
        continue;
      }

      const filtered = data
        .filter(j => !isTooSenior((j.title || j.heading || '')))
        .slice(0, 8);

      if (filtered.length > 0) {
        filtered.forEach(j => results.push(normalize(j, 'Web_Search')));
        console.log(`      ✓ Found ${filtered.length} jobs`);
      }
    } catch (e) {
      console.log(`      ✗ Error: ${e.message}`);
    }

    await new Promise(r => setTimeout(r, 1000));
  }

  return results;
}

// ══════════════════════════════════════════════════════════════
// SOURCE 2: ARBEITNOW (Free API - Backup)
// ══════════════════════════════════════════════════════════════
async function scrapeArbeitnow() {
  console.log('  🌐 Arbeitnow.com (backup)...');
  const results = [];

  const searches = [
    'werkstudent+data',
    'data+analyst',
    'business+intelligence'
  ];

  for (const q of searches) {
    try {
      console.log(`      Searching: "${q}"`);
      const data = await fetchURL(`https://www.arbeitnow.com/api/job-board-api?search=${q}`, 8000);

      if (!data || !data.data || !Array.isArray(data.data)) {
        console.log(`      ⚠️  No results`);
        continue;
      }

      const filtered = data.data
        .filter(j => !isTooSenior(j.title || ''))
        .slice(0, 8);

      if (filtered.length > 0) {
        filtered.forEach(j => results.push(normalize(j, 'Arbeitnow.com')));
        console.log(`      ✓ Found ${filtered.length} jobs`);
      }
    } catch (e) {
      console.log(`      ✗ Error: ${e.message}`);
    }

    await new Promise(r => setTimeout(r, 500));
  }

  return results;
}

// ══════════════════════════════════════════════════════════════
// MAIN SCRAPER FUNCTION
// ══════════════════════════════════════════════════════════════
async function scrapeAllSources() {
  console.log('\n🌐 SCRAPING ENTIRE WEB FOR JOBS...');
  console.log('   Targets: Data, Analytics, HR, BI, Werkstudent roles');
  console.log('   Sources: Web Search (LinkedIn, Indeed, Stepstone, etc.) + Arbeitnow');
  console.log('─'.repeat(50));

  const all = [];

  // Run web search FIRST (highest quality)
  const web = await scrapeWebWithRag();
  all.push(...web);

  // Run free API as backup
  const arbeitnow = await scrapeArbeitnow();
  all.push(...arbeitnow);

  // Deduplicate
  const unique = deduplicate(all);

  // Filter for relevance (strict whitelist)
  const relevant = unique.filter(isRelevant);

  // Summary
  console.log(`\n📊 SCRAPING SUMMARY:`);
  console.log(`   Total raw:    ${all.length}`);
  console.log(`   Unique:       ${unique.length}`);
  console.log(`   Relevant:     ${relevant.length}`);
  console.log(`   By source:`);
  console.log(`     Web_Search:    ${relevant.filter(j => j.source === 'Web_Search').length}`);
  console.log(`     Arbeitnow:     ${relevant.filter(j => j.source === 'Arbeitnow.com').length}`);

  if (relevant.length === 0) {
    console.log(`\n   ⚠️  WARNING: No matching jobs found. APIs may be down.`);
  }

  return relevant;
}

module.exports = { scrapeAllSources, detectLanguage, normalize };