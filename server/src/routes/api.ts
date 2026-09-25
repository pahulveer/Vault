import fs from 'fs/promises';
import path from 'path';
import { Router, Request, Response } from 'express';
import multer from 'multer';
import { nodeManager } from '../nodes/NodeManager';
import { metadataManager } from '../metadata/MetadataManager';
import { objectService } from '../objects/ObjectService';
import { eventLogger } from '../events/EventLogger';
import { integrityService } from '../integrity/IntegrityService';
import { repairService } from '../repair/RepairService';
import { networkManager } from '../network/NetworkManager';
import { rebalanceEngine } from '../rebalance/RebalanceEngine';
import { defaultPolicy } from '../nodes/PlacementEngine';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

router.get('/nodes', (req, res) => {
  const nodes = nodeManager.getAllNodes().map(n => n.getStats());
  res.json(nodes);
});

router.post('/nodes', async (req: Request, res: Response): Promise<void> => {
  const { nodeId } = req.body;
  if (!nodeId) {
    res.status(400).json({ error: 'Missing nodeId' });
    return;
  }
  try {
    const node = await nodeManager.addNode(nodeId);
    rebalanceEngine.scanAndRebalance(); // Trigger rebalance on node addition
    res.status(201).json({ message: `Node ${nodeId} added`, status: node.status });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/network/partition', (req: Request, res: Response): void => {
  const { nodeA, nodeB } = req.body;
  if (!nodeA || !nodeB) {
    res.status(400).json({ error: 'Missing nodeA or nodeB' });
    return;
  }
  networkManager.partition(nodeA, nodeB);
  res.json({ message: `Partition created between ${nodeA} and ${nodeB}` });
});

router.post('/network/heal', async (req: Request, res: Response): Promise<void> => {
  const { nodeA, nodeB } = req.body;
  if (!nodeA || !nodeB) {
    res.status(400).json({ error: 'Missing nodeA or nodeB' });
    return;
  }
  networkManager.heal(nodeA, nodeB);
  
  // Reconciliation: queue scan
  repairService.scanAndQueue();
  
  res.json({ message: `Partition healed between ${nodeA} and ${nodeB}` });
});

router.get('/network', (req: Request, res: Response) => {
  res.json(networkManager.getPartitions());
});

router.get('/rebalance', (req, res) => {
  res.json(rebalanceEngine.getTasks());
});

router.get('/metrics/rebalance', (req, res) => {
  res.json(rebalanceEngine.getMetrics());
});

router.post('/rebalance/scan', async (req, res) => {
  await rebalanceEngine.scanAndRebalance();
  res.json({ message: 'Rebalance scan triggered' });
});

router.post('/nodes/:nodeId/fail', async (req: Request, res: Response): Promise<void> => {
  const nodeId = req.params.nodeId as string;
  const node = nodeManager.getNode(nodeId);
  if (!node) {
    res.status(404).json({ error: 'Node not found' });
    return;
  }
  await nodeManager.failNode(nodeId, 'Manual API failure');
  res.json({ message: `Node ${nodeId} failed`, status: node.status });
});

router.post('/nodes/:nodeId/recover', async (req: Request, res: Response): Promise<void> => {
  const nodeId = req.params.nodeId as string;
  const node = nodeManager.getNode(nodeId);
  if (!node) {
    res.status(404).json({ error: 'Node not found' });
    return;
  }
  await nodeManager.recoverNode(nodeId);
  res.json({ message: `Node ${nodeId} recovered`, status: node.status });
});

router.get('/repairs', (req, res) => {
  const data = repairService.getRepairs();
  const tasks = [
    ...data.active,
    ...data.completed,
    ...data.failed
  ].map(t => ({
    taskId: t.repairId,
    objectId: t.objectId,
    targetNodeId: t.destinationNodeId || 'unknown',
    status: t.status === 'QUEUED' ? 'PENDING' : t.status,
    priority: 0
  }));

  const queued = data.queued.map(q => ({
    taskId: `queue_${q.objectId}`,
    objectId: q.objectId,
    targetNodeId: 'unknown',
    status: 'PENDING',
    priority: q.priority
  }));

  res.json([...tasks, ...queued]);
});

router.get('/metrics/recovery', (req, res) => {
  res.json(repairService.getMetrics());
});

router.get('/objects', async (req, res) => {
  try {
    const objects = await metadataManager.listObjects();
    res.json(objects);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to list objects', message: error.message });
  }
});

router.post('/objects', upload.single('file'), async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file provided' });
      return;
    }

    const metadata = await objectService.storeObject(req.file.originalname, req.file.buffer);
    
    res.status(201).json({
      objectId: metadata.objectId,
      filename: metadata.filename,
      size: metadata.size,
      checksum: metadata.checksum,
      nodeId: nodeManager.getPrimaryNode().nodeId,
      status: metadata.status
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to store object', message: error.message });
  }
});

