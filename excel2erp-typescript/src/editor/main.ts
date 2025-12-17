import Alpine from 'alpinejs';
import type { AppConfig } from '../shared/config/types';
import { parseYamlConfig } from '../shared/config/loader';

/**
 * Editor navigation views
 */
type EditorView = 'schema' | 'sources' | 'source-detail';

/**
 * Editor application state
 */
interface EditorState {
  // Navigation
  currentView: EditorView;
  selectedSourceName: string | null;

  // Data
  config: AppConfig | null;
  configFileName: string | null;
  dirty: boolean;

  // UI state
  loading: boolean;
  error: string | null;

  // Computed
  get canSave(): boolean;
  get sourceCount(): number;

  // Methods
  init(): Promise<void>;
  loadConfig(file: File): Promise<void>;
  navigateTo(view: EditorView, sourceName?: string): void;
  markDirty(): void;
}

/**
 * Create the editor Alpine.js application
 */
function createEditorApp(): EditorState {
  return {
    // Navigation
    currentView: 'schema',
    selectedSourceName: null,

    // Data
    config: null,
    configFileName: null,
    dirty: false,

    // UI state
    loading: false,
    error: null,

    // Computed
    get canSave(): boolean {
      return this.config !== null && this.dirty;
    },

    get sourceCount(): number {
      return this.config?.sources?.length ?? 0;
    },

    // Methods
    async init(): Promise<void> {
      // Editor always starts with file picker - no auto-load
      console.log('Config Editor initialized');
    },

    async loadConfig(file: File): Promise<void> {
      this.loading = true;
      this.error = null;

      try {
        const text = await file.text();
        this.config = parseYamlConfig(text);
        this.configFileName = file.name;
        this.dirty = false;
        this.currentView = 'schema';
        console.log('Config loaded:', this.config.name, `(${this.sourceCount} sources)`);
      } catch (err) {
        this.error = err instanceof Error ? err.message : 'Failed to parse config file';
        this.config = null;
        this.configFileName = null;
      } finally {
        this.loading = false;
      }
    },

    navigateTo(view: EditorView, sourceName?: string): void {
      this.currentView = view;
      this.selectedSourceName = sourceName ?? null;
    },

    markDirty(): void {
      this.dirty = true;
    },
  };
}

// Register and start Alpine
Alpine.data('editor', createEditorApp);
Alpine.start();

// Export for type checking
export type { EditorState, EditorView };
