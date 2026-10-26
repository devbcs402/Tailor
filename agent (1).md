# Agent Instructions --- Tailor Management System (MERN Stack)

## 1. Project Goal

Build a complete, responsive **Tailor Management System** for a
tailoring shop using the MERN stack:

-   **Frontend:** React
-   **Backend:** Node.js + Express
-   **Database:** MongoDB + Mongoose
-   **Authentication:** JWT-based login
-   **UI:** Clean, modern admin dashboard with a sidebar, cards, forms,
    tables, status badges, and responsive layouts.

The application helps a tailor manage customers, Gujarati clothing
measurements, shirt/pant patterns, orders, deadlines, and order history.

## 2. Important Development Rules

1.  First inspect the existing project and its structure before changing
    files.
2.  If a project already exists, preserve working code and dependencies
    where possible.
3.  Do not delete unrelated files, collections, routes, models, or
    existing user data.
4.  Do not replace the whole project just to implement one feature.
5.  Build working end-to-end functionality, not just static UI screens.
6.  Connect every form and action to the Express API and MongoDB.
7.  Use environment variables for secrets and configuration. Never
    hardcode JWT secrets or database credentials.
8.  Validate data on both frontend and backend.
9.  Show loading, success, empty, and error states.
10. Keep code modular, readable, and maintainable. Reuse components and
    avoid unnecessary duplication.
11. Do not claim a feature is complete unless it works.
12. After implementation, report setup commands, environment variables,
    routes, completed features, and any remaining issues.

## 3. Application Layout and Navigation

Create a login page followed by the main application dashboard.

### Login

-   Email/username and password fields.
-   Show/hide password control.
-   Frontend validation and readable error messages.
-   Authenticate through the backend.
-   Store authentication safely according to the chosen implementation;
    protect private routes.
-   Logout must invalidate the client session and return to login.
-   Do not allow users to access dashboard pages without authentication.

### Main application shell

-   Left sidebar navigation.
-   Header/top bar with page title and logged-in user menu.
-   Main content area.
-   Responsive sidebar for mobile and desktop.

Sidebar items: 1. Dashboard 2. Create Order 3. All Orders 4. Customers
5. Logout

Use a consistent design system, accessible labels, clear typography, and
Gujarati-friendly font support. Keep Gujarati labels readable and do not
transliterate Gujarati measurement names into English.

## 4. Dashboard

Show summary cards with live data from the backend:

-   **કુલ ઓર્ડર (Total Orders)**
-   **આજે આપવાની ડિલિવરી (Orders Due Today)**
-   **બાકી ઓર્ડર (Pending Orders)**
-   **પૂર્ણ થયેલા ઓર્ડર (Completed Orders)**

Also show: - Orders with today's deadline. - Upcoming deadlines. -
Recent orders. - Order number, customer name, phone number, deadline,
order status, and a button to view details. - Useful empty states when
no orders exist.

Calculate dashboard counts from database records, not hardcoded sample
numbers. Define "pending" consistently as orders that are not completed
or cancelled. Treat deadline comparisons using the shop's local
date/time and handle timezone boundaries correctly.

## 5. Create Order Workflow

When the user opens **Create Order**, display two clearly labelled radio
options or checkbox-style choices. They must behave as mutually
exclusive options:

-   **જૂનો ગ્રાહક (Existing Customer)**
-   **નવો ગ્રાહક (New Customer)**

### A. Existing customer flow

1.  Show a searchable customer selector.
2.  Search by customer name and/or mobile number.
3.  When a customer is selected, automatically fetch and display that
    customer's saved measurements and measurement history.
4.  Pre-fill the order form with the customer's latest saved shirt and
    pant measurements and patterns.
5.  Allow the tailor to:
    -   Use the existing measurements without changes.
    -   Edit measurements for this order.
    -   Choose whether the edited measurements should also become the
        customer's latest saved measurements.
6.  Creating an order must not accidentally overwrite customer
    measurements unless the user explicitly chooses to save the updates.
