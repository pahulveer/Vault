const fs = require('fs');
const path = require('path');
const http = require('http');

async function resetViaApi() {
  return new Promise((resolve, reject) => {
    const req = http.request(
      'http://localhost:3001/api/cluster/reset',
      { method: 'POST', timeout: 3000 },
      (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(JSON.parse(body || '{}'));
          } else {
            reject(new Error(`API reset returned status ${res.statusCode}: ${body}`));
          }
        });
      }
    );
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('API reset timeout'));
    });
    req.end();
  });
}

function resetDirectly() {
  const storageDir = path.resolve(__dirname, '../storage');
  if (!fs.existsSync(storageDir)) {
    fs.mkdirSync(storageDir, { recursive: true });
  }

  // 1. Reset metadata
  fs.writeFileSync(path.join(storageDir, 'metadata.json'), '{}', 'utf8');

  // 2. Reset nodes 01-04 and clear extra nodes
  const defaultNodes = ['node-01', 'node-02', 'node-03', 'node-04'];
  const entries = fs.readdirSync(storageDir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory()) {
      const nodePath = path.join(storageDir, entry.name);
      if (defaultNodes.includes(entry.name)) {
        const files = fs.readdirSync(nodePath);
        for (const file of files) {
          if (file.startsWith('obj_')) {
            fs.unlinkSync(path.join(nodePath, file));
          }
        }
      } else if (entry.name.startsWith('node-')) {
        fs.rmSync(nodePath, { recursive: true, force: true });
      }
    }
  }

  for (const node of defaultNodes) {
    const nodePath = path.join(storageDir, node);
    if (!fs.existsSync(nodePath)) {
      fs.mkdirSync(nodePath, { recursive: true });
    }
  }
}

async function main() {
  console.log('[VAULT RESET] Initiating cluster reset...');
  let viaServer = false;
  try {
    const result = await resetViaApi();
    viaServer = true;
    console.log('[VAULT RESET] Live backend responded:', result.message || 'OK');
  } catch (err) {
    console.log('[VAULT RESET] Backend not active or unreachable, executing direct runtime storage reset...');
    resetDirectly();
  }

  console.log(`
==================================================
VAULT CLUSTER RESET COMPLETE
==================================================
Default Nodes: node-01, node-02, node-03, node-04 [ONLINE]
Runtime Storage: Reset to 0 objects
Replication Policy: Default (RF=3, WQ=2, RQ=2)
Reset Mode: ${viaServer ? 'Live API + In-Memory + Filesystem' : 'Direct Storage Reset'}
==================================================
`);
}

main().catch(err => {
  console.error('[VAULT RESET ERROR]', err);
  process.exit(1);
});
