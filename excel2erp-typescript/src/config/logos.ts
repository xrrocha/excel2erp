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
 * @param path - Logo filename or path from config (may include directory prefix)
 * @returns Data URL for embedded builds, original path for generic builds
 */
export function resolveLogo(path: string | undefined): string | undefined {
  if (!path) return undefined;

  // Check embedded logos first (keyed by filename only)
  const embedded = getEmbeddedLogos();
  if (embedded) {
    // Extract basename for embedded lookup (path may be "assets/logo.png")
    const basename = path.includes('/') ? path.split('/').pop()! : path;
    if (embedded[basename]) {
      return embedded[basename];
    }
  }

  // Fall back to original path (for generic build)
  return path;
}
