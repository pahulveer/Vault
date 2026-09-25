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
        return;
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

async function testQuorum() {
  console.log('Testing Write Quorum by disabling a node directory...');
  // Force node-02 to fail by making its directory unwritable
  const node2Dir = path.join(__dirname, 'storage', 'node-02');
  fs.chmodSync(node2Dir, 0o444); // Read-only

  try {
    const uploadRes = await uploadFile('quorum-test.txt', 'quorum test data');
    console.log('Upload Result:', uploadRes);
    
    const metaRes = await fetchJson(`${API_BASE}/objects`);
    const meta = metaRes.find(o => o.objectId === uploadRes.objectId);
    console.log('Object status:', meta.status);
    console.log('Replicas:', meta.replicas);
  } catch (e) {
    console.log('Upload failed:', e.message);
  } finally {
    fs.chmodSync(node2Dir, 0o777); // Restore permissions
  }
}

testQuorum();
