import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../..');

console.log('=== Verifying Website Title & Business Name Implementation ===\n');

let allPassed = true;

function check(label, condition) {
  if (condition) {
    console.log(`[PASS] ${label}`);
  } else {
    console.error(`[FAIL] ${label}`);
    allPassed = false;
  }
}

// 1. Check client/index.html
const indexHtmlPath = path.join(rootDir, 'client', 'index.html');
const indexHtmlContent = fs.readFileSync(indexHtmlPath, 'utf8');

check('index.html does not hardcode "Silai Master - Tailor Management System"',
  !indexHtmlContent.includes('<title>Silai Master - Tailor Management System</title>'));

check('index.html contains dynamic businessName script from localStorage',
  indexHtmlContent.includes('localStorage.getItem(\'tailor_user\')') &&
  indexHtmlContent.includes('document.title = name + \' - Tailor Management System\''));

// 2. Check client/src/components/layout/AppLayout.jsx
const appLayoutPath = path.join(rootDir, 'client', 'src', 'components', 'layout', 'AppLayout.jsx');
const appLayoutContent = fs.readFileSync(appLayoutPath, 'utf8');

check('AppLayout imports useAuth',
  appLayoutContent.includes('useAuth'));

check('AppLayout extracts businessName from user',
  appLayoutContent.includes('user?.tenant?.businessName || user?.shopName'));

check('AppLayout dynamically sets document.title with businessName',
  appLayoutContent.includes('document.title = `${title} | ${businessName}`') ||
  appLayoutContent.includes('document.title = `${businessName} - Tailor Management System`'));

// 3. Check client/src/components/layout/Sidebar.jsx
const sidebarPath = path.join(rootDir, 'client', 'src', 'components', 'layout', 'Sidebar.jsx');
const sidebarContent = fs.readFileSync(sidebarPath, 'utf8');

check('Sidebar dynamically renders businessName in brand header',
  sidebarContent.includes('{businessName}') &&
  sidebarContent.includes('user?.tenant?.businessName || user?.shopName'));

// 4. Check client/src/components/layout/Header.jsx
const headerPath = path.join(rootDir, 'client', 'src', 'components', 'layout', 'Header.jsx');
const headerContent = fs.readFileSync(headerPath, 'utf8');

check('Header renders businessName in shop badge',
  headerContent.includes('{businessName}') &&
  headerContent.includes('user?.tenant?.businessName || user?.shopName'));

// 5. Check client/src/components/owner/OwnerLayout.jsx
const ownerLayoutPath = path.join(rootDir, 'client', 'src', 'components', 'owner', 'OwnerLayout.jsx');
const ownerLayoutContent = fs.readFileSync(ownerLayoutPath, 'utf8');

check('OwnerLayout updates document.title for owner console',
  ownerLayoutContent.includes('document.title = title ? `${title} | Platform Owner Console` : \'Platform Owner Console\''));

// 6. Check client/src/pages/OrderDetailsPage.jsx
const orderDetailsPath = path.join(rootDir, 'client', 'src', 'pages', 'OrderDetailsPage.jsx');
const orderDetailsContent = fs.readFileSync(orderDetailsPath, 'utf8');

check('OrderDetailsPage updates document.title with Order # and businessName',
  orderDetailsContent.includes('document.title = `Order #${order.orderNumber} | ${businessName}`'));

// 7. Check client/src/pages/CustomerDetailsPage.jsx
const custDetailsPath = path.join(rootDir, 'client', 'src', 'pages', 'CustomerDetailsPage.jsx');
const custDetailsContent = fs.readFileSync(custDetailsPath, 'utf8');

check('CustomerDetailsPage updates document.title with Customer name and businessName',
  custDetailsContent.includes('document.title = `${customer.name} | ${businessName}`'));

// 8. Check client/src/pages/SettingsPage.jsx
const settingsPagePath = path.join(rootDir, 'client', 'src', 'pages', 'SettingsPage.jsx');
const settingsPageContent = fs.readFileSync(settingsPagePath, 'utf8');

check('SettingsPage displays tenant businessName in Studio Info',
  settingsPageContent.includes('user?.tenant?.businessName || user?.shopName'));

console.log('\n----------------------------------------');
if (allPassed) {
  console.log('ALL VERIFICATION CHECKS PASSED (8/8)!');
  process.exit(0);
} else {
  console.error('SOME VERIFICATION CHECKS FAILED!');
  process.exit(1);
}