7.  Preserve historical measurements associated with older orders.
8.  If no saved measurements exist, allow the tailor to enter new
    measurements.

### B. New customer flow

1.  Show a customer details form.
2.  Save the new customer and create the order through a safe backend
    workflow.
3.  Avoid duplicate customers where possible by checking the mobile
    number and returning a clear validation message if it already
    exists.
4.  After a successful order, open the order details or show a clear
    success state.

### Order number

-   Display the order number prominently at the top of the Create Order
    form.
-   Generate order numbers on the backend, not only in the frontend.
-   Use a unique, collision-safe sequence or another robust unique
    identifier.
-   Example display format: `ORD-2026-00001`. This is only an example;
    implement a concurrency-safe generator so simultaneous requests
    cannot create duplicate order numbers.
-   For a new, unsaved order, show a clear placeholder such as "ઓર્ડર નંબર
    સેવ થયા પછી મળશે" or reserve a number through a safe backend
    mechanism. Do not show a fake confirmed number.
-   The order number must remain stable after the order is saved.

### Order form sections

**Section 1 --- Customer Details (ગ્રાહકની વિગતો)** - Customer name
(ગ્રાહકનું નામ) - Mobile number (મોબાઇલ નંબર) - Address (સરનામું), optional -
Notes, optional

For an existing customer, auto-fill these fields and link the order to
the selected customer.

**Section 2 --- Shirt Measurements (શર્ટનું માપ)**

Use Gujarati labels in the UI. Store consistent machine-friendly field
names in MongoDB and map them to Gujarati labels in the frontend.

Suggested fields: - લંબાઈ (Length) - છાતી (Chest) - કમર (Waist) - ખભો
(Shoulder) - બાંયની લંબાઈ (Sleeve Length) - બાંયનો ઘેરાવો (Sleeve
Opening/Cuff, as applicable) - ગળું (Neck) - છાતીનું માપ / આગળનું માપ (only if
the shop needs a separate field; clarify its meaning in the UI) - અન્ય
માપ / નોંધ (Other Measurement / Notes)

Do not assume every tailor uses the same measurement terminology. Keep
the measurement fields configurable or easy to extend. Use suitable
units (for example, inches) and clearly show the selected unit. Do not
silently mix inches and centimetres.

**Shirt Pattern (શર્ટની પેટર્ન)**

Keep shirt patterns in an array/configuration list, not scattered as
hardcoded conditionals. Provide selectable options such as: - સાદું
(Plain) - ચેક્સ (Checks) - લાઇનિંગ / પટ્ટાવાળું (Striped) - પ્રિન્ટેડ (Printed) -
અન્ય (Other)

Allow the list to be extended. If "Other" is selected, show an optional
text field.

**Section 3 --- Pant Measurements (પેન્ટનું માપ)**

Suggested fields: - લંબાઈ (Length) - કમર (Waist) - હિપ / સીટ (Hip/Seat) -
થાઈ (Thigh) - ઘૂંટણ (Knee) - બોટમ / મોરી (Bottom Opening) - ક્રોચ / ઊંચાઈ
(Crotch/Rise, if used by the shop) - અન્ય માપ / નોંધ (Other Measurement /
Notes)

Keep these fields easy to extend and label them in Gujarati. Clearly
show measurement units.

**Pant Pattern (પેન્ટની પેટર્ન)**

Keep pant patterns in an array/configuration list. Example options: -
સાદી પેન્ટ (Plain Pant) - ફોર્મલ પેન્ટ (Formal Pant) - જીન્સ સ્ટાઇલ (Jeans
Style) - પેન્સિલ ફિટ (Pencil Fit) - પ્લીટ્સવાળી (Pleated) - અન્ય (Other)

These are initial options only. Keep pattern lists configurable and easy
to edit.

**Section 4 --- Order Information (ઓર્ડરની વિગતો)** - Order date (ઓર્ડર
તારીખ), default to today. - Deadline/delivery date (આપવાની તારીખ),
required. - Optional delivery time. - Quantity for shirt and pant, if
applicable. - Price per item and total price, optional but
recommended. - Advance paid and balance due, optional but recommended. -
Order status. - Additional instructions (ખાસ સૂચના).

