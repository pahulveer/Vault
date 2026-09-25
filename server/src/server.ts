import express from 'express';
import cors from 'cors';
import path from 'path';
import { nodeManager } from './nodes/NodeManager';
import { metadataManager } from './metadata/MetadataManager';
import { apiRouter } from './routes/api';
import { rebalanceEngine } from './rebalance/RebalanceEngine';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api', apiRouter);
const clientDist = path.resolve(__dirname, '../../client/dist');

app.use(express.static(clientDist));

app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api')) {
    res.sendFile(path.join(clientDist, 'index.html'));
    return;
  }
  next();
});

async function bootstrap() {
  try {
    await metadataManager.init();
    await nodeManager.init();
    rebalanceEngine.startBackgroundRebalancing();
    
    app.listen(PORT, () => {
      console.log(`Vault server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

bootstrap();
