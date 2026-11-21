import {useEffect,useState,type FormEvent} from "react";
import {createFileRoute,Link} from "@tanstack/react-router";
import {AppShell} from "@/components/AppShell";
import {supabase} from "@/lib/supabase";
import {getSaaSCRM,createSaaSLead,updateSaaSLeadStage,createSaaSTask} from "@/lib/saas-crm.functions";
import {Users,RefreshCw} from "lucide-react";
export const Route=createFileRoute("/saas-crm")({component:CRM});
const tenantId="4e23ed6b-8430-475f-8eb4-c9d249e4c0e4";
type B="homey"|"sodfa";
type Data=Awaited<ReturnType<typeof getSaaSCRM>>;
const panel={background:"#111114",border:"1px solid #332b36",borderRadius:14,padding:18} as const;
const field={background:"#08080a",border:"1px solid #5a4661",color:"white",borderRadius:9,padding:10,width:"100%"} as const;
const btn={background:"#823292",color:"white",border:0,borderRadius:9,padding:"9px 14px",cursor:"pointer"} as const;
function CRM(){
 const [brand,setBrand]=useState<B>("homey"),[data,setData]=useState<Data|null>(null);
 const [name,setName]=useState(""),[phone,setPhone]=useState(""),[source,setSource]=useState(""),[amount,setAmount]=useState("");
 const [busy,setBusy]=useState(false),[msg,setMsg]=useState("");
 const [taskLead,setTaskLead]=useState(""),[task,setTask]=useState("");
 useEffect(()=>{void load();},[brand]);
 async function token(){const {data:{session}}=await supabase.auth.getSession();if(!session?.access_token)throw Error("مطلوب حساب Admin");return session.access_token}
 async function load(){
  setBusy(true);
  try{setData(await getSaaSCRM({data:{token:await token(),tenantId,brand}}));}
  catch(e){setMsg(e instanceof Error?e.message:"تعذر قراءة CRM");}
  finally{setBusy(false)}
 }
 async function create(e:FormEvent){
  e.preventDefault();setBusy(true);
  try{await createSaaSLead({data:{token:await token(),tenantId,brand,
   fullName:name.trim(),phone:phone||null,source:source||null,estimatedEGP:Number(amount||0)}});
   setMsg("تم تسجيل فرصة البيع في CRM التجريبي");setName("");setPhone("");setSource("");setAmount("");await load();
  }catch(e){setMsg(e instanceof Error?e.message:"تعذر الحفظ")}finally{setBusy(false)}
 }
 async function setStage(id:string,stage:string){
  setBusy(true);
  try{await updateSaaSLeadStage({data:{token:await token(),tenantId,leadId:id,
   stage:stage as "new"|"contacted"|"qualified"|"proposal"|"won"|"lost"}});
   setMsg("تم تحديث المرحلة وحفظ الحدث في سجل المراجعة");await load();
  }catch(e){setMsg(e instanceof Error?e.message:"تعذر التعديل")}finally{setBusy(false)}
 }
 async function createTask(e:FormEvent){
  e.preventDefault();setBusy(true);
  try{await createSaaSTask({data:{token:await token(),tenantId,leadId:taskLead,summary:task,priority:"normal"}});
   setMsg("اتسجلت المهمة في CRM التجريبي");setTask("");setTaskLead("");await load();
  }catch(e){setMsg(e instanceof Error?e.message:"تعذر إضافة المهمة")}finally{setBusy(false)}
 }
 return <AppShell title="CRM — الفرص والمتابعات">
 <div dir="rtl" style={{fontFamily:"Cairo,sans-serif",color:"#fff",paddingBottom:45}}>
  <Link to="/saas-erp" style={{fontSize:12,color:"#d0a1e4"}}>ERP / رجوع</Link>
  <div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:12,alignItems:"center",margin:"12px 0"}}>
   <div><h1 style={{fontSize:24,fontWeight:900,margin:0}}><Users size={23} style={{display:"inline",marginLeft:8}}/>العملاء المحتملون والمتابعة</h1><p style={{color:"#aaa",fontSize:12}}>CRM حي داخل قاعدة SaaS التجريبية — لا يراسل العملاء تلقائيًا</p></div>
   <button onClick={()=>void load()} style={btn}><RefreshCw size={14} style={{display:"inline",marginLeft:6}}/>تحديث</button>
  </div>
  <div style={{display:"flex",gap:10,marginBottom:15}}>{(["homey","sodfa"] as const).map(x=><button key={x} style={{...btn,background:x===brand?"#823292":"#1c1820"}} onClick={()=>{setBrand(x);setData(null)}}>{x==="homey"?"هومي فقط":"صدفة فقط"}</button>)}</div>
  {msg&&<div role="status" style={{...panel,marginBottom:12,color:"#d8b6eb"}}>{msg}</div>}
  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(290px,1fr))",gap:13}}>
   <form onSubmit={e=>void create(e)} style={{...panel,display:"grid",gap:10}}>
    <h2 style={{fontSize:18}}>فرصة بيع جديدة</h2>
    <label>الاسم <input required minLength={2} value={name} onChange={e=>setName(e.target.value)} style={field}/></label>
    <label>الموبايل <input value={phone} onChange={e=>setPhone(e.target.value)} style={field}/></label>
    <label>المصدر <input placeholder="واتساب / موقع / مكالمة" value={source} onChange={e=>setSource(e.target.value)} style={field}/></label>
    <label>قيمة متوقعة بالجنيه <input min={0} type="number" step="0.01" value={amount} onChange={e=>setAmount(e.target.value)} style={field}/></label>
    <button disabled={busy} style={btn}>حفظ فرصة البيع</button>
   </form>
   <form onSubmit={e=>void createTask(e)} style={{...panel,display:"grid",gap:10,alignContent:"start"}}>
    <h2 style={{fontSize:18}}>متابعة عميل محتمل</h2>
    <label>اختار فرصة البيع <select required style={field} value={taskLead} onChange={e=>setTaskLead(e.target.value)}><option value="">اختر</option>{(data?.leads??[]).map(l=><option key={String(l.id)} value={String(l.id)}>{String(l.full_name)}</option>)}</select></label>
    <label>المهمة <textarea required rows={3} minLength={3} value={task} onChange={e=>setTask(e.target.value)} style={field}/></label>
    <button disabled={busy} style={btn}>تسجيل المهمة</button>
    <p style={{fontSize:12,color:"#aaa"}}>المهمة تتسجل باسم المدير الحالي. إسنادها لموظفين تانيين ومواعيد التنبيه لسه تحت التطوير.</p>
   </form>
  </div>
  <div style={{...panel,marginTop:14,overflowX:"auto"}}>
   <h2 style={{fontSize:18}}>مراحل البيع</h2>
   <table style={{width:"100%",minWidth:680,borderCollapse:"collapse",fontSize:12}}>
    <thead><tr style={{color:"#d4a3e9"}}>{["العميل","المصدر","القيمة المتوقعة","المرحلة","تاريخ الإنشاء"].map(x=><th key={x} style={{padding:10,textAlign:"right"}}>{x}</th>)}</tr></thead>
    <tbody>{(data?.leads??[]).map(l=><tr key={String(l.id)} style={{borderTop:"1px solid #302936"}}>
     <td style={{padding:10}}>{String(l.full_name)}</td><td>{String(l.source??"—")}</td>
     <td>{(Number(l.expected_value_minor??0)/100).toLocaleString("en-US")} ج.م</td>
     <td><select disabled={busy} value={String(l.stage)} onChange={e=>void setStage(String(l.id),e.target.value)} style={{...field,padding:7}}>
      <option value="new">جديد</option><option value="contacted">تم التواصل</option><option value="qualified">مؤهل</option>
      <option value="proposal">عرض سعر</option><option value="won">تم البيع</option><option value="lost">غير مكتمل</option>
     </select></td><td>{String(l.created_at).slice(0,10)}</td>
    </tr>)}</tbody>
   </table>
   {!data?.leads.length&&<p style={{fontSize:12,color:"#aaa"}}>لا توجد فرص بيع مسجلة في هذا المشروع بعد.</p>}
  </div>
  <div style={{...panel,marginTop:14}}><h2 style={{fontSize:18}}>مهام المتابعة</h2>
   {(data?.tasks??[]).map(t=><div key={String(t.id)} style={{padding:10,borderBottom:"1px solid #332b36"}}>{String(t.summary)} — {String(t.state)} · {String(t.priority)}</div>)}
   {!data?.tasks.length&&<p style={{color:"#aaa",fontSize:12}}>لا توجد مهام بعد.</p>}
  </div>
 </div></AppShell>
}
