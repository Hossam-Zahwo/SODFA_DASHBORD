import { companyLocation, type CompanyProject } from "@/lib/company-navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {createFileRoute,Link} from "@tanstack/react-router";
import {AppShell} from "@/components/AppShell";
import {supabase} from "@/lib/supabase";
import {getCompanyWorkspaceData} from "@/lib/company-workspace.functions";
import {renameCompanyProductDraft,saveChannelDraft} from "@/lib/company-channel-drafts.functions";
import {createCompanyProductDraft} from "@/lib/company-product-create.functions";
import {Plus,RefreshCcw,Package,Lock,Search} from "lucide-react";

export const Route=createFileRoute("/control-center-products")({
 validateSearch:(search:Record<string,unknown>):{project?:"homey"|"sodfa";workspace?:CompanyProject}=>{
  const brand=search["project"];
  const {project:workspace}=companyLocation({project:search["workspace"]});
  return {...(brand==="homey"||brand==="sodfa"?{project:brand}:{}),...(workspace?{workspace}:{})};
 },
 component:CatalogAdmin
});
type Product=Awaited<ReturnType<typeof getCompanyWorkspaceData>>["catalog"]["products"][number];
const ui={card:"#111114",background:"#09090b",purple:"#823292",violet:"#A94FBC",border:"#27272A"};
const box={background:ui.card,border:"1px solid "+ui.border,borderRadius:14,padding:18} as const;
const input={background:ui.background,color:"white",border:"1px solid #54435b",borderRadius:10,padding:"10px 12px"} as const;
const btn={background:ui.purple,border:0,borderRadius:9,padding:"10px 13px",color:"white",cursor:"pointer"} as const;
function CatalogAdmin(){
 const context=Route.useSearch();
 const [products,setProducts]=useState<Product[]>([]);
 const [access,setAccess]=useState<{role:string;canWrite:boolean}|null>(null);
 const [renaming,setRenaming]=useState<{id:string;title:string}|null>(null);
 const [connected,setConnected]=useState(false),[loading,setLoading]=useState(true);
 const [notice,setNotice]=useState(""),[busy,setBusy]=useState(false);
 const [query,setQuery]=useState(""),[filter,setFilter]=useState<"homey"|"sodfa">(context.project??"homey");
 const [formVisible,setFormVisible]=useState(false);
 const [title,setTitle]=useState(""),[brand,setBrand]=useState<"homey"|"sodfa">("homey");
 const [price,setPrice]=useState(""),[homey,setHomey]=useState(true),[sodfa,setSodfa]=useState(false);
 const [reqId,setReqId]=useState(()=>crypto.randomUUID());
 const [channelPrices,setChannelPrices]=useState<Record<string,string>>({});
 const fetchSeq=useRef(0);
 useEffect(()=>{void load(filter);},[filter]);
 async function token(){
  const {data:{session}}=await supabase.auth.getSession();
  if(!session?.access_token)throw new Error("يلزم تسجيل الدخول بحساب صدفة");
  return session.access_token;
 }
 async function load(scope:"homey"|"sodfa"=filter){
  const seq=++fetchSeq.current;
  setProducts([]);setConnected(false);setAccess(null);
  setLoading(true);
  try{
   const r=await getCompanyWorkspaceData({data:{token:await token(),brand:scope,project:scope,query:""}});
   if(seq!==fetchSeq.current)return;
   setProducts(r.catalog.products.filter(p=>p.brand===scope));setConnected(r.catalog.connected);
   setAccess({role:r.accessRole,canWrite:r.canWriteCatalogDrafts});
   if(!r.catalog.connected)setNotice(r.catalog.error??"تعذر ربط فهرس المنتجات");
  }catch(e){if(seq===fetchSeq.current)setNotice(e instanceof Error?e.message:"تعذر تحميل المنتجات");}
  finally{if(seq===fetchSeq.current)setLoading(false)}
 }
 async function rename(product:Product){
  if(!renaming||!access?.canWrite)return;
  setBusy(true);setNotice("");
  try{
   const saved=await renameCompanyProductDraft({data:{token:await token(),brand:filter,productId:product.id,title:renaming.title}});
   setProducts(rows=>rows.map(row=>row.source===product.source&&row.id===product.id?{...row,title:saved.title}:row));
   setRenaming(null);
   setNotice("تم تعديل اسم المنتج في كتالوج CRM.");
  }catch(e){setNotice("تعذّر تعديل اسم المنتج: "+(e instanceof Error?e.message:"خطأ"));}
  finally{setBusy(false);}
 }
 async function save(product:Product,channel:"homey_web"|"sodfa_web",visible:boolean,preserveVisibility=false){
  if(!access?.canWrite)return;
  setBusy(true);setNotice("");
  try{
   await saveChannelDraft({data:{
    token:await token(),source:product.source as "homey_store"|"sodfa_dashboard"|"crm_manual",
    sourceProductId:product.id,channel,intendedVisibility:visible,preserveVisibility,
    price:channelPrices[product.source+":"+product.id+":"+channel]===undefined
      ?(channel==="homey_web"?(product.homey_draft===null?product.min_sale_price_egp:product.homey_price):(product.sodfa_draft===null?product.min_sale_price_egp:product.sodfa_price))
      :channelPrices[product.source+":"+product.id+":"+channel]===""?null:Number(channelPrices[product.source+":"+product.id+":"+channel]),
   }});
   setNotice("اتحفظ قرار القناة كمسودة في CRM، وما تغيّرش أي موقع خارجي");
   const key=product.source+":"+product.id+":"+channel;
   setChannelPrices(values=>{const next={...values};delete next[key];return next;});
   await load();
  }catch(e){setNotice("فشل حفظ المسودة: "+(e instanceof Error?e.message:"خطأ"))}
  finally{setBusy(false)}
 }
 async function submit(e:FormEvent){
  e.preventDefault();if(!title.trim()||!access?.canWrite)return;
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
 const filtered=products.filter(p=>p.brand===filter&&p.title.toLowerCase().includes(query.toLowerCase()));
 return <AppShell title="المنتجات وقنوات البيع">
 <div dir="rtl" style={{fontFamily:"Cairo,sans-serif",color:"white",padding:"10px 0 50px"}}>
  <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"center",flexWrap:"wrap"}}>
   <div><Link to="/control-center" search={{project:context.workspace??filter,section:"products"}} style={{color:ui.violet,fontSize:12}}>مركز الشركة / رجوع</Link>
    <h1 style={{fontWeight:900,fontSize:26,margin:"8px 0"}}>إدارة منتجات {filter==="homey"?"هومي":"صدفة"}</h1>
    <p style={{fontSize:12,color:"#aaa"}}>المنتجات من المصادر الفعلية، وقرارات العرض محفوظة كمسودات منفصلة لكل متجر</p></div>
   <div style={{display:"flex",gap:10}}>
    <button onClick={()=>void load()} disabled={loading} style={btn}><RefreshCcw size={14} style={{display:"inline",marginLeft:6}}/>تحديث</button>
    <button type="button" disabled={!access?.canWrite||busy} onClick={()=>{
      setBrand(filter);setHomey(filter==="homey");setSodfa(filter==="sodfa");setFormVisible(!formVisible);
    }} style={btn}><Plus size={14} style={{display:"inline",marginLeft:6}}/>إضافة منتج</button>
   </div>
  </div>
  <div style={{...box,margin:"16px 0",color:"#e5c3f2",fontSize:12}}>
   <Lock size={15} style={{display:"inline",marginLeft:8}}/>
   الحفظ والتعديل هنا في قاعدة CRM المستقلة، وليس نشرًا مباشرًا للعميل. لا توجد بيانات شراء أو موردين في واجهة المواقع العامة.
  </div>
  {access&&!access.canWrite&&<div role="status" style={{...box,marginBottom:14}}>
   {access.role==="viewer"?"صلاحيتك على البراند ده مشاهدة فقط. اطلب من مدير الحساب صلاحية مُشغّل من الصلاحيات والربط.":"اتصال الكتابة لكتالوج CRM غير مهيأ في البيئة دي."}
   <Link to="/control-center-security" className="ms-2 text-purple-200 underline">الصلاحيات والربط</Link>
  </div>}
  {notice&&<div role="status" style={{...box,marginBottom:14,color:"#ebcaed"}}>{notice}</div>}
  {formVisible&&access?.canWrite&&<form onSubmit={e=>void submit(e)} style={{...box,display:"grid",gap:12,marginBottom:16}}>
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
   <select aria-label="تصفية البراند" value={filter} onChange={e=>{setQuery("");setFormVisible(false);setRenaming(null);setFilter(e.target.value as "homey"|"sodfa")}} style={input}>
    <option value="homey">منتجات هومي فقط</option><option value="sodfa">منتجات صدفة فقط</option>
   </select>
   <span style={{color:"#aaa",fontSize:12}}>{loading?"جاري التحميل":connected?filtered.length+" منتج":"فشل الاتصال"}</span>
  </div>
  <div style={{...box,overflowX:"auto"}}>
   <table style={{minWidth:850,width:"100%",borderCollapse:"collapse",fontSize:12}}>
    <thead><tr style={{color:ui.violet,borderBottom:"1px solid "+ui.border}}>
     {["المنتج","البراند","سعر المصدر","المخزون","حالة المصدر","مسودة هومي","مسودة صدفة"].map(x=><th key={x} style={{padding:11,textAlign:"right"}}>{x}</th>)}
    </tr></thead>
    <tbody>{filtered.map(p=><tr key={p.source+p.id} style={{borderBottom:"1px solid "+ui.border}}>
     <td style={{padding:11}}><strong>{p.title}</strong>
       {p.source==="crm_manual"&&access?.canWrite&&(
        renaming?.id===p.id?<form onSubmit={event=>{event.preventDefault();void rename(p);}} className="mt-2 grid gap-2">
         <input aria-label="اسم المنتج الجديد" required minLength={3} maxLength={240} value={renaming.title}
          onChange={event=>setRenaming({id:p.id,title:event.target.value})} style={input}/>
         <button type="submit" disabled={busy}>حفظ الاسم</button>
         <button type="button" disabled={busy} onClick={()=>setRenaming(null)}>إلغاء</button>
        </form>:<button type="button" className="ms-2 text-purple-200 underline" disabled={busy}
          onClick={()=>setRenaming({id:p.id,title:p.title})}>تعديل الاسم</button>
       )}{p.source==="sodfa_dashboard"&&<Link to="/sales" search={{product:p.id}} className="block text-purple-200 underline">ابحث عنه في شاشة البيع</Link>}<div style={{fontSize:10,color:"#999"}}>{p.source}</div></td>
     <td>{p.brand==="homey"?"هومي":"صدفة"}</td>
     <td>{p.min_sale_price_egp==null?"—":Number(p.min_sale_price_egp).toLocaleString("en-US")+" ج.م"}</td>
     <td>{p.available_units==null?"—":Number(p.available_units).toLocaleString("en-US")}</td>
     <td style={{color:"#d8b8e2"}}>{p.source_status??"غير متاح"}</td>
     {(["homey_web","sodfa_web"] as const).map(channel=>{
      const x=channel==="homey_web"?p.homey_draft:p.sodfa_draft;
      const key=p.source+":"+p.id+":"+channel;
      const price=channel==="homey_web"?p.homey_price:p.sodfa_price;
      const crossBrand=(p.brand==="homey")!==(channel==="homey_web");
      const canEdit=Boolean(access?.canWrite&&(!crossBrand||access.role==="admin"||access.role==="manager"));
      return <td key={channel}><span style={{color:x===null?"#cdbf9b":x?"#8ee1b5":"#c6a8ee"}}>{x===null?"غير محدد":x?"عرض مقترح":"إخفاء مقترح"}</span>
       <label style={{display:"block",fontSize:10,color:"#bbb",marginTop:6}}>السعر المقترح
        <input aria-label={"سعر "+channel+" "+p.title} type="number" min="0" step="0.01"
         value={channelPrices[key]??String((x===null?p.min_sale_price_egp:price)??"")}
         disabled={!canEdit||busy}
         onChange={e=>setChannelPrices(v=>({...v,[key]:e.target.value}))}
         style={{...input,width:110,padding:6,fontSize:11,display:"block"}}/>
       </label>
       <div style={{display:"flex",gap:5,marginTop:5}}>
        <button disabled={!canEdit||busy} type="button" onClick={()=>void save(p,channel,true)} style={{...btn,padding:"5px 9px",fontSize:10}}>عرض</button>
        <button disabled={!canEdit||busy} type="button" onClick={()=>void save(p,channel,false)} style={{...btn,padding:"5px 9px",fontSize:10,background:"#29252e"}}>إخفاء</button>
        <button disabled={!canEdit||busy||x===null||channelPrices[key]===undefined} type="button"
          onClick={()=>{if(x!==null)void save(p,channel,x,true);}} style={{...btn,padding:"5px 9px",fontSize:10}}>حفظ السعر</button>
       </div>
       {x===null&&canEdit&&<small>اختار عرض أو إخفاء لحفظ أول مسودة.</small>}
       </td>
     })}
    </tr>)}</tbody>
   </table>
   {connected&&!loading&&!filtered.length&&<p>لا توجد نتائج مطابقة</p>}
  </div>
  <p style={{fontSize:11,color:"#999",marginTop:12}}>المخزون والأسعار نُقلت من مصادرها وقت المزامنة؛ وليست بيانات لحظية. بعض منتجات صدفة ليست لها سجلات مخزون مرتبطة في عرض الويب.</p>
 </div></AppShell>
}
