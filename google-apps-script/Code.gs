/**
 * SODFA / صدفة — Google Apps Script Web App API
 * Spreadsheet: "Products" (the ONLY database).
 *
 * SAFE MIGRATION: never deletes rows, never resets sheets, never changes existing IDs.
 * Missing sheets/columns are created; all reads/writes are done BY HEADER NAME,
 * so column order can never corrupt data again.
 *
 * Deploy: Extensions > Apps Script > paste this file > Deploy > New deployment >
 * Web app > Execute as: Me > Who has access: Anyone > Deploy > copy the /exec URL.
 */

var SHEETS = {
  inventory: 'Inventory',
  sales: 'Sales',
  returns: 'Returns',
  damaged: 'Damaged_Returns',
  warehouses: 'Warehouses',
  dashboard: 'Dashboard',
  notes: 'Setup_Notes'
};

var HEADERS = {
  Inventory: ['product_id','product_name','barcode','image_url','warehouse','price','stock_qty','sold_qty','remaining_qty','created_at','updated_at'],
  Sales: ['sale_id','product_id','product_name','barcode','warehouse','qty','unit_price','total_value','sale_date','sale_time'],
  Returns: ['return_id','product_id','product_name','barcode','warehouse','qty','unit_price','return_total','product_image','invoice_image','delivery_note_image','return_reason','notes','return_date','return_time'],
  Damaged_Returns: ['damaged_return_id','product_id','product_name','barcode','warehouse','quantity','shipment_code','police_image','product_image','combined_return_image','reason','details','status','date','time','created_at','updated_at'],
  Warehouses: ['warehouse_id','warehouse_name','active','created_at','updated_at'],
  Dashboard: ['metric_key','metric_name','metric_value','warehouse','date_from','date_to','updated_at'],
  Setup_Notes: ['section','key','value','description']
};

/** Legacy header aliases -> canonical header. */
var ALIASES = {
  Inventory: {
    'sale_price': 'price', 'purchase_price': 'price', 'unit_price': 'price',
    'total_stock': 'stock_qty', 'quantity': 'stock_qty',
    'sold': 'sold_qty', 'remaining_stock': 'remaining_qty', 'remaining': 'remaining_qty',
    'warehouse_id': 'warehouse', 'product_image': 'image_url', 'product_image_url': 'image_url'
  },
  Sales: { 'price': 'unit_price', 'quantity': 'qty', 'total': 'total_value', 'warehouse_id': 'warehouse', 'date': 'sale_date', 'time': 'sale_time' },
  Returns: { 'price': 'unit_price', 'quantity': 'qty', 'total': 'return_total', 'warehouse_id': 'warehouse', 'date': 'return_date', 'time': 'return_time', 'reason': 'return_reason', 'livery_note_image': 'delivery_note_image' },
  Damaged_Returns: {
    'Damaged_Return_ID': 'damaged_return_id', 'Product_ID': 'product_id', 'Product_Name': 'product_name',
    'Product_Barcode': 'barcode', 'barcode': 'barcode', 'Shipment_Code': 'shipment_code',
    'Warehouse_ID': 'warehouse', 'warehouse_id': 'warehouse', 'Quantity': 'quantity', 'qty': 'quantity',
    'Damage_Reason': 'reason', 'damage_reason': 'reason', 'Damage_Details': 'details', 'damage_details': 'details',
    'Policy_Image_URL': 'police_image', 'policy_image': 'police_image', 'policy_image_url': 'police_image',
    'Product_Image_URL': 'product_image', 'product_image_url': 'product_image',
    'Policy_Product_Image_URL': 'combined_return_image', 'policy_product_image': 'combined_return_image',
    'Return_Date': 'date', 'return_date': 'date', 'Return_Time': 'time', 'return_time': 'time',
    'Status': 'status', 'Notes': 'details', 'Created_At': 'created_at', 'Updated_At': 'updated_at'
  },
  Warehouses: { 'name': 'warehouse_name', 'is_active': 'active' }
};

var DRIVE_FOLDER_NAME = 'SODFA Images';

/* ============================ Entry points ============================ */

function doGet(e) { return handle(e); }
function doPost(e) { return handle(e); }

function handle(e) {
  try {
    var p = {};
    if (e && e.parameter) { for (var k in e.parameter) p[k] = e.parameter[k]; }
    if (e && e.postData && e.postData.type === 'application/json' && e.postData.contents) {
      try { var j = JSON.parse(e.postData.contents); for (var k2 in j) p[k2] = j[k2]; } catch (ignore) {}
    }
    var action = String(p.action || '').trim();
    if (!action) return ok(connectionStatus());
    return ok(route(action, p));
  } catch (err) {
    return fail(err && err.message ? err.message : String(err));
  }
}

