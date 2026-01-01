import React, { useState } from 'react';
import { Upload, Loader2, Sparkles } from 'lucide-react';

interface ArtUploaderProps {
  onArtProcessed: (artUrl: string) => void;
}

const ArtUploader: React.FC<ArtUploaderProps> = ({ onArtProcessed }) => {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);

    try {
      // Dynamically import the library to avoid server-side issues and reduce initial bundle size
      const { removeBackground } = await import('@imgly/background-removal');
      
      // Process the image locally
      const blob = await removeBackground(file);
      
      // Convert Blob to URL
      const url = URL.createObjectURL(blob);
      
      onArtProcessed(url);

    } catch (error) {
      console.error("Background Removal Failed:", error);
      
      // Fallback: If WebAssembly/SharedArrayBuffer fails (e.g. invalid headers), 
      // just use the original image so the user isn't blocked.
      alert("AI Background removal failed (likely due to missing browser headers). Using original image.");
      const url = URL.createObjectURL(file);
      onArtProcessed(url);
      
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <label className={`
      relative group cursor-pointer 
      ${isProcessing ? 'bg-gray-100 cursor-wait' : 'bg-blue-600 hover:bg-blue-700'} 
      text-white px-6 py-3 rounded-2xl transition-all shadow-lg shadow-blue-100
      flex items-center gap-2 overflow-hidden
    `}>
      {isProcessing ? (
        <>
          <Loader2 className="animate-spin text-blue-600" size={20} />
          <span className="font-bold text-blue-900">Segmenting Art...</span>
          
          {/* Visual "Scan" Effect */}
          <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/30 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]"></div>
        </>
      ) : (
        <>
          <Sparkles size={20} /> 
          <span className="font-bold">Add Art (AI)</span>
        </>
      )}
      
      <input 
        type="file" 
        className="hidden" 
        onChange={handleFileChange} 
        disabled={isProcessing}
        accept="image/*"
      />
    </label>
  );
};

export default ArtUploader;
