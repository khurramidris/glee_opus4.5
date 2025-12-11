import { spawn } from 'child_process';
import { createServer } from 'net';

async function findAvailablePort(startPort) {
  const isPortAvailable = (port) => {
    return new Promise((resolve) => {
      const server = createServer();
      server.listen(port, '127.0.0.1');
      server.on('listening', () => {
        server.close();
        resolve(true);
      });
      server.on('error', () => {
        resolve(false);
      });
    });
  };

  let port = startPort;
  while (!(await isPortAvailable(port))) {
    port++;
    if (port > startPort + 100) {
      throw new Error('Could not find available port');
    }
  }
  return port;
}

async function main() {
  const port = await findAvailablePort(1421);
  console.log(`Starting Vite on port ${port}`);

  const env = {
    ...process.env,
    TAURI_DEV_URL: `http://localhost:${port}`,
  };

  const vite = spawn('npx', ['vite', '--port', port.toString()], {
    stdio: 'inherit',
    shell: true,
    env,
  });

  vite.on('error', (err) => {
    console.error('Failed to start Vite:', err);
    process.exit(1);
  });

  process.on('SIGINT', () => {
    vite.kill('SIGINT');
  });
}

main();
