import { calculateOrderTotal } from "@/lib/inventory-planning";
import { orderStatusLabel, scopedCount } from "@/lib/company-dashboard";
import { companyCsv } from "@/lib/company-csv";
import { CatalogProductPhotos } from "@/components/CatalogProductPhotos";
import { companyLocation, companySections, homeyAdminUrl, orderWaybillUrl, ordersManagerUrl, type CompanyProject as Project, type CompanySection as Tab } from "@/lib/company-navigation";
import { OrderMarginCalculator } from "@/components/OrderMarginCalculator";
import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CompanyInventoryAssistant } from "@/components/CompanyInventoryAssistant";
import { HomeyCategories } from "@/components/HomeyCategories";
import { OrdersManagerPanel } from "@/components/OrdersManagerPanel";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/lib/supabase";
import { getCompanyWorkspaceData } from "@/lib/company-workspace.functions";
import { saveChannelDraft } from "@/lib/company-channel-drafts.functions";
import {
  Activity, Boxes, Building2, ChartNoAxesCombined, ClipboardList,
  Database, ExternalLink, Package, RefreshCw, Search,
  ShieldCheck, ShoppingCart, Truck, Users, Warehouse, FileDown,
  AlertTriangle, Store, Tags,
} from "lucide-react";

export const Route = createFileRoute("/control-center")({ validateSearch: companyLocation, component: ControlCenter });
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
  {id:"store-admin",name:"لوحة تحكم هومي",icon:Store},
  {id:"products",name:"المنتجات",icon:Boxes},
  {id:"categories",name:"الأقسام",icon:Tags},
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
  const location=Route.useSearch();
  const navigate=Route.useNavigate();
  const project=location.project??"all";
  const [search,setSearch]=useState("");
  const [orderStatus,setOrderStatus]=useState("");
  const [loaded,setLoaded]=useState<{project:Project;data:Bridge}|null>(null);
  const bridge=loaded?.project===project?loaded.data:null;
  const availableSections=companySections(project,bridge?.accessRole==="viewer");
  const tab=location.section&&availableSections.includes(location.section)?location.section:"dashboard";
  const [loading,setLoading]=useState(true);
  const [loadError,setLoadError]=useState("");
  const [selectedOrderId,setSelectedOrderId]=useState("");
  const [draftBusy,setDraftBusy]=useState("");
  const [draftMessage,setDraftMessage]=useState("");
  const fetchSequence=useRef(0);
  useEffect(()=>{void refresh(project);},[project]);
  async function refresh(scope:Project=project){
    const sequence=++fetchSequence.current;
    setLoading(true);setLoadError("");
    try {
      const {data:{session}}=await supabase.auth.getSession();
      if(!session?.access_token) throw new Error("سجل دخولك بحساب صدفة لإتاحة لوحة المشاريع");
      const next=await getCompanyWorkspaceData({data:{token:session.access_token,brand:scope==="homey"?"homey":scope==="sodfa"||scope==="sodfa_web"?"sodfa":"all",project:scope,query:""}});
      if(sequence!==fetchSequence.current)return;
      setLoaded({project:scope,data:next});
    }catch(e){if(sequence===fetchSequence.current){setLoadError(e instanceof Error?e.message:"فشل قراءة بيانات الربط");setLoaded(null)}}
    finally{if(sequence===fetchSequence.current)setLoading(false)}
  }
  async function updateDraft(product:NonNullable<Bridge>["catalog"]["products"][number], visible:boolean){
    const source=product.source==="homey_store"?"homey_store":product.source==="sodfa_dashboard"?"sodfa_dashboard":null;
    if(!source){setDraftMessage("هذا المنتج مصدره غير مدعوم حالياً");return;}
    const sequence=fetchSequence.current;
    setDraftBusy(product.id);setDraftMessage("");
    try {
      const {data:{session}}=await supabase.auth.getSession();
      if(!session?.access_token) throw new Error("سجّل دخولك أولاً");
      await saveChannelDraft({data:{
        token:session.access_token,source,sourceProductId:product.id,
        channel:source==="homey_store"?"homey_web":"sodfa_web",
        intendedVisibility:visible,price:product.draft_price??null
      }});
      if(sequence!==fetchSequence.current)return;
      setDraftMessage("تم حفظ إعداد العرض كمسودة داخل الـCRM، ولم يتم تغيير أي موقع خارجي");
      await refresh(project);
    }catch(e){if(sequence===fetchSequence.current)setDraftMessage("فشل حفظ المسودة: "+(e instanceof Error?e.message:"خطأ غير معروف"))}
    finally {setDraftBusy("")}
  }
  function openWorkspace(nextProject:Project,nextSection:Tab){
    setSelectedOrderId("");
    setSearch("");
    setOrderStatus("");
    setDraftMessage("");
    void navigate({search:{project:nextProject,section:nextSection}});
  }
  const setTab=(section:Tab)=>openWorkspace(project,section);
  const selectProject=(next:Project)=>openWorkspace(next,companySections(next).includes(tab)?tab:"dashboard");
  const chosen=projectData.find(p=>p.id===project)!;
  const selectedBrand=project==="homey"?"homey":project==="sodfa"||project==="sodfa_web"?"sodfa":"all";
  const statuses=bridge?.operations.summary.filter(x=>selectedBrand==="all"||x.brand===selectedBrand)??[];
  const orderTotal=scopedCount(bridge?.operations.summary,selectedBrand,bridge?.operations.available.summary);
  const shipped=scopedCount(bridge?.operations.summary,selectedBrand,bridge?.operations.available.summary,
    row=>row.status==="shipped"||row.status==="delivered");
  const activeProductRefs=scopedCount(bridge?.catalog.counts,selectedBrand,bridge?.catalog.countsAvailable);
  const customers=scopedCount(bridge?.operations.customers,selectedBrand,bridge?.operations.available.customers);
  const inventoryRows=bridge?.sodfa.inventorySummary?.sku_rows??null;
  const lastRefresh=bridge?new Intl.DateTimeFormat("ar-EG",{
    dateStyle:"medium",timeStyle:"short",timeZone:"Africa/Cairo",
  }).format(new Date(bridge.fetchedAt)):null;
  const metric=(value:number|null)=>value===null?(loading?"جاري التحميل":"غير متاح"):fmt(value);
  const rowProducts=bridge?.catalog.products.filter(x=>(selectedBrand==="all"||x.brand===selectedBrand)&&x.title.toLowerCase().includes(search.toLowerCase()))??[];
  const orderQuery=search.trim().toLowerCase();
  const orderStatuses=[...new Set((bridge?.operations.orders??[]).map(order=>order.status))].sort();
  const rowOrders=bridge?.operations.orders.filter(order=>
    (selectedBrand==="all"||order.brand===selectedBrand) &&
    (!orderStatus||order.status===orderStatus) &&
    [order.id,order.source_order_id].some(id=>id?.toLowerCase().includes(orderQuery))
  )??[];
  const selectedOrder=bridge?.operations.orders.find(o=>o.id===selectedOrderId && (selectedBrand==="all"||o.brand===selectedBrand));
  const waybillUrl=orderWaybillUrl(selectedOrder?.waybill_id);
  const homeyUrl=project==="homey"?homeyAdminUrl(tab):null;
  const homeyOrdersManagerUrl=import.meta.env["VITE_ORDERS_MANAGER_URL"] ||
    (import.meta.env.DEV?"http://127.0.0.1:3001/orders-manager":undefined);
  const showHomeyOrders=project==="homey"&&tab==="orders"&&homeyOrdersManagerUrl&&bridge&&bridge.accessRole!=="viewer";
  const sodfaTotalSales=bridge?.sodfa.salesSummary?.sales_egp??null;
  const salesPeriod=bridge?.sodfa.salesSummary;
  const salesRange=salesPeriod?.first_date&&salesPeriod.last_date?`من ${salesPeriod.first_date.slice(0,10)} إلى ${salesPeriod.last_date.slice(0,10)}`:null;
  const canSeeSodfaStock=project==="sodfa"||project==="all";
  const sodfaInventoryValue=bridge?.sodfa.inventorySummary?.cost_value==null?null:Number(bridge.sodfa.inventorySummary.cost_value);
  const allowedTabs=availableSections.map(section=>tabData.find(item=>item.id===section)!);
  const orderUrl="/control-center-orders?"+new URLSearchParams({project,...(selectedBrand==="all"?{}:{brand:selectedBrand})});
  const catalogUrl="/control-center-products?"+new URLSearchParams({project:project==="homey"?"homey":"sodfa",workspace:project});
  const channelNotice=project==="sodfa_web"?"قائمة صدفة المعروضة هنا فهرس مخزون صدفة وليس تأكيدًا بأنها منشورة حاليًا في الموقع. ربط النشر الفعلي ما زال مطلوبًا.":project==="homey"?"منتجات هومي من الفهرس المركزي المستورد. حالة نشر كل منتج وأسعاره الحية لم تتم مزامنتها بعد.":"كل قناة لها صلاحيات نشر مستقلة، ويمكن حفظ اقتراحات العرض والإخفاء في قاعدة CRM المستقلة كمسودات؛ نشرها فعليًا على المتاجر لم يُفعّل بعد.";
  function downloadCsv(){
    const rows=tab==="products"?[["Source ID","Brand","Name","Source"],...rowProducts.map(p=>[p.id,p.brand,p.title,p.source])]:[["Order ID","Brand","Status","Created","Carrier"],...rowOrders.map(o=>[o.id,o.brand,o.status,o.created_at,o.shipping_company??""])];
    const text=companyCsv(rows);
    const url=URL.createObjectURL(new Blob([text],{type:"text/csv;charset=utf-8"}));
    const a=document.createElement("a");a.href=url;a.download="sodfa-company-"+tab+"-"+new Date().toISOString().slice(0,10)+".csv";a.click();
    URL.revokeObjectURL(url);
  }
  return <AppShell title="مركز تحكم الشركة">
  <div dir="rtl" style={{fontFamily:"Cairo, sans-serif",color:"#fff",maxWidth:1550,margin:"0 auto",padding:"10px 0 50px"}}>
    <header className="mb-5 rounded-2xl border border-white/10 bg-[#1b1222] p-4 sm:p-6">
      {lastRefresh&&<p className="mb-2 text-xs text-zinc-300">آخر قراءة لبيانات {chosen.name} · {lastRefresh} بتوقيت القاهرة</p>}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black sm:text-3xl">مركز إدارة المشاريع</h1>
          <p className="mt-1 text-sm text-zinc-300">{chosen.name} / {tabData.find(item=>item.id===tab)?.name}</p>
        </div>
        <div className="flex max-w-full flex-wrap items-end gap-2">
          <label className="grid gap-1 text-sm font-semibold">
            المشروع
            <select value={project} onChange={event=>selectProject(event.target.value as Project)}
              className="rounded-lg border border-purple-400/40 bg-[#100c15] px-3 py-2.5 text-white">
              {projectData.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
          <button type="button" disabled={loading} onClick={()=>void refresh(project)}
            className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-3 py-2.5 text-sm disabled:opacity-60">
            <RefreshCw size={16}/>{loading?"جاري التحديث":"تحديث"}
          </button>
        </div>
      </div>
    </header>

    <div className="grid min-w-0 gap-4 lg:grid-cols-[12rem_minmax(0,1fr)]">
      <nav aria-label="أقسام المشروع" className="flex gap-2 overflow-x-auto pb-2 lg:sticky lg:top-4 lg:flex-col lg:self-start lg:rounded-2xl lg:border lg:border-white/10 lg:bg-[#151117] lg:p-3">
        {allowedTabs.map(({id,name,icon:Icon})=><Link key={id} to="/control-center" search={{project,section:id}}
          onClick={()=>{setSearch("");setSelectedOrderId("");setDraftMessage("");}}
          aria-current={id===tab?"page":undefined}
          className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold ${id===tab?"bg-purple-300 text-[#25132e]":"bg-[#211926] text-zinc-200 hover:bg-[#33203d]"}`}>
          <Icon size={17} aria-hidden="true"/>{name}
        </Link>)}
      </nav>

      <section aria-label={tabData.find(item=>item.id===tab)?.name} className="min-w-0">
        {(tab==="dashboard"||tab==="orders"||tab==="products"||tab==="shipping"||tab==="customers"||homeyUrl)&&
          <div className="mb-4 flex flex-wrap gap-2">
            {homeyUrl&&<a href={homeyUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg bg-purple-300 px-3 py-2 text-sm font-bold text-[#25132e]">
              <ExternalLink size={16}/>الإدارة الأصلية لهومي
            </a>}
            {(tab==="dashboard"||tab==="products")&&canSeeSodfaStock&&
              <Link to="/inventory" className="inline-flex items-center gap-2 rounded-lg border border-purple-300/45 px-3 py-2 text-sm text-purple-100"><Warehouse size={16}/>إدارة مخزون صدفة</Link>}
            {(tab==="dashboard"||tab==="orders")&&project!=="sodfa_web"&&!showHomeyOrders&&
              <a href={orderUrl} className="inline-flex items-center gap-2 rounded-lg bg-purple-300 px-3 py-2 text-sm font-bold text-[#25132e]"><ShoppingCart size={16}/>إضافة وتأكيد طلب تجريبي</a>}
            {(tab==="dashboard"||tab==="products")&&project!=="orders"&&
              <a href={catalogUrl} className="inline-flex items-center gap-2 rounded-lg border border-purple-300/45 px-3 py-2 text-sm text-purple-100"><Boxes size={16}/>الكتالوج ومسودات النشر</a>}
            {(tab==="dashboard"||tab==="products")&&canSeeSodfaStock&&
              <Link to="/sales" className="inline-flex items-center gap-2 rounded-lg border border-purple-300/45 px-3 py-2 text-sm text-purple-100"><ClipboardList size={16}/>مبيعات صدفة</Link>}
            {(tab==="shipping"||tab==="customers"||tab==="orders")&&
              <a href={ordersManagerUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-purple-300/45 px-3 py-2 text-sm text-purple-100">
                <ExternalLink size={16}/>{tab==="shipping"?"افتح الشحن وطباعة البوالص في مدير الطلبات":tab==="customers"?"إدارة العملاء في مدير الطلبات":"افتح مدير الطلبات الفعلي"}
              </a>}
          </div>}
    {project!=="orders"&&project!=="sodfa_web"&&bridge?.catalog.error&&<div role="alert" style={{...panel,marginBottom:12,border:"1px solid #985e38"}}>فهرس المنتجات: {bridge.catalog.error}</div>}
    {project!=="sodfa_web"&&bridge?.operations.error&&<div role="alert" style={{...panel,marginBottom:12,border:"1px solid #985e38"}}>بيانات الطلبات والشحن: {bridge.operations.error}</div>}
    {(project==="all"||project==="sodfa")&&bridge?.sodfa.error&&<div role="alert" style={{...panel,marginBottom:12,border:"1px solid #985e38"}}>صدفة: {bridge.sodfa.error}</div>}
    {project==="sodfa_web"&&tab!=="products"&&<div role="status" style={{...panel,marginBottom:12,border:"1px solid #985e38"}}>
      قاعدة SODFA Web الأصلية غير نشطة حالياً؛ المخزون المعروض هنا ليس دليلاً على نشر المنتجات في الموقع.
      بيانات القناة المنشورة غير متاحة لحين استرجاع قاعدة المتجر أو تهيئة مصدر منشور بديل معتمد.
    </div>}
    {loadError&&<div style={{...panel,border:"1px solid #8f5151",marginBottom:14}}><AlertTriangle size={17} style={{display:"inline",marginLeft:8}}/>تعذر جلب بيانات الربط: {loadError}. بيانات صدفة المحلية قد تظل متاحة.</div>}
    {canSeeSodfaStock&&tab==="products"&&<CompanyInventoryAssistant key={project}/>}
    {project==="homey"&&tab==="store-admin"&&bridge&&<iframe
      src="/homey-admin/index.html?embedded=1#/admin"
      title="لوحة تحكم متجر هومي"
      className="h-[calc(100dvh-11rem)] min-h-[32rem] w-full rounded-xl border border-[#27272a] bg-white"
    />}
    {project==="homey"&&tab==="categories"&&bridge&&<HomeyCategories/>}
    {showHomeyOrders&&<OrdersManagerPanel url={homeyOrdersManagerUrl} brand="homey"/>}
    {project==="homey"&&tab==="dashboard"&&<div className="mb-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
      {(["store-admin","products","categories","orders"] as const).map(section=>{
        const item=tabData.find(entry=>entry.id===section)!;
        return <Link key={section} to="/control-center" search={{project:"homey",section}}
          className="flex min-h-12 items-center gap-2 rounded-xl border border-white/10 bg-[#1b1222] px-4 py-3 text-sm font-bold hover:bg-[#2a1530]">
          <item.icon size={18} className="text-purple-300"/>{item.name}
        </Link>;
      })}
    </div>}
    {tab==="dashboard"&&<>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))",gap:12,marginBottom:13}}>
        {project!=="orders"&&project!=="sodfa_web"&&<Metric title="فهرس المنتجات" value={metric(activeProductRefs)} icon={Package} sub="فهرس CRM · سجلات المشروع"/>}
        {project!=="sodfa_web"&&<Metric title="الأوردرات المسجلة" value={metric(orderTotal)} icon={ShoppingCart} sub="مدير الطلبات · كل الفترات"/>}
        {project!=="sodfa_web"&&<Metric title="العملاء المسجلون" value={metric(customers)} icon={Users} sub="مدير الطلبات · سجلات العملاء"/>}
        {project!=="sodfa_web"&&<Metric title="طلبات مشحونة أو مسلّمة" value={metric(shipped)} icon={Truck} sub="مدير الطلبات · الحالة الحالية"/>}
        {canSeeSodfaStock&&<Metric title="سجلات مخزون الويب" value={metric(inventoryRows)} icon={Boxes} sub="Neon · عرض مخزون صدفة المخصص للويب"/>}
        {canSeeSodfaStock&&<Metric title="إجمالي سجل مبيعات صدفة" value={sodfaTotalSales===null?metric(null):fmt(sodfaTotalSales)+" ج.م"} icon={ChartNoAxesCombined} sub={salesRange? "Neon · "+salesRange:"Neon · سجل مبيعات صدفة"}/>}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))",gap:13}}>
        {project!=="sodfa_web"&&<div style={panel}><h2 style={{fontSize:17}}>ملخص الطلبات حسب الحالة</h2>{statuses.length?statuses.map(s=><div key={s.brand+s.status} style={{display:"flex",justifyContent:"space-between",borderBottom:"1px solid "+ui.border,padding:"10px 0",fontSize:12}}><span>{s.brand==="homey"?"هومي":"صدفة"} · {orderStatusLabel(s.status)}</span><b>{fmt(s.count)}</b></div>):<p style={{fontSize:12,color:ui.muted}}>لا توجد بيانات متاحة</p>}<button onClick={()=>setTab("orders")} style={{marginTop:16,color:"#eacafa",background:"transparent",border:0,cursor:"pointer"}}>عرض الطلبات</button></div>}
      </div>
    </>}
    {tab==="products"&&project==="sodfa_web"&&<div style={panel}><h2>منتجات موقع صدفة</h2><p>قاعدة المتجر الأصلية غير نشطة؛ لا يمكن عرض كتالوج منشور مؤكد. لم نخلط منتجات مخزون صدفة بالمنتجات المنشورة على الموقع.</p></div>}
    {((tab==="products"&&project!=="sodfa_web")||(tab==="orders"&&!showHomeyOrders))&&<div style={panel}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:15,flexWrap:"wrap"}}>
        <div><h2 style={{margin:0,fontSize:19}}>{tab==="products"?"منتجات "+chosen.name:"أوردرات "+chosen.name}</h2><p style={{color:ui.muted,fontSize:12}}>{tab==="products"?channelNotice:"طلبات من مدير الطلبات. تفاصيل العميل حسب صلاحية الحساب."}</p></div>
        <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
        <div style={{display:"flex",alignItems:"center",gap:5,background:"#08080A",border:"1px solid #39333c",padding:"4px 9px",borderRadius:10}}><Search size={15} color={ui.muted}/><input value={search} onChange={e=>setSearch(e.target.value)} aria-label={tab==="products"?"ابحث عن منتج":"ابحث برقم الطلب أو رقم المصدر"} placeholder={tab==="products"?"ابحث عن منتج":"رقم الطلب أو المصدر"} style={{background:"transparent",color:"white",padding:8,outline:0,border:0,fontSize:12}}/></div>
        {tab==="orders"&&<select aria-label="حالة الطلب" value={orderStatus} onChange={event=>{setOrderStatus(event.target.value);setSelectedOrderId("");}} className="rounded-lg border border-white/20 bg-[#100c15] px-3 py-2 text-sm">
          <option value="">كل الحالات</option>
          {orderStatuses.map(status=><option key={status} value={status}>{orderStatusLabel(status)}</option>)}
        </select>}
        <button type="button" disabled={tab==="products"?!rowProducts.length:!rowOrders.length} onClick={downloadCsv} style={{background:ui.soft,color:"#fff",border:"1px solid "+ui.purple,padding:"10px 13px",borderRadius:10,cursor:"pointer",fontSize:12}}><FileDown size={14} style={{display:"inline",marginLeft:6}}/>تصدير CSV</button>
        </div>
      </div>
      {draftMessage&&<div role="status" style={{padding:10,marginTop:10,background:ui.soft,borderRadius:8,fontSize:12}}>{draftMessage}</div>}
      <div style={{overflowX:"auto",marginTop:18}}>
      {tab==="products"?<table style={{width:"100%",minWidth:650,borderCollapse:"collapse",fontSize:12}}><thead><tr style={{color:ui.light,borderBottom:"1px solid "+ui.border}}>{["المنتج","المشروع","المصدر","إعدادات العرض المقترحة (مسودة)"].map(h=><th key={h} style={{textAlign:"right",padding:12}}>{h}</th>)}</tr></thead><tbody>{rowProducts.map(p=><tr key={p.source+p.id} style={{borderBottom:"1px solid "+ui.border}}><td style={{padding:12}}><div className="flex items-center gap-3"><CatalogProductPhotos title={p.title} photos={p.images}/><div>
        <span>{p.title}</span>
        {p.source==="sodfa_dashboard"&&<Link to="/sales" search={{product:p.id}} className="mt-1 block text-purple-200 underline">ابحث عنه في شاشة البيع</Link>}
      </div></div></td><td>{p.brand==="homey"?"هومي":"صدفة"}</td><td>{p.source}</td><td><div style={{display:"flex",alignItems:"center",flexWrap:"wrap",gap:8}}>
        <Tag tone={p.draft_visibility===null?"amber":"purple"}>{p.draft_visibility===null?"لم تُحدد":p.draft_visibility?"مقترح للعرض":"مقترح للإخفاء"}</Tag>
        <button type="button" disabled={!bridge?.canWriteCatalogDrafts||Boolean(draftBusy)} onClick={()=>void updateDraft(p,true)}
          style={{border:"1px solid "+ui.purple,borderRadius:8,background:ui.soft,color:"white",padding:"6px 9px",cursor:"pointer",fontSize:11}}>اقتراح عرض</button>
        <button type="button" disabled={!bridge?.canWriteCatalogDrafts||Boolean(draftBusy)} onClick={()=>void updateDraft(p,false)}
          style={{border:"1px solid "+ui.border,borderRadius:8,background:"#111114",color:"white",padding:"6px 9px",cursor:"pointer",fontSize:11}}>اقتراح إخفاء</button>
      </div></td></tr>)}</tbody></table>:<table style={{width:"100%",minWidth:700,borderCollapse:"collapse",fontSize:12}}><thead><tr style={{color:ui.light,borderBottom:"1px solid "+ui.border}}>{["رقم الطلب","البراند","العميل","الإجمالي","تاريخ التسجيل","حالة الطلب","شركة الشحن","تفاصيل"].map(h=><th key={h} style={{textAlign:"right",padding:12}}>{h}</th>)}</tr></thead><tbody>{rowOrders.map(o=><tr key={o.id} style={{borderBottom:"1px solid "+ui.border}}><td style={{padding:12,fontFamily:"monospace"}}>{o.id.slice(0,12)}</td><td>{o.brand==="homey"?"هومي":"صدفة"}</td><td>{o.customer_name}</td><td>{bridge?.accessRole==="viewer"?"محجوب":fmt(o.manual_total??calculateOrderTotal(o.items??[],o.shipping??0,o.discount??0))+" ج.م"}</td><td>{o.created_at?.slice(0,10)??"—"}</td><td><Tag>{orderStatusLabel(o.status)}</Tag></td><td>{o.shipping_company??"غير محدد"}</td><td><button type="button" onClick={()=>setSelectedOrderId(o.id)} style={{border:"1px solid "+ui.purple,color:"white",background:ui.soft,padding:"6px 10px",borderRadius:8,cursor:"pointer"}}>تفاصيل الطلب</button></td></tr>)}</tbody></table>}
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
          <div><span style={{color:ui.muted}}>حالة الطلب</span><div>{orderStatusLabel(selectedOrder.status)}</div></div>
          <div><span style={{color:ui.muted}}>شركة الشحن</span><div>{selectedOrder.shipping_company??"غير محدد"}</div></div>
          <div><span style={{color:ui.muted}}>طريقة الدفع</span><div>{selectedOrder.payment_method??"غير محدد"}</div></div>
          <div><span style={{color:ui.muted}}>المصدر</span><div>{selectedOrder.source??"—"} · {selectedOrder.source_order_id?"مرتبط بأصل الطلب":"غير مرتبط بمعرّف الطلب الأصلي"}</div></div>
          <div><span style={{color:ui.muted}}>المدفوع مقدمًا</span><div>{fmt(selectedOrder.prepaid??0)} ج.م</div></div>
          <div><span style={{color:ui.muted}}>المستلم من الشحن</span><div>{selectedOrder.carrier_received==null?"غير مسجل":fmt(selectedOrder.carrier_received)+" ج.م"}</div></div>
        </div>
        {waybillUrl&&<a href={waybillUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 rounded-lg bg-purple-300 px-3 py-2 text-sm font-bold text-[#25132e]">
          <ExternalLink size={16}/>افتح آخر بوليصة للطباعة
        </a>}
        <h4 style={{margin:"18px 0 6px"}}>الأصناف داخل الطلب</h4>
        {(selectedOrder.items??[]).map((item,i)=><div key={i} style={{display:"flex",justifyContent:"space-between",gap:10,padding:"8px 0",borderBottom:"1px solid "+ui.border,fontSize:12}}>
          <span>{item.name} × {fmt(item.quantity)}</span><span>{fmt(Number(item.price||0)*Number(item.quantity||0))} ج.م</span>
        </div>)}
        <p style={{fontSize:11,color:ui.muted,marginTop:12}}>تفاصيل الطلب حسب صلاحية الحساب. تعديل الحالة والتحصيل من مدير الطلبات.</p>
      </div>}
      {!loading&&((tab==="products"&&!rowProducts.length)||(tab==="orders"&&!rowOrders.length))&&<p style={{color:ui.muted}}>{(tab==="products"?bridge?.catalog.productsAvailable:bridge?.operations.available.orders)?"مفيش نتائج للفلاتر الحالية.":"بيانات القائمة غير متاحة حاليًا."}</p>}
      {(tab==="products"?bridge?.catalog.productsAvailable:bridge?.operations.available.orders)&&<p style={{color:ui.muted,fontSize:11}}>{tab==="products"?"المنتجات المعروضة":"الطلبات المعروضة"} {fmt(tab==="products"?rowProducts.length:rowOrders.length)} من {fmt(tab==="products"?(bridge?.catalog.products.length??0):(bridge?.operations.orders.length??0))} سجل محمّل. الحد الأقصى 500 سجل؛ إجمالي المشروع في النظرة العامة.</p>}
    </div>}
    {tab==="shipping"&&<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(290px,1fr))",gap:13}}><div style={panel}><h2>حالات الشحن حسب المشروع</h2>{(bridge?.operations.shipments??[]).filter(s=>selectedBrand==="all"||s.brand===selectedBrand).map(s=><div key={s.brand+s.state} style={{display:"flex",justifyContent:"space-between",padding:"11px 0",borderBottom:"1px solid "+ui.border}}><span>{s.brand==="homey"?"هومي":"صدفة"} · {s.state}</span><b>{fmt(s.count)}</b></div>)}{!bridge?.operations.available.shipments&&<p>ربط الشحن غير متاح حاليًا</p>}</div><div style={panel}><h2>إدارة عمليات الشحن</h2><p style={{fontSize:12,lineHeight:2,color:ui.muted}}>الملخص من حالات تالا المسجلة في مدير الطلبات. افتح مدير الطلبات لإنشاء الشحنات والتحصيل، أو افتح البوليصة المرتبطة من تفاصيل الطلب.</p></div></div>}
    {tab==="customers"&&<div style={panel}><h2>عملاء {chosen.name}</h2><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:12,marginBottom:14}}><Metric title="عدد العملاء المسجلين" value={metric(customers)} icon={Users}/><Metric title="عدد طلبات المشروع" value={metric(orderTotal)} icon={ShoppingCart}/></div><p style={{color:ui.muted,fontSize:12}}>الدمج الآمن لسجلات العملاء والوصول لأرقام الهاتف وإرسال واتساب يتطلب ربط صلاحيات هومي وصدفة قبل عرض بيانات شخصية داخل المركز.</p></div>}
    {tab==="finance"&&bridge?.accessRole!=="viewer"&&<div style={panel}><h2>تقارير {chosen.name}</h2>{canSeeSodfaStock&&<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:12,marginBottom:14}}><Metric title="قيمة تكلفة مخزون الويب المسجل" value={bridge?.sodfa.inventorySummary?(sodfaInventoryValue===null?"محجوب":fmt(sodfaInventoryValue)+" ج.م"):"غير متاح"} icon={Database}/><Metric title="إجمالي قيمة المبيعات بسجل صدفة" value={sodfaTotalSales===null?metric(null):fmt(sodfaTotalSales)+" ج.م"} icon={ChartNoAxesCombined}/></div>}<p style={{color:ui.muted,fontSize:12,lineHeight:2}}>لم يتم دمج المبيعات بالأوردرات ماليًا بعد، حفاظًا على عدم تكرار الإيرادات. صافي الربح والتكلفة والتحصيل النهائي يحتاجون مطابقة سعر البيع التاريخي وتكلفة البضاعة والشحن والمرتجعات.</p></div>}
    {tab==="finance"&&bridge&&bridge.accessRole!=="viewer"&&<OrderMarginCalculator/>}
    {project==="homey"&&tab==="settings"&&<div className="mb-4 rounded-2xl border border-white/10 bg-[#111114] p-4">
      <h2 className="text-lg font-bold">أدوات متجر هومي الأصلية</h2>
      <div className="mt-3 flex flex-wrap gap-2">
        {([
          { label:"إدارة التقييمات",path:"reviews" },
          { label:"محتوى وتصميم المتجر",path:"content" },
          { label:"إعدادات المتجر والشحن",path:"settings" },
        ] as const).map(({label,path})=><a key={path} href={`https://www.homeyegypt.com/admin/${path}`}
          target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-purple-300/40 px-3 py-2 text-sm">
          <ExternalLink size={15}/>{label}
        </a>)}
      </div>
    </div>}
    {tab==="settings"&&<div style={panel}><h2>الربط والصلاحيات</h2><p><Link to="/control-center-security" style={{display:"inline-flex",padding:"12px 18px",border:"1px solid "+ui.purple,borderRadius:10,color:"#f6d4ff",background:ui.soft,fontWeight:700}}>إدارة مسؤوليات الموظفين والنسخ الاحتياطية وسجل الموافقات ←</Link></p><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:12}}>{[
{name:"قاعدة CRM المركزية",status:bridge?.catalog.connected?"متصلة للقراءة":"غير متصلة",ok:bridge?.catalog.connected,detail:"قراءة بيانات المنتجات والمخزون المرجعي"},
{name:"قاعدة إدارة الطلبات",status:bridge?.operations.connected?"متصلة للقراءة":"غير متصلة",ok:bridge?.operations.connected,detail:"عرض حالات وتفاصيل الأوردرات الحالية"},
{name:"بيانات مخزون صدفة",status:bridge?.sodfa.connected?"متصلة للقراءة":"غير متصلة",ok:bridge?.sodfa.connected,detail:"قراءة المخزون والمبيعات من Neon"},
{name:"منتجات المتاجر",status:"مسودات قابلة للتعديل",ok:true,detail:"حفظ اقتراحات السعر والعرض لكل موقع؛ النشر الحي لم يتصل بعد",href:"/control-center-products?project="+(project==="homey"?"homey":"sodfa")},
{name:"الطلبات وتالا",status:"تجربة إضافة وتأكيد مفعّلة",ok:true,detail:"عمليات الكتابة على قاعدة الاختبار فقط؛ تعديل الإنتاج وتالا لم يتصلا بعد",href:"/control-center-orders"},
].map(x=><div key={x.name} style={{padding:15,background:"#0A0A0C",border:"1px solid "+ui.border,borderRadius:12}}><b>{x.name}</b><div style={{marginTop:12}}><Tag tone={x.ok?"green":"amber"}>{x.status}</Tag></div><p style={{fontSize:11,color:ui.muted,lineHeight:1.8}}>{x.detail}</p>{x.href&&<a href={x.href} style={{fontSize:12,color:"#dda5f7"}}>فتح التحكم ←</a>}</div>)}</div><p style={{color:ui.muted,fontSize:12,lineHeight:2,marginTop:16}}>كل حساب لا يحصل على صلاحيات الكتابة تلقائيًا. تُمنع بيانات التكلفة والموردين من الوصول لمواقع العملاء. فصل العلامات وقنوات النشر لا يزال قيد تطبيق سياسات الوصول قبل ربط الكتابة.</p></div>}
    {bridge?.accessRole==="viewer"&&<p style={{fontSize:12,color:"#d4a7e3"}}>دورك: مشاهد — بيانات العملاء الشخصية وتكلفة الشراء محجوبة، والتعديل غير مسموح.</p>}
      </section>
    </div>
  </div></AppShell>
}
