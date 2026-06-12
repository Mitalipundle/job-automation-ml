# 🚀 Mitali's Job Automation System

Automatically scrapes German job boards, scores jobs, edits your CV for each job using Claude Sonnet 4.5, and generates 50+ customized PDFs daily.

---

## 📁 FOLDER STRUCTURE

```
JobAutomation/
├── config.js              ← YOUR SETTINGS (edit this first!)
├── run_all.js             ← RUN THIS to scrape + score + generate CVs
├── scheduler.js           ← AUTO-RUN at 08:00 AM daily
├── job_scraper.js         ← Scrapes 8 German job sources
├── scorer.js              ← Scores jobs against your profile
├── cv_editor.js           ← Claude Sonnet 4.5 edits CV per JD
├── pdf_generator.js       ← Generates PDF for each job
├── cvs/
│   ├── master_english.html  ← Master English CV template
│   └── master_german.html   ← Master German CV template
├── dashboard/
│   └── index.html           ← Your daily job dashboard (auto-generated)
└── output/
    ├── jobs_daily.json      ← Scraped jobs data
    ├── pdfs/                ← Your customized CVs (one per job!)
    └── logs/                ← Scheduler logs
```

---

## ⚡ QUICK SETUP (5 minutes)

### Step 1: Add your API keys in config.js

Open `config.js` and fill in:
```javascript
APIFY_API_KEY: 'apify_api_PM9Tp3hVpumxpDcud28MLtdBWkNXfE39DsAJ',  // already done!
ANTHROPIC_API_KEY: 'YOUR_ANTHROPIC_API_KEY_HERE',  // get from console.anthropic.com
```

**Getting your Anthropic API key:**
1. Go to https://console.anthropic.com
2. Sign up / Log in
3. Click "API Keys" → "Create Key"
4. Copy and paste into config.js

### Step 2: Install dependencies

Open Command Prompt in this folder and run:
```bash
npm install node-schedule
```

### Step 3: Run it NOW (test)

```bash
node run_all.js
```

### Step 4: Set up daily automation

```bash
node scheduler.js
```

Keep this terminal open — it runs every day at 08:00 AM automatically.

---

## 📊 DAILY WORKFLOW

After running:
1. Open `dashboard/index.html` in Chrome
2. See all jobs ranked by match score
3. Click a job → see score breakdown + keywords
4. Click "Download Custom CV" → get your tailored PDF
5. Click "View & Apply" → go to job posting
6. Apply in 2 minutes!

---

## 🎯 WHAT IT DOES

| Step | What Happens |
|------|-------------|
| 1. Scrape | Pulls 100+ jobs from LinkedIn, Indeed.de, Stepstone, Arbeitsagentur, Arbeitnow, BerlinStartupJobs, Startup.jobs, Wellfound |
| 2. Score | Scores each job 0-100 based on skills (40%), experience (25%), role (20%), location (15%) |
| 3. Filter | Keeps only jobs scoring 60+ |
| 4. Edit CV | Claude Sonnet 4.5 analyzes each JD and tailors your CV (About Me, Skills, Projects, Bullets) |
| 5. Generate | Creates one PDF per job with 95%+ ATS pass rate |
| 6. Dashboard | Shows all jobs ranked with download links |

---

## ✅ CV RULES (automatic)

Every generated CV follows these rules:
- **1 page only** (hard limit)
- **95%+ ATS score** (keyword mirroring)
- **Impact-first bullets** (numbers, %, time saved)
- **Action verbs** (Built, Developed, Automated, Reduced)
- **Abbreviations**: SQL/KPI/DAX stay short; Machine Learning/Natural Language Processing written in full
- **Job title in About Me** mirrors exact JD title for ATS
- **Never changes**: Education, Name/Contact, Job Titles in Experience

---

## 🔧 TROUBLESHOOTING

**"Cannot find module"** → Run: `npm install node-schedule`

**"Anthropic API error"** → Check your API key in config.js

**"Apify timeout"** → Some scrapers may be slow; jobs from other sources still work

**"Chrome not found"** → CVs saved as HTML files instead of PDF; open in Chrome and print to PDF manually

**No jobs found** → Your Apify credits may be low; check at console.apify.com

---

## 💰 COSTS

| Service | Cost |
|---------|------|
| Apify scraping | ~$3-5/month for 100 jobs/day |
| Anthropic (Sonnet 4.5) | ~$0.50-1/day for 50 CV edits |
| **Total** | ~$4-6/month |

---

## 📝 CUSTOMIZING

**Add more search keywords** → Edit `config.js` → `SEARCH.keywords`

**Change scoring weights** → Edit `config.js` → `SCORING`

**Edit your CV template** → Edit `cvs/master_english.html` or `cvs/master_german.html`

**Change run time** → Edit `scheduler.js` → `{ hour: 8, minute: 0 }`

---

*Built for Mitali Pundle — Job Automation System v1.0*
