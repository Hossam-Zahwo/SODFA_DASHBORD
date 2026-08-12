# SODFA — One Complete Checklist (what I need from you)

Nothing here requires your Google password, login, or account access. Never send credentials in chat.
I already have: the Web App URL, and the frontend code. Items marked **HAVE** need nothing from you.

## 1. Google Spreadsheet ("Products")
| # | What | Why | Where | Format | Sensitive? |
|---|------|-----|-------|--------|-----------|
| 1.1 | Exact tab names, spelled exactly (bottom tabs) | The backend reads sheets by name; one wrong letter = "not connected" | Bottom of the spreadsheet | Plain text list | No |
| 1.2 | Header row (row 1) of **each** tab, in order | I map data by header name so your columns are never overwritten | Row 1 of each tab | Copy row 1, paste as text (one line per tab) | No |
| 1.3 | 2–3 sample rows per tab | Confirms data types (dates, numbers, ID formats) | Any rows | Text or screenshot | Yes — blank out customer names/phones/addresses if present |
| 1.4 | Any cell **formulas** you rely on (esp. Dashboard) | So the backend never writes over a formula cell | Click the cell, copy formula bar | Text: `Dashboard!B4 = =SUM(...)` | No |
| 1.5 | Whether any tab has frozen rows, filters, or protected ranges | Protected ranges make the script fail silently | Data / View menus | One line answer | No |

## 2. Google Apps Script
| # | What | Why | Where | Format |
|---|------|-----|-------|--------|
| 2.1 | Your current `Code.gs` (full contents) | So I merge instead of replacing, and keep any custom logic you have | Extensions → Apps Script → Code.gs → Ctrl+A, Ctrl+C | Paste as text (or attach `.gs` file) |
| 2.2 | The names of **all other files** in the script editor (left panel) | Any `.gs`/`.html` file may contain logic I must keep | Left file list in Apps Script | List of names; then paste any file that is not empty |
| 2.3 | `appsscript.json` if visible | Shows timezone + OAuth scopes (Drive access) | Project Settings → "Show appsscript.json" → click file | Paste as text |

Sensitive: if any file contains an API key or token, replace it with `XXXX` before sending and tell me the variable name.

## 3. Web App identifiers
| Needed | Item | Why |
|--------|------|-----|
| **HAVE** | Web App URL (`.../exec`) | Already in the app |
| Yes | Spreadsheet ID | Confirms the script is bound to *this* sheet. Found in the sheet URL between `/d/` and `/edit`. Not secret by itself, but don't post it publicly |
| Yes | Current deployment settings screenshot | Confirms "Execute as: Me" + "Who has access: Anyone" |
| No | Deployment ID | Not needed |
| No | Script ID | Not needed |

## 4. Google Drive (images)
| # | What | Why | Where | Format |
|---|------|-----|-------|--------|
| 4.1 | The **Folder ID** where uploads should go (or say "create one automatically") | Uploads must land in one known folder, not scattered | Open the folder, copy the part of the URL after `/folders/` | Text |
| 4.2 | Confirm the folder may be set to "Anyone with the link → Viewer" | Images can't display in the app otherwise | Right-click folder → Share | Yes/No |
| 4.3 | Do you want separate subfolders (Products / Returns / Damaged)? | Organization only | — | Yes/No |

## 5. Sheet data structure — exactly what to send per tab
Send for each: header row + 2 sample rows.
- **Inventory** — I need to know which columns hold: product id, name, barcode, image url, warehouse, price, stock qty, sold qty, remaining qty, created/updated. Tell me if you currently have **two price columns** (purchase/sale) — the new rule is a single `price`, and I need your decision on which existing column becomes it.
- **Sales** — sale id, product id, name, barcode, warehouse, qty, price, total, date, time.
- **Returns** — return id, product/qty/price, 3 image URL columns (product, invoice, delivery note), reason, notes, date, time.
- **Damaged_Returns** — damaged id, shipment code, product, qty, reason, details, status, 3 image URL columns (policy, product, policy+product), date, time.
- **Warehouses** — does this tab exist? If yes: header + all rows. If no, say so.
- **Dashboard** — is it formula-driven or written by the script? Send the formulas.
- **Setup_Notes** — just say whether the app may ignore it.
- Also: your **ID formats** (e.g. `PRD-0001`, `SL-0001`) so new records continue your numbering instead of starting over.

## 6. Backend actions to verify
I will test these against your deployment; you only need to confirm which already exist in your `Code.gs` (item 2.1 answers this automatically):
`get_inventory`, `save_product`, `update_product`, `delete_product`, `add_stock`,
`get_sales`, `record_sale`, `get_returns`, `record_return`,
`get_damaged_returns`, `record_damaged_return`, `update_damaged_return_status`,
`get_warehouses`, `add_warehouse`, `rename_warehouse`, `delete_warehouse`, `upload_image`,
plus the bare GET (no action) used as the connection/health check.
All calls are GET for reads and POST (form-encoded) for writes — no PUT/DELETE verbs, because Apps Script only supports GET/POST.