function route(action, p) {
  switch (action) {
    case 'ping': case 'status': case 'test_connection': return connectionStatus();

    case 'get_inventory': return { count: readAll('Inventory').length, products: getInventory() };
    case 'save_product': return saveProduct(p);
    case 'add_product': return saveProduct(p);
    case 'update_product': return updateProduct(p);
    case 'delete_product': return deleteProduct(p);

    case 'get_warehouses': return { warehouses: getWarehouses() };
    case 'add_warehouse': case 'save_warehouse': return addWarehouse(p);
    case 'rename_warehouse': case 'update_warehouse': return renameWarehouse(p);
    case 'delete_warehouse': return deleteWarehouse(p);

    case 'get_sales': return { sales: readAll('Sales') };
    case 'record_sale': return recordSale(p);

    case 'get_returns': return { returns: readAll('Returns') };
    case 'record_return': return recordReturn(p);

    case 'get_damaged_returns': return { damaged_returns: readAll('Damaged_Returns') };
    case 'record_damaged_return': return recordDamaged(p);
    case 'update_damaged_return_status': case 'update_damaged_return': return updateDamagedStatus(p);

    case 'upload_image': return uploadImage(p);
    case 'get_dashboard': return dashboard(p);
    default: throw new Error('Unknown action: ' + action);
  }
}

function ok(data) { return json({ success: true, data: data }); }
function fail(msg) { return json({ success: false, error: msg }); }
function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/* ============================ Sheet helpers ============================ */

function ss() { return SpreadsheetApp.getActiveSpreadsheet(); }

/** Returns the sheet, creating it (with canonical headers) when missing. Adds missing columns safely. */
function sheet(name) {
  var s = ss().getSheetByName(name);
  if (!s) {
    s = ss().insertSheet(name);
    s.getRange(1, 1, 1, HEADERS[name].length).setValues([HEADERS[name]]);
    s.setFrozenRows(1);
    return s;
  }
  if (s.getLastColumn() === 0) {
    s.getRange(1, 1, 1, HEADERS[name].length).setValues([HEADERS[name]]);
    return s;
  }
  var raw = s.getRange(1, 1, 1, s.getLastColumn()).getValues()[0];
  var canon = raw.map(function (h) { return canonical(name, h); });
  var missing = HEADERS[name].filter(function (h) { return canon.indexOf(h) === -1; });
  if (missing.length) {
    s.getRange(1, s.getLastColumn() + 1, 1, missing.length).setValues([missing]);
  }
  return s;
}

function canonical(sheetName, header) {
  var h = String(header || '').trim();
  var map = ALIASES[sheetName] || {};
  if (map[h]) return map[h];
  var lower = h.toLowerCase();
  if (map[lower]) return map[lower];
  return lower.replace(/\s+/g, '_');
}

/** header(canonical) -> 1-based column index */
function headerMap(s, name) {
  var raw = s.getRange(1, 1, 1, s.getLastColumn()).getValues()[0];
  var map = {};
  for (var i = 0; i < raw.length; i++) {
    var c = canonical(name, raw[i]);
    if (c && map[c] === undefined) map[c] = i + 1;
  }
  return map;
}

function readAll(name) {
  var s = sheet(name);
  var last = s.getLastRow();
  if (last < 2) return [];
  var map = headerMap(s, name);
  var values = s.getRange(2, 1, last - 1, s.getLastColumn()).getValues();
  var out = [];
  for (var r = 0; r < values.length; r++) {
    var row = {}, any = false;
    for (var key in map) {
      var v = values[r][map[key] - 1];
      row[key] = v instanceof Date ? v.toISOString() : v;
      if (row[key] !== '' && row[key] !== null && row[key] !== undefined) any = true;
    }
    if (any) { row._row = r + 2; out.push(row); }
  }
  return out;
}

function appendRow(name, obj) {
  var s = sheet(name);
  var map = headerMap(s, name);
  var width = s.getLastColumn();
  var row = new Array(width).fill('');
  for (var key in obj) { if (map[key]) row[map[key] - 1] = obj[key]; }
  s.appendRow(row);
  return s.getLastRow();
}

function updateRow(name, rowIndex, obj) {
  var s = sheet(name);
  var map = headerMap(s, name);
  for (var key in obj) {
    if (map[key]) s.getRange(rowIndex, map[key]).setValue(obj[key]);
  }
}

