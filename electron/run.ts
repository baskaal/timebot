import { spawn } from 'node:child_process';

export function runCommand(
  command: string,
  args: string[],
  options: { input?: string; timeoutMs?: number } = {},
): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const child = spawn(command, args, { windowsHide: true });
    let stdout = '';
    let stderr = '';
    let settled = false;
    const finish = (result: { code: number; stdout: string; stderr: string }) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(result);
    };
    const timer = setTimeout(() => {
      child.kill();
      finish({ code: -1, stdout, stderr: stderr || 'timeout' });
    }, options.timeoutMs ?? 8000);
    child.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on('error', (error) => finish({ code: -1, stdout, stderr: error.message }));
    child.on('close', (code) => finish({ code: code ?? -1, stdout, stderr }));
    if (options.input != null) child.stdin.write(options.input);
    child.stdin.end();
  });
}

export function powershell(script: string, timeoutMs: number): Promise<{ code: number; stdout: string; stderr: string }> {
  const encoded = Buffer.from(script, 'utf16le').toString('base64');
  return runCommand(
    'powershell.exe',
    ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', encoded],
    { timeoutMs },
  );
}
