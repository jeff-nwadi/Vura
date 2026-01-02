"use client";

import React, { useState, useEffect } from 'react';
import { Rnd } from 'react-rnd';
import { Upload, LayoutGrid, Trash2, Save, Download, Ruler } from 'lucide-react';
import CalibrationModal from './components/CalibrationModal';
import ArtUploader from './components/ArtUploader';
import { LayoutEngine } from './utils/layoutEngine';
import { generateHangingGuide } from './utils/pdfGenerator';

interface ArtPiece {
  id: number;
  url: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

import LandingPage from './components/LandingPage';

const VuraApp = () => {
  const [hasStarted, setHasStarted] = useState(false);

  // Existing States
  const [wallImage, setWallImage] = useState<string | null>(null);
  const [artPieces, setArtPieces] = useState<ArtPiece[]>([]);

  // New States for Vura Logic
  const [ppi, setPpi] = useState<number>(0); // Pixels Per Inch
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [roomName, setRoomName] = useState("My Gallery Wall");
  const [wallDimensions, setWallDimensions] = useState({ width: 0, height: 0 });
  const [recentRooms, setRecentRooms] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);

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
    setShowHistory(false);
  };

  // ... (Other handlers like handleWallUpload, handleArtProcessed stay same) ...
  // Re-declaring handlers here as they depend on state closure

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
  const wallContainerRef = React.useRef<HTMLDivElement>(null);

  // Helper to get PPI or default
  const getPPI = () => {
    if (ppi > 0) return ppi;

    // Fallback: Height-based estimation is safer for "eye level" vertical placement.
    // Assume standard 8ft (96 inch) ceiling height for the view.
    if (wallContainerRef.current) {
      return wallContainerRef.current.clientHeight / 96;
    }
    return 50;
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

  // Nudge Helpers
  const nudge = (dx: number, dy: number) => {
    setArtPieces(prev => prev.map(p => ({ ...p, x: p.x + dx, y: p.y + dy })));
  };

  // Layout Algorithms
  const apply57InchRule = () => {
    const { height } = getCanvasSize();
    if (height === 0) return;
    const activePPI = getPPI();
    showCalibrationWarning();

    const updated = artPieces.map(p => {
      let newY = LayoutEngine.apply57InchRule(p.height, height, activePPI);
      // Visual Adjustment: 57" is mathematically correct for floor, 
      // but often visually feels stable slightly higher (Golden Ratio ~38-40% from top).
      // Our activePPI calculation (height/96) puts 57" at roughly 41% from top (1 - 57/96).
      // This should be much better than width-based.

      if (newY < 0) newY = 0;
      if (newY + p.height > height) newY = height - p.height;
      return { ...p, y: newY };
    });
    setArtPieces(updated);
  };

  const autoArrange = () => {
    const activePPI = getPPI();
    const { height } = getCanvasSize();

    const updated = LayoutEngine.autoArrangeUniform(artPieces, LayoutEngine.inchesToPixels(10, activePPI), 3, activePPI);
    setArtPieces(updated.map((p: any) => {
      let newY = LayoutEngine.apply57InchRule(p.height, height, activePPI);
      if (newY < 0) newY = 0;
      return { ...p, y: newY };
    }) as ArtPiece[]);
  };

  // Layout Variants State
  const [gridVariant, setGridVariant] = useState(0);
  const [mosaicVariant, setMosaicVariant] = useState(0);

  const applyGrid = () => {
    const activePPI = getPPI();
    const { width, height } = getCanvasSize();
    showCalibrationWarning();

    const nextVariant = (gridVariant + 1) % 3;
    setGridVariant(nextVariant);

    const startX = (width / 2) - LayoutEngine.inchesToPixels(30, activePPI);
    let startY = LayoutEngine.apply57InchRule(0, height, activePPI) - 100; // Offset to center group

    if (startY < 20) startY = 20;
    const safeStartX = Math.max(20, startX);

    const updated = LayoutEngine.arrangeGrid(artPieces, safeStartX, startY, 2, activePPI, nextVariant);
    setArtPieces(updated as ArtPiece[]);
  };

  const applyMosaic = () => {
    const activePPI = getPPI();
    const { width, height } = getCanvasSize();
    showCalibrationWarning();

    const nextVariant = (mosaicVariant + 1) % 3;
    setMosaicVariant(nextVariant);

    let centerY = LayoutEngine.apply57InchRule(0, height, activePPI);

    // Safety clamp (20% to 80% of screen)
    if (centerY < height * 0.2) centerY = height * 0.3;
    if (centerY > height * 0.8) centerY = height * 0.5;

    const updated = LayoutEngine.arrangeMosaic(artPieces, width / 2, centerY, 2, activePPI, nextVariant);
    setArtPieces(updated as ArtPiece[]);
  };

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
    // For PDF, we might need to consider the scale if calibration was done.
    // Ideally pass the real world wall height if known.
    generateHangingGuide({ roomName, items: artPieces, ppi: ppi || 10, wallHeightPixels: wallDimensions.height || 800 });
  };


  if (!hasStarted) {
    return <LandingPage onStart={() => setHasStarted(true)} />;
  }

  return (
    <div className="flex flex-col items-center min-h-screen bg-background p-6 text-foreground">
      <header className="mb-8 w-full max-w-6xl flex flex-col md:flex-row justify-between items-center md:items-end border-b border-border pb-4 gap-4">
        <div className="text-center md:text-left">
          <h1 className="text-4xl font-black text-foreground tracking-tighter cursor-pointer" onClick={() => setHasStarted(false)}>VURA<span className="text-blue-500">.</span></h1>
        </div>
        <div className="flex gap-2 w-full md:w-auto justify-center">
          <input
            className="bg-transparent text-center md:text-right font-bold text-gray-300 outline-none border-b border-transparent focus:border-blue-500 hover:border-gray-700 transition w-full md:w-auto"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
          />
          <div className="relative">
            <button onClick={() => setShowHistory(!showHistory)} className="p-2 hover:bg-gray-800 rounded-full transition text-gray-400" title="History">
              <LayoutGrid size={20} />
            </button>
            {showHistory && (
              <div className="absolute top-10 right-0 bg-card rounded-xl p-2 w-64 z-50 border border-border">
                <h3 className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider px-2">Recent Rooms</h3>
                {recentRooms.length === 0 && <p className="text-sm text-gray-500 px-2">No saved rooms</p>}
                {recentRooms.map(r => (
                  <button key={r.id} onClick={() => loadRoom(r)} className="text-left w-full px-2 py-2 hover:bg-gray-800 rounded-lg text-sm text-gray-300 truncate">
                    {r.name}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button onClick={saveRoom} className="p-2 hover:bg-gray-800 rounded-full transition text-blue-500" title="Save"><Save size={20} /></button>
        </div>
      </header>

      {/* Action Bar */}
      <div className="flex flex-col md:flex-row flex-wrap justify-between items-center w-full max-w-6xl mb-6 bg-card p-4 rounded-2xl border border-border gap-4">
        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto justify-center items-center">
          <label className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl cursor-pointer hover:bg-blue-700 transition text-sm font-bold w-full sm:w-auto justify-center">
            <Upload size={16} /> New Wall
            <input type="file" className="hidden" onChange={handleWallUpload} accept="image/*" />
          </label>
          <div className="w-full sm:w-auto">
            <ArtUploader onArtProcessed={handleArtProcessed} />
          </div>
        </div>

        <div className="flex flex-col xl:flex-row gap-4 border-t md:border-t-0 md:border-l pt-4 md:pt-0 pl-0 md:pl-4 border-border w-full md:w-auto items-center">
          <div className="flex flex-wrap justify-center gap-2">
            <button onClick={() => setIsCalibrating(true)} className="flex items-center gap-2 px-4 py-2 hover:bg-blue-900/30 text-blue-400 rounded-lg transition font-medium text-sm border md:border-none border-blue-900/30">
              <Ruler size={16} /> {ppi > 0 ? `${ppi.toFixed(1)} px/in` : 'Calibrate'}
            </button>

            {/* Layout Controls */}
            <div className="flex flex-wrap bg-gray-900 rounded-lg p-1 gap-1">
              <button onClick={autoArrange} className="px-3 py-1 bg-gray-800 rounded-md text-gray-200 font-medium text-xs hover:bg-gray-700 grow text-center">Line</button>
              <button onClick={applyGrid} className="px-3 py-1 hover:bg-gray-800 rounded-md text-gray-400 font-medium text-xs transition grow text-center">Grid</button>
              <button onClick={applyMosaic} className="px-3 py-1 hover:bg-gray-800 rounded-md text-gray-400 font-medium text-xs transition grow text-center">Mosaic</button>
              <div className="w-px bg-gray-700 mx-1 hidden sm:block"></div>
              <button onClick={apply57InchRule} className="px-3 py-1 hover:bg-blue-900/30 hover:text-blue-400 rounded-md text-gray-400 font-medium text-xs transition grow text-center" title="Center at 57 inches">57" Rule</button>
            </div>

            {/* Nudge Controls */}
            <div className="flex bg-gray-900 rounded-lg p-1 gap-1">
              <button onClick={() => nudge(0, -10)} className="p-1 hover:bg-gray-800 rounded-md text-gray-400 w-8 flex justify-center" title="Nudge Up">↑</button>
              <button onClick={() => nudge(0, 10)} className="p-1 hover:bg-gray-800 rounded-md text-gray-400 w-8 flex justify-center" title="Nudge Down">↓</button>
              <button onClick={() => nudge(-10, 0)} className="p-1 hover:bg-gray-800 rounded-md text-gray-400 w-8 flex justify-center" title="Nudge Left">←</button>
              <button onClick={() => nudge(10, 0)} className="p-1 hover:bg-gray-800 rounded-md text-gray-400 w-8 flex justify-center" title="Nudge Right">→</button>
            </div>
          </div>

          <button onClick={downloadGuide} className="flex items-center gap-2 px-4 py-2 bg-blue-900/30 hover:bg-blue-900/50 text-blue-300 rounded-lg transition font-bold text-sm w-full md:w-auto justify-center">
            <Download size={16} /> PDF
          </button>
        </div>
      </div>

      {/* Canvas Area */}
      <div
        ref={wallContainerRef}
        className="relative w-full max-w-6xl bg-neutral-900 rounded-3xl overflow-hidden border-4 border-gray-800 aspect-video group"
      >
        {!wallImage ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-600">
            <Upload size={48} className="mb-4 opacity-50" />
            <p>Upload a wall photo to begin</p>
          </div>
        ) : (
          <div
            className="w-full h-full relative"
            style={{
              backgroundImage: `url(${wallImage})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}
          >
            {artPieces.map((art) => (
              <Rnd
                key={art.id}
                default={{ x: art.x, y: art.y, width: art.width, height: art.height }}
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
                lockAspectRatio
                bounds="parent"
              >
                <div className="w-full h-full relative group/art">
                  <img src={art.url} alt="art" className="w-full h-full object-cover shadow-2xl pointer-events-none border-4 border-white" />
                  {/* Measurements Hint */}
                  {ppi > 0 && (
                    <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-black/70 text-white text-[10px] px-2 py-0.5 rounded opacity-0 group-hover/art:opacity-100">
                      {(LayoutEngine.pixelsToInches(art.width, ppi)).toFixed(1)}"
                    </div>
                  )}
                  <button
                    onClick={() => setArtPieces(artPieces.filter(a => a.id !== art.id))}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 opacity-0 group-hover/art:opacity-100 transition shadow-md hover:bg-red-600"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </Rnd>
            ))}
          </div>
        )}
      </div>

      {isCalibrating && wallImage && (
        <CalibrationModal
          wallImageUrl={wallImage}
          wallImageDimensions={wallDimensions}
          onSave={(newPpi) => setPpi(newPpi)}
          onClose={() => setIsCalibrating(false)}
        />
      )}
    </div>
  );
};

export default VuraApp;