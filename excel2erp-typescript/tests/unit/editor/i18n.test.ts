/**
 * i18n Module Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  type SupportedLang,
  translations,
  detectLanguage,
  saveLanguage,
  translate,
} from '../../../src/editor/i18n';

const STORAGE_KEY = 'excel2erp-editor-lang';

describe('i18n', () => {
  // Store original values to restore after tests
  let originalLocalStorage: Storage;
  let originalNavigator: Navigator;
  let mockStorage: Record<string, string>;

  beforeEach(() => {
    // Mock localStorage
    mockStorage = {};
    originalLocalStorage = global.localStorage;

    const localStorageMock = {
      getItem: (key: string) => mockStorage[key] ?? null,
      setItem: (key: string, value: string) => { mockStorage[key] = value; },
      removeItem: (key: string) => { delete mockStorage[key]; },
      clear: () => { mockStorage = {}; },
      length: 0,
      key: () => null,
    };

    Object.defineProperty(global, 'localStorage', {
      value: localStorageMock,
      writable: true,
    });

    // Mock navigator.language
    originalNavigator = global.navigator;
  });

  afterEach(() => {
    // Restore originals
    Object.defineProperty(global, 'localStorage', {
      value: originalLocalStorage,
      writable: true,
    });
    Object.defineProperty(global, 'navigator', {
      value: originalNavigator,
      writable: true,
    });
  });

  function setNavigatorLanguage(lang: string) {
    Object.defineProperty(global, 'navigator', {
      value: { language: lang },
      writable: true,
    });
  }

  describe('translations', () => {
    it('has English translations', () => {
      expect(translations.en).toBeDefined();
      expect(Object.keys(translations.en).length).toBeGreaterThan(0);
    });

    it('has Spanish translations', () => {
      expect(translations.es).toBeDefined();
      expect(Object.keys(translations.es).length).toBeGreaterThan(0);
    });

    it('has same keys in both languages', () => {
      const enKeys = Object.keys(translations.en).sort();
      const esKeys = Object.keys(translations.es).sort();
      expect(enKeys).toEqual(esKeys);
    });

    it('has non-empty values for all keys', () => {
      for (const lang of ['en', 'es'] as SupportedLang[]) {
        for (const [key, value] of Object.entries(translations[lang])) {
          expect(value, `${lang}.${key} should not be empty`).toBeTruthy();
        }
      }
    });
  });

  describe('detectLanguage', () => {
    it('returns stored language from localStorage (en)', () => {
      mockStorage[STORAGE_KEY] = 'en';
      setNavigatorLanguage('es-ES');
      expect(detectLanguage()).toBe('en');
    });

    it('returns stored language from localStorage (es)', () => {
      mockStorage[STORAGE_KEY] = 'es';
      setNavigatorLanguage('en-US');
      expect(detectLanguage()).toBe('es');
    });

    it('ignores invalid stored language', () => {
      mockStorage[STORAGE_KEY] = 'fr';
      setNavigatorLanguage('en-US');
      expect(detectLanguage()).toBe('en');
    });

    it('falls back to browser language when no stored preference (es)', () => {
      setNavigatorLanguage('es-MX');
      expect(detectLanguage()).toBe('es');
    });

    it('falls back to browser language when no stored preference (es-ES)', () => {
      setNavigatorLanguage('es-ES');
      expect(detectLanguage()).toBe('es');
    });

    it('defaults to English for unsupported browser language', () => {
      setNavigatorLanguage('fr-FR');
      expect(detectLanguage()).toBe('en');
    });

    it('defaults to English for English browser variants', () => {
      setNavigatorLanguage('en-GB');
      expect(detectLanguage()).toBe('en');
    });

    it('handles uppercase browser language', () => {
      setNavigatorLanguage('ES-AR');
      expect(detectLanguage()).toBe('es');
    });
  });

  describe('saveLanguage', () => {
    it('saves language to localStorage', () => {
      saveLanguage('es');
      expect(mockStorage[STORAGE_KEY]).toBe('es');
    });

    it('overwrites previous language', () => {
      saveLanguage('es');
      saveLanguage('en');
      expect(mockStorage[STORAGE_KEY]).toBe('en');
    });
  });

  describe('translate', () => {
    it('returns English translation', () => {
      expect(translate('en', 'app.title')).toBe('Excel2ERP Config Editor');
    });

    it('returns Spanish translation', () => {
      expect(translate('es', 'app.title')).toBe('Editor de Configuración Excel2ERP');
    });

    it('returns key if translation is missing', () => {
      expect(translate('en', 'nonexistent.key')).toBe('nonexistent.key');
    });

    it('translates all documented keys', () => {
      const knownKeys = [
        'app.title',
        'picker.title',
        'picker.description',
        'picker.button',
        'header.open',
        'header.save',
        'header.unsaved',
        'nav.schema',
        'nav.sources',
        'schema.title',
        'sources.title',
        'detail.back',
        'excel.title',
        'error.prefix',
        'popup.title',
        'popup.cell',
        'popup.value',
        'popup.assignTo',
        'popup.noFields',
        'popup.cancel',
        'popup.alreadyMapped',
      ];

      for (const key of knownKeys) {
        expect(translate('en', key), `en.${key}`).not.toBe(key);
        expect(translate('es', key), `es.${key}`).not.toBe(key);
      }
    });
  });
});
