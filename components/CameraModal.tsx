'use client';

import { useState, useRef, useCallback } from 'react';
import Webcam from 'react-webcam';
import Tesseract from 'tesseract.js';
import { Camera, X, ScanText, Check, Loader2, RefreshCw, Send } from 'lucide-react';

interface CameraModalProps {
  mode: 'capture' | 'scan'; // ✅ New Prop
  onClose: () => void;
  onCapture: (imageSrc: string) => void;
  onScan: (text: string) => void;
}

export default function CameraModal({ mode, onClose, onCapture, onScan }: CameraModalProps) {
  const webcamRef = useRef<Webcam>(null);
  const [loading, setLoading] = useState(false);
  const [imgSrc, setImgSrc] = useState<string | null>(null);

  // High-Speed Capture
  const capture = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) setImgSrc(imageSrc);
  }, [webcamRef]);

  const processImage = async () => {
    if (!imgSrc) return;

    if (mode === 'capture') {
      // Direct Photo Upload Mode
      onCapture(imgSrc);
      onClose();
    } else {
      // OCR Scan Mode
      setLoading(true);
      try {
        const { data: { text } } = await Tesseract.recognize(imgSrc, 'eng');
        const cleanText = text.replace(/\s+/g, ' ').trim();
        onScan(cleanText);
        onClose();
      } catch (err) {
        console.error("OCR Error", err);
        alert("Could not read text. Try getting closer.");
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-0 md:p-4 backdrop-blur-md">
      <div className="relative w-full h-full md:h-auto md:max-w-2xl bg-[#1e1f20] md:rounded-3xl overflow-hidden shadow-2xl flex flex-col">
        
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-10 bg-gradient-to-b from-black/80 to-transparent">
          <span className="text-white font-bold text-lg flex items-center gap-2 drop-shadow-md">
            {mode === 'capture' ? <Camera className="text-blue-400" /> : <ScanText className="text-green-400" />}
            {mode === 'capture' ? 'Photo Mode' : 'Text Scanner'}
          </span>
          <button onClick={onClose} className="p-2 bg-black/40 hover:bg-white/20 rounded-full text-white transition-all backdrop-blur-sm">
            <X size={24} />
          </button>
        </div>

        {/* Camera Feed */}
        <div className="flex-1 bg-black relative flex items-center justify-center overflow-hidden">
          {loading && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm">
              <Loader2 size={50} className="text-green-400 animate-spin mb-4" />
              <p className="text-green-400 font-mono animate-pulse">Extracting Text...</p>
            </div>
          )}
          
          {imgSrc ? (
            <img src={imgSrc} alt="Captured" className="w-full h-full object-contain" />
          ) : (
            <Webcam
              audio={false}
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              videoConstraints={{ facingMode: "environment" }}
              className="w-full h-full object-cover"
            />
          )}
        </div>

        {/* Footer Controls */}
        <div className="p-8 bg-[#1e1f20] border-t border-white/5">
          {!imgSrc ? (
            <div className="flex justify-center items-center">
              <button 
                onClick={capture}
                className="w-20 h-20 rounded-full border-4 border-white/30 bg-white hover:scale-105 active:scale-95 transition-all shadow-[0_0_30px_rgba(255,255,255,0.2)] flex items-center justify-center"
              >
                <div className="w-16 h-16 rounded-full border-2 border-black/10" />
              </button>
            </div>
          ) : (
            <div className="flex gap-4">
              <button 
                onClick={() => setImgSrc(null)}
                className="flex-1 py-4 rounded-xl bg-[#2c2d2e] hover:bg-[#3c3d3e] text-gray-200 font-semibold transition-all flex items-center justify-center gap-2"
              >
                <RefreshCw size={20} /> Retake
              </button>
              
              <button 
                onClick={processImage}
                className={`flex-1 py-4 rounded-xl font-bold text-black transition-all flex items-center justify-center gap-2 shadow-lg ${
                  mode === 'capture' 
                    ? 'bg-blue-500 hover:bg-blue-400 shadow-blue-500/20' 
                    : 'bg-green-500 hover:bg-green-400 shadow-green-500/20'
                }`}
              >
                {mode === 'capture' ? <Send size={20} /> : <ScanText size={20} />}
                {mode === 'capture' ? 'Use Photo' : 'Insert Text'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}