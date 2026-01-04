export class LayoutEngine {
  /**
   * Calculates the pixel-to-inch ratio based on a user-defined reference.
   * @param referencePixels Length of the reference line in pixels.
   * @param referenceInches Real-world length of the reference line in inches.
   * @returns Pixels per inch (PPI).
   */
  static calculatePixelsPerInch(referencePixels: number, referenceInches: number): number {
    if (referenceInches === 0) return 0;
    return referencePixels / referenceInches;
  }

  /**
   * Converts inches to pixels using the calculated ratio.
   * @param inches Length in inches.
   * @param ppi Pixels per inch.
   * @returns Length in pixels.
   */
  static inchesToPixels(inches: number, ppi: number): number {
    return inches * ppi;
  }

  /**
   * Converts pixels to inches using the calculated ratio.
   * @param pixels Length in pixels.
   * @param ppi Pixels per inch.
   * @returns Length in inches.
   */
  static pixelsToInches(pixels: number, ppi: number): number {
    if (ppi === 0) return 0;
    return pixels / ppi;
  }

  /**
   * The "57-inch Rule": Calculates the Y position (top) for a frame to be centered 
   * at 57 inches from the floor.
   * 
   * @param frameHeightPixels Height of the art frame in pixels.
   * @param wallHeightPixels Total height of the wall image in pixels.
   * @param wallHeightInches Real-world height of the wall (if known) or assumption derived from PPI.
   * @param ppi Pixels per inch.
   * @returns Y coordinate (in pixels) for the top of the frame.
   */
  static apply57InchRule(
    frameHeightPixels: number, 
    wallHeightPixels: number, 
    ppi: number
  ): number {
    // 57 inches from floor to center of art.
    // We assume the bottom of the image is the floor for simplicity, 
    // or we could use calibration if we knew where the floor line was.
    // For this MVP, let's assume bottom of image = floor.
    
    // Distance from floor to center of frame in pixels
    const centerFromFloorPixels = 57 * ppi;
    
    // Y coordinate (0 is top) = (Wall Height) - (57" in pixels) - (Half Frame Height)
    // Wait, we want the CENTER of the frame to be at 57".
    // So CenterY = WallHeight - (57 * ppi)
    // TopY = CenterY - (FrameHeight / 2)
    
    const centerY = wallHeightPixels - centerFromFloorPixels;
    return centerY - (frameHeightPixels / 2);
  }

  /**
   * Layout Logic: Distributes items uniformly horizontally.
   * @param items Array of art pieces.
   * @param startingX X position to start placing items.
   * @param gapInches Desired gap between items in inches.
   * @param ppi Pixels per inch.
   * @returns Updated items with new X coordinates.
   */
  static autoArrangeUniform(items: any[], startingX: number, gapInches: number, ppi: number): any[] {
    const gapPixels = gapInches * ppi;
    let currentX = startingX;
    
    // Sort items by width/importance if needed, or keep order
    return items.map((item) => {
      const updatedItem = { ...item, x: currentX };
      currentX += item.width + gapPixels;
      return updatedItem;
    });
  }

  /**
   * Arranges items in a 2-row grid (2 over 3, or balanced).
   * User Story: "Snaps the five photos into a perfect 2-over-3 grid"
   */
  /**
   * Arranges items in various grid layouts.
   * @param variant 0: Balanced 2-row, 1: Single Row (Line), 2: Single Column
   */
  static arrangeGrid(items: any[], startX: number, startY: number, gapInches: number, ppi: number, variant: number = 0): any[] {
    const gap = gapInches * ppi;
    const count = items.length;
    
    const updatedItems = [];
    
    // VARIANT 0: Balanced Grid (Standard 2 or 3 cols)
    if (variant % 3 === 0) {
        const firstRowCount = Math.ceil(count / 2);
        const row1 = items.slice(0, firstRowCount);
        const row2 = items.slice(firstRowCount);
        
        // Calculate max height of row1 to place row2
        let maxRow1Height = 0;
        let r1X = startX;
        for (const item of row1) {
            updatedItems.push({ ...item, x: r1X, y: startY });
            r1X += item.width + gap;
            if (item.height > maxRow1Height) maxRow1Height = item.height;
        }
        
        const row2Y = startY + maxRow1Height + gap;
        let r2X = startX;
        for (const item of row2) {
            updatedItems.push({ ...item, x: r2X, y: row2Y });
            r2X += item.width + gap;
        }
    } 
    // VARIANT 1: Single Horizontal Row (Gallery Line)
    else if (variant % 3 === 1) {
        let currentX = startX;
        for (const item of items) {
            updatedItems.push({ ...item, x: currentX, y: startY });
            currentX += item.width + gap;
        }
    }
    // VARIANT 2: Single Vertical Column (Stack)
    else {
         let currentY = startY;
         // Center X for stack
         // We might need to adjust X for each if widths differ, to center them?
         // For now, left align at startX
         for (const item of items) {
             updatedItems.push({ ...item, x: startX, y: currentY });
             currentY += item.height + gap;
         }
    }
    
    return updatedItems;
  }

  /**
   * "Mosaic" Layout - clustered organic look.
   * @param variant 0: Standard Spiral, 1: Cloud (Randomized), 2: Steps
   */
  static arrangeMosaic(items: any[], centerX: number, centerY: number, gapInches: number, ppi: number, variant: number = 0): any[] {
    if (items.length === 0) return items;
    const gap = gapInches * ppi;
    
    // Sort logic usually helps mosaics:
    const sorted = [...items].sort((a, b) => (b.width * b.height) - (a.width * a.height));
    
    const updated = [];
    
    // VARIANT 0: Standard Spiral / Quadrants (Previous logic)
    if (variant % 3 === 0) {
        const main = sorted[0];
        const others = sorted.slice(1);
        
        updated.push({ ...main, x: centerX - main.width/2, y: centerY - main.height/2 });
        
        const mainRight = centerX + main.width/2 + gap;
        const mainLeft = centerX - main.width/2 - gap;
        const mainTop = centerY - main.height/2 - gap;
        const mainBottom = centerY + main.height/2 + gap;
        
        others.forEach((item, i) => {
            let x = 0, y = 0;
            switch(i % 4) {
                case 0: x = mainRight; y = centerY - item.height/2; break; // Right
                case 1: x = mainLeft - item.width; y = centerY - item.height/2; break; // Left
                case 2: x = centerX - item.width/2; y = mainTop - item.height; break; // Top
                case 3: x = centerX - item.width/2; y = mainBottom; break; // Bottom
                default: x = centerX + (i*20); y = centerY + (i*20);
            }
            updated.push({ ...item, x, y });
        });
    }
    // VARIANT 1: "Pyramid" / Cloud - Center based but building up
    else if (variant % 3 === 1) {
        // Place largest in center bottom
        const main = sorted[0];
        updated.push({ ...main, x: centerX - main.width/2, y: centerY });
        
        let leftX = centerX - main.width/2 - gap;
        let rightX = centerX + main.width/2 + gap;
        let topY = centerY - gap; // row above
        
        // Fill row above roughly
        sorted.slice(1).forEach((item, i) => {
            // Alternating left/right above
             if (i % 2 === 0) {
                 updated.push({ ...item, x: centerX - item.width - gap, y: topY - item.height});
             } else {
                 updated.push({ ...item, x: centerX + gap, y: topY - item.height});
             }
        });
        
    }
    // VARIANT 2: "Stairs" (Diagonal Step Down)
    else {
        let curX = centerX - (items.length * 100); // Start far left
        let curY = centerY - (items.length * 50); // Start high
        
        items.forEach((item) => {
             updated.push({ ...item, x: curX, y: curY });
             curX += item.width * 0.8; // Overlap slightly or tight packing
             curY += item.height * 0.5;
        });
    }
    
    return updated;
  }

  /**
   * Applies a named template layout to the art pieces.
   * @param items Art pieces to arrange.
   * @param templateName Name of the template ('row', 'grid', 'big-left', 'big-right', 'stairs', 'spiral').
   * @param config Configuration object { startX, startY, gapInches, ppi, wallWidth }.
   */
  static applyTemplate(
      items: any[], 
      templateName: string, 
      config: { startX: number; startY: number; gapInches: number; ppi: number; wallWidth?: number }
  ): any[] {
      const { startX, startY, gapInches, ppi } = config;
      const gap = gapInches * ppi;
      
      const sorted = [...items].sort((a, b) => (b.width * b.height) - (a.width * a.height));
      const updated = [];

      switch (templateName) {
          case 'row': {
              // Center the row
              const totalWidth = items.reduce((sum, item) => sum + item.width, 0) + (items.length - 1) * gap;
              let currentX = (config.wallWidth ? config.wallWidth / 2 : startX) - (totalWidth / 2);
              
              items.forEach(item => {
                  updated.push({ ...item, x: currentX, y: startY });
                  currentX += item.width + gap;
              });
              break;
          }

          case 'grid': {
              // 2 items per row usually, or balanced
              const cols = Math.ceil(Math.sqrt(items.length));
              // Center grid?
              // Simple balanced grid logic
              let rowHeight = 0;
              let rowWidth = 0;
              let currentX = startX; 
              let currentY = startY;
              
              // We need a more robust grid allowing for centering
              // For MVP, reuse arrangeGrid logic but simpler
              return this.arrangeGrid(items, startX, startY, gapInches, ppi, 0); 
          }

          case 'big-left': {
             // Largest on left, others stacked on right
             if (items.length === 0) return [];
             const main = sorted[0];
             const others = sorted.slice(1);
             
             updated.push({ ...main, x: startX, y: startY });
             
             let currentY = startY;
             const rightX = startX + main.width + gap;
             
             others.forEach(item => {
                 updated.push({ ...item, x: rightX, y: currentY });
                 currentY += item.height + gap;
             });
             break;
          }
          
          case 'big-right': {
              // Largest on right, others stacked on left
              if (items.length === 0) return [];
              const main = sorted[0];
              const others = sorted.slice(1);
              
              // We need to know total width to position 'right'? 
              // Or just start Main at startX + others_width?
              // Let's assume startX is the Left edge of the group.
              
              // Calculate width of the 'stack' (max width of others)
              const stackWidth = others.reduce((max, item) => Math.max(max, item.width), 0);
              
              let currentY = startY;
              others.forEach(item => {
                  // Right align the stack items? or left align to startX?
                  updated.push({ ...item, x: startX, y: currentY });
                  currentY += item.height + gap;
              });
              
              const mainX = startX + stackWidth + gap;
              updated.push({ ...main, x: mainX, y: startY });
              break;
          }

          case 'big-center': {
              if (items.length === 0) return [];
              const main = sorted[0];
              const others = sorted.slice(1);
              
              // Center main
              // For simplicity, just place Main, then alternate L/R
              const mainX = startX; // This should be effectively 'center' if caller passes center?
              // Actually, assume startX is center for this one
              updated.push({ ...main, x: mainX - main.width/2, y: startY });
              
              const leftX = mainX - main.width/2 - gap;
              const rightX = mainX + main.width/2 + gap;
              
              let lY = startY;
              let rY = startY;
              
              others.forEach((item, i) => {
                  if (i % 2 === 0) {
                      updated.push({ ...item, x: leftX - item.width, y: lY });
                      lY += item.height + gap;
                  } else {
                      updated.push({ ...item, x: rightX, y: rY });
                      rY += item.height + gap;
                  }
              });
              break;
          }

          case 'stairs': {
              // Simple step down
              let cx = startX;
              let cy = startY;
              items.forEach(item => {
                  updated.push({ ...item, x: cx, y: cy });
                  cx += item.width + gap;
                  cy += item.height / 2;
              });
              break;
          }

          default:
              return items;
      }
      return updated;
  }
}
