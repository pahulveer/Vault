const fs = require('fs');
const crypto = require('crypto');

async function runPersistenceTest() {
  console.log('--- RUNNING HACKATHON PERSISTENCE TEST ---');
  
  try {
    const objectId = fs.readFileSync('.test-objectId', 'utf8').trim();
    const originalChecksum = 'sha256:' + crypto.createHash('sha256').update(fs.readFileSync('testfile.txt')).digest('hex');

    // 1. Check if metadata exists in /objects
    const objectsRes = await fetch('http://localhost:3001/api/objects');
    const objects = await objectsRes.json();
    
    const objMetadata = objects.find(o => o.objectId === objectId);
    if (!objMetadata) {
      console.error(`Metadata for ${objectId} NOT FOUND after restart!`);
      process.exit(1);
    }
    console.log(`Metadata persisted correctly: ${objMetadata.filename}`);

    // 2. Download and verify checksum
    const downloadRes = await fetch(`http://localhost:3001/api/objects/${objectId}`);
    const downloadedText = await downloadRes.text();
    const downloadedChecksum = 'sha256:' + crypto.createHash('sha256').update(downloadedText).digest('hex');
    
    if (downloadedChecksum !== originalChecksum) {
      console.error('CHECKSUM MISMATCH on download after restart!');
      process.exit(1);
    }

    console.log(`Downloaded object ${objectId} successfully after restart.`);
    console.log('PERSISTENCE TESTS PASSED SUCCESSFULLY');

  } catch (err) {
    console.error('Test failed:', err);
    process.exit(1);
  }
}

runPersistenceTest();
