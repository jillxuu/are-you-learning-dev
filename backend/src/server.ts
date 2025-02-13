import express, { Request, Response, NextFunction } from "express";
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { compilePackageTask, publishMovePackage } from './utils/moveUtils';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Validate environment variables
const AI_API_KEY = process.env.OPENAI_API_KEY;
const APTOS_NODE_URL = process.env.APTOS_NODE_URL;

if (!AI_API_KEY) {
  console.warn('Warning: OPENAI_API_KEY environment variable is not set');
}

if (!APTOS_NODE_URL) {
  console.warn('Warning: APTOS_NODE_URL environment variable is not set, using default devnet');
}

// Type definitions for request handlers
type AsyncRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<void>;

// Wrapper for async handlers
const asyncHandler = (fn: AsyncRequestHandler) => (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  return Promise.resolve(fn(req, res, next)).catch(next);
};

// API Routes
// 1. Serve Move files
app.get('/api/code/:filename', (req: Request, res: Response) => {
  const { filename } = req.params;
  const filePath = path.resolve(__dirname, `../../move/sources/${filename}.move`);
  if (fs.existsSync(filePath)) {
    res.setHeader('Content-Type', 'text/plain');
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.status(404).send('Move file not found');
  }
});

// 2. OpenAI Proxy
app.post('/api/openai', asyncHandler(async (req: Request, res: Response) => {
  if (!AI_API_KEY) {
    res.status(500).json({ error: 'OpenAI API key not configured' });
    return;
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${AI_API_KEY}`
    },
    body: JSON.stringify(req.body)
  });

  const data = await response.text();
  res.status(response.status).json(JSON.parse(data));
}));

// 3. Move Contract Compilation
app.post('/api/compile', asyncHandler(async (req: Request, res: Response) => {
  const { packageName, address } = req.body;

  await compilePackageTask({
    namedAddresses: {
      [packageName]: address
    },
    packageName
  });

  res.json({
    success: true,
    output: 'Compilation successful'
  });
}));

// 4. Move Package Publishing
app.post('/api/publish', asyncHandler(async (req: Request, res: Response) => {
  const { privateKey, packageName } = req.body;

  const result = await publishMovePackage({
    privateKey,
    packageName
  });

  if (!result.success) {
    res.status(400);
  }

  res.json(result);
}));

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);
  const errorMessage = err instanceof Error ? err.message : 'Unknown error';
  res.status(500).json({
    success: false,
    error: errorMessage
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});