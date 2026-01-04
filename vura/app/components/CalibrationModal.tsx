import React, { useState, useRef, useEffect } from 'react';
import { Rnd } from 'react-rnd';
import { Ruler, Check, Scan } from 'lucide-react';
import { LayoutEngine } from '../utils/layoutEngine';

interface CalibrationModalProps {
  wallImageUrl: string;
  wallImageDimensions: { width: number; height: number };
  onSave: (ppi: number, floorY: number, corners: { tl: {x:number,y:number}, tr: {x:number,y:number}, br: {x:number,y:number}, bl: {x:number,y:number} } | null) => void;
  onClose: () => void;
}

const CalibrationModal: React.FC<CalibrationModalProps> = ({ wallImageUrl, wallImageDimensions, onSave, onClose }) => {
  const [step, setStep] = useState<'select-method' | 'calibrate' | 'verify' | 'set-corners' | 'set-floor'>('select-method');
  const [method, setMethod] = useState<'furniture' | 'standard' | 'tape' | null>(null);
  const [standardObjectType, setStandardObjectType] = useState<'switch' | 'door' | 'custom' | null>(null);

  const [lineLengthPx, setLineLengthPx] = useState(200); // Default line length in pixels
  const [realLengthInches, setRealLengthInches] = useState('');
  
  // We use Rnd to simulate a draggable "ruler" line
  const [rulerPos, setRulerPos] = useState({ x: 50, y: 50 });
  const [floorY, setFloorY] = useState(0); // Will init to height on mount/image load

  // Perspective Corners (screen coordinates relative to container)
  const [corners, setCorners] = useState<{ tl: {x:number,y:number}, tr: {x:number,y:number}, br: {x:number,y:number}, bl: {x:number,y:number} }>({ 
      tl: {x:0, y:0}, tr: {x:0, y:0}, br: {x:0, y:0}, bl: {x:0, y:0} 
  });
  const [cornersInitialized, setCornersInitialized] = useState(false);

  // Magnifier State
  const [magnifier, setMagnifier] = useState({ show: false, x: 0, y: 0, bgX: 0, bgY: 0, zoom: 3 });
  const imageContainerRef = useRef<HTMLDivElement>(null);

  /* Removed no-op useEffect */

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

  const handleValidInchInput = () => {
    const inches = parseFloat(realLengthInches);
    if (!inches || inches <= 0) {
      alert("Please enter a valid length in inches.");
      return false;
    }
    return true;
  };

  const handleMethodSelect = (selectedMethod: 'furniture' | 'standard' | 'tape') => {
    setMethod(selectedMethod);
    if (selectedMethod === 'standard') {
      // Stay on selection to pick subtype
    } else {
      setStep('calibrate');
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
    if (!handleValidInchInput()) return;
    setStep('verify');
  };

  const handleVerifyConfirm = () => {
      setStep('set-corners');
      // Initialize corners to image bounds with some padding if not set
      if (!cornersInitialized && imageContainerRef.current) {
          const w = imageContainerRef.current.clientWidth;
          const h = imageContainerRef.current.clientHeight;
          // Default to slightly inside the image to encourage user to adjust
          setCorners({
              tl: { x: w * 0.1, y: h * 0.1 },
              tr: { x: w * 0.9, y: h * 0.1 },
              br: { x: w * 0.9, y: h * 0.9 },
              bl: { x: w * 0.1, y: h * 0.9 }
          });
          setCornersInitialized(true);
      }
  };

  const handleCornersConfirm = () => {
      setStep('set-floor');
      if(imageContainerRef.current) {
          setFloorY(imageContainerRef.current.clientHeight * 0.9); 
      }
  };

  const handleFinish = () => {
     if (!handleValidInchInput()) return;
     if (!imageContainerRef.current) return;

    // Calculate Scale Factor
    const renderedWidth = imageContainerRef.current.clientWidth;
    const intrinsicWidth = wallImageDimensions.width;
    
    if (renderedWidth === 0 || intrinsicWidth === 0) {
        onSave(1, wallImageDimensions.height, null); 
        onClose();
        return;
    }

    const scaleFactor = renderedWidth / intrinsicWidth;

    // Intrinsic PPI
    const intrinsicLineLengthPx = lineLengthPx / scaleFactor;
    const itemsInches = parseFloat(realLengthInches);
    const intrinsicPpi = LayoutEngine.calculatePixelsPerInch(intrinsicLineLengthPx, itemsInches);
    
    // Intrinsic Floor Y
    const intrinsicFloorY = floorY / scaleFactor;

    // Convert corners to Intrinsic coordinates
    const intrinsicCorners = {
        tl: { x: corners.tl.x / scaleFactor, y: corners.tl.y / scaleFactor },
        tr: { x: corners.tr.x / scaleFactor, y: corners.tr.y / scaleFactor },
        br: { x: corners.br.x / scaleFactor, y: corners.br.y / scaleFactor },
        bl: { x: corners.bl.x / scaleFactor, y: corners.bl.y / scaleFactor },
    };
    
    onSave(intrinsicPpi, intrinsicFloorY, intrinsicCorners);
    onClose();
  };

  const renderMethodSelection = () => (
    <div className="flex flex-col h-full animate-in fade-in zoom-in-95 duration-200">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-bold flex items-center gap-3">
          <Ruler className="text-blue-500" size={32} /> Calibrate Scale
        </h2>
        <button onClick={onClose} className="text-gray-400 hover:text-white transition p-2 rounded-full hover:bg-gray-800">
             ✕
        </button>
      </div>

      {!method ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 items-stretch">
          <button onClick={() => handleMethodSelect('standard')} className="bg-gray-900 border border-gray-700 hover:border-blue-500 hover:bg-gray-800 p-8 rounded-2xl text-left transition-all hover:scale-[1.02] group">
            <div className="w-14 h-14 bg-blue-900/30 rounded-full flex items-center justify-center mb-6 group-hover:bg-blue-600 group-hover:text-white transition-colors text-blue-400">
              <Ruler size={28} />
            </div>
            <h3 className="text-xl font-bold mb-2">Standard Object</h3>
            <p className="text-gray-400">Use a light switch, door frame, or other standard object.</p>
          </button>
          
          <button onClick={() => handleMethodSelect('tape')} className="bg-gray-900 border border-gray-700 hover:border-green-500 hover:bg-gray-800 p-8 rounded-2xl text-left transition-all hover:scale-[1.02] group">
             <div className="w-14 h-14 bg-green-900/30 rounded-full flex items-center justify-center mb-6 group-hover:bg-green-600 group-hover:text-white transition-colors text-green-400">
              <div className="w-6 h-6 border-2 border-current rounded-sm"></div>
            </div>
            <h3 className="text-xl font-bold mb-2">Tape or Paper</h3>
            <p className="text-gray-400">Use a piece of paper or masking tape of known size.</p>
          </button>

          <button onClick={() => handleMethodSelect('furniture')} className="bg-gray-900 border border-gray-700 hover:border-purple-500 hover:bg-gray-800 p-8 rounded-2xl text-left transition-all hover:scale-[1.02] group">
             <div className="w-14 h-14 bg-purple-900/30 rounded-full flex items-center justify-center mb-6 group-hover:bg-purple-600 group-hover:text-white transition-colors text-purple-400">
              <div className="w-8 h-4 border-2 border-current rounded-sm"></div>
            </div>
            <h3 className="text-xl font-bold mb-2">Furniture</h3>
            <p className="text-gray-400">Measure a piece of furniture visible in the photo.</p>
          </button>
        </div>
      ) : (
         /* Standard Object Selection */
        <div className="flex-1 flex flex-col">
            <h3 className="text-xl font-bold mb-6 text-gray-300">Select Object Type:</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 <button onClick={() => handleStandardObjectSelect('switch')} className="bg-gray-800 hover:bg-gray-700 p-6 rounded-xl text-center border border-gray-700 hover:border-blue-400 transition">
                    <div className="font-bold text-lg mb-1">Light Switch</div>
                    <div className="text-sm text-gray-400">Standard Height: 4.5"</div>
                 </button>
                 <button onClick={() => handleStandardObjectSelect('door')} className="bg-gray-800 hover:bg-gray-700 p-6 rounded-xl text-center border border-gray-700 hover:border-blue-400 transition">
                    <div className="font-bold text-lg mb-1">Door Frame</div>
                    <div className="text-sm text-gray-400">Standard Height: 80"</div>
                 </button>
                 <button onClick={() => handleStandardObjectSelect('custom')} className="bg-gray-800 hover:bg-gray-700 p-6 rounded-xl text-center border border-gray-700 hover:border-blue-400 transition">
                    <div className="font-bold text-lg mb-1">Custom Object</div>
                    <div className="text-sm text-gray-400">Enter your own height</div>
                 </button>
            </div>
            <div className="mt-auto">
                <button onClick={() => setMethod(null)} className="text-gray-400 hover:text-white px-4 py-2">Back</button>
            </div>
        </div>
      )}
    </div>
  );

  const getInstructionText = () => {
      if(step === 'set-floor') return "Drag the dashed line to where the floor meets the wall.";
      if (method === 'furniture') return (
          <><strong>Step 1:</strong> Draw a line across the widest part of your <strong>furniture</strong> (e.g. Sofa).<br /><strong>Step 2:</strong> Enter its real width below.</>
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
               {step === 'verify' ? "Verify Scale" : step === 'set-corners' ? "Set Perspective" : step === 'set-floor' ? "Where is the floor?" : "Calibrate Scale"}
             </h2>
             <p className="text-gray-400 text-sm mt-1">
                {step === 'verify' ? "Does this look right?" : step === 'set-corners' ? "Drag the 4 corners to match the wall." : step === 'set-floor' ? "Drag the line to the floor-wall edge." : getInstructionText()}
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
             {/* Rnd Ruler (Show in calibrate & verify) */}
             {(step === 'calibrate' || step === 'verify') && (
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
                      
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black/70 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                         {step === 'verify' 
                           ? `${realLengthInches}" Verified`
                           : `${lineLengthPx}px`
                         }
                      </div>
                    </div>
                  </div>
                </Rnd>
             )}

             {/* Corner Handles (set-corners) */}
             {step === 'set-corners' && Object.entries(corners).map(([key, pos]) => (
                 <Rnd
                    key={key}
                    size={{ width: 40, height: 40 }}
                    position={{ x: pos.x - 20, y: pos.y - 20 }}
                    onDrag={(e, d) => {
                         // Update just this corner
                         setCorners(prev => ({ ...prev, [key]: { x: d.x + 20, y: d.y + 20 } }));
                         updateMagnifier(e as any);
                    }}
                    onDragStop={() => setMagnifier(prev => ({ ...prev, show: false }))}
                    bounds="parent"
                    enableResizing={false}
                    className="z-30 rounded-full"
                 >
                     <div className="w-full h-full flex items-center justify-center">
                        <div className="w-5 h-5 bg-white border-2 border-blue-500 rounded-full shadow-lg flex items-center justify-center text-[8px] font-bold text-blue-600 uppercase cursor-move">
                            {key}
                        </div>
                     </div>
                 </Rnd>
             ))}
             
             {/* Draw the Quadrilateral */}
             {step === 'set-corners' && (
                 <svg className="absolute inset-0 pointer-events-none z-20 overflow-visible">
                     <path 
                        d={`M ${corners.tl.x} ${corners.tl.y} L ${corners.tr.x} ${corners.tr.y} L ${corners.br.x} ${corners.br.y} L ${corners.bl.x} ${corners.bl.y} Z`}
                        fill="rgba(59, 130, 246, 0.2)"
                        stroke="#3b82f6"
                        strokeWidth="2"
                        strokeDasharray="4 2"
                     />
                 </svg>
             )}

             {/* Floor Line (Show only in set-floor) */}
             {step === 'set-floor' && (
                 <div 
                    className="absolute w-full h-0 border-t-2 border-dashed border-yellow-400 cursor-ns-resize z-20 group"
                    style={{ top: floorY }}
                    onMouseDown={(e) => {
                        e.preventDefault();
                        const startY = e.clientY;
                        
                        const handleMouseMove = (moveEvent: MouseEvent) => {
                           if(!imageContainerRef.current) return;
                           const rect = imageContainerRef.current.getBoundingClientRect();
                           
                           // Calculate relative Y in the container
                           let relativeY = moveEvent.clientY - rect.top;
                           
                           if (relativeY < 0) relativeY = 0;
                           if (relativeY > rect.height) relativeY = rect.height;
                           
                           setFloorY(relativeY);
                        };
                        
                        const handleMouseUp = () => {
                           window.removeEventListener('mousemove', handleMouseMove);
                           window.removeEventListener('mouseup', handleMouseUp);
                        };
                        
                        window.addEventListener('mousemove', handleMouseMove);
                        window.addEventListener('mouseup', handleMouseUp);
                    }}
                 >
                    <div className="absolute left-1/2 -top-8 -translate-x-1/2 bg-yellow-500/90 text-black font-bold px-3 py-1 rounded-full text-xs cursor-ns-resize shadow-md">
                        FLOOR LEVEL
                    </div>
                 </div>
             )}
          </div>
          
             {/* Magnifier (Only for calibrate) */}
             {magnifier.show && (step === 'calibrate' || step === 'set-corners') && imageContainerRef.current && (
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
           ) : step === 'verify' ? (
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
                           onClick={handleVerifyConfirm}
                           className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-900/20 flex items-center gap-2"
                         >
                            Next: Perspective <Scan size={16} />
                         </button>
                     </div>
                </div>
            ) : step === 'set-corners' ? (
                <div className="flex-1 flex justify-between items-center animate-in fade-in slide-in-from-bottom-2">
                    <div>
                        <p className="font-bold text-foreground">Perspective Correction</p>
                        <p className="text-xs text-gray-400">Match the blue frame to the wall corners.</p>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => setStep('verify')} className="px-6 py-3 bg-transparent border border-gray-600 text-gray-300 rounded-xl font-bold hover:bg-gray-800 transition">Back</button>
                         <button onClick={handleCornersConfirm} className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-900/20 flex items-center gap-2">Next: Floor</button>
                     </div>
                </div>
           ) : (
                /* Set Floor Controls */
                <div className="flex-1 flex justify-between items-center animate-in fade-in slide-in-from-bottom-2">
                    <div>
                        <p className="font-bold text-foreground">Set Floor Level</p>
                        <p className="text-xs text-gray-400">We will use this to set the perfect "eye level".</p>
                    </div>
                    <div className="flex gap-2">
                        <button
                           onClick={() => setStep('set-corners')}
                           className="px-6 py-3 bg-transparent border border-gray-600 text-gray-300 rounded-xl font-bold hover:bg-gray-800 transition"
                         >
                           Back
                         </button>
                         <button
                           onClick={handleFinish}
                           className="px-8 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition shadow-lg shadow-green-900/20 flex items-center gap-2"
                         >
                            <Check size={20} /> Finish
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
