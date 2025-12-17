/**
 * Shared types for test fixtures.
 *
 * These types define the structure for source-specific test data,
 * used by both legacy and demo fixture sets.
 */

/**
 * User inputs per source.
 * Keys are source names, values are field-value pairs.
 */
export type UserInputs = Record<string, Record<string, string>>;

/**
 * Filename validation patterns per source.
 * Used to verify generated ZIP filenames match expected format.
 */
export type FilenamePatterns = Record<string, RegExp>;

/**
 * Test source metadata.
 * Associates source names with their Excel fixture files.
 */
export interface TestSource {
  readonly name: string;
  readonly file: string;
}
