import { jsPDF } from 'jspdf';
import { getFieldValue, normalizeKey } from '../utils/measurementLabels.js';
import { getShirtPatternLabel, getPantPatternLabel } from '../utils/patternOptions.js';
import { formatDate } from '../utils/dateUtils.js';

/**
 * Professional PDF Order Slip Generator for Silai Master Tailor Management System
 * Built with jsPDF, featuring Navy Blue + Gold tailoring brand styling.
 */

// Brand Palette (RGB format for jsPDF)
const COLORS = {
  primaryNavy: [11, 31, 58],      // #0B1F3A
  deepNavy: [20, 45, 78],          // #142D4E
  accentGold: [212, 175, 55],      // #D4AF37
  goldLight: [253, 249, 238],      // #FDF9EE
  warmWhite: [248, 247, 242],      // #F8F7F2
  white: [255, 255, 255],
  darkText: [23, 32, 51],          // #172033
  mutedText: [100, 116, 139],      // #64748B
  borderLight: [226, 232, 240],    // #E2E8F0
  statusGreen: [22, 101, 52],      // #166534
};

/**
 * Detect non-ASCII characters (e.g. Gujarati script \u0A80-\u0AFF, Indic scripts, etc.)
 */
export const containsNonAscii = (str) => {
  if (!str) return false;
  return /[^\x00-\x7F]/.test(String(str));
};

const textImageCache = new Map();

/**
 * Render text (especially containing Unicode/Gujarati scripts) to a high-resolution PNG data URL.
 * In browser environments, Canvas 2D uses native HarfBuzz/DirectWrite/CoreText complex text shaping
 * to render Gujarati ligatures and matras with 100% typographic accuracy.
 */
const renderTextToImage = (text, options = {}) => {
  if (typeof document === 'undefined') return null;

  const {
    widthMm = 28,
    heightMm = 6,
    color = '#64748B',
    fontSizePt = 7,
    fontWeight = 'bold',
    fontFamily = '"Noto Sans Gujarati", "Shruti", "Nirmala UI", "Gujarati Sangam MN", sans-serif',
    align = 'center',
    line1 = '',
    line2 = '',
    scale = 4, // 4x for 300+ DPI razor-sharp print quality
  } = options;

  const cacheKey = `${text || (line1 + '||' + line2)}_${widthMm}_${heightMm}_${color}_${fontSizePt}_${fontWeight}_${align}`;
  if (textImageCache.has(cacheKey)) {
    return textImageCache.get(cacheKey);
  }

  // 1mm ~ 3.7795 px at 96 DPI
  const pxPerMm = 3.7795 * scale;
  const canvasW = Math.max(10, Math.round(widthMm * pxPerMm));
  const canvasH = Math.max(10, Math.round(heightMm * pxPerMm));

  const canvas = document.createElement('canvas');
  canvas.width = canvasW;
  canvas.height = canvasH;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';

  const posX = align === 'center' ? canvasW / 2 : align === 'right' ? canvasW - 4 * scale : 4 * scale;

  if (line1 !== undefined && line2 !== undefined && (line1 || line2)) {
    // 2-line mode: English on line 1, Gujarati transliteration / name in parentheses on line 2
    let l1Size = Math.max(7 * scale, Math.round(fontSizePt * scale * 1.05));
    let l2Size = Math.max(6 * scale, Math.round(fontSizePt * scale * 0.95));

    // Measure line 1 and scale down if needed
    ctx.font = `${fontWeight} ${l1Size}px ${fontFamily}`;
    let l1W = ctx.measureText(line1).width;
    const maxW = canvasW - 4 * scale;
    while (l1W > maxW && l1Size > 6 * scale) {
      l1Size -= 1 * scale;
      ctx.font = `${fontWeight} ${l1Size}px ${fontFamily}`;
      l1W = ctx.measureText(line1).width;
    }

    // Measure line 2 and scale down if needed
    ctx.font = `normal ${l2Size}px ${fontFamily}`;
    let l2W = ctx.measureText(line2).width;
    while (l2W > maxW && l2Size > 5 * scale) {
      l2Size -= 1 * scale;
      ctx.font = `normal ${l2Size}px ${fontFamily}`;
      l2W = ctx.measureText(line2).width;
    }

    // Draw line 1 (upper half)
    ctx.font = `${fontWeight} ${l1Size}px ${fontFamily}`;
    ctx.fillText(line1, posX, canvasH * 0.32);

    // Draw line 2 (lower half)
    ctx.font = `normal ${l2Size}px ${fontFamily}`;
    ctx.fillText(line2, posX, canvasH * 0.74);
  } else {
    // Single line mode with auto-fit downscaling
    let currentSize = Math.round(fontSizePt * scale * 1.3);
    ctx.font = `${fontWeight} ${currentSize}px ${fontFamily}`;
    let measuredW = ctx.measureText(text).width;
    const maxW = canvasW - 4 * scale;

    while (measuredW > maxW && currentSize > 6 * scale) {
      currentSize -= 1 * scale;
      ctx.font = `${fontWeight} ${currentSize}px ${fontFamily}`;
      measuredW = ctx.measureText(text).width;
    }

    ctx.fillText(text, posX, canvasH / 2);
  }

  const dataUrl = canvas.toDataURL('image/png');
  textImageCache.set(cacheKey, dataUrl);
  return dataUrl;
};

