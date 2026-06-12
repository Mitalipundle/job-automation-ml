// ============================================================
// PDF_GENERATOR.JS - Generates customized PDF CV per job
// ============================================================

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const config = require('./config');

// ── LOAD MASTER CV TEMPLATE ──────────────────────────────────
function loadMasterCV(language) {
  const file = language === 'german'
    ? config.PATHS.masterGermanCV
    : config.PATHS.masterEnglishCV;
  
  if (!fs.existsSync(file)) {
    throw new Error(`Master CV not found: ${file}`);
  }
  return fs.readFileSync(file, 'utf8');
}

// ── APPLY EDITS TO HTML TEMPLATE ────────────────────────────
function applyEditsToTemplate(html, edits, job) {
  let result = html;

  // ── 1. ABOUT ME ───────────────────────────────────────────
  if (edits.aboutMe && edits.aboutMe.length >= 3) {
    // Replace About Me lines using data attributes
    result = result.replace(
      /(<p class="about-line-1"[^>]*>)([^<]*)(<\/p>)/,
      `$1${escapeHtml(edits.aboutMe[0])}$3`
    );
    result = result.replace(
      /(<p class="about-line-2"[^>]*>)([^<]*)(<\/p>)/,
      `$1${escapeHtml(edits.aboutMe[1])}$3`
    );
    result = result.replace(
      /(<p class="about-line-3"[^>]*>)([^<]*)(<\/p>)/,
      `$1${escapeHtml(edits.aboutMe[2])}$3`
    );
  }

  // ── 2. SKILLS ─────────────────────────────────────────────
  if (edits.skills) {
    if (edits.skills.bi) {
      result = result.replace(
        /(<span class="skill-bi"[^>]*>)([^<]*)(<\/span>)/,
        `$1${escapeHtml(edits.skills.bi)}$3`
      );
    }
    if (edits.skills.data) {
      result = result.replace(
        /(<span class="skill-data"[^>]*>)([^<]*)(<\/span>)/,
        `$1${escapeHtml(edits.skills.data)}$3`
      );
    }
    if (edits.skills.enterprise) {
      result = result.replace(
        /(<span class="skill-enterprise"[^>]*>)([^<]*)(<\/span>)/,
        `$1${escapeHtml(edits.skills.enterprise)}$3`
      );
    }
  }

  // ── 3. PROJECTS ──────────────────────────────────────────
  if (edits.projects && edits.projects.length >= 3) {
    edits.projects.forEach((proj, i) => {
      const n = i + 1;
      result = result.replace(
        new RegExp(`(<span class="proj-name-${n}"[^>]*>)([^<]*)(</span>)`),
        `$1${escapeHtml(proj.name)}$3`
      );
      result = result.replace(
        new RegExp(`(<span class="proj-desc-${n}"[^>]*>)([^<]*)(</span>)`),
        `$1${escapeHtml(proj.description)}$3`
      );
    });
  }

  // ── 4. BULLETS ────────────────────────────────────────────
  if (edits.bullets) {
    ['eversana', 'gslab', 'newscape'].forEach(company => {
      if (edits.bullets[company]) {
        edits.bullets[company].forEach((bullet, i) => {
          const n = i + 1;
          result = result.replace(
            new RegExp(`(<span class="${company}-bullet-${n}"[^>]*>)([^<]*)(</span>)`),
            `$1${escapeHtml(bullet)}$3`
          );
        });
      }
    });
  }

  // ── 5. ATS HIDDEN KEYWORDS (invisible to human, visible to ATS) ──
  if (edits.atsKeywords && edits.atsKeywords.length > 0) {
    const hiddenKeywords = `<div style="position:absolute;left:-9999px;font-size:1px;color:white;">${edits.atsKeywords.join(' ')}</div>`;
    result = result.replace('</body>', `${hiddenKeywords}</body>`);
  }

  // ── 6. INJECT JOB META ───────────────────────────────────
  result = result.replace(
    '<title>Mitali Pundle CV</title>',
    `<title>Mitali_Pundle_${sanitizeFilename(job.title)}_${sanitizeFilename(job.company)}</title>`
  );

  return result;
}

// ── GENERATE PDF FROM HTML ───────────────────────────────────
async function generatePDF(htmlContent, outputPath) {
  // Save HTML temp file
  const tempHtml = outputPath.replace('.pdf', '_temp.html');
  fs.writeFileSync(tempHtml, htmlContent);

  try {
    // Try Chrome/Chromium headless (best quality)
    const chromePaths = [
      'google-chrome', 'chromium', 'chromium-browser',
      '/usr/bin/google-chrome', '/usr/bin/chromium'
    ];

    let generated = false;
    for (const chrome of chromePaths) {
      try {
        execSync(
          `${chrome} --headless --no-sandbox --disable-gpu ` +
          `--print-to-pdf="${outputPath}" ` +
          `--print-to-pdf-no-header ` +
          `"file://${path.resolve(tempHtml)}"`,
          { timeout: 30000, stdio: 'pipe' }
        );
        generated = true;
        break;
      } catch (e) {
        continue;
      }
    }

    if (!generated) {
      // Fallback: save as HTML (user can print to PDF manually)
      const htmlOutput = outputPath.replace('.pdf', '.html');
      fs.copyFileSync(tempHtml, htmlOutput);
      console.log(`    ℹ️  Chrome not found — saved as HTML: ${path.basename(htmlOutput)}`);
      fs.unlinkSync(tempHtml);
      return { success: true, path: htmlOutput, format: 'html' };
    }

  } catch (e) {
    // Final fallback: save as HTML
    const htmlOutput = outputPath.replace('.pdf', '.html');
    fs.copyFileSync(tempHtml, htmlOutput);
    fs.unlinkSync(tempHtml);
    return { success: true, path: htmlOutput, format: 'html' };
  }

  // Clean up temp file
  if (fs.existsSync(tempHtml)) fs.unlinkSync(tempHtml);
  return { success: true, path: outputPath, format: 'pdf' };
}

// ── MAIN: GENERATE CV FOR JOB ────────────────────────────────
async function generateCVForJob(job, edits) {
  try {
    // Ensure output directory exists
    if (!fs.existsSync(config.PATHS.pdfs)) {
      fs.mkdirSync(config.PATHS.pdfs, { recursive: true });
    }

    // Load master template
    const masterHTML = loadMasterCV(edits.language || 'english');

    // Apply edits
    const customHTML = applyEditsToTemplate(masterHTML, edits, job);

    // Generate filename
    const filename = `CV_Mitali_${sanitizeFilename(job.company)}_${sanitizeFilename(job.title)}.pdf`;
    const outputPath = path.join(config.PATHS.pdfs, filename);

    // Generate PDF (or HTML fallback)
    const result = await generatePDF(customHTML, outputPath);

    return {
      success: true,
      jobId: job.id,
      filename,
      path: result.path,
      format: result.format,
      atsScore: edits.atsScore || 0,
      language: edits.language || 'english'
    };

  } catch (e) {
    return { success: false, jobId: job.id, error: e.message };
  }
}

// ── HELPERS ───────────────────────────────────────────────────
function sanitizeFilename(str) {
  return (str || 'Unknown')
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .replace(/\s+/g, '_')
    .slice(0, 30);
}

function escapeHtml(str) {
  return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

module.exports = { generateCVForJob };
