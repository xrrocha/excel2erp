import Alpine from 'alpinejs';
import type { AppConfig, SourceConfig, ResultProperty } from '../shared/config/types';
import { parseYamlConfig } from '../shared/config/loader';
import { ExcelReader, colToLetter } from '../shared/excel/reader';
import { type SupportedLang, detectLanguage, saveLanguage, translate } from './i18n';

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
 * Cell value type for Excel grid display
 */
type CellValue = string | number;

/**
 * Excel viewer constants
 */
const EXCEL_VISIBLE_ROWS = 15;
const EXCEL_MAX_DISPLAY_ROWS = 50;
const COLUMN_MIN_WIDTH = 60;
const COLUMN_MAX_WIDTH = 200;
const COLUMN_CHAR_WIDTH = 8;

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

  // Excel viewer state
  excelFileName: string;
  workbook: ExcelReader | null;
  sheetNames: string[];
  selectedSheetIndex: number;
  sheetData: CellValue[][];
  totalRows: number;
  totalCols: number;
  visibleStartRow: number;
  columnWidths: number[];

  // Mapping popup state
  showMappingPopup: boolean;
  popupCellAddress: string;
  popupCellValue: string;

  // UI state
  loading: boolean;
  error: string | null;
  sidebarCollapsed: boolean;

  // i18n
  lang: SupportedLang;
  t(key: string): string;
  setLang(lang: SupportedLang): void;

  // Computed
  get canSave(): boolean;
  get sourceCount(): number;
  get headerProperties(): PropertyInfo[];
  get detailProperties(): PropertyInfo[];
  get sourceCards(): SourceCardInfo[];
  get selectedSource(): SourceConfig | null;
  get visibleRows(): number;
  get visibleEndRow(): number;
  get columnLetters(): string[];
  get visibleSheetData(): CellValue[][];
  get mappableHeaderFields(): { name: string; isMapped: boolean }[];

  // Methods
  init(): Promise<void>;
  loadConfig(file: File): Promise<void>;
  loadExcel(file: File): Promise<void>;
  selectSheet(index: number): void;
  scrollExcel(direction: 'up' | 'down'): void;
  navigateTo(view: EditorView, sourceName?: string): void;
  toggleSidebar(): void;
  markDirty(): void;
  clearExcelState(): void;
  onCellClick(rowIndex: number, colIndex: number): void;
  assignToHeaderField(fieldName: string): void;
  closeMappingPopup(): void;
}

/**
 * Determine the value source for a result property.
 * Returns source type only; label is resolved via i18n in the UI layer.
 */
function classifyValueSource(
  prop: ResultProperty,
  section: 'header' | 'detail',
  sources: SourceConfig[]
): ValueSource {
  // Row index special case
  if (prop.defaultValue === '${index}') {
    return 'row-index';
  }

  // Has a fixed default value (constant)
  if (prop.defaultValue !== undefined) {
    return 'constant';
  }

  // Check if any source extracts this from Excel
  const isExtractedFromExcel = sources.some((src) => {
    if (section === 'header') {
      return src.header.some((h) => h.name === prop.name);
    } else {
      return src.detail.properties.some((d) => d.name === prop.name);
    }
  });

  if (isExtractedFromExcel) {
    return 'from-excel';
  }

  // Check if any source has a defaultValue for this
  const hasSourceDefault = sources.some(
    (src) => src.defaultValues && prop.name in src.defaultValues
  );

  if (hasSourceDefault) {
    return 'per-source';
  }

  // Has a prompt, needs user input
  if (prop.prompt) {
    return 'user-input';
  }

  // Fallback
  return 'from-excel';
}

/**
 * Map ValueSource to i18n key suffix.
 */
const SOURCE_I18N_KEYS: Record<ValueSource, string> = {
  'constant': 'constant',
  'from-excel': 'fromExcel',
  'per-source': 'perSource',
  'user-input': 'userInput',
  'row-index': 'rowIndex',
};

/**
 * Build PropertyInfo from a ResultProperty.
 */