/**
 * Draw measurement box label safely.
 * If Gujarati script is present, renders a high-res image via HTML5 Canvas so that
 * jsPDF standard fonts do not corrupt the Unicode characters into WinAnsi mojibake.
 */
const drawMeasurementBoxLabel = (doc, field, bx, by, boxW, boxH) => {
  const englishLabel = String(field.label || field.key || '').trim();
  const gujaratiLabel = String(field.gujaratiLabel || '').trim();

  // If Gujarati text exists, render via Canvas 2D image
  const hasGujarati = Boolean(gujaratiLabel && containsNonAscii(gujaratiLabel));

  if (hasGujarati && typeof document !== 'undefined') {
    const labelHeightMm = 5.8;
    const labelWidthMm = boxW - 2;

    const line1 = englishLabel;
    const line2 = `(${gujaratiLabel})`;

    const dataUrl = renderTextToImage(null, {
      widthMm: labelWidthMm,
      heightMm: labelHeightMm,
      color: '#64748B',
      fontSizePt: 6.8,
      fontWeight: 'bold',
      align: 'center',
      line1,
      line2,
    });

    if (dataUrl) {
      doc.addImage(dataUrl, 'PNG', bx + 1, by + 0.8, labelWidthMm, labelHeightMm);
      return;
    }
  }

  // Fallback for pure ASCII or in non-browser environments (e.g. Node tests):
  doc.setTextColor(...COLORS.mutedText);
  doc.setFont('helvetica', 'bold');

  let labelText = englishLabel;
  // Only append gujaratiLabel if it does NOT contain non-ASCII (prevents jsPDF mojibake)
  if (gujaratiLabel && !containsNonAscii(gujaratiLabel) && gujaratiLabel.toLowerCase() !== englishLabel.toLowerCase()) {
    labelText = `${englishLabel} (${gujaratiLabel})`;
  }

  const maxW = boxW - 2;
  const textWidth = doc.getTextWidth(labelText);
  if (textWidth > maxW) {
    doc.setFontSize(Math.max(4.8, 6.8 * (maxW / textWidth)));
  } else {
    doc.setFontSize(6.8);
  }
  doc.text(labelText, bx + boxW / 2, by + 4.5, { align: 'center', maxWidth: maxW });
};

/**
 * Universal text drawer that handles Unicode / Gujarati strings by rendering via high-DPI canvas
 * when necessary, avoiding jsPDF's built-in font Unicode limitations.
 */
