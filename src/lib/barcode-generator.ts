import JsBarcode from 'jsbarcode';

/**
 * Renders a barcode to an SVG string or directly into an SVG element
 */
export function renderBarcodeSvg(element: SVGSVGElement | null, code: string) {
  if (!element || !code) return;
  try {
    JsBarcode(element, code, {
      format: 'CODE128',
      lineColor: '#000000',
      width: 2.2,
      height: 60,
      displayValue: true,
      fontSize: 14,
      font: 'monospace',
      background: '#FFFFFF',
      margin: 10,
    });
  } catch (err) {
    console.error('Failed to generate barcode SVG:', err);
  }
}

/**
 * Exports barcode SVG as a high-resolution downloadable PNG image
 */
export function downloadBarcodePng(svgElement: SVGSVGElement | null, fileName: string) {
  if (!svgElement) return;

  const svgData = new XMLSerializer().serializeToString(svgElement);
  const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
  const urlHelper = window.URL || (window as any).webkitURL;
  const blobURL = urlHelper.createObjectURL(svgBlob);

  const image = new Image();
  image.onload = () => {
    const canvas = document.createElement('canvas');
    // High DPI 2x scale for crisp card printing
    const scale = 2;
    canvas.width = (svgElement.clientWidth || 300) * scale;
    canvas.height = (svgElement.clientHeight || 120) * scale;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

    const pngUrl = canvas.toDataURL('image/png');
    const downloadLink = document.createElement('a');
    downloadLink.href = pngUrl;
    downloadLink.download = `${fileName}.png`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    urlHelper.revokeObjectURL(blobURL);
  };
  image.src = blobURL;
}

/**
 * Direct print card sticker
 */
export function printBarcodeCard(code: string, memberName: string, gymName: string = 'Gym') {
  const printWindow = window.open('', '_blank', 'width=450,height=350');
  if (!printWindow) return;

  const svgTemp = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  renderBarcodeSvg(svgTemp, code);
  const svgHtml = svgTemp.outerHTML;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Barcode Sticker - ${code}</title>
        <style>
          body {
            font-family: system-ui, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            background: #f4f4f5;
          }
          .card {
            background: #fff;
            border: 2px dashed #000;
            padding: 16px 24px;
            text-align: center;
            border-radius: 8px;
            width: 320px;
          }
          .gym-name {
            font-size: 11px;
            font-weight: 800;
            letter-spacing: 2px;
            text-transform: uppercase;
            color: #d97706;
            margin-bottom: 4px;
          }
          .member-name {
            font-size: 16px;
            font-weight: 700;
            color: #18181b;
            margin-bottom: 8px;
          }
          svg {
            max-width: 100%;
            height: auto;
          }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="gym-name">${gymName.toUpperCase()}</div>
          <div class="member-name">${memberName}</div>
          ${svgHtml}
        </div>
        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() { window.close(); }, 500);
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}
