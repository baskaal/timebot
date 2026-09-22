import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

type IndexEntry = { file: string; at: number };

export class Snapshots {
  private index = new Map<string, IndexEntry>();
  private indexPath: string;

  constructor(private dir: string) {
    this.indexPath = path.join(dir, 'index.json');
    fs.mkdirSync(dir, { recursive: true });
    this.load();
  }

  private key(filePath: string): string {
    return createHash('sha256').update(filePath).digest('hex').slice(0, 32);
  }

  read(filePath: string): string | null {
    const entry = this.index.get(filePath);
    const file = entry?.file ?? path.join(this.dir, `${this.key(filePath)}.txt`);
    try {
      return fs.readFileSync(file, 'utf8');
    } catch {
      return null;
    }
  }

  write(filePath: string, content: string): void {
    const filename = `${this.key(filePath)}.txt`;
    const full = path.join(this.dir, filename);
    fs.writeFileSync(full, content);
    this.index.set(filePath, { file: full, at: Date.now() });
    this.prune();
    this.save();
  }

  remove(filePath: string): void {
    const entry = this.index.get(filePath);
    this.index.delete(filePath);
    if (entry) {
      try {
        fs.unlinkSync(entry.file);
      } catch {
        // The snapshot was already removed.
      }
    }
    this.save();
  }

  private prune(): void {
    if (this.index.size <= 400) return;
    const entries = [...this.index.entries()].sort((a, b) => a[1].at - b[1].at);
    const extra = this.index.size - 350;
    for (let i = 0; i < extra; i += 1) {
      const [filePath, entry] = entries[i];
      this.index.delete(filePath);
      try {
        fs.unlinkSync(entry.file);
      } catch {
        // Ignore a file that is already gone.
      }
    }
  }

  private load(): void {
    try {
      const parsed = JSON.parse(fs.readFileSync(this.indexPath, 'utf8')) as Array<[string, IndexEntry]>;
      if (Array.isArray(parsed)) this.index = new Map(parsed);
    } catch {
      this.index = new Map();
    }
  }

  private save(): void {
    const tmp = `${this.indexPath}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify([...this.index.entries()]));
    fs.renameSync(tmp, this.indexPath);
  }
}
