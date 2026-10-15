import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Camera, 
  FlipHorizontal, 
  Flashlight, 
  FlashlightOff, 
  AlertCircle, 
  CheckCircle2, 
  Volume2, 
  VolumeX, 
  Keyboard, 
  Sparkles,
  RefreshCw,
  Loader2
} from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

// অডিও বীপ ফিডব্যাক (Web Audio API - শূন্য এক্সটার্নাল ফাইল নির্ভরতা)
const playBeep = () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    // হাই পিচ ক্রিস্প POS কনফার্মেশন বীপ (1850 Hz)
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1850, ctx.currentTime);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.12);
  } catch (e) {
    console.warn('Audio feedback error:', e);
  }
};

export default function BarcodeScannerModal({
  isOpen,
  onClose,
  onScan,
  title = 'বারকোড স্ক্যানার (মোবাইল / ওয়েবক্যাম)'
}) {
  const [cameras, setCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isInitializing, setIsInitializing] = useState(true);
  const [scannedResult, setScannedResult] = useState(null);

  const html5QrCodeRef = useRef(null);
  const scannerContainerId = 'interactive-barcode-scanner-box';

  useEffect(() => {
    if (!isOpen) {
      stopScanner();
      setScannedResult(null);
      setErrorMessage('');
      setManualCode('');
      return;
    }

    let isMounted = true;
    setIsInitializing(true);
    setErrorMessage('');
    setScannedResult(null);

    // ক্যামেরা আবিষ্কার ও ইনিশিয়ালাইজেশন
    const initScanner = async () => {
      try {
        const devices = await Html5Qrcode.getCameras();
        if (!isMounted) return;

        if (!devices || devices.length === 0) {
          setErrorMessage('ডিভাইসে কোনো ক্যামেরা পাওয়া যায়নি। দয়া করে ক্যামেরা সংযুক্ত করুন অথবা ম্যানুয়ালি কোড লিখুন।');
          setIsInitializing(false);
          return;
        }

        setCameras(devices);

        // পেছনের ক্যামেরা (Environment / Back Camera) অগ্রাধিকার দেওয়া
        const backCamera = devices.find(
          (d) => 
            d.label.toLowerCase().includes('back') || 
            d.label.toLowerCase().includes('rear') ||
            d.label.toLowerCase().includes('environment')
        ) || devices[0];

        const targetCamId = backCamera.id;
        setSelectedCameraId(targetCamId);

        // স্ক্যানার স্টার্ট করা
        await startCamera(targetCamId);
      } catch (err) {
        console.error('Camera access error:', err);
        if (isMounted) {
          setErrorMessage(
            err.name === 'NotAllowedError' || err.message?.includes('Permission')
              ? 'ক্যামেরা ব্যবহারের অনুমতি (Permission) প্রয়োজন। ব্রাউজার সেটিংসে ক্যামেরার অনুমতি দিন অথবা নিচের বক্সে কোড টাইপ করুন।'
              : `ক্যামেরা চালু করতে সমস্যা হয়েছে: ${err.message || 'অজানা ত্রুটি'}`
          );
          setIsInitializing(false);
        }
      }
    };

    // সামান্য ডিলে দিয়ে DOM রেন্ডার নিশ্চিত করে ক্যামেরা চালু
    const timer = setTimeout(initScanner, 200);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      stopScanner();
    };
  }, [isOpen]);

  // ক্যামেরা চালু করার ফাংশন
  const startCamera = async (cameraId) => {
    try {
      setIsInitializing(true);
      setErrorMessage('');

      if (html5QrCodeRef.current) {
        await stopScanner();
      }

      const html5QrCode = new Html5Qrcode(scannerContainerId, {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.ITF,
          Html5QrcodeSupportedFormats.CODABAR,
        ],
        verbose: false
      });

      html5QrCodeRef.current = html5QrCode;

      const config = {
        fps: 15,
        qrbox: (viewfinderWidth, viewfinderHeight) => {
          // বারকোড রিডিংয়ের জন্য ওয়াইড ভিউবক্স (Wide scanning aspect ratio)
          const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
          const width = Math.min(viewfinderWidth * 0.88, 380);
          const height = Math.min(viewfinderHeight * 0.45, 180);
          return { width: Math.round(width), height: Math.round(height) };
        },
        aspectRatio: 1.333334,
      };

      await html5QrCode.start(
        cameraId,
        config,
        (decodedText) => {
          handleScanSuccess(decodedText);
        },
        () => {
          // স্ক্যান ফ্রেম এরর ইগনোর (কন্টিনিউয়াস স্ক্যানিং)
        }
      );

      // ফ্ল্যাশলাইট / টর্চ সমর্থন যাচাই
      try {
        const capabilities = html5QrCode.getRunningTrackCapabilities?.();
        if (capabilities && 'torch' in capabilities) {
          setHasTorch(true);
        }
      } catch (torchErr) {
        console.warn('Torch not supported:', torchErr);
      }

      setIsInitializing(false);
    } catch (err) {
      console.error('Failed to start camera:', err);
      setErrorMessage(`ক্যামেরা চালু করা যায়নি: ${err.message || 'ত্রুটি'}`);
      setIsInitializing(false);
    }
  };

  // ক্যামেরা বন্ধ করার ফাংশন
  const stopScanner = async () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
        html5QrCodeRef.current.clear();
      } catch (err) {
        console.warn('Error stopping scanner:', err);
      } finally {
        html5QrCodeRef.current = null;
      }
    }
  };

  // ক্যামেরা পরিবর্তন (Flip Camera)
  const handleSwitchCamera = async () => {
    if (cameras.length <= 1) return;
    const currentIndex = cameras.findIndex((c) => c.id === selectedCameraId);
    const nextIndex = (currentIndex + 1) % cameras.length;
    const nextCamera = cameras[nextIndex];
    setSelectedCameraId(nextCamera.id);
    await startCamera(nextCamera.id);
  };

  // টর্চ অন/অফ
  const handleToggleTorch = async () => {
    if (!html5QrCodeRef.current || !hasTorch) return;
    try {
      const nextTorch = !torchOn;
      await html5QrCodeRef.current.applyVideoConstraints({
        advanced: [{ torch: nextTorch }]
      });
      setTorchOn(nextTorch);
    } catch (err) {
      console.warn('Torch toggle failed:', err);
    }
  };

  // সফল স্ক্যান হ্যান্ডলার
  const handleScanSuccess = (code) => {
    const cleanCode = String(code).trim();
    if (!cleanCode) return;

    if (!isMuted) {
      playBeep();
    }

    if (navigator.vibrate) {
      try {
        navigator.vibrate(80);
      } catch {}
    }

    setScannedResult(cleanCode);

    // অল্প ডিলে দিয়ে যাতে ইউজার সাফল্য দেখতে পায়, এরপর ক্লোজ
    setTimeout(() => {
      stopScanner();
      onScan(cleanCode);
      onClose();
    }, 400);
  };

  // ম্যানুয়াল ইনপুট সাবমিট
  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (manualCode.trim()) {
      handleScanSuccess(manualCode.trim());
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
        
        {/* হেডার বার */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white select-none">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black tracking-tight">{title}</h3>
              <p className="text-[11px] text-slate-300">পণ্যটির বারকোড ক্যামেরার সামনে ধরুন</p>
            </div>
          </div>

          <div className="flex items-center space-x-1.5">
            {/* ক্যামেরা ফ্লিপ বাটন */}
            {cameras.length > 1 && (
              <button
                type="button"
                onClick={handleSwitchCamera}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center transition-all cursor-pointer"
                title="ক্যামেরা পরিবর্তন করুন"
              >
                <FlipHorizontal className="w-4 h-4" />
              </button>
            )}

            {/* টর্চ বাটন */}
            {hasTorch && (
              <button
                type="button"
                onClick={handleToggleTorch}
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                  torchOn ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                }`}
                title={torchOn ? 'ফ্ল্যাশলাইট বন্ধ করুন' : 'ফ্ল্যাশলাইট চালু করুন'}
              >
                {torchOn ? <Flashlight className="w-4 h-4" /> : <FlashlightOff className="w-4 h-4" />}
              </button>
            )}

            {/* অডিও টগল বাটন */}
            <button
              type="button"
              onClick={() => setIsMuted(!isMuted)}
              className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center transition-all cursor-pointer"
              title={isMuted ? 'সাউন্ড চালু করুন' : 'সাউন্ড বন্ধ করুন'}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-slate-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
            </button>

            {/* ক্লোজ বাটন */}
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer ml-1"
              title="বন্ধ করুন"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ক্যামেরা ভিউফাইন্ডার এরিয়া */}
        <div className="relative bg-slate-950 flex flex-col items-center justify-center overflow-hidden min-h-[300px] sm:min-h-[340px]">
          
          {/* ক্যামেরা কন্টেইনার */}
          <div 
            id={scannerContainerId} 
            className="w-full h-full max-h-[360px] overflow-hidden flex items-center justify-center [&>video]:w-full [&>video]:h-full [&>video]:object-cover"
          />

          {/* লোডিং ইন্ডিকেটর */}
          {isInitializing && (
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs flex flex-col items-center justify-center text-white space-y-2 z-20">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
              <span className="text-xs font-bold tracking-wide">ক্যামেরা সংযোগ হচ্ছে...</span>
            </div>
          )}

          {/* স্ক্যানার ওভারলে ও অ্যানিমেশন বার */}
          {!isInitializing && !errorMessage && !scannedResult && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10 p-6">
              {/* ফোকাস ফ্রেম */}
              <div className="w-[85%] max-w-[340px] h-[160px] border-2 border-emerald-400/80 rounded-2xl relative shadow-[0_0_20px_rgba(16,185,129,0.35)] overflow-hidden bg-emerald-500/5">
                {/* কোণা মার্কারসমূহ */}
                <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-emerald-400"></div>
                <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-emerald-400"></div>
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-emerald-400"></div>
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-emerald-400"></div>

                {/* স্ক্যান লেজার লাইন অ্যানিমেশন */}
                <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_#34d399] animate-[scannerLaser_2s_ease-in-out_infinite]" />
              </div>

              {/* সহায়তা নির্দেশিকা */}
              <div className="absolute bottom-4 px-3 py-1 bg-slate-900/80 backdrop-blur-xs rounded-full text-[11px] font-semibold text-emerald-300 border border-emerald-500/30 flex items-center space-x-1.5 shadow-md">
                <Sparkles className="w-3 h-3 text-emerald-400" />
                <span>বারকোডটি ফ্রেমের সোজা রাখুন</span>
              </div>
            </div>
          )}

          {/* স্ক্যান সফল কনফার্মেশন ওভারলে */}
          {scannedResult && (
            <div className="absolute inset-0 bg-emerald-950/90 backdrop-blur-sm flex flex-col items-center justify-center text-white space-y-3 z-30 animate-in fade-in zoom-in-95">
              <div className="w-16 h-16 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center shadow-lg shadow-emerald-500/40">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <div className="text-center px-4">
                <span className="text-xs uppercase tracking-wider text-emerald-300 font-bold block">
                  সফলভাবে স্ক্যান সম্পন্ন!
                </span>
                <span className="text-xl font-mono font-black text-white block mt-1">
                  {scannedResult}
                </span>
              </div>
            </div>
          )}

          {/* এরর ওভারলে */}
          {errorMessage && (
            <div className="absolute inset-0 bg-slate-900/95 p-6 flex flex-col items-center justify-center text-center text-white space-y-3 z-20">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center">
                <AlertCircle className="w-6 h-6" />
              </div>
              <p className="text-xs text-rose-200 max-w-xs leading-relaxed font-medium">
                {errorMessage}
              </p>
              <button
                type="button"
                onClick={() => selectedCameraId && startCamera(selectedCameraId)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center space-x-1.5 shadow-md transition-all cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>পুনরায় চেষ্টা করুন</span>
              </button>
            </div>
          )}

        </div>

        {/* ম্যানুয়াল ইনপুট সেকশন (যদি ক্যামেরা স্ক্যান করতে না পারে) */}
        <div className="p-4 bg-slate-50 border-t border-slate-200">
          <form onSubmit={handleManualSubmit} className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span className="font-bold flex items-center space-x-1.5">
                <Keyboard className="w-3.5 h-3.5 text-indigo-600" />
                <span>অথবা সরাসরি বারকোড টাইপ / পেস্ট করুন:</span>
              </span>
              <span className="text-[10px] text-slate-400">হ্যান্ডহেল্ড স্ক্যানারও কাজ করবে</span>
            </div>

            <div className="flex space-x-2">
              <input
                type="text"
                placeholder="যেমন: 890123456789..."
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
              />
              <button
                type="submit"
                disabled={!manualCode.trim()}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer"
              >
                যুক্ত করুন
              </button>
            </div>
          </form>
        </div>

      </div>

      <style>{`
        @keyframes scannerLaser {
          0% { transform: translateY(0px); opacity: 0.2; }
          50% { transform: translateY(158px); opacity: 1; }
          100% { transform: translateY(0px); opacity: 0.2; }
        }
      `}</style>
    </div>
  );
}
