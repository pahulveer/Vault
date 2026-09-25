const fs = require('fs');
const crypto = require('crypto');

async function runTests() {
  console.log('--- RUNNING HACKATHON TESTS ---');
  
  // Create a test file
  const testData = 'Hello Vault! ' + Date.now();
  fs.writeFileSync('testfile.txt', testData);
  const originalChecksum = 'sha256:' + crypto.createHash('sha256').update(testData).digest('hex');
  console.log(`Created testfile.txt, checksum: ${originalChecksum}`);

  try {
    // 1. Check health
    const healthRes = await fetch('http://localhost:3001/api/health');
    const health = await healthRes.json();
    console.log('Health:', health);

    // 2. Check nodes
    const nodesRes = await fetch('http://localhost:3001/api/nodes');
    const nodes = await nodesRes.json();
    console.log(`Nodes ONLINE: ${nodes.filter(n => n.status === 'ONLINE').length}`);

    // 3. Upload file
    const formData = new FormData();
    formData.append('file', new Blob([testData], { type: 'text/plain' }), 'testfile.txt');
    const uploadRes = await fetch('http://localhost:3001/api/objects', {
      method: 'POST',
      body: formData
    });
    const uploadResult = await uploadRes.json();
    console.log('Upload Result:', uploadResult);

    if (uploadResult.checksum !== originalChecksum) {
      console.error('CHECKSUM MISMATCH on upload!');
      process.exit(1);
    }

    // 4. Download file
    const objectId = uploadResult.objectId;
    const downloadRes = await fetch(`http://localhost:3001/api/objects/${objectId}`);
    const downloadedText = await downloadRes.text();
    const downloadedChecksum = 'sha256:' + crypto.createHash('sha256').update(downloadedText).digest('hex');
    
    console.log(`Downloaded object ${objectId}`);
    console.log(`Downloaded checksum: ${downloadedChecksum}`);

    if (downloadedChecksum !== originalChecksum) {
      console.error('CHECKSUM MISMATCH on download!');
      process.exit(1);
    }

    // 5. Events
    const eventsRes = await fetch('http://localhost:3001/api/events');
    const events = await eventsRes.json();
    const hasUploadEvent = events.some(e => e.type === 'OBJECT_UPLOADED' && e.objectId === objectId);
    console.log(`Generated upload event: ${hasUploadEvent}`);

    console.log('ALL TESTS PASSED SUCCESSFULLY');
    fs.writeFileSync('.test-objectId', objectId);

  } catch (err) {
    console.error('Test failed:', err);
    process.exit(1);
  }
}

runTests();
