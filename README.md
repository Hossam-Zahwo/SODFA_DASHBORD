# SODFA Inventory Master

BUILD A COMPLETE INVENTORY, SALES AND RETURNS MANAGEMENT SYSTEM

FOR MY BRAND:

Arabic Brand Name:

صدفة

English Brand Name:

SODFA

============================================================

IMPORTANT: BUILD THE ENTIRE PROJECT FROM ZERO

============================================================

Create the complete SODFA Store management system from scratch.

The system must be simple, stable, responsive, professional, and fully connected.

The application must use Google Sheets as the main database through Google Apps Script Web App API.

DO NOT create a second database.

DO NOT use Supabase.

DO NOT use Firebase.

DO NOT use localStorage as the main database.

Google Sheets + Google Apps Script must be the source of truth.

Everything in the website must be connected to the Google Sheets data.

============================================================

GOOGLE APPS SCRIPT API

============================================================

Use this existing Google Apps Script Web App URL:

https://script.google.com/macros/s/AKfycbwhzVo3w5ud1VMbqZMc04KhNyFdek94186v7fNy6WjImU6VxUkkeHyWNemFyEr4ctggQQ/exec

Create ONE centralized API service in the frontend.

Do not duplicate API logic throughout the application.

All pages must communicate through the same API service.

The system must support:

GET

POST

UPDATE

DELETE

through the existing Apps Script API.

============================================================

DATABASE STRUCTURE

============================================================

The Google Spreadsheet is:

Products

The spreadsheet contains these sheets:

1. Inventory

2. Sales

3. Returns

4. Damaged_Returns

5. Dashboard

6. Setup_Notes

Do not create unnecessary additional databases.

============================================================

1. INVENTORY SHEET

============================================================

The Inventory sheet is the main product/inventory database.

Each inventory record should contain:

product_id

product_name

barcode

image_url

warehouse

price

stock_qty

sold_qty

remaining_qty

created_at

updated_at

IMPORTANT:

There is ONLY ONE PRICE.

Do NOT use:

purchase_price

sale_price

Use only:

price

The user enters ONE price only.

Display it everywhere as:

السعر

or:

Price

depending on the selected language.

============================================================

PRODUCT ID

============================================================

Every new product must automatically receive a unique Product ID.

Example:

PRD_001

PRD_002

PRD_003

The user must NOT manually enter Product ID.

The system generates it automatically.

Product ID must never change when editing a product.

============================================================

BARCODE

============================================================

Barcode must be generated automatically.

The user must NOT manually enter a barcode.

Use the generated Product ID as the default barcode.

Example:

Product ID:

PRD_001

Barcode:

PRD_001

The barcode must be machine-readable.

Generate a REAL barcode using a reliable barcode library such as JsBarcode.

Do not simply display the text.

The barcode must be printable.

============================================================

PRODUCT IMAGE

============================================================

Adding a product must include a professional Drag & Drop image uploader.

The user must NOT type or paste an image URL.

Support:

JPG

JPEG

PNG

WEBP

The user can:

Drag image

OR

Click Choose Image

After uploading:

Show a large preview.

Allow:

Replace Image

Remove Image

The image must automatically be uploaded to the configured Google Drive image folder through Apps Script.

The resulting image URL must automatically be saved into:

image_url

The user must never manually handle the image URL.

============================================================

IMAGE DISPLAY

============================================================

This is extremely important.

Product images must actually appear on the website.

Do not only save the image URL into Google Sheets.

When loading products:

Read image_url.

Convert/normalize the Google Drive image URL if necessary.

Display the actual image.

If an image cannot load:

Show a clean fallback image.

Do not show broken image icons.

============================================================

PRODUCT CARDS

============================================================

Product cards must be LARGE.

I want the product image to be clearly visible BEFORE opening the product.

The image should be large enough to show the complete product image.

Do not make tiny product cards.

Each product card should display:

Large product image

Product name

Product ID

Barcode

Price

Total stock

Sold quantity

Remaining quantity

Warehouse

Actions:

Edit

Delete

Print Barcode

When opening the product details:

Show the image large again.

