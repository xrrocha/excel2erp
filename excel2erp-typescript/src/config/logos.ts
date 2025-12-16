/**
 * Logo Resolver
 *
 * Resolves logo paths to their actual URLs.
 * For embedded builds, returns data URLs from embedded assets.
 * For generic builds, returns the original path.
 */

import { getEmbeddedLogos } from './embedded';

/**
 * Resolve a logo path to its actual URL.
 *
 * @param path - Logo filename or path from config
 * @returns Data URL for embedded builds, original path for generic builds
 */
export function resolveLogo(path: string | undefined): string | undefined {
  if (!path) return undefined;

  // Check embedded logos first
  const embedded = getEmbeddedLogos();
  if (embedded?.[path]) {
    return embedded[path];
  }

  // Fall back to original path (for generic build)
  return path;
}