Validate that the deadline is not earlier than the order date unless the
business explicitly allows backdated orders. Calculate totals and
balance accurately if price/payment fields are included.

### Order submission

-   Show a review/summary before submission if practical.
-   Prevent duplicate submission while a request is in progress.
-   On success, display the saved order number and confirmation.
-   On failure, preserve entered values and show a useful error message.
-   Never lose the form data silently.

## 6. Customers Page

Show all customers in a searchable, paginated list or table.

Suggested columns: - Customer name - Mobile number - Number of orders -
Latest order date - Next deadline, if any - Actions: View, Edit

Features: - Search by name/mobile number. - Add customer. - Edit
customer details. - Open customer details. - Show a clear empty state
when no customers exist.

Mobile number should be normalized and validated consistently. Apply a
unique index if the business rules require one; handle MongoDB
duplicate-key errors gracefully.

### Customer details view/card

When the user clicks a customer, open a dedicated detail page, side
panel, or well-designed card containing:

-   Customer profile and contact details.
-   Latest saved shirt measurements.
-   Latest saved pant measurements.
-   Shirt pattern and pant pattern.
-   Measurement unit and last-updated date.
-   Complete order history.
-   For each order: order number, order date, deadline, status, garment
    measurements/pattern snapshot, quantity, price/payment summary if
    enabled.
-   A button to create a new order for this customer.
-   An edit button for customer details.

Order history must use saved order snapshots so that editing current
customer measurements does not change measurements on old orders.

## 7. All Orders Page

Create an orders list with: - Order number - Customer name - Mobile
number - Order date - Deadline - Shirt/pant summary - Order status -
Total/balance, if payment tracking is implemented - View/Edit actions

Add: - Search by order number, customer name, or mobile number. -
Filters for status and deadline/date range. - Sort by newest, oldest,
and nearest deadline. - Pagination. - Clear status badges.

Suggested order statuses: - બાકી (Pending) - કામ ચાલુ (In Progress) -
તૈયાર (Ready) - ડિલિવર થયેલ (Delivered) - રદ (Cancelled)

Use stable backend enum values such as `pending`, `in_progress`,
`ready`, `delivered`, and `cancelled`, with Gujarati labels in the UI.
Define dashboard counts and transitions consistently. A delivered order
is completed; cancelled orders should not be counted as pending.

## 8. Suggested MongoDB Models

Adapt to the existing project if models already exist. Do not delete
unrelated collections.

### User

-   name
-   email or username (unique)
-   passwordHash
-   role (default `admin` or `tailor`, depending on requirements)
-   timestamps

Hash passwords with a suitable password-hashing library. Never store
plain-text passwords.

### Customer

-   customerCode (optional)
-   name (required)
-   mobileNumber (required; normalized)
-   address (optional)
-   notes (optional)
-   latestMeasurements: shirt, pant, shirtPattern, pantPattern, unit,
    updatedAt
-   timestamps
-   optional `isActive`

### Order

-   orderNumber (unique, backend-generated)
-   customer (ObjectId reference)
-   customerSnapshot (name, mobile number, address at order time)
-   orderDate
-   deadline
-   status
-   shirt: measurements, pattern, quantity
-   pant: measurements, pattern, quantity
-   measurementUnit
-   specialInstructions
-   pricing: shirtPrice, pantPrice, total, advancePaid, balanceDue (if
    payment tracking is included)
-   timestamps

Store a snapshot of all measurements and patterns used for each order.
Do not rely only on the customer's current measurement fields for
historical order displays.

### Order Counter (if sequential order numbers are used)

-   counter name/key
-   sequence value
-   Use an atomic MongoDB update such as `$inc` to generate the next
    sequence safely.
-   Ensure uniqueness with a database unique index and handle
    duplicate-key/retry cases appropriately.

