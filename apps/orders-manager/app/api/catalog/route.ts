import {NextResponse} from 'next/server';
import {requireAccess} from '@/lib/access';

export const runtime='nodejs';
export const dynamic='force-dynamic';
type Product={id:string;title_ar:string;status:string};
type Variant={id:string;product_id:string;sku:string|null;title_override:string|null;price_minor:number;status:string;is_listed:boolean;stock_on_hand:number;stock_reserved:number};
type ProductImage={product_id:string;variant_id:string|null;storage_path:string};

const mirror='https://tzbckxumztwwyytryarw.supabase.co';
function imageSources(path:string,origin:string){
 if(/^https?:\/\//i.test(path)){
  const absolute=new URL(path);
  if(absolute.origin===origin && absolute.pathname.startsWith('/storage/v1/object/public/homly-products/')){
   return [absolute.href,mirror+absolute.pathname];
  }
  return [absolute.href];
 }
 if(path.startsWith('/'))return ['https://homeyegypt.com'+path];
 const objectPath='/storage/v1/object/public/homly-products/'+path.split('/').map(encodeURIComponent).join('/');
 return [origin+objectPath,mirror+objectPath];
}

export async function GET(request:Request){
 const blocked=await requireAccess(request);
 if(blocked)return blocked;
 const url=process.env.HOMEY_CATALOG_URL,key=process.env.HOMEY_CATALOG_KEY;
 const headers={'Cache-Control':'no-store'};
 if(!url||!key)return NextResponse.json({data:[],warning:'كتالوج هومي غير مربوط بعد — تقدر تضيف المنتجات يدويًا'},{headers});
 try{
  const origin=new URL(url).origin;
  const signal=AbortSignal.timeout(15000);
  const catalogHeaders={apikey:key};
  async function readAll<T>(query:string){
   const pageSize=200;
   const rows:T[]=[];
   for(let offset=0;;offset+=pageSize){
    const response=await fetch(origin+'/rest/v1/'+query+'&limit='+pageSize+'&offset='+offset,{headers:catalogHeaders,cache:'no-store',signal});
    if(!response.ok)throw Error('Catalog request failed');
    const page=await response.json() as T[];
    rows.push(...page);
    if(page.length<pageSize)return rows;
   }
  }
  const [products,variants,images]=await Promise.all([
   readAll<Product>('homly_products?select=id,title_ar,status&deleted_at=is.null&order=id.asc'),
   readAll<Variant>('homly_product_variants?select=id,product_id,sku,title_override,price_minor,status,is_listed,stock_on_hand,stock_reserved&order=id.asc'),
   readAll<ProductImage>('homly_product_images?select=product_id,variant_id,storage_path&order=sort_order.asc,id.asc').catch(()=>null),
  ]);
  const productImages=new Map<string,string[]>(),variantImages=new Map<string,string[]>();
  for(const row of images??[]){
   const path=row.storage_path?.trim();
   if(!path)continue;
   let sources:string[];
   try{sources=imageSources(path,origin)}catch{continue}
   productImages.set(row.product_id,[...(productImages.get(row.product_id)??[]),...sources]);
   if(row.variant_id)variantImages.set(row.variant_id,[...(variantImages.get(row.variant_id)??[]),...sources]);
  }
  const productsById=new Map(products.map(product=>[product.id,product]));
  const data=variants.flatMap(variant=>{
   const product=productsById.get(variant.product_id);
   if(!product)return [];
   const hasStock=Number(variant.stock_on_hand)>Number(variant.stock_reserved);
   const listed=product.status==='published'&&variant.status==='published'&&variant.is_listed;
   if(!hasStock&&!listed)return [];
   const name=[product.title_ar,variant.title_override].filter(Boolean).join(' — ');
   const price=Number(variant.price_minor||0)/100;
   if(!name||!Number.isFinite(price))return [];
   const imageUrls=[...new Set([...(variantImages.get(variant.id)??[]),...(productImages.get(product.id)??[])])].slice(0,8);
   return [{name,sku:variant.sku||'',price,imageUrl:imageUrls[0],imageUrls}];
  });
  return NextResponse.json({data,warning:images===null?'تعذر تحميل صور الكتالوج حاليًا':undefined},{headers});
 }catch{
  return NextResponse.json({data:[],warning:'تعذر تحميل منتجات هومي حاليًا؛ الإدخال اليدوي متاح'},{headers});
 }
}
