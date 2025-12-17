import Alpine from 'alpinejs';
import type { AppConfig, SourceConfig, ResultProperty } from '../shared/config/types';
import { parseYamlConfig } from '../shared/config/loader';

/**
 * Editor navigation views
 */
type EditorView = 'schema' | 'sources' | 'source-detail';

/**
 * Value source classification for a result property
 */
type ValueSource = 'constant' | 'from-excel' | 'per-source' | 'user-input' | 'row-index';

/**
 * Enriched property info for display
 */
interface PropertyInfo {
  name: string;
  type: string;
  source: ValueSource;
  sourceLabel: string;
  value?: string;
  prompt?: string;
}

/**
 * Source card info for gallery display
 */
interface SourceCardInfo {
  name: string;
  description: string;
  logo?: string;
  headerMappedCount: number;
  detailMappedCount: number;
  status: 'complete' | 'partial' | 'empty';
}

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
  get headerProperties(): PropertyInfo[];
  get detailProperties(): PropertyInfo[];
  get sourceCards(): SourceCardInfo[];
  get selectedSource(): SourceConfig | null;

  // Methods
  init(): Promise<void>;
  loadConfig(file: File): Promise<void>;
  navigateTo(view: EditorView, sourceName?: string): void;
  markDirty(): void;
  getValueSource(prop: ResultProperty, section: 'header' | 'detail'): { source: ValueSource; label: string };
}

/**
 * Determine the value source for a result property
 */
function classifyValueSource(
  prop: ResultProperty,
  section: 'header' | 'detail',
  sources: SourceConfig[]
): { source: ValueSource; label: string } {
  // Row index special case
  if (prop.defaultValue === '${index}') {
    return { source: 'row-index', label: 'Row number' };
  }

  // Has a fixed default value (constant)
  if (prop.defaultValue !== undefined) {
    return { source: 'constant', label: `Always: ${prop.defaultValue}` };
  }

  // Check if any source extracts this from Excel
  const isExtractedFromExcel = sources.some((src) => {
    if (section === 'header') {
      return src.header.some((h) => h.name === prop.name);
    } else {
      return src.detail.properties.some((d) => d.name === prop.name);
    }
  });

  // Check if any source has a defaultValue for this
  const hasSourceDefault = sources.some(
    (src) => src.defaultValues && prop.name in src.defaultValues
  );

  if (isExtractedFromExcel) {
    return { source: 'from-excel', label: 'From Excel' };
  }

  if (hasSourceDefault) {
    return { source: 'per-source', label: 'Per source' };
  }

  // Has a prompt, needs user input
  if (prop.prompt) {
    return { source: 'user-input', label: 'User enters' };
  }

  // Fallback
  return { source: 'from-excel', label: 'From Excel' };
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

    get headerProperties(): PropertyInfo[] {
      if (!this.config) return [];
      return this.config.result.header.properties.map((prop) => {
        const { source, label } = this.getValueSource(prop, 'header');
        return {
          name: prop.name,
          type: prop.type || 'text',
          source,
          sourceLabel: label,
          value: prop.defaultValue,
          prompt: prop.prompt,
        };
      });
    },

    get detailProperties(): PropertyInfo[] {
      if (!this.config) return [];
      return this.config.result.detail.properties.map((prop) => {
        const { source, label } = this.getValueSource(prop, 'detail');
        return {
          name: prop.name,
          type: prop.type || 'text',
          source,
          sourceLabel: label,
          value: prop.defaultValue,
          prompt: prop.prompt,
        };
      });
    },

    get sourceCards(): SourceCardInfo[] {
      if (!this.config) return [];

      const headerFields = this.config.result.header.properties
        .filter((p) => !p.defaultValue)
        .map((p) => p.name);
      const detailFields = this.config.result.detail.properties
        .filter((p) => !p.defaultValue && p.defaultValue !== '${index}')
        .map((p) => p.name);

      return this.config.sources.map((src) => {
        const headerMapped = src.header.filter((h) => headerFields.includes(h.name)).length;
        const detailMapped = src.detail.properties.filter((d) =>
          detailFields.includes(d.name)
        ).length;

        // Also count fields covered by defaultValues
        const headerFromDefaults = headerFields.filter(
          (f) => src.defaultValues && f in src.defaultValues
        ).length;
        const totalHeaderMapped = headerMapped + headerFromDefaults;

        const totalRequired = headerFields.length + detailFields.length;
        const totalMapped = totalHeaderMapped + detailMapped;

        let status: 'complete' | 'partial' | 'empty' = 'empty';
        if (totalMapped === totalRequired) {
          status = 'complete';
        } else if (totalMapped > 0) {
          status = 'partial';
        }

        return {
          name: src.name,
          description: src.description,
          logo: src.logo,
          headerMappedCount: totalHeaderMapped,
          detailMappedCount: detailMapped,
          status,
        };
      });
    },

    get selectedSource(): SourceConfig | null {
      if (!this.config || !this.selectedSourceName) return null;
      return this.config.sources.find((s) => s.name === this.selectedSourceName) ?? null;
    },

    // Methods
    async init(): Promise<void> {
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

    getValueSource(prop: ResultProperty, section: 'header' | 'detail') {
      if (!this.config) return { source: 'from-excel' as ValueSource, label: 'Unknown' };
      return classifyValueSource(prop, section, this.config.sources);
    },
  };
}

// Register and start Alpine
Alpine.data('editor', createEditorApp);
Alpine.start();

// Export for type checking
export type { EditorState, EditorView, PropertyInfo, SourceCardInfo, ValueSource };
