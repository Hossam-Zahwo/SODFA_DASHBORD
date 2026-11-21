import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useInventorySummary } from "@/hooks/useSodfa";
import { Activity, Boxes, Bot, Building2, ChartNoAxesCombined, ClipboardList, Database, ExternalLink, LockKeyhole, Package, ShieldCheck, ShoppingCart, Truck, Users, Warehouse } from "lucide-react";

export const Route = createFileRoute("/control-center")({ component: ControlCenter });

type Section = "overview" | "products" | "orders" | "customers" | "inventory" | "finance" | "ai" | "systems";
const sections: {id: Section;label:string; icon: typeof Boxes}[] = [
  {id:"overview",label:"نظرة عامة",icon:Activity},
  {id:"systems",label:"التحكم في المشاريع",icon:Building2},
  {id:"products",label:"المنتجات والقنوات",icon:Package},
  {id:"orders",label:"الطلبات والشحن",icon:Truck},
  {id:"customers",label:"العملاء CRM",icon:Users},
  {id:"inventory",label:"المخزون والمستودعات",icon:Warehouse},
  {id:"finance",label:"المالية والتقارير",icon:ChartNoAxesCombined},
  {id:"ai",label:"الذكاء الاصطناعي",icon:Bot},
];
const projects = [
  {name:"صدفة داشبورد",type:"الإدارة المالية والمخزون",status:"قراءة بيانات صدفة متاحة داخل الجلسة",url:"https://sodfa-dashbord-y1wn.vercel.app"},
  {name:"موقع هومي",type:"واجهة العملاء ومنتجات هومي",status:"الربط المركزي قيد الإعداد",url:"https://www.homeyegypt.com"},
  {name:"موقع صدفة",type:"واجهة العملاء ومنتجات صدفة",status:"الربط المركزي قيد الإعداد",url:"https://sodfa-self.vercel.app"},
  {name:"إدارة الطلبات",type:"الطلبات، التوصيل وتالا",status:"الربط المركزي قيد الإعداد",url:"https://homey-sodfa-orders-manager.vercel.app"},
];
const channels = ["HOMEY","SODFA","Amazon","مخزون داخلي"];
const fmt=(v:number)=>Number(v||0).toLocaleString("en-US");

