import {useEffect,useState,type FormEvent} from "react";
import {createFileRoute,Link} from "@tanstack/react-router";
import {AppShell} from "@/components/AppShell";
import {supabase} from "@/lib/supabase";
import {getStagingLocations,createStagingOrder,confirmStagingOrder} from "@/lib/company-orders-staging.functions";
import {Truck,ShieldCheck,RefreshCcw} from "lucide-react";

export const Route=createFileRoute("/control-center-orders")({component:OrderOperations});
const css={
 card:{background:"#111114",border:"1px solid #27272A",borderRadius:16,padding:20} as const,
 input:{background:"#08080a",color:"white",border:"1px solid #4a3750",padding:"9px 12px",borderRadius:9,minWidth:100} as const,
 button:{background:"#823292",color:"white",border:0,borderRadius:9,padding:"11px 16px",cursor:"pointer"} as const,
};
function OrderOperations(){
 const [places,setPlaces]=useState<Record<string,string[]>>({});
 const [brand,setBrand]=useState<"homey"|"sodfa">("homey");
 const [name,setName]=useState(""),[phone,setPhone]=useState("");
 const [gov,setGov]=useState(""),[city,setCity]=useState(""),[address,setAddress]=useState("");
 const [product,setProduct]=useState(""),[qty,setQty]=useState(1),[price,setPrice]=useState(0);
 const [shipping,setShipping]=useState(0),[prepaid,setPrepaid]=useState(0),[discount,setDiscount]=useState(0);
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
  e.preventDefault();setBusy(true);setNotice("");
  try{
   const result=await createStagingOrder({data:{
    token:await getToken(),creationRequestId:requestId,brand,
    customerName:name.trim(),phone,governorate:gov,city,address:address.trim(),
    items:[{name:product.trim(),sku:"",quantity:qty,price}],
    shipping,prepaid,discount
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
 function reset(){setSaved(null);setRequestId(crypto.randomUUID());setName("");setPhone("");setProduct("");setAddress("");setNotice("");setQty(1);setPrice(0)}
 return <AppShell title="إضافة وتأكيد الطلبات">
  <div dir="rtl" style={{fontFamily:"Cairo,sans-serif",maxWidth:1050,margin:"0 auto",color:"white",paddingBottom:60}}>
   <Link to="/control-center" style={{color:"#C98ADB",fontSize:12}}>مركز الشركة / الرجوع</Link>
   <h1 style={{fontSize:26,margin:"10px 0"}}>إضافة الطلبات وتأكيدها</h1>
   <div style={{...css.card,marginBottom:16,border:"1px solid #875d33",background:"#201914"}}>
    <ShieldCheck size={18} style={{display:"inline",marginLeft:8}}/>
    <b>وضع الاختبار الآمن</b>
    <p style={{fontSize:12,lineHeight:2,marginBottom:0}}>العمليات هنا حقيقية داخل نسخة Neon التجريبية المنفصلة لإدارة الطلبات، لكنها لا تُغيّر أوردرات الإنتاج ولا تُنشئ شحنات تالا. اختبار العملية من أول الإدخال حتى التأكيد قبل تشغيلها على النظام الحي.</p>
   </div>
   <div style={css.card}>
    <h2 style={{fontSize:19,marginTop:0}}>بيانات الطلب الجديد</h2>
    <form onSubmit={e=>void create(e)} style={{display:"grid",gap:15}}>
     <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:12}}>
      <label>البراند <select value={brand} onChange={e=>setBrand(e.target.value as "homey"|"sodfa")} style={{...css.input,display:"block",width:"100%"}}><option value="homey">هومي</option><option value="sodfa">صدفة</option></select></label>
      <label>اسم العميل <input required minLength={2} value={name} onChange={e=>setName(e.target.value)} style={{...css.input,display:"block",width:"100%"}}/></label>
      <label>رقم الموبايل <input required value={phone} onChange={e=>setPhone(e.target.value)} placeholder="01..." style={{...css.input,display:"block",width:"100%"}}/></label>
      <label>المحافظة <select required value={gov} onChange={e=>{setGov(e.target.value);setCity("")}} style={{...css.input,display:"block",width:"100%"}}><option value="">اختر المحافظة</option>{Object.keys(places).map(x=><option key={x}>{x}</option>)}</select></label>
      <label>المدينة / المنطقة <select required value={city} onChange={e=>setCity(e.target.value)} disabled={!gov} style={{...css.input,display:"block",width:"100%"}}><option value="">اختر المنطقة</option>{(places[gov]??[]).map(x=><option key={x}>{x}</option>)}</select></label>
      <label>العنوان التفصيلي <input required minLength={5} value={address} onChange={e=>setAddress(e.target.value)} style={{...css.input,display:"block",width:"100%"}}/></label>
     </div>
     <h3 style={{margin:"8px 0 0",fontSize:16}}>المنتجات والمبالغ</h3>
     <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:12}}>
      <label>اسم المنتج <input required minLength={2} value={product} onChange={e=>setProduct(e.target.value)} style={{...css.input,display:"block",width:"100%"}}/></label>
      <label>الكمية <input type="number" required min={1} max={999} value={qty} onChange={e=>setQty(Number(e.target.value))} style={{...css.input,display:"block",width:"100%"}}/></label>
      <label>السعر للوحدة (ج.م) <input type="number" required min={0} step="0.01" value={price} onChange={e=>setPrice(Number(e.target.value))} style={{...css.input,display:"block",width:"100%"}}/></label>
      <label>الشحن <input type="number" min={0} step="0.01" value={shipping} onChange={e=>setShipping(Number(e.target.value))} style={{...css.input,display:"block",width:"100%"}}/></label>
      <label>المدفوع مقدمًا <input type="number" min={0} step="0.01" value={prepaid} onChange={e=>setPrepaid(Number(e.target.value))} style={{...css.input,display:"block",width:"100%"}}/></label>
      <label>الخصم <input type="number" min={0} step="0.01" value={discount} onChange={e=>setDiscount(Number(e.target.value))} style={{...css.input,display:"block",width:"100%"}}/></label>
     </div>
     <strong>إجمالي الطلب: {(qty*price+shipping-discount).toLocaleString("en-US")} ج.م</strong>
     <button disabled={busy||Boolean(saved)} type="submit" style={{...css.button,opacity:busy||saved?0.6:1}}>
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
