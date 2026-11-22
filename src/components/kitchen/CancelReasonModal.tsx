'use client';

import React, { useState } from 'react';
import { AlertCircle, X } from 'lucide-react';

interface CancelReasonModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  onConfirm: (reason: string) => void;
}

const COMMON_REASONS = [
  'Ingredient Out of Stock',
  'Customer changed mind',
  'Duplicate entry',
  'Kitchen overload / delay',
  'Special request cannot be fulfilled',
];

export function CancelReasonModal({
  isOpen,
  onClose,
  title,
  onConfirm,
}: CancelReasonModalProps) {
  const [reason, setReason] = useState(COMMON_REASONS[0]);
  const [customReason, setCustomReason] = useState('');

  if (!isOpen) return null;

  const handleConfirm = () => {
    const finalReason = customReason.trim() ? customReason.trim() : reason;
    onConfirm(finalReason);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700 text-white w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-rose-400">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <h3 className="font-bold text-base text-white">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-slate-400">
          Please select or enter a cancellation reason. This will be logged in the restaurant audit trail.
        </p>

        {/* Quick Reasons */}
        <div className="space-y-1.5">
          {COMMON_REASONS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => {
                setReason(r);
                setCustomReason('');
              }}
              className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium border transition cursor-pointer ${
                reason === r && !customReason
                  ? 'bg-rose-500/20 border-rose-500/50 text-rose-300'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750'
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        {/* Custom text */}
        <div>
          <input
            type="text"
            placeholder="Or type custom reason..."
            value={customReason}
            onChange={(e) => setCustomReason(e.target.value)}
            className="w-full text-xs p-3 bg-slate-800 border border-slate-700 focus:border-rose-500 rounded-xl outline-none text-white placeholder-slate-500 transition"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 px-4 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-semibold text-slate-300 transition cursor-pointer"
          >
            Keep Order
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="flex-1 py-2.5 px-4 bg-rose-600 hover:bg-rose-700 rounded-xl text-xs font-bold text-white transition cursor-pointer shadow-md"
          >
            Confirm Cancellation
          </button>
        </div>
      </div>
    </div>
  );
}
