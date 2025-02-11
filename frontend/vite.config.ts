import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'
import { publishMovePackage } from './src/tasks/publish'
import { compilePackageTask } from './src/utils/moveUtils'
import { initTemplateCode } from './src/utils/initTemplate'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on mode
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  
  const AI_API_KEY = env.VITE_CHATGPT_API_KEY;
  const APTOS_NODE_URL = env.VITE_APTOS_NODE_URL;
  const APTOS_PRIVATE_KEY = env.VITE_APTOS_PRIVATE_KEY;

  if (!AI_API_KEY) {
    console.warn('Warning: VITE_CHATGPT_API_KEY environment variable is not set');
  }

  if (!APTOS_NODE_URL) {
    console.warn('Warning: VITE_APTOS_NODE_URL environment variable is not set, using default devnet');
  }

  if (!APTOS_PRIVATE_KEY) {
    console.warn('Warning: VITE_APTOS_PRIVATE_KEY environment variable is not set');
  }

  // Initialize template code
  initTemplateCode();

  return {
    base: '/',
    plugins: [
      react(),
      {
        name: 'serve-move-files',
        configureServer(server) {
          // Serve Move files
          server.middlewares.use('/api/code', (req, res, next) => {
            if (req.url === '/meme_coin.move') {
              const filePath = path.resolve(__dirname, '../move/sources/meme_coin.move')
              if (fs.existsSync(filePath)) {
                res.setHeader('Content-Type', 'text/plain')
                fs.createReadStream(filePath).pipe(res)
              } else {
                res.statusCode = 404;
                res.end('Move file not found');
              }
            } else {
              next()
            }
          });

          // Proxy OpenAI requests
          server.middlewares.use('/api/openai', async (req, res) => {
            if (!AI_API_KEY) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: 'OpenAI API key not configured' }));
              return;
            }

            if (req.method === 'POST') {
              try {
                let body = '';
                for await (const chunk of req) {
                  body += chunk;
                }

                const response = await fetch('https://api.openai.com/v1/chat/completions', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${AI_API_KEY}`
                  },
                  body
                });

                res.statusCode = response.status;
                res.setHeader('Content-Type', 'application/json');
                const data = await response.text();
                res.end(data);
              } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                console.error('OpenAI proxy error:', errorMessage);
                res.statusCode = 500;
                res.end(JSON.stringify({ error: 'Failed to proxy OpenAI request: ' + errorMessage }));
              }
            } else {
              res.statusCode = 405;
              res.end('Method not allowed');
            }
          });

          // Handle Move contract compilation
          server.middlewares.use('/api/compile', async (req, res) => {
            if (req.method === 'POST') {
              try {
                let body = '';
                for await (const chunk of req) {
                  body += chunk;
                }
                const { packageName, address } = JSON.parse(body);

                await compilePackageTask({ 
                  namedAddresses: {
                    [packageName]: address
                  },
                  packageName
                });
                
                res.end(JSON.stringify({ 
                  success: true,
                  output: 'Compilation successful'
                }));
              } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                console.error('Compilation error:', errorMessage);
                res.statusCode = 500;
                res.end(JSON.stringify({ 
                  success: false,
                  error: 'Failed to compile Move contract: ' + errorMessage 
                }));
              }
            } else {
              res.statusCode = 405;
              res.end('Method not allowed');
            }
          });

          // Handle Move package publishing
          server.middlewares.use('/api/publish', async (req, res) => {
            if (req.method === 'POST') {
              try {
                let body = '';
                for await (const chunk of req) {
                  body += chunk;
                }
                const { privateKey, nodeUrl, packageName } = JSON.parse(body);
                
                const result = await publishMovePackage({ 
                  privateKey,
                  packageName
                });
                
                if (!result.success) {
                  res.statusCode = 400;
                }
                
                res.end(JSON.stringify(result));
              } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                console.error('Publishing error:', errorMessage);
                res.statusCode = 500;
                res.end(JSON.stringify({ 
                  success: false,
                  error: 'Failed to publish Move package: ' + errorMessage 
                }));
              }
            } else {
              res.statusCode = 405;
              res.end('Method not allowed');
            }
          });
        }
      }
    ],
    // Make env variables available to the client
    define: {
      'process.env.VITE_CHATGPT_API_KEY': JSON.stringify(env.VITE_CHATGPT_API_KEY),
      'process.env.VITE_APTOS_NODE_URL': JSON.stringify(env.VITE_APTOS_NODE_URL),
      // Don't expose private key to the client
      'process.env.VITE_APTOS_PRIVATE_KEY': 'undefined'
    }
  }
})
