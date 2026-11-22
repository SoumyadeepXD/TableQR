import fs from 'fs';
import path from 'path';

/**
 * Loads .env and .env.local files into process.env for standalone TSX scripts
 */
export function loadEnv() {
  const candidates = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), '.env.local'),
    path.resolve(__dirname, '../.env'),
    path.resolve(__dirname, '../.env.local'),
  ];

  for (const filePath of candidates) {
    if (!fs.existsSync(filePath)) continue;

    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;

        const eqIdx = trimmed.indexOf('=');
        const key = trimmed.slice(0, eqIdx).trim();
        let value = trimmed.slice(eqIdx + 1).trim();

        // Strip enclosing quotes if present
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }

        // Set if not already defined in environment
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    } catch {
      // Ignore reading errors
    }
  }
}

// Automatically execute on import
loadEnv();
