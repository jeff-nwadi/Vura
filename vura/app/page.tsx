"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Rnd } from 'react-rnd';
import { Upload, LayoutGrid, Trash2, Save, Download, Ruler, Move, Layout, Sparkles } from 'lucide-react';
import gsap from 'gsap';
import CalibrationModal from './components/CalibrationModal';
import ArtUploader from './components/ArtUploader';
import { LayoutEngine } from './utils/layoutEngine';
import { generateHangingGuide } from './utils/pdfGenerator';
import { LayoutSelector } from './components/LayoutSelector';
import { PerspectiveTransformer, Point } from './utils/perspectiveCorrection';
import { ObjectDetection } from './utils/objectDetection';
import LandingPage from './components/LandingPage';
import AlertDialog from './components/AlertDialog';

interface ArtPiece {
  id: number;
  url: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

const VuraApp = () => {
  const [hasStarted, setHasStarted] = useState(false);

  // Existing States
  const [wallImage, setWallImage] = useState<string | null>(null);
  const [artPieces, setArtPieces] = useState<ArtPiece[]>([]);

  // New States for Vura Logic
  const [ppi, setPpi] = useState<number>(0); // Pixels Per Inch
  const [floorY, setFloorY] = useState<number>(0); // Intrinsic Y coordinate of the floor
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [roomName, setRoomName] = useState("My Gallery Wall");
  const [wallDimensions, setWallDimensions] = useState({ width: 0, height: 0 });
  const [recentRooms, setRecentRooms] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // AI Designer Mode State
  const [isScanningRoom, setIsScanningRoom] = useState(false);
  const [alertState, setAlertState] = useState<{ open: boolean, title: string, message: string, type: 'info'|'success'|'error' }>({
      open: false, title: '', message: '', type: 'info'
  });

  useEffect(() => {
    // Fetch recent rooms on mount
    fetch('/api/room')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setRecentRooms(data);
      })
      .catch(err => console.error(err));
  }, []);

  const loadRoom = (room: any) => {
    setRoomName(room.name);
    setWallImage(room.wall_image_url);
    setPpi(room.reference_ratio_ppi);
    setFloorY(room.floor_y || 0);
    setShowHistory(false);
  };

  // 1. Upload Wall Logic
  const handleWallUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setWallImage(url);

      const img = new Image();
      img.onload = () => {
        setWallDimensions({ width: img.width, height: img.height });
        setIsCalibrating(true);
      };
      img.src = url;
    }
  };

  const handleArtProcessed = (url: string) => {
    let defaultWidthPx = 150;
    if (ppi > 0) {
      defaultWidthPx = LayoutEngine.inchesToPixels(20, ppi);
    }

    const newArt: ArtPiece = {
      id: Date.now(),
      url,
      x: 50,
      y: 50,
      width: defaultWidthPx,
      height: defaultWidthPx * 1.5
    };
    setArtPieces([...artPieces, newArt]);
  };

  // Ref for the visual canvas to get accurate CSS pixel dimensions for layout
  const wallContainerRef = useRef<HTMLDivElement>(null);

  // Animation Refs
  const prevArtPiecesRef = useRef<ArtPiece[]>([]);
  
  // Handle Layout Animations
  useEffect(() => {
    // Check if we have previous positions to animate from
    if (prevArtPiecesRef.current.length > 0 && artPieces.length === prevArtPiecesRef.current.length) {
       artPieces.forEach(piece => {
          const prevPiece = prevArtPiecesRef.current.find(p => p.id === piece.id);
          const element = document.getElementById(`art-piece-${piece.id}`);
          
          if (prevPiece && element) {
              const dx = Math.abs(piece.x - prevPiece.x);
              const dy = Math.abs(piece.y - prevPiece.y);
              
              if (dx > 5 || dy > 5) {
                 gsap.fromTo(element, 
                    { x: prevPiece.x, y: prevPiece.y },
                    { x: piece.x, y: piece.y, duration: 0.5, ease: "power3.out", overwrite: "auto" }
                 );
              }
          }
       });
    }
    prevArtPiecesRef.current = artPieces;
    prevArtPiecesRef.current = artPieces;
  }, [artPieces]);

  // Handle Window Resize for Responsive Scale
  useEffect(() => {
    const handleResize = () => {
      // Force re-render to update getScaleFactor/PPI calculations
      setWallDimensions(prev => ({...prev})); 
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Helper to get Effective PPI based on current view scale
  const getEffectivePPI = () => {
    if (ppi === 0 || !wallContainerRef.current || wallDimensions.width === 0) {
        if (wallContainerRef.current) {
            return wallContainerRef.current.clientHeight / 96; 
        }
        return 50; 
    }
    return ppi * getScaleFactor();
  };

  // Get current visual scale factor (Rendered / Intrinsic)
  const getScaleFactor = () => {
      if (!wallContainerRef.current || wallDimensions.width === 0) return 1;
      const containerW = wallContainerRef.current.clientWidth;
      const containerH = wallContainerRef.current.clientHeight;
      const scaleW = containerW / wallDimensions.width;
      const scaleH = containerH / wallDimensions.height;
      return Math.max(scaleW, scaleH);
  };

  const getCanvasSize = () => {
    if (wallContainerRef.current) {
      return {
        width: wallContainerRef.current.clientWidth,
        height: wallContainerRef.current.clientHeight
      };
    }
    return wallDimensions;
  };

  const showCalibrationWarning = () => {
    if (ppi === 0) alert("Using estimated scale (assuming 8ft ceiling). Click 'Calibrate' for precision.");
  };

  const handleCalibrationSave = (newPpi: number, newFloorY: number) => {
      setPpi(newPpi);
      setFloorY(newFloorY);
      setIsCalibrating(false);
  };

  const nudge = (dx: number, dy: number) => {
    setArtPieces(prev => prev.map(p => ({ ...p, x: p.x + dx, y: p.y + dy })));
  };

  const handleSuggestSpot = async () => {
      setIsScanningRoom(true);
      
      try {
          await ObjectDetection.loadModel();
          // Find the wall image. We will switch to using an <img> tag for detection.
          const imgElement = document.querySelector('.wall-image') as HTMLImageElement;
          if (!imgElement) throw new Error("Image not found");

          // Simulate "Fast Scan" effect time
          await new Promise(r => setTimeout(r, 1500));

          const objects = await ObjectDetection.detect(imgElement);
          const anchor = LayoutEngine.findPrimaryAnchor(objects);

          if (anchor) {
             const activePPI = getEffectivePPI();
             
             // Calculate Group Height
             let minY = Infinity, maxY = -Infinity;
             if (artPieces.length === 0) {
                 setIsScanningRoom(false);
                 setAlertState({ open: true, title: "No Art Found", message: "Please place some art pieces on the wall first.", type: "error" });
                 return;
             }
             
             artPieces.forEach(p => {
                 if (p.y < minY) minY = p.y;
                 if (p.y + p.height > maxY) maxY = p.y + p.height;
             });
             const groupHeight = maxY - minY;

             // Logic: Top of Anchor - 8 inches - Group Height
             const { x, y } = LayoutEngine.calculateAIHangPoint(anchor, activePPI, groupHeight);
             
             // Center Group
             let currentMinX = Infinity, currentMaxX = -Infinity;
             artPieces.forEach(p => {
                 if(p.x < currentMinX) currentMinX = p.x;
                 if(p.x + p.width > currentMaxX) currentMaxX = p.x + p.width;
             });
             const currentCenterX = (currentMinX + currentMaxX) / 2;
             const currentCenterY = (minY + maxY) / 2; // Center of group
             
             const dx = x - currentCenterX;
             const dy = y - currentCenterY;

             // Animate
             const newPieces = artPieces.map(p => ({...p, x: p.x + dx, y: p.y + dy}));
             setArtPieces(newPieces);
             
             // Success Message
             const anchorName = anchor.class.charAt(0).toUpperCase() + anchor.class.slice(1);
             setAlertState({ 
                 open: true, 
                 title: "Perfect Spot Found!", 
                 message: `We found a ${anchorName}. Your art has been centered and placed 10 inches above it.`, 
                 type: "success" 
             });

          } else {
              setAlertState({ open: true, title: "No Furniture Detected", message: "We couldn't find a clear bed or sofa to anchor against. Try the manual Calibration mode.", type: "error" });
          }

      } catch (err) {
          console.error("AI Scan failed", err);
          setAlertState({ open: true, title: "Scan Failed", message: "Something went wrong during the scan.", type: "error" });
      } finally {
          setIsScanningRoom(false);
      }
  };

  // --- Layout Logic ---

  const getCenterLineY = (activePPI: number, canvasHeight: number) => {
    const scale = getScaleFactor();
    // Anchor Logic: If floor is set, use it. Else default to bottom.
    const effectiveFloorY = floorY > 0 ? floorY * scale : canvasHeight;
    // User Rule: GoalY = FloorLineY - (60 * PPI)
    const pixelsFromFloor = LayoutEngine.inchesToPixels(60, activePPI);
    return effectiveFloorY - pixelsFromFloor;
  };

  const handleLayoutSelect = (template: string) => {
    const activePPI = getEffectivePPI();
    const { width } = getCanvasSize();
    const height = wallContainerRef.current?.clientHeight || 0;

    showCalibrationWarning();
    
    // Center logic
    const centerLineY = getCenterLineY(activePPI, height);
    const centerX = width / 2;
    
    // Top estimate for layouts (approx 15 inches above center)
    const estimatedTop = centerLineY - LayoutEngine.inchesToPixels(15, activePPI);
    
    const updated = LayoutEngine.applyTemplate(artPieces, template, {
        startX: template === 'row' || template === 'big-center' ? centerX : (width/2) - LayoutEngine.inchesToPixels(20, activePPI), 
        startY: Math.max(20, estimatedTop),
        gapInches: 3,
        ppi: activePPI,
        wallWidth: width
    });
    
    setArtPieces(updated as ArtPiece[]);
  };

  const apply57InchRule = () => {
    const { height } = getCanvasSize();
    if (height === 0) return;
    const activePPI = getEffectivePPI();
    showCalibrationWarning();

    const centerLineY = getCenterLineY(activePPI, height);

    const updated = artPieces.map(p => {
      // Center item on centerLineY
      const newY = centerLineY - (p.height / 2);
      return { ...p, y: newY };
    });
    setArtPieces(updated);
  };

  // Layout Variants State
  const [gridVariant, setGridVariant] = useState(0);
  const [mosaicVariant, setMosaicVariant] = useState(0);

  const saveRoom = async () => {
    try {
      const response = await fetch('/api/room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: roomName, wallImageUrl: wallImage, ratio: ppi, artPieces })
      });
      if (response.ok) alert("Room Saved!");
    } catch (e) {
      console.error(e);
      alert("Failed to save.");
    }
  };

  const downloadGuide = () => {
    generateHangingGuide({ roomName, items: artPieces, ppi: ppi || 10, wallHeightPixels: wallDimensions.height || 800 });
  };


  if (!hasStarted) {
    return <LandingPage onStart={() => setHasStarted(true)} />;
  }

  return (
    <div className="flex flex-col items-center min-h-screen bg-background text-foreground font-sans">
      
      {/* Scanning Overlay */}
      {isScanningRoom && (
          <div className="fixed inset-0 z-50 pointer-events-none overflow-hidden">
              <div className="absolute inset-0 bg-purple-500/10 mix-blend-overlay"></div>
              {/* Laser Line */}
              <div className="absolute top-0 left-0 w-full h-[5px] bg-purple-400 shadow-[0_0_15px_rgba(168,85,247,1)] animate-[scan-fast_1.5s_linear_infinite]" 
                   style={{ boxShadow: '0 0 20px 2px #a855f7' }}>
              </div>
              <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/80 text-purple-300 px-4 py-2 rounded-full font-bold animate-pulse border border-purple-500/50 backdrop-blur-md">
                 AI ANALYZING ROOM...
              </div>
          </div>
      )}

      {/* Header */}
      <header className="w-full flex justify-between items-center p-4 border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-40 shadow-sm">
        <h1 className="text-2xl font-bold bg-linear-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent cursor-pointer" onClick={() => setHasStarted(false)}>Vura</h1>
        <div className="flex gap-4">
           {/* Magic Wand Button */}
           <button 
             onClick={handleSuggestSpot}
             disabled={isScanningRoom}
             className="flex items-center gap-2 px-4 py-2 bg-linear-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition font-medium shadow-lg shadow-purple-900/20 disabled:opacity-50"
           >
              <Sparkles size={18} className={isScanningRoom ? "animate-spin" : ""} />
              {isScanningRoom ? "Scanning..." : "Suggest Best Spot"}
           </button>

           <button onClick={() => setIsCalibrating(true)} className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition font-medium border border-border">
              <Ruler size={18} />
              Calibrate
           </button>
           <button onClick={() => document.getElementById('file-upload')?.click()} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition shadow-lg shadow-blue-500/20 font-medium">
             <Upload size={18} />
             Upload Wall
           </button>
           <input
             id="file-upload"
             type="file"
             accept="image/*"
             className="hidden"
             onChange={handleWallUpload}
           />
        </div>
      </header>

      {/* Main Content - Split Layout */}
      <div className="flex flex-col md:flex-row w-full h-[calc(100vh-64px)] overflow-hidden">
        
        {/* Left Panel: Canvas (Mobile Top / Desktop Left) */}
        <div className="relative flex-1 bg-black/90 md:bg-neutral-900 flex items-center justify-center overflow-hidden shrink-0 order-1 md:order-1 h-[55vh] md:h-full border-b md:border-b-0 md:border-r border-border p-4 md:p-8">
            <div
                ref={wallContainerRef}
                className="relative w-full max-w-full md:max-w-6xl shadow-2xl rounded-lg overflow-hidden border-2 border-gray-800"
                style={{ aspectRatio: wallDimensions.width ? `${wallDimensions.width}/${wallDimensions.height}` : '16/9', maxHeight: '100%' }}
            >
                {!wallImage ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 bg-neutral-900">
                    <Upload size={48} className="mb-4 opacity-50" />
                    <p>Upload a wall photo to begin</p>
                </div>
                ) : (
                <div className="w-full h-full relative">
                    <img 
                        src={wallImage} 
                        alt="Wall"
                        className="w-full h-full object-contain pointer-events-none wall-image"
                    />
                    {/* Art Layer */}
                    <div className="absolute inset-0">
                        {artPieces.map((art) => {
                            const scale = getScaleFactor();
                            const activePPI = ppi * scale;
                            const effectiveFloorY = floorY > 0 ? floorY * scale : (wallContainerRef.current?.clientHeight || wallDimensions.height);

                            const centerX = art.x + art.width / 2;
                            const centerY = art.y + art.height / 2;
                            const inchesFromLeft = (centerX / activePPI).toFixed(1);
                            const inchesFromFloor = ((effectiveFloorY - centerY) / activePPI).toFixed(1);

                            return (
                                <Rnd
                                key={art.id}
                                id={`art-piece-${art.id}`}
                                size={{ width: art.width, height: art.height }}
                                position={{ x: art.x, y: art.y }}
                                onDragStop={(e, d) => {
                                    setArtPieces(prev => prev.map(p => p.id === art.id ? { ...p, x: d.x, y: d.y } : p));
                                }}
                                onResizeStop={(e, direction, ref, delta, position) => {
                                    setArtPieces(prev => prev.map(p => p.id === art.id ? { 
                                       ...p, 
                                        width: parseInt(ref.style.width), 
                                        height: parseInt(ref.style.height),
                                        ...position 
                                    } : p));
                                }}
                                lockAspectRatio={true}
                                bounds="parent"
                                className="group"
                                >
                                <div className="relative w-full h-full shadow-2xl transition-transform hover:scale-[1.02] duration-200 group/art">
                                    <img
                                    src={art.url}
                                    alt="Art Piece"
                                    className="w-full h-full object-cover border-2 md:border-4 border-white"
                                    draggable={false}
                                    />
                                    
                                    {/* Nail Point Crosshair */}
                                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-md z-20 flex items-center justify-center opacity-0 group-hover/art:opacity-100 transition-opacity">
                                        <div className="w-full h-0.5 bg-red-500 absolute"></div>
                                        <div className="h-full w-0.5 bg-red-500 absolute"></div>
                                    </div>

                                    <button
                                        onClick={() => setArtPieces(artPieces.filter(a => a.id !== art.id))}
                                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 opacity-0 group-hover/art:opacity-100 transition shadow-md hover:bg-red-600 z-30"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                                </Rnd>
                            )})}
                    </div>
                </div>
                )}
            </div>
        </div>

        {/* Right Panel: Controls (Mobile Bottom Sheet / Desktop Sidebar) */}
        <div className="flex-1 md:flex-none md:w-80 lg:w-96 bg-card border-t md:border-t-0 md:border-l border-border flex flex-col overflow-y-auto order-2 md:order-2 h-[45vh] md:h-full z-30 shadow-2xl md:shadow-none">
             <div className="p-4 md:p-6 space-y-6">
                 
                 {/* 1. Add Art Section */}
                 <div className="space-y-3">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Your Collection</h3>
                    <div className="flex gap-2">
                        <ArtUploader onArtProcessed={handleArtProcessed} />
                        <label className="flex-1 flex flex-col items-center justify-center gap-2 bg-secondary/50 hover:bg-secondary text-secondary-foreground border-2 border-dashed border-border rounded-xl cursor-pointer transition p-4 h-24">
                           <Upload size={20} /> 
                           <span className="text-xs font-bold">New Wall</span>
                           <input type="file" className="hidden" onChange={handleWallUpload} accept="image/*" />
                        </label>
                    </div>
                 </div>

                 {/* 2. Room Info */}
                 <div className="space-y-3">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Room Details</h3>
                    <input
                        className="w-full bg-secondary/30 rounded-lg px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none transition"
                        value={roomName}
                        onChange={(e) => setRoomName(e.target.value)}
                        placeholder="My Living Room"
                    />
                     <div className="flex gap-2">
                        <button onClick={() => setIsCalibrating(true)} className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-900/20 text-blue-400 hover:bg-blue-900/30 rounded-lg transition font-bold text-xs border border-blue-900/30">
                            <Ruler size={14} /> {ppi > 0 ? `${ppi.toFixed(1)} px/in` : 'Calibrate Scale'}
                        </button>
                    </div>
                 </div>

                 {/* 3. Layout Tools */}
                 <div className="space-y-3">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Smart Layouts</h3>
                    <div className="grid grid-cols-2 gap-2">
                         <button onClick={apply57InchRule} className="flex flex-col items-center justify-center gap-1 p-3 bg-card hover:bg-secondary border border-border rounded-xl transition text-center aspect-square md:aspect-auto">
                             <span className="text-lg font-bold text-blue-400">57"</span> 
                             <span className="text-xs text-gray-400">Eye-Level Center</span>
                         </button>
                         {/* Layout Helper is simplified here for grid */}
                         <div className="relative group col-span-1">
                                <div className="absolute bottom-full left-0 w-full mb-2 hidden group-hover:block z-50">
                                   <div className="bg-popover border border-border p-2 rounded-xl shadow-xl">
                                      <LayoutSelector onSelect={handleLayoutSelect} />
                                   </div>
                                </div>
                                <button className="w-full h-full flex flex-col items-center justify-center gap-1 p-3 bg-card hover:bg-secondary border border-border rounded-xl transition">
                                    <LayoutGrid size={20} className="text-purple-400"/>
                                    <span className="text-xs text-gray-400">Presets</span>
                                </button>
                         </div>
                    </div>
                 </div>

                 {/* 4. Fine Tune (Nudge) */}
                 <div className="space-y-3">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Fine Tune</h3>
                    <div className="grid grid-cols-3 gap-2 bg-secondary/20 p-2 rounded-xl">
                        <div className="col-start-2"><button onClick={() => nudge(0, -10)} className="w-full p-2 hover:bg-secondary rounded-lg flex justify-center"><Move size={14} className="-rotate-90"/></button></div>
                        <div className="col-start-1 row-start-2"><button onClick={() => nudge(-10, 0)} className="w-full p-2 hover:bg-secondary rounded-lg flex justify-center"><Move size={14} className="rotate-180"/></button></div>
                        <div className="col-start-2 row-start-2"><div className="w-full p-2 flex justify-center"><Move size={14} className="text-gray-600"/></div></div>
                        <div className="col-start-3 row-start-2"><button onClick={() => nudge(10, 0)} className="w-full p-2 hover:bg-secondary rounded-lg flex justify-center"><Move size={14}/></button></div>
                        <div className="col-start-2 row-start-3"><button onClick={() => nudge(0, 10)} className="w-full p-2 hover:bg-secondary rounded-lg flex justify-center"><Move size={14} className="rotate-90"/></button></div>
                    </div>
                 </div>

                 <button onClick={downloadGuide} className="w-full py-3 bg-secondary hover:bg-secondary/80 text-foreground font-bold rounded-xl flex items-center justify-center gap-2 transition mt-4">
                    <Download size={18} /> Download Hang Guide (PDF)
                 </button>
                 
                 {/* Padding for Mobile scroll */}
                 <div className="h-12 md:h-0"></div>
             </div>
        </div>

      </div>

      {isCalibrating && wallImage && (
        <CalibrationModal
          wallImageUrl={wallImage}
          wallImageDimensions={wallDimensions}
          onSave={handleCalibrationSave}
          onClose={() => setIsCalibrating(false)}
        />
      )}
      
      <AlertDialog 
         isOpen={alertState.open} 
         title={alertState.title} 
         message={alertState.message} 
         type={alertState.type}
         onClose={() => setAlertState(prev => ({ ...prev, open: false }))} 
      />
    </div>
  );
};

export default VuraApp;