function ControlCenter(){
  const [section,setSection]=useState<Section>("overview");
  const [query,setQuery]=useState("");
  const [brand,setBrand]=useState("all");
  // Existing SODFA hook is read-only. No central writes are enabled in this phase.
  const stock = useInventorySummary();
  const items=useMemo(()=>((stock.data??[]) as Array<Record<string,unknown>>).filter(item=>{
    const name=String(item.product_name??item.name??"");
    return name.toLowerCase().includes(query.toLowerCase());
  }).slice(0,150),[stock.data,query]);
  const panel = {background:"#111114",border:"1px solid #27272A",borderRadius:18,padding:20} as const;
  const muted="#A1A1AA",accent="#A94FBC";
  const select=(name:Section)=>{setSection(name);setQuery("");};
  return <AppShell title="مركز تحكم الشركة">
    <div dir="rtl" style={{fontFamily:"Cairo, sans-serif",color:"#fff",maxWidth:1500,margin:"0 auto",padding:"12px 0 50px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:16,flexWrap:"wrap"}}>
        <div><p style={{color:accent,fontSize:13,margin:0}}>SODFA · COMPANY CONTROL CENTER</p><h1 style={{fontSize:28,fontWeight:900,margin:"5px 0"}}>مركز إدارة هومي وصدفة</h1><p style={{color:muted,fontSize:13}}>وحدات إدارة منفصلة داخل صدفة داشبورد وبنفس ألوان النظام الأصلي</p></div>
        <div style={{border:"1px solid #823292",borderRadius:12,padding:"10px 14px",fontSize:12,background:"#2A1530"}}><LockKeyhole size={16} style={{display:"inline",marginLeft:6}}/>مرحلة معاينة · قراءة فقط · بدون نشر للمتاجر</div>
      </div>
      <div style={{display:"flex",gap:8,overflowX:"auto",padding:"16px 0 20px"}}>
        {sections.map(({id,label,icon:Icon})=><button type="button" key={id} onClick={()=>select(id)} style={{display:"inline-flex",gap:8,alignItems:"center",flexShrink:0,borderRadius:12,padding:"10px 13px",border:"1px solid "+(section===id?"#A94FBC":"#27272A"),color:section===id?"#fff":"#c5c5cc",background:section===id?"#642472":"#111114",cursor:"pointer",fontSize:12,fontWeight:700}}><Icon size={16}/>{label}</button>)}
      </div>
      {section==="overview" && <div style={{display:"grid",gap:16}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(185px,1fr))",gap:12}}>
          {[
            ["مشروعات", "4",Building2],["منتجات صدفة (قراءة مباشرة)",stock.isLoading?"...":stock.isError?"غير متاح":fmt((stock.data??[]).length),Boxes],
            ["قنوات البيع المخططة","3",ShoppingCart],["المزامنة التلقائية","غير مفعّلة",ShieldCheck]
          ].map(([label,value,Icon])=><div key={String(label)} style={panel}><div style={{color:muted,fontSize:12}}>{String(label)}</div><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginTop:13}}><strong style={{fontSize:23}}>{String(value)}</strong><Icon size={23} color={accent}/></div></div>)}
        </div>
        <div style={panel}><h2 style={{fontSize:18,margin:"0 0 14px"}}>الأنظمة الحالية</h2><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(210px,1fr))",gap:12}}>{projects.map(p=><div key={p.name} style={{background:"#0A0A0C",border:"1px solid #27272A",borderRadius:14,padding:16}}><strong>{p.name}</strong><p style={{color:muted,fontSize:12}}>{p.type}</p><p style={{color:"#d4b6e3",fontSize:11}}>{p.status}</p><a href={p.url} target="_blank" rel="noreferrer" style={{color:"#d6aff1",fontSize:12}}>فتح المشروع الأصلي <ExternalLink size={12} style={{display:"inline"}}/></a></div>)}</div></div>
        <div style={panel}><h2 style={{fontSize:18}}>خطة الأمان عند الربط</h2><p style={{color:muted,lineHeight:2,fontSize:13}}>كل براند يحتفظ ببياناته ومصدر منتجاته. لا يتم نشر منتج إلا بقرار منفصل لكل قناة، ولا تُرسل تكلفة الشراء للمتاجر العامة. جميع أوامر تعديل المخزون والأسعار والشحن متوقفة في هذه النسخة لحين وجود API مصرح واختبارات واسترجاع موثوق.</p></div>
      </div>}
      {section==="systems" && <div style={{...panel,display:"grid",gap:14}}><h2>المشروعات والمصادر</h2>{projects.map(p=><div key={p.name} style={{padding:16,background:"#0A0A0C",border:"1px solid #27272A",borderRadius:12,display:"flex",justifyContent:"space-between",gap:10,flexWrap:"wrap"}}><div><strong>{p.name}</strong><p style={{color:muted,fontSize:12}}>{p.type} · {p.status}</p></div><a href={p.url} target="_blank" rel="noreferrer" style={{color:accent,fontSize:13}}>افتح النظام الأصلي ↗</a></div>)}</div>}
      {(section==="products"||section==="inventory") && <div style={panel}>
        <div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",alignItems:"center",gap:12}}><div><h2 style={{margin:0,fontSize:20}}>{section==="products"?"المنتجات وقنوات العرض":"مخزون صدفة"}</h2><p style={{color:muted,fontSize:12}}>بيانات صدفة المتاحة حاليًا للقراءة فقط؛ قناة العرض النهائية لم تُربط بعد</p></div><div style={{display:"flex",gap:8}}><input aria-label="بحث المنتجات" value={query} onChange={e=>setQuery(e.target.value)} placeholder="ابحث باسم المنتج" style={{background:"#08080A",border:"1px solid #3e3344",color:"#fff",padding:10,borderRadius:10}}/><select aria-label="البراند" value={brand} onChange={e=>setBrand(e.target.value)} style={{background:"#08080A",color:"white",border:"1px solid #3e3344",padding:10,borderRadius:10}}><option value="all">مصدر صدفة</option><option disabled value="homey">هومي — الربط لاحقًا</option></select></div></div>
        <div style={{overflowX:"auto",marginTop:18}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:12,minWidth:720}}><thead><tr style={{color:"#C6A2DA",borderBottom:"1px solid #3e3344"}}>{["المنتج","المستودع","الكمية المتبقية","تكلفة الشراء (إداري)","سعر البيع","النشر بالمواقع"].map(t=><th key={t} style={{padding:12,textAlign:"right"}}>{t}</th>)}</tr></thead><tbody>{items.map((p,i)=><tr key={String(p.product_id??i)} style={{borderBottom:"1px solid #27272A"}}><td style={{padding:12}}>{String(p.product_name??p.name??"—")}</td><td>{String(p.warehouse??"—")}</td><td>{fmt(Number(p.remaining_qty??p.stock_qty??0))}</td><td>{p.purchase_price==null?"—":fmt(Number(p.purchase_price))}</td><td>{p.sale_price==null?"—":fmt(Number(p.sale_price))}</td><td style={{color:"#d6aff1"}}>غير محدد — لا نشر</td></tr>)}</tbody></table>{stock.isLoading&&<p>جاري قراءة مخزون صدفة…</p>}{stock.isError&&<p style={{color:"#ff9fa8"}}>تعذر قراءة مخزون صدفة بهذه الجلسة، ولم يتم تعديل أي بيانات.</p>}{!stock.isLoading&&!stock.isError&&items.length===0&&<p>لا توجد عناصر مطابقة.</p>}</div><p style={{color:muted,fontSize:11}}>هذه شاشة داخلية فقط. بيانات التكلفة لا تُتاح من أي API عامة للمتاجر، ويجب فرض صلاحيات حقيقية على الخادم قبل تفعيل النشر.</p>
      </div>}
      {section==="orders" && <div style={panel}><h2>إدارة الطلبات والشحن</h2><p style={{color:muted}}>يظل Orders Manager مصدر إدارة الطلبات الحالي. هنا ستظهر لاحقًا أوردرات هومي وصدفة مع تفاصيل الشحن والتحصيل بعد بناء موصل API آمن ومستقل.</p><a href={projects[3].url} target="_blank" rel="noreferrer" style={{color:accent}}>فتح إدارة الطلبات الحالية ↗</a><p style={{marginTop:22,color:"#e4b9ef"}}>إضافة الطلبات، الطباعة، تالا، التقييمات: غير مفعّلة هنا بعد؛ لم ننقل منطقها أو بياناتها.</p></div>}
      {section==="customers" && <div style={panel}><h2>العملاء CRM</h2><p style={{color:muted}}>مصادر العملاء منفصلة حتى تفعيل ربط معرّفات العملاء والصلاحيات والموافقات. لن نجمع بيانات هومي وصدفة في واجهة موظف غير مخوّل.</p></div>}
      {section==="finance" && <div style={panel}><h2>المالية والتقارير</h2><p style={{color:muted}}>ستُجمع تكلفة البضاعة والمبيعات والتحصيلات بتواريخها ومصادرها. لا نجمع المبالغ الخام بين الأنظمة قبل إزالة التكرار ومطابقة الطلبات والتحويلات.</p><Link to="/transactions" style={{color:accent}}>المعاملات المالية الحالية في صدفة ↗</Link></div>}
      {section==="ai" && <div style={panel}><h2>مساعد إدارة الشركة</h2><p style={{color:muted}}>تصميم واجهة المساعد جاهز مبدئيًا. تشغيل الوكيل، أدواته، وسجل موافقاته يحتاج إعدادًا منفصلًا؛ لم نمنحه صلاحيات كتابة أو مفاتيح إنتاج.</p><div style={{padding:18,borderRadius:12,background:"#2A1530",color:"#e0c2ea"}}><Bot size={22} style={{display:"inline",marginLeft:8}}/>مثال: «اعرض المنتجات القريبة من النفاد في صدفة فقط» — التنفيذ الآلي لم يُفعّل بعد.</div></div>}
      <p style={{color:"#7d7d86",fontSize:11,marginTop:22}}>نسخة تطوير مستقلة · لا يوجد نشر مباشر لموقعي HOMEY أو SODFA · أرقام المنتجات من صدفة قد تعتمد على صلاحية جلسة المستخدم</p>
    </div>
  </AppShell>;
}