## 7. Frontend
Nothing needed — I have every file. Optional but useful:
- Screenshots of any page that looks wrong on your phone (with the browser console open if there's an error).
- Confirm the Web App URL in Settings is the one you want as default.
- No environment variables are required by the frontend.

## 8. SAFE-T (damaged-return statuses)
Statuses are fixed: `PENDING = قيد الانتظار`, `APPROVED = مقبول`, `REJECTED = مرفوض`.
I need from you:
- The **exact strings currently stored** in your `status` column (e.g. `pending`, `Pending`, `مقبول`) so existing rows keep working.
- Who may change a status (anyone using the app, or should it be locked?).
- Whether an APPROVED damaged return should ever affect stock (current rule: **no**, it never returns to sellable stock — confirm).
- Whether shipment code is required on every damaged return.

## 9. Scanner
- **3–5 real barcode values** copied as text from your Inventory `barcode` column (not photos).
- **1 clear photo** of a printed label as it appears on a product.
- The barcode **symbology** if you know it (CODE128 is the current default; EAN-13 needs exactly 13 digits).
- Your USB scanner model, and whether it sends Enter after each scan (scan into a text field to check).
- Confirm continuous camera scanning should keep the camera open between items (current behaviour).

## 10. Warehouses
- Full list: warehouse ID + display name (Arabic and English if both are used) + active/inactive.
- Which one is the default for new products/sales.
- Whether deleting a warehouse that still has stock must be blocked (current rule: blocked).

## 11. Images
Only if you want me to verify rendering:
- 2 sample product images + 1 of each return image type (policy, product, policy+product).
- JPG or PNG, ~1000–1600 px on the long side, under 5 MB.
- Upload them into the Drive folder from item 4.1 and send me the resulting links — do not paste image files that show customer documents; blank out names, phone numbers, and addresses first.

## 12. Environment variables / secrets
**None required.** The system uses only your public Web App URL, which the Apps Script itself authorizes. If we ever add a shared secret token to lock the endpoint, you will enter it in Lovable's secure secret form and in Apps Script Script Properties — never in chat.

## 13. Deployment steps (do these only after I hand you the final Code.gs)
1. Extensions → Apps Script.
2. Select all in `Code.gs`, paste the new version over it (your spreadsheet data is untouched — the script only reads/writes rows).
3. Save (Ctrl+S).
4. Run the `setup` function once and approve the permission prompt (Sheets + Drive).
5. Deploy → **Manage deployments** → pencil icon on the existing deployment → Version: **New version** → Deploy.
   Using Manage deployments (not "New deployment") keeps the **same URL**, so nothing in the app changes.
6. Settings must be: Execute as **Me**, Who has access **Anyone**.
7. If you accidentally create a *new* deployment, send me the new `/exec` URL and paste it into the app's Settings → API URL.
8. Open the app → Settings → Test Connection: all sheets should show green with row counts.

## 14. Final testing checklist (after connection)
**Connection & Settings** — Test Connection green for all sheets; row counts match the real sheets; switch Arabic/English and confirm RTL/LTR; change label size and confirm it persists after reload.
**Dashboard** — totals match the sheet; warehouse filter changes numbers; custom date range works; values update after a sale.
**Inventory** — product list loads with images; search by name and barcode; filter by warehouse; View Details shows correct stock/sold/remaining.
**Add Product** — new ID and barcode auto-generate; image uploads to Drive and displays; row appears in the Inventory sheet with the single price column filled.
**Sold-before-entry** — set "already sold" on creation; remaining = stock − sold in both app and sheet.
**Edit Product** — change name/price/warehouse/image; the same row updates (no duplicate row created).
**Delete Product** — confirmation appears; row is removed; the product disappears from search and scanner.
**Add Stock** — quantity increases in app and sheet; remaining recalculates.
**Manual Sales** — search a product, add to cart, change qty, checkout; Sales row created; inventory sold_qty +, remaining −; blocked when qty exceeds remaining.
**USB Scanner** — scan while the page is open (without clicking the field) and the item is added; typing in manual search is *not* interrupted.
**Camera Scanner** — opens on mobile; scans; camera stays open for the next product; the same code is not counted twice instantly.
**Returns** — record a return with destination warehouse and all three images; stock **increases** in the chosen warehouse; Returns sheet row correct; history search works; details dialog shows all three images.
**Damaged Returns** — record with shipment code + three images; stock does **not** change; row lands in Damaged_Returns with correct columns.
**SAFE-T** — change Pending → Approved → Rejected; the sheet's status cell updates; the badge and Arabic label are correct after refresh; stock still unaffected.
**Warehouses** — add, rename (existing products follow the new name), delete an empty one, and confirm deleting a warehouse holding stock is blocked.
**Images** — every uploaded image displays on card, details dialog, and after a full page reload (not just right after upload).
**Barcode printing** — print preview shows only the barcode at the chosen mm size; quantity stepper repeats labels; a printed label scans successfully with both scanners.
**Sheet sync** — edit a value directly in Google Sheets, refresh the app, and confirm the app shows it (the sheet is the only database).

## How to send everything
One message, numbered 1–11 in this order, with each sheet's header row and sample rows in a code block. Files (`Code.gs`, `appsscript.json`) as plain text or attachments. Blank out any customer personal data first.