Show the complete image without cropping whenever possible.

Use:

object-fit: contain

instead of aggressively cropping the image.

============================================================

PRODUCT DETAILS

============================================================

Clicking a product opens a detailed product view.

Show:

Large image

Product name

Product ID

Barcode

Price

Warehouse

Total stock

Sold quantity

Remaining quantity

Created date

Updated date

Actions:

Edit

Delete

Print Barcode

============================================================

STOCK CALCULATION

============================================================

The system must clearly distinguish:

Total Stock

Sold / Withdrawn

Remaining Stock

Example:

Total Stock: 100

Sold: 35

Remaining: 65

Formula:

remaining_qty = stock_qty - sold_qty

The UI must show all three values.

============================================================

ADDING STOCK

============================================================

The user must be able to add stock.

Adding stock should update the correct warehouse.

Do not create only Warehouse 1 and Warehouse 2.

The number of warehouses must be unlimited.

The user can create:

Warehouse 1

Warehouse 2

Warehouse 3

Warehouse 4

Warehouse 5

Warehouse 10

etc.

The user decides how many warehouses exist.

============================================================

WAREHOUSE MANAGEMENT

============================================================

Create a Warehouse Management section.

The user can:

Add Warehouse

Rename Warehouse

Delete Warehouse

Select Warehouse

Warehouse names are customizable.

Examples:

المخزن الرئيسي

مخزن القاهرة

مخزن الإسكندرية

Warehouse A

Warehouse B

Do NOT hard-code warehouse_1 and warehouse_2.

Warehouses must be dynamic.

Warehouse selection must affect:

Inventory

Sales

Returns

Damaged Returns

Dashboard

When a warehouse is selected:

Only relevant data should be displayed.

============================================================

WAREHOUSE SAFETY

============================================================

Do not allow deleting a warehouse if it contains active inventory unless the system safely handles the records.

If deletion requires confirmation:

Show confirmation dialog.

Arabic:

هل أنت متأكد من حذف هذا المخزن؟

English:

Are you sure you want to delete this warehouse?

Do not silently delete important inventory data.

============================================================

SALES

============================================================

Create a Sales page.

The Sales page must allow:

Barcode scanning

Manual product search

Product selection

Quantity selection

Recording the sale

When a sale is recorded:

Decrease inventory.

Increase sold_qty.

Decrease remaining_qty.

Create a sale record in the Sales sheet.

Everything must remain synchronized.

============================================================

SCANNER

============================================================

The scanner must support a REAL USB barcode scanner.

The USB scanner behaves like a keyboard.

The scanner must NOT depend on a phone camera.

The scanner input should automatically receive focus.

After scanning:

Read barcode.

Find product.

Display product.

Allow quantity selection.

Record the sale.

Then return focus to the scanner.

The user should be able to scan products continuously.

============================================================

CAMERA SCANNER

============================================================

Also provide a camera barcode scanner button where supported.

When the user clicks:

Open Scanner

the camera scanner must actually open.

This must work correctly on supported mobile browsers.

If camera permission is denied:

Show a clear message.

Arabic:

يرجى السماح باستخدام الكاميرا

English:

Please allow camera access

IMPORTANT:

Do NOT force the page to scroll to the barcode input when the user is trying to use manual search.

============================================================

MANUAL PRODUCT SEARCH

============================================================

On the Sales page:

The user must be able to search manually.

Search by:

Product name

Product ID

Barcode

When clicking the search field:

Do NOT automatically focus the scanner.

Do NOT scroll the page back to the scanner.

The scanner and manual search must be independent.

============================================================

BATCH SCANNING

============================================================

The Sales scanner must support continuous scanning.

Example:

Scan Product A

Scan Product B

Scan Product C

Scan Product A again

The system builds a temporary sales cart.

Example:

Product A × 2

Product B × 1

Product C × 5

The user reviews the list.

Then clicks:

Complete Sale

Only then should the final sale records be submitted.

============================================================

SALES HISTORY

============================================================

Create Sales History.

Show:

Sale ID

Product

Product ID

Barcode

Warehouse

Quantity

Price

Total

Date