function toPropertyInfo(
  prop: ResultProperty,
  section: 'header' | 'detail',
  sources: SourceConfig[],
  t: (key: string) => string
): PropertyInfo {
  const source = classifyValueSource(prop, section, sources);
  const sourceLabel = source === 'constant'
    ? `${t('source.constant')} ${prop.defaultValue}`
    : t(`source.${SOURCE_I18N_KEYS[source]}`);

  return {
    name: prop.name,
    type: prop.type || 'text',
    source,
    sourceLabel,
    value: prop.defaultValue,
    prompt: prop.prompt,
  };
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

    // Excel viewer state
    excelFileName: '',
    workbook: null,
    sheetNames: [],
    selectedSheetIndex: 0,
    sheetData: [],
    totalRows: 0,
    totalCols: 0,
    visibleStartRow: 0,
    columnWidths: [],

    // Mapping popup state
    showMappingPopup: false,
    popupCellAddress: '',
    popupCellValue: '',

    // UI state
    loading: false,
    error: null,
    sidebarCollapsed: false,

    // i18n
    lang: detectLanguage(),

    t(key: string): string {
      return translate(this.lang, key);
    },

    setLang(lang: SupportedLang): void {
      this.lang = lang;
      saveLanguage(lang);
    },

    // Computed
    get canSave(): boolean {
      return this.config !== null && this.dirty;
    },

    get sourceCount(): number {
      return this.config?.sources?.length ?? 0;
    },

    get headerProperties(): PropertyInfo[] {
      if (!this.config) return [];
      return this.config.result.header.properties.map((prop) =>
        toPropertyInfo(prop, 'header', this.config!.sources, (k) => this.t(k))
      );
    },

    get detailProperties(): PropertyInfo[] {
      if (!this.config) return [];
      return this.config.result.detail.properties.map((prop) =>
        toPropertyInfo(prop, 'detail', this.config!.sources, (k) => this.t(k))
      );
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

    get visibleRows(): number {
      return Math.min(EXCEL_VISIBLE_ROWS, this.totalRows - this.visibleStartRow);
    },

    get visibleEndRow(): number {
      return Math.min(this.visibleStartRow + EXCEL_VISIBLE_ROWS, this.totalRows);
    },

    get columnLetters(): string[] {
      return Array.from({ length: this.totalCols }, (_, i) => colToLetter(i));
    },

    get visibleSheetData(): CellValue[][] {
      return this.sheetData.slice(this.visibleStartRow, this.visibleEndRow);
    },

    get mappableHeaderFields(): { name: string; isMapped: boolean }[] {
      if (!this.config || !this.selectedSource) return [];

      // Get header fields that can be assigned from Excel (no defaultValue)
      const assignableFields = this.config.result.header.properties
        .filter((p) => p.defaultValue === undefined)
        .map((p) => p.name);

      // Check which are already mapped in the current source
      const mappedFields = new Set(this.selectedSource.header.map((h) => h.name));

      return assignableFields.map((name) => ({
        name,
        isMapped: mappedFields.has(name),
      }));
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

    async loadExcel(file: File): Promise<void> {
      this.loading = true;
      this.error = null;

      try {
        const buffer = await file.arrayBuffer();
        this.workbook = new ExcelReader(buffer);
        this.excelFileName = file.name;
        this.sheetNames = this.workbook.sheetNames;
        this.selectedSheetIndex = 0;
        this.selectSheet(0);
        this.sidebarCollapsed = true;
        console.log('Excel loaded:', file.name, `(${this.sheetNames.length} sheets)`);
      } catch (err) {
        this.error = err instanceof Error ? err.message : 'Failed to parse Excel file';
        this.clearExcelState();
      } finally {
        this.loading = false;
      }
    },

    selectSheet(index: number): void {
      if (!this.workbook || index < 0 || index >= this.sheetNames.length) return;

      this.selectedSheetIndex = index;
      const sheet = this.workbook.getSheet(index);

      // Extract sheet data as 2D array (limit to EXCEL_MAX_DISPLAY_ROWS)
      const data: CellValue[][] = [];
      let maxCol = 0;

      // Scan to find used range (up to max rows)
      for (let row = 0; row < EXCEL_MAX_DISPLAY_ROWS; row++) {
        const rowData: CellValue[] = [];
        let hasData = false;

        // Scan columns (up to reasonable limit)
        for (let col = 0; col < 26; col++) {
          const value = sheet.readCellByIndex(row, col);
          rowData.push(value);
          if (value !== '') {
            hasData = true;
            maxCol = Math.max(maxCol, col);
          }
        }

        if (!hasData && row > 0) {
          // Stop at first completely empty row
          break;
        }

        data.push(rowData.slice(0, maxCol + 1));
      }

      this.sheetData = data;
      this.totalRows = data.length;
      this.totalCols = maxCol + 1;
      this.visibleStartRow = 0;

      // Calculate column widths based on content
      const widths: number[] = [];
      for (let col = 0; col <= maxCol; col++) {
        let maxLen = 2; // Minimum for column letter (A, B, etc.)
        for (const row of data) {
          if (col < row.length) {
            const cellLen = String(row[col]).length;
            maxLen = Math.max(maxLen, cellLen);
          }
        }
        const width = Math.min(COLUMN_MAX_WIDTH, Math.max(COLUMN_MIN_WIDTH, maxLen * COLUMN_CHAR_WIDTH));
        widths.push(width);
      }
      this.columnWidths = widths;
    },

    scrollExcel(direction: 'up' | 'down'): void {
      const maxStart = Math.max(0, this.totalRows - EXCEL_VISIBLE_ROWS);

      if (direction === 'up') {
        this.visibleStartRow = Math.max(0, this.visibleStartRow - EXCEL_VISIBLE_ROWS);
      } else {
        this.visibleStartRow = Math.min(maxStart, this.visibleStartRow + EXCEL_VISIBLE_ROWS);
      }
    },

    navigateTo(view: EditorView, sourceName?: string): void {
      // Clear Excel state when leaving source-detail view
      if (this.currentView === 'source-detail' && view !== 'source-detail') {
        this.clearExcelState();
      }

      this.currentView = view;
      this.selectedSourceName = sourceName ?? null;
    },

    toggleSidebar(): void {
      this.sidebarCollapsed = !this.sidebarCollapsed;
    },

    markDirty(): void {
      this.dirty = true;
    },

    clearExcelState(): void {
      this.workbook = null;
      this.excelFileName = '';
      this.sheetNames = [];
      this.sheetData = [];
      this.totalRows = 0;
      this.totalCols = 0;
      this.visibleStartRow = 0;
      this.columnWidths = [];
    },

    onCellClick(rowIndex: number, colIndex: number): void {
      if (!this.workbook) return;

      // Calculate actual row in sheet (accounting for scroll)
      const actualRow = this.visibleStartRow + rowIndex;
      this.popupCellAddress = colToLetter(colIndex) + (actualRow + 1);
      this.popupCellValue = String(this.sheetData[actualRow]?.[colIndex] ?? '');
      this.showMappingPopup = true;
    },

    assignToHeaderField(fieldName: string): void {
      if (!this.config || !this.selectedSource) return;

      // Find the source in config and update its header mapping
      const source = this.config.sources.find((s) => s.name === this.selectedSourceName);
      if (!source) return;

      // Remove existing mapping for this field (if any)
      source.header = source.header.filter((h) => h.name !== fieldName);

      // Add new mapping
      source.header.push({
        name: fieldName,
        cell: this.popupCellAddress,
      });

      this.markDirty();
      this.closeMappingPopup();
    },

    closeMappingPopup(): void {
      this.showMappingPopup = false;
      this.popupCellAddress = '';
      this.popupCellValue = '';
    },
  };
}

// Register and start Alpine
Alpine.data('editor', createEditorApp);
Alpine.start();

// Export for type checking
export type { EditorState, EditorView, PropertyInfo, SourceCardInfo, ValueSource };
