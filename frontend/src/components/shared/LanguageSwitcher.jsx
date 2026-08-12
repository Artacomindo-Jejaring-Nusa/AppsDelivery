import React from 'react';
import { useTranslation } from 'react-i18next';

export default function LanguageSwitcher({ className = '' }) {
  const { i18n } = useTranslation();
  const currentLang = i18n.language?.startsWith('en') ? 'en' : 'id';

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
    localStorage.setItem('i18nextLng', lng);
  };

  return (
    <div className={`inline-flex items-center rounded-lg border border-[#c5c5d3] p-0.5 bg-white text-xs font-bold shadow-xs ${className}`}>
      <button
        type="button"
        onClick={() => changeLanguage('id')}
        className={`px-2 py-1 rounded-md transition-all flex items-center gap-1 ${
          currentLang === 'id'
            ? 'bg-[#00236f] text-white shadow-xs'
            : 'text-[#505f76] hover:text-[#00236f] hover:bg-gray-100'
        }`}
        title="Bahasa Indonesia"
      >
        <span>🇮🇩</span>
        <span>ID</span>
      </button>
      <button
        type="button"
        onClick={() => changeLanguage('en')}
        className={`px-2 py-1 rounded-md transition-all flex items-center gap-1 ${
          currentLang === 'en'
            ? 'bg-[#00236f] text-white shadow-xs'
            : 'text-[#505f76] hover:text-[#00236f] hover:bg-gray-100'
        }`}
        title="English"
      >
        <span>🇬🇧</span>
        <span>EN</span>
      </button>
    </div>
  );
}
