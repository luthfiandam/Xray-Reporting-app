// Clean & Simple Square Photo Collage Service matching Camera Timestamp layout
export interface CollageItem {
  key: string;
  title: string;
  dataUrl: string;
}

export interface CollageDataOptions {
  equipmentName?: string;
  equipmentCode?: string;
  serialNumber?: string;
  date?: string;
  shift?: string;
  technicians?: string[];
  photos: CollageItem[];
}

export async function generatePhotoCollageUrl(options: CollageDataOptions): Promise<string> {
  const { equipmentName, photos } = options;

  if (photos.length === 0) {
    throw new Error('Tidak ada foto untuk dibuat kolase.');
  }

  // Load all images asynchronously
  const loadedImages: { title: string; img: HTMLImageElement }[] = await Promise.all(
    photos.map((item) => {
      return new Promise<{ title: string; img: HTMLImageElement }>((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve({ title: item.title, img });
        img.onerror = (err) => reject(err);
        img.src = item.dataUrl;
      });
    })
  );

  const count = loadedImages.length;

  // Determine number of rows based on image count
  let numRows = 1;
  if (count === 1) numRows = 1;
  else if (count <= 4) numRows = 2;
  else if (count <= 9) numRows = 3;
  else numRows = 4;

  // Distribute photos across rows so every row fills 100% width (no empty boxes)
  const baseCols = Math.floor(count / numRows);
  let remainder = count % numRows;

  const rowCols: number[] = [];
  for (let r = 0; r < numRows; r++) {
    let cols = baseCols;
    if (remainder > 0) {
      cols += 1;
      remainder -= 1;
    }
    rowCols.push(cols);
  }

  const canvasSize = 1200; // 1200 x 1200 px square canvas
  const gap = 0; // No gap between photo cells
  const padding = 0; // No padding

  const canvas = document.createElement('canvas');
  canvas.width = canvasSize;
  canvas.height = canvasSize;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Canvas context not available');
  }

  // Fill Background
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, canvasSize, canvasSize);

  const now = new Date();
  const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false });
  const dateStr = now.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });

  // Calculate cell heights
  const totalH = canvasSize - padding * 2 - gap * (numRows - 1);
  const cellH = totalH / numRows;

  let imageIndex = 0;
  let currentY = padding;

  for (let r = 0; r < numRows; r++) {
    const colsInRow = rowCols[r];
    const totalW = canvasSize - padding * 2 - gap * (colsInRow - 1);
    const cellW = totalW / colsInRow;

    for (let c = 0; c < colsInRow; c++) {
      if (imageIndex >= count) break;
      const item = loadedImages[imageIndex];

      const x = padding + c * (cellW + gap);
      const y = currentY;

      ctx.save();

      // Clip to cell rectangle
      ctx.beginPath();
      ctx.rect(x, y, cellW, cellH);
      ctx.clip();

      // Draw image aspect-fill (cover)
      const img = item.img;
      const imgAspect = img.width / img.height;
      const cellAspect = cellW / cellH;

      let renderW = cellW;
      let renderH = cellH;
      let offsetX = 0;
      let offsetY = 0;

      if (imgAspect > cellAspect) {
        renderW = cellH * imgAspect;
        offsetX = (cellW - renderW) / 2;
      } else {
        renderH = cellW / imgAspect;
        offsetY = (cellH - renderH) / 2;
      }

      ctx.drawImage(img, x + offsetX, y + offsetY, renderW, renderH);

      // Dark Gradient overlay at bottom of photo for clean timestamp text
      const gradH = Math.min(cellH * 0.3, 90);
      const grad = ctx.createLinearGradient(x, y + cellH - gradH, x, y + cellH);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(1, 'rgba(0,0,0,0.85)');

      ctx.fillStyle = grad;
      ctx.fillRect(x, y + cellH - gradH, cellW, gradH);

      // Watermark Text Overlay: ONLY Date & Time
      ctx.shadowColor = 'rgba(0,0,0,0.9)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;

      const timeFontSize = Math.max(12, Math.floor((cellW / 14) * 0.82));

      ctx.fillStyle = '#ffffff';
      ctx.font = `700 ${timeFontSize}px sans-serif`;
      const timeY = y + cellH - 12;
      ctx.fillText(`${dateStr} ${timeStr}`, x + 12, timeY);

      ctx.restore();

      imageIndex++;
    }

    currentY += cellH + gap;
  }

  return canvas.toDataURL('image/jpeg', 0.80);
}
