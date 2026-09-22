import { execFile } from 'node:child_process';
import { existsSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { beforeAll, describe, expect, it } from 'vitest';

const execFileAsync = promisify(execFile);
const ROOT = new URL('..', import.meta.url).pathname;
const CLI = join(ROOT, 'dist', 'cli.js');
const DEMO = join(ROOT, 'examples', 'demo.md');

const runCli = async (
  args: readonly string[],
  input?: string,
): Promise<{ code: number; stdout: string; stderr: string }> =>
  new Promise((resolvePromise) => {
    const child = execFile(process.execPath, [CLI, ...args], (error, stdout, stderr) => {
      resolvePromise({ code: child.exitCode ?? (error ? 1 : 0), stdout, stderr });
    });
    if (input !== undefined) child.stdin?.end(input);
  });

describe('whitedeck CLI (built artifact, end to end)', () => {
  beforeAll(async () => {
    await execFileAsync('npm', ['run', 'build'], { cwd: ROOT });
  }, 120_000);

  it('names every output after the deck title, not after the input file', async () => {
    const outDir = mkdtempSync(join(tmpdir(), 'whitedeck-cli-'));
    const { code, stderr, stdout } = await runCli(['build', DEMO, '-f', 'html,pdf,pptx', '-o', outDir]);

    expect(stderr).toBe('');
    expect(code).toBe(0);
    expect(existsSync(join(outDir, 'whitedeck-demo.html'))).toBe(true);
    expect(existsSync(join(outDir, 'whitedeck-demo.pdf'))).toBe(true);
    expect(existsSync(join(outDir, 'whitedeck-demo.pptx'))).toBe(true);
    expect(stdout).toContain('whitedeck-demo.pptx');
  });

  it('names a stdin deck after its headline instead of "deck"', async () => {
    const outDir = mkdtempSync(join(tmpdir(), 'whitedeck-cli-'));
    const { code } = await runCli(['build', '-', '-f', 'pptx', '-o', outDir], '# From stdin');
    expect(code).toBe(0);
    expect(existsSync(join(outDir, 'from-stdin.pptx'))).toBe(true);
    expect(existsSync(join(outDir, 'deck.pptx'))).toBe(false);
  });

  it('honours an explicit --name over the deck title', async () => {
    const outDir = mkdtempSync(join(tmpdir(), 'whitedeck-cli-'));
    const { code } = await runCli(['build', DEMO, '-f', 'pptx', '-o', outDir, '--name', 'board-2026-q3']);
    expect(code).toBe(0);
    expect(existsSync(join(outDir, 'board-2026-q3.pptx'))).toBe(true);
  });

  it('writes to an -o path that names a file, taking the format from its extension', async () => {
    const outDir = mkdtempSync(join(tmpdir(), 'whitedeck-cli-'));
    const target = join(outDir, 'nested', 'investor-update.pptx');
    const { code, stderr } = await runCli(['build', DEMO, '-o', target]);
    expect(stderr).toBe('');
    expect(code).toBe(0);
    expect(existsSync(target)).toBe(true);
  });

  it('refuses an -o file path when several formats are requested', async () => {
    const outDir = mkdtempSync(join(tmpdir(), 'whitedeck-cli-'));
    const { code, stderr } = await runCli(['build', DEMO, '-f', 'html,pptx', '-o', join(outDir, 'x.pptx')]);
    expect(code).toBe(2);
    expect(stderr).toMatch(/single format/i);
  });

  it('fails loudly when a stdin deck has no title to name the file after', async () => {
    const outDir = mkdtempSync(join(tmpdir(), 'whitedeck-cli-'));
    const { code, stderr } = await runCli(['build', '-', '-f', 'pptx', '-o', outDir], '- only a bullet');
    expect(code).toBe(1);
    expect(stderr).toMatch(/no title/i);
  });

  it('init scaffolds a deck that builds standalone, images included', async () => {
    const outDir = mkdtempSync(join(tmpdir(), 'whitedeck-init-'));
    const initRes = await runCli(['init', join(outDir, 'my.md')]);
    expect(initRes.code).toBe(0);
    const buildRes = await runCli(['build', join(outDir, 'my.md'), '-f', 'pptx']);
    expect(buildRes.stderr).toBe('');
    expect(buildRes.code).toBe(0);
    expect(existsSync(join(outDir, 'whitedeck-demo.pptx'))).toBe(true);
  });

  it('lists all 12 layouts as json', async () => {
    const { code, stdout } = await runCli(['layouts', '--json']);
    expect(code).toBe(0);
    const layouts = JSON.parse(stdout) as { id: string }[];
    expect(layouts).toHaveLength(12);
    expect(layouts.map((l) => l.id)).toContain('title-bullets');
  });

  it('validates a good deck with exit 0 and machine-readable output', async () => {
    const { code, stdout } = await runCli(['validate', DEMO]);
    expect(code).toBe(0);
    expect(JSON.parse(stdout)).toMatchObject({ ok: true, slides: 8 });
  });

  it('fails validation of an unknown layout with exit 1', async () => {
    const outDir = mkdtempSync(join(tmpdir(), 'whitedeck-cli-'));
    const bad = join(outDir, 'bad.md');
    await execFileAsync('bash', ['-c', `echo '<!-- _class: nope -->' > ${bad}`]);
    const { code, stderr } = await runCli(['validate', bad]);
    expect(code).toBe(1);
    expect(stderr).toContain('nope');
  });

  it('prints usage with exit 2 on unknown commands', async () => {
    const { code, stderr } = await runCli(['frobnicate']);
    expect(code).toBe(2);
    expect(stderr).toContain('Usage');
  });
});
