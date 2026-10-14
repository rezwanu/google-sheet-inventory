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
        links[i].classList.add('text-indigo-600', 'underline', 'hover:text-indigo-800');
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
    <div className="border border-slate-300 rounded-xl overflow-hidden bg-white focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent transition-all relative">
      
      {/* রিচ টেক্সট ফরম্যাটিং টুলবার */}
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 bg-slate-50 border-b border-slate-200 text-slate-600">
        
        {/* বোল্ড */}
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            executeCommand('bold');
          }}
          title="বোল্ড (Bold)"
          className="p-1.5 rounded-lg hover:bg-slate-200 active:bg-slate-300 text-slate-700 transition-colors"
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
          className="p-1.5 rounded-lg hover:bg-slate-200 active:bg-slate-300 text-slate-700 transition-colors"
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
          className="p-1.5 rounded-lg hover:bg-slate-200 active:bg-slate-300 text-slate-700 transition-colors"
        >
          <Underline className="w-3.5 h-3.5" />
        </button>

        <span className="w-px h-4 bg-slate-300 mx-1" />

        {/* বামে অ্যালাইন */}
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            executeCommand('justifyLeft');
          }}
          title="বামে অ্যালাইন (Align Left)"
          className="p-1.5 rounded-lg hover:bg-slate-200 active:bg-slate-300 text-slate-700 transition-colors"
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
          className="p-1.5 rounded-lg hover:bg-slate-200 active:bg-slate-300 text-slate-700 transition-colors"
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
          className="p-1.5 rounded-lg hover:bg-slate-200 active:bg-slate-300 text-slate-700 transition-colors"
        >
          <AlignRight className="w-3.5 h-3.5" />
        </button>

        <span className="w-px h-4 bg-slate-300 mx-1" />

        {/* বুলেট লিস্ট */}
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            executeCommand('insertUnorderedList');
          }}
          title="বুলেট লিস্ট (Bullet List)"
          className="p-1.5 rounded-lg hover:bg-slate-200 active:bg-slate-300 text-slate-700 transition-colors"
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
          className="p-1.5 rounded-lg hover:bg-slate-200 active:bg-slate-300 text-slate-700 transition-colors"
        >
          <ListOrdered className="w-3.5 h-3.5" />
        </button>

        <span className="w-px h-4 bg-slate-300 mx-1" />

        {/* লিংক যুক্ত */}
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            handleInsertLink();
          }}
          title="লিংক যুক্ত করুন (Insert Link)"
          className="p-1.5 rounded-lg hover:bg-slate-200 active:bg-slate-300 text-indigo-600 hover:text-indigo-800 transition-colors"
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
          className="p-1.5 rounded-lg hover:bg-slate-200 active:bg-slate-300 text-slate-500 transition-colors"
        >
          <Unlink className="w-3.5 h-3.5" />
        </button>

        <span className="w-px h-4 bg-slate-300 mx-1" />

        {/* ছবি যুক্ত করুন */}
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            handleOpenImageModal();
          }}
          title="ছবি যুক্ত করুন (Insert Image)"
          className="flex items-center space-x-1 px-2 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-medium text-xs transition-colors border border-indigo-200"
        >
          <ImageIcon className="w-3.5 h-3.5" />
          <span className="text-[11px] font-bold">ছবি</span>
        </button>

      </div>

      {/* এডিটেবল টেক্সট এরিয়া */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        data-placeholder={placeholder}
        className="rich-editor-content min-h-[110px] max-h-[220px] overflow-y-auto px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none leading-relaxed empty:before:content-[attr(data-placeholder)] empty:before:text-slate-400 empty:before:pointer-events-none"
        style={{ wordBreak: 'break-word' }}
      />

      {/* ছবি যুক্ত করার পূর্ণাঙ্গ মডাল ডায়ালগ */}
      {isImageModalOpen && (
        <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-150">
            
            {/* মডাল হেডার */}
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center space-x-2">
                <ImageIcon className="w-4 h-4 text-indigo-600" />
                <h4 className="text-sm font-bold text-slate-900">বিবরণীতে ছবি যুক্ত করুন</h4>
              </div>
              <button
                type="button"
                onClick={() => setIsImageModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* মডাল বডি */}
            <div className="p-5 space-y-4">
              
              {/* ট্যাব সিলেকশন: কম্পিউটার আপলোড বনাম ওয়েব লিঙ্ক */}
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => {
                    setImageInputMode('upload');
                    setImageError('');
                  }}
                  className={`flex items-center justify-center space-x-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all ${
                    imageInputMode === 'upload'
                      ? 'bg-white text-indigo-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
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
                  className={`flex items-center justify-center space-x-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all ${
                    imageInputMode === 'url'
                      ? 'bg-white text-indigo-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>ইমেজ URL / লিঙ্ক</span>
                </button>
              </div>

              {/* এরর মেসেজ (যদি থাকে) */}
              {imageError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg flex items-center space-x-2 text-rose-700 text-xs">
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
                    <div className="h-32 border-2 border-dashed border-indigo-200 rounded-xl flex flex-col items-center justify-center bg-indigo-50/50 text-indigo-600">
                      <Loader2 className="w-7 h-7 animate-spin mb-2" />
                      <span className="text-xs font-medium">ছবি অপটিমাইজ ও প্রস্তুত করা হচ্ছে...</span>
                    </div>
                  ) : selectedFileDataUrl ? (
                    <div className="relative border border-slate-200 rounded-xl overflow-hidden bg-slate-50 p-2 flex flex-col items-center">
                      <img
                        src={selectedFileDataUrl}
                        alt="Preview"
                        className="max-h-40 object-contain rounded-lg shadow-2xs"
                      />
                      <button
                        type="button"
                        onClick={() => setSelectedFileDataUrl('')}
                        className="absolute top-3 right-3 p-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-full shadow-md transition-colors"
                        title="ছবি পরিবর্তন করুন"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-[11px] text-emerald-600 font-semibold mt-2 flex items-center">
                        <Check className="w-3 h-3 mr-1" /> ছবি প্রস্তুত হয়েছে
                      </span>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="h-32 border-2 border-dashed border-slate-300 hover:border-indigo-400 rounded-xl flex flex-col items-center justify-center bg-slate-50 hover:bg-indigo-50/30 cursor-pointer transition-all p-4 text-center group"
                    >
                      <div className="p-2 rounded-full bg-white shadow-2xs group-hover:scale-110 transition-transform mb-2">
                        <Upload className="w-5 h-5 text-indigo-600" />
                      </div>
                      <span className="text-xs font-semibold text-slate-700">
                        কম্পিউটার বা ডিভাইস থেকে ছবি নির্বাচন করুন
                      </span>
                      <span className="text-[10px] text-slate-400 mt-0.5">
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
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      অনলাইন ছবির URL লিখুন
                    </label>
                    <input
                      type="url"
                      value={imageUrlInput}
                      onChange={(e) => setImageUrlInput(e.target.value)}
                      placeholder="https://example.com/product-image.jpg"
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>

                  {/* প্রিভিউ */}
                  {imageUrlInput.trim() && (
                    <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50 p-2 flex flex-col items-center">
                      <img
                        src={imageUrlInput.trim()}
                        alt="URL Preview"
                        className="max-h-36 object-contain rounded-lg shadow-2xs"
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
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ছবির বিবরণ / ক্যাপশন (ঐচ্ছিক)
                </label>
                <input
                  type="text"
                  value={imageAltInput}
                  onChange={(e) => setImageAltInput(e.target.value)}
                  placeholder="যেমন: পণ্যের পেছনের ভিউ অথবা ব্যবহারবিধি"
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

            </div>

            {/* মডাল ফুটার বাটন */}
            <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setIsImageModalOpen(false)}
                className="px-3.5 py-1.5 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-100 transition-colors"
              >
                বাতিল
              </button>
              <button
                type="button"
                onClick={handleConfirmInsertImage}
                disabled={!currentPreviewSrc || isCompressing}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors flex items-center space-x-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
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
