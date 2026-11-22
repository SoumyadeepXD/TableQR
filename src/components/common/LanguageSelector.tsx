'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Globe, Check, ChevronDown } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/context';
import { Language, SUPPORTED_LANGUAGES } from '@/lib/i18n/types';

interface LanguageSelectorProps {
  variant?: 'pill' | 'dropdown' | 'compact';
  className?: string;
}

export function LanguageSelector({ variant = 'pill', className = '' }: LanguageSelectorProps) {
  const { language, setLanguage } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (variant === 'pill') {
    return (
      <div
        className={`inline-flex items-center bg-slate-900/90 border border-slate-800 rounded-full p-0.5 text-xs font-bold backdrop-blur-md shadow-sm ${className}`}
        role="group"
        aria-label="Language selection"
      >
        <span className="pl-2 pr-1 text-slate-400">
          <Globe className="w-3.5 h-3.5 text-slate-400" />
        </span>
        {SUPPORTED_LANGUAGES.map((lang) => {
          const isActive = language === lang.code;
          return (
            <button
              key={lang.code}
              type="button"
              onClick={() => setLanguage(lang.code)}
              className={`px-2.5 py-1 rounded-full transition-all cursor-pointer text-[11px] font-bold ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-sm font-extrabold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
              title={lang.name}
            >
              {lang.nativeName}
            </button>
          );
        })}
      </div>
    );
  }

  const currentLang = SUPPORTED_LANGUAGES.find((l) => l.code === language) || SUPPORTED_LANGUAGES[0];

  return (
    <div className={`relative inline-block ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="px-2.5 py-1.5 bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 rounded-xl text-xs font-bold text-slate-200 flex items-center gap-1.5 backdrop-blur-sm transition cursor-pointer"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <Globe className="w-3.5 h-3.5 text-emerald-400" />
        <span>{currentLang.nativeName}</span>
        <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-36 bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl py-1.5 z-50 animate-in fade-in zoom-in-95">
          <div className="px-3 py-1 text-[10px] uppercase tracking-wider font-extrabold text-slate-500 border-b border-slate-800">
            Language
          </div>
          {SUPPORTED_LANGUAGES.map((lang) => {
            const isActive = language === lang.code;
            return (
              <button
                key={lang.code}
                type="button"
                onClick={() => {
                  setLanguage(lang.code);
                  setIsOpen(false);
                }}
                className={`w-full px-3 py-2 text-left text-xs font-semibold flex items-center justify-between hover:bg-slate-900 transition ${
                  isActive ? 'text-emerald-400 font-bold bg-emerald-950/30' : 'text-slate-300'
                }`}
              >
                <span>{lang.nativeName}</span>
                {isActive && <Check className="w-3.5 h-3.5 text-emerald-400" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
