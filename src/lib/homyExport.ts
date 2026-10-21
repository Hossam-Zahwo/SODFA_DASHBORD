import * as XLSX from 'xlsx';
import type { Product, ProductCatalog, ProductVariant } from './api';

// Keep the receiving HOMY workbook contract unchanged.
const dataHeaders = 'record_type,item_key,parent_key,title_ar,description,category_refs,status,display_mode,sku,slug,price_egp,compare_at_egp,stock_on_hand,is_listed,sort_order,title_override,description_override,option_1_name,option_1_value,option_2_name,option_2_value,option_3_name,option_3_value,extra_options_json,specifications_json'.split(',');
const imageHeaders = 'image_key,item_key,source_type,source,is_primary,sort_order'.split(',');
const s = (v: unknown) => String(v ?? '').trim();
const uniq = (arr: string[]) => [...new Set(arr.filter(Boolean))];
const safeKey = (v: string) => v.replace(/[^a-zA-Z0-9-]/g, '-').replace(/-+/g, '-').slice(0,90);
const safeSlug = (v: string) => safeKey(v.toLowerCase()).replace(/^-|-$/g,'') || 'item';
const safeNumber = (v: unknown, fallback = 0) => { const n = Number(v); return Number.isFinite(n) ? n : fallback; };
const reserved = new Set(['price','stock_qty','warehouse','stock','quantity','sku','barcode','image','image_url','product_id','variant_id','purchase_price','selling_price']);
const normalizeName = (name: string) => {
  const v = name.trim().toLowerCase();
  if (['color','colour','لون','اللون'].includes(v)) return 'اللون';
  if (['size','المقاس','مقاس','الحجم'].includes(v)) return 'المقاس';
  if (['material','الخامة','خامة'].includes(v)) return 'الخامة';
  return name.trim();
};
const isScalar = (v: unknown): v is string | number | boolean => ['string','number','boolean'].includes(typeof v);
const scalarOptions = (details: Record<string, unknown>) => {
  const result: Record<string,string> = {};
  for (const [raw,value] of Object.entries(details)) {
    if (reserved.has(raw.toLowerCase()) || !isScalar(value) || !s(value)) continue;
    const key = normalizeName(raw).slice(0,80);
    if (key && !Object.hasOwn(result,key)) result[key] = s(value).slice(0,100);
  }
  return result;
};
const detailsJson = (details: Record<string,unknown>) => JSON.stringify(Object.fromEntries(Object.entries(details).filter(([k,v]) => k !== '__proto__' && k !== 'constructor' && k !== 'prototype' && isScalar(v)).map(([k,v])=>[k,s(v)])));

