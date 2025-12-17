/**
 * Path utilities for ESM test files.
 *
 * Provides cross-runtime compatible __dirname equivalent.
 */

import path from 'path';
import { fileURLToPath } from 'url';

/**
 * Get the directory name from an import.meta.url.
 *
 * Usage:
 *   const __dirname = getDirname(import.meta.url);
 */
export function getDirname(importMetaUrl: string): string {
  const __filename = fileURLToPath(importMetaUrl);
  return path.dirname(__filename);
}
