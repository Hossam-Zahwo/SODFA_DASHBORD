import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/lib/supabase";
import { getCompanyWorkspaceData } from "@/lib/company-workspace.functions";
import { saveChannelDraft } from "@/lib/company-channel-drafts.functions";
import {
  Activity, Boxes, Bot, Building2, ChartNoAxesCombined, ClipboardList,
  Database, ExternalLink, LockKeyhole, Package, RefreshCw, Search,
  ShieldCheck, ShoppingCart, Truck, Users, Warehouse, FileDown,
  AlertTriangle, Store, CircleCheck, ArrowLeftRight,
} from "lucide-react";

export const Route = createFileRoute("/control-center")({ component: ControlCenter });
type Project = "all" | "homey" | "sodfa" | "sodfa_web" | "orders";
type Tab = "dashboard" | "products" | "orders" | "shipping" | "customers" | "finance" | "settings";
type Bridge = Awaited<ReturnType<typeof getCompanyWorkspaceData>>;
const ui = {
  bg: "#0A0A0C", card: "#111114", border: "#27272A", purple: "#823292",
  light: "#A94FBC", soft: "#2A1530", muted: "#A1A1AA",
};
const projectData: {id: Project; name: string; detail: string; icon: typeof Package}[] = [
  {id:"all",name:"كل الشركة",detail:"التحكم المركزي",icon:Building2},
  {id:"sodfa",name:"صدفة داشبورد",detail:"المخزون والمبيعات والمشتريات",icon:Warehouse},
  {id:"homey",name:"متجر هومي",detail:"منتجات هومي والطلبات",icon:Store},
  {id:"sodfa_web",name:"موقع صدفة",detail:"قناة عرض صدفة للعملاء",icon:Package},
  {id:"orders",name:"إدارة الطلبات",detail:"هومي وصدفة والشحن وتالا",icon:Truck},
];
const tabData: {id:Tab;name:string;icon:typeof Package}[] = [
  {id:"dashboard",name:"لوحة الأداء",icon:Activity},
  {id:"products",name:"المنتجات",icon:Boxes},
  {id:"orders",name:"الأوردرات",icon:ShoppingCart},
  {id:"shipping",name:"الشحن والتحصيل",icon:Truck},
  {id:"customers",name:"العملاء",icon:Users},
  {id:"finance",name:"المالية",icon:ChartNoAxesCombined},
  {id:"settings",name:"الصلاحيات والربط",icon:ShieldCheck},
];
const fmt=(n:number|string)=>Number(n||0).toLocaleString("en-US");
const panel = {background:ui.card,border:"1px solid "+ui.border,borderRadius:16,padding:20} as const;
function Metric({title,value,sub,icon:Icon}:{title:string;value:string|number;sub?:string;icon:typeof Package}){
  return <div style={panel}><div style={{display:"flex",justifyContent:"space-between",gap:10,color:ui.muted,fontSize:12}}><span>{title}</span><Icon size={18} color={ui.light}/></div><div style={{fontSize:25,fontWeight:900,marginTop:12}}>{value}</div>{sub&&<div style={{fontSize:11,color:ui.muted,marginTop:4}}>{sub}</div>}</div>;
}
function Tag({children,tone="purple"}:{children:React.ReactNode;tone?:"purple"|"green"|"amber"}){
 const color=tone==="green"?"#8ee1b5":tone==="amber"?"#f2c780":"#dab2f3";
 return <span style={{display:"inline-block",color,background:tone==="green"?"#163529":tone==="amber"?"#382a16":ui.soft,borderRadius:8,padding:"3px 9px",fontSize:11}}>{children}</span>;
}
function ControlCenter(){
  const [project,setProject]=useState<Project>("all");
  const [tab,setTab]=useState<Tab>("dashboard");
  const [search,setSearch]=useState("");
  const [bridge,setBridge]=useState<Bridge|null>(null);
  const [loading,setLoading]=useState(true);
  const [loadError,setLoadError]=useState("");
  const [lastRefresh,setLastRefresh]=useState("");
  const [selectedOrderId,setSelectedOrderId]=useState("");
  const [draftBusy,setDraftBusy]=useState("");
  const [draftMessage,setDraftMessage]=useState("");
  const fetchSequence=useRef(0);
  useEffect(()=>{void refresh(project);},[project]);
  async function refresh(scope:Project=project){
    const sequence=++fetchSequence.current;
    setBridge(null);
    setLoading(true);setLoadError("");
    try {
      const {data:{session}}=await supabase.auth.getSession();
      if(!session?.access_token) throw new Error("سجل دخولك بحساب صدفة لإتاحة لوحة المشاريع");
      const next=await getCompanyWorkspaceData({data:{token:session.access_token,brand:scope==="homey"?"homey":scope==="sodfa"||scope==="sodfa_web"?"sodfa":"all",project:scope,query:""}});
      if(sequence!==fetchSequence.current)return;
      setBridge(next);setLastRefresh(new Date(next.fetchedAt).toLocaleString("en-GB"));
    }catch(e){if(sequence===fetchSequence.current){setLoadError(e instanceof Error?e.message:"فشل قراءة بيانات الربط");setBridge(null)}}
    finally{if(sequence===fetchSequence.current)setLoading(false)}
  }
  async function updateDraft(product:NonNullable<Bridge>["catalog"]["products"][number], visible:boolean){
    const source=product.source==="homey_store"?"homey_store":product.source==="sodfa_dashboard"?"sodfa_dashboard":null;
    if(!source){setDraftMessage("هذا المنتج مصدره غير مدعوم حالياً");return;}
    setDraftBusy(product.id);setDraftMessage("");
    try {
      const {data:{session}}=await supabase.auth.getSession();
      if(!session?.access_token) throw new Error("سجّل دخولك أولاً");
      await saveChannelDraft({data:{
        token:session.access_token,source,sourceProductId:product.id,
        channel:source==="homey_store"?"homey_web":"sodfa_web",
        intendedVisibility:visible,price:product.draft_price??null
      }});
      setDraftMessage("تم حفظ إعداد العرض كمسودة داخل الـCRM، ولم يتم تغيير أي موقع خارجي");
      await refresh(project);
    }catch(e){setDraftMessage("فشل حفظ المسودة: "+(e instanceof Error?e.message:"خطأ غير معروف"))}
    finally {setDraftBusy("")}
  }
  const selectProject=(id:Project)=>{setSelectedOrderId("");setProject(id);setTab("dashboard");setSearch("");setDraftMessage("")};
  const chosen=projectData.find(p=>p.id===project)!;
  const selectedBrand=project==="homey"?"homey":project==="sodfa"||project==="sodfa_web"?"sodfa":"all";
  const statuses=bridge?.operations.summary.filter(x=>selectedBrand==="all"||x.brand===selectedBrand)??[];
  const orderTotal=statuses.reduce((a,b)=>a+Number(b.count),0);
  const shipped=statuses.filter(x=>/deliver|shipping|shipped|transit|تم التسليم|قيد الشحن/i.test(x.status)).reduce((a,b)=>a+Number(b.count),0);
  const activeProductRefs=bridge?.catalog.counts.filter(x=>selectedBrand==="all"||x.brand===selectedBrand).reduce((a,b)=>a+Number(b.count),0)??0;
  const customers=bridge?.operations.customers.filter(x=>selectedBrand==="all"||x.brand===selectedBrand).reduce((a,b)=>a+Number(b.count),0)??0;
  const rowProducts=bridge?.catalog.products.filter(x=>(selectedBrand==="all"||x.brand===selectedBrand)&&x.title.toLowerCase().includes(search.toLowerCase()))??[];
  const rowOrders=bridge?.operations.orders.filter(x=>(selectedBrand==="all"||x.brand===selectedBrand)&&x.id.toLowerCase().includes(search.toLowerCase()))??[];
  const selectedOrder=bridge?.operations.orders.find(o=>o.id===selectedOrderId && (selectedBrand==="all"||o.brand===selectedBrand));
  const inventory=bridge?.sodfa.items??[];
  const sodfaTotalSales=Number(bridge?.sodfa.salesSummary?.sales_egp??0);
  const canSeeSodfaStock=project==="sodfa"||project==="all";
  const sodfaInventoryValue=Number(bridge?.sodfa.inventorySummary?.cost_value??0);
  const stockMissing=(bridge?.catalog.products??[]).filter(x=>x.source==="sodfa_dashboard"&&x.available_units===null).length;
  const snapshotDate=bridge?.catalog.products.reduce<string|null>((last,p)=>p.source_refreshed_at&&(!last||p.source_refreshed_at>last)?p.source_refreshed_at:last,null)??null;
  const allowedTabs=project==="orders"?tabData.filter(t=>["dashboard","orders","shipping","customers","settings"].includes(t.id)):
    project==="sodfa_web"?tabData.filter(t=>["dashboard","products","settings"].includes(t.id)):
    project==="homey"?tabData.filter(t=>t.id!=="finance"):
    tabData;
  const channelNotice=project==="sodfa_web"?"قائمة صدفة المعروضة هنا فهرس مخزون صدفة وليس تأكيدًا بأنها منشورة حاليًا في الموقع. ربط النشر الفعلي ما زال مطلوبًا.":project==="homey"?"منتجات هومي من الفهرس المركزي المستورد. حالة نشر كل منتج وأسعاره الحية لم تتم مزامنتها بعد.":"كل قناة لها صلاحيات نشر مستقلة، ويمكن حفظ اقتراحات العرض والإخفاء في قاعدة CRM المستقلة كمسودات؛ نشرها فعليًا على المتاجر لم يُفعّل بعد.";
  function downloadCsv(){
    const rows=tab==="products"?[["Source ID","Brand","Name","Source"],...rowProducts.map(p=>[p.id,p.brand,p.title,p.source])]:[["Order ID","Brand","Status","Created","Carrier"],...rowOrders.map(o=>[o.id,o.brand,o.status,o.created_at,o.shipping_company??""])];
    const text="\ufeff"+rows.map(row=>row.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(",")).join("\r\n");
    const url=URL.createObjectURL(new Blob([text],{type:"text/csv;charset=utf-8"}));
    const a=document.createElement("a");a.href=url;a.download="sodfa-company-"+tab+"-"+new Date().toISOString().slice(0,10)+".csv";a.click();
    URL.revokeObjectURL(url);
  }
  return <AppShell title="مركز تحكم الشركة">
  <div dir="rtl" style={{fontFamily:"Cairo, sans-serif",color:"#fff",maxWidth:1550,margin:"0 auto",padding:"10px 0 50px"}}>
    <div style={{display:"flex",alignItems:"start",justifyContent:"space-between",gap:14,flexWrap:"wrap"}}>
      <div><div style={{fontSize:12,color:ui.light,fontWeight:700}}>SODFA · COMPANY OPERATIONS</div><h1 style={{fontSize:27,fontWeight:900,margin:"5px 0"}}>مركز إدارة الشركة</h1><div style={{fontSize:12,color:ui.muted}}>لوحات داخلية مخصصة للمشاريع، بنفس ألوان صدفة الأصلي</div></div>
      <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}><Tag tone="amber"><LockKeyhole size={12} style={{display:"inline",marginLeft:5}}/>Preview · قراءة فقط</Tag><button onClick={()=>void refresh(project)} disabled={loading} style={{background:ui.soft,border:"1px solid "+ui.purple,padding:"9px 14px",borderRadius:10,color:"white",cursor:"pointer",display:"flex",gap:8,alignItems:"center"}}><RefreshCw size={15}/>{loading?"جاري التحديث":"تحديث البيانات"}</button></div>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:10,margin:"23px 0 15px"}}>
      {projectData.map(p=><button key={p.id} type="button" onClick={()=>selectProject(p.id)} style={{...panel,textAlign:"right",cursor:"pointer",background:p.id===project?ui.soft:ui.card,border:"1px solid "+(p.id===project?ui.purple:ui.border)}}><div style={{display:"flex",alignItems:"center",gap:10}}><p.icon size={23} color={p.id===project?"#dda9f4":ui.light}/><strong style={{fontSize:13}}>{p.name}</strong></div><div style={{fontSize:11,color:ui.muted,marginTop:8}}>{p.detail}</div></button>)}
    </div>
    <div style={{...panel,padding:14,marginBottom:14}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12}}>
        <div><strong style={{fontSize:18}}>{chosen.name}</strong><div style={{fontSize:11,color:ui.muted}}>{chosen.detail} · الإدارة الداخلية للمشروع</div></div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>{(project==="all"||project==="homey"||project==="sodfa"||project==="orders")&&<Tag tone={bridge?.operations.connected?"green":"amber"}>طلبات المشروع: {bridge?.operations.connected?"متصلة":"غير متصلة"}</Tag>}
          {(project==="all"||project==="homey"||project==="sodfa")&&<Tag tone={bridge?.catalog.connected?"green":"amber"}>منتجات المشروع: {bridge?.catalog.connected?"متصلة":"غير متصلة"}</Tag>}
          {(project==="all"||project==="sodfa")&&<Tag tone={bridge?.sodfa.connected?"green":"amber"}>مخزون صدفة: {bridge?.sodfa.connected?"متصل":"غير متصل"}</Tag>}</div>
      </div>
    </div>
    <div style={{display:"flex",gap:8,overflowX:"auto",marginBottom:17,paddingBottom:4}}>
      {allowedTabs.map(t=><button type="button" key={t.id} onClick={()=>{setTab(t.id);setSearch("")}} style={{display:"inline-flex",alignItems:"center",gap:7,whiteSpace:"nowrap",padding:"10px 14px",borderRadius:10,border:"1px solid "+(t.id===tab?ui.purple:ui.border),background:t.id===tab?ui.purple:ui.card,color:t.id===tab?"#fff":ui.muted,cursor:"pointer",fontSize:12}}><t.icon size={15}/>{t.name}</button>)}
    </div>
    {project!=="orders"&&project!=="sodfa_web"&&bridge?.catalog.error&&<div role="alert" style={{...panel,marginBottom:12,border:"1px solid #985e38"}}>فهرس المنتجات: {bridge.catalog.error}</div>}
    {project!=="sodfa_web"&&bridge?.operations.error&&<div role="alert" style={{...panel,marginBottom:12,border:"1px solid #985e38"}}>بيانات الطلبات والشحن: {bridge.operations.error}</div>}
    {(project==="all"||project==="sodfa")&&bridge?.sodfa.error&&<div role="alert" style={{...panel,marginBottom:12,border:"1px solid #985e38"}}>صدفة: {bridge.sodfa.error}</div>}
    {project==="sodfa_web"&&<div role="status" style={{...panel,marginBottom:12,border:"1px solid #985e38"}}>
      قاعدة SODFA Web الأصلية غير نشطة حالياً؛ المخزون المعروض هنا ليس دليلاً على نشر المنتجات في الموقع.
      بيانات القناة المنشورة غير متاحة لحين استرجاع قاعدة المتجر أو تهيئة مصدر منشور بديل معتمد.
    </div>}
    {loadError&&<div style={{...panel,border:"1px solid #8f5151",marginBottom:14}}><AlertTriangle size={17} style={{display:"inline",marginLeft:8}}/>تعذر جلب بيانات الربط: {loadError}. بيانات صدفة المحلية قد تظل متاحة.</div>}
    {tab==="dashboard"&&<>
      <div style={{...panel,marginBottom:14,fontSize:12,lineHeight:2}}>
        <b>حالة بيانات {chosen.name}:</b>
        {project==="sodfa_web"?"قاعدة بيانات المتجر الأصلي غير نشطة؛ لا يوجد كتالوج منشور مؤكد للعرض.":<>
          {(project==="all"||project==="homey"||project==="sodfa")&&<>المنتجات: {bridge?.catalog.connected?"متصلة":"غير متصلة"}. </>}
          {(project==="all"||project==="homey"||project==="sodfa"||project==="orders")&&<>الطلبات: {bridge?.operations.connected?"متصلة":"غير متصلة"}. </>}
          {(project==="all"||project==="sodfa")&&<>المخزون: {bridge?.sodfa.connected?"متصل":"غير متصل"}. </>}
        </>}
        {snapshotDate&&<> آخر تحديث لبيانات المنتجات المخزنة: {new Date(snapshotDate).toLocaleString("ar-EG")}.</>}
        {stockMissing>0&&<> يوجد {stockMissing.toLocaleString("en-US")} سجل صدفة في الصفحة الحالية بدون رصيد معروف؛ لم نعتبرهم صفر.</>}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))",gap:12,marginBottom:13}}>
        {project!=="orders"&&project!=="sodfa_web"&&<Metric title="فهرس المنتجات" value={bridge?.catalog.connected?fmt(activeProductRefs):"غير متاح"} icon={Package} sub="سجلات مرجعية، ليست كل المنتجات المنشورة"/>}
        {project!=="sodfa_web"&&<Metric title="الأوردرات المسجلة" value={bridge?.operations.connected?fmt(orderTotal):"غير متاح"} icon={ShoppingCart} sub="الموجودة في قاعدة Orders Manager"/>}
        {project!=="sodfa_web"&&<Metric title="العملاء المسجلون" value={bridge?.operations.connected?fmt(customers):"غير متاح"} icon={Users} sub="أعداد فقط بدون بيانات شخصية"/>}
        {project!=="sodfa_web"&&<Metric title="طلبات بتصنيفات شحن/تسليم" value={bridge?.operations.connected?fmt(shipped):"غير متاح"} icon={Truck} sub="وفق الحالات الأصلية المسجلة"/>}
        {canSeeSodfaStock&&<Metric title="أصناف مخزون صدفة" value={bridge?.sodfa.connected?fmt(bridge.sodfa.inventorySummary?.sku_rows??0):"غير متاح"} icon={Boxes} sub="صفوف عرض المخزون في Neon، لا تشمل بالضرورة كل المستودعات"/>}
        {canSeeSodfaStock&&<Metric title="مبيعات صدفة (السجل الحالي)" value={bridge?.sodfa.connected?fmt(sodfaTotalSales)+" ج.م":"غير متاح"} icon={ChartNoAxesCombined} sub="بناءً على سجلات المبيعات في صدفة، دون دمج مع طلبات OMS"/>}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))",gap:13}}>
        {project!=="sodfa_web"&&<div style={panel}><h2 style={{fontSize:17}}>ملخص الطلبات حسب الحالة</h2>{statuses.length?statuses.map(s=><div key={s.brand+s.status} style={{display:"flex",justifyContent:"space-between",borderBottom:"1px solid "+ui.border,padding:"10px 0",fontSize:12}}><span>{s.brand==="homey"?"هومي":"صدفة"} · {s.status}</span><b>{fmt(s.count)}</b></div>):<p style={{fontSize:12,color:ui.muted}}>لا توجد بيانات متاحة</p>}<button onClick={()=>setTab("orders")} style={{marginTop:16,color:"#eacafa",background:"transparent",border:0,cursor:"pointer"}}>فتح إدارة الأوردرات داخل المركز ←</button></div>}
        <div style={panel}><h2 style={{fontSize:17}}>أقسام المشروع</h2><div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:9}}>{allowedTabs.filter(x=>x.id!=="dashboard").map(x=><button key={x.id} onClick={()=>setTab(x.id)} style={{padding:12,display:"flex",gap:8,alignItems:"center",textAlign:"right",background:"#0A0A0C",border:"1px solid "+ui.border,color:"white",borderRadius:10,cursor:"pointer",fontSize:12}}><x.icon size={17} color={ui.light}/>{x.name}</button>)}</div><p style={{color:ui.muted,fontSize:11,lineHeight:2}}>موقع هومي وموقع صدفة الخارجيان لم يتم تغيير واجهاتهما. التحكم في النشر والأسعار والتعديل لا يزال معطلًا حتى تجهيز الصلاحيات وواجهات الكتابة الآمنة.</p></div>
      </div>
    </>}
    {tab==="products"&&project==="sodfa_web"&&<div style={panel}><h2>منتجات موقع صدفة</h2><p>قاعدة المتجر الأصلية غير نشطة؛ لا يمكن عرض كتالوج منشور مؤكد. لم نخلط منتجات مخزون صدفة بالمنتجات المنشورة على الموقع.</p></div>}
    {((tab==="products"&&project!=="sodfa_web")||tab==="orders")&&<div style={panel}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:15,flexWrap:"wrap"}}>
        <div><h2 style={{margin:0,fontSize:19}}>{tab==="products"?"منتجات "+chosen.name:"أوردرات "+chosen.name}</h2><p style={{color:ui.muted,fontSize:12}}>{tab==="products"?channelNotice:"طلبات حقيقية من قاعدة إدارة الطلبات، بدون بيانات العملاء الشخصية في هذه المرحلة."}</p></div>
        <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
        <div style={{display:"flex",alignItems:"center",gap:5,background:"#08080A",border:"1px solid #39333c",padding:"4px 9px",borderRadius:10}}><Search size={15} color={ui.muted}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder={tab==="products"?"ابحث عن منتج":"ابحث برقم الطلب"} style={{background:"transparent",color:"white",padding:8,outline:0,border:0,fontSize:12}}/></div>
        <button onClick={downloadCsv} style={{background:ui.soft,color:"#fff",border:"1px solid "+ui.purple,padding:"10px 13px",borderRadius:10,cursor:"pointer",fontSize:12}}><FileDown size={14} style={{display:"inline",marginLeft:6}}/>تصدير CSV</button>
        </div>
      </div>
      {tab==="orders"&&<div style={{display:"flex",gap:10,alignItems:"center",marginBottom:12}}><Link to="/control-center-orders" style={{border:"1px solid #823292",background:"#642472",borderRadius:10,padding:"11px 16px",color:"white",fontSize:13,fontWeight:800}}>فتح نموذج إضافة وتأكيد الطلبات داخل المركز — اختبار معزول</Link></div>}
      {tab==="products"&&project!=="sodfa_web"&&<div style={{display:"flex",gap:10,alignItems:"center",marginBottom:12}}><Link to="/control-center-products" style={{border:"1px solid #823292",background:"#642472",borderRadius:10,padding:"11px 16px",color:"white",fontSize:13,fontWeight:800}}>فتح إدارة المنتجات الكاملة: السعر والمخزون وإضافة منتج واختيار الموقعين</Link></div>}
      {draftMessage&&<div role="status" style={{padding:10,marginTop:10,background:ui.soft,borderRadius:8,fontSize:12}}>{draftMessage}</div>}
      <div style={{overflowX:"auto",marginTop:18}}>
      {tab==="products"?<table style={{width:"100%",minWidth:650,borderCollapse:"collapse",fontSize:12}}><thead><tr style={{color:ui.light,borderBottom:"1px solid "+ui.border}}>{["المنتج","المشروع","المصدر","إعدادات العرض المقترحة (مسودة)"].map(h=><th key={h} style={{textAlign:"right",padding:12}}>{h}</th>)}</tr></thead><tbody>{rowProducts.map(p=><tr key={p.source+p.id} style={{borderBottom:"1px solid "+ui.border}}><td style={{padding:12}}>{p.title}</td><td>{p.brand==="homey"?"هومي":"صدفة"}</td><td>{p.source}</td><td><div style={{display:"flex",alignItems:"center",flexWrap:"wrap",gap:8}}>
        <Tag tone={p.draft_visibility===null?"amber":"purple"}>{p.draft_visibility===null?"لم تُحدد":p.draft_visibility?"مقترح للعرض":"مقترح للإخفاء"}</Tag>
        <button type="button" disabled={Boolean(draftBusy)} onClick={()=>void updateDraft(p,true)}
          style={{border:"1px solid "+ui.purple,borderRadius:8,background:ui.soft,color:"white",padding:"6px 9px",cursor:"pointer",fontSize:11}}>اقتراح عرض</button>
        <button type="button" disabled={Boolean(draftBusy)} onClick={()=>void updateDraft(p,false)}
          style={{border:"1px solid "+ui.border,borderRadius:8,background:"#111114",color:"white",padding:"6px 9px",cursor:"pointer",fontSize:11}}>اقتراح إخفاء</button>
      </div></td></tr>)}</tbody></table>:<table style={{width:"100%",minWidth:700,borderCollapse:"collapse",fontSize:12}}><thead><tr style={{color:ui.light,borderBottom:"1px solid "+ui.border}}>{["رقم الطلب","البراند","العميل","الإجمالي","تاريخ التسجيل","حالة الطلب","شركة الشحن","تفاصيل"].map(h=><th key={h} style={{textAlign:"right",padding:12}}>{h}</th>)}</tr></thead><tbody>{rowOrders.map(o=><tr key={o.id} style={{borderBottom:"1px solid "+ui.border}}><td style={{padding:12,fontFamily:"monospace"}}>{o.id.slice(0,12)}</td><td>{o.brand==="homey"?"هومي":"صدفة"}</td><td>{o.customer_name}</td><td>{fmt(o.manual_total??((o.items??[]).reduce((a,i)=>a+Number(i.quantity||0)*Number(i.price||0),0)+Number(o.shipping||0)-Number(o.discount||0)))} ج.م</td><td>{o.created_at?.slice(0,10)??"—"}</td><td><Tag>{o.status}</Tag></td><td>{o.shipping_company??"غير محدد"}</td><td><button type="button" onClick={()=>setSelectedOrderId(o.id)} style={{border:"1px solid "+ui.purple,color:"white",background:ui.soft,padding:"6px 10px",borderRadius:8,cursor:"pointer"}}>تفاصيل الطلب</button></td></tr>)}</tbody></table>}
      </div>
      {tab==="orders"&&selectedOrder&&<div style={{...panel,marginTop:18,background:"#1b1420",border:"1px solid "+ui.purple}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10}}>
          <h3 style={{margin:0}}>تفاصيل الطلب: {selectedOrder.id.slice(0,12)}</h3>
          <button type="button" onClick={()=>setSelectedOrderId("")} style={{background:ui.card,color:"white",border:"1px solid "+ui.border,borderRadius:8,padding:"6px 10px",cursor:"pointer"}}>إغلاق</button>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))",gap:14,marginTop:16,fontSize:12}}>
          <div><span style={{color:ui.muted}}>العميل</span><div>{selectedOrder.customer_name}</div></div>
          <div><span style={{color:ui.muted}}>رقم الهاتف</span><div dir="ltr" style={{textAlign:"right"}}>{selectedOrder.phone}</div></div>
          <div><span style={{color:ui.muted}}>المحافظة والمدينة</span><div>{selectedOrder.governorate??"—"} · {selectedOrder.city??"—"}</div></div>
          <div><span style={{color:ui.muted}}>العنوان</span><div>{selectedOrder.address??"—"}</div></div>
          <div><span style={{color:ui.muted}}>حالة الطلب</span><div>{selectedOrder.status}</div></div>
          <div><span style={{color:ui.muted}}>شركة الشحن</span><div>{selectedOrder.shipping_company??"غير محدد"}</div></div>
          <div><span style={{color:ui.muted}}>طريقة الدفع</span><div>{selectedOrder.payment_method??"غير محدد"}</div></div>
          <div><span style={{color:ui.muted}}>المصدر</span><div>{selectedOrder.source??"—"} · {selectedOrder.source_order_id?"مرتبط بأصل الطلب":"غير مرتبط بمعرّف الطلب الأصلي"}</div></div>
          <div><span style={{color:ui.muted}}>المدفوع مقدمًا</span><div>{fmt(selectedOrder.prepaid??0)} ج.م</div></div>
          <div><span style={{color:ui.muted}}>المستلم من الشحن</span><div>{selectedOrder.carrier_received==null?"غير مسجل":fmt(selectedOrder.carrier_received)+" ج.م"}</div></div>
        </div>
        <h4 style={{margin:"18px 0 6px"}}>الأصناف داخل الطلب</h4>
        {(selectedOrder.items??[]).map((item,i)=><div key={i} style={{display:"flex",justifyContent:"space-between",gap:10,padding:"8px 0",borderBottom:"1px solid "+ui.border,fontSize:12}}>
          <span>{item.name} × {fmt(item.quantity)}</span><span>{fmt(Number(item.price||0)*Number(item.quantity||0))} ج.م</span>
        </div>)}
        <p style={{fontSize:11,color:ui.muted,marginTop:12}}>البيانات دي للمدير المسجل فقط. تحديث حالة الطلب والتحصيل والشحن لسه لازم يمر من API مدير الطلبات الأصلي.</p>
      </div>}
      {!loading&&((tab==="products"&&!rowProducts.length)||(tab==="orders"&&!rowOrders.length))&&<p style={{color:ui.muted}}>لا توجد نتائج متاحة للفلاتر الحالية أو أن الاتصال لم يكتمل.</p>}
      <p style={{color:ui.muted,fontSize:11}}>عرض بحد أقصى {tab==="products"?"500 منتج":"500 طلب"}؛ البيانات من مصادرها الحقيقية وصلاحيات الصفحة للمدير.</p>
    </div>}
    {tab==="shipping"&&<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(290px,1fr))",gap:13}}><div style={panel}><h2>حالات الشحن حسب المشروع</h2>{(bridge?.operations.shipments??[]).filter(s=>selectedBrand==="all"||s.brand===selectedBrand).map(s=><div key={s.brand+s.state} style={{display:"flex",justifyContent:"space-between",padding:"11px 0",borderBottom:"1px solid "+ui.border}}><span>{s.brand==="homey"?"هومي":"صدفة"} · {s.state}</span><b>{fmt(s.count)}</b></div>)}{!bridge?.operations.connected&&<p>ربط الشحن غير متاح حاليًا</p>}</div><div style={panel}><h2>إدارة عمليات الشحن</h2><p style={{fontSize:12,lineHeight:2,color:ui.muted}}>ده ملخص مباشر من جداول تالا المسجلة في مدير الطلبات. إنشاء الشحنة، طباعة البوليصة، تحصيل الأموال وتحديث الحالة تحتاج واجهة كتابة آمنة بنفس صلاحيات مدير الطلبات. مش هنشغلها بتعديل مباشر في قاعدة البيانات.</p><Tag tone="amber">الإجراءات مؤجلة لحين التحقق من التفويض</Tag></div></div>}
    {tab==="customers"&&<div style={panel}><h2>عملاء {chosen.name}</h2><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:12,marginBottom:14}}><Metric title="عدد العملاء المسجلين" value={bridge?.operations.connected?fmt(customers):"غير متاح"} icon={Users}/><Metric title="عدد طلبات المشروع" value={bridge?.operations.connected?fmt(orderTotal):"غير متاح"} icon={ShoppingCart}/></div><p style={{color:ui.muted,fontSize:12}}>الدمج الآمن لسجلات العملاء والوصول لأرقام الهاتف وإرسال واتساب يتطلب ربط صلاحيات هومي وصدفة قبل عرض بيانات شخصية داخل المركز.</p></div>}
    {tab==="finance"&&<div style={panel}><h2>تقارير {chosen.name}</h2>{canSeeSodfaStock&&<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:12,marginBottom:14}}><Metric title="قيمة تكلفة مخزون الويب المسجل" value={bridge?.sodfa.connected?fmt(sodfaInventoryValue)+" ج.م":"غير متاح"} icon={Database}/><Metric title="إجمالي قيمة المبيعات بسجل صدفة" value={bridge?.sodfa.connected?fmt(sodfaTotalSales)+" ج.م":"غير متاح"} icon={ChartNoAxesCombined}/></div>}<p style={{color:ui.muted,fontSize:12,lineHeight:2}}>لم يتم دمج المبيعات بالأوردرات ماليًا بعد، حفاظًا على عدم تكرار الإيرادات. صافي الربح والتكلفة والتحصيل النهائي يحتاجون مطابقة سعر البيع التاريخي وتكلفة البضاعة والشحن والمرتجعات.</p></div>}
    {tab==="settings"&&<div style={panel}><h2>الربط والصلاحيات</h2><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:12}}>{[{name:"قاعدة CRM المركزية",ok:bridge?.catalog.connected},{name:"قاعدة إدارة الطلبات",ok:bridge?.operations.connected},{name:"بيانات مخزون صدفة",ok:bridge?.sodfa.connected},{name:"نشر المنتجات على المتاجر",ok:false},{name:"تعديل الطلبات وتالا",ok:false}].map(x=><div key={x.name} style={{padding:15,background:"#0A0A0C",border:"1px solid "+ui.border,borderRadius:12}}><b>{x.name}</b><div style={{marginTop:12}}><Tag tone={x.ok?"green":"amber"}>{x.ok?"متاح للقراءة":"غير مفعّل"}</Tag></div></div>)}</div><p style={{color:ui.muted,fontSize:12,lineHeight:2,marginTop:16}}>كل حساب لا يحصل على صلاحيات الكتابة تلقائيًا. تُمنع بيانات التكلفة والموردين من الوصول لمواقع العملاء. فصل العلامات وقنوات النشر لا يزال قيد تطبيق سياسات الوصول قبل ربط الكتابة.</p></div>}
    <p style={{marginTop:22,color:"#88818e",fontSize:11}}><ShieldCheck size={13} style={{display:"inline",marginLeft:6}}/> نسخة تطوير، وصول مصادق عليه، قراءة فقط، دون تعديل مواقع الإنتاج أو مخازنها. {lastRefresh&&"آخر تحميل "+lastRefresh}</p>
  </div></AppShell>
}