function findRow(name, field, value) {
  var rows = readAll(name);
  var v = String(value);
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i][field]) === v) return rows[i];
  }
  return null;
}

function num(v) { var n = Number(String(v === undefined || v === null ? '' : v).replace(/[^0-9.\-]/g, '')); return isNaN(n) ? 0 : n; }
function str(v) { return v === undefined || v === null ? '' : String(v); }
function nowIso() { return new Date().toISOString(); }
function today() { return Utilities.formatDate(new Date(), tz(), 'yyyy-MM-dd'); }
function timeNow() { return Utilities.formatDate(new Date(), tz(), 'HH:mm:ss'); }
function tz() { return ss().getSpreadsheetTimeZone() || 'UTC'; }
function uid(prefix) { return prefix + '_' + Date.now() + '_' + Math.floor(Math.random() * 9000 + 1000); }
function need(p, field) { if (!p[field] && p[field] !== 0) throw new Error(field + ' is required'); return p[field]; }

/* ============================ Connection ============================ */

function connectionStatus() {
  var sheets = {};
  var names = [SHEETS.inventory, SHEETS.sales, SHEETS.returns, SHEETS.damaged, SHEETS.warehouses, SHEETS.dashboard, SHEETS.notes];
  for (var i = 0; i < names.length; i++) {
    var s = sheet(names[i]);
    sheets[names[i]] = { connected: true, rows: Math.max(0, s.getLastRow() - 1) };
  }
  return { connected: true, spreadsheet_name: ss().getName(), sheets: sheets, timestamp: nowIso() };
}

/* ============================ Inventory ============================ */

function getInventory() {
  return readAll('Inventory').filter(function (r) { return str(r.product_id) !== ''; }).map(function (r) {
    var stock = num(r.stock_qty), sold = num(r.sold_qty);
    return {
      product_id: str(r.product_id),
      product_name: str(r.product_name),
      barcode: str(r.barcode) || str(r.product_id),
      image_url: str(r.image_url),
      warehouse: str(r.warehouse),
      price: num(r.price),
      stock_qty: stock,
      sold_qty: sold,
      remaining_qty: r.remaining_qty === '' || r.remaining_qty === undefined ? stock - sold : num(r.remaining_qty),
      created_at: str(r.created_at),
      updated_at: str(r.updated_at)
    };
  });
}

function saveProduct(p) {
  need(p, 'product_name');
  var warehouse = str(p.warehouse);
  if (warehouse) assertWarehouse(warehouse);
  var id = uid('PRD');
  var stock = num(p.stock_qty), sold = num(p.sold_qty);
  if (stock < 0 || sold < 0) throw new Error('Quantity cannot be negative');
  if (sold > stock) throw new Error('Sold quantity cannot exceed stock quantity');
  appendRow('Inventory', {
    product_id: id,
    product_name: str(p.product_name),
    barcode: str(p.barcode) || id,
    image_url: str(p.image_url),
    warehouse: warehouse,
    price: num(p.price),
    stock_qty: stock,
    sold_qty: sold,
    remaining_qty: stock - sold,
    created_at: nowIso(),
    updated_at: nowIso()
  });
  return { product_id: id, barcode: id, message: 'Product created successfully' };
}

function updateProduct(p) {
  var id = need(p, 'product_id');
  var row = findRow('Inventory', 'product_id', id);
  if (!row) throw new Error('Product not found: ' + id);
  var patch = { updated_at: nowIso() };
  if (p.product_name !== undefined) patch.product_name = str(p.product_name);
  if (p.image_url !== undefined) patch.image_url = str(p.image_url);
  if (p.price !== undefined) patch.price = num(p.price);
  if (p.warehouse !== undefined && str(p.warehouse) !== '') { assertWarehouse(str(p.warehouse)); patch.warehouse = str(p.warehouse); }
  var stock = p.stock_qty !== undefined ? num(p.stock_qty) : num(row.stock_qty);
  var sold = p.sold_qty !== undefined ? num(p.sold_qty) : num(row.sold_qty);
  if (stock < 0 || sold < 0) throw new Error('Quantity cannot be negative');
  if (sold > stock) throw new Error('Sold quantity cannot exceed stock quantity');
  patch.stock_qty = stock; patch.sold_qty = sold; patch.remaining_qty = stock - sold;
  if (!str(row.barcode)) patch.barcode = id;
  updateRow('Inventory', row._row, patch);
  return { product_id: id, message: 'Product updated successfully' };
}

