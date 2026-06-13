// ============================================================
// COVER_LETTER_GENERATOR.JS
// Generates tailored cover letters per JD using Claude Sonnet 4.5
// Design 2 template, English (C1) or German (A2)
// ============================================================

const https = require('https');
const fs = require('fs');
const path = require('path');
const config = require('./config');

// ── SYSTEM PROMPT ─────────────────────────────────────────────
const CL_SYSTEM_PROMPT = `You are writing a cover letter for Mitali Pundle, a Data Analytics Master's student in Berlin.

═══════════════════════════════════════════════════════
MITALI'S FIXED PROFILE:
═══════════════════════════════════════════════════════
Name: Mitali Pundle
Phone: +49 155 10708917
Email: mita20pundle@gmail.com
LinkedIn: linkedin.com/in/mitalipundle
Location: Berlin, Germany

Background:
- 5+ years in HR operations → deliberately moved into Data Analytics
- Masters thesis: ML vs transformer models for German employee sentiment analysis
  (transformer achieved 57.5% accuracy vs 40% baseline; Spearman r=0.37)
- Built 5 Power BI dashboards for 500+ employees across 6 regions at Eversana
- Automated reporting: 6 hours → 30 minutes (92% reduction) at GS Lab
- Tools: Power BI, SQL, Python, Machine Learning, Workday HCM, Excel

Mandatory facts to weave in naturally:
- Fluent English (C1), German (B1 overall but write German letters at A2 level)
- Valid German work authorisation
- Available immediately

═══════════════════════════════════════════════════════
COVER LETTER RULES (non-negotiable):
═══════════════════════════════════════════════════════

STRUCTURE (always follow this exactly):
1. HOOK (1 punchy sentence — goes in blue callout box)
   → Open with THEIR problem + YOUR proof
   → NEVER start with "I am excited to apply", "I am writing to", "My name is"
   → Lead with a stat, a challenge, or a bold claim
   → Example: "500+ employees. 5 dashboards. 70% less manual work. That is what I delivered at Eversana — and it is exactly what your team needs."

2. PARAGRAPH 1 — HR→Data narrative + proof (3 sentences max)
   → The shift from HR to analytics must sound INTENTIONAL, not accidental
   → "Five years in HR taught me that people decisions are only as good as the data behind them."
   → Include one metric from her experience

3. PARAGRAPH 2 — Why THIS company specifically (3 sentences max)
   → Extract something specific from the JD (their product, tool, industry, challenge)
   → Connect it to Mitali's matching skill/experience
   → Make it feel written ONLY for this company

4. PARAGRAPH 3 — Differentiation + work auth + availability (2-3 sentences)
   → "Most Werkstudent applicants are still learning the tools. I have already deployed them at scale."
   → Weave in: work authorisation + availability naturally (not as a list)

5. CLOSE — confident, specific (1 sentence)
   → "I would welcome a 20-minute conversation to show you specifically how I would approach your [specific challenge]."
   → NEVER: "I hope to hear from you", "Thank you for your consideration"

TONE RULES:
- Conversational, slightly cheeky, yet professional
- Confident without being arrogant
- Never desperate or pleading
- Sounds human, not AI-generated
- Bold keywords for 20-second scanning

FORMATTING RULES:
- Use **keyword** for bold (these become <strong> in HTML)
- No dashes — use proper punctuation (commas, full stops, em dashes only as —)
- Replace all " - " with ", " or restructure the sentence
- Max 1 page when rendered

LANGUAGE RULES:
- English JD → English at C1 level (fluent, natural, confident)
- German JD → German at A2 level:
  * Short simple sentences (max 10 words each)
  * Basic vocabulary only
  * No complex German grammar (no Konjunktiv II, no complex subordinate clauses)
  * Sounds natural for a non-native speaker
  * Correct but simple

SIGN-OFF RULES (non-negotiable):
- English letter → "Best regards,"
- German letter → "Mit freundlichen Grüßen,"
- NEVER mix languages in sign-off

═══════════════════════════════════════════════════════
OUTPUT FORMAT:
═══════════════════════════════════════════════════════
Return a JSON object:
{
  "language": "english" or "german",
  "date": "June 2026",
  "companyName": "extracted from JD",
  "jobTitle": "extracted from JD",
  "jobReference": "extracted from JD or null",
  "hook": "one punchy sentence for blue callout box",
  "paragraph1": "HR to data narrative paragraph",
  "paragraph2": "why this company specifically paragraph",
  "paragraph3": "differentiation + work auth + availability paragraph",
  "closing": "confident specific call to action sentence",
  "signoff": "Best regards," or "Mit freundlichen Grüßen,"
}

IMPORTANT: Return ONLY valid JSON. No preamble, no explanation, no markdown fences.`;

// ── CALL CLAUDE API ───────────────────────────────────────────
async function callClaude(systemPrompt, userMessage) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: config.AI_MODEL,
      max_tokens: 1500,
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
          if (parsed.error) reject(new Error(parsed.error.message));
          else resolve(parsed.content[0]?.text || '');
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

// ── RENDER BOLD KEYWORDS ──────────────────────────────────────
function renderBold(text) {
  return (text || '').replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}