const drawSmartText = (doc, text, x, y, options = {}) => {
  const str = String(text || '').trim();
  if (!str) return;

  const {
    fontSize = 8.5,
    fontStyle = 'normal',
    color = COLORS.darkText,
    maxWidth = 100,
    align = 'left',
  } = options;

  if (containsNonAscii(str) && typeof document !== 'undefined') {
    const heightMm = Math.max(4.2, fontSize * 0.44);
    const hexColor = Array.isArray(color)
      ? `#${color.map((c) => c.toString(16).padStart(2, '0')).join('')}`
      : color;

    const dataUrl = renderTextToImage(str, {
      widthMm: maxWidth,
      heightMm: heightMm,
      color: hexColor,
      fontSizePt: fontSize,
      fontWeight: fontStyle === 'bold' ? 'bold' : 'normal',
      align,
    });

    if (dataUrl) {
      const imgX = align === 'center' ? x - maxWidth / 2 : align === 'right' ? x - maxWidth : x;
      doc.addImage(dataUrl, 'PNG', imgX, y - heightMm * 0.72, maxWidth, heightMm);
      return;
    }
  }

  // Standard jsPDF vector text for pure ASCII
  doc.setFont('helvetica', fontStyle);
  if (Array.isArray(color)) {
    doc.setTextColor(...color);
  } else {
    doc.setTextColor(color);
  }
  doc.setFontSize(fontSize);

  // In non-browser environments (e.g. Node tests), sanitize non-ASCII so WinAnsi doesn't mangle
  const safeStr = typeof document === 'undefined' && containsNonAscii(str)
    ? str.replace(/[^\x00-\x7F]/g, '')
    : str;

  doc.text(safeStr, x, y, { align, maxWidth });
};

/**
 * Format pattern names from order data with human labels and custom patterns
 */
const getPatternsDisplay = (garment, category = 'shirt') => {
  if (!garment) return 'Standard / None';
  const rawList = Array.isArray(garment.patterns) && garment.patterns.length > 0
    ? garment.patterns
    : (garment.pattern ? (Array.isArray(garment.pattern) ? garment.pattern : String(garment.pattern).split(',').map((s) => s.trim())) : []);

  const items = [];
  rawList.filter(Boolean).forEach((pat) => {
    const formatted = category === 'shirt'
      ? getShirtPatternLabel(pat, pat)
      : getPantPatternLabel(pat, pat);
    items.push(formatted || pat);
  });

  if (garment.customPattern && String(garment.customPattern).trim()) {
    items.push(`Custom: ${garment.customPattern.trim()}`);
  }

  return items.length > 0 ? items.join(', ') : 'Standard / None';
};

/**
 * Resolve displayable measurement fields dynamically from:
 * 1. Saved order measurement snapshot (preserves historical field labels & Gujarati names)
 * 2. Active/configured tenant definitions
 * 3. Any additional custom measurement keys stored in the order
 */
const resolvePdfFields = (category, measurements = {}, snapshotList = [], tenantDefs = []) => {
  const result = [];
  const handledKeys = new Set();
  const norm = (k) => String(k || '').toLowerCase().replace(/[^a-z0-9]/g, '');

  // Index tenant definitions by exact key and normalized key
  const defsMap = new Map();
  if (Array.isArray(tenantDefs)) {
    tenantDefs.forEach((d) => {
      if (d.fieldKey) {
        defsMap.set(d.fieldKey, d);
        defsMap.set(norm(d.fieldKey), d);
      }
    });
  }

  // 1. Process Order Snapshot if present (preserves historical naming, ordering & values exactly)
  if (Array.isArray(snapshotList) && snapshotList.length > 0) {
    snapshotList.forEach((s) => {
      const k = s.fieldKey;
      handledKeys.add(k);
      handledKeys.add(norm(k));

      const liveVal = getFieldValue(measurements, k);
      const finalVal = liveVal !== ''
        ? String(liveVal)
        : (s.value !== undefined && s.value !== null && String(s.value).trim() !== '' ? String(s.value) : '-');

      const def = defsMap.get(k) || defsMap.get(norm(k));
      const displayName = s.displayName || def?.displayName || k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
      const gujaratiName = s.gujaratiName || def?.gujaratiName || '';

      result.push({
        key: k,
        label: displayName,
        gujaratiLabel: gujaratiName,
        val: finalVal,
      });
    });

    return result;
  }

  // 2. For legacy orders without a snapshot:
  // Render ONLY the measurement fields that actually have saved, non-empty values in this order!
  Object.keys(measurements || {}).forEach((k) => {
    if (
      k !== 'notes' &&
      k !== '_id' &&
      !k.startsWith('$') &&
      !k.startsWith('_') &&
      !handledKeys.has(k) &&
      !handledKeys.has(norm(k))
    ) {
      const v = measurements[k];
      if (v !== undefined && v !== null && String(v).trim().length > 0) {
        handledKeys.add(k);
        handledKeys.add(norm(k));
        const def = defsMap.get(k) || defsMap.get(norm(k));
        result.push({
          key: k,
          label: def?.displayName || k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
          gujaratiLabel: def?.gujaratiName || '',
          val: String(v),
        });
      }
    }
  });

  return result;
};

