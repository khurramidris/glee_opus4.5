import { spawn, execSync } from 'child_process';
import { readFileSync, existsSync, unlinkSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'net';

const __dirname = dirname(fileURLToPath(import.meta.url));
const portFile = resolve(__dirname, '..', '.vite-port');
const tauriConfigPath = resolve(__dirname, '..', 'src-tauri', 'tauri.conf.json');

function findAvailablePort(startPort) {
  return new Promise((resolvePromise) => {
    const server = createServer();
    server.listen(startPort, '127.0.0.1');
    server.on('listening', () => {
      server.close();
      resolvePromise(startPort);
    });
    server.on('error', () => {
      resolvePromise(findAvailablePort(startPort + 1));
    });
  });
}

async function waitForPortFile(timeout = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (existsSync(portFile)) {
      const port = readFileSync(portFile, 'utf-8').trim();
      if (port) return parseInt(port, 10);
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error('Timeout waiting for Vite to start');
}

function updateTauriConfig(port) {
  const config = JSON.parse(readFileSync(tauriConfigPath, 'utf-8'));
  const originalDevUrl = config.build.devUrl;
  config.build.devUrl = `http://localhost:${port}`;
  config.build.beforeDevCommand = '';
  writeFileSync(tauriConfigPath, JSON.stringify(config, null, 2));
  return originalDevUrl;
}

function restoreTauriConfig(originalDevUrl) {
  const config = JSON.parse(readFileSync(tauriConfigPath, 'utf-8'));
  config.build.devUrl = originalDevUrl;
  config.build.beforeDevCommand = 'pnpm dev';
  writeFileSync(tauriConfigPath, JSON.stringify(config, null, 2));
}

async function main() {
  if (existsSync(portFile)) {
    unlinkSync(portFile);
  }

  const availablePort = await findAvailablePort(1421);
  console.log(`Starting Vite on port ${availablePort}...`);

  const vite = spawn('npx', ['vite', '--port', availablePort.toString()], {
    stdio: 'inherit',
    shell: true,
    cwd: resolve(__dirname, '..'),
  });

  let originalDevUrl;
  let tauri;

  const cleanup = () => {
    if (originalDevUrl) {
      restoreTauriConfig(originalDevUrl);
      console.log('\nRestored tauri.conf.json');
    }
  };

  vite.on('error', (err) => {
    console.error('Failed to start Vite:', err);
    process.exit(1);
  });

  try {
    const port = await waitForPortFile();
    console.log(`Vite running on port ${port}`);
    
    originalDevUrl = updateTauriConfig(port);
    console.log(`Updated tauri.conf.json with devUrl: http://localhost:${port}`);

    tauri = spawn('npx', ['tauri', 'dev'], {
      stdio: 'inherit',
      shell: true,
      cwd: resolve(__dirname, '..'),
    });

    tauri.on('close', (code) => {
      cleanup();
      vite.kill();
      process.exit(code || 0);
    });

    process.on('SIGINT', () => {
      cleanup();
      if (tauri) tauri.kill('SIGINT');
      vite.kill('SIGINT');
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      cleanup();
      if (tauri) tauri.kill('SIGTERM');
      vite.kill('SIGTERM');
      process.exit(0);
    });
  } catch (err) {
    console.error(err.message);
    cleanup();
    vite.kill();
    process.exit(1);
  }
}

main();