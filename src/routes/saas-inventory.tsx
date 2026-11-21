import {useEffect,useState,type FormEvent} from "react";
import {createFileRoute,Link} from "@tanstack/react-router";
import {AppShell} from "@/components/AppShell";
import {supabase} from "@/lib/supabase";
import {getSaaSInventory,adjustSaaSInventory} from "@/lib/saas-inventory.functions";
import {Warehouse,RefreshCw,ShieldCheck} from "lucide-react";

export const Route=createFileRoute("/saas-inventory")({component:Inventory});
const tenantId="4e23ed6b-8430-475f-8eb4-c9d249e4c0e4";
type D=Awaited<ReturnType<typeof getSaaSInventory>>;
const card={background:"#111114",border:"1px solid #352a3b",borderRadius:14,padding:17} as const;
const field={background:"#09090c",border:"1px solid #53425c",color:"white",borderRadius:8,padding:10,width:"100%"} as const;
const btn={background:"#823292",color:"white",borderRadius:9,border:0,padding:"10px 14px",cursor:"pointer"} as const;
function Inventory(){
 const [brand,setBrand]=useState<"homey"|"sodfa">("homey"),[data,setData]=useState<D|null>(null);
 const [product,setProduct]=useState(""),[warehouse,setWarehouse]=useState("");
 const [delta,setDelta]=useState("1"),[reason,setReason]=useState<"receipt"|"return"|"count_adjustment"|"transfer_in"|"transfer_out"|"sale">("receipt");
 const [requestId,setRequestId]=useState(()=>crypto.randomUUID());
 const [loading,setLoading]=useState(false),[msg,setMsg]=useState("");
 useEffect(()=>{void load();},[brand]);
 async function token(){const {data:{session}}=await supabase.auth.getSession();if(!session?.access_token)throw Error("سجل دخولك بحساب مدير");return session.access_token;}
 async function load(){
  setLoading(true);
  try{setData(await getSaaSInventory({data:{token:await token(),tenantId,brand}}));}
  catch(e){setMsg("تعذر قراءة المخزون: "+(e instanceof Error?e.message:"خطأ"))}
  finally{setLoading(false)}
 }
 async function submit(e:FormEvent){
  e.preventDefault();setLoading(true);setMsg("");
  try{
   const n=Number(delta);
   if(n===0||!Number.isInteger(n))throw Error("التغير لازم يكون عدد صحيح غير صفر");
   const x=await adjustSaaSInventory({data:{token:await token(),tenantId,brand,
     productId:product,warehouseId:warehouse,delta:n,reason,requestId}});
   setMsg(x.changed?"تم تسجيل حركة المخزون وتحديث الرصيد التجريبي":"الحركة مسجلة قبل كده؛ لم يتم تكرارها");
   setRequestId(crypto.randomUUID());await load();
  }catch(e){setMsg("التعديل لم يتم: "+(e instanceof Error?e.message:"خطأ"))}
  finally{setLoading(false)}
 }
 return <AppShell title="ERP — المخزون">
 <div dir="rtl" style={{fontFamily:"Cairo,sans-serif",color:"white",paddingBottom:50}}>
  <Link to="/saas-erp" style={{color:"#cca2e6",fontSize:12}}>ERP / رجوع</Link>
  <h1 style={{fontSize:25,margin:"12px 0"}}><Warehouse size={23} style={{display:"inline",marginLeft:7}}/>المستودعات وحركات المخزون</h1>
  <div style={{...card,marginBottom:14,color:"#edc598",fontSize:12}}><ShieldCheck size={16} style={{display:"inline",marginLeft:6}}/>هذه قاعدة SaaS تجريبية. الأرصدة هنا لا تغير مخزون هومي أو صدفة المباشر، والحركات مسجلة برقم فريد لمنع التكرار.</div>
  <div style={{display:"flex",gap:10,marginBottom:13}}>{(["homey","sodfa"] as const).map(x=><button key={x} onClick={()=>{setBrand(x);setData(null);setProduct("");setWarehouse("")}} style={{...btn,background:brand===x?"#823292":"#241c28"}}>{x==="homey"?"هومي فقط":"صدفة فقط"}</button>)}
  <button onClick={()=>void load()} style={{...btn,marginRight:"auto"}}><RefreshCw size={14} style={{display:"inline",marginLeft:5}}/>تحديث</button></div>
  {msg&&<div role="status" style={{...card,marginBottom:12,color:"#e3b6f1"}}>{msg}</div>}
  <form onSubmit={e=>void submit(e)} style={{...card,display:"grid",gap:12,marginBottom:15}}>
   <h2 style={{fontSize:17}}>تسجيل حركة مخزون</h2>
   <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(185px,1fr))",gap:12}}>
    <label>المستودع<select required value={warehouse} onChange={e=>setWarehouse(e.target.value)} style={field}><option value="">اختر مخزن</option>{(data?.warehouses??[]).map(x=><option key={String(x.id)} value={String(x.id)}>{String(x.name)}</option>)}</select></label>
    <label>المنتج<select required value={product} onChange={e=>setProduct(e.target.value)} style={field}><option value="">اختر منتج</option>{(data?.products??[]).map(x=><option key={String(x.id)} value={String(x.id)}>{String(x.title)}</option>)}</select></label>
    <label>التغيير (+ إضافة / - صرف)<input required type="number" value={delta} onChange={e=>setDelta(e.target.value)} style={field}/></label>
    <label>سبب الحركة<select value={reason} onChange={e=>setReason(e.target.value as typeof reason)} style={field}>
     <option value="receipt">استلام بضاعة</option><option value="return">مرتجع</option>
     <option value="count_adjustment">تسوية جرد</option><option value="sale">صرف بيع</option>
     <option value="transfer_in">تحويل وارد</option><option value="transfer_out">تحويل صادر</option></select></label>
   </div>
   <button disabled={loading} style={btn}>حفظ الحركة بسجل تدقيق</button>
  </form>
  <div style={{...card,marginBottom:14,overflowX:"auto"}}>
   <h2 style={{fontSize:17}}>أرصدة المخزون داخل SaaS</h2>
   <table style={{width:"100%",minWidth:570,borderCollapse:"collapse",fontSize:12}}>
    <thead><tr style={{color:"#d5a8e8"}}>{["المخزن","المنتج","الموجود","المحجوز","المتاح"].map(x=><th key={x} style={{padding:9,textAlign:"right"}}>{x}</th>)}</tr></thead>
    <tbody>{(data?.balances??[]).map((x,i)=><tr key={i} style={{borderTop:"1px solid #352a3b"}}><td style={{padding:9}}>{String(x.warehouse)}</td><td>{String(x.title)}</td>
     <td>{Number(x.on_hand)}</td><td>{Number(x.reserved)}</td><td>{Number(x.on_hand)-Number(x.reserved)}</td></tr>)}</tbody>
   </table>
   {!data?.balances.length&&<p style={{color:"#aaa",fontSize:12}}>لا توجد أرصدة مسجلة بعد. أنشئ مخزنًا من صفحة ERP ثم سجل استلامًا اختباريًا.</p>}
  </div>
  <div style={card}><h2 style={{fontSize:17}}>سجل الحركات</h2>
   {(data?.movements??[]).map((x,i)=><div key={i} style={{padding:9,borderBottom:"1px solid #33283a",fontSize:12}}>{String(x.title)} · {String(x.warehouse)} · {Number(x.delta)>0?"+":""}{Number(x.delta)} · {String(x.reason)}</div>)}
  </div>
 </div></AppShell>
}