Time

Allow filtering by:

Today

This Week

This Month

This Year

Custom Date Range

============================================================

DASHBOARD

============================================================

Create a professional dashboard.

Dashboard must show:

Total Products

Total Stock

Sold Quantity

Remaining Stock

Total Inventory Value

Total Sales

Total Returns

Total Damaged Returns

Dashboard must support:

Warehouse filter

Date filter

Today

Week

Month

Year

Custom Date

============================================================

IMPORTANT PRICE RULE

============================================================

Inventory value is:

stock quantity × price

Sales value is:

sold quantity × price

There is NO purchase price.

There is NO sale price.

There is ONLY:

price

============================================================

RETURNS

============================================================

Create a Returns section.

The navigation must contain:

Returns

and separately:

Damaged Returns

============================================================

NORMAL RETURNS

============================================================

Normal Returns are products that can return to inventory.

When recording a normal return:

Generate a unique Return ID automatically.

Example:

RET_001

RET_002

RET_003

The Return ID is the primary key.

Each return record must contain:

return_id

product_id

product_name

barcode

warehouse

qty

price

return_total

product_image

invoice_image

livery_note_image

return_reason

notes

return_date

return_time

The normal return must update inventory.

Returned quantity is added back to remaining stock.

============================================================

RETURN HISTORY

============================================================

Create:

View Added Returns

The user can open a page showing all recorded returns.

Each return has its own:

Return ID

The user can open a return.

Show:

Return ID

Product

Product ID

Barcode

Image

Warehouse

Quantity

Price

Total

Reason

Notes

Date

Time

============================================================

RETURN IMAGES

============================================================

Normal returns must support images.

Each return can contain:

Product Image

Invoice Image

Livery Note Image

Images must be uploaded using Drag & Drop.

Do not ask users to paste URLs.

The images must be stored and displayed.

The return list should show the main product/return image.

Opening the return should show the full images.

============================================================

DAMAGED RETURNS

============================================================

Create a completely separate:

Damaged Returns

section.

Damaged returns are products that cannot be sold again.

These are separate from normal returns.

============================================================

DAMAGED RETURN IMAGES

============================================================

Each damaged return must contain THREE images:

1. Shipping / Courier Slip image

2. Returned Product image

3. Combined image showing the shipping slip + returned product

All three images must use Drag & Drop upload.

All three images must be stored automatically.

The main Damaged Returns list should show ONE primary image.

When opening a damaged return:

Show all THREE images clearly.

Use large image previews.

Allow viewing the full image.

============================================================

DAMAGED RETURN IDENTIFIERS

============================================================

Each damaged return must have:

damaged_return_id

This is the internal primary key.

It must be automatically generated.

Example:

DRT_001

DRT_002

DRT_003

Also store:

shipment_code

The shipment code belongs to the shipping company.

The shipment code is scanned or entered.

Do NOT confuse:

damaged_return_id

with:

shipment_code

They are two different identifiers.

============================================================

DAMAGED RETURN WORKFLOW

============================================================

Workflow:

Create Damaged Return

↓

Select Product

↓

Product ID automatically known

↓

Scan/enter shipment code

↓

Upload 3 images

↓

Enter reason

↓

Enter details/notes

↓

Select warehouse

↓

Save

The record is stored in:

Damaged_Returns

============================================================

SAFETY STATUS

============================================================

Every damaged return must have a status.

Allowed values:

Pending

Accepted

Rejected

Arabic:

قيد المراجعة

مقبول

مرفوض

The user can change the status.

This allows the company to know whether the safety/claim case was:

Accepted

or

Rejected

============================================================

DAMAGED RETURN INVENTORY EFFECT

============================================================

Damaged returns must NOT automatically increase sellable inventory.

Because these products cannot be sold again.

The system must keep damaged quantities separate.

============================================================

DAMAGED RETURN HISTORY

============================================================

Create a page where the user can see:

All damaged returns

Filter by:

Status

Warehouse

Date

Product

Shipment Code

Open any damaged return.

Show:

Primary image

Three full images

Damaged Return ID

Shipment Code

Product ID

Product Name