Choose a practical approach for creating a customer and the first order
atomically where supported. If transactions are used, explain that
MongoDB must run as a replica set; otherwise use a safe
compensating/error-handling strategy.

## 9. Backend API Expectations

Use RESTful Express routes, controllers, services where useful, Mongoose
models, validation middleware, centralized error handling, and
authentication middleware.

Example API structure (adjust to project conventions):

### Auth

-   `POST /api/auth/login`
-   `GET /api/auth/me`
-   `POST /api/auth/logout` if server-side/session-based logout is
    implemented

### Customers

-   `GET /api/customers?search=&page=&limit=`
-   `POST /api/customers`
-   `GET /api/customers/:id`
-   `PATCH /api/customers/:id`
-   `GET /api/customers/:id/orders`
-   `GET /api/customers/:id/measurements` if a separate endpoint is
    useful
-   `PATCH /api/customers/:id/measurements` only when explicitly saving
    updated latest measurements

### Orders

-   `GET /api/orders?search=&status=&from=&to=&page=&limit=`
-   `POST /api/orders`
-   `GET /api/orders/:id`
-   `PATCH /api/orders/:id`
-   `PATCH /api/orders/:id/status`
-   `GET /api/dashboard/summary`

All protected routes must require authentication. Validate MongoDB IDs,
input shapes, dates, quantities, prices, and allowed status transitions.
Do not trust totals or order numbers sent by the frontend;
compute/validate important values on the server.

Return consistent JSON responses and appropriate HTTP status codes.
Avoid exposing stack traces, password hashes, tokens, or database
details to users.

## 10. Frontend Structure

Use a clean, modular React structure. One possible layout:

``` text
client/
  src/
    api/
      apiClient.js
      authApi.js
      customersApi.js
      ordersApi.js
      dashboardApi.js
    components/
      layout/
        AppLayout.jsx
        Sidebar.jsx
        Header.jsx
      common/
        Loading.jsx
        ErrorMessage.jsx
        ConfirmDialog.jsx
        StatusBadge.jsx
        SearchInput.jsx
        Pagination.jsx
      customers/
        CustomerForm.jsx
        CustomerSelector.jsx
        CustomerDetails.jsx
        MeasurementDisplay.jsx
      orders/
        OrderForm.jsx
        ShirtMeasurements.jsx
        PantMeasurements.jsx
        PatternSelector.jsx
        OrderSummary.jsx
    pages/
      LoginPage.jsx
      DashboardPage.jsx
      CreateOrderPage.jsx
      OrdersPage.jsx
      OrderDetailsPage.jsx
      CustomersPage.jsx
      CustomerDetailsPage.jsx
    routes/
      ProtectedRoute.jsx
    context/
      AuthContext.jsx
    utils/
      dateUtils.js
      measurementLabels.js
      patternOptions.js
    App.jsx
    main.jsx
server/
  src/
    config/
      db.js
    models/
      User.js
      Customer.js
      Order.js
      OrderCounter.js
    routes/
      authRoutes.js
      customerRoutes.js
      orderRoutes.js
      dashboardRoutes.js
    controllers/
    services/
    middleware/
      authMiddleware.js
      errorMiddleware.js
      validateRequest.js
    utils/
      generateOrderNumber.js
    app.js
    server.js
```

This is a suggested structure, not a reason to restructure an already
working repository unnecessarily.

## 11. UI/UX Requirements

-   Modern, professional tailoring-shop admin dashboard.
-   Use a restrained palette, readable typography, consistent spacing,
    and clear visual hierarchy.
-   Gujarati language labels for measurements, patterns, customer
    fields, order statuses, and deadline information.
-   English may be used for technical labels where helpful, but the main
    tailoring workflow should be Gujarati-friendly.
-   Clearly separate shirt and pant measurements into cards or sections.
-   Make the order number prominent at the top.
-   Use searchable customer selection for existing customers.
-   Responsive tables should work on mobile (cards or horizontal
    scrolling where appropriate).
-   Use accessible form labels, keyboard navigation, visible focus
    states, and sufficient contrast.