function deleteProduct(p) {
  var id = need(p, 'product_id');
  var row = findRow('Inventory', 'product_id', id);
  if (!row) throw new Error('Product not found: ' + id);
  sheet('Inventory').deleteRow(row._row);
  return { product_id: id, message: 'Product deleted successfully' };
}

/* ============================ Warehouses ============================ */

function getWarehouses() {
  var rows = readAll('Warehouses').filter(function (r) { return str(r.warehouse_id) !== ''; });
  return rows.map(function (r) {
    var a = r.active;
    var active = a === '' || a === undefined || a === null ? true : (a === true || String(a).toLowerCase() === 'true');
    return {
      warehouse_id: str(r.warehouse_id),
      warehouse_name: str(r.warehouse_name) || str(r.warehouse_id),
      active: active,
      created_at: str(r.created_at),
      updated_at: str(r.updated_at)
    };
  });
}

function assertWarehouse(id) {
  var found = findRow('Warehouses', 'warehouse_id', id);
  if (!found) throw new Error('Warehouse not found: ' + id);
}

function addWarehouse(p) {
  var name = str(need(p, 'warehouse_name')).trim();
  if (!name) throw new Error('warehouse_name is required');
  var id = uid('WH');
  appendRow('Warehouses', { warehouse_id: id, warehouse_name: name, active: true, created_at: nowIso(), updated_at: nowIso() });
  return { warehouse_id: id, warehouse_name: name, message: 'Warehouse created successfully' };
}

function renameWarehouse(p) {
  var id = need(p, 'warehouse_id');
  var row = findRow('Warehouses', 'warehouse_id', id);
  if (!row) throw new Error('Warehouse not found: ' + id);
  var patch = { updated_at: nowIso() };
  if (p.warehouse_name !== undefined) {
    var name = str(p.warehouse_name).trim();
    if (!name) throw new Error('warehouse_name is required');
    patch.warehouse_name = name;
  }
  if (p.active !== undefined) patch.active = String(p.active).toLowerCase() === 'true';
  updateRow('Warehouses', row._row, patch);
  return { warehouse_id: id, message: 'Warehouse updated successfully' };
}

function deleteWarehouse(p) {
  var id = need(p, 'warehouse_id');
  var row = findRow('Warehouses', 'warehouse_id', id);
  if (!row) throw new Error('Warehouse not found: ' + id);
  var used = getInventory().filter(function (x) { return x.warehouse === id; });
  if (used.length && String(p.force).toLowerCase() !== 'true') {
    throw new Error('Warehouse contains ' + used.length + ' product(s). Move them before deleting.');
  }
  sheet('Warehouses').deleteRow(row._row);
  return { warehouse_id: id, message: 'Warehouse deleted successfully' };
}

/* ============================ Sales ============================ */

function recordSale(p) {
  var pid = need(p, 'product_id');
  var qty = num(need(p, 'qty'));
  if (qty <= 0) throw new Error('Quantity must be greater than zero');
  var row = findRow('Inventory', 'product_id', pid);
  if (!row) throw new Error('Product not found: ' + pid);
  var stock = num(row.stock_qty), sold = num(row.sold_qty);
  var remaining = row.remaining_qty === '' ? stock - sold : num(row.remaining_qty);
  if (qty > remaining) throw new Error('Not enough remaining stock (' + remaining + ')');
  var price = num(row.price);
  var warehouse = str(p.warehouse) || str(row.warehouse);
  var id = uid('SALE');
  appendRow('Sales', {
    sale_id: id, product_id: pid, product_name: str(row.product_name), barcode: str(row.barcode) || pid,
    warehouse: warehouse, qty: qty, unit_price: price, total_value: qty * price,
    sale_date: today(), sale_time: timeNow()
  });
  updateRow('Inventory', row._row, { sold_qty: sold + qty, remaining_qty: remaining - qty, updated_at: nowIso() });
  return { sale_id: id, product_id: pid, qty: qty, total_value: qty * price, message: 'Sale recorded successfully' };
}

/* ============================ Returns ============================ */