router.get('/objects/:objectId', async (req: Request, res: Response): Promise<void> => {
  try {
    const objectId = req.params.objectId as string;
    const { data, metadata } = await objectService.getObject(objectId);
    
    eventLogger.log('OBJECT_DOWNLOADED', `Object ${objectId} downloaded`, objectId);
    
    res.setHeader('Content-Disposition', `attachment; filename="${metadata.filename}"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.send(data);
  } catch (error: any) {
    if (error.message.includes('not found')) {
      res.status(404).json({ error: 'Object not found', message: error.message });
    } else {
      res.status(500).json({ error: 'Failed to retrieve object', message: error.message });
    }
  }
});

router.get('/policy', (req, res) => {
  res.json(objectService.getPolicy());
});

router.post('/policy', (req: Request, res: Response): void => {
  const current = objectService.getPolicy();
  let replicationFactor = req.body.replicationFactor !== undefined ? Number(req.body.replicationFactor) : current.replicationFactor;
  let writeQuorum = req.body.writeQuorum !== undefined ? Number(req.body.writeQuorum) : current.writeQuorum;
  let readQuorum = req.body.readQuorum !== undefined ? Number(req.body.readQuorum) : current.readQuorum;

  const nodesCount = nodeManager.getAllNodes().length;
  
  if (isNaN(replicationFactor) || replicationFactor < 1) {
    res.status(400).json({ error: 'Invalid replicationFactor' });
    return;
  }
  if (isNaN(writeQuorum) || writeQuorum < 1) {
    res.status(400).json({ error: 'Invalid writeQuorum' });
    return;
  }
  if (isNaN(readQuorum) || readQuorum < 1) {
    res.status(400).json({ error: 'Invalid readQuorum' });
    return;
  }
  if (writeQuorum > replicationFactor) {
    res.status(400).json({ error: 'writeQuorum cannot exceed replicationFactor' });
    return;
  }
  if (readQuorum > replicationFactor) {
    res.status(400).json({ error: 'readQuorum cannot exceed replicationFactor' });
    return;
  }
  if (replicationFactor > nodesCount) {
    res.status(400).json({ error: 'replicationFactor cannot exceed available nodes' });
    return;
  }
  
  objectService.setPolicy({ replicationFactor, writeQuorum, readQuorum });
  res.json({ message: 'Policy updated successfully', policy: objectService.getPolicy() });
});

router.get('/metrics/storage', async (req, res) => {
  const objects = await metadataManager.listObjects();
  let logicalStorage = 0;

  for (const obj of objects) {
    logicalStorage += obj.size;
  }

  const nodes = nodeManager.getAllNodes();
  let totalCapacity = 0;
  let usedCapacity = 0;
  for (const node of nodes) {
    totalCapacity += node.capacity;
    usedCapacity += node.usedSpace;
  }

  // Physical storage is the actual bytes on disk across all nodes
  const physicalStorage = usedCapacity;
  const replicationOverhead = logicalStorage > 0 ? parseFloat((physicalStorage / logicalStorage).toFixed(2)) : 1.0;
  const availableCapacity = Math.max(0, totalCapacity - usedCapacity);
  const totalObjects = objects.length;
  
  res.json({
    logicalStorage,
    physicalStorage,
    replicationOverhead,
    totalCapacity,
    usedCapacity,
    availableCapacity,
    totalObjects
  });
});

router.get('/events', (req, res) => {
  res.json(eventLogger.getRecentEvents(100));
});

router.get('/objects/:objectId/replicas', async (req: Request, res: Response): Promise<void> => {
  try {
    const objectId = req.params.objectId as string;
    const metadata = await metadataManager.getMetadata(objectId);
    if (!metadata) {
      res.status(404).json({ error: 'Object not found' });
      return;
    }
    res.json(metadata.replicas);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to retrieve replicas' });
  }
});

router.post('/integrity/scan', async (req, res) => {
  try {
    eventLogger.log('INTEGRITY_SCAN_STARTED', 'Started integrity scan across all objects');
    const objects = await metadataManager.listObjects();
    let totalReplicas = 0;
    let healthyReplicas = 0;
    let corruptedReplicas = 0;
    let missingReplicas = 0;
    let staleReplicas = 0;
    
    for (const obj of objects) {
      let objUpdated = false;
      // In case phase 1 objects don't have replicas array
      if (!obj.replicas) {
         obj.replicas = [];
         objUpdated = true;
      }

      for (const replica of obj.replicas) {
        const status = await integrityService.verifyReplica(replica.nodeId, obj.objectId, obj.checksum);
        totalReplicas++;
        if (status !== replica.status) {
          replica.status = status;
          replica.lastVerified = new Date().toISOString();
          objUpdated = true;
        } else {
          replica.lastVerified = new Date().toISOString();
          objUpdated = true;
        }
        
        if (replica.status === 'HEALTHY') healthyReplicas++;
        else if (replica.status === 'CORRUPTED') corruptedReplicas++;
        else if (replica.status === 'MISSING') missingReplicas++;
        else if (replica.status === 'STALE') staleReplicas++;
      }
      
      const healthyCount = obj.replicas.filter(r => r.status === 'HEALTHY').length;
      let newStatus: 'HEALTHY' | 'DEGRADED' | 'UNAVAILABLE' = obj.status as any;
      if (healthyCount >= objectService.getPolicy().replicationFactor) {
        newStatus = 'HEALTHY';
      } else if (healthyCount > 0) {
        newStatus = 'DEGRADED';
      } else {
        newStatus = 'UNAVAILABLE';
      }
      
      let priority = 0;
      if (corruptedReplicas > 0) priority = 2;
      else if (newStatus === 'UNAVAILABLE') priority = 2;
      else if (newStatus === 'DEGRADED') priority = 1;
      
      if (newStatus !== obj.status) {
        obj.status = newStatus;
        objUpdated = true;
      }
      
      if (priority > 0) {
        await repairService.enqueueRepair(obj.objectId, priority);
      }
      
      if (objUpdated) {
        await metadataManager.updateMetadata(obj.objectId, { replicas: obj.replicas, status: obj.status });
      }
    }
    
    eventLogger.log('INTEGRITY_SCAN_COMPLETED', `Scan completed. Total: ${totalReplicas}, Healthy: ${healthyReplicas}, Corrupted: ${corruptedReplicas}, Missing: ${missingReplicas}`);
    
    res.json({ totalReplicas, healthyReplicas, corruptedReplicas, missingReplicas, staleReplicas });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to scan integrity', message: error.message });
  }
});

router.post('/cluster/reset', async (req: Request, res: Response): Promise<void> => {
  try {
    repairService.reset();
    rebalanceEngine.reset();
    networkManager.reset();
    objectService.setPolicy(defaultPolicy);
    eventLogger.clear();

    const storageRoot = path.join(__dirname, '../../../storage');
    try {
      const entries = await fs.readdir(storageRoot, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(storageRoot, entry.name);
        if (entry.isDirectory()) {
          if (['node-01', 'node-02', 'node-03', 'node-04'].includes(entry.name)) {
            const files = await fs.readdir(fullPath);
            for (const file of files) {
              if (file.startsWith('obj_')) {
                await fs.unlink(path.join(fullPath, file));
              }
            }
          } else {
            await fs.rm(fullPath, { recursive: true, force: true });
          }
        }
      }
    } catch (e) {
      console.warn('Storage cleanup notice:', e);
    }

    await metadataManager.reset();
    await nodeManager.reset();

    eventLogger.log('CLUSTER_RESET', 'Vault cluster reset to default initial state (4 online nodes, clean storage)');

    res.json({
      message: 'Vault cluster reset successful',
      nodes: nodeManager.getAllNodes().map(n => n.getStats())
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to reset cluster', message: error.message });
  }
});

export { router as apiRouter };