/**
 * Build the jsPDF document for a given order
 */
export const generateOrderSlipPdf = (order, user = null, options = {}) => {
  if (!order) {
    throw new Error('Order data is required to generate a print slip.');
  }

  const { shirtDefinitions = [], pantDefinitions = [] } = options;

  // Create A4 portrait document (210mm x 297mm)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2; // 182mm

  let y = 14;

  // 1. TOP HEADER BANNER
  // Navy background container
  doc.setFillColor(...COLORS.primaryNavy);
  doc.roundedRect(margin, y, contentWidth, 26, 3, 3, 'F');

  // Gold accent accent line at bottom of header banner
  doc.setFillColor(...COLORS.accentGold);
  doc.rect(margin, y + 24.5, contentWidth, 1.5, 'F');

  // Business Name
  doc.setTextColor(...COLORS.white);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  const shopName = (user?.tenant?.businessName || user?.shopName || 'TAILOR STUDIO').toUpperCase();
  doc.text(shopName, margin + 8, y + 10);

  // Subtitle
  doc.setTextColor(...COLORS.accentGold);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text('BESPOKE TAILORING STUDIO  •  PRODUCTION WORK ORDER SLIP', margin + 8, y + 16.5);

  // Order Number badge on top right
  doc.setFillColor(...COLORS.deepNavy);
  doc.roundedRect(pageWidth - margin - 58, y + 5, 50, 15, 2, 2, 'F');
  doc.setDrawColor(...COLORS.accentGold);
  doc.setLineWidth(0.5);
  doc.roundedRect(pageWidth - margin - 58, y + 5, 50, 15, 2, 2, 'D');

  doc.setTextColor(203, 213, 225);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('ORDER NUMBER', pageWidth - margin - 33, y + 10, { align: 'center' });

  doc.setTextColor(...COLORS.accentGold);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(String(order.orderNumber || '-'), pageWidth - margin - 33, y + 16.5, { align: 'center' });

  y += 32;

  // 2. ORDER SCHEDULE & CUSTOMER INFORMATION SUMMARY (2 COLUMNS)
  const colWidth = (contentWidth - 6) / 2; // ~88mm each
  const cardHeight = 36;

  // Customer Card (Left)
  doc.setFillColor(...COLORS.white);
  doc.setDrawColor(...COLORS.borderLight);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, y, colWidth, cardHeight, 2, 2, 'FD');

  // Left card title bar
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(margin, y, colWidth, 7, 2, 2, 'F');
  doc.setTextColor(...COLORS.primaryNavy);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('CUSTOMER DETAILS', margin + 5, y + 5);

  doc.setTextColor(...COLORS.darkText);
  doc.setFont('helvetica', 'bold');
  const custName = order.customerSnapshot?.name || order.customer?.name || 'Walk-in Customer';
  drawSmartText(doc, custName.length > 30 ? custName.substring(0, 30) + '...' : custName, margin + 5, y + 14, {
    fontSize: 10,
    fontStyle: 'bold',
    color: COLORS.darkText,
    maxWidth: colWidth - 10,
  });

  doc.setTextColor(...COLORS.mutedText);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  const mobile = order.customerSnapshot?.mobileNumber || order.customer?.mobileNumber || '-';
  doc.text(`Phone: ${mobile}`, margin + 5, y + 20);

  const address = order.customerSnapshot?.address || order.customer?.address || '';
  if (address) {
    const cleanAddr = address.length > 38 ? address.substring(0, 38) + '...' : address;
    drawSmartText(doc, `Address: ${cleanAddr}`, margin + 5, y + 26, {
      fontSize: 8.5,
      fontStyle: 'normal',
      color: COLORS.mutedText,
      maxWidth: colWidth - 10,
    });
  }

  // Order Details Card (Right)
  const rightX = margin + colWidth + 6;
  doc.setFillColor(...COLORS.white);
  doc.setDrawColor(...COLORS.borderLight);
  doc.roundedRect(rightX, y, colWidth, cardHeight, 2, 2, 'FD');

  // Right card title bar
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(rightX, y, colWidth, 7, 2, 2, 'F');
  doc.setTextColor(...COLORS.primaryNavy);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('ORDER TIMELINE & STATUS', rightX + 5, y + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...COLORS.mutedText);
  doc.text('Order Date:', rightX + 5, y + 14);
  doc.setTextColor(...COLORS.darkText);
  doc.setFont('helvetica', 'bold');
  doc.text(formatDate(order.orderDate), rightX + 32, y + 14);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.mutedText);
  doc.text('Delivery Due:', rightX + 5, y + 20);
  doc.setTextColor(...COLORS.primaryNavy);
  doc.setFont('helvetica', 'bold');
  doc.text(formatDate(order.deadline), rightX + 32, y + 20);

  if (order.deliveryTime) {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.mutedText);
    doc.text('Delivery Time:', rightX + 5, y + 26);
    doc.setTextColor(...COLORS.darkText);
    doc.text(String(order.deliveryTime), rightX + 32, y + 26);
  }

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.mutedText);
  doc.text('Status:', rightX + 5, y + 32);
  const statusFormatted = (order.status || 'in_progress').replace('_', ' ').toUpperCase();
  doc.setTextColor(...COLORS.statusGreen);
  doc.setFont('helvetica', 'bold');
  doc.text(statusFormatted, rightX + 32, y + 32);

  y += cardHeight + 8;

  // 3. SHIRT MEASUREMENTS SECTION (Render ONLY if shirt quantity > 0)
  if (order.shirt?.quantity > 0) {
    const sQty = order.shirt.quantity;
    const sMeasurements = order.shirt.measurements || {};
    const sPatternsText = getPatternsDisplay(order.shirt, 'shirt');

    // Section Header Banner
    doc.setFillColor(...COLORS.primaryNavy);
    doc.roundedRect(margin, y, contentWidth, 8, 1.5, 1.5, 'F');
    doc.setFillColor(...COLORS.accentGold);
    doc.rect(margin, y, 3.5, 8, 'F');

    doc.setTextColor(...COLORS.white);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text(`SHIRT SPECIFICATIONS  (Quantity: ${sQty})`, margin + 7, y + 5.5);

    y += 10;

    // Pattern bar
    doc.setFillColor(...COLORS.goldLight);
    doc.setDrawColor(...COLORS.accentGold);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, y, contentWidth, 7, 1, 1, 'FD');
    doc.setTextColor(...COLORS.primaryNavy);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('Selected Patterns / Styling:', margin + 4, y + 4.5);
    const sPatTruncated = sPatternsText.length > 80 ? sPatternsText.substring(0, 80) + '...' : sPatternsText;
    drawSmartText(doc, sPatTruncated, margin + 46, y + 4.5, {
      fontSize: 8,
      fontStyle: 'normal',
      color: COLORS.darkText,
      maxWidth: contentWidth - 50,
    });

    y += 9;

    // Measurement Box Grid (6 columns across contentWidth)
    const displayShirtFields = resolvePdfFields('shirt', sMeasurements, order.measurementSnapshot?.shirt, shirtDefinitions);

    const colsPerRow = 6;
    const boxW = (contentWidth - (colsPerRow - 1) * 3) / colsPerRow;
    const boxH = 13;

    displayShirtFields.forEach((field, idx) => {
      const colIdx = idx % colsPerRow;
      const rowIdx = Math.floor(idx / colsPerRow);
      const bx = margin + colIdx * (boxW + 3);
      const by = y + rowIdx * (boxH + 2.5);

      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(...COLORS.borderLight);
      doc.setLineWidth(0.25);
      doc.roundedRect(bx, by, boxW, boxH, 1.5, 1.5, 'FD');

      // Label (English name + optional Gujarati in parentheses, rendered cleanly without mojibake)
      drawMeasurementBoxLabel(doc, field, bx, by, boxW, boxH);

      // Measurement Value
      doc.setTextColor(...COLORS.primaryNavy);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      const val = field.val !== undefined && field.val !== null ? String(field.val) : '-';
      doc.text(val, bx + boxW / 2, by + 10.5, { align: 'center' });
    });

    const shirtRows = Math.ceil(displayShirtFields.length / colsPerRow);
    y += shirtRows * (boxH + 2.5) + 3;

    if (sMeasurements.notes) {
      doc.setFillColor(254, 252, 232);
      doc.setDrawColor(254, 240, 138);
      doc.roundedRect(margin, y, contentWidth, 6, 1, 1, 'FD');
      drawSmartText(doc, `Shirt Notes: ${sMeasurements.notes}`, margin + 4, y + 4.2, {
        fontSize: 7.5,
        fontStyle: 'bold',
        color: COLORS.darkText,
        maxWidth: contentWidth - 8,
      });
      y += 8;
    }
  }

  // 4. PANT MEASUREMENTS SECTION (Render ONLY if pant quantity > 0)
  if (order.pant?.quantity > 0) {
    const pQty = order.pant.quantity;
    const pMeasurements = order.pant.measurements || {};
    const pPatternsText = getPatternsDisplay(order.pant, 'pant');

    // Section Header Banner
    doc.setFillColor(...COLORS.deepNavy);
    doc.roundedRect(margin, y, contentWidth, 8, 1.5, 1.5, 'F');
    doc.setFillColor(...COLORS.accentGold);
    doc.rect(margin, y, 3.5, 8, 'F');

    doc.setTextColor(...COLORS.white);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text(`PANT / TROUSER SPECIFICATIONS  (Quantity: ${pQty})`, margin + 7, y + 5.5);

    y += 10;

    // Pattern bar
    doc.setFillColor(...COLORS.goldLight);
    doc.setDrawColor(...COLORS.accentGold);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, y, contentWidth, 7, 1, 1, 'FD');
    doc.setTextColor(...COLORS.primaryNavy);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('Selected Patterns / Styling:', margin + 4, y + 4.5);
    const pPatTruncated = pPatternsText.length > 80 ? pPatternsText.substring(0, 80) + '...' : pPatternsText;
    drawSmartText(doc, pPatTruncated, margin + 46, y + 4.5, {
      fontSize: 8,
      fontStyle: 'normal',
      color: COLORS.darkText,
      maxWidth: contentWidth - 50,
    });

    y += 9;

    // Measurement Box Grid
    const displayPantFields = resolvePdfFields('pant', pMeasurements, order.measurementSnapshot?.pant, pantDefinitions);

    const colsPerRow = 6;
    const boxW = (contentWidth - (colsPerRow - 1) * 3) / colsPerRow;
    const boxH = 13;

    displayPantFields.forEach((field, idx) => {
      const colIdx = idx % colsPerRow;
      const rowIdx = Math.floor(idx / colsPerRow);
      const bx = margin + colIdx * (boxW + 3);
      const by = y + rowIdx * (boxH + 2.5);

      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(...COLORS.borderLight);
      doc.setLineWidth(0.25);
      doc.roundedRect(bx, by, boxW, boxH, 1.5, 1.5, 'FD');

      // Label (English name + optional Gujarati in parentheses, rendered cleanly without mojibake)
      drawMeasurementBoxLabel(doc, field, bx, by, boxW, boxH);

      // Measurement Value
      doc.setTextColor(...COLORS.primaryNavy);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      const val = field.val !== undefined && field.val !== null ? String(field.val) : '-';
      doc.text(val, bx + boxW / 2, by + 10.5, { align: 'center' });
    });

    const pantRows = Math.ceil(displayPantFields.length / colsPerRow);
    y += pantRows * (boxH + 2.5) + 3;

    if (pMeasurements.notes) {
      doc.setFillColor(254, 252, 232);
      doc.setDrawColor(254, 240, 138);
      doc.roundedRect(margin, y, contentWidth, 6, 1, 1, 'FD');
      drawSmartText(doc, `Pant Notes: ${pMeasurements.notes}`, margin + 4, y + 4.2, {
        fontSize: 7.5,
        fontStyle: 'bold',
        color: COLORS.darkText,
        maxWidth: contentWidth - 8,
      });
      y += 8;
    }
  }

  // 5. SPECIAL INSTRUCTIONS (If any)
  if (order.specialInstructions && String(order.specialInstructions).trim()) {
    y += 2;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(...COLORS.borderLight);
    doc.roundedRect(margin, y, contentWidth, 14, 1.5, 1.5, 'FD');

    doc.setTextColor(...COLORS.primaryNavy);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('SPECIAL WORKSHOP INSTRUCTIONS:', margin + 4, y + 5);

    const instText = String(order.specialInstructions).trim();
    drawSmartText(doc, instText.length > 105 ? instText.substring(0, 105) + '...' : instText, margin + 4, y + 10, {
      fontSize: 8,
      fontStyle: 'normal',
      color: COLORS.darkText,
      maxWidth: contentWidth - 8,
    });

    y += 18;
  } else {
    y += 4;
  }

  // 6. TAILOR WORKSHOP SIGN-OFF & VERIFICATION
  if (y + 40 > pageHeight - 12) {
    doc.addPage();
    y = margin + 8;
  }

  const footerY = Math.max(y + 8, pageHeight - 34);

  doc.setDrawColor(...COLORS.borderLight);
  doc.setLineWidth(0.3);
  doc.line(margin, footerY, pageWidth - margin, footerY);

  const signWidth = 50;

  // Master Tailor Signature Box
  doc.setTextColor(...COLORS.mutedText);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text('Cutting & Stitching Tailor', margin + 4, footerY + 6);
  doc.setLineDashPattern([1, 1], 0);
  doc.setDrawColor(180, 190, 205);
  doc.line(margin + 4, footerY + 18, margin + signWidth, footerY + 18);
  doc.text('Signature / Date', margin + 4, footerY + 22);

  // Quality Checked Box
  const qcX = margin + (contentWidth - signWidth) / 2;
  doc.text('Quality Checked & Verified', qcX, footerY + 6);
  doc.line(qcX, footerY + 18, qcX + signWidth, footerY + 18);
  doc.text('Checker Sign / Stamp', qcX, footerY + 22);

  // Customer Acknowledgment Box
  const custX = pageWidth - margin - signWidth;
  doc.text('Customer Acknowledgment', custX, footerY + 6);
  doc.line(custX, footerY + 18, custX + signWidth, footerY + 18);
  doc.text('Received in Good Condition', custX, footerY + 22);

  doc.setLineDashPattern([], 0); // reset line dash

  // Absolute Footer Bar
  doc.setFillColor(...COLORS.primaryNavy);
  doc.rect(0, pageHeight - 7, pageWidth, 7, 'F');
  doc.setTextColor(...COLORS.white);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  const footerShop = user?.tenant?.businessName || user?.shopName || 'Tailor Studio';
  doc.text(
    `Generated on ${new Date().toLocaleString()}  •  ${footerShop} Tailor Management System  •  Professional Work Order`,
    pageWidth / 2,
    pageHeight - 2.5,
    { align: 'center' }
  );

  return doc;
};

/**
 * Trigger immediate client-side download of the Order Slip PDF
 */
export const downloadOrderSlipPdf = (order, user = null, options = {}) => {
  const doc = generateOrderSlipPdf(order, user, options);
  const cleanOrderNum = String(order.orderNumber || 'Order').replace(/[^a-zA-Z0-9_-]/g, '_');
  doc.save(`Order_Slip_${cleanOrderNum}.pdf`);
};

/**
 * Get Blob URL for instant PDF preview inside an iframe
 */
export const getOrderSlipPdfBlobUrl = (order, user = null, options = {}) => {
  const doc = generateOrderSlipPdf(order, user, options);
  const blob = doc.output('blob');
  return URL.createObjectURL(blob);
};