// ── BUILD HTML COVER LETTER ───────────────────────────────────
function buildCoverLetterHTML(data, job) {
  const isGerman = data.language === 'german';

  return `<!DOCTYPE html>
<html lang="${isGerman ? 'de' : 'en'}">
<head>
<meta charset="UTF-8">
<title>Cover_Letter_Mitali_${sanitize(data.companyName)}_${sanitize(data.jobTitle)}</title>
<link href="https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;600;700&family=Cormorant+Garamond:wght@700&display=swap" rel="stylesheet">
<style>
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Source Sans 3', Arial, sans-serif; color: #2c2c2c; background: #fff; width: 210mm; min-height: 297mm; margin: 0 auto; font-size: 9.5pt; line-height: 1.6; }

  .header-bar { background: #0B3D6B; color: #fff; padding: 20px 32px 14px; }
  .name { font-family: 'Cormorant Garamond', Georgia, serif; font-size: 28pt; font-weight: 700; letter-spacing: 1px; }
  .tagline { font-size: 8.5pt; color: #8EC5FC; letter-spacing: 2px; text-transform: uppercase; margin-top: 3px; }
  .contact-row { display: flex; gap: 14px; font-size: 8pt; color: #c5ddf0; margin-top: 6px; flex-wrap: wrap; }
  .eligibility-bar { background: #0A2F52; color: #8EC5FC; font-size: 7.5pt; padding: 4px 32px; letter-spacing: 1.5px; text-transform: uppercase; }

  .content { padding: 22px 32px 24px; }

  .meta-row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 18px; }
  .company-block { }
  .company-name { font-weight: 700; font-size: 9.5pt; color: #0B3D6B; }
  .job-ref { font-size: 8pt; color: #777; margin-top: 2px; }
  .date-block { font-size: 8.5pt; color: #888; text-align: right; }

  .hook-box { border-left: 3px solid #8EC5FC; background: #f0f6ff; padding: 10px 14px; margin-bottom: 16px; border-radius: 0 4px 4px 0; }
  .hook-box p { font-size: 9.5pt; font-weight: 600; color: #0B3D6B; line-height: 1.5; }

  .body-para { font-size: 9pt; color: #333; margin-bottom: 12px; line-height: 1.65; }
  .body-para strong { color: #0B3D6B; font-weight: 600; }

  .signoff { margin-top: 20px; border-top: 1px solid #e5e7eb; padding-top: 14px; }
  .signoff-text { font-size: 9pt; color: #555; margin-bottom: 6px; }
  .signoff-name { font-weight: 700; font-size: 10pt; color: #0B3D6B; }
  .signoff-contact { font-size: 7.5pt; color: #999; margin-top: 3px; }

  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body>

<div class="header-bar">
  <div class="name">MITALI PUNDLE</div>
  <div class="tagline">Data Analytics · Business Intelligence · Machine Learning · Power BI · SQL</div>
  <div class="contact-row">
    <span>+49 155 10708917</span>
    <span>mita20pundle@gmail.com</span>
    <span>Berlin</span>
    <span>linkedin.com/in/mitalipundle</span>
  </div>
</div>
<div class="eligibility-bar">Eligible to Work in Germany · Available Immediately</div>

<div class="content">

  <div class="meta-row">
    <div class="company-block">
      <div class="company-name">${escapeHtml(data.companyName || '')}</div>
      <div class="job-ref">${escapeHtml(data.jobTitle || '')}${data.jobReference ? ' · Ref: ' + escapeHtml(data.jobReference) : ''}</div>
    </div>
    <div class="date-block">${escapeHtml(data.date || 'June 2026')}</div>
  </div>

  <div class="hook-box">
    <p>${renderBold(data.hook || '')}</p>
  </div>

  <p class="body-para">${renderBold(data.paragraph1 || '')}</p>
  <p class="body-para">${renderBold(data.paragraph2 || '')}</p>
  <p class="body-para">${renderBold(data.paragraph3 || '')}</p>
  <p class="body-para">${renderBold(data.closing || '')}</p>

  <div class="signoff">
    <p class="signoff-text">${escapeHtml(data.signoff || 'Best regards,')}</p>
    <p class="signoff-name">Mitali Pundle</p>
    <p class="signoff-contact">+49 155 10708917 · mita20pundle@gmail.com · linkedin.com/in/mitalipundle</p>
  </div>

</div>
</body>
</html>`;
}

// ── GENERATE COVER LETTER FOR JOB ────────────────────────────
async function generateCoverLetter(job) {
  const userMessage = `
JOB DETAILS:
Title: ${job.title}
Company: ${job.company}
Location: ${job.location}
Language: ${job.language}
Source: ${job.source}

JOB DESCRIPTION:
${(job.description || '').slice(0, 2500)}

REQUIREMENTS:
${(job.requirements || '').slice(0, 500)}

Instructions:
- Language: ${job.language === 'German' ? 'Write in German at A2 level (simple short sentences, basic vocabulary)' : 'Write in English at C1 level (fluent, confident, natural)'}
- Extract company name, job title, and reference number from the JD above
- Hook must be specific to THIS job/company — not generic
- Paragraph 2 must reference something specific from THIS JD
- Sign-off: ${job.language === 'German' ? '"Mit freundlichen Grüßen,"' : '"Best regards,"'}
`;

  try {
    const response = await callClaude(CL_SYSTEM_PROMPT, userMessage);

    // Clean and parse JSON
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in response');
    const data = JSON.parse(jsonMatch[0]);

    // Build HTML
    const html = buildCoverLetterHTML(data, job);

    // Save file
    const outputDir = config.PATHS.pdfs;
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    const filename = `CL_Mitali_${sanitize(job.company)}_${sanitize(job.title)}.html`;
    const filePath = path.join(outputDir, filename);
    fs.writeFileSync(filePath, html);

    return {
      success: true,
      jobId: job.id,
      filename,
      path: filePath,
      language: data.language,
      companyName: data.companyName,
      hook: data.hook
    };

  } catch (e) {
    return { success: false, jobId: job.id, error: e.message };
  }
}

// ── HELPERS ───────────────────────────────────────────────────
function sanitize(str) {
  return (str || 'Unknown').replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30);
}

function escapeHtml(str) {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

module.exports = { generateCoverLetter };
