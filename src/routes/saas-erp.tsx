import {useEffect,useMemo,useState,type FormEvent} from "react";
import {createFileRoute,Link} from "@tanstack/react-router";
import {AppShell} from "@/components/AppShell";
import {supabase} from "@/lib/supabase";
import {
 getSaaSWorkspace,createSaaSProduct,createSaaSCustomer,
 createSaaSWarehouse,createSaaSExpense,
} from "@/lib/saas-erp.functions";
import {Building2,Boxes,Users,ShoppingCart,Warehouse,Receipt,
 ShieldCheck,RefreshCw,PlugZap,History,Plus} from "lucide-react";

export const Route=createFileRoute("/saas-erp")({component:ERP});
const tenantId="4e23ed6b-8430-475f-8eb4-c9d249e4c0e4";
type View="overview"|"catalog"|"crm"|"orders"|"inventory"|"finance"|"integrations"|"audit";
type B="all"|"homey"|"sodfa";
type W=Awaited<ReturnType<typeof getSaaSWorkspace>>;
const palette={bg:"#0A0A0C",panel:"#111114",purple:"#823292",light:"#BD76D5",line:"#302638",muted:"#A1A1AA"};
const card={background:palette.panel,border:"1px solid "+palette.line,borderRadius:16,padding:18} as const;
const inp={background:"#09090C",color:"white",border:"1px solid #524459",borderRadius:10,padding:"10px 12px",width:"100%"} as const;
const btn={background:palette.purple,border:0,color:"white",borderRadius:10,padding:"10px 14px",cursor:"pointer",fontWeight:700} as const;
const sections:{id:View,label:string,icon:typeof Boxes}[]=[
{id:"overview",label:"اللوحة",icon:Building2},
{id:"catalog",label:"المنتجات",icon:Boxes},
{id:"crm",label:"العملاء",icon:Users},
{id:"orders",label:"الأوردرات",icon:ShoppingCart},
{id:"inventory",label:"المخازن",icon:Warehouse},
{id:"finance",label:"المالية",icon:Receipt},
{id:"integrations",label:"الربط",icon:PlugZap},
{id:"audit",label:"سجل العمليات",icon:History},
];
function Metric({label,value,note}:{label:string;value:string|number;note:string}){
 return <div style={card}><div style={{color:palette.muted,fontSize:12}}>{label}</div>
 <strong style={{display:"block",fontSize:26,margin:"7px 0"}}>{value}</strong><div style={{color:palette.muted,fontSize:11}}>{note}</div></div>;
}
function ERP(){
 const [data,setData]=useState<W|null>(null),[section,setSection]=useState<View>("overview");
 const [brand,setBrand]=useState<B>("all");
 const [loading,setLoading]=useState(false),[notice,setNotice]=useState(""),[query,setQuery]=useState("");
 const [form,setForm]=useState<"product"|"customer"|"warehouse"|"expense"|null>(null);
 const [name,setName]=useState(""),[value,setValue]=useState(""),[extra,setExtra]=useState("");
 const [ownBrand,setOwnBrand]=useState<"homey"|"sodfa">("homey");
 const [channels,setChannels]=useState<string[]>([]);
 useEffect(()=>{void load();},[brand]);
 async function session(){
  const {data:{session}}=await supabase.auth.getSession();
  if(!session?.access_token)throw new Error("سجل دخولك بحساب Admin في صدفة");
  return session.access_token;
 }
 async function load(){
  setLoading(true);setNotice("");
  try{const result=await getSaaSWorkspace({data:{token:await session(),tenantId,
   ...(brand==="all"?{}:{brand})}});
   setData(result);
  }catch(e){setData(null);setNotice("فشل تحميل ERP: "+(e instanceof Error?e.message:"خطأ"))}
  finally{setLoading(false)}
 }
 async function save(e:FormEvent){
  e.preventDefault();setLoading(true);setNotice("");
  try{
   const token=await session(),base={token,tenantId,brand:ownBrand};
   if(form==="product"){
    await createSaaSProduct({data:{...base,title:name.trim(),sku:value.trim()||null,
      channels:channels as ("homey_web"|"sodfa_web")[]}});
    setNotice("المنتج اتحفظ كمسودة SaaS فقط؛ مفيش نشر للمتاجر الخارجية");
   }else if(form==="customer"){
    await createSaaSCustomer({data:{...base,name:name.trim(),phone:value.trim()||null}});
    setNotice("تم حفظ العميل في CRM التجريبي، بدون تغيير بيانات العملاء في الأنظمة الأصلية");
   }else if(form==="warehouse"){
    await createSaaSWarehouse({data:{...base,name:name.trim()}});
    setNotice("تم إنشاء المخزن في ERP التجريبي، بدون حجز أو تغيير أي مخزون إنتاج");
   }else if(form==="expense"){
    await createSaaSExpense({data:{...base,category:name.trim(),amountEGP:Number(value),
      description:extra.trim()}});
    setNotice("المصروف مسجل في دفتر ERP التجريبي، وليس بالدفتر المالي الأصلي");
   }
   setForm(null);setName("");setValue("");setExtra("");setChannels([]);
   await load();
  }catch(e){setNotice("تعذر الحفظ: "+(e instanceof Error?e.message:"خطأ"))}
  finally{setLoading(false)}
 }
 const filtered=useMemo(()=>data?.products.filter(p=>String(p.title).toLowerCase().includes(query.toLowerCase()))??[],[data,query]);
 const fmt=(n:number)=>n.toLocaleString("en-US");
 const orgName=data?.organization?.display_name??"شركة صدفة وهومي";
 const open=(type:typeof form)=>{setForm(type);setOwnBrand(brand==="sodfa"?"sodfa":"homey");setName("");setValue("");setExtra("");setChannels([])};
 return <AppShell title="SaaS ERP + CRM">
  <div dir="rtl" style={{fontFamily:"Cairo,sans-serif",maxWidth:1440,margin:"0 auto",color:"white",paddingBottom:60}}>
   <div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:12,alignItems:"center"}}>
    <div><Link to="/control-center" style={{color:palette.light,fontSize:12}}>مركز الشركة / رجوع</Link>
     <h1 style={{fontSize:26,fontWeight:900,margin:"6px 0"}}>{orgName} · ERP + CRM</h1>
     <div style={{fontSize:12,color:palette.muted}}>نسخة SaaS تجريبية مع عزل الشركات وصلاحيات على مستوى قاعدة البيانات</div>
    </div>
    <button disabled={loading} onClick={()=>void load()} style={btn}><RefreshCw size={15} style={{display:"inline",marginLeft:6}}/>تحديث البيانات</button>
   </div>
   <div style={{...card,margin:"16px 0",border:"1px solid #875d33",fontSize:12,color:"#f0cbab",lineHeight:1.8}}>
    <ShieldCheck size={17} style={{display:"inline",marginLeft:7}}/>
    **وضع SaaS Staging** — كل أزرار الحفظ هنا بتكتب في قاعدة Neon المعزولة فقط. لا تنشر منتجات على هومي/صدفة، ولا تعدل أوردرات الإنتاج، ولا ترسل لتالا.
   </div>
   <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"center",marginBottom:15}}>
    {(["all","homey","sodfa"] as const).map(x=><button key={x} type="button" onClick={()=>{setBrand(x);setSection("overview");setForm(null)}} style={{...btn,background:brand===x?palette.purple:palette.panel,border:"1px solid "+palette.line}}>
     {x==="all"?"الشركة كاملة":x==="homey"?"هومي فقط":"صدفة فقط"}</button>)}
    <span style={{marginRight:"auto",fontSize:11,color:palette.muted}}>يتم فلترة البيانات من السيرفر وقاعدة البيانات</span>
   </div>
   <div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:9,marginBottom:12}}>
    {sections.map(x=><button key={x.id} onClick={()=>{setSection(x.id);setForm(null)}} style={{...btn,whiteSpace:"nowrap",background:section===x.id?palette.purple:palette.panel,border:"1px solid "+palette.line,fontSize:12,display:"flex",alignItems:"center",gap:7}}>
     <x.icon size={15}/>{x.label}</button>)}
   </div>
   {notice&&<div role="status" style={{...card,color:"#e9bff3",marginBottom:12}}>{notice}</div>}
   {section==="overview"&&<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(185px,1fr))",gap:12}}>
    <Metric label="المنتجات" value={fmt(data?.summary.products??0)} note="مراجع مستوردة ومسودات SaaS"/>
    <Metric label="العملاء" value={fmt(data?.summary.customers??0)} note="العملاء المضافون للـCRM الجديد"/>
    <Metric label="الأوردرات" value={fmt(data?.summary.orders??0)} note="أوردرات SaaS فقط، غير شاملة النظام الأصلي"/>
    <Metric label="المخازن" value={fmt(data?.summary.warehouses??0)} note="المخازن الجديدة في ERP"/>
    <div style={{...card,gridColumn:"1/-1",lineHeight:2}}>
      <strong>التحويل لنظام SaaS</strong><p style={{color:palette.muted,fontSize:13}}>البنية الأساسية اتبنت للشركات والمستخدمين والاشتراكات والمنتجات والمخزون والطلبات والعملاء والمدفوعات والمصروفات وسجل المراجعة والمزامنة. البيانات المعروضة هنا تابعة لقاعدة التجربة وليست إجمالي إنتاج الشركة. الربط الحي بالأنظمة القديمة لم يتم تحويله بعد.</p>
    </div>
   </div>}
   {section==="catalog"&&<div style={card}>
    <div style={{display:"flex",gap:12,justifyContent:"space-between",flexWrap:"wrap",alignItems:"center"}}><h2>كتالوج المنتجات</h2><button style={btn} onClick={()=>open("product")}><Plus size={15} style={{display:"inline",marginLeft:5}}/>مسودة منتج جديد</button></div>
    <input placeholder="ابحث عن منتج من البيانات الحقيقية المستوردة" value={query} onChange={e=>setQuery(e.target.value)} style={{...inp,marginBottom:12}}/>
    <div style={{overflowX:"auto",maxHeight:500,overflowY:"auto"}}>
     <table style={{width:"100%",minWidth:640,fontSize:12,borderCollapse:"collapse"}}><thead><tr style={{color:palette.light}}>{["المنتج","العلامة","مصدر البيانات","الحالة"].map(x=><th key={x} style={{padding:10,textAlign:"right"}}>{x}</th>)}</tr></thead>
     <tbody>{filtered.map(p=><tr key={String(p.id)} style={{borderTop:"1px solid "+palette.line}}><td style={{padding:10}}>{String(p.title)}</td><td>{p.brand_id==="homey"?"هومي":"صدفة"}</td><td>{String(p.source_system??"سجل داخلي")}</td><td style={{color:palette.light}}>{String(p.status)}</td></tr>)}</tbody></table>
    </div>
   </div>}
   {section==="crm"&&<div style={card}>
    <div style={{display:"flex",justifyContent:"space-between",gap:12}}><h2>العملاء CRM</h2><button style={btn} onClick={()=>open("customer")}><Plus size={15} style={{display:"inline",marginLeft:6}}/>عميل جديد</button></div>
    {data?.customers.length?data.customers.map(x=><div key={String(x.id)} style={{borderBottom:"1px solid "+palette.line,padding:"11px 0"}}>
     <strong>{String(x.display_name)}</strong><span style={{marginRight:12,color:palette.muted}}>{x.brand_id==="homey"?"هومي":"صدفة"} · {String(x.phone??"بدون هاتف")}</span>
    </div>):<p style={{color:palette.muted}}>لم يتم استيراد بيانات العملاء الشخصية تلقائيًا، حماية لخصوصيتها. أضف عملاء التجربة من هنا.</p>}
   </div>}
   {section==="orders"&&<div style={card}><h2>الأوردرات</h2>
    <p style={{fontSize:12,color:palette.muted}}>جداول الطلبات والبنود ووسائل الدفع موجودة ومعزولة لكل شركة. النموذج الحي الموجود في مركز الشركة منفصل وعمليات التعديل على الإنتاج غير مفعّلة.</p>
    {(data?.orders??[]).map(x=><div key={String(x.id)} style={{padding:10,borderBottom:"1px solid "+palette.line}}>#{String(x.id).slice(0,8)} · {String(x.status)} · {String(x.brand_id)}</div>)}
    <Link to="/control-center-orders" style={{color:palette.light}}>افتح نموذج الطلبات التجريبي الحالي</Link>
   </div>}
   {section==="inventory"&&<div style={card}><div style={{display:"flex",justifyContent:"space-between",gap:12}}><h2>المستودعات والجرد</h2><button style={btn} onClick={()=>open("warehouse")}><Plus size={15} style={{display:"inline",marginLeft:6}}/>إضافة مخزن</button></div>
    {(data?.warehouses??[]).map(x=><div key={String(x.id)} style={{padding:10,borderBottom:"1px solid "+palette.line}}>{String(x.name)} · {x.brand_id==="homey"?"هومي":"صدفة"}</div>)}
    {!data?.warehouses.length&&<p style={{color:palette.muted}}>لا توجد مخازن داخل قاعدة SaaS التجريبية بعد. مخزون صدفة الأصلي لم يُنقل أو يتغير.</p>}
   </div>}
   {section==="finance"&&<div style={card}><div style={{display:"flex",justifyContent:"space-between",gap:12}}><h2>المالية والمصروفات</h2><button style={btn} onClick={()=>open("expense")}><Plus size={15} style={{display:"inline",marginLeft:6}}/>تسجيل مصروف</button></div>
    <Metric label="المصروفات المسجلة داخل SaaS" value={((data?.expenses??[]).reduce((a,e)=>a+Number(e.amount_minor||0),0)/100).toLocaleString("en-US")+" ج.م"} note="لا تشمل المصروفات التاريخية الأصلية"/>
    {(data?.expenses??[]).map((x,i)=><p key={i} style={{fontSize:12}}>{String(x.category)} · {Number(x.amount_minor)/100} ج.م · {String(x.brand_id)}</p>)}
   </div>}
   {section==="integrations"&&<div style={card}><h2>حالة الربط الفعلية</h2>
    {(data?.integrations??[]).map(x=><div key={String(x.system_key)} style={{display:"flex",justifyContent:"space-between",gap:8,padding:"12px 0",borderBottom:"1px solid "+palette.line}}>
     <b>{String(x.system_key)}</b><span style={{color:x.connection_state==="error"?"#ef9a8e":palette.light}}>{String(x.connection_state)}{x.error_code?" · "+String(x.error_code):""}</span>
    </div>)}
    <p style={{color:palette.muted,fontSize:12}}>لا يتم اعتبار أي اتصال حيًا إلا بعد نجاح API واختبار عملية فعلية مع صلاحيات ومراقبة.</p>
   </div>}
   {section==="audit"&&<div style={card}><h2>سجل العمليات</h2>
    {(data?.events??[]).map((x,i)=><div key={i} style={{padding:9,borderBottom:"1px solid "+palette.line,fontSize:12}}>{String(x.action)} · {String(x.entity_kind)} · {String(x.occurred_at).slice(0,19)}</div>)}
    {!data?.events.length&&<p style={{color:palette.muted}}>لم يتم تنفيذ أي إجراء داخل النظام الجديد بعد.</p>}
   </div>}
   {form&&<div style={{...card,marginTop:14,background:"#201528",border:"1px solid "+palette.purple}}>
    <h3>إضافة {form==="product"?"منتج":form==="customer"?"عميل":form==="warehouse"?"مخزن":"مصروف"} — في بيئة التجربة</h3>
    <form onSubmit={e=>void save(e)} style={{display:"grid",gap:12}}>
     <label>البراند <select value={ownBrand} onChange={e=>setOwnBrand(e.target.value as typeof ownBrand)} style={inp}><option value="homey">هومي</option><option value="sodfa">صدفة</option></select></label>
     <label>{form==="product"?"اسم المنتج":form==="customer"?"اسم العميل":form==="warehouse"?"اسم المخزن":"تصنيف المصروف"} <input required minLength={2} value={name} onChange={e=>setName(e.target.value)} style={inp}/></label>
     {(form==="product"||form==="customer"||form==="expense")&&<label>{form==="product"?"SKU اختياري":form==="customer"?"رقم الهاتف":"المبلغ بالجنيه"} <input required={form==="expense"} type={form==="expense"?"number":"text"} min={form==="expense"?0:undefined} step={form==="expense"?"0.01":undefined} value={value} onChange={e=>setValue(e.target.value)} style={inp}/></label>}
     {form==="expense"&&<label>التفاصيل <input value={extra} onChange={e=>setExtra(e.target.value)} style={inp}/></label>}
     {form==="product"&&<div><b>قنوات العرض المقترحة</b><div style={{display:"flex",gap:15,marginTop:7}}>
      {(["homey_web","sodfa_web"] as const).map(ch=><label key={ch}><input type="checkbox" checked={channels.includes(ch)} onChange={e=>setChannels(old=>e.target.checked?[...old,ch]:old.filter(x=>x!==ch))}/>{ch==="homey_web"?"موقع هومي":"موقع صدفة"}</label>)}
      </div><div style={{color:palette.muted,fontSize:11}}>القنوات المشتركة تحفظ كموافقة مطلوبة ولا تنشر تلقائيًا.</div></div>}
     <div style={{display:"flex",gap:10}}><button disabled={loading} type="submit" style={btn}>حفظ في SaaS التجريبي</button>
      <button type="button" onClick={()=>setForm(null)} style={{...btn,background:"#39303d"}}>إلغاء</button></div>
    </form>
   </div>}
  </div>
 </AppShell>;
}
