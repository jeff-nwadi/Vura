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
  const [step, setStep] = useState<'select-method' | 'calibrate' | 'verify'>('select-method');
  const [method, setMethod] = useState<'furniture' | 'standard' | 'tape' | null>(null);
  const [standardObjectType, setStandardObjectType] = useState<'switch' | 'door' | 'custom' | null>(null);

  const [lineLengthPx, setLineLengthPx] = useState(200); // Default line length in pixels
  const [realLengthInches, setRealLengthInches] = useState('');
  
  // We use Rnd to simulate a draggable "ruler" line
  const [rulerPos, setRulerPos] = useState({ x: 50, y: 50 });

  // Magnifier State
  const [magnifier, setMagnifier] = useState({ show: false, x: 0, y: 0, bgX: 0, bgY: 0, zoom: 3 });
  const imageContainerRef = useRef<HTMLDivElement>(null);

  const updateMagnifier = (e: MouseEvent | TouchEvent) => {
      if (!imageContainerRef.current) return;
      
      const container = imageContainerRef.current.getBoundingClientRect();
      let clientX, clientY;
      
      if ('touches' in e) {
          clientX = e.touches[0].clientX;
          clientY = e.touches[0].clientY;
      } else {
          clientX = (e as MouseEvent).clientX;
          clientY = (e as MouseEvent).clientY;
      }

      // Relative position inside the image container
      const relX = clientX - container.left;
      const relY = clientY - container.top;
      
      const glassSize = 140;
      const bgX = - (relX * magnifier.zoom - glassSize / 2);
      const bgY = - (relY * magnifier.zoom - glassSize / 2);

      setMagnifier(prev => ({ 
          ...prev, 
          show: true, 
          x: clientX, 
          y: clientY - 100, // Show above finger/cursor
          bgX, 
          bgY 
      }));
  };

  const handleMethodSelect = (selectedMethod: 'furniture' | 'standard' | 'tape') => {
    setMethod(selectedMethod);
    if (selectedMethod === 'standard') {
      // Stay on selection to pick subtype
    } else {
      setStep('calibrate');
      // Set defaults valid for some methods if needed
      if (selectedMethod === 'tape') setRealLengthInches(''); 
      if (selectedMethod === 'furniture') setRealLengthInches('');
    }
  };

  const handleStandardObjectSelect = (type: 'switch' | 'door' | 'custom') => {
    setStandardObjectType(type);
    setStep('calibrate');
    if (type === 'switch') setRealLengthInches('4.5');
    if (type === 'door') setRealLengthInches('80');
    if (type === 'custom') setRealLengthInches('');
  };

  const handleCalibrate = () => {
    const inches = parseFloat(realLengthInches);
    if (!inches || inches <= 0) {
      alert("Please enter a valid length in inches.");
      return;
    }
    setStep('verify');
  };

  const handleFinalSave = () => {
    const inches = parseFloat(realLengthInches);
    if (!inches || inches <= 0) {
      alert("Please enter a valid length in inches.");
      return;
    }

    if (!imageContainerRef.current) return;

    // Calculate Scale Factor of the displayed image vs Intrinsic image
    // The container is sized with aspectRatio, so clientWidth matches the rendered image width.
    const renderedWidth = imageContainerRef.current.clientWidth;
    const intrinsicWidth = wallImageDimensions.width;
    
    // Safety check
    if (renderedWidth === 0 || intrinsicWidth === 0) {
        onSave(1); // Fallback
        onClose();
        return;
    }

    const scaleFactor = renderedWidth / intrinsicWidth;

    // Convert the drawn line (screen pixels) to intrinsic pixels
    const intrinsicLineLengthPx = lineLengthPx / scaleFactor;

    // Calculate Intrinsic PPI
    const intrinsicPpi = LayoutEngine.calculatePixelsPerInch(intrinsicLineLengthPx, inches);
    
    onSave(intrinsicPpi);
    onClose();
  };

  const renderMethodSelection = () => (
    <div className="flex flex-col h-full">
       <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground mb-2">Before we design, let's measure.</h2>
        <p className="text-gray-400">Vura needs to know the size of your wall to make sure your art fits perfectly. Please choose one of the three methods below to calibrate your space.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1 overflow-y-auto p-1">
        {/* Method 1 */}
        <div 
          onClick={() => handleMethodSelect('furniture')}
          className="bg-gray-800/50 hover:bg-gray-800 border border-gray-700 hover:border-blue-500 rounded-xl p-6 cursor-pointer transition flex flex-col gap-4 group"
        >
          <div className="w-12 h-12 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center group-hover:scale-110 transition">
            <span className="font-bold text-xl">1</span>
          </div>
          <div>
            <h3 className="font-bold text-lg text-foreground mb-1">Reference Object</h3>
            <p className="text-sm text-gray-400">If you have a sofa, table, or bed in the photo.</p>
          </div>
          <div className="mt-auto pt-4 border-t border-gray-700/50">
            <p className="text-xs text-gray-500 italic">"Draw a line across the widest part of your furniture."</p>
          </div>
        </div>

        {/* Method 2 */}
        <div 
           onClick={() => setMethod('standard')} // Intermediate state
           className={`bg-gray-800/50 hover:bg-gray-800 border ${method === 'standard' ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-gray-700 hover:border-blue-500'} rounded-xl p-6 cursor-pointer transition flex flex-col gap-4 group`}
        >
          <div className="w-12 h-12 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center group-hover:scale-110 transition">
             <span className="font-bold text-xl">2</span>
          </div>
          <div>
            <h3 className="font-bold text-lg text-foreground mb-1">Wall Feature</h3>
            <p className="text-sm text-gray-400">For empty walls with standard fixtures like switches or doors.</p>
          </div>
           
           {method === 'standard' && (
             <div className="flex flex-col gap-2 mt-4 animate-in fade-in slide-in-from-top-2">
                <button onClick={(e) => { e.stopPropagation(); handleStandardObjectSelect('switch'); }} className="text-left px-3 py-2 rounded bg-gray-700 hover:bg-gray-600 text-sm">Standard Light Switch (4.5")</button>
                <button onClick={(e) => { e.stopPropagation(); handleStandardObjectSelect('door'); }} className="text-left px-3 py-2 rounded bg-gray-700 hover:bg-gray-600 text-sm">Standard Door (80")</button>
                <button onClick={(e) => { e.stopPropagation(); handleStandardObjectSelect('custom'); }} className="text-left px-3 py-2 rounded bg-gray-700 hover:bg-gray-600 text-sm">Baseboard / Other</button>
             </div>
           )}

           {method !== 'standard' && (
            <div className="mt-auto pt-4 border-t border-gray-700/50">
              <p className="text-xs text-gray-500 italic">"Measure a fixed object like a light switch."</p>
            </div>
           )}
        </div>

        {/* Method 3 */}
        <div 
          onClick={() => handleMethodSelect('tape')}
          className="bg-gray-800/50 hover:bg-gray-800 border border-gray-700 hover:border-blue-500 rounded-xl p-6 cursor-pointer transition flex flex-col gap-4 group"
        >
           <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition">
             <span className="font-bold text-xl">3</span>
           </div>
          <div>
            <h3 className="font-bold text-lg text-foreground mb-1">Tape Marker</h3>
            <p className="text-sm text-gray-400">Most accurate. For completely blank walls.</p>
          </div>
          <div className="mt-auto pt-4 border-t border-gray-700/50">
            <p className="text-xs text-gray-500 italic">"Stick a piece of tape, measure it, and draw a line over it."</p>
          </div>
        </div>
      </div>
       <div className="mt-6 flex justify-end">
            <button onClick={onClose} className="text-gray-500 hover:text-gray-300">Cancel</button>
       </div>
    </div>
  );

  const getInstructionText = () => {
      if (method === 'furniture') return (
          <><strong>Step 1:</strong> Draw a line across the widest part of your <strong>furniture</strong> (e.g., Sofa).<br /><strong>Step 2:</strong> Enter its real width below.</>
      );
      if (method === 'standard') {
          if (standardObjectType === 'switch') return <><strong>Step 1:</strong> Draw a line vertically over the <strong>Light Switch</strong> plate.<br /><strong>Step 2:</strong> Confirm the standard height (4.5").</>;
          if (standardObjectType === 'door') return <><strong>Step 1:</strong> Draw a line vertically over the <strong>Door Frame</strong>.<br /><strong>Step 2:</strong> Confirm the standard height (80").</>;
          return <><strong>Step 1:</strong> Draw a line over your <strong>Baseboard</strong> or feature.<br /><strong>Step 2:</strong> Enter its height.</>;
      }
      if (method === 'tape') return (
          <><strong>Step 1:</strong> Find the <strong>Tape/Post-it</strong> you placed on the wall.<br /><strong>Step 2:</strong> Draw a line over it and enter the measurement.</>
      );
      return "";
  };

  const renderCalibrationWorkspace = () => (
     <div className="flex flex-col h-full">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2 text-foreground">
              <Ruler className="text-blue-400" /> 
              {step === 'verify' ? "Verify Scale" : "Calibrate Scale"}
            </h2>
            <p className="text-gray-400 text-sm mt-1">
               {step === 'verify' ? "Does this look right?" : getInstructionText()}
            </p>
          </div>
          <button onClick={() => setStep('select-method')} className="text-sm text-blue-400 hover:text-blue-300 underline">Change Method</button>
        </div>

        {/* Workspace */}
        <div className="relative flex-1 bg-gray-900 rounded-xl overflow-hidden border border-border flex items-center justify-center">
          <div
            ref={imageContainerRef}
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
             {/* Rnd Ruler - Only show if in calibrate step OR we want to show it in verify as a reference? 
                 Actually in verify we might want to show a 'Virtual Tape Measure' or just the same line with a 'Verified' badge. 
                 Let's keep the line visible in verify step for context, maybe locked?
             */}
            <Rnd
              size={{ width: lineLengthPx, height: 40 }}
              position={{ x: rulerPos.x, y: rulerPos.y }}
              onDragStop={(e, d) => { if(step === 'calibrate') setRulerPos({ x: d.x, y: d.y }) }}
              onResizeStart={(e) => { if(step === 'calibrate') updateMagnifier(e as any) }}
              onResize={(e, direction, ref, delta, position) => {
                if(step !== 'calibrate') return;
                setLineLengthPx(parseInt(ref.style.width));
                setRulerPos(position);
                updateMagnifier(e as any);
              }}
              onResizeStop={() => setMagnifier(prev => ({ ...prev, show: false }))}
              bounds="parent"
              enableResizing={step === 'calibrate' ? { top: false, right: true, bottom: false, left: true, topRight: false, bottomRight: false, bottomLeft: false, topLeft: false } : false}
              disableDragging={step !== 'calibrate'}
              className={`z-10 flex items-center ${step !== 'calibrate' ? 'pointer-events-none' : ''}`}
            >
              <div className={`w-full h-8 flex flex-col items-center justify-center group ${step === 'calibrate' ? 'cursor-grab active:cursor-grabbing' : ''}`}>
                <div className={`w-full h-1 ${step === 'verify' ? 'bg-green-500' : 'bg-blue-600'} shadow-sm relative transition-colors duration-500`}>
                  <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-3 h-3 ${step === 'verify' ? 'bg-green-500' : 'bg-blue-600'} rounded-full shadow-md`}></div>
                  <div className={`absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 ${step === 'verify' ? 'bg-green-500' : 'bg-blue-600'} rounded-full shadow-md`}></div>
                  
                  {/* Length Label */}
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black/70 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                     {step === 'verify' 
                       ? `${realLengthInches}" Verified`
                       : `${lineLengthPx}px`
                     }
                  </div>
                </div>
              </div>
            </Rnd>
          </div>
          
             {magnifier.show && step === 'calibrate' && imageContainerRef.current && (
                 <div 
                    className="fixed pointer-events-none rounded-full border-4 border-white shadow-2xl z-50"
                    style={{
                        width: 140,
                        height: 140,
                        left: magnifier.x,
                        top: magnifier.y,
                        transform: 'translate(-50%, -50%)',
                        backgroundImage: `url(${wallImageUrl})`,
                        backgroundRepeat: 'no-repeat',
                        backgroundSize: `${imageContainerRef.current.clientWidth * magnifier.zoom}px ${imageContainerRef.current.clientHeight * magnifier.zoom}px`,
                        backgroundPosition: `${magnifier.bgX}px ${magnifier.bgY}px`,
                        backgroundColor: '#fff' 
                    }}
                 >
                    <div className="absolute inset-0 flex items-center justify-center opacity-50">
                        <div className="w-full h-px bg-red-500"></div>
                        <div className="h-full w-px bg-red-500 absolute"></div>
                    </div>
                 </div>
             )}
        </div>

        {/* Controls */}
        <div className="mt-6 flex items-end gap-4 border-t border-border pt-4">
           {step === 'calibrate' ? (
              <>
                <div className="flex-1">
                  <label className="block text-sm font-bold text-gray-300 mb-1">
                    Real World Length
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={realLengthInches}
                      onChange={(e) => setRealLengthInches(e.target.value)}
                      placeholder={method === 'standard' ? "Fixed" : "e.g. 80"}
                      disabled={method === 'standard' && standardObjectType !== 'custom'}
                      className="w-full px-4 py-3 bg-gray-900 border border-border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-lg font-mono text-foreground disabled:opacity-50"
                      autoFocus
                    />
                    <span className="text-gray-400 font-bold">inches</span>
                  </div>
                </div>

                <div className="flex gap-2">
                     <button
                        onClick={() => setStep('select-method')}
                        className="px-6 py-3 bg-transparent border border-gray-600 text-gray-300 rounded-xl font-bold hover:bg-gray-800 transition"
                      >
                        Back
                      </button>
                    <button
                        onClick={handleCalibrate}
                        className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-900/20 flex items-center gap-2"
                    >
                        Next
                    </button>
                </div>
              </>
           ) : (
               /* Verification Controls */
                <div className="flex-1 flex justify-between items-center animate-in fade-in slide-in-from-bottom-2">
                     <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-green-500/20 text-green-500 flex items-center justify-center">
                            <Check size={20} />
                        </div>
                        <div>
                             <p className="font-bold text-foreground">Scale Verified</p>
                             <p className="text-xs text-gray-400">Based on your input, 1 inch = {(lineLengthPx / parseFloat(realLengthInches || '1')).toFixed(2)}px</p>
                        </div>
                     </div>
                     <div className="flex gap-2">
                        <button
                           onClick={() => setStep('calibrate')}
                           className="px-6 py-3 bg-transparent border border-gray-600 text-gray-300 rounded-xl font-bold hover:bg-gray-800 transition"
                         >
                           Adjust
                         </button>
                         <button
                           onClick={handleFinalSave}
                           className="px-8 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition shadow-lg shadow-green-900/20 flex items-center gap-2"
                         >
                            <Check size={20} /> Confirm & Save
                         </button>
                     </div>
                </div>
           )}
        </div>
     </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-card rounded-3xl p-6 w-full max-w-4xl shadow-2xl flex flex-col h-[90vh] border border-border">
         {step === 'select-method' ? renderMethodSelection() : renderCalibrationWorkspace()}
      </div>
    </div>
  );
};

export default CalibrationModal;
