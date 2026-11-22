import { companyLocation, type CompanyProject } from "@/lib/company-navigation";
import { StagingOrderProductPicker } from "@/components/StagingOrderProductPicker";
import { VoiceInput } from "@/components/VoiceInput";
import { calculateOrderTotal, parseSpokenOrder } from "@/lib/inventory-planning";
import {useEffect,useState,type FormEvent} from "react";
import {createFileRoute,Link} from "@tanstack/react-router";
import {AppShell} from "@/components/AppShell";
import {supabase} from "@/lib/supabase";
import {getStagingLocations,createStagingOrder,confirmStagingOrder} from "@/lib/company-orders-staging.functions";
import {Truck,ShieldCheck,RefreshCcw} from "lucide-react";

export const Route=createFileRoute("/control-center-orders")({
 validateSearch: (search:Record<string,unknown>): { project?: CompanyProject; brand?: "homey"|"sodfa" }=>{
  const {project}=companyLocation(search);
  const brand=search["brand"];
  return {...(project?{project}:{}),...(brand==="homey"||brand==="sodfa"?{brand}:{})};
 },
 component:OrderOperations
});
const css={
 card:{background:"#111114",border:"1px solid #27272A",borderRadius:16,padding:20} as const,
 input:{background:"#08080a",color:"white",border:"1px solid #4a3750",padding:"9px 12px",borderRadius:9,minWidth:100} as const,
 button:{background:"#823292",color:"white",border:0,borderRadius:9,padding:"11px 16px",cursor:"pointer"} as const,
};
function OrderOperations(){
 const [places,setPlaces]=useState<Record<string,string[]>>({});
 const context=Route.useSearch();
 const [brand,setBrand]=useState<"homey"|"sodfa">(context.brand??"homey");
 const [name,setName]=useState(""),[phone,setPhone]=useState("");
 const [gov,setGov]=useState(""),[city,setCity]=useState(""),[address,setAddress]=useState("");
 const [items,setItems]=useState<Array<{name:string;quantity:number;price:number;catalogId?:string}>>([{name:"",quantity:1,price:0}]);
 const [orderText,setOrderText]=useState("");
 const [carrier,setCarrier]=useState("");
 const [spokenTotal,setSpokenTotal]=useState<number>();

 const [shipping,setShipping]=useState(0),[prepaid,setPrepaid]=useState(0),[discount,setDiscount]=useState(0);
 const amount=calculateOrderTotal(items,shipping,discount);
 const totalMismatch=spokenTotal!==undefined&&spokenTotal!==amount;
 function fillOrder(text:string){
  const draft=parseSpokenOrder(text);
  if(draft.invalidAmounts){setNotice("تكلفة الشحن أو الإجمالي مش واضحين. أملِهم بالأرقام أو اكتبهم.");return;}
  if(draft.hasItemText&&!draft.items.length){setNotice("راجع الأصناف. لكل صنف قول الاسم ثم عدد القطع وسعر الوحدة.");return;}
  if(!draft.name&&!draft.phone&&!draft.address&&!draft.items.length&&draft.shipping===undefined&&!draft.carrier&&draft.total===undefined){setNotice("ما اتعرفش على بيانات الطلب. قول اسم الحقل قبل قيمته.");return;}
  if(draft.name)setName(draft.name);
  if(draft.phone)setPhone(draft.phone);
  if(draft.address)setAddress(draft.address);
  if(draft.items.length)setItems(draft.items);
  if(draft.shipping!==undefined)setShipping(draft.shipping);
  if(draft.carrier)setCarrier(draft.carrier);
  setSpokenTotal(draft.total);
  setNotice("راجع البيانات واختار المحافظة والمنطقة قبل الحفظ.");
 }
 const [requestId,setRequestId]=useState(()=>crypto.randomUUID());
 const [notice,setNotice]=useState(""),[busy,setBusy]=useState(false);
 const [saved,setSaved]=useState<{id:string;status:string;version:number;amount:number}|null>(null);
 useEffect(()=>{void loadLocations();},[]);
 async function getToken(){
  const {data:{session}}=await supabase.auth.getSession();
  if(!session?.access_token)throw new Error("سجل دخولك إلى صدفة أولاً");
  return session.access_token;
 }
 async function loadLocations(){
  try{setPlaces(await getStagingLocations({data:{token:await getToken()}}));}
  catch(e){setNotice("تعذر تحميل المحافظات والمدن: "+(e instanceof Error?e.message:"خطأ"))}
 }
 async function create(e:FormEvent){
  e.preventDefault();if(totalMismatch||busy||saved)return;setBusy(true);setNotice("");
  try{
   const result=await createStagingOrder({data:{
    token:await getToken(),creationRequestId:requestId,brand,
    customerName:name.trim(),phone,governorate:gov,city,address:address.trim(),
    items:items.map(item=>({...item,name:item.name.trim(),sku:""})),
    shipping,prepaid,discount,carrier
   }});
   setSaved(result);
   setNotice("تم إنشاء أوردر في قاعدة التجربة المعزولة فقط. لم يُرسل أي طلب إلى تالا أو موقع العميل.");
  }catch(e){setNotice("تعذر حفظ الطلب التجريبي: "+(e instanceof Error?e.message:"خطأ"))}
  finally{setBusy(false)}
 }
 async function confirm(){
  if(!saved)return;
  setBusy(true);
  try{
   const result=await confirmStagingOrder({data:{token:await getToken(),id:saved.id,version:saved.version}});
   setSaved(x=>x?{...x,status:result.status,version:result.version}:null);
   setNotice("تم تأكيد الطلب داخل قاعدة التجربة فقط؛ الإنتاج وحالات تالا لم يتغيروا.");
  }catch(e){setNotice("تعذر التأكيد: "+(e instanceof Error?e.message:"خطأ"))}
  finally{setBusy(false)}
 }
 function reset(){setSaved(null);setOrderText("");setRequestId(crypto.randomUUID());setName("");setPhone("");setItems([{name:"",quantity:1,price:0}]);setAddress("");setNotice("");setCarrier("");setShipping(0);setPrepaid(0);setDiscount(0);setSpokenTotal(undefined)}
 return <AppShell title="إضافة وتأكيد الطلبات">
  <div dir="rtl" style={{fontFamily:"Cairo,sans-serif",maxWidth:1050,margin:"0 auto",color:"white",paddingBottom:60}}>
   <Link to="/control-center" search={{project:context.project??"orders",section:"orders"}} style={{color:"#C98ADB",fontSize:12}}>مركز الشركة / الرجوع</Link>
   <h1 style={{fontSize:26,margin:"10px 0"}}>إضافة الطلبات وتأكيدها</h1>
   <div style={{...css.card,marginBottom:16,border:"1px solid #875d33",background:"#201914"}}>
    <ShieldCheck size={18} style={{display:"inline",marginLeft:8}}/>
    <b>وضع الاختبار الآمن</b>
    <p style={{fontSize:12,lineHeight:2,marginBottom:0}}>العمليات هنا حقيقية داخل نسخة Neon التجريبية المنفصلة لإدارة الطلبات، لكنها لا تُغيّر أوردرات الإنتاج ولا تُنشئ شحنات تالا. اختبار العملية من أول الإدخال حتى التأكيد قبل تشغيلها على النظام الحي.</p>
   </div>
   <div style={css.card}>
    <h2 style={{fontSize:19,marginTop:0}}>بيانات الطلب الجديد</h2>
    <label htmlFor="order-dictation">إملاء بيانات الطلب أو كتابتها</label>
    <div className="my-2 flex items-center gap-2">
     <textarea id="order-dictation" value={orderText} onChange={e=>setOrderText(e.target.value)} disabled={busy||Boolean(saved)}
      className="min-w-0 flex-1 rounded-lg border border-[#53505a] bg-[#0a0a0c] p-2" rows={2} maxLength={2500} />
     <VoiceInput compact disabled={busy||Boolean(saved)} onTranscript={text=>setOrderText(text.slice(0,2500))} prompt="قول اسم العميل والعنوان ورقم الهاتف والمنتجات والشحن." />
    </div>
    <button type="button" disabled={busy||Boolean(saved)||!orderText.trim()} onClick={()=>fillOrder(orderText)}>املأ حقول الطلب</button>
    <p style={{fontSize:12}}>للأصناف قول: المنتجات تيشيرت عدد ٢ سعر ١٠٠، ومنتج بنطلون عدد ١ سعر ٢٠٠.</p>
    <form onSubmit={e=>void create(e)} style={{display:"grid",gap:15}}>
     <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:12}}>
      <label>البراند <select value={brand} onChange={e=>{setBrand(e.target.value as "homey"|"sodfa");setItems(items.map(({name,quantity,price})=>({name,quantity,price})));}} style={{...css.input,display:"block",width:"100%"}}><option value="homey">هومي</option><option value="sodfa">صدفة</option></select></label>
      <label>اسم العميل <input required minLength={2} value={name} onChange={e=>setName(e.target.value)} style={{...css.input,display:"block",width:"100%"}}/></label>
      <label>رقم الموبايل <input required value={phone} onChange={e=>setPhone(e.target.value)} placeholder="01..." style={{...css.input,display:"block",width:"100%"}}/></label>
      <label>المحافظة <select required value={gov} onChange={e=>{setGov(e.target.value);setCity("")}} style={{...css.input,display:"block",width:"100%"}}><option value="">اختر المحافظة</option>{Object.keys(places).map(x=><option key={x}>{x}</option>)}</select></label>
      <label>المدينة / المنطقة <select required value={city} onChange={e=>setCity(e.target.value)} disabled={!gov} style={{...css.input,display:"block",width:"100%"}}><option value="">اختر المنطقة</option>{(places[gov]??[]).map(x=><option key={x}>{x}</option>)}</select></label>
      <label>العنوان التفصيلي <input required minLength={5} value={address} onChange={e=>setAddress(e.target.value)} style={{...css.input,display:"block",width:"100%"}}/></label>
     </div>
     <h3 style={{margin:"8px 0 0",fontSize:16}}>المنتجات والمبالغ</h3>
     <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:12}}>
      {items.map((item,index)=> <fieldset key={index} style={{display:"grid",gap:8}}>
       <legend>الصنف {index+1}</legend>
       <label>اسم المنتج <input required minLength={2} maxLength={180} value={item.name} onChange={e=>setItems(items.map((row,i)=>i===index?{name:e.target.value,quantity:row.quantity,price:row.price}:row))} style={css.input}/></label>
       {item.catalogId ? <small>صنف مرتبط بالكتالوج · {item.catalogId}</small> :
        <StagingOrderProductPicker key={JSON.stringify([brand,item.name])} brand={brand} name={item.name}
         onSelect={product=>setItems(rows=>rows.map((row,i)=>i===index?{...row,name:product.name,catalogId:product.id}:row))}/>}
       <label>الكمية <input type="number" required min={1} max={999} value={item.quantity} onChange={e=>setItems(items.map((row,i)=>i===index?{...row,quantity:Number(e.target.value)}:row))} style={css.input}/></label>
       <label>السعر للوحدة <input type="number" required min={0} step="0.01" value={item.price} onChange={e=>setItems(items.map((row,i)=>i===index?{...row,price:Number(e.target.value)}:row))} style={css.input}/></label>
       {items.length>1&&<button type="button" onClick={()=>setItems(items.filter((_,i)=>i!==index))}>حذف الصنف</button>}
      </fieldset>)}
      <button type="button" disabled={items.length>=50} onClick={()=>setItems([...items,{name:"",quantity:1,price:0}])}>إضافة صنف</button>
      <label>شركة الشحن <input maxLength={100} value={carrier} onChange={e=>setCarrier(e.target.value)} style={css.input}/></label>
      <label>الشحن <input type="number" min={0} step="0.01" value={shipping} onChange={e=>setShipping(Number(e.target.value))} style={{...css.input,display:"block",width:"100%"}}/></label>
      <label>المدفوع مقدمًا <input type="number" min={0} step="0.01" value={prepaid} onChange={e=>setPrepaid(Number(e.target.value))} style={{...css.input,display:"block",width:"100%"}}/></label>
      <label>الخصم <input type="number" min={0} step="0.01" value={discount} onChange={e=>setDiscount(Number(e.target.value))} style={{...css.input,display:"block",width:"100%"}}/></label>
     </div>
     <strong>إجمالي الطلب: {amount.toLocaleString("en-US")} ج.م</strong>
     {totalMismatch&&<p role="alert">الإجمالي المسموع {spokenTotal} ج.م مختلف عن الإجمالي المحسوب. راجع المبالغ أو <button type="button" onClick={()=>setSpokenTotal(undefined)}>اعتمد الإجمالي المحسوب</button>.</p>}
     <button disabled={busy||Boolean(saved)||totalMismatch} type="submit" style={{...css.button,opacity:busy||saved?0.6:1}}>
      <Truck size={15} style={{display:"inline",marginLeft:7}}/>{busy?"جار التنفيذ":saved?"تم تسجيل الطلب التجريبي":"حفظ طلب تجريبي"}
     </button>
    </form>
   </div>
   {notice&&<div role="status" style={{...css.card,marginTop:12,color:"#d7afd9"}}>{notice}</div>}
   {saved&&<div style={{...css.card,marginTop:15}}>
    <h2 style={{fontSize:19}}>نتيجة التجربة</h2>
    <p>رقم الطلب: <code>{saved.id}</code></p><p>الحالة: <b>{saved.status}</b></p>
    <p>المبلغ: {saved.amount.toLocaleString("en-US")} ج.م</p>
    <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
     <button disabled={busy||saved.status!=="new"} onClick={()=>void confirm()} style={css.button}>تأكيد الطلب التجريبي</button>
     <button onClick={reset} style={{...css.button,background:"#332838"}}><RefreshCcw size={14} style={{display:"inline",marginLeft:7}}/>طلب جديد</button>
    </div>
   </div>}
  </div>
 </AppShell>
}
