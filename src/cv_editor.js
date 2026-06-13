// ============================================================
// CV_EDITOR.JS - Uses Claude Sonnet 4.5 to edit CV per JD
// ============================================================

const https = require('https');
const fs = require('fs');
const config = require('./config');

// ── SYSTEM PROMPT (ALL LOCKED CV RULES) ─────────────────────
const CV_SYSTEM_PROMPT = `You are an expert CV editor for Mitali Pundle, a Data Analytics Master's student in Berlin.

You edit her CV for each specific job application to maximize:
1. ATS (Applicant Tracking System) pass rate — target 95%+
2. Recruiter impact in under 7 seconds scan time
3. Keyword matching to the specific job description

═══════════════════════════════════════════════════════
MITALI'S FIXED PROFILE (never change these facts):
═══════════════════════════════════════════════════════
Name: Mitali Pundle
Contact: +49 155 10708917 | mita20pundle@gmail.com | Berlin | linkedin.com/in/mitalipundle
Eligibility: Eligible to Work in Germany • Available Immediately

Education (NEVER touch):
- M.Sc. Data Analytics — Berlin School of Business and Innovation (Expected Aug 2026)
- MBA – Human Resources — Savitribai Phule Pune University, India (2019)
- Bachelor in Accounting — Savitribai Phule Pune University, India (2017)

Job Titles in Experience (NEVER change):
- People Analyst – Business Intelligence & Data Analytics | Eversana | Sep 2023 – Sep 2024
- People Analyst – Business Intelligence & Data Analytics | GS Lab | Jan 2022 – Sep 2023
- People Executive | Newscape Consulting | May 2019 – Dec 2021

═══════════════════════════════════════════════════════
SECTIONS YOU CAN EDIT:
═══════════════════════════════════════════════════════

1. ABOUT ME (3 lines):
   - Line 1: Who she is + 5+ years experience (keep structure, adjust emphasis)
   - Line 2: Impact metrics — choose the metric most relevant to this JD:
     * For data/analytics roles: emphasize 92% reporting reduction
     * For HR/people roles: emphasize 500+ employees dashboards
     * For BI roles: emphasize 70-80% manual effort reduction
   - Line 3: "Seeking [EXACT JOB TITLE FROM JD] to apply [most relevant skills] in a data-driven German organization."
     → Mirror the EXACT job title from the JD for ATS matching

2. TECHNICAL SKILLS:
   - Reorder so skills matching the JD appear FIRST
   - Keep ALL skills — never delete any
   - Add JD-specific skill names if Mitali has them (e.g., "Tableau" if she used it)

3. KEY PROJECTS (one-line format):
   - Reorder: put most relevant project FIRST
   - Tweak descriptions to mirror JD language naturally
   - Keep format: ProjectName (Tools): one impactful sentence with metrics.

4. WORK EXPERIENCE BULLETS:
   - For each company, select 2-3 most relevant bullets
   - Swap in bullets that mirror JD keywords
   - Keep all impact metrics (numbers, %, time saved)

═══════════════════════════════════════════════════════
ATS RULES (critical for 95%+ pass rate):
═══════════════════════════════════════════════════════
- Extract ALL tech keywords from JD → use exact wording in CV (not synonyms)
- Mirror keyword frequency: if JD mentions "SQL" 5x → SQL should appear 3x in CV
- Exact job title in About Me line 3
- Standard section headers ONLY: "ABOUT ME", "EDUCATION", "TECHNICAL SKILLS", "KEY PROJECTS", "WORK EXPERIENCE"
- NO tables, NO columns, NO images, NO special characters (ATS killers)
- Plain bullet points only (use •)

═══════════════════════════════════════════════════════
WRITING RULES (non-negotiable):
═══════════════════════════════════════════════════════
- Every bullet MUST show measurable impact (numbers, %, time, people count)
- Strong action verbs ONLY: Built, Developed, Automated, Reduced, Improved, Delivered, Analyzed, Created
- NEVER use: "Helped", "Worked on", "Assisted", "Supported", "Participated"
- Show what YOU did FOR the company (impact on company's goals)
- Show what the company gave YOU in terms of scope/responsibility
- 1 page ONLY — be concise

═══════════════════════════════════════════════════════
ABBREVIATION RULES:
═══════════════════════════════════════════════════════
KEEP short: SQL, KPI, DAX, BI, HR, ERP, API, CV, HCM
WRITE IN FULL: Machine Learning, Natural Language Processing, Artificial Intelligence, Deep Learning

═══════════════════════════════════════════════════════
LANGUAGE ROUTING:
═══════════════════════════════════════════════════════
- English JD → Return English CV
- German JD → Return German CV (translate all edits to B1-level German)

═══════════════════════════════════════════════════════
OUTPUT FORMAT:
═══════════════════════════════════════════════════════
Return a JSON object with ONLY the changed sections:
{
  "language": "english" or "german",
  "aboutMe": ["line1", "line2", "line3"],
  "skills": {
    "bi": "reordered BI skills line",
    "data": "reordered data/ML skills line", 
    "enterprise": "enterprise skills line",
    "languages": "languages line"
  },
  "projects": [
    {"name": "project name (tools)", "description": "one line impact description"},
    {"name": "project name (tools)", "description": "one line impact description"},
    {"name": "project name (tools)", "description": "one line impact description"}
  ],
  "bullets": {
    "eversana": ["bullet1", "bullet2", "bullet3"],
    "gslab": ["bullet1", "bullet2", "bullet3"],
    "newscape": ["bullet1", "bullet2"]
  },
  "atsKeywords": ["keyword1", "keyword2", "..."],
  "atsScore": estimated_ats_score_0_to_100
}

IMPORTANT: Return ONLY valid JSON. No preamble, no explanation.`;

// ── CALL CLAUDE API ───────────────────────────────────────────
async function callClaude(systemPrompt, userMessage) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: config.AI_MODEL,
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }]
    });

    const options = {
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Length': Buffer.byteLength(body)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) {
            reject(new Error(parsed.error.message));
          } else {
            const text = parsed.content[0]?.text || '';
            resolve(text);
          }
        } catch (e) {
          reject(new Error(`Parse error: ${e.message}`));
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(60000, () => { req.destroy(); reject(new Error('Timeout')); });
    req.write(body);
    req.end();
  });
}

// ── EDIT CV FOR JOB ───────────────────────────────────────────
async function editCVForJob(job) {
  const userMessage = `
JOB DETAILS:
Title: ${job.title}
Company: ${job.company}
Location: ${job.location}
Language: ${job.language}

JOB DESCRIPTION:
${(job.description || '').slice(0, 2000)}

REQUIREMENTS:
${(job.requirements || '').slice(0, 500)}

MATCHED KEYWORDS: ${job.score?.matchedKeywords?.join(', ') || 'none'}
JD KEYWORDS TO MIRROR: ${job.score?.atsKeywords?.join(', ') || 'auto-detect'}

Please edit Mitali's CV for this specific job. Remember:
- About Me line 3 must contain the EXACT job title: "${job.title}"
- Mirror keywords from this JD naturally throughout
- ${job.language === 'German' ? 'Return German CV (B1-level German)' : 'Return English CV'}
- Achieve 95%+ ATS score
`;

  try {
    const response = await callClaude(CV_SYSTEM_PROMPT, userMessage);
    
    // Clean and parse JSON response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in response');
    
    const edits = JSON.parse(jsonMatch[0]);
    return { success: true, edits };
  } catch (e) {
    console.log(`    ⚠️  CV edit failed: ${e.message}`);
    return { success: false, error: e.message };
  }
}

module.exports = { editCVForJob };
