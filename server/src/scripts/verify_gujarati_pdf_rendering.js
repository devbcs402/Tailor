import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../..');

console.log('=== Verifying Gujarati Unicode PDF Generation (No Mojibake) ===\n');

let allPassed = true;
function check(label, condition) {
  if (condition) {
    console.log(`[PASS] ${label}`);
  } else {
    console.error(`[FAIL] ${label}`);
    allPassed = false;
  }
}

async function run() {
  const serviceUrl = pathToFileURL(path.join(rootDir, 'client', 'src', 'services', 'orderSlipPdfService.js')).href;
  const { generateOrderSlipPdf, containsNonAscii } = await import(serviceUrl);

  // 1. Verify containsNonAscii helper
  check('containsNonAscii accurately detects Gujarati "છાતી"', containsNonAscii('છાતી') === true);
  check('containsNonAscii accurately detects Gujarati "ખભા"', containsNonAscii('ખભા') === true);
  check('containsNonAscii returns false for English "Chest"', containsNonAscii('Chest') === false);

  // 2. Mock order matching the exact user scenario:
  // Chest (છાતી) 120
  // Shoulder (ખભા) 785
  // Lambai (લંબાઈ) 100
  // Chhati (છાતી) 115
  // front (સામે) 698
  // Kollar (કોલર) 552
  const mockOrder = {
    orderNumber: 'ORD-GUJ-999',
    orderDate: new Date(),
    deadline: new Date(Date.now() + 86400000 * 3),
    status: 'in_progress',
    customerSnapshot: {
      name: 'Ramesh Patel (રમેશ પટેલ)',
      mobileNumber: '9876543210',
      address: 'Near Gandhi Ashram, Ahmedabad',
    },
    shirt: {
      quantity: 2,
      patterns: ['Classic Collar', 'Single Pocket'],
      measurements: {
        chest: 120,
        shoulder: 785,
        lambai: 100,
        chhati: 115,
        front: 698,
        kollar: 552,
        notes: 'Double stitch on shoulder',
      },
    },
    pant: {
      quantity: 1,
      measurements: {
        length: 40,
        waist: 34,
        hip: 38,
      },
    },
    measurementSnapshot: {
      shirt: [
        { fieldKey: 'chest', displayName: 'Chest', gujaratiName: 'છાતી', value: 120 },
        { fieldKey: 'shoulder', displayName: 'Shoulder', gujaratiName: 'ખભા', value: 785 },
        { fieldKey: 'lambai', displayName: 'Lambai', gujaratiName: 'લંબાઈ', value: 100 },
        { fieldKey: 'chhati', displayName: 'Chhati', gujaratiName: 'છાતી', value: 115 },
        { fieldKey: 'front', displayName: 'front', gujaratiName: 'સામે', value: 698 },
        { fieldKey: 'kollar', displayName: 'Kollar', gujaratiName: 'કોલર', value: 552 },
      ],
      pant: [
        { fieldKey: 'length', displayName: 'Length', gujaratiName: 'લંબાઈ', value: 40 },
        { fieldKey: 'waist', displayName: 'Waist', gujaratiName: 'કમર', value: 34 },
      ],
    },
    specialInstructions: 'Urgent delivery required before weekend',
  };

  const user = {
    shopName: 'Om Tailor Studio',
    tenant: { businessName: 'Om Tailor' },
  };

  const doc = generateOrderSlipPdf(mockOrder, user);
  check('generateOrderSlipPdf returned valid jsPDF document', Boolean(doc && typeof doc.output === 'function'));

  const pdfOutput = doc.output();
  check('PDF output length is valid', pdfOutput.length > 2000);

  // Check that the corrupted WinAnsi mojibake bytes (like ›, ¾, ¤, À, etc.) are NOT present in text operators
  // The user reported: › ¾ ¤ À for છાતી, – ‚ - Ë for ખભા, ² ‚ ¬ ¾ ˆ for લંબાઈ
  const hasMojibake = pdfOutput.includes('\x9b') || pdfOutput.includes('›') || pdfOutput.includes('¾') || pdfOutput.includes('À\\)');
  check('PDF output does NOT contain WinAnsi corrupted mojibake symbols', !hasMojibake);

  // Check that the measurement labels English names and numbers are intact
  check('PDF text contains Chest', pdfOutput.includes('Chest'));
  check('PDF text contains Shoulder', pdfOutput.includes('Shoulder'));
  check('PDF text contains Lambai', pdfOutput.includes('Lambai'));
  check('PDF text contains 120', pdfOutput.includes('120'));
  check('PDF text contains 785', pdfOutput.includes('785'));
  check('PDF text contains 100', pdfOutput.includes('100'));

  console.log('\n----------------------------------------');
  if (allPassed) {
    console.log('ALL GUJARATI PDF VERIFICATION CHECKS PASSED!');
    process.exit(0);
  } else {
    console.error('GUJARATI PDF VERIFICATION CHECKS FAILED!');
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Fatal error during verification:', err);
  process.exit(1);
});
