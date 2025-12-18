import Alpine from 'alpinejs';
import type { AppConfig, SourceConfig } from '../shared/config/types';
import { parseYamlConfig } from '../shared/config/loader';
import { ExcelReader, colToLetter, parseCellAddress } from '../shared/excel/reader';
import { type SupportedLang, detectLanguage, saveLanguage, translate } from './i18n';
import {
  type CellValue,
  type DetailRegion,
  computeDetailRegion,
  countContiguousColumns,
  findFirstNonEmptyColumn,
  isInDetailRegion as isInDetailRegionFn,
  isDetailColumn,
} from './detail-region';
import {
  extractSheetData,
  calculateColumnWidths,
} from './sheet-utils';
import {
  type ValueSource,
  type PropertyInfo,
  classifyValueSource,
  toPropertyInfo,
} from './value-source';

/**
 * Editor navigation views
 */
type EditorView = 'schema' | 'sources' | 'source-detail';

/**
 * Mapping popup mode - determines what options are shown
 */
type MappingPopupMode = 'header' | 'detail-start' | 'detail-column' | 'detail-unmap';

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
 * Excel viewer constants
 */
const EXCEL_VISIBLE_ROWS = 15;
const EXCEL_MAX_DISPLAY_ROWS = 50;

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
  popupMode: MappingPopupMode;
  popupColIndex: number | null;

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
  get mappableHeaderFields(): { name: string; isMapped: boolean; mappedTo?: string }[];
  get mappableDetailFields(): { name: string; isMapped: boolean; mappedTo?: string }[];
  get detailRegion(): DetailRegion | null;
  get hasDetailRegion(): boolean;
  get requiredDetailFieldCount(): number;
  get headerMappingStatus(): { mapped: number; total: number; complete: boolean };
  get detailMappingStatus(): { mapped: number; total: number; complete: boolean };
  get detailMappingProgressText(): string;
  isDetailColumnMapped(col: number): boolean;

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
  determineCellClickMode(row: number, col: number, region: DetailRegion | null): MappingPopupMode;
  onRowHeaderClick(rowIndex: number): void;
  onColumnHeaderClick(colIndex: number): void;
  assignToHeaderField(fieldName: string): void;
  setDetailStart(): void;
  setDetailStartInternal(row: number, col: number): void;
  assignToDetailField(fieldName: string): void;
  unmapDetailRegion(): void;
  openPopup(address: string, value: string, colIndex: number, mode: MappingPopupMode): void;
  closeMappingPopup(): void;
  isInDetailRegion(row: number, col: number): boolean;
  isDetailColumnHeader(col: number): boolean;
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
    popupMode: 'header' as MappingPopupMode,
    popupColIndex: null,

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

    get mappableHeaderFields(): { name: string; isMapped: boolean; mappedTo?: string }[] {
      if (!this.config || !this.selectedSource) return [];

      // Fields with per-source defaults don't need Excel mapping
      const defaultedNames = new Set(Object.keys(this.selectedSource.defaultValues || {}));

      // Get header fields that can be assigned from Excel (no defaultValue, no per-source default)
      const assignableFields = this.config.result.header.properties
        .filter((p) => p.defaultValue === undefined)
        .filter((p) => !defaultedNames.has(p.name))
        .map((p) => p.name);

      // Check which are already mapped in the current source
      const mappedByName = new Map(this.selectedSource.header.map((h) => [h.name, h.locator]));

      return assignableFields.map((name) => ({
        name,
        isMapped: mappedByName.has(name),
        mappedTo: mappedByName.get(name),
      }));
    },

    get mappableDetailFields(): { name: string; isMapped: boolean; mappedTo?: string }[] {
      if (!this.config || !this.selectedSource) return [];

      // Get detail fields that can be assigned from Excel (no defaultValue, not row-index)
      const assignableFields = this.config.result.detail.properties
        .filter((p) => p.defaultValue === undefined || p.defaultValue === '${index}')
        .filter((p) => p.defaultValue !== '${index}')  // Exclude row-index fields
        .map((p) => p.name);

      // Check which are already mapped in the current source
      const mappedProps = this.selectedSource.detail?.properties || [];
      const mappedByName = new Map(mappedProps.map((p) => [p.name, p.locator]));

      return assignableFields.map((name) => ({
        name,
        isMapped: mappedByName.has(name),
        mappedTo: mappedByName.get(name),
      }));
    },

    get requiredDetailFieldCount(): number {
      if (!this.config) return 0;
      // Count detail fields that need to be mapped from Excel
      return this.config.result.detail.properties
        .filter((p) => p.defaultValue === undefined)
        .length;
    },

    get detailRegion(): DetailRegion | null {
      if (!this.selectedSource?.detail?.locator || !this.workbook) return null;
      return computeDetailRegion(this.sheetData, this.selectedSource.detail.locator);
    },

    get hasDetailRegion(): boolean {
      return this.detailRegion !== null;
    },

    get headerMappingStatus(): { mapped: number; total: number; complete: boolean } {
      const total = this.mappableHeaderFields.length;
      const mapped = this.mappableHeaderFields.filter((f) => f.isMapped).length;
      return { mapped, total, complete: mapped >= total };
    },

    get detailMappingStatus(): { mapped: number; total: number; complete: boolean } {
      const total = this.requiredDetailFieldCount;
      const mapped = this.mappableDetailFields.filter((f) => f.isMapped).length;
      return { mapped, total, complete: mapped >= total };
    },

    get detailMappingProgressText(): string {
      const { mapped, total, complete } = this.detailMappingStatus;
      if (complete) {
        return this.t('excel.mappingComplete').replace('{total}', String(total));
      }
      return this.t('excel.mappingProgress')
        .replace('{mapped}', String(mapped))
        .replace('{total}', String(total));
    },

    isDetailColumnMapped(col: number): boolean {
      if (!this.selectedSource?.detail?.properties) return false;
      const colLetter = colToLetter(col);
      return this.selectedSource.detail.properties.some((p) => p.locator === colLetter);
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

      // Extract sheet data using shared utility
      const { data, rows, cols } = extractSheetData(sheet, EXCEL_MAX_DISPLAY_ROWS);

      this.sheetData = data;
      this.totalRows = rows;
      this.totalCols = cols;
      this.visibleStartRow = 0;

      // Calculate column widths using shared utility
      this.columnWidths = calculateColumnWidths(data, cols);
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

      const actualRow = this.visibleStartRow + rowIndex;
      const mode = this.determineCellClickMode(actualRow, colIndex, this.detailRegion);
      const address = mode === 'detail-column'
        ? colToLetter(colIndex)
        : colToLetter(colIndex) + (actualRow + 1);
      const value = String(this.sheetData[actualRow]?.[colIndex] ?? '');

      // DEBUG: Trace cell click values
      console.log('[onCellClick] rowIndex=%d, colIndex=%d, visibleStartRow=%d, actualRow=%d',
        rowIndex, colIndex, this.visibleStartRow, actualRow);
      console.log('[onCellClick] mode=%s, address=%s, value=%s', mode, address, JSON.stringify(value));
      console.log('[onCellClick] detailRegion=%o', this.detailRegion);
      console.log('[onCellClick] sheetData[%d]=%o', actualRow, this.sheetData[actualRow]);

      this.openPopup(address, value, colIndex, mode);
    },

    determineCellClickMode(
      row: number,
      col: number,
      region: DetailRegion | null
    ): MappingPopupMode {
      if (!region) return 'detail-start';

      // Clicking detail region start cell → unmap option
      if (row === region.startRow && col === region.startCol) {
        return 'detail-unmap';
      }

      // Clicking detail region header row → column assignment
      if (row === region.startRow && col >= region.startCol && col < region.endCol) {
        return 'detail-column';
      }

      // Outside detail region → header field assignment
      return 'header';
    },

    onRowHeaderClick(rowIndex: number): void {
      if (!this.workbook || this.hasDetailRegion) return;

      const actualRow = this.visibleStartRow + rowIndex;
      const rowData = this.sheetData[actualRow] || [];

      // Find first non-empty cell using shared utility
      const firstNonEmptyCol = findFirstNonEmptyColumn(rowData);
      if (firstNonEmptyCol === -1) return;

      // Count contiguous columns using shared utility
      const colCount = countContiguousColumns(rowData, firstNonEmptyCol);

      // Validate column count
      if (colCount < this.requiredDetailFieldCount) {
        this.error = this.t('error.detailColumnCount')
          .replace('{found}', String(colCount))
          .replace('{required}', String(this.requiredDetailFieldCount));
        return;
      }

      // Set detail start
      this.popupCellAddress = colToLetter(firstNonEmptyCol) + (actualRow + 1);
      this.popupCellValue = String(rowData[firstNonEmptyCol] ?? '');
      this.popupColIndex = firstNonEmptyCol;
      this.setDetailStartInternal(actualRow, firstNonEmptyCol);
    },

    onColumnHeaderClick(colIndex: number): void {
      if (!this.workbook || !this.hasDetailRegion) return;

      const region = this.detailRegion;
      if (!region) return;

      // Check if column is within detail region
      if (colIndex < region.startCol || colIndex >= region.endCol) return;

      const address = colToLetter(colIndex);
      const value = String(this.sheetData[region.startRow]?.[colIndex] ?? '');
      this.openPopup(address, value, colIndex, 'detail-column');
    },

    assignToHeaderField(fieldName: string): void {
      // DEBUG: Trace header field assignment
      console.log('[assignToHeaderField] CALLED with fieldName=%s', fieldName);
      console.log('[assignToHeaderField] popupCellAddress=%s', this.popupCellAddress);

      const source = this.selectedSource;
      if (!source) {
        console.log('[assignToHeaderField] No selectedSource, returning early');
        return;
      }
      console.log('[assignToHeaderField] source.name=%s', source.name);

      // Remove existing mapping for this field (if any)
      source.header = source.header.filter((h) => h.name !== fieldName);

      // Add new mapping
      source.header.push({
        name: fieldName,
        locator: this.popupCellAddress,
      });

      this.markDirty();
      this.closeMappingPopup();
    },

    openPopup(address: string, value: string, colIndex: number, mode: MappingPopupMode): void {
      this.popupCellAddress = address;
      this.popupCellValue = value;
      this.popupColIndex = colIndex;
      this.popupMode = mode;
      this.showMappingPopup = true;
    },

    closeMappingPopup(): void {
      this.showMappingPopup = false;
      this.popupCellAddress = '';
      this.popupCellValue = '';
      this.popupMode = 'header';
      this.popupColIndex = null;
    },

    setDetailStart(): void {
      if (!this.config || !this.selectedSource || !this.popupCellAddress) return;

      const parsed = parseCellAddress(this.popupCellAddress);
      if (!parsed) return;

      this.setDetailStartInternal(parsed.row, parsed.col);
      this.closeMappingPopup();
    },

    setDetailStartInternal(row: number, col: number): void {
      if (!this.config || !this.selectedSource) return;

      const source = this.selectedSource;

      // Count contiguous columns using shared utility
      const rowData = this.sheetData[row] || [];
      const colCount = countContiguousColumns(rowData, col);

      // Validate column count
      if (colCount < this.requiredDetailFieldCount) {
        this.error = this.t('error.detailColumnCount')
          .replace('{found}', String(colCount))
          .replace('{required}', String(this.requiredDetailFieldCount));
        return;
      }

      // Set the detail locator
      const cellAddress = colToLetter(col) + (row + 1);
      source.detail = {
        locator: cellAddress,
        properties: [],
      };

      this.markDirty();
      this.error = null;
    },

    assignToDetailField(fieldName: string): void {
      const source = this.selectedSource;
      if (!source?.detail || this.popupColIndex === null) return;

      // DEBUG: Trace popup state at assignment time
      console.log('[assignToDetailField] fieldName=%s', fieldName);
      console.log('[assignToDetailField] popupCellAddress=%s, popupCellValue=%s, popupColIndex=%d',
        this.popupCellAddress, JSON.stringify(this.popupCellValue), this.popupColIndex);

      // Use column header text as locator (e.g., "CANTID", "DESDOC"), not column letter
      const columnHeader = this.popupCellValue;

      // Remove existing mapping for this field (if any)
      source.detail.properties = source.detail.properties.filter((p) => p.name !== fieldName);

      // Remove any mapping that was using this column header
      source.detail.properties = source.detail.properties.filter((p) => p.locator !== columnHeader);

      // Add new mapping
      source.detail.properties.push({
        name: fieldName,
        locator: columnHeader,
      });

      console.log('[assignToDetailField] stored locator=%s', columnHeader);
      console.log('[assignToDetailField] detail.properties=%o', source.detail.properties);

      this.markDirty();
      this.closeMappingPopup();
    },

    unmapDetailRegion(): void {
      const source = this.selectedSource;
      if (!source) return;

      // Clear detail configuration
      source.detail = {
        locator: '',
        properties: [],
      };

      this.markDirty();
      this.closeMappingPopup();
    },

    isInDetailRegion(row: number, col: number): boolean {
      return isInDetailRegionFn(this.detailRegion, row, col);
    },

    isDetailColumnHeader(col: number): boolean {
      return isDetailColumn(this.detailRegion, col);
    },
  };
}

// Register and start Alpine
Alpine.data('editor', createEditorApp);
Alpine.start();

// Export types for type checking
export type { EditorState, EditorView, PropertyInfo, SourceCardInfo, ValueSource };

// Export pure functions for testing
export { classifyValueSource, toPropertyInfo };
