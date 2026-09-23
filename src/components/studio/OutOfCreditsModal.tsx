// Bidou AI Out Of Credits Modal
import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, CreditCard, Sparkles, X } from 'lucide-react';
import { GenerationType } from '../../types';
import { IconTile } from '../common/IconTile';

export interface OutOfCreditsModalProps {
  isOpen: boolean;
  onClose: () => void;
  mediaType: GenerationType;
  requiredCredits: number;
  currentBalance: number;
  variantCount?: number;
  unitCost?: number;
  onBuyCredits: () => void;
  onUpgradePlan: () => void;
}

export const OutOfCreditsModal: React.FC<OutOfCreditsModalProps> = ({
  isOpen,
  onClose,
  mediaType,
  requiredCredits,
  currentBalance,
  variantCount = 1,
  unitCost,
  onBuyCredits,
  onUpgradePlan,
}) => {
  if (!isOpen) return null;

  const calculatedUnitCost = unitCost ?? (variantCount > 1 ? Math.round(requiredCredits / variantCount) : requiredCredits);

  const mediaLabel =
    mediaType === 'video'
      ? 'video generation (Veo 3.1)'
      : mediaType === 'music'
      ? 'studio track creation (Lyria 3 Pro)'
      : 'image rendering (Nano Banana)';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        />

        {/* Modal Card with top/bottom gradient framing accents (Section 10.7) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 10 }}
          className="relative w-full max-w-md rounded-2xl overlay-panel p-6 overflow-hidden"
        >
          {/* Top subtle gradient bar */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-brand-gradient" />

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-[#6B6B75] dark:text-[#A0A0AA] hover:text-[#FF4B4B] hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>

          <div className="flex flex-col items-center text-center">
            {/* Warning Icon Badge */}
            <IconTile icon={<AlertCircle size={28} />} tone="amber" size="lg" className="w-14 h-14 rounded-2xl mb-4 border border-[#FFB020]/40" />

            <h3 className="jost text-xl font-bold text-[#1A1A1E] dark:text-[#F5F5F7] mb-2">
              Insufficient Credits
            </h3>

            {variantCount > 1 ? (
              <p className="inter text-xs text-[#6B6B75] dark:text-[#A0A0AA] leading-relaxed mb-4">
                You need <strong className="text-[#F86A00] font-mono font-bold">{requiredCredits.toLocaleString()} credits</strong> for <strong className="text-[#1A1A1E] dark:text-[#F5F5F7]">{variantCount}× {mediaType}</strong> ({variantCount} × {calculatedUnitCost.toLocaleString()}). You have <strong className="font-mono font-bold text-[#1A1A1E] dark:text-[#F5F5F7]">{currentBalance.toLocaleString()}</strong>.
              </p>
            ) : (
              <p className="inter text-xs text-[#6B6B75] dark:text-[#A0A0AA] leading-relaxed mb-4">
                You are out of credits for <strong className="text-[#1A1A1E] dark:text-[#F5F5F7]">{mediaLabel}</strong>.
                This generation requires <strong className="text-[#F86A00] font-mono font-bold">{requiredCredits.toLocaleString()} credits</strong>, but your wallet currently holds <strong className="font-mono font-bold text-[#1A1A1E] dark:text-[#F5F5F7]">{currentBalance.toLocaleString()} credits</strong>.
              </p>
            )}

            <div className="w-full p-3 rounded-xl bg-black/5 dark:bg-white/5 border border-[#FF8800]/20 flex items-center justify-between mb-6 text-xs">
              <span className="text-[#6B6B75] dark:text-[#A0A0AA]">Universal Credit Wallet:</span>
              <span className="font-mono font-bold text-[#F86A00]">{currentBalance} XAF equivalent</span>
            </div>

            {/* CTAs */}
            <div className="flex flex-col w-full gap-2.5">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onBuyCredits();
                }}
                className="w-full py-3 rounded-xl text-xs font-bold text-white bg-brand-gradient shadow-lg shadow-[#F86A00]/25 hover:opacity-95 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <CreditCard size={16} />
                <span>Buy Credits</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onUpgradePlan();
                }}
                className="w-full py-2.5 rounded-xl text-xs font-semibold bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-[#1A1A1E] dark:text-[#F5F5F7] hover:border-[#FF8800] active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sparkles size={15} className="text-[#FF8800]" />
                <span>Upgrade Monthly Subscription Plan</span>
              </button>
            </div>
          </div>

          {/* Bottom subtle gradient bar */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-brand-gradient opacity-60" />
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
