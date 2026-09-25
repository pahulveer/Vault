const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const http = require('http');
const FormData = require('form-data');

const API_BASE = 'http://localhost:3001/api';

async function fetchJson(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          if (res.statusCode >= 400) {
            reject(new Error(`HTTP ${res.statusCode}: ${data}`));
          } else {
            resolve(JSON.parse(data));
          }
        } catch (e) {
          resolve(data); // If not JSON
        }
      });
    });
    req.on('error', reject);
    if (options.body) {
      if (options.body.pipe) {
        options.body.pipe(req);
        return; // pipe handles end()
      } else {
        req.write(options.body);
      }
    }
    req.end();
  });
}

async function uploadFile(filename, content) {
  const form = new FormData();
  form.append('file', Buffer.from(content), filename);
  
  return fetchJson(`${API_BASE}/objects`, {
    method: 'POST',
    headers: form.getHeaders(),
    body: form
  });
}

async function runAudit() {
  console.log('--- STARTING AUDIT ---');
  
  // 1. REPLICATION
  console.log('\\nTesting Replication...');
  const uploadRes = await uploadFile('audit-test.txt', 'audit content 123');
  console.log('Upload Response:', uploadRes);
  const objId = uploadRes.objectId;
  
  // Check physical files
  const storageDir = path.join(__dirname, 'storage');
  const nodes = ['node-01', 'node-02', 'node-03', 'node-04'];
  let replicaCount = 0;
  let replicaPaths = [];
  for (const node of nodes) {
    const objPath = path.join(storageDir, node, objId);
    if (fs.existsSync(objPath)) {
      replicaCount++;
      replicaPaths.push(objPath);
    }
  }
  console.log(`Found ${replicaCount} physical copies.`);
  
  // Check metadata
  const metaRes = await fetchJson(`${API_BASE}/objects`);
  const meta = metaRes.find(o => o.objectId === objId);
  console.log('Object Metadata replicas:', meta.replicas?.map(r => r.nodeId));
  console.log('Object Metadata contains replicationFactor?', 'replicationFactor' in meta);

  // 2. REPLICATION POLICY
  console.log('\\nTesting Policy API...');
  try {
    const policy = await fetchJson(`${API_BASE}/policy`);
    console.log('GET /policy:', policy);
  } catch (e) {
    console.log('GET /policy error:', e.message);
  }
  
  try {
    await fetchJson(`${API_BASE}/policy`, { method: 'POST', body: JSON.stringify({ replicationFactor: 2 }), headers: {'Content-Type':'application/json'} });
    console.log('POST /policy succeeded');
    // Restore default policy
    await fetchJson(`${API_BASE}/policy`, { method: 'POST', body: JSON.stringify({ replicationFactor: 3, writeQuorum: 2, readQuorum: 2 }), headers: {'Content-Type':'application/json'} });
  } catch (e) {
    console.log('POST /policy error:', e.message);
  }

  // 7. CORRUPTION TEST
  console.log('\\nTesting Corruption & Integrity Scan...');
  if (replicaPaths.length > 0) {
    console.log(`Corrupting file: ${replicaPaths[0]}`);
    fs.writeFileSync(replicaPaths[0], 'corrupted data');
  }
  
  try {
    const scanRes = await fetchJson(`${API_BASE}/integrity/scan`, { method: 'POST' });
    console.log('Scan result:', scanRes);
  } catch (e) {
    console.log('Scan error:', e.message);
  }
  
  const metaAfterScan = (await fetchJson(`${API_BASE}/objects`)).find(o => o.objectId === objId);
  console.log('Object status after scan:', metaAfterScan.status);
  console.log('Replicas after scan:', metaAfterScan.replicas);

  // 8. DOWNLOAD AFTER CORRUPTION
  console.log('\\nTesting Download...');
  try {
    const data = await fetchJson(`${API_BASE}/objects/${objId}`);
    console.log('Download succeeded, data length:', data.length);
  } catch (e) {
    console.log('Download error:', e.message);
  }

  // 10. STORAGE ACCOUNTING
  console.log('\\nTesting Storage Accounting...');
  try {
    const metrics = await fetchJson(`${API_BASE}/metrics/storage`);
    console.log('Metrics:', metrics);
  } catch (e) {
    console.log('Metrics error:', e.message);
  }

  // 11. NODE STATISTICS
  console.log('\\nTesting Node Statistics...');
  try {
    const nodeStats = await fetchJson(`${API_BASE}/nodes`);
    console.log('Node Stats keys:', Object.keys(nodeStats[0]));
  } catch (e) {
    console.log('Node Stats error:', e.message);
  }

  console.log('\\n--- AUDIT COMPLETE ---');
}

runAudit().catch(console.error);
