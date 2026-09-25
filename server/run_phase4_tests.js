const fs = require('fs');
const path = require('path');
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
          resolve(data); 
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

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function runPhase4Tests() {
  console.log('--- STARTING PHASE 4 TESTS ---');

  // 1. Setup policy
  await fetchJson(`${API_BASE}/policy`, { 
    method: 'POST', 
    body: JSON.stringify({ replicationFactor: 3, writeQuorum: 2, readQuorum: 2 }), 
    headers: {'Content-Type':'application/json'} 
  });
  console.log('Policy set to RF=3, WQ=2, RQ=2');

  // 2. Upload file without partitions
  console.log('\n--- Test: Normal Upload ---');
  const upload1 = await uploadFile('test-normal.txt', 'normal file content');
  console.log('Upload1 response:', upload1);

  // 3. Create Network Partition between node-01 (coordinator) and node-02
  console.log('\n--- Test: Network Partition ---');
  await fetchJson(`${API_BASE}/network/partition`, {
    method: 'POST',
    body: JSON.stringify({ nodeA: 'node-01', nodeB: 'node-02' }),
    headers: {'Content-Type':'application/json'}
  });
  const partitions = await fetchJson(`${API_BASE}/network`);
  console.log('Current partitions:', partitions);

  // 4. Upload file with partition (should skip node-02 if chosen, but still succeed due to WQ=2)
  console.log('\n--- Test: Upload with Partition ---');
  const upload2 = await uploadFile('test-partition.txt', 'partition file content');
  console.log('Upload2 response:', upload2);

  const metaRes = await fetchJson(`${API_BASE}/objects`);
  const meta2 = metaRes.find(o => o.objectId === upload2.objectId);
  console.log('Upload2 Replicas:', meta2.replicas.map(r => ({ nodeId: r.nodeId, status: r.status })));

  // 5. Heal Network Partition
  console.log('\n--- Test: Heal Partition ---');
  await fetchJson(`${API_BASE}/network/heal`, {
    method: 'POST',
    body: JSON.stringify({ nodeA: 'node-01', nodeB: 'node-02' }),
    headers: {'Content-Type':'application/json'}
  });
  const partitionsAfter = await fetchJson(`${API_BASE}/network`);
  console.log('Partitions after heal:', partitionsAfter);

  // 6. Node Addition & Rebalance
  console.log('\n--- Test: Node Addition & Rebalance ---');
  // First, check how many nodes exist
  const nodesBefore = await fetchJson(`${API_BASE}/nodes`);
  console.log(`Nodes before addition: ${nodesBefore.length}`);

  // Add node-05
  await fetchJson(`${API_BASE}/nodes`, {
    method: 'POST',
    body: JSON.stringify({ nodeId: 'node-05' }),
    headers: {'Content-Type':'application/json'}
  });
  
  const nodesAfter = await fetchJson(`${API_BASE}/nodes`);
  console.log(`Nodes after addition: ${nodesAfter.length}`);

  console.log('Waiting for rebalance tasks to complete (15s max)...');
  
  for (let i = 0; i < 15; i++) {
    await sleep(1000);
    const rebalanceState = await fetchJson(`${API_BASE}/rebalance`);
    if (rebalanceState.completed.length > 0) {
      console.log('Rebalance task completed:', rebalanceState.completed.map(t => ({ taskId: t.taskId, objectId: t.objectId, dest: t.targetNodeId, status: t.status })));
      break;
    }
  }

  // 7. Event Logger output
  console.log('\n--- Test: Event Logger (Rebalance & Partition) ---');
  const events = await fetchJson(`${API_BASE}/events`);
  const relevantEvents = events.filter(e => e.type.includes('NETWORK') || e.type.includes('REBALANCE'));
  console.log(`Found ${relevantEvents.length} relevant events. Sample:`);
  relevantEvents.slice(0, 5).forEach(e => console.log(`[${e.type}] ${e.message}`));

  console.log('\n--- PHASE 4 TESTS COMPLETE ---');
}

runPhase4Tests().catch(console.error);
