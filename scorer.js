// ============================================================
// SCORER.JS - Scores jobs against Mitali's profile (0-100)
// ============================================================

const config = require('./config');

class JobScorer {
  constructor() {
    this.profile = config.PROFILE;
    this.weights = config.SCORING;
  }

  score(job) {
    const skills = this.scoreSkills(job);
    const experience = this.scoreExperience(job);
    const role = this.scoreRole(job);
    const location = this.scoreLocation(job);

    const total = Math.round(
      skills * this.weights.skillsMatch +
      experience * this.weights.experienceFit +
      role * this.weights.roleAlignment +
      location * this.weights.locationFit
    );

    return {
      total,
      skills,
      experience,
      role,
      location,
      matchedKeywords: this.extractMatchedKeywords(job),
      missingKeywords: this.extractMissingKeywords(job),
      recommendation: this.getRecommendation(total),
      cvLanguage: job.language === 'German' ? 'german' : 'english'
    };
  }

  scoreSkills(job) {
    const text = `${job.title} ${job.description} ${job.requirements}`.toLowerCase();
    const matched = this.profile.skills.filter(s => text.includes(s.toLowerCase()));
    const base = Math.round((matched.length / this.profile.skills.length) * 100);

    // Bonus for high-value skill matches
    let bonus = 0;
    if (text.includes('power bi')) bonus += 10;
    if (text.includes('sql')) bonus += 8;
    if (text.includes('python')) bonus += 8;
    if (text.includes('workday')) bonus += 10;
    if (text.includes('machine learning')) bonus += 5;

    return Math.min(100, base + bonus);
  }

  scoreExperience(job) {
    const text = (job.description || '').toLowerCase();
    const yearMatch = text.match(/(\d+)\s*[\+\-]?\s*(?:years?|jahre?)\s*(?:of\s+)?(?:experience|erfahrung)/i);
    const reqYears = yearMatch ? parseInt(yearMatch[1]) : 0;

    if (reqYears === 0) return 80; // No requirement = decent match
    if (this.profile.experienceYears >= reqYears) return 100;
    return Math.round((this.profile.experienceYears / reqYears) * 100);
  }

scoreRole(job) {
    const title = (job.title || '').toLowerCase();
    const desc = (job.description || '').toLowerCase();
    const text = title + ' ' + desc;
    
    // WHITELIST: Only keywords Mitali should apply to
    const whitelistKeywords = [
      'data', 'analytics', 'analyst', 'intelligence', 'bi', 'dashboard',
      'hr', 'people', 'workforce', 'employee', 'human resources',
      'power bi', 'sql', 'python', 'werkstudent', 'working student',
      'business analyst', 'reporting', 'kpi'
    ];
    
    // Count how many whitelist keywords are in the job
    const matchCount = whitelistKeywords.filter(k => text.includes(k)).length;
    
    // If NO relevant keywords found, score very low
    if (matchCount === 0) return 15;
    
    // Score based on how many relevant keywords match
    let score = 40 + (matchCount * 8);
    
    // Bonus for Werkstudent
    if (title.includes('werkstudent') || title.includes('working student')) {
      score += 10;
    }
    
    return Math.min(100, score);
  }

  scoreLocation(job) {
    const loc = (job.location || '').toLowerCase();
    if (loc.includes('remote') || loc.includes('home office') || loc.includes('homeoffice')) return 100;
    if (loc.includes('berlin')) return 100;
    if (loc.includes('germany') || loc.includes('deutschland') || loc.includes('de')) return 85;
    if (loc === '' || loc === 'unknown') return 60;
    return 50;
  }

  extractMatchedKeywords(job) {
    const text = `${job.title} ${job.description} ${job.requirements}`.toLowerCase();
    return this.profile.skills
      .filter(s => text.includes(s.toLowerCase()))
      .slice(0, 8);
  }

  extractMissingKeywords(job) {
    const text = `${job.title} ${job.description} ${job.requirements}`.toLowerCase();
    return this.profile.skills
      .filter(s => !text.includes(s.toLowerCase()))
      .slice(0, 5);
  }

  getRecommendation(score) {
    if (score >= 80) return { label: 'STRONG MATCH', emoji: '🔥', color: '#22c55e' };
    if (score >= 65) return { label: 'GOOD MATCH', emoji: '✅', color: '#3b82f6' };
    if (score >= 50) return { label: 'POTENTIAL', emoji: '🟡', color: '#eab308' };
    return { label: 'WEAK MATCH', emoji: '⚪', color: '#6b7280' };
  }

  // Extract ALL keywords from JD for ATS matching
  extractJDKeywords(job) {
    const text = `${job.title} ${job.description} ${job.requirements}`;
    const techKeywords = [
      'Power BI', 'SQL', 'Python', 'Excel', 'Workday', 'DAX', 'Tableau', 'Looker',
      'Machine Learning', 'Data Analysis', 'Dashboard', 'KPI', 'Reporting',
      'PostgreSQL', 'MySQL', 'Pandas', 'NumPy', 'PyTorch', 'TensorFlow',
      'Business Intelligence', 'Data Modeling', 'ETL', 'Data Warehouse',
      'R', 'SPSS', 'SAS', 'Spark', 'Hadoop', 'Azure', 'AWS', 'GCP',
      'Agile', 'Scrum', 'Jira', 'Confluence', 'Git', 'SAP', 'Salesforce'
    ];
    return techKeywords.filter(k => text.toLowerCase().includes(k.toLowerCase()));
  }
}

// Filter and sort jobs
function filterAndRank(jobs, minScore = config.SEARCH.minScore) {
  return jobs
    .filter(j => j.score && j.score.total >= minScore)
    .sort((a, b) => b.score.total - a.score.total);
}

module.exports = { JobScorer, filterAndRank };
