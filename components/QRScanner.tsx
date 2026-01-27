import React, { useEffect, useRef, useState } from "react";
import { Html5QrcodeScanner, Html5Qrcode } from "html5-qrcode";
import { Camera, Upload, X, CheckCircle } from "lucide-react";

interface QRScannerProps {
  onScan: (data: string) => void;
  onClose: () => void;
}

const QRScanner: React.FC<QRScannerProps> = ({ onScan, onClose }) => {
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
      }
    };
  }, []);

  const startScanner = () => {
    setIsCameraActive(true);
    setError(null);
    
    // Use a small delay to ensure the div is rendered
    setTimeout(() => {
      const scanner = new Html5QrcodeScanner(
        "qr-reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        /* verbose= */ false
      );
      
      scanner.render(
        (decodedText) => {
          scanner.clear().catch(console.error);
          setIsCameraActive(false);
          onScan(decodedText);
        },
        (errorMessage) => {
          // Ignore frequent errors during scanning
          if (!errorMessage?.includes("No QR code found")) {
              console.warn(errorMessage);
          }
        }
      );
      
      scannerRef.current = scanner;
    }, 100);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const html5QrCode = new Html5Qrcode("qr-reader-hidden");
    try {
      const decodedText = await html5QrCode.scanFile(file, true);
      onScan(decodedText);
    } catch (err) {
      setError("Could not find a valid QR code in this image.");
      console.error(err);
    } finally {
        html5QrCode.clear();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-gray-900">Import Settings</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {!isCameraActive ? (
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={startScanner}
                className="flex flex-col items-center justify-center p-6 bg-purple-50 border-2 border-dashed border-purple-200 rounded-xl hover:bg-purple-100 transition-colors group"
              >
                <div className="p-3 bg-purple-600 text-white rounded-full mb-3 group-hover:scale-110 transition-transform">
                  <Camera className="w-6 h-6" />
                </div>
                <span className="text-sm font-semibold text-purple-900">Live Camera</span>
                <span className="text-xs text-purple-600 mt-1">Scan from screen</span>
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center p-6 bg-blue-50 border-2 border-dashed border-blue-200 rounded-xl hover:bg-blue-100 transition-colors group"
              >
                <div className="p-3 bg-blue-600 text-white rounded-full mb-3 group-hover:scale-110 transition-transform">
                  <Upload className="w-6 h-6" />
                </div>
                <span className="text-sm font-semibold text-blue-900">Upload Image</span>
                <span className="text-xs text-blue-600 mt-1">From gallery/files</span>
              </button>
            </div>
          ) : (
            <div className="relative">
              <div id="qr-reader" className="overflow-hidden rounded-xl border border-gray-200"></div>
              <button 
                onClick={() => {
                    scannerRef.current?.clear().catch(console.error);
                    setIsCameraActive(false);
                }}
                className="mt-4 w-full py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
              >
                Cancel Camera
              </button>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg border border-red-100 text-center animate-shake">
              {error}
            </div>
          )}

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="image/*"
            className="hidden"
          />
          <div id="qr-reader-hidden" className="hidden"></div>

          <div className="text-center">
            <p className="text-xs text-gray-400">
              Only scan QR codes from people you trust to share their database with you.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRScanner;