function recordReturn(p) {
  var pid = need(p, 'product_id');
  var qty = num(need(p, 'qty'));
  if (qty <= 0) throw new Error('Quantity must be greater than zero');
  var row = findRow('Inventory', 'product_id', pid);
  if (!row) throw new Error('Product not found: ' + pid);
  var warehouse = str(p.warehouse) || str(row.warehouse);
  if (warehouse) assertWarehouse(warehouse);
  var price = num(row.price);
  var id = uid('RET');
  appendRow('Returns', {
    return_id: id, product_id: pid, product_name: str(row.product_name), barcode: str(row.barcode) || pid,
    warehouse: warehouse, qty: qty, unit_price: price, return_total: qty * price,
    product_image: str(p.product_image), invoice_image: str(p.invoice_image),
    delivery_note_image: str(p.delivery_note_image),
    return_reason: str(p.return_reason), notes: str(p.notes),
    return_date: today(), return_time: timeNow()
  });
  // Returned goods go back into the selected warehouse as sellable stock.
  var stock = num(row.stock_qty), sold = num(row.sold_qty);
  var remaining = row.remaining_qty === '' ? stock - sold : num(row.remaining_qty);
  var patch = { sold_qty: Math.max(0, sold - qty), remaining_qty: remaining + qty, updated_at: nowIso() };
  if (warehouse && warehouse !== str(row.warehouse)) patch.warehouse = warehouse;
  updateRow('Inventory', row._row, patch);
  return { return_id: id, product_id: pid, qty: qty, warehouse: warehouse, message: 'Return recorded successfully' };
}

/* ============================ Damaged returns ============================ */

var STATUSES = ['pending', 'accepted', 'rejected'];

function normStatus(v) {
  var s = str(v).trim().toLowerCase();
  if (!s) return 'pending';
  if (STATUSES.indexOf(s) === -1) throw new Error('Invalid status: ' + v);
  return s;
}

function recordDamaged(p) {
  var pid = need(p, 'product_id');
  var qty = num(need(p, 'quantity') !== undefined ? p.quantity : p.qty);
  if (!qty) qty = num(p.qty);
  if (qty <= 0) throw new Error('Quantity must be greater than zero');
  var row = findRow('Inventory', 'product_id', pid);
  if (!row) throw new Error('Product not found: ' + pid);
  var warehouse = str(p.warehouse) || str(row.warehouse);
  var id = uid('DR');
  appendRow('Damaged_Returns', {
    damaged_return_id: id,
    product_id: pid,
    product_name: str(row.product_name),
    barcode: str(row.barcode) || pid,
    warehouse: warehouse,
    quantity: qty,
    shipment_code: str(p.shipment_code),
    police_image: str(p.police_image),
    product_image: str(p.product_image),
    combined_return_image: str(p.combined_return_image),
    reason: str(p.reason),
    details: str(p.details),
    status: normStatus(p.status),
    date: today(),
    time: timeNow(),
    created_at: nowIso(),
    updated_at: nowIso()
  });
  // Damaged returns never re-enter sellable stock.
  return { damaged_return_id: id, product_id: pid, status: normStatus(p.status), message: 'Damaged return recorded successfully' };
}

function updateDamagedStatus(p) {
  var id = need(p, 'damaged_return_id');
  var status = normStatus(need(p, 'status'));
  var row = findRow('Damaged_Returns', 'damaged_return_id', id);
  if (!row) throw new Error('Damaged return not found: ' + id);
  updateRow('Damaged_Returns', row._row, { status: status, updated_at: nowIso() });
  return { damaged_return_id: id, status: status, message: 'Status updated successfully' };
}

/* ============================ Images ============================ */

function driveFolder() {
  var it = DriveApp.getFoldersByName(DRIVE_FOLDER_NAME);
  if (it.hasNext()) return it.next();
  return DriveApp.createFolder(DRIVE_FOLDER_NAME);
}

function uploadImage(p) {
  var b64 = need(p, 'file_base64');
  var name = str(p.file_name) || ('sodfa_' + Date.now());
  var mime = str(p.mime_type) || 'image/jpeg';
  if (['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].indexOf(mime.toLowerCase()) === -1) {
    throw new Error('Unsupported image type: ' + mime);
  }
  var clean = String(b64).indexOf(',') > -1 ? String(b64).split(',')[1] : String(b64);
  var blob = Utilities.newBlob(Utilities.base64Decode(clean), mime, name);
  var file = driveFolder().createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  var fileId = file.getId();
  return {
    file_id: fileId,
    image_url: 'https://lh3.googleusercontent.com/d/' + fileId,
    message: 'Image uploaded successfully'
  };
}

/* ============================ Dashboard ============================ */

function dashboard(p) {
  var products = getInventory();
  var wh = str(p.warehouse);
  if (wh) products = products.filter(function (x) { return x.warehouse === wh; });
  var totals = { total_products: products.length, total_stock: 0, total_sold: 0, total_remaining: 0, inventory_value: 0 };
  products.forEach(function (x) {
    totals.total_stock += x.stock_qty;
    totals.total_sold += x.sold_qty;
    totals.total_remaining += x.remaining_qty;
    totals.inventory_value += x.price * x.remaining_qty;
  });
  return totals;
}