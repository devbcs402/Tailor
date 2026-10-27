import { jsPDF } from 'jspdf';
import { SHIRT_FIELDS, PANT_FIELDS, getFieldValue } from '../utils/measurementLabels.js';
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
 * Format pattern names from order data without dummy defaults
 */
const getPatternsDisplay = (garment) => {
  if (!garment) return 'None specified';
  const patterns = Array.isArray(garment.patterns) && garment.patterns.length > 0
    ? garment.patterns
    : (garment.pattern ? [garment.pattern] : []);

  const items = [...patterns];
  if (garment.customPattern && String(garment.customPattern).trim()) {
    items.push(`Custom: ${garment.customPattern.trim()}`);
  }

  return items.length > 0 ? items.join(', ') : 'Standard / None';
};

/**
 * Resolve displayable measurement fields from snapshot or raw measurements
 */
const resolvePdfFields = (category, measurements = {}, snapshotList = []) => {
  if (Array.isArray(snapshotList) && snapshotList.length > 0) {
    return snapshotList.map((s) => {
      const liveVal = getFieldValue(measurements, s.fieldKey);
      return {
        key: s.fieldKey,
        label: s.displayName || s.fieldKey,
        val: liveVal !== '' ? String(liveVal) : (s.value !== undefined && s.value !== null ? String(s.value) : '-'),
      };
    });
  }

  const baseFields = category === 'shirt' ? SHIRT_FIELDS : PANT_FIELDS;
  const result = [];
  const knownKeys = new Set();

  baseFields.forEach((f) => {
    knownKeys.add(f.key);
    const v = getFieldValue(measurements, f.key);
    result.push({
      key: f.key,
      label: f.en || f.label,
      val: v !== undefined && v !== null && String(v).trim().length > 0 ? String(v) : '-',
    });
  });

  Object.keys(measurements).forEach((k) => {
    if (k !== 'notes' && !knownKeys.has(k)) {
      const v = measurements[k];
      if (v !== undefined && v !== null && String(v).trim().length > 0) {
        const cleanLabel = k.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
        result.push({
          key: k,
          label: cleanLabel,
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
export const generateOrderSlipPdf = (order, user = null) => {
  if (!order) {
    throw new Error('Order data is required to generate a print slip.');
  }

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
  const shopName = (user?.shopName || 'SILAI MASTER').toUpperCase();
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
  doc.setFontSize(10);
  const custName = order.customerSnapshot?.name || order.customer?.name || 'Walk-in Customer';
  doc.text(custName.length > 30 ? custName.substring(0, 30) + '...' : custName, margin + 5, y + 14);

  doc.setTextColor(...COLORS.mutedText);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  const mobile = order.customerSnapshot?.mobileNumber || order.customer?.mobileNumber || '-';
  doc.text(`Phone: ${mobile}`, margin + 5, y + 20);

  const address = order.customerSnapshot?.address || order.customer?.address || '';
  if (address) {
    const cleanAddr = address.length > 38 ? address.substring(0, 38) + '...' : address;
    doc.text(`Address: ${cleanAddr}`, margin + 5, y + 26);
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
    const sPatternsText = getPatternsDisplay(order.shirt);

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
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.darkText);
    const sPatTruncated = sPatternsText.length > 80 ? sPatternsText.substring(0, 80) + '...' : sPatternsText;
    doc.text(sPatTruncated, margin + 46, y + 4.5);

    y += 9;

    // Measurement Box Grid (6 columns across contentWidth)
    const displayShirtFields = resolvePdfFields('shirt', sMeasurements, order.measurementSnapshot?.shirt);

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

      // Label (English name)
      doc.setTextColor(...COLORS.mutedText);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.8);
      const labelText = field.label || field.key;
      doc.text(labelText, bx + boxW / 2, by + 4.5, { align: 'center' });

      // Measurement Value
      doc.setTextColor(...COLORS.primaryNavy);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      const val = field.val !== undefined && field.val !== null ? String(field.val) : (sMeasurements[field.key] ? String(sMeasurements[field.key]) : '-');
      doc.text(val, bx + boxW / 2, by + 10.5, { align: 'center' });
    });

    const shirtRows = Math.ceil(displayShirtFields.length / colsPerRow);
    y += shirtRows * (boxH + 2.5) + 3;

    if (sMeasurements.notes) {
      doc.setFillColor(254, 252, 232);
      doc.setDrawColor(254, 240, 138);
      doc.roundedRect(margin, y, contentWidth, 6, 1, 1, 'FD');
      doc.setTextColor(...COLORS.darkText);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.text(`Shirt Notes: ${sMeasurements.notes}`, margin + 4, y + 4.2);
      y += 8;
    }
  }

  // 4. PANT MEASUREMENTS SECTION (Render ONLY if pant quantity > 0)
  if (order.pant?.quantity > 0) {
    const pQty = order.pant.quantity;
    const pMeasurements = order.pant.measurements || {};
    const pPatternsText = getPatternsDisplay(order.pant);

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
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.darkText);
    const pPatTruncated = pPatternsText.length > 80 ? pPatternsText.substring(0, 80) + '...' : pPatternsText;
    doc.text(pPatTruncated, margin + 46, y + 4.5);

    y += 9;

    // Measurement Box Grid
    const displayPantFields = resolvePdfFields('pant', pMeasurements, order.measurementSnapshot?.pant);

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

      // Label
      doc.setTextColor(...COLORS.mutedText);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.8);
      const labelText = field.label || field.key;
      doc.text(labelText, bx + boxW / 2, by + 4.5, { align: 'center' });

      // Measurement Value
      doc.setTextColor(...COLORS.primaryNavy);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      const val = field.val !== undefined && field.val !== null ? String(field.val) : (pMeasurements[field.key] ? String(pMeasurements[field.key]) : '-');
      doc.text(val, bx + boxW / 2, by + 10.5, { align: 'center' });
    });

    const pantRows = Math.ceil(displayPantFields.length / colsPerRow);
    y += pantRows * (boxH + 2.5) + 3;

    if (pMeasurements.notes) {
      doc.setFillColor(254, 252, 232);
      doc.setDrawColor(254, 240, 138);
      doc.roundedRect(margin, y, contentWidth, 6, 1, 1, 'FD');
      doc.setTextColor(...COLORS.darkText);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.text(`Pant Notes: ${pMeasurements.notes}`, margin + 4, y + 4.2);
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

    doc.setTextColor(...COLORS.darkText);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const instText = String(order.specialInstructions).trim();
    doc.text(instText.length > 105 ? instText.substring(0, 105) + '...' : instText, margin + 4, y + 10);

    y += 18;
  } else {
    y += 4;
  }

  // 6. TAILOR WORKSHOP SIGN-OFF & VERIFICATION
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
  doc.text(
    `Generated on ${new Date().toLocaleString()}  •  Silai Master Tailor Management System  •  Professional Work Order`,
    pageWidth / 2,
    pageHeight - 2.5,
    { align: 'center' }
  );

  return doc;
};

/**
 * Trigger immediate client-side download of the Order Slip PDF
 */
export const downloadOrderSlipPdf = (order, user = null) => {
  const doc = generateOrderSlipPdf(order, user);
  const cleanOrderNum = String(order.orderNumber || 'Order').replace(/[^a-zA-Z0-9_-]/g, '_');
  doc.save(`Order_Slip_${cleanOrderNum}.pdf`);
};

/**
 * Get Blob URL for instant PDF preview inside an iframe
 */
export const getOrderSlipPdfBlobUrl = (order, user = null) => {
  const doc = generateOrderSlipPdf(order, user);
  const blob = doc.output('blob');
  return URL.createObjectURL(blob);
};
