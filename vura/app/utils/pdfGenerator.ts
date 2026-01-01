import jsPDF from 'jspdf';
import { LayoutEngine } from './layoutEngine';

interface HangingMapData {
  roomName: string;
  items: Array<{
    id: number;
    x: number;
    y: number;
    width: number;
    height: number;
  }>;
  ppi: number;
  wallHeightPixels: number; // To calculate position from floor if needed
}

export const generateHangingGuide = (data: HangingMapData) => {
  const doc = new jsPDF();
  const { roomName, items, ppi, wallHeightPixels } = data;

  // Title
  doc.setFontSize(22);
  doc.setTextColor(40, 40, 40);
  doc.text(`Vura Hanging Map: ${roomName}`, 20, 20);

  doc.setFontSize(12);
  doc.setTextColor(100, 100, 100);
  const date = new Date().toLocaleDateString();
  doc.text(`Generated on ${date}`, 20, 30);

  // Instructions
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text("Instructions:", 20, 45);
  doc.setFontSize(11);
  doc.text("1. Measure from the left edge of your wall (or reference point).", 20, 52);
  doc.text("2. Measure up from the floor.", 20, 58);
  doc.text("3. Mark the center point for each frame.", 20, 64);

  // Table Header
  let yPos = 80;
  doc.setFillColor(240, 240, 240);
  doc.rect(20, yPos - 5, 170, 10, 'F');
  doc.setFont("helvetica", "bold");
  doc.text("Art Piece", 25, yPos);
  doc.text("Dist. from Left", 80, yPos);
  doc.text("Dist. from Floor", 130, yPos);
  doc.setFont("helvetica", "normal");

  yPos += 15;

  items.forEach((item, index) => {
    // Spatial Math: Convert pixels to inches
    // We assume x=0 is the left edge of the wall photo
    // We assume y corresponds to height, but we need "Distance from Floor"
    
    // Calculate Center X and Y in pixels
    const centerX = item.x + (item.width / 2);
    // const centerY = item.y + (item.height / 2);

    // Convert to inches
    const inchesFromLeft = LayoutEngine.pixelsToInches(centerX, ppi);
    
    // For "From Floor", we assume the bottom of the wall image is the floor level.
    // Calculate distance from bottom of image to the specific nail point (usually near top of frame).
    // Actually, "62 inches up from the floor" usually refers to the nail or center. 
    // Let's provide Center-from-Floor measurement as it's most standard for design, 
    // but for "hanging" users often need the nail position. 
    // Simplification: We'll give the Center position height.
    
    // Y is top-left. Center Y = y + height/2
    const centerYPixels = item.y + (item.height / 2);
    const pixelsFromBottom = wallHeightPixels - centerYPixels;
    const inchesFromFloor = LayoutEngine.pixelsToInches(pixelsFromBottom, ppi);

    doc.text(`#${index + 1}`, 25, yPos);
    doc.text(`${inchesFromLeft.toFixed(1)}"`, 80, yPos);
    doc.text(`${inchesFromFloor.toFixed(1)}"`, 130, yPos);
    
    yPos += 10;
  });

  // Footer
  doc.setFontSize(10);
  doc.setTextColor(150, 150, 150);
  doc.text("Vura - The Interior Design Decision Engine", 20, 280);

  doc.save(`${roomName.replace(/\s+/g, '_')}_Hanging_Map.pdf`);
};
