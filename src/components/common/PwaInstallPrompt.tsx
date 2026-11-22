'use client';

import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, Share } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/context';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function PwaInstallPrompt() {
  const { t } = useTranslation();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIos, setIsIos] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [isDismissed, setIsDismissed] = useState(true);

  useEffect(() => {
    // Check if previously dismissed in this session
    try {
      if (sessionStorage.getItem('tableqr_pwa_dismissed') === 'true') {
        return;
      }
    } catch {
      // Ignored
    }

    // Register service worker if supported
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.warn('[TableQR PWA] SW registration failed:', err);
      });
    }

    // Android / Desktop Chrome PWA handler
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsDismissed(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // iOS Safari detection
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      ('standalone' in window.navigator && (window.navigator as unknown as { standalone: boolean }).standalone);

    if (isIosDevice && !isStandalone) {
      setIsIos(true);
      // Wait 3 seconds before displaying prompt gently on iOS
      const timer = setTimeout(() => {
        setIsDismissed(false);
      }, 3000);
      return () => clearTimeout(timer);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsDismissed(true);
      }
      setDeferredPrompt(null);
    } else if (isIos) {
      setShowIosGuide(true);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    setShowIosGuide(false);
    try {
      sessionStorage.setItem('tableqr_pwa_dismissed', 'true');
    } catch {
      // Ignored
    }
  };

  if (isDismissed) return null;

  return (
    <>
      {/* Floating PWA Banner */}
      <div className="fixed bottom-20 left-4 right-4 z-40 max-w-md mx-auto animate-in fade-in slide-in-from-bottom-3 duration-300">
        <div className="bg-slate-900/95 border border-emerald-500/40 rounded-2xl p-3.5 shadow-2xl backdrop-blur-md flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <Smartphone className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h4 className="text-xs font-black text-white">{t('installAppTitle')}</h4>
              <p className="text-[11px] text-slate-400 font-medium leading-tight">
                {t('installAppDesc')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleInstallClick}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow-md shadow-emerald-600/30 flex items-center gap-1 transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{t('installButton')}</span>
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              className="p-1.5 text-slate-500 hover:text-slate-300 rounded-lg transition cursor-pointer"
              aria-label={t('dismiss')}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* iOS Safari Add to Home Screen Instructions Modal */}
      {showIosGuide && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-sm p-5 space-y-4 shadow-2xl text-center">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
              <Share className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">Add to Home Screen</h3>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                To install on iOS Safari:
              </p>
              <ol className="text-xs text-slate-400 text-left space-y-2 mt-3 bg-slate-950 p-3.5 rounded-xl border border-slate-800 font-medium">
                <li className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-200 text-[10px] font-bold flex items-center justify-center shrink-0">
                    1
                  </span>
                  <span>Tap the <strong>Share</strong> button at bottom of Safari</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-200 text-[10px] font-bold flex items-center justify-center shrink-0">
                    2
                  </span>
                  <span>Scroll down & tap <strong>&quot;Add to Home Screen&quot;</strong></span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-200 text-[10px] font-bold flex items-center justify-center shrink-0">
                    3
                  </span>
                  <span>Tap <strong>Add</strong> in the top-right corner</span>
                </li>
              </ol>
            </div>
            <button
              type="button"
              onClick={() => setShowIosGuide(false)}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}
