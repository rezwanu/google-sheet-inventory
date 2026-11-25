import React, { useRef, useEffect, useState } from 'react';
import { 
  Bold, 
  Italic, 
  Underline, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  List, 
  ListOrdered, 
  Link as LinkIcon, 
  Unlink,
  Image as ImageIcon,
  Upload,
  Globe,
  X,
  Check,
  Loader2,
  AlertCircle
} from 'lucide-react';

// ছবি কম্প্রেস ও রিসাইজ ফাংশন (যাতে Google Sheet-এর সেল লিমিট এবং ব্রাউজার পারফরম্যান্স ঠিক থাকে)
const compressAndResizeImage = (file, maxWidth = 600, maxHeight = 600, quality = 0.7) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxWidth || height > maxHeight) {
          if (width / height > maxWidth / maxHeight) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error('ছবি লোড করতে সমস্যা হয়েছে'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('ফাইল রিড করতে ব্যর্থ হয়েছে'));
    reader.readAsDataURL(file);
  });
};

export default function RichTextEditor({
  value = '',
  onChange,
  placeholder = 'পণ্যের বিস্তারিত বিবরণ লিখুন...'
}) {
  const editorRef = useRef(null);
  const savedRangeRef = useRef(null);
  const fileInputRef = useRef(null);

  // ইমেজ ইনসার্ট মডাল স্টেট
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [imageInputMode, setImageInputMode] = useState('upload'); // 'upload' | 'url'
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [selectedFileDataUrl, setSelectedFileDataUrl] = useState('');
  const [imageAltInput, setImageAltInput] = useState('');
  const [isCompressing, setIsCompressing] = useState(false);
  const [imageError, setImageError] = useState('');

  // ভ্যালু পরিবর্তন হলে কন্টেন্ট আপডেট করা (যখন এডিটর ফোকাসে নেই)
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      if (document.activeElement !== editorRef.current) {
        editorRef.current.innerHTML = value || '';
      }
    }
  }, [value]);

  const handleInput = () => {
    if (editorRef.current && onChange) {
      const html = editorRef.current.innerHTML;
      if (html === '<br>' || html === '<p><br></p>' || html.trim() === '') {
        onChange('');
      } else {
        onChange(html);
      }
    }
  };

  // কার্সর বা সিলেকশন সংরক্ষণ করা
  const saveSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0 && editorRef.current && editorRef.current.contains(selection.anchorNode)) {
      savedRangeRef.current = selection.getRangeAt(0).cloneRange();
    } else {
      savedRangeRef.current = null;
    }
  };

  // সিলেকশন রিস্টোর করা
  const restoreSelection = () => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    const selection = window.getSelection();
    if (savedRangeRef.current) {
      selection.removeAllRanges();
      selection.addRange(savedRangeRef.current);
    } else {
      const range = document.createRange();
      range.selectNodeContents(editorRef.current);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    }
  };

  // সাধারণ ফরম্যাটিং কমান্ড কার্যকর করা
  const executeCommand = (command, val = null) => {
    if (!editorRef.current) return;
    editorRef.current.focus();

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || !editorRef.current.contains(selection.anchorNode)) {
      const range = document.createRange();
      range.selectNodeContents(editorRef.current);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    }

    document.execCommand(command, false, val);
    handleInput();
  };

  // হাইপারলিংক যুক্ত করার ডায়ালগ
  const handleInsertLink = () => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    
    const url = window.prompt('লিংক URL লিখুন (যেমন: https://example.com):', 'https://');
    if (url && url.trim() && url.trim() !== 'https://') {
      executeCommand('createLink', url.trim());

      const links = editorRef.current.getElementsByTagName('a');
      for (let i = 0; i < links.length; i++) {
        links[i].setAttribute('target', '_blank');
        links[i].setAttribute('rel', 'noopener noreferrer');
        links[i].classList.add('text-[#0F172A]', 'underline', 'hover:text-slate-700');
      }
      handleInput();
    }
  };

  // ইমেজ মডাল ওপেন
  const handleOpenImageModal = () => {
    saveSelection();
    setImageInputMode('upload');
    setSelectedFileDataUrl('');
    setImageUrlInput('');
    setImageAltInput('');
    setImageError('');
    setIsImageModalOpen(true);
  };

  // ফাইল সিলেকশন হ্যান্ডলার
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setImageError('অনুগ্রহ করে শুধুমাত্র ছবি ফাইল নির্বাচন করুন (JPEG, PNG, WebP ইত্যাদি)');
      return;
    }

    setImageError('');
    setIsCompressing(true);
    try {
      const compressedDataUrl = await compressAndResizeImage(file, 600, 600, 0.7);
      setSelectedFileDataUrl(compressedDataUrl);
    } catch (err) {
      setImageError(err.message || 'ছবি প্রস্তুত করতে সমস্যা হয়েছে');
    } finally {
      setIsCompressing(false);
    }
  };

  // এডিটরে ছবি যুক্ত নিশ্চিতকরণ
  const handleConfirmInsertImage = () => {
    const src = imageInputMode === 'upload' ? selectedFileDataUrl : imageUrlInput.trim();
    if (!src) {
      setImageError('অনুগ্রহ করে ছবি নির্বাচন করুন বা সঠিক লিঙ্ক প্রদান করুন');
      return;
    }

    restoreSelection();

    const alt = imageAltInput.trim() ? imageAltInput.trim().replace(/"/g, '&quot;') : 'Product Image';
    const imgHtml = `<p><img src="${src}" alt="${alt}" class="rich-img" style="max-width:100%;height:auto;border-radius:8px;margin:8px 0;display:block;" /></p><p><br></p>`;
    
    document.execCommand('insertHTML', false, imgHtml);
    handleInput();

    // মডাল ক্লোজ ও রিসেট
    setIsImageModalOpen(false);
    setSelectedFileDataUrl('');
    setImageUrlInput('');
    setImageAltInput('');
    setImageError('');
  };

  const currentPreviewSrc = imageInputMode === 'upload' ? selectedFileDataUrl : imageUrlInput.trim();

  return (
    <div className="border border-neutral-200/80 rounded-lg overflow-hidden bg-white focus-within:ring-2 focus-within:ring-[#0F172A]/15 focus-within:border-[#0F172A] transition-colors relative">
      
      {/* রিচ টেক্সট ফরম্যাটিং টুলবার */}
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 bg-[#FAFAFA] border-b border-neutral-200/80 text-[#525252]">
        
        {/* বোল্ড */}
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            executeCommand('bold');
          }}
          title="বোল্ড (Bold)"
          className="min-h-[44px] sm:min-h-[36px] px-2 rounded-md hover:bg-[#F5F5F5] active:bg-neutral-200 text-[#111111] transition-colors cursor-pointer"
        >
          <Bold className="w-3.5 h-3.5" />
        </button>

        {/* ইটালিক */}
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            executeCommand('italic');
          }}
          title="ইটালিক (Italic)"
          className="min-h-[44px] sm:min-h-[36px] px-2 rounded-md hover:bg-[#F5F5F5] active:bg-neutral-200 text-[#111111] transition-colors cursor-pointer"
        >
          <Italic className="w-3.5 h-3.5" />
        </button>

        {/* আন্ডারলাইন */}
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            executeCommand('underline');
          }}
          title="আন্ডারলাইন (Underline)"
          className="min-h-[44px] sm:min-h-[36px] px-2 rounded-md hover:bg-[#F5F5F5] active:bg-neutral-200 text-[#111111] transition-colors cursor-pointer"
        >
          <Underline className="w-3.5 h-3.5" />
        </button>

        <span className="w-px h-4 bg-neutral-300 mx-1" />

        {/* বামে অ্যালাইন */}
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            executeCommand('justifyLeft');
          }}
          title="বামে অ্যালাইন (Align Left)"
          className="min-h-[44px] sm:min-h-[36px] px-2 rounded-md hover:bg-[#F5F5F5] active:bg-neutral-200 text-[#111111] transition-colors cursor-pointer"
        >
          <AlignLeft className="w-3.5 h-3.5" />
        </button>

        {/* মাঝে অ্যালাইন */}
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            executeCommand('justifyCenter');
          }}
          title="মাঝে অ্যালাইন (Align Center)"
          className="min-h-[44px] sm:min-h-[36px] px-2 rounded-md hover:bg-[#F5F5F5] active:bg-neutral-200 text-[#111111] transition-colors cursor-pointer"
        >
          <AlignCenter className="w-3.5 h-3.5" />
        </button>

        {/* ডানে অ্যালাইন */}
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            executeCommand('justifyRight');
          }}
          title="ডানে অ্যালাইন (Align Right)"
          className="min-h-[44px] sm:min-h-[36px] px-2 rounded-md hover:bg-[#F5F5F5] active:bg-neutral-200 text-[#111111] transition-colors cursor-pointer"
        >
          <AlignRight className="w-3.5 h-3.5" />
        </button>

        <span className="w-px h-4 bg-neutral-300 mx-1" />

        {/* বুলেট লিস্ট */}
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            executeCommand('insertUnorderedList');
          }}
          title="বুলেট লিস্ট (Bullet List)"
          className="min-h-[44px] sm:min-h-[36px] px-2 rounded-md hover:bg-[#F5F5F5] active:bg-neutral-200 text-[#111111] transition-colors cursor-pointer"
        >
          <List className="w-3.5 h-3.5" />
        </button>

        {/* নম্বর লিস্ট */}
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            executeCommand('insertOrderedList');
          }}
          title="নম্বর লিস্ট (Numbered List)"
          className="min-h-[44px] sm:min-h-[36px] px-2 rounded-md hover:bg-[#F5F5F5] active:bg-neutral-200 text-[#111111] transition-colors cursor-pointer"
        >
          <ListOrdered className="w-3.5 h-3.5" />
        </button>

        <span className="w-px h-4 bg-neutral-300 mx-1" />

        {/* লিংক যুক্ত */}
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            handleInsertLink();
          }}
          title="লিংক যুক্ত করুন (Insert Link)"
          className="min-h-[44px] sm:min-h-[36px] px-2 rounded-md hover:bg-[#F5F5F5] active:bg-neutral-200 text-[#0F172A] transition-colors cursor-pointer"
        >
          <LinkIcon className="w-3.5 h-3.5" />
        </button>

        {/* লিংক অপসারণ */}
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            executeCommand('unlink');
          }}
          title="লিংক অপসারণ করুন (Remove Link)"
          className="min-h-[44px] sm:min-h-[36px] px-2 rounded-md hover:bg-[#F5F5F5] active:bg-neutral-200 text-[#525252] transition-colors cursor-pointer"
        >
          <Unlink className="w-3.5 h-3.5" />
        </button>

        <span className="w-px h-4 bg-neutral-300 mx-1" />

        {/* ছবি যুক্ত করুন */}
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            handleOpenImageModal();
          }}
          title="ছবি যুক্ত করুন (Insert Image)"
          className="min-h-[44px] sm:min-h-[36px] flex items-center space-x-1 px-2.5 py-1 rounded-md bg-[#F5F5F5] hover:bg-neutral-200/70 text-[#111111] font-medium text-xs transition-colors border border-neutral-200/80 cursor-pointer"
        >
          <ImageIcon className="w-3.5 h-3.5 text-[#0F172A]" />
          <span className="text-[11px] font-semibold">ছবি</span>
        </button>

      </div>

      {/* এডিটেবল টেক্সট এরিয়া */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        data-placeholder={placeholder}
        className="rich-editor-content min-h-[110px] max-h-[220px] overflow-y-auto px-3.5 py-2.5 text-xs text-[#111111] focus:outline-none leading-relaxed empty:before:content-[attr(data-placeholder)] empty:before:text-[#737373] empty:before:pointer-events-none"
        style={{ wordBreak: 'break-word' }}
      />

      {/* ছবি যুক্ত করার পূর্ণাঙ্গ মডাল ডায়ালগ */}
      {isImageModalOpen && (
        <div className="fixed inset-0 z-[60] bg-neutral-900/40 flex items-center justify-center p-3 animate-in fade-in duration-150">
          <div className="bg-white rounded-lg border border-neutral-200/80 max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-150">
            
            {/* মডাল হেডার */}
            <div className="px-5 py-3.5 border-b border-neutral-200/80 flex items-center justify-between bg-[#FAFAFA]">
              <div className="flex items-center space-x-2">
                <ImageIcon className="w-4 h-4 text-[#0F172A]" />
                <h4 className="text-sm font-semibold tracking-tight text-[#111111]">বিবরণীতে ছবি যুক্ত করুন</h4>
              </div>
              <button
                type="button"
                onClick={() => setIsImageModalOpen(false)}
                className="min-h-[44px] sm:min-h-[36px] px-2 text-[#737373] hover:text-[#111111] rounded-md hover:bg-[#F5F5F5] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* মডাল বডি */}
            <div className="p-5 space-y-4">
              
              {/* ট্যাব সিলেকশন: কম্পিউটার আপলোড বনাম ওয়েব লিঙ্ক */}
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#F5F5F5] rounded-lg border border-neutral-200/80">
                <button
                  type="button"
                  onClick={() => {
                    setImageInputMode('upload');
                    setImageError('');
                  }}
                  className={`min-h-[44px] sm:min-h-[36px] flex items-center justify-center space-x-1.5 py-1.5 px-3 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                    imageInputMode === 'upload'
                      ? 'bg-[#0F172A] text-white'
                      : 'text-[#525252] hover:text-[#111111]'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>ডিভাইস থেকে আপলোড</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setImageInputMode('url');
                    setImageError('');
                  }}
                  className={`min-h-[44px] sm:min-h-[36px] flex items-center justify-center space-x-1.5 py-1.5 px-3 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                    imageInputMode === 'url'
                      ? 'bg-[#0F172A] text-white'
                      : 'text-[#525252] hover:text-[#111111]'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>ইমেজ URL / লিঙ্ক</span>
                </button>
              </div>

              {/* এরর মেসেজ (যদি থাকে) */}
              {imageError && (
                <div className="p-2.5 bg-red-50 border border-red-200 rounded-md flex items-center space-x-2 text-[#B91C1C] text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{imageError}</span>
                </div>
              )}

              {/* মোড ১: ফাইল আপলোড */}
              {imageInputMode === 'upload' && (
                <div className="space-y-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />

                  {isCompressing ? (
                    <div className="h-32 border-2 border-dashed border-neutral-300 rounded-lg flex flex-col items-center justify-center bg-[#FAFAFA] text-[#525252]">
                      <Loader2 className="w-7 h-7 animate-spin mb-2 text-[#0F172A]" />
                      <span className="text-xs font-medium">ছবি অপটিমাইজ ও প্রস্তুত করা হচ্ছে...</span>
                    </div>
                  ) : selectedFileDataUrl ? (
                    <div className="relative border border-neutral-200/80 rounded-lg overflow-hidden bg-[#FAFAFA] p-2 flex flex-col items-center">
                      <img
                        src={selectedFileDataUrl}
                        alt="Preview"
                        className="max-h-40 object-contain rounded-md border border-neutral-200/80"
                      />
                      <button
                        type="button"
                        onClick={() => setSelectedFileDataUrl('')}
                        className="min-h-[44px] sm:min-h-[36px] px-2 absolute top-3 right-3 bg-[#B91C1C] hover:bg-red-800 text-white rounded-md transition-colors cursor-pointer flex items-center justify-center"
                        title="ছবি পরিবর্তন করুন"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-[11px] text-[#15803D] font-semibold mt-2 flex items-center">
                        <Check className="w-3 h-3 mr-1" /> ছবি প্রস্তুত হয়েছে
                      </span>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="h-32 border-2 border-dashed border-neutral-300 hover:border-[#0F172A] rounded-lg flex flex-col items-center justify-center bg-[#FAFAFA] hover:bg-[#F5F5F5] cursor-pointer transition-colors p-4 text-center group"
                    >
                      <div className="p-2 rounded-md bg-white border border-neutral-200/80 mb-2">
                        <Upload className="w-5 h-5 text-[#0F172A]" />
                      </div>
                      <span className="text-xs font-semibold text-[#111111]">
                        কম্পিউটার বা ডিভাইস থেকে ছবি নির্বাচন করুন
                      </span>
                      <span className="text-[10px] text-[#737373] mt-0.5">
                        PNG, JPG, WebP (স্বয়ংক্রিয়ভাবে অপটিমাইজ করা হবে)
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* মোড ২: ওয়েব URL ইনপুট */}
              {imageInputMode === 'url' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#111111] mb-1">
                      অনলাইন ছবির URL লিখুন
                    </label>
                    <input
                      type="url"
                      value={imageUrlInput}
                      onChange={(e) => setImageUrlInput(e.target.value)}
                      placeholder="https://example.com/product-image.jpg"
                      className="min-h-[44px] sm:min-h-[36px] w-full px-3 py-2 text-xs bg-white border border-neutral-200/80 rounded-md focus:ring-2 focus:ring-[#0F172A]/15 focus:border-[#0F172A] focus:outline-none text-[#111111]"
                    />
                  </div>

                  {/* প্রিভিউ */}
                  {imageUrlInput.trim() && (
                    <div className="border border-neutral-200/80 rounded-lg overflow-hidden bg-[#FAFAFA] p-2 flex flex-col items-center">
                      <img
                        src={imageUrlInput.trim()}
                        alt="URL Preview"
                        className="max-h-36 object-contain rounded-md border border-neutral-200/80"
                        onError={(e) => {
                          e.target.onerror = null;
                          setImageError('ছবির লিঙ্কটি লোড করা সম্ভব হয়নি। সঠিক URL দিন।');
                        }}
                        onLoad={() => setImageError('')}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* অল্টারনেট টেক্সট / ক্যাপশন (ঐচ্ছিক) */}
              <div>
                <label className="block text-xs font-semibold text-[#111111] mb-1">
                  ছবির বিবরণ / ক্যাপশন (ঐচ্ছিক)
                </label>
                <input
                  type="text"
                  value={imageAltInput}
                  onChange={(e) => setImageAltInput(e.target.value)}
                  placeholder="যেমন: পণ্যের পেছনের ভিউ অথবা ব্যবহারবিধি"
                  className="min-h-[44px] sm:min-h-[36px] w-full px-3 py-1.5 text-xs bg-white border border-neutral-200/80 rounded-md focus:ring-2 focus:ring-[#0F172A]/15 focus:border-[#0F172A] focus:outline-none text-[#111111]"
                />
              </div>

            </div>

            {/* মডাল ফুটার বাটন */}
            <div className="px-5 py-3 border-t border-neutral-200/80 bg-[#FAFAFA] flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setIsImageModalOpen(false)}
                className="min-h-[44px] sm:min-h-[36px] px-3.5 py-1.5 border border-neutral-200/80 bg-white text-[#525252] hover:text-[#111111] text-xs font-semibold rounded-md hover:bg-[#F5F5F5] transition-colors cursor-pointer"
              >
                বাতিল
              </button>
              <button
                type="button"
                onClick={handleConfirmInsertImage}
                disabled={!currentPreviewSrc || isCompressing}
                className="min-h-[44px] sm:min-h-[36px] px-4 py-1.5 bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-semibold rounded-md transition-colors flex items-center space-x-1.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>ছবি যুক্ত করুন</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
