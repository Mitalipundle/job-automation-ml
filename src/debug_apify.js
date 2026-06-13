// ============================================================
// DEBUG_APIFY.JS - Test paid Apify actors with logging
// ============================================================

const https = require('https');
const config = require('./config');

async function runApifyActor(actorId, input, timeoutSecs = 300) {
  return new Promise((resolve, reject) => {
    console.log(`\n🔍 Testing actor: ${actorId}`);
    console.log(`⏱  Timeout: ${timeoutSecs}s`);
    console.log(`📦 Input:`, JSON.stringify(input, null, 2));

    const body = JSON.stringify(input);
    const startTime = Date.now();

    const options = {
      hostname: 'api.apify.com',
      path: `/v2/acts/${actorId}/run-sync-get-dataset-items?token=${config.APIFY_API_KEY}&timeout=${timeoutSecs}&memory=512`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    };

    console.log(`🌐 Calling: ${options.hostname}${options.path.split('?')[0]}...`);

    const req = https.request(options, (res) => {
      console.log(`📡 Response status: ${res.statusCode}`);
      let data = '';
      res.on('data', chunk => {
        data += chunk;
        console.log(`📥 Received ${chunk.length} bytes...`);
      });

      res.on('end', () => {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`✅ Complete in ${elapsed}s`);

        try {
          const parsed = JSON.parse(data);
          console.log(`📊 Parsed response type:`, typeof parsed);
          console.log(`📊 Is array:`, Array.isArray(parsed));
          
          if (Array.isArray(parsed)) {
            console.log(`✓ Got ${parsed.length} items`);
            if (parsed.length > 0) {
              console.log(`📄 First item:`, JSON.stringify(parsed[0]).slice(0, 200));
            }
          } else if (parsed.items) {
            console.log(`✓ Got ${parsed.items.length} items`);
          } else if (parsed.error) {
            console.log(`❌ API Error:`, parsed.error);
          } else {
            console.log(`⚠️  Unexpected response:`, Object.keys(parsed));
          }

          resolve(parsed);
        } catch (e) {
          console.log(`❌ JSON parse error: ${e.message}`);
          console.log(`Raw response (first 300 chars):`, data.slice(0, 300));
          resolve(null);
        }
      });
    });

    req.on('error', (e) => {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`❌ Request error after ${elapsed}s: ${e.message}`);
      reject(e);
    });

    req.setTimeout((timeoutSecs + 30) * 1000, () => {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`⏰ TIMEOUT after ${elapsed}s`);
      req.destroy();
      reject(new Error(`Timeout after ${timeoutSecs}s`));
    });

    req.write(body);
    req.end();
  });
}

async function testLinkedIn() {
  console.log('\n' + '═'.repeat(60));
  console.log('TEST 1: LinkedIn');
  console.log('═'.repeat(60));

  try {
    const result = await runApifyActor('crawlworks/linkedin-jobs-scraper', {
      searchUrls: [{ url: 'https://www.linkedin.com/jobs/search/?keywords=Werkstudent%20Data&location=Germany&f_JT=PT&f_TPR=r604800' }],
      jobsToFetch: 5,
      enrichCompanyDetails: false
    }, 120);

    if (result && Array.isArray(result) && result.length > 0) {
      console.log(`\n✅ SUCCESS! Got ${result.length} jobs`);
    } else {
      console.log(`\n⚠️  No results`);
    }
  } catch (e) {
    console.log(`\n❌ FAILED: ${e.message}`);
  }
}

async function testStepstone() {
  console.log('\n' + '═'.repeat(60));
  console.log('TEST 2: Stepstone');
  console.log('═'.repeat(60));

  try {
    const result = await runApifyActor('blackfalcondata/stepstone-de-scraper', {
      query: 'Data Analytics',
      contractType: 'WORKING_STUDENT',
      age: 14,
      maxResults: 5,
      includeDetails: false,
      compact: true
    }, 120);

    if (result && Array.isArray(result) && result.length > 0) {
      console.log(`\n✅ SUCCESS! Got ${result.length} jobs`);
    } else {
      console.log(`\n⚠️  No results`);
    }
  } catch (e) {
    console.log(`\n❌ FAILED: ${e.message}`);
  }
}

async function testArbeitsagentur() {
  console.log('\n' + '═'.repeat(60));
  console.log('TEST 3: Arbeitsagentur');
  console.log('═'.repeat(60));

  try {
    const result = await runApifyActor('plowdata/arbeitsagentur-job-scraper', {
      jobType: 'work',
      query: 'Werkstudent Data',
      location: 'Deutschland',
      maxResults: 5
    }, 120);

    if (result && Array.isArray(result) && result.length > 0) {
      console.log(`\n✅ SUCCESS! Got ${result.length} jobs`);
    } else {
      console.log(`\n⚠️  No results`);
    }
  } catch (e) {
    console.log(`\n❌ FAILED: ${e.message}`);
  }
}

async function runAllTests() {
  console.log('\n🚀 APIFY ACTOR DEBUG TEST');
  console.log(`API Key: ${config.APIFY_API_KEY.slice(0, 20)}...`);

  await testLinkedIn();
  await new Promise(r => setTimeout(r, 2000));

  await testStepstone();
  await new Promise(r => setTimeout(r, 2000));

  await testArbeitsagentur();

  console.log('\n' + '═'.repeat(60));
  console.log('✅ ALL TESTS COMPLETE');
  console.log('═'.repeat(60));
}

runAllTests().catch(e => {
  console.error('\n❌ FATAL ERROR:', e.message);
  process.exit(1);
});