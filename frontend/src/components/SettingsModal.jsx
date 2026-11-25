import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import SettingsView from './SettingsView';

/**
 * SettingsModal - ব্যাকওয়ার্ড কম্প্যাটিবিলিটির জন্য Slide-over/Clean Modal Wrapper
 */
export default function SettingsModal({
  isOpen,
  onClose,
  settings = {},
  onSaveSettings,
  onTestConnection
}) {
  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e) => {
      if (e.key === 'Escape' && onClose) onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[90] overflow-y-auto bg-neutral-950/40 flex items-center justify-center p-3 sm:p-5">
      <div className="bg-[#FAFAFA] rounded-lg border border-neutral-200/80 max-w-5xl w-full max-h-[92vh] overflow-y-auto p-5 sm:p-6 relative">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close settings"
          className="absolute top-4 right-4 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-md border border-neutral-200/80 bg-white text-[#525252] hover:text-[#111111] hover:bg-neutral-100 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
        <SettingsView
          settings={settings}
          onSaveSettings={onSaveSettings}
          onTestConnection={onTestConnection}
          onClose={onClose}
        />
      </div>
    </div>
  );
}
