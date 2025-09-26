
import * as Localization from 'expo-localization';
import { I18n } from 'i18n-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import translations
import en from '../locales/en.json';
import it from '../locales/it.json';
import fr from '../locales/fr.json';

// Create i18n instance
const i18n = new I18n({
  en,
  it,
  fr,
});

// Get device locale using the correct API
const deviceLocales = Localization.getLocales();
const deviceLocale = deviceLocales[0]?.languageCode || 'en';

// Set the locale once at the beginning of your app
i18n.locale = deviceLocale;

// When a value is missing from a language it'll fall back to another language with the key present
i18n.enableFallback = true;
i18n.defaultLocale = 'en';

// Storage key for persisting language preference
const LANGUAGE_STORAGE_KEY = 'user_language';

// Function to get stored language preference
export const getStoredLanguage = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
  } catch (error) {
    console.log('Error getting stored language:', error);
    return null;
  }
};

// Function to store language preference
export const storeLanguage = async (language: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    i18n.locale = language;
  } catch (error) {
    console.log('Error storing language:', error);
  }
};

// Function to initialize language
export const initializeLanguage = async (): Promise<void> => {
  try {
    const storedLanguage = await getStoredLanguage();
    if (storedLanguage) {
      i18n.locale = storedLanguage;
    } else {
      // Use device locale if available, otherwise default to English
      const locales = Localization.getLocales();
      const primaryLocale = locales[0]?.languageCode || 'en';
      if (['en', 'it', 'fr'].includes(primaryLocale)) {
        i18n.locale = primaryLocale;
      } else {
        i18n.locale = 'en';
      }
    }
  } catch (error) {
    console.log('Error initializing language:', error);
    i18n.locale = 'en';
  }
};

// Function to change language
export const changeLanguage = async (language: string): Promise<void> => {
  await storeLanguage(language);
};

// Function to get available languages
export const getAvailableLanguages = () => [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
];

// Function to get current language
export const getCurrentLanguage = () => i18n.locale;

export default i18n;
