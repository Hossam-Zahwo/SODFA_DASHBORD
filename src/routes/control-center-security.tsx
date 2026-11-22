import {useEffect,useState,type FormEvent} from "react";
import {createFileRoute,Link} from "@tanstack/react-router";
import {AppShell} from "@/components/AppShell";
import {supabase} from "@/lib/supabase";
import {getCompanyGovernance,assignCompanyResponsibility} from "@/lib/company-governance.functions";
import {ShieldCheck,DatabaseBackup,UserRoundCog,RefreshCcw} from "lucide-react";

export const Route=createFileRoute("/control-center-security")({component:SecurityAndResponsibilities});
type Governance=Awaited<ReturnType<typeof getCompanyGovernance>>;
const bg={background:"#111114",border:"1px solid #27272A",borderRadius:14,padding:18} as const;
const field={background:"#09090b",border:"1px solid #54405a",borderRadius:8,color:"white",padding:10} as const;
const button={background:"#823292",color:"white",border:0,borderRadius:9,padding:"10px 15px",cursor:"pointer"} as const;
function SecurityAndResponsibilities(){
 const [data,setData]=useState<Governance|null>(null),[busy,setBusy]=useState(false);
 const [message,setMessage]=useState("");
 const [user,setUser]=useState("");
 const [project,setProject]=useState<"homey"|"sodfa"|"sodfa_web"|"orders">("homey");
 const [role,setRole]=useState<"viewer"|"operator"|"manager">("viewer");
 useEffect(()=>{void refresh();},[]);
 async function token(){const {data:{session}}=await supabase.auth.getSession();if(!session?.access_token)throw new Error("سجّل الدخول أولاً");return session.access_token}
 async function refresh(){
  setBusy(true);
  try{setData(await getCompanyGovernance({data:{token:await token()}}));}
  catch(e){setMessage("تعذر عرض سجل الأمان: "+(e instanceof Error?e.message:"خطأ"))}
  finally{setBusy(false)}
 }
 async function submit(e:FormEvent){
  e.preventDefault();setBusy(true);setMessage("");
  try{
   await assignCompanyResponsibility({data:{token:await token(),userId:user.trim(),project,role}});
   setMessage("تم حفظ المسؤولية مع تسجيل هوية المدير الذي غيّرها.");setUser("");
   await refresh();
  }catch(e){setMessage("تعذر منح الصلاحية: "+(e instanceof Error?e.message:"خطأ"))}
  finally{setBusy(false)}
 }
 return <AppShell title="الأمان والمسؤوليات">
 <div dir="rtl" style={{fontFamily:"Cairo,sans-serif",color:"white",maxWidth:1150,margin:"0 auto",paddingBottom:55}}>
  <Link to="/control-center" style={{color:"#c58ddd",fontSize:12}}>مركز الشركة / رجوع</Link>
  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:14,margin:"12px 0 20px"}}>
   <div><h1 style={{fontWeight:900,fontSize:26,margin:0}}>الأمان والمسؤوليات والنسخ الاحتياطية</h1>
    <p style={{color:"#aaa",fontSize:12}}>كل مستخدم له دور محدد لكل مشروع؛ السجل يُحفظ في CRM منفصل عن الإنتاج</p>
   </div><button onClick={()=>void refresh()} disabled={busy} style={button}><RefreshCcw size={15} style={{display:"inline",marginLeft:5}}/>تحديث</button>
  </div>
  {message&&<div role="status" style={{...bg,marginBottom:12,color:"#e8c4ef"}}>{message}</div>}
  <div style={{...bg,marginBottom:14}}>
   <h2 style={{fontSize:19,display:"flex",alignItems:"center",gap:8}}><UserRoundCog size={19} color="#b35bd4"/> توزيع المسؤوليات</h2>
   <p style={{fontSize:12,color:"#bbb",lineHeight:2}}>مشاهد: قراءة فقط. منفذ: حفظ مسودات المنتجات وإنشاء طلبات تجريبية. مدير المشروع: صلاحيات المنفذ والموافقة على تأكيد الطلبات التجريبية وقرارات القنوات المشتركة. حساب Admin الأصلي وحده يقدر يوزع الأدوار ويشوف لوحة الشركة المجمعة. جميع العمليات الحية على المتاجر ما زالت غير مفعّلة.</p>
   <form onSubmit={e=>void submit(e)} style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:10,alignItems:"end"}}>
    <label style={{fontSize:12}}>معرّف المستخدم (UUID)<input required value={user} onChange={e=>setUser(e.target.value)} placeholder="user UUID" style={{...field,display:"block",width:"100%"}}/></label>
    <label style={{fontSize:12}}>المشروع<select value={project} onChange={e=>setProject(e.target.value as typeof project)} style={{...field,display:"block",width:"100%"}}><option value="homey">هومي</option><option value="sodfa">صدفة داشبورد</option><option value="sodfa_web">موقع صدفة</option><option value="orders">إدارة الطلبات</option></select></label>
    <label style={{fontSize:12}}>الدور<select value={role} onChange={e=>setRole(e.target.value as typeof role)} style={{...field,display:"block",width:"100%"}}><option value="viewer">مشاهد</option><option value="operator">منفذ</option><option value="manager">مدير مشروع</option></select></label>
    <button disabled={busy} type="submit" style={button}>حفظ الدور</button>
   </form>
   <div style={{overflowX:"auto",marginTop:16}}>
    <table style={{width:"100%",minWidth:600,borderCollapse:"collapse",fontSize:12}}>
    <thead><tr style={{color:"#d3a6e3",borderBottom:"1px solid #363038"}}>{["المستخدم","المشروع","الوظيفة","آخر تعديل"].map(h=><th key={h} style={{textAlign:"right",padding:10}}>{h}</th>)}</tr></thead>
    <tbody>{(data?.assignments??[]).map((x,i)=><tr key={i} style={{borderBottom:"1px solid #262229"}}><td style={{padding:10,fontFamily:"monospace"}}>{String(x["user_id"])}</td><td>{String(x["project_id"])}</td><td>{String(x["responsibility"])}</td><td>{String(x["updated_at"]).slice(0,16)}</td></tr>)}</tbody>
    </table>
    {data?.assignments.length===0&&<p style={{color:"#aaa",fontSize:12}}>مفيش أدوار إضافية اتمنحت. الوصول الافتراضي مقفول، إلا لحسابات Admin الموجودة بالفعل.</p>}
   </div>
  </div>
  <div style={{...bg,marginBottom:14}}>
   <h2 style={{fontSize:19,display:"flex",gap:8,alignItems:"center"}}><DatabaseBackup size={19} color="#b35bd4"/> سجل النسخ الاحتياطية</h2>
   <div style={{overflowX:"auto"}}>
    <table style={{width:"100%",minWidth:690,borderCollapse:"collapse",fontSize:12}}>
    <thead><tr style={{color:"#d3a6e3",borderBottom:"1px solid #363038"}}>{["المصدر","النوع","الحالة","نسخة خارج الخدمة","اختبار استرجاع كامل","آخر تحقق"].map(h=><th key={h} style={{textAlign:"right",padding:10}}>{h}</th>)}</tr></thead>
    <tbody>{(data?.backups??[]).map((x,i)=><tr key={i} style={{borderBottom:"1px solid #262229"}}><td style={{padding:10}}>{String(x["source_system"])}</td><td>{String(x["backup_method"])}</td><td style={{color:"#d8b5e9"}}>{String(x["status"])}</td><td>{x["is_offsite"]?"نعم":"لا"}</td><td>{x["restore_tested"]?"نعم":"لم يكتمل"}</td><td>{String(x["checked_at"]).slice(0,16)}</td></tr>)}</tbody>
    </table>
    {data?.backups.length===0&&<p>لا يوجد سجل نسخ متحقق منه في مركز التحكم.</p>}
   </div>
   <p style={{fontSize:12,color:"#e5c4a2",lineHeight:2}}>Snapshot Neon وحدها ليست حماية كافية ضد تعطل حساب Neon أو الخدمة. مطلوب نسخة مشفرة مستقلة خارج Neon واختبار استرجاع كامل قبل تفعيل نشر المنتجات والتحصيل الحقيقي.</p>
  </div>
  <div style={bg}>
   <h2 style={{fontSize:19,display:"flex",gap:8,alignItems:"center"}}><ShieldCheck size={19} color="#b35bd4"/> الموافقات وسجل المسؤولية</h2>
   <p style={{fontSize:12,color:"#aaa",lineHeight:2}}>طلبات تغيير السعر والنشر المالي والشحن الحساس لها سجل موافقة مبدئي، ويُمنع اعتماد نفس الشخص لطلبه بنفسه. تنفيذ الموافقة على المواقع الحية لم يُوصَّل بعد.</p>
   <p style={{fontSize:12}}>طلبات المراجعة المسجلة: {(data?.approvals??[]).length}</p>
  </div>
 </div></AppShell>
}
