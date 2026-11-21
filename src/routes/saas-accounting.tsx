import {useEffect,useState,type FormEvent} from "react";
import {createFileRoute,Link} from "@tanstack/react-router";
import {AppShell} from "@/components/AppShell";
import {supabase} from "@/lib/supabase";
import {getSaaSAccounting,postSaaSJournal} from "@/lib/saas-accounting.functions";
import {BookOpenCheck,ShieldCheck,RefreshCw} from "lucide-react";
export const Route=createFileRoute("/saas-accounting")({component:Accounting});
const tenantId="4e23ed6b-8430-475f-8eb4-c9d249e4c0e4";
type D=Awaited<ReturnType<typeof getSaaSAccounting>>;
const panel={background:"#111114",border:"1px solid #382d3d",borderRadius:15,padding:18} as const;
const field={background:"#09090B",color:"white",border:"1px solid #62516a",borderRadius:9,padding:"10px 12px",width:"100%"} as const;
const btn={background:"#823292",border:0,color:"white",borderRadius:9,padding:"10px 14px",cursor:"pointer"} as const;
function Accounting(){
 const [data,setData]=useState<D|null>(null),[description,setDescription]=useState("");
 const [debit,setDebit]=useState(""),[credit,setCredit]=useState(""),[amount,setAmount]=useState("");
 const [requestId,setRequestId]=useState(()=>crypto.randomUUID());
 const [msg,setMsg]=useState(""),[busy,setBusy]=useState(false);
 useEffect(()=>{void load();},[]);
 async function token(){const {data:{session}}=await supabase.auth.getSession();if(!session?.access_token)throw Error("يلزم تسجيل دخول Admin");return session.access_token;}
 async function load(){
  setBusy(true);try{setData(await getSaaSAccounting({data:{token:await token(),tenantId}}))}
  catch(e){setMsg("تعذر جلب دفتر الحسابات: "+(e instanceof Error?e.message:"خطأ"))}finally{setBusy(false)}
 }
 async function post(e:FormEvent){
  e.preventDefault();setBusy(true);setMsg("");
  try{const r=await postSaaSJournal({data:{token:await token(),tenantId,requestId,
   description:description.trim(),debitAccountId:debit,creditAccountId:credit,amountEGP:Number(amount)}});
   setMsg(r.posted?"تم تسجيل قيد متوازن في دفتر SaaS التجريبي":"لم يكتمل ترحيل القيد");
   if(r.posted){setRequestId(crypto.randomUUID());setDescription("");setAmount("");setDebit("");setCredit("");await load()}
  }catch(e){setMsg("القيد لم يُرحّل: "+(e instanceof Error?e.message:"خطأ"))}
  finally{setBusy(false)}
 }
 return <AppShell title="ERP — دفتر الحسابات">
 <div dir="rtl" style={{fontFamily:"Cairo,sans-serif",color:"#fff",paddingBottom:45}}>
  <Link to="/saas-erp" style={{fontSize:12,color:"#d2a0e7"}}>ERP / رجوع</Link>
  <h1 style={{fontSize:25,margin:"12px 0"}}><BookOpenCheck size={23} style={{display:"inline",marginLeft:6}}/>دفتر القيود والمحاسبة</h1>
  <div style={{...panel,marginBottom:13,fontSize:12,color:"#efca9a"}}><ShieldCheck size={16} style={{display:"inline",marginLeft:6}}/>دفتر تجريبي مستقل. لا يغيّر حسابات صدفة أو تحصيلات تالا أو الضرائب الحقيقية. القيود تُرحّل فقط عندما تتوازن جهتا المدين والدائن.</div>
  {msg&&<div role="status" style={{...panel,marginBottom:12,color:"#e6b2ef"}}>{msg}</div>}
  <form onSubmit={e=>void post(e)} style={{...panel,display:"grid",gap:11,marginBottom:13}}>
   <h2 style={{fontSize:18}}>قيد يدوي جديد</h2>
   <label>وصف القيد<input required minLength={3} maxLength={300} value={description} onChange={e=>setDescription(e.target.value)} style={field}/></label>
   <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(195px,1fr))",gap:10}}>
    <label>حساب مدين<select required value={debit} onChange={e=>setDebit(e.target.value)} style={field}><option value="">اختر حساب</option>{(data?.accounts??[]).map(a=><option key={String(a.id)} value={String(a.id)}>{String(a.code)} · {String(a.name)}</option>)}</select></label>
    <label>حساب دائن<select required value={credit} onChange={e=>setCredit(e.target.value)} style={field}><option value="">اختر حساب</option>{(data?.accounts??[]).map(a=><option key={String(a.id)} value={String(a.id)}>{String(a.code)} · {String(a.name)}</option>)}</select></label>
    <label>المبلغ بالجنيه<input required type="number" min="0.01" step="0.01" value={amount} onChange={e=>setAmount(e.target.value)} style={field}/></label>
   </div>
   <button disabled={busy||!debit||!credit||debit===credit} style={btn}>ترحيل القيد التجريبي المتوازن</button>
  </form>
  <div style={{...panel,marginBottom:13,overflowX:"auto"}}>
   <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"center"}}><h2 style={{fontSize:18}}>أرصدة دليل الحسابات</h2><button onClick={()=>void load()} style={btn}><RefreshCw size={13} style={{display:"inline",marginLeft:5}}/>تحديث</button></div>
   <table style={{width:"100%",minWidth:530,borderCollapse:"collapse",fontSize:12}}>
    <thead><tr style={{color:"#d8a7ea"}}>{["الحساب","النوع","مدين","دائن"].map(x=><th key={x} style={{textAlign:"right",padding:9}}>{x}</th>)}</tr></thead>
    <tbody>{(data?.balances??[]).map((x,i)=><tr key={i} style={{borderTop:"1px solid #362b3b"}}><td style={{padding:9}}>{String(x.code)} — {String(x.name)}</td>
     <td>{String(x.account_type)}</td><td>{(Number(x.debit_minor)/100).toLocaleString("en-US")}</td><td>{(Number(x.credit_minor)/100).toLocaleString("en-US")}</td></tr>)}</tbody>
   </table>
  </div>
  <div style={panel}><h2 style={{fontSize:18}}>آخر القيود</h2>
   {(data?.journals??[]).map(x=><div key={String(x.id)} style={{fontSize:12,borderBottom:"1px solid #362b3b",padding:"9px 0"}}>
     {String(x.description??x.reference)} · {String(x.state)} · {String(x.entry_date)}
    </div>)}
   {!data?.journals.length&&<p style={{color:"#aaa",fontSize:12}}>لا توجد قيود مدخلة بعد.</p>}
  </div>
 </div></AppShell>
}
