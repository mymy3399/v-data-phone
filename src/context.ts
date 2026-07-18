import { createContext } from 'react';

export const LanguageContext = createContext<{ lang: 'th' | 'en'; setLang: (l: 'th' | 'en') => void }>({
  lang: 'th',
  setLang: () => {}
});
