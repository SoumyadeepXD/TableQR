'use client';

import React, { useState } from 'react';
import { MessageSquare, X, Send, Copy, Check, Phone, Share2 } from 'lucide-react';
import {
  WhatsAppBillPayload,
  formatWhatsAppBillText,
  buildWhatsAppShareUrl,
  cleanIndianPhoneNumber,
} from '@/lib/whatsapp/formatter';
import { useTranslation } from '@/lib/i18n/context';

interface WhatsAppShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  billPayload: WhatsAppBillPayload;
}

export function WhatsAppShareModal({ isOpen, onClose, billPayload }: WhatsAppShareModalProps) {
  const { t } = useTranslation();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isCopied, setIsCopied] = useState(false);

  if (!isOpen) return null;

  const billMessage = formatWhatsAppBillText(billPayload);
  const cleanedDigits = cleanIndianPhoneNumber(phoneNumber);
  const isValidPhone = cleanedDigits.length === 10;

  const handleShareDirect = () => {
    const url = buildWhatsAppShareUrl({
      phone: isValidPhone ? cleanedDigits : null,
      message: billMessage,
    });
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(billMessage);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    } catch {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = billMessage;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Share2 className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <span>{t('shareOnWhatsApp')}</span>
              </h3>
              <p className="text-[11px] text-slate-400 font-medium">
                Instant digital receipt with tax breakdown & digital bill link
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Phone Number Input */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-300 block flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-emerald-400" />
              <span>{t('enterMobileNumber')}</span>
            </label>
            <div className="flex items-center gap-2">
              <div className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-400 font-bold font-mono">
                +91
              </div>
              <input
                type="tel"
                maxLength={14}
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="e.g. 9876543210 (Optional)"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white font-mono font-bold focus:outline-none focus:border-emerald-500 placeholder:text-slate-600"
              />
            </div>
            <p className="text-[10px] text-slate-500">
              Leave blank to pick any contact or group inside WhatsApp
            </p>
          </div>

          {/* WhatsApp Text Preview Card */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
              <span className="flex items-center gap-1">
                <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                <span>Receipt Message Preview</span>
              </span>
              <button
                type="button"
                onClick={handleCopyText}
                className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer font-bold"
              >
                {isCopied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{t('billCopied')}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>{t('copyBillText')}</span>
                  </>
                )}
              </button>
            </div>

            <div className="p-3.5 bg-slate-950 border border-slate-800/80 rounded-2xl font-mono text-[11px] text-emerald-300/90 whitespace-pre-wrap leading-relaxed max-h-56 overflow-y-auto select-all shadow-inner">
              {billMessage}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center gap-3">
          <button
            type="button"
            onClick={handleCopyText}
            className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
          >
            {isCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span>{isCopied ? t('copied') : t('copyBillText')}</span>
          </button>

          <button
            type="button"
            onClick={handleShareDirect}
            className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black text-xs shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span>{isValidPhone ? `Send to +91 ${cleanedDigits}` : t('sendWhatsAppBill')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
