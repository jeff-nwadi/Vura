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
  wallHeightPixels: number;
}

export const generateHangingGuide = (data: HangingMapData) => {
  const doc = new jsPDF();
  const { roomName, items, ppi, wallHeightPixels } = data;

  const accentColor = [37, 99, 235]; // #2563eb
  const secondaryColor = [100, 116, 139]; // Slate 500
  const textColor = [30, 41, 59]; // Slate 800

  // --- Header & Logo ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.setTextColor(0, 0, 0);
  doc.text("VURA", 20, 25);
  doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.text(".", 49, 25); // Minimalist dot logo

  doc.setFontSize(10);
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.setFont("helvetica", "normal");
  doc.text("SPATIAL DESIGN ENGINE", 20, 32);

  const date = new Date().toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric'
  });
  doc.text(`DATE: ${date.toUpperCase()}`, 190, 32, { align: 'right' });

  // Divider
  doc.setDrawColor(226, 232, 240); // Slate 200
  doc.line(20, 40, 190, 40);

  // --- Project Info ---
  doc.setFontSize(18);
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.setFont("helvetica", "bold");
  doc.text(roomName.toUpperCase(), 20, 55);

  // --- Instructions ---
  doc.setFillColor(248, 250, 252); // Slate 50
  doc.rect(20, 65, 170, 35, 'F');

  doc.setFontSize(10);
  doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.text("INSTALLATION GUIDE", 25, 75);

  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.setFont("helvetica", "normal");
  doc.text("1. Establish reference point: The bottom-left corner of the wall image.", 25, 82);
  doc.text("2. Measure horizontal distance (X) from the left edge.", 25, 87);
  doc.text("3. Measure vertical distance (Y) up from the floor level.", 25, 92);

  // --- Table Header ---
  let yPos = 115;
  doc.setFillColor(30, 41, 59); // Slate 800
  doc.rect(20, yPos - 7, 170, 12, 'F');

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text("ID", 25, yPos);
  doc.text("PIECE DIMENSIONS (W \u00d7 H)", 40, yPos);
  doc.text("FROM LEFT (X)", 110, yPos);
  doc.text("FROM FLOOR (Y)", 155, yPos);

  yPos += 12;

  // --- Table Rows ---
  items.forEach((item, index) => {
    // Spatial Calculations
    const centerXPixels = item.x + (item.width / 2);
    const centerYPixels = item.y + (item.height / 2);

    const inchesFromLeft = LayoutEngine.pixelsToInches(centerXPixels, ppi);
    const pixelsFromBottom = wallHeightPixels - centerYPixels;
    const inchesFromFloor = LayoutEngine.pixelsToInches(pixelsFromBottom, ppi);

    const pieceWidth = LayoutEngine.pixelsToInches(item.width, ppi);
    const pieceHeight = LayoutEngine.pixelsToInches(item.height, ppi);

    // Zebra Striping
    if (index % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(20, yPos - 7, 170, 10, 'F');
    }

    doc.setFont("helvetica", "normal");
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.text(`#${index + 1}`, 25, yPos);
    doc.text(`${pieceWidth.toFixed(1)}" \u00d7 ${pieceHeight.toFixed(1)}"`, 40, yPos);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.text(`${inchesFromLeft.toFixed(1)}"`, 110, yPos);
    doc.text(`${inchesFromFloor.toFixed(1)}"`, 155, yPos);

    yPos += 10;

    // Check for page overflow
    if (yPos > 270) {
      doc.addPage();
      yPos = 30;
    }
  });

  // --- Footer ---
  const footerY = 285;
  doc.setDrawColor(226, 232, 240);
  doc.line(20, footerY - 5, 190, footerY - 5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.text("VURA \u00a9 2026. PROFESSIONAL GRADE HANGING DATA.", 20, footerY);
  doc.text("PAGE 1 OF 1", 190, footerY, { align: 'right' });

  doc.save(`${roomName.replace(/\s+/g, '_')}_VURA_GUIDE.pdf`);
};
