/**
 * Internationalization for Config Editor
 *
 * Flat key structure for easy grep-ability.
 * Language detection: localStorage > navigator.language > 'en'
 */

export type SupportedLang = 'en' | 'es';

const STORAGE_KEY = 'excel2erp-editor-lang';

export const translations: Record<SupportedLang, Record<string, string>> = {
  en: {
    // App
    'app.title': 'Excel2ERP Config Editor',

    // Config picker
    'picker.title': 'Open Configuration',
    'picker.description': 'Load an existing excel2erp YAML configuration to view and edit, or start fresh to create a new one.',
    'picker.button': 'Choose YAML file',

    // Header
    'header.open': 'Open',
    'header.save': 'Save',
    'header.unsaved': 'Unsaved changes',
    'header.showSidebar': 'Show sidebar',
    'header.hideSidebar': 'Hide sidebar',

    // Sidebar
    'nav.schema': 'Output Schema',
    'nav.sources': 'All Sources',
    'nav.sourcesSection': 'Sources',

    // Schema view
    'schema.title': 'Output Schema',
    'schema.headerFields': 'Header Fields',
    'schema.detailFields': 'Detail Fields',
    'schema.fields': 'fields',
    'table.field': 'Field',
    'table.type': 'Type',
    'table.source': 'Source',
    'table.notes': 'Notes',

    // Value sources
    'source.constant': 'Always:',
    'source.fromExcel': 'From Excel',
    'source.perSource': 'Per source',
    'source.userInput': 'User enters',
    'source.rowIndex': 'Row number',

    // Sources view
    'sources.title': 'Sources',
    'sources.configured': 'configured',
    'sources.fieldsMapped': 'fields mapped',
    'sources.empty': 'No sources configured yet',

    // Source detail
    'detail.back': 'Back',
    'detail.loadExcel': 'Load Sample Excel',
    'detail.headerMappings': 'Header Mappings',
    'detail.detailMappings': 'Detail Mappings',
    'detail.row': 'row',
    'detail.noHeaderMappings': 'No header mappings',
    'detail.noDetailMappings': 'No detail mappings',
    'detail.defaultValues': 'Default Values',

    // Excel viewer
    'excel.title': 'Sample Excel',
    'excel.empty': 'Load a sample Excel file to preview data and configure mappings',
    'excel.showingRows': 'Showing rows',
    'excel.of': 'of',
    'excel.prevRows': 'Previous rows',
    'excel.nextRows': 'Next rows',

    // Errors
    'error.prefix': 'Error:',
    'error.parseConfig': 'Failed to parse config file',
    'error.parseExcel': 'Failed to parse Excel file',

    // Mapping popup
    'popup.title': 'Assign Cell',
    'popup.cell': 'Cell',
    'popup.value': 'Value',
    'popup.assignTo': 'Assign to header field:',
    'popup.noFields': 'No assignable header fields',
    'popup.cancel': 'Cancel',
    'popup.alreadyMapped': 'Already mapped',
  },

  es: {
    // App
    'app.title': 'Editor de Configuración Excel2ERP',

    // Config picker
    'picker.title': 'Abrir Configuración',
    'picker.description': 'Cargue una configuración YAML de excel2erp existente para ver y editar, o comience desde cero.',
    'picker.button': 'Elegir archivo YAML',

    // Header
    'header.open': 'Abrir',
    'header.save': 'Guardar',
    'header.unsaved': 'Cambios sin guardar',
    'header.showSidebar': 'Mostrar panel',
    'header.hideSidebar': 'Ocultar panel',

    // Sidebar
    'nav.schema': 'Esquema de Salida',
    'nav.sources': 'Todas las Fuentes',
    'nav.sourcesSection': 'Fuentes',

    // Schema view
    'schema.title': 'Esquema de Salida',
    'schema.headerFields': 'Campos de Cabecera',
    'schema.detailFields': 'Campos de Detalle',
    'schema.fields': 'campos',
    'table.field': 'Campo',
    'table.type': 'Tipo',
    'table.source': 'Origen',
    'table.notes': 'Notas',

    // Value sources
    'source.constant': 'Siempre:',
    'source.fromExcel': 'Desde Excel',
    'source.perSource': 'Por fuente',
    'source.userInput': 'Usuario ingresa',
    'source.rowIndex': 'Número de fila',

    // Sources view
    'sources.title': 'Fuentes',
    'sources.configured': 'configuradas',
    'sources.fieldsMapped': 'campos mapeados',
    'sources.empty': 'No hay fuentes configuradas',

    // Source detail
    'detail.back': 'Volver',
    'detail.loadExcel': 'Cargar Excel de Muestra',
    'detail.headerMappings': 'Mapeos de Cabecera',
    'detail.detailMappings': 'Mapeos de Detalle',
    'detail.row': 'fila',
    'detail.noHeaderMappings': 'Sin mapeos de cabecera',
    'detail.noDetailMappings': 'Sin mapeos de detalle',
    'detail.defaultValues': 'Valores por Defecto',

    // Excel viewer
    'excel.title': 'Excel de Muestra',
    'excel.empty': 'Cargue un archivo Excel de muestra para previsualizar datos y configurar mapeos',
    'excel.showingRows': 'Mostrando filas',
    'excel.of': 'de',
    'excel.prevRows': 'Filas anteriores',
    'excel.nextRows': 'Filas siguientes',

    // Errors
    'error.prefix': 'Error:',
    'error.parseConfig': 'Error al procesar archivo de configuración',
    'error.parseExcel': 'Error al procesar archivo Excel',

    // Mapping popup
    'popup.title': 'Asignar Celda',
    'popup.cell': 'Celda',
    'popup.value': 'Valor',
    'popup.assignTo': 'Asignar a campo de cabecera:',
    'popup.noFields': 'Sin campos de cabecera asignables',
    'popup.cancel': 'Cancelar',
    'popup.alreadyMapped': 'Ya mapeado',
  },
};

/**
 * Detect initial language from localStorage or browser settings.
 */
export function detectLanguage(): SupportedLang {
  // Check localStorage first
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'en' || stored === 'es') {
    return stored;
  }

  // Check browser language
  const browserLang = navigator.language.slice(0, 2).toLowerCase();
  if (browserLang === 'es') {
    return 'es';
  }

  return 'en';
}

/**
 * Save language preference to localStorage.
 */
export function saveLanguage(lang: SupportedLang): void {
  localStorage.setItem(STORAGE_KEY, lang);
}

/**
 * Get translation for a key in the specified language.
 * Returns the key itself if translation is missing (for debugging).
 */
export function translate(lang: SupportedLang, key: string): string {
  return translations[lang][key] ?? key;
}