-   Use date formatting appropriate for India (`DD/MM/YYYY`) while
    storing valid dates consistently in MongoDB.
-   Display deadline warnings for orders due today or overdue.
-   Do not use fake charts, fake counts, or static sample orders as
    production data.
-   If seed/demo data is created, make it explicit and never overwrite a
    real database.

## 12. Security, Data Integrity, and Reliability

-   Validate all inputs on the server.
-   Hash passwords.
-   Protect APIs with authentication.
-   Use environment variables and provide `.env.example`, not a real
    `.env` with secrets.
-   Configure CORS deliberately.
-   Add reasonable request/body limits and rate limiting to login if
    appropriate.
-   Prevent unauthorized access to customer and order records.
-   Use MongoDB indexes for unique order numbers and customer mobile
    numbers where appropriate.
-   Avoid race conditions in order-number generation.
-   Use safe updates and handle concurrent edits appropriately.
-   Preserve historical order snapshots.
-   Use server-side pagination for larger collections.
-   Do not log passwords, tokens, or sensitive customer data.
-   Do not delete customer/order history when editing a record.
-   Use confirmation for destructive actions and prefer archive/cancel
    behavior over irreversible deletion.

## 13. Environment and Setup

Provide a `.env.example` for the backend, for example:

``` env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/tailor_management
JWT_SECRET=replace_with_a_long_random_secret
CLIENT_URL=http://localhost:5173
```

Use the actual frontend port and configuration chosen by the project. Do
not commit secrets.

Provide clear setup instructions: 1. Install dependencies in client and
server. 2. Configure the environment variables. 3. Start MongoDB or
configure a MongoDB Atlas URI. 4. Run the backend. 5. Run the frontend.
6. Explain how to create the initial admin account securely (for
example, a one-time seed script or controlled setup process). Do not
leave a publicly accessible default-password admin account.

## 14. Testing and Acceptance Criteria

The project is considered complete only when these scenarios work:

1.  A user can log in and access protected pages.
2.  Dashboard cards show real counts from MongoDB.
3.  A new customer can be created while placing their first order.
4.  An existing customer can be selected and their latest saved
    measurements auto-fill.
5.  An existing customer's measurements can be used unchanged.
6.  Measurements can be changed for one order without silently changing
    the customer's saved measurements.
7.  The user can explicitly save updated measurements as the customer's
    latest measurements.
8.  Shirt and pant patterns are selected from configurable arrays.
9.  Every saved order has a unique backend-generated order number.
10. Two simultaneous order requests cannot generate the same order
    number.
11. Order deadlines appear correctly on the dashboard.
12. Pending, in-progress, ready, delivered, and cancelled filters work
    correctly.
13. Customer details show current saved measurements and all related
    orders.
14. Old orders retain their original measurement snapshots after
    customer measurements change.
15. Search, filters, sorting, and pagination work against backend data.
16. Invalid form data produces clear validation messages.
17. API errors do not erase the user's unsaved form inputs.
18. Logout and protected-route behavior work.
19. The layout works on desktop, tablet, and mobile.
20. No unrelated collections, files, or existing functionality have been
    deleted.

## 15. Implementation Plan

Work in this order:

1.  Inspect the repository and summarize its current state.
2.  Establish or confirm client/server structure and dependencies.
3.  Implement MongoDB connection, models, indexes, and authentication.
4.  Implement customer APIs and customer detail/history.
5.  Implement collision-safe order-number generation and order APIs.
6.  Implement dashboard summary API.
7.  Build the shared layout, sidebar, login, and protected routes.
8.  Build customers pages and customer details.
9.  Build the Create Order form with existing/new customer flows and
    Gujarati measurements.
10. Build All Orders, order details, filters, and status updates.
11. Connect dashboard cards and deadline lists to real APIs.
12. Add validation, loading/error/empty states, and responsive polish.
13. Run lint/build/tests where configured; fix errors.
14. Verify acceptance criteria and document anything that remains
    incomplete.

**Start by inspecting the existing repository. Then implement the system
incrementally without destroying working code.**