export function exportHomyWorkbook(products: Product[], catalogs: ProductCatalog[], variants: ProductVariant[], filename: string) {
  const catalogMap = new Map(catalogs.map(x => [x.product_id,x]));
  const variantIds = new Map(variants.map(x => [x.variant_id,x]));
  const variantBarcodes = new Map(variants.filter(x=>x.barcode).map(x=>[x.barcode,x]));
  const data: Record<string, unknown>[] = [], images: Record<string,unknown>[] = [];
  const grouped = new Map<string, {p:Product; v?:ProductVariant}[]>();
  for (const p of products) {
    const v = variantIds.get(p.product_id) || variantBarcodes.get(s(p.barcode));
    const id = v?.product_id || p.product_id;
    grouped.set(id,[...(grouped.get(id)||[]),{p,v}]);
  }
  const addImages = (key:string, urls:string[]) => uniq(urls.filter(url => /^https?:\/\//i.test(url))).slice(0,20).forEach((url,i)=>images.push({image_key:`${key}-image-${i+1}`,item_key:key,source_type:'url',source:url,is_primary:i===0,sort_order:i}));
  const usedSlugs = new Set<string>();
  const slugFor = (key: string) => {const base=safeSlug(key);let slug=base,n=2;while(usedSlugs.has(slug))slug=`${base}-${n++}`;usedSlugs.add(slug);return slug;};
  for (const [id, items] of grouped) {
    const c = catalogMap.get(id), first = items[0].p;
    const hasVariants = Boolean(c?.has_variants || items.some(x=>x.v));
    const parent = `product-${id}`;
    const title = s(c?.name_ar || first.product_name).slice(0,250) || 'منتج بدون اسم';
    const common = {title_ar:title,description:s(c?.description || first.description).slice(0,20000),category_refs:s(c?.category_name || first.category_name),status:'draft',display_mode:'grouped',is_listed:true,sort_order:0};
    if(hasVariants){
      data.push({record_type:'base',item_key:parent,parent_key:'',...common,sku:'',slug:''});
      addImages(parent,uniq([first.primary_image_url||'',...(first.image_urls||[]),first.image_url||'']));
    }
    // HOMY requires the exact same option names for every variant in a family.
    const optionSets = items.map(({v}) => scalarOptions((v?.details || {}) as Record<string,unknown>));
    const optionNames = uniq(optionSets.flatMap(o=>Object.keys(o))).slice(0,6);
    // A stable identity dimension avoids duplicate combinations, even if SODFA
    // stores multiple stock records with identical/missing option metadata.
    if (hasVariants) optionNames.push('__sodfa_variant');
    const usedSkus = new Set<string>();
    for(let index=0;index<items.length;index++){
      const {p,v} = items[index];
      const key = hasVariants ? `variant-${v?.variant_id || p.product_id}` : parent;
      const details = (v?.details || {}) as Record<string,unknown>;
      const options: Record<string,string> = {};
      if(hasVariants) {
        for(const name of optionNames) options[name] = name === '__sodfa_variant' ? safeKey(v?.variant_id || p.product_id).slice(0,100) : optionSets[index][name] || 'غير محدد';
      }
      const entries = Object.entries(options);
      const originalSku = s(v?.sku || p.barcode || p.product_id).slice(0,90);
      let sku = originalSku || safeKey(key);let n=2;
      while(usedSkus.has(sku.toLowerCase()))sku=`${originalSku}-${n++}`;
      usedSkus.add(sku.toLowerCase());
      const row:Record<string,unknown> = {record_type:hasVariants?'variant':'simple',item_key:key,parent_key:hasVariants?parent:'',...common,sku,slug:slugFor(key),price_egp:Math.max(0.01,safeNumber(p.selling_price ?? p.price,0.01)),stock_on_hand:Math.max(0,Math.floor(safeNumber(p.remaining_qty ?? p.stock_qty))),title_override:hasVariants?s(v?.variant_name || p.product_name):'',specifications_json:detailsJson(details),extra_options_json:entries.length>3?JSON.stringify(Object.fromEntries(entries.slice(3))):''};
      entries.slice(0,3).forEach(([name,value],i)=>{row[`option_${i+1}_name`]=name;row[`option_${i+1}_value`]=value;});
      data.push(row);
      addImages(key,uniq([p.primary_image_url||'',...(p.image_urls||[]),v?.image_url||'',p.image_url||'']));
    }
  }
  const wb = XLSX.utils.book_new();
  const sheet = (headers:string[],rows:Record<string,unknown>[]) => XLSX.utils.aoa_to_sheet([headers,...rows.map(row=>headers.map(h=>row[h]??''))]);
  XLSX.utils.book_append_sheet(wb,sheet(dataHeaders,data),'البيانات');
  XLSX.utils.book_append_sheet(wb,sheet(imageHeaders,images),'الصور');
  XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([['تعليمات'],['تم تهيئة خيارات التفريعات لتوافق متطلبات HOMY؛ لا تحذف __sodfa_variant لأنه يمنع تكرار التركيبات.'],['المنتجات تصدر كمسودات للمراجعة قبل النشر.'],['التصنيفات تُصدر بأسمائها الأصلية؛ يجب تعيين التصنيف المقابل في HOMY إن لم يكن موجودًا.'],['الأسعار المفقودة تُستبدل مؤقتًا بـ 0.01 جنيه للمراجعة.'],['الصور بروابط عامة HTTP/HTTPS فقط؛ يجب أن تكون متاحة للموقع المستقبِل.']]),'التعليمات');
  XLSX.writeFile(wb,filename);
  return {rows:data.length,images:images.length};
}
