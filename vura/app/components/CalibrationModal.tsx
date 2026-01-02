import React, { useState, useRef, useEffect } from 'react';
import { Rnd } from 'react-rnd';
import { Ruler, Check } from 'lucide-react';
import { LayoutEngine } from '../utils/layoutEngine';

interface CalibrationModalProps {
  wallImageUrl: string;
  wallImageDimensions: { width: number; height: number };
  onSave: (ppi: number) => void;
  onClose: () => void;
}

const CalibrationModal: React.FC<CalibrationModalProps> = ({ wallImageUrl, wallImageDimensions, onSave, onClose }) => {
  const [lineLengthPx, setLineLengthPx] = useState(200); // Default line length in pixels
  const [realLengthInches, setRealLengthInches] = useState('');

  // We use Rnd to simulate a draggable "ruler" line
  // In a real app, this might be a more sophisticated SVG overlay
  const [rulerPos, setRulerPos] = useState({ x: 50, y: 50 });

  const handleSave = () => {
    const inches = parseFloat(realLengthInches);
    if (!inches || inches <= 0) {
      alert("Please enter a valid length in inches.");
      return;
    }

    const ppi = LayoutEngine.calculatePixelsPerInch(lineLengthPx, inches);
    onSave(ppi);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-card rounded-3xl p-6 w-full max-w-4xl shadow-2xl flex flex-col h-[90vh] border border-border">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2 text-foreground">
              <Ruler className="text-blue-400" /> Calibrate Scale
            </h2>
            <p className="text-gray-400 text-sm mt-1">
              <strong>Step 1:</strong> Drag the blue line ends to match a standard object in your photo (e.g. width of the <strong>Sofa</strong>).<br />
              <strong>Step 2:</strong> Enter the real-world width below (e.g. <strong>80 inches</strong>).
            </p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 transition">Close</button>
        </div>

        {/* Workspace */}
        <div className="relative flex-1 bg-gray-900 rounded-xl overflow-hidden border border-border flex items-center justify-center">
          {/* Wall Image Container - we try to fit it in the modal */}
          <div
            className="relative shadow-lg"
            style={{
              width: wallImageDimensions.width,
              height: wallImageDimensions.height,
              maxWidth: '100%',
              maxHeight: '100%',
              backgroundImage: `url(${wallImageUrl})`,
              backgroundSize: 'contain',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'center',
              aspectRatio: `${wallImageDimensions.width} / ${wallImageDimensions.height}`
            }}
          >
            {/* 
                 For simplicity in this MVP, we are overlaying the Rnd directly.
                 However, if the background-size is 'contain', the image might not fill the div exactly if aspect ratios differ.
                 A robust implementation would calculate the exact rendered dimensions of the image.
                 For now, we assume the user uploads an image that fits reasonably well or we accept slight inaccuracy for the demo.
               */}

            <Rnd
              size={{ width: lineLengthPx, height: 40 }}
              position={{ x: rulerPos.x, y: rulerPos.y }}
              onDragStop={(e, d) => setRulerPos({ x: d.x, y: d.y })}
              onResizeStop={(e, direction, ref, delta, position) => {
                setLineLengthPx(parseInt(ref.style.width));
                setRulerPos(position);
              }}
              bounds="parent"
              enableResizing={{ top: false, right: true, bottom: false, left: true, topRight: false, bottomRight: false, bottomLeft: false, topLeft: false }}
              className="z-10 flex items-center"
            >
              <div className="w-full h-8 flex flex-col items-center justify-center group cursor-grab active:cursor-grabbing">
                {/* The Visual Line */}
                <div className="w-full h-1 bg-blue-600 shadow-sm relative">
                  {/* Endpoints */}
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-blue-600 rounded-full shadow-md"></div>
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-blue-600 rounded-full shadow-md"></div>

                  {/* Resize Handles Hint */}
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition">
                    {lineLengthPx}px
                  </div>
                </div>
              </div>
            </Rnd>
          </div>
        </div>

        {/* Controls */}
        <div className="mt-6 flex items-end gap-4 border-t border-border pt-4">
          <div className="flex-1">
            <label className="block text-sm font-bold text-gray-300 mb-1">
              Real World Length
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={realLengthInches}
                onChange={(e) => setRealLengthInches(e.target.value)}
                placeholder="e.g. 80"
                className="w-full px-4 py-3 bg-gray-900 border border-border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-lg font-mono text-foreground"
                autoFocus
              />
              <span className="text-gray-400 font-bold">inches</span>
            </div>
          </div>

          <button
            onClick={handleSave}
            className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-900/20 flex items-center gap-2"
          >
            <Check size={20} /> Apply Calibration
          </button>
        </div>
      </div>
    </div>
  );
};

export default CalibrationModal;
