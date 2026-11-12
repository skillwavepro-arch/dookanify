import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

export interface PdfExportOptions {
  marginMm?: number;
}

export interface PdfExportResult {
  success: boolean;
  fileName: string;
  savedPath: string;
  base64Data: string;
  blobUrl: string;
  pdfBlob: Blob;
  pdfFile: File | null;
  usedNativeBridge: boolean;
  pageCount: number;
}

let colorProbeCtx: CanvasRenderingContext2D | null = null;

function getColorProbeContext(): CanvasRenderingContext2D | null {
  if (typeof document === 'undefined') return null;
  if (!colorProbeCtx) {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    colorProbeCtx = canvas.getContext('2d', { willReadFrequently: true });
  }
  return colorProbeCtx;
}

function resolveCssColor(colorValue: string, fallback = 'transparent'): string {
  if (!colorValue) return fallback;
  const trimmed = colorValue.trim();
  if (
    !trimmed ||
    trimmed === 'transparent' ||
    trimmed === 'inherit' ||
    trimmed === 'initial' ||
    trimmed === 'currentColor' ||
    trimmed === 'none' ||
    trimmed === 'rgba(0, 0, 0, 0)'
  ) {
    return trimmed || fallback;
  }
  if (
    !/oklch|oklab|color-mix|lch\(|lab\(|hwb\(|color\(/i.test(trimmed) &&
    (trimmed.startsWith('#') || trimmed.startsWith('rgb'))
  ) {
    return trimmed;
  }
  const ctx = getColorProbeContext();
  if (!ctx) return fallback;
  try {
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = '#0f172a';
    ctx.fillStyle = trimmed;
    const normalized = ctx.fillStyle;
    if (
      normalized &&
      !/oklch|oklab|color-mix/i.test(normalized) &&
      (normalized.startsWith('#') || normalized.startsWith('rgb'))
    ) {
      return normalized;
    }
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
    if (a === 0) return 'transparent';
    if (a === 255) return `rgb(${r}, ${g}, ${b})`;
    return `rgba(${r}, ${g}, ${b}, ${(a / 255).toFixed(3)})`;
  } catch {
    return fallback;
  }
}

function sanitizeModernColorFunctions(cssText: string): string {
  if (
    !cssText ||
    !/oklch\(|oklab\(|color-mix\(|lch\(|lab\(|hwb\(|light-dark\(/i.test(cssText)
  ) {
    return cssText;
  }
  const regex = /(?:color-mix|oklch|oklab|lch|lab|hwb|light-dark)\s*\(/gi;
  let out = '';
  let lastIdx = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(cssText)) !== null) {
    const startIdx = match.index;
    if (startIdx < lastIdx) continue;
    out += cssText.slice(lastIdx, startIdx);
    const openParenIdx = startIdx + match[0].length - 1;
    let depth = 1;
    let cur = openParenIdx + 1;
    while (cur < cssText.length && depth > 0) {
      const ch = cssText[cur];
      if (ch === '(') depth++;
      else if (ch === ')') depth--;
      cur++;
    }
    const expr = cssText.slice(startIdx, cur);
    const fnName = match[0].slice(0, -1).trim().toLowerCase();
    let replacement = 'rgb(15, 23, 42)';
    if (fnName === 'color-mix') {
      if (/transparent/i.test(expr)) {
        replacement = 'rgba(5, 150, 105, 0.14)';
      } else {
        const resolved = resolveCssColor(expr, 'rgb(5, 150, 105)');
        replacement = resolved === 'transparent' ? 'rgb(5, 150, 105)' : resolved;
      }
    } else {
      const resolved = resolveCssColor(expr, 'rgb(15, 23, 42)');
      replacement = resolved === 'transparent' ? 'rgb(15, 23, 42)' : resolved;
    }
    out += replacement;
    lastIdx = cur;
    regex.lastIndex = cur;
  }
  out += cssText.slice(lastIdx);
  return out;
}

function collectSafeStylesheetText(): string {
  if (typeof document === 'undefined') return '';
  const chunks: string[] = [];
  try {
    const sheets = Array.from(document.styleSheets);
    for (const sheet of sheets) {
      try {
        if ((sheet.href || '').includes('fonts.googleapis.com')) continue;
        const rules = sheet.cssRules;
        if (!rules) continue;
        for (let i = 0; i < rules.length; i++) {
          const ruleText = rules[i].cssText;
          if (ruleText) {
            chunks.push(sanitizeModernColorFunctions(ruleText));
          }
        }
      } catch {
        // Ignore cross-origin stylesheets
      }
    }
  } catch {
    // Ignore stylesheet inspection errors
  }
  return chunks.join('\n');
}

function inlineComputedStyles(sourceRoot: HTMLElement, targetRoot: HTMLElement): void {
  const sourceNodes = [sourceRoot, ...Array.from(sourceRoot.querySelectorAll('*'))];
  const targetNodes = [targetRoot, ...Array.from(targetRoot.querySelectorAll('*'))];
  const count = Math.min(sourceNodes.length, targetNodes.length);

  for (let i = 0; i < count; i++) {
    const srcEl = sourceNodes[i];
    const tgtEl = targetNodes[i] as HTMLElement | SVGElement;
    if (srcEl && tgtEl && (tgtEl as HTMLElement).style) {
      try {
        const cs = window.getComputedStyle(srcEl);
        const st = (tgtEl as HTMLElement).style;
        st.fontFamily =
          cs.fontFamily || "'Hind Siliguri', 'Plus Jakarta Sans', sans-serif";
        st.fontSize = cs.fontSize;
        st.fontWeight = cs.fontWeight;
        st.lineHeight = cs.lineHeight;
        st.letterSpacing = '0px';
        st.textAlign = cs.textAlign;
        st.boxSizing = 'border-box';
        st.wordBreak = 'normal';
        st.overflowWrap = 'normal';
        st.color = resolveCssColor(cs.color, '#0f172a');
        st.backgroundColor = resolveCssColor(cs.backgroundColor, 'transparent');
        st.borderTopColor = resolveCssColor(cs.borderTopColor, '#e2e8f0');
        st.borderRightColor = resolveCssColor(cs.borderRightColor, '#e2e8f0');
        st.borderBottomColor = resolveCssColor(cs.borderBottomColor, '#e2e8f0');
        st.borderLeftColor = resolveCssColor(cs.borderLeftColor, '#e2e8f0');
        st.outlineColor = resolveCssColor(cs.outlineColor, 'transparent');
        st.textDecorationColor = resolveCssColor(cs.textDecorationColor, '#0f172a');
        st.borderTopWidth = cs.borderTopWidth;
        st.borderRightWidth = cs.borderRightWidth;
        st.borderBottomWidth = cs.borderBottomWidth;
        st.borderLeftWidth = cs.borderLeftWidth;
        st.borderTopStyle = cs.borderTopStyle;
        st.borderRightStyle = cs.borderRightStyle;
        st.borderBottomStyle = cs.borderBottomStyle;
        st.borderLeftStyle = cs.borderLeftStyle;
        st.borderTopLeftRadius = cs.borderTopLeftRadius;
        st.borderTopRightRadius = cs.borderTopRightRadius;
        st.borderBottomLeftRadius = cs.borderBottomLeftRadius;
        st.borderBottomRightRadius = cs.borderBottomRightRadius;
        st.paddingTop = cs.paddingTop;
        st.paddingRight = cs.paddingRight;
        st.paddingBottom = cs.paddingBottom;
        st.paddingLeft = cs.paddingLeft;
        st.marginTop = cs.marginTop;
        st.marginRight = cs.marginRight;
        st.marginBottom = cs.marginBottom;
        st.marginLeft = cs.marginLeft;
        st.display = cs.display;
        st.flexDirection = cs.flexDirection;
        st.justifyContent = cs.justifyContent;
        st.alignItems = cs.alignItems;
        st.gap = cs.gap;
        st.gridTemplateColumns = cs.gridTemplateColumns;
        st.borderCollapse = cs.borderCollapse;

        if (cs.backgroundImage && cs.backgroundImage !== 'none') {
          const cls = typeof srcEl.className === 'string' ? srcEl.className : '';
          if (
            cls.includes('from-emerald-') ||
            cls.includes('via-emerald-') ||
            cls.includes('royal-forest') ||
            cls.includes('#052e1e')
          ) {
            st.backgroundImage =
              'linear-gradient(135deg, #052e1e 0%, #0a4d34 55%, #065f46 100%)';
            st.backgroundColor = '#052e1e';
          } else if (cls.includes('from-amber-') || cls.includes('gold-silk')) {
            st.backgroundImage = 'linear-gradient(135deg, #d4af37 0%, #f3cc56 100%)';
            st.backgroundColor = '#d4af37';
          } else if (cls.includes('from-rose-')) {
            st.backgroundImage = 'linear-gradient(135deg, #be123c 0%, #9f1239 100%)';
            st.backgroundColor = '#be123c';
          } else {
            st.backgroundImage = sanitizeModernColorFunctions(cs.backgroundImage);
          }
        }

        if (cs.boxShadow && cs.boxShadow !== 'none') {
          st.boxShadow = 'none';
        }

        if (srcEl instanceof SVGElement && tgtEl instanceof SVGElement) {
          const fillVal = cs.fill;
          const strokeVal = cs.stroke;
          if (fillVal && /oklch|oklab|color-mix/i.test(fillVal)) {
            tgtEl.style.fill = resolveCssColor(fillVal, 'currentColor');
          }
          if (strokeVal && /oklch|oklab|color-mix/i.test(strokeVal)) {
            tgtEl.style.stroke = resolveCssColor(strokeVal, 'currentColor');
          }
        }
      } catch {
        // Ignore style copy failures
      }
    }
  }
}

function renderFallbackCanvas(element: HTMLElement): HTMLCanvasElement {
  const lines = (element.innerText || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const scale = 2.5;
  const height = Math.max(700, 72 + lines.length * 30 + 120);
  const canvas = document.createElement('canvas');
  canvas.width = 680 * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.scale(scale, scale);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 680, height);
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 2;
    ctx.strokeRect(16, 16, 648, height - 32);

    const grad = ctx.createLinearGradient(24, 24, 656, 130);
    grad.addColorStop(0, '#052e1e');
    grad.addColorStop(1, '#0a4d34');
    ctx.fillStyle = grad;
    ctx.fillRect(24, 24, 632, 108);

    let y = 58;
    lines.forEach((line, idx) => {
      if (idx === 0) {
        ctx.font = '700 13px "Hind Siliguri", sans-serif';
        ctx.fillStyle = '#f3cc56';
        ctx.fillText(line.slice(0, 90), 44, y);
        y += 28;
      } else if (idx === 1) {
        ctx.font = '700 22px "Hind Siliguri", sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(line.slice(0, 90), 44, y);
        y += 26;
      } else if (idx === 2 || idx === 3) {
        ctx.font = '500 13px "Hind Siliguri", sans-serif';
        ctx.fillStyle = idx === 2 ? '#d1fae5' : '#334155';
        if (idx === 3 && y < 155) y = 160;
        ctx.fillText(line.slice(0, 100), 44, y);
        y += 26;
      } else {
        if (y < 160) y = 160;
        if (idx % 2 === 0) {
          ctx.fillStyle = '#f8fafc';
          ctx.fillRect(28, y - 20, 624, 28);
        }
        const isBoldLine =
          line.includes('সর্বমোট') || line.includes('জমা') || line.includes('বাকি');
        ctx.font = isBoldLine
          ? '700 15px "Hind Siliguri", "Plus Jakarta Sans", sans-serif'
          : '500 13.5px "Hind Siliguri", "Plus Jakarta Sans", sans-serif';
        ctx.fillStyle = isBoldLine ? '#052e1e' : '#0f172a';
        ctx.fillText(line.slice(0, 105), 44, y);
        y += 30;
      }
    });
  }
  return canvas;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 32768;
  const chunks: string[] = [];
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const slice = bytes.subarray(i, i + chunkSize);
    chunks.push(String.fromCharCode.apply(null, Array.from(slice)));
  }
  return btoa(chunks.join(''));
}

async function renderPageToCanvas(
  pageEl: HTMLElement,
  targetWidthPx: number,
  scaleFactor: number,
  sanitizedCss: string
): Promise<HTMLCanvasElement> {
  const host = document.createElement('div');
  host.style.position = 'fixed';
  host.style.left = '-9999px';
  host.style.top = '0';
  host.style.width = `${targetWidthPx}px`;
  host.style.boxSizing = 'border-box';
  host.style.backgroundColor = '#ffffff';
  host.style.color = '#0f172a';
  host.style.padding = '14px';
  host.style.fontFamily = "'Hind Siliguri', 'Plus Jakarta Sans', sans-serif";
  host.style.zIndex = '-1';

  const cloned = pageEl.cloneNode(true) as HTMLElement;
  cloned.style.maxHeight = 'none';
  cloned.style.height = 'auto';
  cloned.style.width = '100%';
  cloned.style.boxSizing = 'border-box';
  cloned.style.overflow = 'visible';
  cloned.style.backgroundColor = '#ffffff';
  cloned.style.fontFamily = "'Hind Siliguri', 'Plus Jakarta Sans', sans-serif";

  cloned.querySelectorAll('*').forEach((node) => {
    const el = node as HTMLElement;
    if (
      el.className &&
      typeof el.className === 'string' &&
      (el.className.includes('overflow-y-auto') ||
        el.className.includes('overflow-x-auto') ||
        el.className.includes('max-h-'))
    ) {
      el.style.maxHeight = 'none';
      el.style.height = 'auto';
      el.style.overflow = 'visible';
    }
  });

  host.appendChild(cloned);
  document.body.appendChild(host);

  try {
    inlineComputedStyles(pageEl, cloned);
    return await html2canvas(host, {
      scale: scaleFactor,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      windowWidth: targetWidthPx + 48,
      onclone: (clonedDoc) => {
        clonedDoc.querySelectorAll('link[rel="stylesheet"]').forEach((link) => {
          const href = link.getAttribute('href') || '';
          if (!href.includes('fonts.googleapis.com')) {
            link.parentNode?.removeChild(link);
          }
        });
        clonedDoc.querySelectorAll('style').forEach((styleTag) => {
          if (styleTag.textContent) {
            styleTag.textContent = sanitizeModernColorFunctions(styleTag.textContent);
          }
        });
        const overrideStyle = clonedDoc.createElement('style');
        overrideStyle.textContent = `
          ${sanitizedCss}
          img {
            display: inline !important;
            vertical-align: baseline !important;
          }
          *, *::before, *::after {
            font-family: 'Hind Siliguri', 'Plus Jakarta Sans', sans-serif !important;
            letter-spacing: 0px !important;
            word-break: normal !important;
            overflow-wrap: normal !important;
            box-sizing: border-box !important;
          }
        `;
        clonedDoc.head.appendChild(overrideStyle);
      },
    });
  } catch {
    return renderFallbackCanvas(pageEl);
  } finally {
    if (host.parentNode) {
      host.parentNode.removeChild(host);
    }
  }
}

export async function exportElementToIdenticalPDF(
  element: HTMLElement,
  fileName: string,
  options?: PdfExportOptions
): Promise<PdfExportResult> {
  if (typeof document !== 'undefined' && document.fonts?.ready) {
    try {
      await Promise.race([
        document.fonts.ready,
        new Promise((resolve) => setTimeout(resolve, 1200)),
      ]);
    } catch {
      // Ignore font wait failure
    }
  }

  const isReceipt =
    element.id === 'printable-receipt' || !!element.closest('#printable-receipt');
  const targetWidthPx = isReceipt
    ? 620
    : Math.max(element.scrollWidth, element.clientWidth, 820);
  const scaleFactor = isReceipt ? 2.8 : 2.2;
  const sanitizedCss = collectSafeStylesheetText();

  const pageNodes = Array.from(
    element.querySelectorAll('[data-pdf-page="true"]')
  ) as HTMLElement[];
  const pagesToRender = pageNodes.length > 0 ? pageNodes : [element];

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidthMm = pdf.internal.pageSize.getWidth();
  const pageHeightMm = pdf.internal.pageSize.getHeight();
  const marginMm = options?.marginMm ?? (isReceipt ? 10 : 8);
  const maxContentWidthMm = isReceipt
    ? Math.min(188, pageWidthMm - marginMm * 2)
    : pageWidthMm - marginMm * 2;
  const maxContentHeightMm = pageHeightMm - marginMm * 2;

  for (let i = 0; i < pagesToRender.length; i++) {
    if (i > 0) {
      pdf.addPage();
    }
    const canvas = await renderPageToCanvas(
      pagesToRender[i],
      targetWidthPx,
      scaleFactor,
      sanitizedCss
    );
    const imgData = canvas.toDataURL('image/png', 1.0);
    const proportionalHeightMm =
      (canvas.height * maxContentWidthMm) / Math.max(1, canvas.width);
    let renderW = maxContentWidthMm;
    let renderH = proportionalHeightMm;

    if (renderH > maxContentHeightMm) {
      const ratio = maxContentHeightMm / renderH;
      renderH = maxContentHeightMm;
      renderW *= ratio;
    }

    const offsetX = (pageWidthMm - renderW) / 2;
    const offsetY = marginMm;
    pdf.addImage(imgData, 'PNG', offsetX, offsetY, renderW, renderH);
  }

  const finalFileName = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;
  const pdfArrayBuffer = pdf.output('arraybuffer');
  const base64Data = arrayBufferToBase64(pdfArrayBuffer);
  const pdfBlob = new Blob([pdfArrayBuffer], { type: 'application/pdf' });
  const blobUrl = URL.createObjectURL(pdfBlob);

  let pdfFile: File | null = null;
  try {
    if (typeof File !== 'undefined') {
      pdfFile = new File([pdfBlob], finalFileName, { type: 'application/pdf' });
    }
  } catch {
    pdfFile = null;
  }

  let usedNativeBridge = false;
  const savedPath = `Downloads/${finalFileName}`;
  const isLocalAssetWebView =
    typeof window !== 'undefined' &&
    window.location.hostname === 'appassets.bostraloy.local';

  const win = typeof window !== 'undefined' ? (window as unknown as {
    AndroidBridge?: {
      downloadPdfBase64?: (b64: string, name: string) => boolean;
      sharePdfBase64?: (b64: string, name: string) => boolean;
    };
  }) : undefined;

  if (win?.AndroidBridge && typeof win.AndroidBridge.downloadPdfBase64 === 'function') {
    try {
      if (win.AndroidBridge.downloadPdfBase64(base64Data, finalFileName) !== false) {
        usedNativeBridge = true;
      }
    } catch {
      usedNativeBridge = false;
    }
  }

  if (
    !usedNativeBridge &&
    isLocalAssetWebView &&
    pdfFile &&
    typeof navigator !== 'undefined' &&
    typeof navigator.canShare === 'function' &&
    typeof navigator.share === 'function'
  ) {
    try {
      if (navigator.canShare({ files: [pdfFile] })) {
        await navigator.share({
          files: [pdfFile],
          title: finalFileName,
          text: `${finalFileName} (${savedPath})`,
        });
        usedNativeBridge = true;
      }
    } catch {
      // Fallback to anchor download
    }
  }

  if (!usedNativeBridge && typeof document !== 'undefined') {
    try {
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = finalFileName;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        if (a.parentNode) {
          a.parentNode.removeChild(a);
        }
      }, 400);
    } catch {
      try {
        pdf.save(finalFileName);
      } catch {
        // Ignore fallback error
      }
    }
  }

  return {
    success: true,
    fileName: finalFileName,
    savedPath,
    base64Data,
    blobUrl,
    pdfBlob,
    pdfFile,
    usedNativeBridge,
    pageCount: pagesToRender.length,
  };
}

export async function shareOrOpenGeneratedPdf(
  result: PdfExportResult | null,
  customTitle?: string
): Promise<boolean> {
  if (!result) return false;

  const win = typeof window !== 'undefined' ? (window as unknown as {
    AndroidBridge?: {
      downloadPdfBase64?: (b64: string, name: string) => boolean;
      sharePdfBase64?: (b64: string, name: string) => boolean;
    };
  }) : undefined;

  if (win?.AndroidBridge && typeof win.AndroidBridge.sharePdfBase64 === 'function') {
    try {
      if (win.AndroidBridge.sharePdfBase64(result.base64Data, result.fileName) !== false) {
        return true;
      }
    } catch {
      // Fallback
    }
  }

  if (win?.AndroidBridge && typeof win.AndroidBridge.downloadPdfBase64 === 'function') {
    try {
      if (win.AndroidBridge.downloadPdfBase64(result.base64Data, result.fileName) !== false) {
        return true;
      }
    } catch {
      // Fallback
    }
  }

  if (
    result.pdfFile &&
    typeof navigator !== 'undefined' &&
    typeof navigator.canShare === 'function' &&
    typeof navigator.share === 'function'
  ) {
    try {
      if (navigator.canShare({ files: [result.pdfFile] })) {
        await navigator.share({
          files: [result.pdfFile],
          title: customTitle || result.fileName,
          text: `${customTitle || result.fileName} (${result.savedPath})`,
        });
        return true;
      }
    } catch {
      // Fallback
    }
  }

  if (typeof document !== 'undefined' && result.blobUrl) {
    try {
      const a = document.createElement('a');
      a.href = result.blobUrl;
      a.download = result.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return true;
    } catch {
      // Ignore
    }
  }

  return false;
}
