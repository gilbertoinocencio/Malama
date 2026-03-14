// i18n/LanguageContext.tsx
// Context provider for managing language state across the app

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Language, translations, Translations, speechLanguageCodes } from './translations';

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: Translations;
    speechLang: string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = 'nura-language';

// Detect browser language
const detectBrowserLanguage = (): Language => {
    const browserLang = navigator.language.toLowerCase();
    if (browserLang.startsWith('pt')) return 'pt';
    if (browserLang.startsWith('es')) return 'es';
    return 'en';
};

// Get initial language from localStorage or browser
const getInitialLanguage = (): Language => {
    if (typeof window !== 'undefined') {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored && ['en', 'pt', 'es'].includes(stored)) {
            return stored as Language;
        }
        return detectBrowserLanguage();
    }
    return 'en';
};

interface LanguageProviderProps {
    children: ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
    const [language, setLanguageState] = useState<Language>(getInitialLanguage);

    const setLanguage = (lang: Language) => {
        setLanguageState(lang);
        localStorage.setItem(STORAGE_KEY, lang);

        // Update document lang attribute
        document.documentElement.lang = lang === 'pt' ? 'pt-BR' : lang === 'es' ? 'es' : 'en';
    };

    useEffect(() => {
        // Set initial document language
        document.documentElement.lang = language === 'pt' ? 'pt-BR' : language === 'es' ? 'es' : 'en';
    }, []);

    const value: LanguageContextType = {
        language,
        setLanguage,
        t: translations[language],
        speechLang: speechLanguageCodes[language],
    };

    return (
        <LanguageContext.Provider value={value}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = (): LanguageContextType => {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
};

// Export for convenience
export type { Language };
export { translations, speechLanguageCodes };
