// ============================================================
// CONFIG.JS - Your Job Automation Settings
// ============================================================
// INSTRUCTIONS:
// 1. Add your Apify API key below (already added!)
// 2. Add your Anthropic API key (get from console.anthropic.com)
// 3. Run: node run_all.js
// ============================================================

module.exports = {

  // ── API KEYS ──────────────────────────────────────────────
  APIFY_API_KEY: 'your-apify-key-here',
  ANTHROPIC_API_KEY: 'your-anthropic-key-here', // get from console.anthropic.com

  // ── AI MODEL ──────────────────────────────────────────────
  AI_MODEL: 'claude-haiku-4-5-20251001',

  // ── JOB SEARCH SETTINGS ──────────────────────────────────
  SEARCH: {
    // Search keywords (system will search all combinations)
    keywords: [
      'Werkstudent Data Analytics',
      'Werkstudent Business Intelligence',
      'Werkstudent Data Analyst',
      'Junior Data Analyst',
      'Junior Business Analyst',
      'People Analyst',
      'HR Data Analyst',
      'HR Analytics',
      'BI Analyst',
      'Working Student Data'
    ],
    location: 'Germany',
    maxJobsPerSource: 50,   // Max jobs per platform
    minScore: 50,           // Only keep jobs scoring 60+
    maxResults: 100,        // Total jobs in dashboard
    daysOld: 14,            // Only jobs posted in last 14 days
  },

  // ── SCORING WEIGHTS ──────────────────────────────────────
  SCORING: {
    skillsMatch: 0.40,      // 40% weight
    experienceFit: 0.25,    // 25% weight
    roleAlignment: 0.20,    // 20% weight
    locationFit: 0.15,      // 15% weight
  },

  // ── YOUR PROFILE (used for scoring) ──────────────────────
  PROFILE: {
    name: 'Mitali Pundle',
    skills: [
      'Power BI', 'DAX', 'Data Modeling', 'Dashboard',
      'SQL', 'MySQL', 'PostgreSQL',
      'Python', 'Pandas', 'NumPy', 'PyTorch',
      'Machine Learning', 'Natural Language Processing', 'Sentiment Analysis',
      'Workday', 'HCM', 'Excel', 'KPI', 'Reporting',
      'Data Analytics', 'Business Intelligence', 'Data Visualization'
    ],
    experienceYears: 5,
    targetRoles: [
      'werkstudent', 'working student', 'hiwi',
      'data analyst', 'business analyst', 'people analyst',
      'hr analyst', 'hr analytics', 'bi analyst',
      'data analytics', 'business intelligence'
    ],
    languages: ['English', 'German'],
    location: 'Berlin',
  },

  // ── OUTPUT PATHS ─────────────────────────────────────────
  PATHS: {
    jobs: './output/jobs_daily.json',
    pdfs: './output/pdfs/',
    dashboard: './dashboard/index.html',
    masterEnglishCV: './cvs/master_english.html',
    masterGermanCV: './cvs/master_german.html',
    logs: './output/logs/',
  },

  // ── APIFY ACTORS ─────────────────────────────────────────
  ACTORS: {
    linkedin: 'santamaria-automations/linkedin-scraper',
    indeed: 'kaix/indeed-scraper',
    stepstone: 'khadinakbar/stepstone-jobs-scraper',
    arbeitsagentur: 'santamaria-automations/arbeitsagentur-de-scraper',
  },

  // ── SCHEDULER ────────────────────────────────────────────
  SCHEDULE: {
    runAt: '0 8 * * *',    // Every day at 08:00 AM
    timezone: 'Europe/Berlin',
  },

  // ── ATS RULES (passed to AI editor) ──────────────────────
  ATS: {
    targetScore: 95,        // Target 95%+ ATS pass rate
    minKeywordMatch: 0.80,  // 80% of JD keywords must appear in CV
  }
};