Barcode

Warehouse

Quantity

Reason

Details

Status

Date

============================================================

NAVIGATION

============================================================

Use a large LEFT SIDE navigation bar on desktop.

Do NOT use the main navigation as a top navbar.

Sidebar should be professional and spacious.

Brand at top:

صدفة

SODFA

Navigation:

Dashboard

Inventory

Sales

Returns

  - Normal Returns

  - Damaged Returns

Warehouses

Scanner

Settings

The sidebar must collapse on mobile.

On mobile:

Use a clean hamburger menu / drawer.

============================================================

UI COLORS

============================================================

Change the existing color scheme.

Use:

White + Navy Blue

NOT:

White + Green

The visual identity should be:

White

Navy

Light gray backgrounds

Professional dark text

Do not use excessive colors.

Keep the UI clean and professional.

============================================================

LANGUAGE

============================================================

Support:

Arabic

English

Arabic brand:

صدفة

English brand:

SODFA

The language switch must work globally.

Arabic:

RTL

English:

LTR

Every page and every component must support both.

============================================================

SETTINGS

============================================================

Settings must allow control over configurable system values.

Include:

Language

Warehouse management

API connection status

Google Apps Script connection test

Image connection test

System health check

============================================================

API CONNECTION TEST

============================================================

Settings must contain:

Test Connection

When clicked:

Check Google Apps Script.

Show:

Connected

or

Connection Failed

Also show which sheets are available.

============================================================

GOOGLE SHEETS CONNECTION

============================================================

Settings must verify:

Inventory

Sales

Returns

Damaged_Returns

Dashboard

Setup_Notes

The user must be able to see connection status.

Do not show fake success.

The status must come from a real API request.

============================================================

RESPONSIVE DESIGN

============================================================

The entire system must be responsive.

Support:

Desktop

Laptop

Tablet

Mobile

Product cards must remain large enough to show images.

Images must never become unusably small.

============================================================

PRODUCT CARD IMAGE SIZE

============================================================

This is mandatory.

Any UI that represents a product must use a sufficiently large image area.

Examples:

Inventory cards

Sales product cards

Return cards

Damaged return cards

Product details

Search results

Scanner results

Images must be visually clear.

Use:

object-fit: contain

where showing the complete product image is important.

Do not aggressively crop product images.

============================================================

DELETE CONFIRMATIONS

============================================================

For deleting:

Product

Warehouse

Return

Damaged Return

show confirmation.

Never silently delete.

============================================================

DATA SAFETY

============================================================

Never delete all data.

Never reset Google Sheets automatically.

Never overwrite existing records unnecessarily.

All IDs must remain stable.

============================================================

LOADING STATES

============================================================

Every API operation must show a proper loading state.

Do not leave the user staring at an empty page.

Examples:

Loading Inventory...

Loading Sales...

Loading Returns...

Saving...

Deleting...

Uploading...

============================================================

ERROR HANDLING

============================================================

Handle:

API failure

Network failure

Google Apps Script failure

Missing sheet

Missing product

Invalid barcode

Invalid quantity

Image upload failure

Camera permission failure

Printer failure

Show friendly Arabic/English messages.

Do not expose raw JavaScript errors.

============================================================

SEARCH

============================================================

Inventory search:

Product name

Product ID

Barcode

Sales search:

Product

Product ID

Barcode

Sale ID

Returns search:

Product

Product ID

Barcode

Return ID

Damaged Returns search:

Product

Product ID

Barcode

Damaged Return ID

Shipment Code

============================================================

PRINTING

============================================================

Every product must have:

Print Barcode

Generate a real barcode.

Print label must include:

SODFA

صدفة

Product name

Price

Barcode

Product ID

Allow quantity:

1

2

5

10

20

etc.

Use browser print preview.

Do not require a specific printer.

Support common label sizes.

============================================================

PRODUCT ADD FORM

============================================================

Add Product form must contain:

Product Name

Price

Warehouse

Stock Quantity

Product Image

No manual Product ID.

No manual Barcode.

After save:

Automatically generate:

Product ID

Barcode

Then display them.

Also show:

Total Stock

Sold

Remaining

============================================================

PRODUCT EDIT FORM

============================================================

Editing a product must NOT change:

Product ID

Barcode

unless explicitly supported by an administrative action.

Editing product image must allow:

Keep existing

Replace

Remove

If no new image is selected:

KEEP existing image.

============================================================

PRODUCT DELETE

============================================================

Deleting a product must require confirmation.

Do not accidentally delete the wrong product.

============================================================

INVENTORY PAGE

============================================================

Call this page:

Inventory

Arabic:

المخزون

Do NOT call it Products.

Products are records inside Inventory.

Inventory page must allow:

Search

Warehouse filter

Add Product

Edit

Delete

Print Barcode

Display:

Image

Name

ID

Barcode

Price

Stock

Sold

Remaining

Warehouse

============================================================

SALES PAGE

============================================================

Display:

Scanner

Manual Search

Sales Cart

Quantity

Remaining Stock

Complete Sale

The scanner must not interfere with manual search.

============================================================

RETURN PAGE

============================================================

Display:

Normal Returns

Add Return

Return History

Search

Filters

============================================================

DAMAGED RETURNS PAGE

============================================================

Display:

Damaged Returns

Add Damaged Return

History

Status filters:

Pending

Accepted

Rejected

============================================================

WAREHOUSE PAGE

============================================================

Display all warehouses dynamically.

Buttons:

Add Warehouse

Rename

Delete

Warehouse creation should work exactly like adding a product:

User enters:

Warehouse Name

Save

It appears immediately.

============================================================

IMPORTANT: ALL ACTIONS MUST BE CONNECTED

============================================================

This is one of the most important requirements.

When something changes:

Inventory must update.

Sales must update.

Returns must update.

Damaged Returns must update.

Dashboard must update.

Warehouse filters must update.

Product details must update.

All pages must reflect the latest Google Sheets data.

Do not create disconnected UI states.

Example:

If a product sells:

Sales increases.

Sold quantity increases.

Remaining stock decreases.

Dashboard updates.

Inventory updates.

Warehouse statistics update.

If a normal return occurs:

Returns increases.

Remaining stock increases.

Dashboard updates.

Inventory updates.

If a damaged return occurs:

Damaged Returns increases.

Damaged quantity is tracked separately.

Sellable inventory does NOT increase.

Dashboard updates.

============================================================

FINAL QUALITY REQUIREMENTS

============================================================

Before considering the project complete, test:

1. Add product

2. Automatic Product ID

3. Automatic barcode

4. Upload product image

5. Display image

6. Edit product

7. Delete product

8. Add warehouse

9. Rename warehouse

10. Delete warehouse

11. Add stock

12. Sell product

13. Continuous barcode scanning

14. Manual product search

15. Normal return

16. Return history

17. Damaged return

18. Upload three damaged-return images

19. View three images

20. Shipment code

21. Damaged Return ID

22. Pending status

23. Accepted status

24. Rejected status

25. Dashboard

26. Date filters

27. Warehouse filters

28. Barcode printing

29. Arabic

30. English

31. RTL

32. LTR

33. Mobile

34. Tablet

35. Desktop

36. API connection test

============================================================

CRITICAL FINAL INSTRUCTION

============================================================

Do not skip any feature listed in this specification.

Do not implement only the UI.

The functionality must actually work.

Do not create fake data.

Do not create fake API responses.

Do not create disconnected frontend-only features.

Every important action must communicate with the Google Apps Script API and Google Sheets.

Keep the architecture simple.

Avoid unnecessary complexity.

Use reusable components.

Use one API service.

Use one source of truth.

Use Google Sheets.

The final application must be:

Simple

Fast

Responsive

Professional

Stable

Arabic/English

RTL/LTR

White + Navy

Image-focused

Warehouse-aware

Sales-aware

Returns-aware

Damaged-return-aware

Barcode-aware

The complete system name is:

صدفة

SODFA

Build the complete system carefully and verify every feature before finishing.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://sodfa-shelf-savvy.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/6262474c-d451-4ff6-bf5b-8b4eb88a6d4d).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
