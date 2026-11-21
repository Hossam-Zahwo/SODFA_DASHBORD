import { useEffect, useState, type FormEvent } from "react";
import {createFileRoute,Link} from "@tanstack/react-router";
import {AppShell} from "@/components/AppShell";
import {supabase} from "@/lib/supabase";
import {getCompanyWorkspaceData} from "@/lib/company-workspace.functions";
import {saveChannelDraft} from "@/lib/company-channel-drafts.functions";
import {createCompanyProductDraft} from "@/lib/company-product-create.functions";
import {Plus,RefreshCcw,Package,Lock,Search} from "lucide-react";

export const Route=createFileRoute("/control-center-products")({component:CatalogAdmin});
type Product=Awaited<ReturnType<typeof getCompanyWorkspaceData>>["catalog"]["products"][number];
const ui={card:"#111114",background:"#09090b",purple:"#823292",violet:"#A94FBC",border:"#27272A"};
const box={background:ui.card,border:"1px solid "+ui.border,borderRadius:14,padding:18} as const;
const input={background:ui.background,color:"white",border:"1px solid #54435b",borderRadius:10,padding:"10px 12px"} as const;
const btn={background:ui.purple,border:0,borderRadius:9,padding:"10px 13px",color:"white",cursor:"pointer"} as const;
function CatalogAdmin(){
 const [products,setProducts]=useState<Product[]>([]);
 const [connected,setConnected]=useState(false),[loading,setLoading]=useState(true);
 const [notice,setNotice]=useState(""),[busy,setBusy]=useState(false);
 const [query,setQuery]=useState(""),[filter,setFilter]=useState("all");
 const [formVisible,setFormVisible]=useState(false);
 const [title,setTitle]=useState(""),[brand,setBrand]=useState<"homey"|"sodfa">("homey");
 const [price,setPrice]=useState(""),[homey,setHomey]=useState(true),[sodfa,setSodfa]=useState(false);
 const [reqId,setReqId]=useState(()=>crypto.randomUUID());
 useEffect(()=>{void load();},[]);
 async function token(){
  const {data:{session}}=await supabase.auth.getSession();
  if(!session?.access_token)throw new Error("يلزم تسجيل الدخول بحساب صدفة");
  return session.access_token;
 }
 async function load(){
  setLoading(true);
  try{
   const r=await getCompanyWorkspaceData({data:{token:await token(),brand:"all",query:""}});
   setProducts(r.catalog.products);setConnected(r.catalog.connected);
   if(!r.catalog.connected)setNotice(r.catalog.error??"تعذر ربط فهرس المنتجات");
  }catch(e){setNotice(e instanceof Error?e.message:"تعذر تحميل المنتجات");}
  finally{setLoading(false)}
 }
 async function save(product:Product,channel:"homey_web"|"sodfa_web",visible:boolean){
  setBusy(true);setNotice("");
  try{
   await saveChannelDraft({data:{
    token:await token(),source:product.source as "homey_store"|"sodfa_dashboard"|"crm_manual",
    sourceProductId:product.id,channel,intendedVisibility:visible,
    price:channel==="homey_web"?(product.homey_price??product.min_sale_price_egp):
      (product.sodfa_price??product.min_sale_price_egp),
   }});
   setNotice("اتحفظ قرار القناة كمسودة في CRM، وما تغيّرش أي موقع خارجي");
   await load();
  }catch(e){setNotice("فشل حفظ المسودة: "+(e instanceof Error?e.message:"خطأ"))}
  finally{setBusy(false)}
 }
 async function submit(e:FormEvent){
  e.preventDefault();if(!title.trim())return;
  setBusy(true);setNotice("");
  try{
   await createCompanyProductDraft({data:{
    token:await token(),requestId:reqId,title:title.trim(),brand,
    channels:[...(homey?["homey_web" as const]:[]),...(sodfa?["sodfa_web" as const]:[])],
    proposedPrice:price===""?null:Number(price)
   }});
   setNotice("المنتج الجديد اتحفظ في قاعدة CRM كمسودة بالقنوات المحددة. مش منشور في المتاجر.");
   setTitle("");setPrice("");setReqId(crypto.randomUUID());setFormVisible(false);
   await load();
  }catch(e){setNotice("تعذر إنشاء المنتج: "+(e instanceof Error?e.message:"خطأ"))}
  finally{setBusy(false)}
 }
 const filtered=products.filter(p=>(filter==="all"||p.brand===filter)&&p.title.toLowerCase().includes(query.toLowerCase()));
 return <AppShell title="المنتجات وقنوات البيع">
 <div dir="rtl" style={{fontFamily:"Cairo,sans-serif",color:"white",padding:"10px 0 50px"}}>
  <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"center",flexWrap:"wrap"}}>
   <div><Link to="/control-center" style={{color:ui.violet,fontSize:12}}>مركز الشركة / رجوع</Link>
    <h1 style={{fontWeight:900,fontSize:26,margin:"8px 0"}}>إدارة المنتجات وقنوات البيع</h1>
    <p style={{fontSize:12,color:"#aaa"}}>المنتجات من المصادر الفعلية، وقرارات العرض محفوظة كمسودات منفصلة لكل متجر</p></div>
   <div style={{display:"flex",gap:10}}>
    <button onClick={()=>void load()} disabled={loading} style={btn}><RefreshCcw size={14} style={{display:"inline",marginLeft:6}}/>تحديث</button>
    <button onClick={()=>setFormVisible(!formVisible)} style={btn}><Plus size={14} style={{display:"inline",marginLeft:6}}/>إضافة منتج</button>
   </div>
  </div>
  <div style={{...box,margin:"16px 0",color:"#e5c3f2",fontSize:12}}>
   <Lock size={15} style={{display:"inline",marginLeft:8}}/>
   الحفظ والتعديل هنا في قاعدة CRM المستقلة، وليس نشرًا مباشرًا للعميل. لا توجد بيانات شراء أو موردين في واجهة المواقع العامة.
  </div>
  {notice&&<div role="status" style={{...box,marginBottom:14,color:"#ebcaed"}}>{notice}</div>}
  {formVisible&&<form onSubmit={e=>void submit(e)} style={{...box,display:"grid",gap:12,marginBottom:16}}>
   <strong>إضافة منتج جديد كمسودة</strong>
   <label>اسم المنتج <input required minLength={3} maxLength={240} value={title} onChange={e=>setTitle(e.target.value)} style={{...input,display:"block",width:"100%"}}/></label>
   <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
    <label>البراند الأصلي <select value={brand} onChange={e=>setBrand(e.target.value as "homey"|"sodfa")} style={{...input,display:"block"}}><option value="homey">هومي</option><option value="sodfa">صدفة</option></select></label>
    <label>السعر المقترح (ج.م) <input type="number" min="0" step="0.01" value={price} onChange={e=>setPrice(e.target.value)} style={{...input,display:"block"}}/></label>
   </div>
   <strong>يتعرض على أنهي موقع؟ (اقتراح فقط)</strong>
   <div style={{display:"flex",gap:16}}>
    <label><input type="checkbox" checked={homey} onChange={e=>setHomey(e.target.checked)}/> موقع هومي</label>
    <label><input type="checkbox" checked={sodfa} onChange={e=>setSodfa(e.target.checked)}/> موقع صدفة</label>
   </div>
   <button type="submit" disabled={busy} style={btn}>{busy?"جاري الحفظ":"حفظ المنتج والقنوات"}</button>
  </form>}
  <div style={{...box,marginBottom:15,display:"flex",gap:12,flexWrap:"wrap",alignItems:"center"}}>
   <Search size={18} color={ui.violet}/>
   <input placeholder="ابحث عن منتج" value={query} onChange={e=>setQuery(e.target.value)} style={{...input,flex:1,minWidth:170}}/>
   <select aria-label="تصفية البراند" value={filter} onChange={e=>setFilter(e.target.value)} style={input}>
    <option value="all">كل المنتجات</option><option value="homey">هومي</option><option value="sodfa">صدفة</option>
   </select>
   <span style={{color:"#aaa",fontSize:12}}>{loading?"جاري التحميل":connected?filtered.length+" منتج":"فشل الاتصال"}</span>
  </div>
  <div style={{...box,overflowX:"auto"}}>
   <table style={{minWidth:850,width:"100%",borderCollapse:"collapse",fontSize:12}}>
    <thead><tr style={{color:ui.violet,borderBottom:"1px solid "+ui.border}}>
     {["المنتج","البراند","سعر المصدر","المخزون","حالة المصدر","مسودة هومي","مسودة صدفة"].map(x=><th key={x} style={{padding:11,textAlign:"right"}}>{x}</th>)}
    </tr></thead>
    <tbody>{filtered.map(p=><tr key={p.source+p.id} style={{borderBottom:"1px solid "+ui.border}}>
     <td style={{padding:11}}><strong>{p.title}</strong><div style={{fontSize:10,color:"#999"}}>{p.source}</div></td>
     <td>{p.brand==="homey"?"هومي":"صدفة"}</td>
     <td>{p.min_sale_price_egp==null?"—":Number(p.min_sale_price_egp).toLocaleString("en-US")+" ج.م"}</td>
     <td>{p.available_units==null?"—":Number(p.available_units).toLocaleString("en-US")}</td>
     <td style={{color:"#d8b8e2"}}>{p.source_status??"غير متاح"}</td>
     {(["homey_web","sodfa_web"] as const).map(channel=>{
      const x=channel==="homey_web"?p.homey_draft:p.sodfa_draft;
      return <td key={channel}><span style={{color:x===null?"#cdbf9b":x?"#8ee1b5":"#c6a8ee"}}>{x===null?"غير محدد":x?"عرض مقترح":"إخفاء مقترح"}</span>
       <div style={{display:"flex",gap:5,marginTop:5}}>
        <button disabled={busy} type="button" onClick={()=>void save(p,channel,true)} style={{...btn,padding:"5px 9px",fontSize:10}}>عرض</button>
        <button disabled={busy} type="button" onClick={()=>void save(p,channel,false)} style={{...btn,padding:"5px 9px",fontSize:10,background:"#29252e"}}>إخفاء</button>
       </div></td>
     })}
    </tr>)}</tbody>
   </table>
   {connected&&!loading&&!filtered.length&&<p>لا توجد نتائج مطابقة</p>}
  </div>
  <p style={{fontSize:11,color:"#999",marginTop:12}}>المخزون والأسعار نُقلت من مصادرها وقت المزامنة؛ وليست بيانات لحظية. بعض منتجات صدفة ليست لها سجلات مخزون مرتبطة في عرض الويب.</p>
 </div></AppShell>
}
