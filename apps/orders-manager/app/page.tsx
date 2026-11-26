'use client';
import { matchesOrderSearch } from '@/lib/order-search';
import { dashboardRequest, type WorkspaceOrder, type WorkspaceSource } from '@/lib/dashboard-bridge';
import { ordersManagerPath } from "@/lib/app-path";
import {useTranslation,LanguageSwitch} from '@/app/language';

import {customerPrintKey,printKeys,printDocuments} from '@/lib/print-history';
import {talaExpress,talaRate} from '@/lib/tala-shipping';
import {OrderDetails} from './order-details';
import {OrderInvoice} from '@/components/order-invoice';
import {TalaDestinationFields} from './tala-destination-fields';
import {TalaShipments} from './tala-shipments';
import {TalaSettings} from './tala-settings';
import {HomeyConversionsStatus} from './homey-conversions-status';
import {ShippingIntegrations} from './shipping-integrations';
import {canPrepareShipment} from '@/lib/shipping-handoff';
import {InstallApp} from './install-app';
import {OrderLocationFields} from './order-location-fields';
import {ProductPicker} from './product-picker';
import {WaybillPrintSheets} from '@/components/waybill-print-sheets';
import {useEffect,useRef,useState} from 'react';
import {LayoutDashboard,Package,Users,Settings,LogOut,Plus,Download,Trash2,Pencil,RefreshCcw,ShoppingBag,CheckCircle2,Printer,FileText,FileDown,XCircle,ArrowUpLeft,ShieldCheck,Menu,X,Truck,ChartNoAxesCombined,ChevronDown,Search} from 'lucide-react';
import type {Brand,Order,Customer,Item,Waybill,Status} from '@/lib/types';
import {statuses,statusLabels,govs,calculatedTotal,totalOf} from '@/lib/types';
import {HomeyLogo} from '@/components/homey-logo';

import {carrierAmounts,closedWithoutDelivery,collectionFromCustomer,productRevenue,collectionLabels,collectionState,collectionStates,shippingStates,financialWarnings,missingFinancialAmount,type CollectionState} from '@/lib/carrier-tracking';

// Financial reporting is deliberately read-only. Rates are estimates, never provider settlement records.
const displayCarrier=(name?:string)=>name?.trim()||'حودة';
const estimatedTalaFee=(governorate:string,city:string):number|null=>{
 const g=governorate.trim(),c=city.trim();
 if(g==='القاهرة'||g==='الجيزة'){
  if(g==='الجيزة'&&/اكتوبر|أكتوبر|الشيخ زايد|الصف|أطفيح|الواحات|البدرشين/i.test(c))return 87;
  return 82;
 }
 if(['الإسكندرية','البحيرة','الدقهلية','الغربية','المنوفية','كفر الشيخ','دمياط','بورسعيد','الإسماعيلية','السويس','الشرقية','القليوبية'].includes(g))return 92;
 if(['مطروح','جنوب سيناء','البحر الأحمر'].includes(g))return 142;
 if(['الفيوم','بني سويف','المنيا'].includes(g))return 112;
 if(['أسيوط','سوهاج','قنا','الأقصر','أسوان','الوادي الجديد'].includes(g))return 122;
 return null;
};
type Tab='dashboard'|'orders'|'carriers'|'shipping-integrations'|'customers'|'reports'|'settings';
const newOrder=(brand:Brand):Order=>({id:'',creationRequestId:crypto.randomUUID(),brand,createdAt:new Date().toLocaleDateString('en-CA'),updatedAt:'',version:0,customerName:'',phone:'',alternatePhone:'',governorate:'',city:'',address:'',source:'',paymentMethod:'الدفع عند الاستلام',prepaid:0,shipping:0,discount:0,items:[{name:'',sku:'',quantity:1,price:0}],status:'new',notes:'',assignedTo:'',deletedAt:''});
const newCustomer=(brand:Brand):Customer=>({id:'',brand,name:'',phone:'',alternatePhone:'',governorate:'',city:'',address:'',notes:'',createdAt:'',updatedAt:'',deletedAt:''});
const englishDigits=(value:string|number)=>String(value??'').replace(/[٠-٩]/g,d=>String(d.charCodeAt(0)-0x660)).replace(/[۰-۹]/g,d=>String(d.charCodeAt(0)-0x6f0));
const number=(n:number)=>new Intl.NumberFormat('en-US',{maximumFractionDigits:2,numberingSystem:'latn'}).format(n);
const dateEN=(date:string)=>{const d=new Date(date);return Number.isNaN(d.getTime())?'—':d.toLocaleDateString('en-GB',{day:'2-digit',month:'2-digit',year:'numeric',numberingSystem:'latn'})};
const enteredDate=new Intl.DateTimeFormat('en-GB',{dateStyle:'short',timeStyle:'short',timeZone:'Africa/Cairo',numberingSystem:'latn'});
const formatEntryDate=(value:string)=>{const date=new Date(value);return Number.isNaN(date.getTime())?'—':enteredDate.format(date)};
const cairoDay=new Intl.DateTimeFormat('en-CA',{year:'numeric',month:'2-digit',day:'2-digit',timeZone:'Africa/Cairo'});
const columns=['رقم الطلب','العميل','شركة الشحن','حالة الشحن','حالة التحصيل','العميل هيدفع','تكلفة الشحن','الصافي بعد الشحن','المستحق','المستلم','المتبقي','التليفون','العنوان','المنتجات','تاريخ الطلب','تاريخ الإدخال','الإجراءات'];
function exportCsv(rows:Order[]){const headers=['ID','Brand','Order date','Entry date','Customer','Phone','Governorate','City','Address','Items','Total','Shipping status','Carrier','Collection status','Due','Received','Remaining','Notes'];const data=rows.map(o=>[o.id,o.brand,o.createdAt,o.enteredAt||o.createdAt,o.customerName,o.phone,o.governorate,o.city,o.address,o.items.map(i=>`${i.name} × ${i.quantity}`).join(' | '),totalOf(o),statusLabels[o.status],o.shippingCompany,collectionLabels[collectionState(o)],carrierAmounts(o).due,carrierAmounts(o).received,carrierAmounts(o).remaining,o.notes]);const csv='\ufeff'+[headers,...data].map(a=>a.map(v=>'"'+String(v??'').replaceAll('"','""')+'"').join(',')).join('\r\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));a.download='orders-'+new Date().toISOString().slice(0,10)+'.csv';a.click();URL.revokeObjectURL(a.href)}
async function api(path:string,method='GET',body?:unknown){const response=await fetch(ordersManagerPath('/api/')+path,{method,headers:{'Content-Type':'application/json'},credentials:'same-origin',body:body===undefined?undefined:JSON.stringify(body),cache:'no-store'});const json=await response.json();if(!response.ok)throw new Error(json.error||'حدث خطأ');return json}
export default function Page(){
 const [embedded,setEmbedded]=useState(false);
 const [sessionAttempt,setSessionAttempt]=useState(0);
 const [sourceFilter,setSourceFilter]=useState<WorkspaceSource|'all'>('all');
 const [availableSources,setAvailableSources]=useState<Record<WorkspaceSource,boolean>|null>(null);
 const [sourceLimited,setSourceLimited]=useState(false);
 const [compactOrders,setCompactOrders]=useState(false);
 const [mobileLimit,setMobileLimit]=useState(40);
 const [refreshing,setRefreshing]=useState(false);
 const [refreshError,setRefreshError]=useState('');
 const readInFlight=useRef(false);
 const writeGeneration=useRef(0);
 useEffect(()=>{
  if(!embedded)return;
  const media=window.matchMedia('(max-width: 760px)');
  const update=()=>setCompactOrders(media.matches);
  update();
  media.addEventListener('change',update);
  return()=>media.removeEventListener('change',update);
 },[embedded]);
 const [permissions,setPermissions]=useState({create:false,confirm:false});
 const t=useTranslation();
 const money=(n:number)=>number(n)+' '+t('ج.م');
 const [auth,setAuth]=useState<boolean|null>(null),[email,setEmail]=useState(''),[brand,setBrand]=useState<Brand>('homey'),[tab,setTab]=useState<Tab>('dashboard'),[orders,setOrders]=useState<WorkspaceOrder[]>([]),[customers,setCustomers]=useState<Customer[]>([]),[waybills,setWaybills]=useState<Waybill[]>([]),[search,setSearch]=useState(''),[filter,setFilter]=useState('all'),[editing,setEditing]=useState<WorkspaceOrder|null>(null),[editCustomer,setEditCustomer]=useState<Customer|null>(null),[busy,setBusy]=useState(false),[err,setErr]=useState(''),[notice,setNotice]=useState(''),[loaded,setLoaded]=useState(false);
 const [deliveryChosen,setDeliveryChosen]=useState(false);
 const [orderLocations,setOrderLocations]=useState<Record<string,string[]>>({});
 const [orderLocationError,setOrderLocationError]=useState('');
 const [bulkLocation,setBulkLocation]=useState({governorate:'',city:''});
 async function loadOrderLocations(){
  setOrderLocationError('');
  try{setOrderLocations(embedded ? await dashboardRequest('locations') : (await api('order-locations')).data)}
  catch(e){setOrderLocationError((e as Error).message)}
 }
 useEffect(()=>{
  if(auth)void loadOrderLocations();
 },[auth,embedded]);
 const [password,setPassword]=useState(''),[showPassword,setShowPassword]=useState(false),[catalog,setCatalog]=useState<{name:string;sku:string;price:number;imageUrl?:string;imageUrls?:string[]}[]>([]),[catalogNotice,setCatalogNotice]=useState('');
 const [bulkEditing,setBulkEditing]=useState<Order[]>([]);
 const [pdfHelp,setPdfHelp]=useState(false);
 const [selected,setSelected]=useState<string[]>([]);
 const [bulkStatus,setBulkStatus]=useState<Status>('preparing');
 const [printed,setPrinted]=useState<Set<string>>(new Set());
 const [unprintedOnly,setUnprintedOnly]=useState(false);
 const [printError,setPrintError]=useState('');
 const [printOrders,setPrintOrders]=useState<Order[]>([]);
 const [printDate,setPrintDate]=useState('');
 const [printDates,setPrintDates]=useState<Record<string,string>>({});

 const [collectionFilter,setCollectionFilter]=useState<CollectionState|'all'>('all');
 const [carrierFilter,setCarrierFilter]=useState('');
 const [detailOrderId,setDetailOrderId]=useState('');
 const [invoiceOrderId,setInvoiceOrderId]=useState('');
 const [editorReturnId,setEditorReturnId]=useState('');
 const [shipmentDraft,setShipmentDraft]=useState<{brand:Brand;company:string;ids:string[]} | null>(null);
 const [shippingCompanies,setShippingCompanies]=useState<string[]>([]);
 const [companyName,setCompanyName]=useState('');
 const [companyError,setCompanyError]=useState('');
 const [customerHistory,setCustomerHistory]=useState<Customer|null>(null);
 const [collectionEdit,setCollectionEdit]=useState<{order:Order;mode:'partial'|'paid';amount:string}|null>(null);
 const [collectionError,setCollectionError]=useState('');
 const [printCopies,setPrintCopies]=useState<1|2|3>(3);
 useEffect(()=>{
  const saved=Number(localStorage.getItem('order-print-copies:'+brand));
  setPrintCopies(saved===1||saved===2?saved:3);
 },[brand]);
 const [navigationOpen,setNavigationOpen]=useState(false);
 const [period,setPeriod]=useState<'all'|'today'|'week'|'month'|'custom'>('all'),[fromDate,setFromDate]=useState(''),[toDate,setToDate]=useState('');
 const theme=embedded?{'--primary':'#823292','--primary-dark':'#642472','--soft':'#2a1530','--accent':'#a94fbc'} as React.CSSProperties:brand==='homey'?{'--primary':'#526647','--primary-dark':'#263b32','--soft':'#f0f4ec','--accent':'#bca57c'} as React.CSSProperties:{'--primary':'#713cad','--primary-dark':'#261432','--soft':'#f4ecfc','--accent':'#b490dc'} as React.CSSProperties;
 useEffect(()=>{let active=true;async function checkSession(){try{
  const context=new URLSearchParams(window.location.search);
  if(context.get('embedded')==='1'){
   setEmbedded(true);
   setBrand(context.get('brand')==='sodfa'?'sodfa':'homey');
   setTab('orders');
   const access=await dashboardRequest('access');
   if(active){setPermissions(access);setAuth(true)}
   return;
  }
const response=await fetch(ordersManagerPath('/api/whoami'),{credentials:'same-origin',cache:'no-store'});if(active){setAuth(response.ok);if(!response.ok&&response.status!==401)setErr('تعذر التحقق من تسجيل الدخول')}}catch(error){if(active){setAuth(false);setErr(error instanceof Error?error.message:'تعذر الاتصال بالسيرفر')}}}void checkSession();return()=>{active=false}},[sessionAttempt]);
 useEffect(()=>{if(embedded||!auth||brand!=='homey')return;let active=true;fetch(ordersManagerPath('/api/catalog'),{credentials:'same-origin',cache:'no-store'}).then(r=>r.json()).then(x=>{if(active){setCatalog(Array.isArray(x.data)?x.data:[]);setCatalogNotice(x.warning||'')}}).catch(()=>{if(active)setCatalogNotice('المنتجات غير متاحة دلوقتي؛ تقدر تضيفها يدويًا')});return()=>{active=false}},[auth,brand,embedded]);
 async function reload(){
  if(embedded){
   if(readInFlight.current)return;
   readInFlight.current=true;
   const generation=writeGeneration.current;
   setRefreshing(true);setRefreshError('');
   try{
    const result=await dashboardRequest('orders');
    if(generation!==writeGeneration.current)return;
    setOrders(current=>[
     ...result.orders,
     ...current.filter(order=>order.workspaceSource&&!result.available[order.workspaceSource]),
    ]);
    setAvailableSources(result.available);setSourceLimited(result.limited);setLoaded(true);
   }catch(error){setRefreshError((error as Error).message);setLoaded(true)}
   finally{
    readInFlight.current=false;setRefreshing(false);
    if(generation!==writeGeneration.current)void reload();
   }
   return;
  }
  setBusy(true);setErr('');
  try{
   const [a,b,c]=await Promise.all([api('orders'),api('customers'),api('waybills')]);
   setOrders(a.data);setCustomers(b.data);setWaybills(c.data);setLoaded(true);
  }catch(error){setErr((error as Error).message)}
  finally{setBusy(false)}
 }
 useEffect(()=>{if(auth)void reload()},[auth,embedded]);
 useEffect(()=>{
  if(embedded||!auth||brand!=='homey')return;
  let active=true,running=false;
  const sync=async()=>{
   if(running)return;
   running=true;
   try{
    const result=await api('shipping-integrations/tala','POST',{brand:'homey',operation:'sync-orders'});
    if(active&&(result.data?.updated??0)>0){
     const latest=await api('orders');
     if(active)setOrders(latest.data);
    }
   }catch{/* Keep the dashboard usable while Tala is temporarily unavailable. */}
   finally{running=false}
  };
  void sync();
  const timer=window.setInterval(()=>void sync(),180000);
  return()=>{active=false;window.clearInterval(timer)};
 },[auth,brand,embedded]);
 useEffect(()=>{
  if(embedded||!auth)return;
  let active=true;
  api('shipping-companies').then(result=>{if(active)setShippingCompanies(result.data)})
   .catch(error=>{if(active)setCompanyError(error.message)});
  return()=>{active=false};
 },[auth,embedded]);
 async function saveShippingCompany(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();
  setBusy(true);setCompanyError('');
  try{
   const {data}=await api('shipping-companies','POST',{name:companyName});
   setShippingCompanies(current=>[...new Set([...current,data])]);
   setCompanyName('');setNotice(t('تم حفظ شركة الشحن:')+' '+data);
  }catch(error){setCompanyError((error as Error).message)}
  finally{setBusy(false)}
 }
 useEffect(()=>{
  if(embedded||!auth)return;
  let active=true;
  const refreshPrintHistory=()=>api('print-history').then(result=>{if(active)setPrinted(previous=>new Set([...previous,...result.data]))}).catch(()=>{if(active)setErr('تعذر تحميل حالات الطباعة')});
  void refreshPrintHistory();
  window.addEventListener('focus',refreshPrintHistory);
  return()=>{active=false;window.removeEventListener('focus',refreshPrintHistory)};
 },[auth,embedded]);
 useEffect(()=>{
  if(!navigationOpen)return;
  const onKey=(event:KeyboardEvent)=>{if(event.key==='Escape')setNavigationOpen(false)};
  const onResize=()=>{if(window.innerWidth>1100)setNavigationOpen(false)};
  document.addEventListener('keydown',onKey);
  window.addEventListener('resize',onResize);
  const previousOverflow=document.body.style.overflow;
  if(window.innerWidth<=1100)document.body.style.overflow='hidden';
  return()=>{document.removeEventListener('keydown',onKey);window.removeEventListener('resize',onResize);document.body.style.overflow=previousOverflow};
 },[navigationOpen]);
 const inPeriod=(date:string)=>{if(period==='all')return true;const parsed=new Date(date);if(Number.isNaN(parsed.getTime()))return false;const d=cairoDay.format(parsed),today=new Date(cairoDay.format(new Date())+'T00:00:00');if(!/^\d{4}-\d{2}-\d{2}$/.test(d))return false;const dt=new Date(d+'T12:00:00');if(Number.isNaN(dt.getTime()))return false;if(period==='today')return dt.toDateString()===today.toDateString();if(period==='week'){const start=new Date(today);start.setDate(today.getDate()-((today.getDay()+6)%7));return dt>=start&&dt<=new Date(today.getTime()+86400000)}if(period==='month')return dt.getFullYear()===today.getFullYear()&&dt.getMonth()===today.getMonth();return (!fromDate||d>=fromDate)&&(!toDate||d<=toDate)};
 const brandOrders=orders.filter(o=>o.brand===brand).sort((a,b)=>Date.parse(b.enteredAt||b.createdAt)-Date.parse(a.enteredAt||a.createdAt));
 const detailOrder=brandOrders.find(order=>order.id===detailOrderId);
 const invoiceOrder=brandOrders.find(order=>order.id===invoiceOrderId);
 const canEditOrder=(order:WorkspaceOrder)=>!embedded||(permissions.create&&order.workspaceSource==='preview');
 function openOrderEditor(order:WorkspaceOrder, fromDetails=false){
  setEditorReturnId(fromDetails?order.id:'');
  setDetailOrderId('');setErr('');setEditing({...order});
 }
 function closeOrderEditor(){
  setEditing(null);
  if(editorReturnId)setDetailOrderId(editorReturnId);
  setEditorReturnId('');
 }

 const talaOrders=brandOrders.filter(order=>order.shippingCompany===talaExpress);
 const talaOrderIds=new Set(talaOrders.map(order=>order.id));
 const talaTrackingOrders=new Map(talaOrders.flatMap(order=>order.talaTrackingCode?[[order.talaTrackingCode,order.id] as const]:[]));
 const canRetryTala=Boolean(editing?.id&&editing.brand==='homey'&&editing.shippingCompany===talaExpress&&editing.talaDispatchState==='review'&&!closedWithoutDelivery(editing)&&editing.status!=='delivered');
 const reportSource=embedded&&tab!=='orders'&&sourceFilter==='all'?'manager':sourceFilter;
 const periodOrders=brandOrders.filter(o=>inPeriod(o.enteredAt||o.createdAt)&&(!embedded||reportSource==='all'||o.workspaceSource===reportSource));
 const matchesCarrier=(o:Order)=>!carrierFilter||displayCarrier(o.shippingCompany)===carrierFilter;
 const visible=periodOrders.filter(o=>matchesCarrier(o)&&(collectionFilter==='all'||collectionState(o)===collectionFilter)&&(tab!=='orders'||!unprintedOnly||!printed.has('order:'+o.id))&&(filter==='all'||(filter==='active'?o.status!=='cancelled':o.status===filter))&&matchesOrderSearch(o,search));
 const registeredCompanies=[...shippingCompanies].sort((a,b)=>a.localeCompare(b,'ar'));
 const carrierNames=[...new Set([...registeredCompanies,...brandOrders.map(o=>displayCarrier(o.shippingCompany))])].sort((a,b)=>a.localeCompare(b,'ar'));
 const reportOrders=periodOrders.filter(matchesCarrier);
 const totals=(rows:Order[])=>rows.reduce((acc,o)=>{
  const {due,received,remaining}=carrierAmounts(o);
  return {due:acc.due+due,received:acc.received+received,remaining:acc.remaining+remaining};
 },{due:0,received:0,remaining:0});
 const carrierGroups=new Map<string,Order[]>(carrierNames.filter(name=>!carrierFilter||carrierFilter===name).map(name=>[name,[]]));
 for(const order of reportOrders){
  const key=displayCarrier(order.shippingCompany);
  const rows=carrierGroups.get(key)??[];
  rows.push(order);
  carrierGroups.set(key,rows);
 }
 const allCustomerProfiles=new Map<string,Customer>();
 customers.filter(c=>c.brand===brand).forEach(c=>allCustomerProfiles.set(c.phone.replace(/\D/g,''),c));
 brandOrders.forEach(o=>{const key=englishDigits(o.phone).replace(/\D/g,'');if(!allCustomerProfiles.has(key))allCustomerProfiles.set(key,{id:'',brand,name:o.customerName,phone:o.phone,alternatePhone:o.alternatePhone,governorate:o.governorate,city:o.city,address:o.address,notes:'',createdAt:o.enteredAt||o.createdAt,updatedAt:o.updatedAt,deletedAt:''})});
 const activeCustomers=[...allCustomerProfiles.values()].filter(c=>(!unprintedOnly||!printed.has(customerPrintKey(c.brand,c.phone)))&&[c.name,c.phone,c.city].join(' ').toLowerCase().includes(search.toLowerCase())).sort((a,b)=>Date.parse(b.createdAt)-Date.parse(a.createdAt));
 const customerOrders=(phone:string)=>orders.filter(o=>o.brand===brand&&o.phone.replace(/\D/g,'')===phone.replace(/\D/g,''));
 const periodLabel:Record<typeof period,string>={all:'كل الفترات',today:'اليوم',week:'الأسبوع الحالي',month:'الشهر الحالي',custom:'فترة مخصصة'};
 async function logout(){await fetch(ordersManagerPath('/api/session'),{method:'DELETE',credentials:'same-origin'}).catch(()=>{});setAuth(false);setOrders([]);setCustomers([]);setWaybills([]);setSelected([]);setPrintOrders([]);setBulkEditing([])}
 const productHistory=new Map<string,Item>();
 for(const order of orders){
  if(order.brand!==brand)continue;
  for(const item of order.items){
   const key=item.sku+'|'+item.name;
   const existing=productHistory.get(key);
   if(!existing)productHistory.set(key,item);
   else if(!existing.imageUrl&&item.imageUrl)productHistory.set(key,{...existing,imageUrl:item.imageUrl});
  }
 }
 if(brand==='homey')for(const product of catalog){
  const key=product.sku+'|'+product.name;
  const previous=productHistory.get(key);
  productHistory.set(key,{...product,quantity:1,imageUrl:product.imageUrl||previous?.imageUrl});
 }
 const products=[...productHistory.values()];
 const selectedOrders=visible.filter(o=>selected.includes(o.id));
 // One calculation shared by the row values and the selection summary.
 // A confirmed Tala value outranks a locally saved fee; other carriers use
 // their saved fee or a clearly labelled estimate based on delivery area.
 function orderRowFinance(o:Order){
  const cod=collectionFromCustomer(o);
  const hasCod=!(missingFinancialAmount(o)||(cod===0&&o.items.length>0&&o.items.every(i=>i.price===0)&&o.manualCollection==null&&o.manualTotal==null));
  const tala=o.shippingCompany===talaExpress;
  const providerFee=tala?o.talaDeliveryFees:null;
  const localFee=o.shipping>0?o.shipping:null;
  const estimatedFee=estimatedTalaFee(o.governorate,o.city);
  const fee=providerFee??localFee??estimatedFee;
  const feeSource=providerFee!=null?'tala':localFee!=null?'saved':fee!=null?'estimated':'unknown';
  const confirmedNet=tala&&o.status==='delivered'?o.talaCustomerDue:null;
  const net=confirmedNet!=null?confirmedNet:hasCod&&fee!=null?Math.max(0,Math.round((cod-fee)*100)/100):null;
  return {cod:hasCod?cod:null,fee,feeSource,net,confirmedNet:confirmedNet!=null};
 }
 const selectedFinance=selectedOrders.reduce((sum,o)=>{
  const amount=orderRowFinance(o);
  return {cod:sum.cod+(amount.cod??0),fee:sum.fee+(amount.fee??0),net:sum.net+(amount.net??0),
   codMissing:sum.codMissing+(amount.cod===null?1:0),feeMissing:sum.feeMissing+(amount.fee===null?1:0),netMissing:sum.netMissing+(amount.net===null?1:0)};
 },{cod:0,fee:0,net:0,codMissing:0,feeMissing:0,netMissing:0});

 const shipmentCompany=selectedOrders[0]?.shippingCompany;
 const canPrepareSelection=shipmentCompany&&selectedOrders.every(order=>order.shippingCompany===shipmentCompany&&canPrepareShipment(order));
 function openShippingIntegration(company='', rows:Order[]=[]){
  setShipmentDraft({brand,company,ids:rows.filter(canPrepareShipment).map(order=>order.id)});
  setTab('shipping-integrations');
 }
 function showOrders(status='all',collection:CollectionState|'all'='all',company=''){
  setTab('orders');setFilter(status);setCollectionFilter(collection);setCarrierFilter(company);
  setSearch('');setSelected([]);setUnprintedOnly(false);
 }
 async function saveCollection(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();
  if(!collectionEdit||busy)return;
  const {order,amount,mode}=collectionEdit;
  const value=Number(amount);
  const {due}=carrierAmounts(order);
  if(!amount.trim()||!Number.isFinite(value)||value<=0||(mode==='partial'?value>=due:value<due)){
   setCollectionError(mode==='partial'?'اكتب مبلغ أكبر من صفر وأقل من المستحق.':'اكتب المبلغ المستلم بالكامل.');
   return;
  }
  if(await updateOrders([order],{carrierReceived:value}))setCollectionEdit(null);
 }
 function chooseCollection(order:Order,state:CollectionState){
  if(state==='unpaid'){
   if(order.carrierReceived&&!confirm(t('تصفير المبلغ المستلم المسجّل للأوردر؟')))return;
   void updateOrders([order],{carrierReceived:0});
   return;
  }
  setErr('');setCollectionError('');
  setCollectionEdit({order,mode:state,amount:state==='paid'?String(Math.max(carrierAmounts(order).due,order.carrierReceived??0)):String(order.carrierReceived||'')});
 }
 function carrierSelect(){
  return <select className="field" aria-label={t("فلتر شركة الشحن")} value={carrierFilter} onChange={e=>{setCarrierFilter(e.target.value);setSelected([])}}>
   <option value="">{t("كل شركات الشحن")}</option>{carrierNames.map(name=><option key={name} value={name}>{t(name)}</option>)}
  </select>;
 }
 function talaFinanceSummary(rows:Order[]){
  const orders=rows.filter(order=>order.shippingCompany===talaExpress&&order.talaStatusCode);
  if(!orders.length)return null;
  const amounts=orders.reduce((sum,order)=>({
   delivery:sum.delivery+(order.talaDeliveryFees??0),
   collected:sum.collected+(order.talaCollectedAmount??0),
   pending:sum.pending+(order.talaPendingCollectionAmount??0),
   fees:sum.fees+(order.talaCollectedFees??0),
   due:sum.due+(order.talaCustomerDue??0),
  }),{delivery:0,collected:0,pending:0,fees:0,due:0});
  return <><h3>{t("المبالغ المسجلة في تالا")}</h3><div className="tracking-grid tracking-finance tala-finance-grid">
   <div className="tracking-card tala-finance-delivery"><span>{t("رسوم الشحن حسب تالا")}</span><strong>{money(amounts.delivery)}</strong></div>
   <div className="tracking-card tala-finance-collected"><span>{t("المبلغ المحصل حسب تالا")}</span><strong>{money(amounts.collected)}</strong></div>
   <div className="tracking-card tala-finance-pending"><span>{t("المبلغ قيد التحصيل حسب تالا")}</span><strong>{money(amounts.pending)}</strong></div>
   <div className="tracking-card tala-finance-fees"><span>{t("رسوم تالا المحصلة")}</span><strong>{money(amounts.fees)}</strong></div>
   <div className="tracking-card tala-finance-due"><span>{t("المستحق حسب تالا")}</span><strong>{money(amounts.due)}</strong></div>
   <p className="muted" style={{gridColumn:'1 / -1'}}>هذه حقول مالية راجعة من تكامل تالا للطلبات المتزامنة فقط. «المبلغ المحصل» يعني ما حصّلته تالا من العميل، وليس ما حُوِّل لحسابك. «رسوم تالا المحصلة» حقل منفصل عن «رسوم الشحن»؛ صفر لا يعني إعفاءً من الشحن. وتحتاج التحويلات الفعلية إلى كشف تسوية.</p>
  </div></>;
 }
 function carrierFinanceBreakdown(rows:Order[]){
  const companies=[...new Set(rows.map(o=>displayCarrier(o.shippingCompany)))].sort((a,b)=>a.localeCompare(b,'ar'));
  const data=companies.map(company=>{
   const entries=rows.filter(o=>displayCarrier(o.shippingCompany)===company);
   const delivered=entries.filter(o=>o.status==='delivered');
   const pending=entries.filter(o=>!['delivered','cancelled','returned','refused'].includes(o.status));
   const failed=entries.filter(o=>['cancelled','returned','refused'].includes(o.status));
   const gross=(subset:Order[])=>subset.reduce((n,o)=>n+collectionFromCustomer(o),0);
   const estimatedFee=(o:Order)=>estimatedTalaFee(o.governorate,o.city);
   const actualFee=(o:Order)=>company===talaExpress?(o.talaDeliveryFees??null):null;
   const feeFor=(o:Order)=>actualFee(o)??estimatedFee(o)??0;
   const estimatedNet=(subset:Order[])=>subset.reduce((n,o)=>n+Math.max(0,collectionFromCustomer(o)-feeFor(o)),0);
   const missingRate=entries.filter(o=>estimatedFee(o)===null&&actualFee(o)===null).length;
   const received=entries.reduce((n,o)=>n+(o.carrierReceived??0),0);
   const deliveredNet=delivered.filter(o=>!missingFinancialAmount(o)).reduce((n,o)=>n+(company===talaExpress&&o.talaCustomerDue!=null?o.talaCustomerDue:Math.max(0,collectionFromCustomer(o)-feeFor(o))),0);
   const reviewCount=delivered.filter(o=>missingFinancialAmount(o)||financialWarnings(o).some(w=>w.includes('صافي المستحق'))).length;
   return {company,entries,delivered,pending,failed,grossDelivered:gross(delivered),grossPending:gross(pending),grossFailed:gross(failed),deliveredNet,pendingNet:estimatedNet(pending),feesDelivered:delivered.reduce((n,o)=>n+feeFor(o),0),received,missingRate,reviewCount};
  });
  return <section className="panel tracking-overview carrier-settlement" aria-label="تفاصيل حسابات شركات الشحن">
   <h2>حساب كل شركة شحن — المسلّم والمتوقع والمرتجعات</h2>
   <p className="muted">«حودة» هو اسم العرض للطلبات المسجلة بدون شركة شحن. الرسوم التقديرية على طريقة تالا حسب المحافظة (82–142 جنيهًا) لا تغيّر بيانات الطلبات ولا تُعد كشف تسوية. تالا المباشر يُستخدم له المستحق ورسوم التوصيل المزامنان عند توفرهما.</p>
   <div className="tracking-table-scroll carrier-settlement-scroll" tabIndex={0} role="region" aria-label="الجدول المالي الكامل؛ مرّر أفقيًا لإظهار جميع الأعمدة">
    <table className="table tracking-table carrier-settlement-table"><thead><tr>
     <th>شركة الشحن</th><th>كل الطلبات</th><th>المسلّم</th><th>المنتظر</th><th>الملغي/المرتجع</th><th>تحصيل المسلّم</th><th>شحن المسلّم (فعلي/تقديري)</th><th>صافي المسلّم</th><th>قيمة المنتظر</th><th>صافي المنتظر المتوقع</th><th>قيمة الملغي/المرتجع</th><th>المستلم المسجل</th><th>المتبقي التقريبي من المسلّم</th>
    </tr></thead><tbody>{data.map(x=><tr key={x.company}>
     <th scope="row">{x.company}</th><td>{number(x.entries.length)}</td><td>{number(x.delivered.length)}</td><td>{number(x.pending.length)}</td><td>{number(x.failed.length)}</td><td>{money(x.grossDelivered)}</td><td>{money(x.feesDelivered)}</td><td><strong>{money(x.deliveredNet)}</strong>{x.reviewCount>0&&<small className="finance-warning">+ {number(x.reviewCount)} طلب يحتاج مراجعة</small>}</td><td>{money(x.grossPending)}</td><td>{money(x.pendingNet)}</td><td>{money(x.grossFailed)}</td><td>{money(x.received)}</td><td><strong>{money(Math.max(0,x.deliveredNet-x.received))}</strong></td>
    </tr>)}</tbody></table>
   </div>
   <p className="muted">تقدر تسكرول الجدول يمين وشمال على الموبايل لعرض كل الأعمدة بدون قصّ بيانات. «المتبقي التقريبي من المسلّم» = صافي الطلبات المسلّمة ناقص المستلم المسجل يدويًا؛ مش مديونية مؤكدة قبل مطابقة كشوف التحويلات. لا تُحتسب الطلبات الجديدة أو المرتجعة كأموال محصلة.</p>
   {data.map(x=><details className="carrier-order-details" key={x.company}>
    <summary>{x.company} — تفاصيل كل الأوردرات ({number(x.entries.length)})</summary>
    <div className="tracking-table-scroll carrier-settlement-scroll" tabIndex={0}>
     <table className="table carrier-settlement-table"><thead><tr><th>الطلب</th><th>الحالة</th><th>المنتجات</th><th>المحافظة / المنطقة</th><th>تحصيل العميل</th><th>رسوم الشحن</th><th>الصافي التقديري</th><th>المستلم</th><th>نوع الحساب</th></tr></thead><tbody>
     {x.entries.map(o=>{
      const actual=x.company===talaExpress&&o.talaDeliveryFees!=null;
      const fee=actual?o.talaDeliveryFees!:estimatedTalaFee(o.governorate,o.city);
      const due=o.status==='delivered'&&x.company===talaExpress&&o.talaCustomerDue!=null?o.talaCustomerDue:fee===null?null:Math.max(0,collectionFromCustomer(o)-fee);
      return <tr key={o.id}><td><button type="button" className="order-name-link" onClick={()=>setDetailOrderId(o.id)}>#{o.id.slice(0,8).toUpperCase()}</button></td>
       <td>{t(statusLabels[o.status])}</td><td>{o.items.map(i=>i.name+' × '+i.quantity).join('، ')}</td><td>{o.governorate} / {o.city}</td><td>{money(collectionFromCustomer(o))}</td><td>{fee===null?'تحتاج تسعير':money(fee)}</td><td>{missingFinancialAmount(o)?<span className="finance-review">يحتاج مراجعة</span>:due===null?'—':money(due)}{financialWarnings(o).length>0&&<small className="finance-warning" title={financialWarnings(o).join('؛ ')}>بيانات متعارضة</small>}</td><td>{money(o.carrierReceived??0)}</td><td>{o.status!=='delivered'?'غير مسلّم':actual?'رسوم تالا المسجلة':'تقديري حسب المنطقة'}</td>
      </tr>;
     })}</tbody></table>
    </div>
   </details>)}
  </section>;
 }
 function salesSummary(rows:Order[]){
  const amounts=rows.reduce((sum,order)=>{
   if(closedWithoutDelivery(order))return sum;
   return {shipping:sum.shipping+order.shipping,products:sum.products+productRevenue(order)};
  },{shipping:0,products:0});
  return <div className="tracking-grid tracking-finance">
   <div className="tracking-card"><span>{t("إجمالي تكلفة الشحن للطلبات")}</span><strong>{money(amounts.shipping)}</strong></div>
   <div className="tracking-card"><span>{t("إجمالي قيمة المنتجات بعد فصل الشحن")}</span><strong>{money(amounts.products)}</strong></div>
  </div>;
 }
 function financeSummary(rows:Order[]){
  const amounts=totals(rows);
  return <div className="tracking-grid tracking-finance">
   <div className="tracking-card tracking-partial" title="تقدير من كل الطلبات غير المغلقة، ويشمل الطلبات الجديدة وقيد الشحن، ولا يعني المبالغ التي تم تسليمها"><span>المستحق النظري لكل الطلبات (ليس المحصل فقط)</span><strong>{money(amounts.due)}</strong></div>
   <div className="tracking-card tracking-paid"><span>{t("المستلم من شركات الشحن")}</span><strong>{money(amounts.received)}</strong></div>
   <div className="tracking-card tracking-unpaid"><span>{t("المتبقي")}</span><strong>{money(amounts.remaining)}</strong></div>
   <p className="muted" style={{gridColumn:'1 / -1'}}>هذه أرصدة نظرية من الأوردرات المسجلة؛ «المتبقي» لا يساوي بالضرورة مديونية شركات الشحن، لأنه قد يشمل أوردرات لم تُسلّم بعد. راجع جدول تفصيل كل شركة أدناه.</p>
  </div>;
 }
 function carrierTable(){
  return <div className="tracking-table-scroll"><table className="table tracking-table">
   <thead><tr>{['شركة الشحن','لدى الشركة','تم التسليم','المرتجع','المستحق','المستلم','المتبقي'].map(label=><th key={label}>{t(label)}</th>)}</tr></thead>
   <tbody>{[...carrierGroups].map(([name,rows])=>{
    const amounts=totals(rows);
    return <tr key={name}><th scope="row">{name==='حودة'?name:<button className="btn tiny secondary" onClick={()=>showOrders('all','all',name)}>{name}</button>}</th>
     <td>{number(rows.filter(o=>o.status==='shipped').length)}</td><td>{number(rows.filter(o=>o.status==='delivered').length)}</td>
     <td>{number(rows.filter(o=>o.status==='returned').length)}</td><td>{money(amounts.due)}</td><td>{money(amounts.received)}</td><td>{money(amounts.remaining)}</td></tr>;
   })}</tbody>
  </table>{!carrierGroups.size&&<div className="empty">{t("مفيش أوردرات في الفترة دي.")}</div>}</div>;
 }
 const printFilter=<label><input type="checkbox" checked={unprintedOnly} onChange={e=>{setUnprintedOnly(e.target.checked);setSelected([])}}/>{t("لم تُطبع بعد")}</label>;
 function printBadge(done:boolean){
  return <span className={'print-badge'+(done?' printed':'')}>{done?t("تم طلب الطباعة"):t("لم تُطبع بعد")}</span>;
 }
 function preview(rows:Order[]){
  setPrintError('');
  setPrintDate(new Date().toLocaleDateString('en-CA'));
  setPdfHelp(false);
  setPrintDates({});
  setPrintOrders(rows);
 }
 function fromCustomer(c:Customer){
  const latest=customerOrders(c.phone).slice().sort((a,b)=>b.createdAt.localeCompare(a.createdAt))[0];
  preview([{...(latest??newOrder(c.brand)),customerName:c.name,phone:c.phone,
   alternatePhone:c.alternatePhone||latest?.alternatePhone||'',governorate:c.governorate||latest?.governorate||'',
   city:c.city||latest?.city||'',address:c.address||latest?.address||''}]);
 }
 function printable(o:Order):Waybill{
  const saved=waybills.find(w=>w.brand===o.brand&&(o.id?w.orderId===o.id:w.phone===o.phone));
  if(saved)return {...saved,address:o.address?.trim()||saved.address,invoiceAmount:totalOf(o),shippingCost:0,prepaid:o.prepaid,collectionAmount:collectionFromCustomer(o)};
  const invoiceAmount=totalOf(o);
  return {id:o.id||o.phone,orderId:o.id||null,customerId:null,brand:o.brand,createdAt:printDate+'T12:00:00',updatedAt:o.updatedAt,
   reference:o.id?'#'+o.id.slice(0,8).toUpperCase():'—',customerName:o.customerName,phone:o.phone,
   alternatePhone:o.alternatePhone,governorate:o.governorate,city:o.city,address:o.address,
   invoiceAmount,shippingCost:0,prepaid:o.prepaid,collectionAmount:collectionFromCustomer(o),
   paymentMethod:o.paymentMethod,description:o.items.filter(i=>i.name).map(i=>i.name+' × '+i.quantity).join('، '),notes:o.notes};
 }
 async function updateOrders(rows:WorkspaceOrder[],action:Status|'delete'|Partial<Order>){
  if(!rows.length||busy)return;
  if((action==='delete'||action==='cancelled')&&!confirm(t(action==='delete'?'حذف الطلبات المحددة؟':'إلغاء الطلبات المحددة؟')))return;
  setBusy(true);setErr('');setNotice('');
  const completed:string[]=[];
  const errors:string[]=[];
  for(const order of rows){
   try{
    if(embedded){
     if(order.workspaceSource!=='preview'||action!=='confirmed'||!permissions.confirm)throw new Error('العملية غير متاحة في المعاينة.');
     const result=await dashboardRequest('confirm',{id:order.id,version:order.version});
     writeGeneration.current++;
     setOrders(current=>current.map(o=>o.id===order.id?{...o,status:result.status,version:result.version}:o));
    }else if(action==='delete'){
     await api('orders','DELETE',{id:order.id,version:order.version});
     setOrders(current=>current.filter(o=>o.id!==order.id));
    }else{
     const next={...order,...(typeof action==='string'?{status:action}:action)};
     if(next.shippingCompany!==order.shippingCompany||next.governorate!==order.governorate||next.city!==order.city){
      if(next.shippingCompany===talaExpress&&typeof action!=='string'&&action.shipping===undefined){
       const rate=talaRate(next.shippingCompany,next.governorate,next.city);
       // Assign the carrier now; if the exact Tala rate is unknown, keep the existing fee until staff review.
       if(rate!==undefined)next.shipping=rate;
      }else if(order.shippingCompany===talaExpress&&next.shippingCompany!==talaExpress){
       next.shipping=0;
      }
     }
     const result=await api('orders','POST',next);
     setOrders(current=>current.map(o=>o.id===order.id?{...result.data,enteredAt:o.enteredAt||o.createdAt}:o));
    }
    completed.push(order.id);
   }catch(e){errors.push((e as Error).message)}
  }
  setSelected(current=>current.filter(id=>!completed.includes(id)));
  if(completed.length)setNotice(t('تم تحديث')+' '+number(completed.length)+' '+t('طلب'));
  if(errors.length)setErr(t('تعذّر تحديث')+' '+number(errors.length)+' '+t('طلب.')+' '+t(errors[0]));
  setBulkEditing(current=>current.filter(order=>!completed.includes(order.id)));
  setBusy(false);
  return errors.length===0;
 }
 function saveBulk(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();
  const fields=new FormData(e.currentTarget);
  const patch:Partial<Order>={};
  for(const key of ['governorate','city','source','paymentMethod','assignedTo','notes'] as const){
   const value=String(fields.get(key)??'').trim();
   if(value)patch[key]=value;
  }
  for(const key of ['shipping','discount','prepaid'] as const){
   const value=String(fields.get(key)??'');
   if(value!=='')patch[key]=Number(value);
  }
  if(!Object.keys(patch).length){setErr('ادخل قيمة في خانة واحدة على الأقل');return}
  void updateOrders(bulkEditing,patch).then(done=>{if(done)setBulkLocation({governorate:'',city:''})});
 }
 async function saveOrder(e:React.FormEvent<HTMLFormElement>){e.preventDefault();if(!editing||busy)return;
  if(embedded){
   if(!permissions.create||(editing.id&&!canEditOrder(editing)))return;
   setBusy(true);setErr('');
   try{
    const isEditing=Boolean(editing.id);
    const {order}=await dashboardRequest(isEditing?'edit':'create',editing);
    writeGeneration.current++;
    setOrders(current=>isEditing?current.map(existing=>existing.id===order.id?order:existing):[order,...current.filter(existing=>existing.id!==order.id)]);
    setLoaded(true);
    closeOrderEditor();
    if(!isEditing){
     setSourceFilter('preview');setPeriod('all');setSearch('');setSelected([]);
     setFilter('all');setCarrierFilter('');setCollectionFilter('all');setUnprintedOnly(false);
    }
    setNotice(isEditing?'تم حفظ تعديلات الطلب':'تم حفظ الطلب التجريبي');
   }catch(error){setErr((error as Error).message)}
   finally{setBusy(false)}
   return;
  }
  const fields=new FormData(e.currentTarget);
  const submitter=(e.nativeEvent as SubmitEvent).submitter;
  const retryTala=submitter instanceof HTMLButtonElement&&submitter.value==='retry-tala';
  if(editing.shippingCompany===talaExpress&&talaRate(talaExpress,editing.governorate,editing.city)===undefined&&editing.shipping<=0){
   setErr('اكتب تكلفة شحن تالا للمنطقة دي قبل الحفظ.');return;
  }
  setBusy(true);setErr('');try{const {tala}=await api('orders','POST',{...editing,retryTala,talaDestination:{
   serviceId:Number(fields.get('talaService')),zoneId:Number(fields.get('talaZone')),subzoneId:Number(fields.get('talaSubzone')),
   weight:Number(fields.get('talaWeight')),piecesCount:Number(fields.get('talaPieces')),typeCode:fields.get('talaType'),openableCode:fields.get('talaOpenable'),
  }});closeOrderEditor();setNotice(tala?.state==='sent'?t('تم إرسال الشحنة لتالا. رقم التتبع')+' '+tala.trackingCode
   :tala?.state==='review'?'اتحفظ الأوردر. راجع مرجعه في تالا قبل ما تبعته مرة تانية.'
   :tala?.state==='unavailable'?'اتحفظ الأوردر، والإرسال لتالا غير متاح دلوقتي.':'تم حفظ الطلب');await reload()}catch(e){setErr((e as Error).message)}finally{setBusy(false)}}
 async function saveCustomer(e:React.FormEvent){e.preventDefault();if(!editCustomer)return;setBusy(true);setErr('');try{await api('customers','POST',editCustomer);setEditCustomer(null);setNotice('تم حفظ العميل');await reload()}catch(e){setErr((e as Error).message)}finally{setBusy(false)}}
 async function deleteCustomer(c:Customer){if(!confirm(t('حذف العميل من القائمة؟')))return;setBusy(true);try{await api('customers','DELETE',{id:c.id,brand:c.brand});await reload()}catch(e){setErr((e as Error).message)}finally{setBusy(false)}}
 if(embedded&&!auth)return <div className="app" data-embedded style={theme}><main className="main">
  <p role={auth===false?'alert':'status'}>{auth===false?err:'جاري فتح إدارة الطلبات…'}</p>
  {auth===false&&<button type="button" className="btn secondary"
   onClick={()=>{setAuth(null);setErr('');setSessionAttempt(attempt=>attempt+1)}}>إعادة المحاولة</button>}
 </main></div>;
 if(auth===null)return <div className="login" style={theme}><section className="panel login-card"><div className="logo-circle"><ShieldCheck size={25}/></div><h2>{t("تأمين لوحة الإدارة")}</h2><p className="muted">{t("جاري التحقق من صلاحية الدخول…")}</p></section></div>;
 if(!auth)return <div className="login login-split" style={theme}>
 <aside className="login-showcase"><div className="showcase-head"><div className="showcase-login-logo"><HomeyLogo className="login-homey-logo"/></div><span className="showcase-sodfa-brand">&amp; SODFA</span></div><h2>{t("نظام إدارة الطلبات")}</h2><p>{t("إدارة المتجرين من مكان واحد — عملاء، أوردرات، شحن وفواتير.")}</p><div className="showcase-cards"><div><ShoppingBag/><strong>{t("الأوردرات")}</strong><small>{t("متابعة كل طلب")}</small></div><div><Users/><strong>{t("العملاء")}</strong><small>{t("بيانات محفوظة")}</small></div><div><Printer/><strong>{t("الفواتير")}</strong><small>{t("طباعة بسهولة")}</small></div></div><div className="showcase-stamp">PRIVATE ORDER WORKSPACE</div></aside>
 <section className="panel login-premium"><div className="logo-circle"><ShieldCheck size={28}/></div><div className="toolbar login-language"><p className="login-eyebrow">HOMEY & SODFA</p><LanguageSwitch/></div><h1>{t("تسجيل الدخول")}</h1><p className="muted">{t("ادخل بحساب الإدارة الخاص بيك علشان تتابع الطلبات.")}</p>{err&&<div className="notice error">{t(err)}</div>}
 <form onSubmit={async(e)=>{e.preventDefault();setBusy(true);setErr('');try{const r=await fetch(ordersManagerPath('/api/session'),{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify({email,password})});const x=await r.json();if(!r.ok)throw Error(x.error||'تعذر تسجيل الدخول');setPassword('');setAuth(true);setNotice('تم تسجيل الدخول بنجاح')}catch(e){setErr(e instanceof Error?e.message:'تعذر تسجيل الدخول')}finally{setBusy(false)}}}>
 <label>{t("البريد الإلكتروني")}<input autoComplete="username" type="email" className="field" placeholder="example@domain.com" dir="ltr" value={email} onChange={e=>setEmail(e.target.value)} required/></label>
 <label>{t("كلمة المرور")}<div className="password-wrap"><input id="staff-password" name="password" autoComplete="current-password" type={showPassword?'text':'password'} className="field" placeholder={t("اكتب كلمة المرور")} dir="ltr" value={password} onChange={e=>setPassword(e.target.value)} required/><button type="button" className="password-toggle" aria-controls="staff-password" aria-label={showPassword?t("إخفاء كلمة المرور"):t("إظهار كلمة المرور")} aria-pressed={showPassword} onClick={()=>setShowPassword(v=>!v)}>{showPassword?t("إخفاء"):t("إظهار")}</button></div></label>
 <button className="btn login-submit" disabled={busy}>{busy?t("جاري تسجيل الدخول…"):t("دخول إلى لوحة التحكم")} <ArrowUpLeft size={17}/></button><InstallApp/><div className="login-foot"><ShieldCheck size={15}/>{t("دخول آمن لحسابات الإدارة المصرّح لها فقط")}</div></form>
 </section></div>;
 if(embedded&&invoiceOrder)return <OrderInvoice order={invoiceOrder}
  onBack={()=>setInvoiceOrderId('')}
  backLabel={detailOrderId?'الرجوع لتفاصيل الطلب':undefined}
  onPrint={()=>{window.print();setPrinted(current=>new Set([...current,...printKeys([invoiceOrder])]))}}/>;
 const nav:[Tab,string,React.ReactNode][]=[['dashboard','الرئيسية',<LayoutDashboard size={19} key="a"/>],['orders','الأوردرات',<Package size={19} key="b"/>],['carriers','شركات الشحن',<Truck size={19}/>],['shipping-integrations','ربط شركات الشحن',<Truck size={19}/>],['customers','العملاء',<Users size={19} key="c"/>],['reports','التقارير',<ChartNoAxesCombined size={19}/>],['settings','الإعدادات',<Settings size={19} key="d"/>]];
 return <div className="app" data-embedded={embedded||undefined} data-brand={brand} data-waybill-print={printOrders.length>0?'active':undefined} style={theme}>
 {navigationOpen&&<button type="button" className="mobile-nav-backdrop" aria-label={t("إغلاق قائمة التنقل")} onClick={()=>setNavigationOpen(false)}/>}
 <aside className={'sidebar '+(navigationOpen?'sidebar-open':'')} id="app-main-navigation" aria-label={t("القائمة الرئيسية")}>
 <div className="sidebar-mobile-header"><span>{t("القائمة الرئيسية")}</span><button type="button" aria-label={t("إغلاق القائمة")} onClick={()=>setNavigationOpen(false)}><X size={23}/></button></div><div className={'brand '+(brand==='homey'?'homey-brand':'')} role="group" aria-label={brand==='homey'?t("هومي — لوحة الإدارة"):t("صدفة — لوحة الإدارة")}>{brand==='homey'?<div className="brand-logo-surface"><HomeyLogo className="dashboard-homey-logo"/></div>:<img src={ordersManagerPath("/sodfa-logo.png")} alt={t("صدفة — SODFA")} width={1950} height={808} style={{display:"block",width:"100%",maxWidth:180,height:"auto",borderRadius:8}}/>}</div><nav className="nav" aria-label={t("أقسام مدير الطلبات")}>{nav.filter(([key])=>!embedded||['dashboard','orders','reports'].includes(key)).map(([key,label,icon])=><button key={key} type="button" className={tab===key?'active':''} aria-current={tab===key?'page':undefined} onClick={()=>{if(key==='shipping-integrations'&&tab!==key)setShipmentDraft(null);setTab(key);setUnprintedOnly(false);setSelected([]);setFilter('all');setCollectionFilter('all');setCarrierFilter('');setSearch('');setNavigationOpen(false)}}>{icon} <span className="label">{t(label)}</span></button>)}</nav><div className="sidebar-bottom"><ShieldCheck size={17}/><span>{t("لوحة إدارة خاصة وآمنة")}<small>PRIVATE DASHBOARD</small></span></div></aside><main className="main"><header className="header"><div className="header-heading"><button type="button" className="mobile-nav-trigger" aria-label={t("فتح القائمة الجانبية")} aria-controls="app-main-navigation" aria-expanded={navigationOpen} onClick={()=>setNavigationOpen(true)}><Menu size={22}/><span>{t("القائمة")}</span></button><div className="header-title"><h1>{t(nav.find(([key])=>key===tab)?.[1]??'')}</h1></div></div><div className="toolbar top-actions"><LanguageSwitch/>{!embedded&&<><InstallApp/><div className="brand-switch" role="group" aria-label={t("اختيار المتجر")}><button type="button" className={'brand-switch-option '+(brand==='homey'?'active':'')} aria-pressed={brand==='homey'} onClick={()=>{setBrand('homey');setSearch('');setFilter('all');setCollectionFilter('all');setCarrierFilter('')}}><HomeyLogo className="switch-homey-logo"/></button><button type="button" className={'brand-switch-option '+(brand==='sodfa'?'active':'')} aria-pressed={brand==='sodfa'} onClick={()=>{setBrand('sodfa');setSearch('');setFilter('all');setCollectionFilter('all');setCarrierFilter('')}}><img src={ordersManagerPath("/sodfa-logo.png")} alt={t("صدفة")} className="switch-sodfa-logo" width={1950} height={808}/></button></div></>}<button className="btn secondary" title={t("تحديث")} aria-label={t("تحديث")} onClick={reload} disabled={busy||refreshing} aria-busy={refreshing}><RefreshCcw size={16}/></button>{!embedded&&<button className="btn secondary" title={t("خروج")} onClick={logout}><LogOut size={16}/></button>}</div></header>{['dashboard','orders','carriers','reports'].includes(tab)&&<div className="periodbar"><strong>{t("الفترة حسب تاريخ الإدخال")}</strong><select className="field" value={period} onChange={e=>setPeriod(e.target.value as typeof period)}><option value="today">{t("النهارده")}</option><option value="week">{t("الأسبوع الحالي")}</option><option value="month">{t("الشهر الحالي")}</option><option value="all">{t("كل الوقت")}</option><option value="custom">{t("تحديد فترة")}</option></select>{period==='custom'&&<><label>{t("من")} <input className="field" type="date" value={fromDate} onChange={e=>setFromDate(e.target.value)}/></label><label>{t("إلى")} <input className="field" type="date" value={toDate} onChange={e=>setToDate(e.target.value)}/></label></>}<span className="muted">{t("إحصائيات")} {brand==='homey'?t("هومي"):t("صدفة")} <span className="period-dot">•</span> {t(periodLabel[period])}</span></div>}{err&&<div className="notice error">{t(err)}</div>}{notice&&<div className="notice">{t(notice)} <button className="btn tiny secondary" onClick={()=>setNotice('')}>{t("إغلاق")}</button></div>}
 {tab==='dashboard'&&<>
  {!embedded&&brand==='homey'&&<TalaShipments brand="homey" revision={0} orderIds={talaOrderIds}
   trackingOrders={talaTrackingOrders} openOrder={setDetailOrderId} onSettings={()=>openShippingIntegration(talaExpress)} dashboard/>}
  <section className="panel tracking-overview"><h2>{t("المبيعات والشحن والتحصيل")}</h2>{salesSummary(periodOrders)}{financeSummary(periodOrders)}{brand==='homey'&&talaFinanceSummary(periodOrders)}</section>{carrierFinanceBreakdown(periodOrders)}
  <section className="panel tracking-overview">
   <h2>{t("حالات الشحن")}</h2><div className="tracking-grid tracking-shipping">{shippingStates.map(status=><button key={status} className={'tracking-card tracking-'+status} onClick={()=>showOrders(status)}><span>{t(statusLabels[status])}</span><strong>{number(periodOrders.filter(o=>o.status===status).length)}</strong></button>)}</div>
   <h2>{t("حالات التحصيل")}</h2><div className="tracking-grid tracking-finance">{collectionStates.map(state=><button key={state} className={'tracking-card tracking-'+state} onClick={()=>showOrders('all',state)}><span>{t(collectionLabels[state])}</span><strong>{number(periodOrders.filter(o=>collectionState(o)===state).length)}</strong></button>)}</div>
  </section>
  <section className="panel"><div className="sectionhead"><h2>{t("أحدث الأوردرات")}</h2><div className="toolbar"><button className="btn secondary" onClick={()=>{setPeriod('all');showOrders()}}>{t("عرض كل الأوردرات")}</button><button className="btn" disabled={embedded&&!permissions.create} onClick={()=>{setErr('');setDeliveryChosen(embedded);setEditing(newOrder(brand))}}><Plus size={16}/>{t("إضافة أوردر")}</button></div></div>{table(periodOrders.slice(0,8))}</section>
 </>}
 {embedded&&(refreshError||refreshing)&&<div className="workspace-refresh" role="status">
  {refreshing?'جاري تحديث الطلبات…':<>{refreshError} <button type="button" className="btn secondary tiny" onClick={reload}>إعادة المحاولة</button></>}
 </div>}
 {embedded&&availableSources&&(!availableSources.manager||!availableSources.preview||sourceLimited)&&
  <p className="muted" role="status">
   {!availableSources.manager&&'تعذر تحميل طلبات مدير الطلبات. '}
   {!availableSources.preview&&'تعذر تحميل الطلبات التجريبية. '}
   {sourceLimited&&'المعروض أحدث ٥٠٠ طلب لكل مصدر.'}
  </p>}
 {embedded&&<div className="source-filters" role="group" aria-label="مصدر الطلبات">
  {([['all','كل الطلبات'],['manager','مدير الطلبات'],['preview','طلبات المعاينة']] as const).map(([key,label])=>
   (tab==='orders'||key!=='all')&&<button key={key} type="button" className="btn secondary" aria-pressed={reportSource===key}
    onClick={()=>{setSourceFilter(key);setSelected([])}}>{label}</button>)}
 </div>}
 {tab==='orders'&&embedded&&<div className="order-quick-search" role="search" aria-label="البحث في الطلبات">
  <div className="order-search-field">
   <Search size={18} aria-hidden="true"/>
   <input className="field" type="search" aria-label="ابحث في الطلبات"
    placeholder="رقم الطلب، التليفون أو اسم العميل" value={search}
    onChange={e=>{setSearch(e.target.value);setSelected([])}}/>
   {search&&<button type="button" className="btn secondary tiny" aria-label="مسح البحث"
    onClick={()=>{setSearch('');setSelected([])}}><X size={16}/></button>}
  </div>
  {search.trim()&&loaded&&<span className="muted" role="status">
   {visible.length ? `النتائج: ${number(visible.length)}` : 'مفيش طلبات مطابقة. جرّب كلمة تانية أو راجع الفلاتر.'}
  </span>}
 </div>}
 {tab==='orders'&&<section className="panel"><div className="sectionhead"><h2>{t("الطلبات (")}{number(visible.length)})</h2><div className="toolbar">{printFilter}{!embedded&&<input className="field" placeholder={t("ابحث بالاسم أو رقم التليفون أو المنتج")} value={search} onChange={e=>{setSearch(e.target.value);setSelected([])}}/>}<select className="field" aria-label={t("فلتر حالة الشحن")} value={filter} onChange={e=>{setFilter(e.target.value);setSelected([])}}><option value="all">{t("كل الحالات")}</option><option value="active">{t("كل الطلبات غير الملغية")}</option>{statuses.map(s=><option key={s} value={s}>{t(statusLabels[s])}</option>)}</select><select className="field" aria-label={t("فلتر حالة التحصيل")} value={collectionFilter} onChange={e=>{setCollectionFilter(e.target.value as CollectionState|'all');setSelected([])}}><option value="all">{t("كل حالات التحصيل")}</option>{collectionStates.map(state=><option key={state} value={state}>{t(collectionLabels[state])}</option>)}</select>{carrierSelect()}<button className="btn secondary" onClick={()=>exportCsv(visible)}><Download size={16}/> CSV</button><button className="btn" disabled={embedded&&!permissions.create} onClick={()=>{setErr('');setDeliveryChosen(embedded);setEditing(newOrder(brand))}}><Plus size={16}/>{t("أوردر جديد")}</button></div></div>{selectedOrders.length>0&&<div className="selected-finance-summary" role="status" aria-live="polite">
  <strong className="selected-finance-heading">إجمالي {number(selectedOrders.length)} أوردر محدد</strong>
  <div className="selected-finance-metrics">
   <div><span>العميل هيدفع</span><strong>{money(selectedFinance.cod)}</strong>{selectedFinance.codMissing>0&&<small>{number(selectedFinance.codMissing)} طلب ناقص مبلغ التحصيل</small>}</div>
   <div><span>إجمالي تكلفة الشحن</span><strong>{money(selectedFinance.fee)}</strong>{selectedFinance.feeMissing>0&&<small>{number(selectedFinance.feeMissing)} طلب يحتاج تسعير شحن</small>}</div>
   <div><span>الصافي بعد خصم الشحن</span><strong>{money(selectedFinance.net)}</strong>{selectedFinance.netMissing>0&&<small>{number(selectedFinance.netMissing)} طلب صافي غير معروف</small>}</div>
  </div>
  <p>الإجماليات للطلبات المحددة فقط، وتشمل حالات الطلبات المختلفة. أي رسوم شحن تقديرية مميزة في الجدول، والصافي هنا لا يعني أن المبالغ اتحولت بالفعل من شركة الشحن.</p>
 </div>}{selectedOrders.length>0&&<div className="toolbar bulk-actions">
 <strong>{number(selectedOrders.length)}{t("طلب محدد")}</strong>
 {!embedded&&canPrepareSelection&&<button className="btn secondary" onClick={()=>openShippingIntegration(shipmentCompany,selectedOrders)}><Truck size={16}/>{t("تجهيز ملف الشحن")}</button>}
 {!embedded&&<button className="btn secondary" disabled={busy} onClick={()=>{setErr('');setBulkLocation({governorate:'',city:''});setBulkEditing(selectedOrders)}}><Pencil size={16}/>{t("تعديل المحدد")}</button>}
 <button className="btn secondary" disabled={busy} onClick={()=>preview(selectedOrders)}><Printer size={16}/>{t("طباعة المحدد")}</button>
 {!embedded&&<select className="field" aria-label={t("حالة الطلبات المحددة")} value={bulkStatus} onChange={e=>setBulkStatus(e.target.value as Status)}>{statuses.map(status=><option key={status} value={status}>{t(statusLabels[status])}</option>)}</select>}
 <button className="btn secondary" disabled={busy||(embedded&&(!permissions.confirm||!selectedOrders.some(o=>o.workspaceSource==='preview'&&(o.status==='new'||o.status==='contacted'))))} onClick={()=>updateOrders(embedded?selectedOrders.filter(o=>o.workspaceSource==='preview'&&(o.status==='new'||o.status==='contacted')):selectedOrders,'confirmed')}>{t("تأكيد المحدد")}</button>
 {!embedded&&<><button className="btn secondary" disabled={busy} onClick={()=>updateOrders(selectedOrders,bulkStatus)}>{t("تطبيق الحالة")}</button>
 <button className="btn secondary" disabled={busy} onClick={()=>updateOrders(selectedOrders,'cancelled')}>{t("إلغاء المحدد")}</button>
 <button className="btn danger" disabled={busy} onClick={()=>updateOrders(selectedOrders,'delete')}>{t("حذف المحدد")}</button></>}
 </div>}{table(visible,true)}</section>}
 {tab==='carriers'&&<>
  <section className="panel">
   <div className="sectionhead"><h2>{t("شركات الشحن المسجّلة")}</h2></div>
  <form className="toolbar tracking-add-company" onSubmit={saveShippingCompany}>
   <label htmlFor="shipping-company-name">{t("اسم شركة الشحن")}</label><input id="shipping-company-name" className="field" value={companyName} onChange={e=>setCompanyName(e.target.value)} required minLength={2} maxLength={120}/>
   <button className="btn" disabled={busy}><Plus size={16}/>{t("إضافة شركة شحن")}</button>
  </form>
   {companyError&&<p className="notice error" role="alert">{t(companyError)}</p>}
   {registeredCompanies.length>0&&<ul className="registered-carriers">{registeredCompanies.map(name=><li key={name}><button type="button" className="btn tiny secondary" onClick={()=>openShippingIntegration(name)}>{name}{t("· إعداد الربط")}</button></li>)}</ul>}
  </section>
  <section className="panel">
   <div className="sectionhead"><h2>{t("مستحقات شركات الشحن")}</h2>{carrierSelect()}</div>
   {financeSummary(reportOrders)}{carrierTable()}
  </section>
 </>}
 {tab==='shipping-integrations'&&<ShippingIntegrations key={brand} brand={brand} companies={carrierNames} orders={brandOrders} openOrder={setDetailOrderId}
  initialCompany={shipmentDraft?.brand===brand?shipmentDraft.company:''}
  initialIds={shipmentDraft?.brand===brand?shipmentDraft.ids:[]}/>}
 {tab==='reports'&&<section className="panel"><div className="sectionhead"><h2>{t("تقرير الشحن والتحصيل")}</h2>{carrierSelect()}</div>{financeSummary(reportOrders)}{carrierFinanceBreakdown(reportOrders)}
  <div className="tracking-report-bars">{shippingStates.map(status=>{
   const count=reportOrders.filter(o=>o.status===status).length;
   return <div key={status}><span>{t(statusLabels[status])}</span><progress value={count} max={reportOrders.length||1}/><strong>{number(count)}</strong></div>;
  })}</div>{carrierTable()}</section>}
 {tab==='customers'&&<section className="panel"><div className="sectionhead"><h2>{t("العملاء (")}{number(activeCustomers.length)})</h2><div className="toolbar">{printFilter}<input className="field" value={search} onChange={e=>setSearch(e.target.value)} placeholder={t("بحث عن عميل")}/><button className="btn" onClick={()=>setEditCustomer(newCustomer(brand))}><Plus size={16}/>{t("عميل جديد")}</button></div></div><table className="table"><thead><tr>{['الاسم','التليفون','تاريخ الإدخال','أول طلب','عدد الطلبات','إجمالي المشتريات','المسلّم','الإجراءات'].map(x=><th key={x}>{t(x)}</th>)}</tr></thead><tbody>{activeCustomers.map(c=><tr key={c.id||c.phone}><td><strong>{c.name}</strong>{printBadge(printed.has(customerPrintKey(c.brand,c.phone)))}</td><td dir="ltr" className="numeric-value">{englishDigits(c.phone)}</td><td className="numeric-value">{dateEN(c.createdAt)}</td><td>{customerOrders(c.phone).length?customerOrders(c.phone).map(o=>o.createdAt.slice(0,10)).sort()[0]:'—'}</td><td className="numeric-value">{number(customerOrders(c.phone).length)}</td><td>{money(customerOrders(c.phone).reduce((v,o)=>v+totalOf(o),0))}</td><td>{money(customerOrders(c.phone).filter(o=>o.status==='delivered').reduce((v,o)=>v+totalOf(o),0))}</td><td><div className="links"><button className="btn tiny secondary" onClick={()=>setCustomerHistory(c)}>{t("سجل الطلبات")}</button><button className="btn tiny secondary" title={t("إنشاء بوليصة")} onClick={()=>fromCustomer(c)}><Printer size={15}/>{t("بوليصة")}</button><button className="btn tiny secondary" onClick={()=>setEditCustomer({...c})}><Pencil size={15}/></button><button className="btn tiny danger" onClick={()=>deleteCustomer(c)}><Trash2 size={15}/></button></div></td></tr>)}</tbody></table>{!activeCustomers.length&&<div className="empty">{t("لا يوجد عملاء مسجلين")}</div>}</section>}
 {tab==='settings'&&<>{brand==='homey'&&<HomeyConversionsStatus/>}<TalaSettings key={brand} brand={brand} orderIds={new Set(brandOrders.filter(order=>order.shippingCompany===talaExpress).map(order=>order.id))} openOrder={setDetailOrderId}/><section className="panel tracking-settings"><h2>{t("إعدادات الطباعة")}</h2><p>{t("البراند الحالي:")} {brand==='homey'?t("هومي"):t("صدفة")}</p><label>{t("عدد نسخ البوليصة لكل أوردر على ورقة A4")}
  <select className="field" value={printCopies} onChange={e=>setPrintCopies(Number(e.target.value) as 1|2|3)}>{[1,2,3].map(copies=><option key={copies} value={copies}>{copies}</option>)}</select></label>
  <button className="btn" onClick={()=>{localStorage.setItem('order-print-copies:'+brand,String(printCopies));setNotice('تم حفظ إعدادات الطباعة على الجهاز')}}>{t("حفظ الإعدادات")}</button>
 </section></>}
 </main>
 {customerHistory&&<div className="modalshade"><section className="modal tracking-history" role="dialog" aria-modal="true" aria-label={t("سجل طلبات العميل")}><div className="sectionhead"><h2>{t("طلبات")} {customerHistory.name}</h2><button className="btn secondary" onClick={()=>setCustomerHistory(null)}>{t("إغلاق")}</button></div>{table(customerOrders(customerHistory.phone))}</section></div>}
 {collectionEdit&&<div className="modalshade"><section className="modal tracking-collection" role="dialog" aria-modal="true" aria-label={t("تسجيل التحصيل")}><div className="sectionhead"><h2>{t("تسجيل التحصيل")}</h2><button className="btn secondary" disabled={busy} onClick={()=>setCollectionEdit(null)}>{t("إغلاق")}</button></div>
  <p>{collectionEdit.order.customerName}{t("· المستحق")} {money(carrierAmounts(collectionEdit.order).due)}</p>
  <form onSubmit={saveCollection}><label>{t("إجمالي المبلغ المستلم من شركة الشحن")}<input className="field numeric-input" type="number" required min="0.01" max="999999999999.99" step="0.01" value={collectionEdit.amount} onChange={e=>setCollectionEdit({...collectionEdit,amount:e.target.value})}/></label>
  {(collectionError||err)&&<div className="notice error" role="alert">{collectionError||err}</div>}<button className="btn" disabled={busy}>{t("حفظ المبلغ")}</button></form>
 </section></div>}
 {bulkEditing.length>0&&<div className="modalshade">
 <section className="modal" role="dialog" aria-modal="true" aria-label={t("تعديل الأوردرات المحددة")}>
 <div className="sectionhead"><h2>{t("تعديل")} {number(bulkEditing.length)}{t("أوردر")}</h2><button type="button" disabled={busy} className="btn secondary" onClick={()=>{setBulkEditing([]);setBulkLocation({governorate:'',city:''})}}>{t("إغلاق")}</button></div>
 <p className="muted">{t("اكتب القيم اللي عايز تطبقها على كل الأوردرات المحددة. الخانات الفاضية بتحتفظ بقيمتها الحالية.")}</p>
 <form onSubmit={saveBulk}><div className="formgrid">
 <OrderLocationFields locations={orderLocations} {...bulkLocation} onChange={(governorate,city)=>setBulkLocation({governorate,city})}/>
 <label>{t("طريقة الدفع")}<select className="field" name="paymentMethod"><option value="">{t("اختيار طريقة الدفع")}</option>{['الدفع عند الاستلام','InstaPay','مدفوع بالكامل','جزئي مقدم'].map(method=><option key={method} value={method}>{t(method)}</option>)}</select></label>
 <label>{t("مصدر الطلب")}<select className="field" name="source"><option value="">{t("اختيار المصدر")}</option>{['Facebook','Instagram','WhatsApp','Website','TikTok','Amazon','Other'].map(source=><option key={source}>{source}</option>)}</select></label>
 {([['assignedTo','المسؤول عن المتابعة'],['notes','ملاحظات']] as const).map(([name,label])=><label key={name}>{t(label)}<input className="field" name={name}/></label>)}
 {([['shipping','الشحن'],['discount','الخصم'],['prepaid','المدفوع مقدمًا']] as const).map(([name,label])=><label key={name}>{t(label)}<input className="field numeric-input" name={name} type="number" step="0.01" min="0"/></label>)}
 </div>{err&&<p className="notice error" role="alert">{t(err)}</p>}<div className="modalfooter"><button className="btn" disabled={busy}>{t("حفظ التعديلات")}</button></div></form>
 </section></div>}
 {printOrders.length>0&&<div className="modalshade print-preview" onClick={e=>{if(e.target===e.currentTarget)setPrintOrders([])}}>
 <section className="modal" role="dialog" aria-modal="true" aria-label={t("معاينة البوالص")}>
 <form className="print-controls" onSubmit={e=>{
  e.preventDefault();
  const keys=printKeys(printOrders);
  setPrintError('');
  if(embedded){window.print();setPrinted(previous=>new Set([...previous,...keys]));return}
  void printDocuments(keys).then(()=>setPrinted(previous=>new Set([...previous,...keys]))).catch(()=>setPrintError('اتفتح مربع الطباعة، لكن حالة الطباعة ما اتحفظتش.'));
 }}>
 <div className="sectionhead"><h2>{t("معاينة الطباعة (")}{number(printOrders.length)})</h2><button type="button" className="btn secondary" onClick={()=>setPrintOrders([])}>{t("إغلاق")}</button></div>
 <div className="toolbar bulk-actions"><label>{t("تاريخ الطباعة")} <input type="date" className="field" required value={printDate} onChange={e=>setPrintDate(e.target.value)}/></label><button className="btn" onClick={()=>setPdfHelp(false)}><Printer size={16}/>{t("طباعة")}</button><button className="btn secondary" type="submit" onClick={()=>setPdfHelp(true)}><FileDown size={16}/>{t("حفظ PDF")}</button></div>
 {printError&&<p className="notice error" role="alert">{printError}</p>}
 {pdfHelp&&<p className="notice">{t("اختار «حفظ بتنسيق PDF» كوجهة في نافذة الطباعة.")}</p>}
 {printOrders.length>1&&<details><summary>{t("تاريخ مختلف لكل بوليصة")}</summary><div className="formgrid">{printOrders.map(o=>{const id=printable(o).id;return <label key={id}>{o.customerName}<input className="field" type="date" value={printDates[id]||printDate} onChange={e=>setPrintDates({...printDates,[id]:e.target.value||printDate})}/></label>})}</div></details>}
 </form>
 <div className="shipping-preview"><WaybillPrintSheets waybills={printOrders.map(printable)} perPage={4} printDate={printDate} printDates={printDates}/></div>
 </section></div>}
 {detailOrder&&<OrderDetails order={detailOrder} cachedTracking={embedded} close={()=>setDetailOrderId('')}
  edit={canEditOrder(detailOrder)?()=>openOrderEditor(detailOrder,true):undefined}
  invoice={embedded?()=>setInvoiceOrderId(detailOrder.id):undefined}
  print={()=>{setDetailOrderId('');preview([detailOrder])}}
  prepare={embedded?undefined:()=>{setDetailOrderId('');openShippingIntegration(detailOrder.shippingCompany,[detailOrder])}}/>}
 {editing&&<div className="modalshade"  onClick={e=>{if(e.target===e.currentTarget)closeOrderEditor()}}>
  <section className="modal order-editor" role="dialog" aria-modal="true" aria-labelledby="order-editor-title">
   <div className="sectionhead">
    <h2 id="order-editor-title">{editing.id?t("تعديل أوردر"):t("إضافة طلب جديد")} <span className="order-brand-chip">{brand==='homey'?<HomeyLogo className="editor-homey-logo"/>:<img src={ordersManagerPath("/sodfa-logo.png")} alt={t("صدفة")} width={85} height={35}/>}</span></h2>
    <button type="button" className="btn secondary tiny" onClick={closeOrderEditor}>{t("إغلاق ×")}</button>
   </div>
   <form onSubmit={saveOrder}>
    <section className="order-form-section order-carrier-choice">
     <h3 className="editor-section-title"><Truck size={18}/>{t('طريقة التوصيل')}</h3>
     {embedded?<label>{t("شركة الشحن")}
      <input className="field" maxLength={100} value={editing.shippingCompany??''}
       onChange={e=>setEditing({...editing,shippingCompany:e.target.value})}/>
     </label>:<label>{t("شركة الشحن")}
      <select className="field" value={editing.shippingCompany?'company:'+editing.shippingCompany:'self'} onChange={e=>{
       const value=e.target.value;setDeliveryChosen(true);
       changeShippingLocation({shippingCompany:value==='self'?'':value.slice('company:'.length)});
      }}>
       <option value="" disabled>{t("اختار شركة الشحن أولاً")}</option>
       {registeredCompanies.map(name=><option key={name} value={'company:'+name}>{t(name)}</option>)}
       {editing.shippingCompany&&!registeredCompanies.includes(editing.shippingCompany)&&<option value={'company:'+editing.shippingCompany}>{t(editing.shippingCompany)}</option>}
       <option value="self">حودة — توصيل غير مباشر</option>
      </select>
      <small className="muted">تقدر تحفظ الأوردر بدون شركة شحن وتضيف الشركة بعدين من جدول الطلبات أو تعديل الأوردر. تغيير الشركة لا ينشئ بوليصة شحن تلقائيًا.</small>
     </label>}
    </section>
    {(editing.id||deliveryChosen||!editing.shippingCompany)&&<>
    <section className="order-form-section">
    <h3 className="editor-section-title"><Users size={18}/>{t('العميل والعنوان')}</h3>
    <div className="formgrid order-basics">
     {inputOrder('customerName',t("اسم العميل"),true)}
     {inputOrder('phone',t("رقم التليفون"),true)}
     <OrderLocationFields locations={orderLocations} governorate={editing.governorate} city={editing.city} required={!editing.id}
       onAreaAdded={embedded?undefined:(governorate,city)=>setOrderLocations(locations=>({...locations,[governorate]:[...new Set([...(locations[governorate]??[]),city])].sort((a,b)=>a.localeCompare(b,'ar'))}))}
       onChange={(governorate,city)=>changeShippingLocation({governorate,city})}/>

     {orderLocationError&&<div className="full notice error" role="alert">{orderLocationError} <button type="button" className="btn secondary tiny" onClick={loadOrderLocations}>{t("إعادة المحاولة")}</button></div>}
     <label className="full">{t("العنوان بالتفصيل")}
      <input className="field" required={!editing.id} value={editing.address} onChange={e=>setEditing({...editing,address:e.target.value})}/>
     </label>
     {!embedded&&editing.brand==='homey'&&editing.shippingCompany===talaExpress&&(!editing.id||canRetryTala||(!closedWithoutDelivery(editing)&&editing.status!=='delivered'))&&
      <div className="full"><TalaDestinationFields retryOrder={canRetryTala}
       price={Math.max(0,totalOf(editing)-editing.shipping-editing.prepaid)}
       onRateChange={rate=>setEditing(order=>order?{...order,shipping:rate}:order)}/></div>}
    </div>
    </section>
    <section className="order-form-section">
    <h3 className="editor-section-title"><Truck size={18}/>{t('بيانات الشحن')}</h3>
    <div className="formgrid order-basics">
     {numOrder('shipping',t("تكلفة الشحن"))}
    </div>
    </section>
    <section className="order-form-section">
    <h3 className="editor-section-title"><Package size={19}/>{t("المنتجات")}</h3>
    {brand==='homey'&&catalogNotice&&<p className="muted">{t(catalogNotice)}</p>}
    {editing.items.map((item,index)=><div className="formgrid order-product-row" key={index}>
     <ProductPicker item={item} products={products} onChange={patch=>changeItem(index,patch)}/>
     <label>{t("الكمية")}
      <input className="field numeric-input" type="number" min="1" step="1" required value={item.quantity||''} onChange={e=>changeItem(index,{quantity:Number(e.target.value)})}/>
     </label>
      <label>{t("السعر")}<input className="field numeric-input" type="number" inputMode="decimal" aria-label={t("سعر الوحدة")} step="0.01" min="0" value={item.price} onChange={e=>changeItem(index,{price:Number(e.target.value)})}/></label>
     {editing.items.length>1&&<button className="btn danger tiny" type="button" aria-label={t("حذف المنتج ")+(index+1)} onClick={()=>setEditing({...editing,items:editing.items.filter((_,i)=>i!==index)})}><Trash2 size={15}/></button>}
    </div>)}
    <button className="btn secondary tiny" type="button" disabled={editing.items.length>=50} onClick={()=>setEditing({...editing,items:[...editing.items,{name:'',sku:'',quantity:1,price:0}]})}>{t("+ إضافة منتج")}</button>
    </section>
    <details className="order-more">
     <summary>{t("المزيد من الخيارات")} <ChevronDown aria-hidden="true" size={18}/></summary>
     <div className="formgrid">
      {inputOrder('alternatePhone',t("تليفون بديل"))}
      {!embedded&&<><label>{t("تاريخ إنشاء الأوردر")}
       <input className="field" type="date" value={editing.createdAt.slice(0,10)} onChange={e=>{if(e.target.value)setEditing({...editing,createdAt:e.target.value})}}/>
      </label>
      {selectOrder('source',t("مصدر الطلب"),['','Facebook','Instagram','WhatsApp','Website','TikTok','Amazon','Other'])}</>}
      {inputOrder('courier',t("المندوب"))}
      {inputOrder('assignedTo',t("المسؤول عن المتابعة"))}
      {!embedded&&selectOrder('status',t("حالة الأوردر"),statuses,statusLabels)}
      {selectOrder('paymentMethod',t("طريقة الدفع"),['الدفع عند الاستلام','InstaPay','مدفوع بالكامل','جزئي مقدم'])}
      {numOrder('discount',t("الخصم"))}
      {numOrder('prepaid',t("المبلغ المدفوع مقدمًا"))}
      <label className="full">{t("ملاحظات الأوردر")}
       <textarea className="field" rows={2} value={editing.notes} onChange={e=>setEditing({...editing,notes:e.target.value})}/>
      </label>
     </div>
     {editing.items.map((item,index)=><div className="formgrid order-item-details" key={index}>
      <strong className="full">{item.name||t("المنتج ")+(index+1)}</strong>
      <label>SKU<input className="field" value={item.sku} onChange={e=>changeItem(index,{sku:e.target.value})}/></label>
      <label className="full">{t("رابط صورة المنتج")}<input type="text" inputMode="url" className="field" value={item.imageUrl??''} onChange={e=>changeItem(index,{imageUrl:e.target.value})}/></label>
     </div>)}
    </details>
    <section className="order-form-section order-payment-section">
    <h3 className="editor-section-title">{t("الشحن والتحصيل")}</h3>
    <div className="editor-total order-total-compact">
     <label className="order-manual-total">
      <span>{t("السعر النهائي اللي العميل هيدفعه للمندوب (ج.م)")}</span>
      <input className="field numeric-input" type="number" inputMode="decimal" min="0" max="999999999999.99" step="0.01"
       placeholder={String(collectionFromCustomer({...editing,manualCollection:null,manualTotal:null}))}
       value={editing.manualCollection??(editing.manualTotal!=null?collectionFromCustomer(editing):'')}
       onChange={e=>{const value=e.target.value;setEditing(order=>order?{...order,manualTotal:null,manualCollection:value===''?null:Number(value)}:order)}}/>
      <small className="muted">{t("الإجمالي التلقائي شامل الشحن وبعد المدفوع مقدمًا")} {money(Math.max(0,calculatedTotal(editing)-editing.prepaid))}</small>
     </label>
     {editing.shippingCompany===talaExpress&&<div><span>{t("صافي المستحق من تالا بعد الشحن")}</span><strong>{missingFinancialAmount(editing)?'غير معروف — يحتاج مراجعة':money(carrierAmounts(editing).due)}</strong>{editing.talaDeliveryFees!=null&&<small className="muted">رسوم الشحن من تالا: {money(editing.talaDeliveryFees)} (بدل رسوم الطلب المسجلة: {money(editing.shipping)})</small>}</div>}
     {editing.id&&financialWarnings(editing).length>0&&<div className="finance-review-box" role="status"><strong>راجع بيانات الأوردر المالية قبل الحفظ</strong><ul>{financialWarnings(editing).map((message,index)=><li key={index}>{message}</li>)}</ul><small>التصحيح لا يغير سعر المنتج أو تحصيل العميل تلقائيًا.</small></div>}
    </div>
    </section>
    {err&&<div className="notice error" role="alert">{t(err)}</div>}
    <div className="modalfooter">
     <button type="button" className="btn secondary" onClick={closeOrderEditor}>{t("إلغاء")}</button>
     {canRetryTala&&<button type="submit" className="btn" value="retry-tala" disabled={busy}><Truck size={17}/>{t('حفظ وإعادة الإرسال لتالا')}</button>}
     <button type="submit" formNoValidate={canRetryTala} className={canRetryTala?'btn secondary':'btn'} disabled={busy||(!editing.id&&!deliveryChosen)}><ShieldCheck size={17}/>{t("حفظ الطلب")}</button>
    </div>
    </>}
    {!editing.id&&!deliveryChosen&&<p className="notice order-carrier-hint" role="status">{t("اختار شركة الشحن أو التوصيل الذاتي علشان تظهر خانات الطلب.")}</p>}
   </form>
  </section>
 </div>}
 {editCustomer&&<div className="modalshade" onClick={e=>{if(e.target===e.currentTarget)setEditCustomer(null)}}><section className="modal"><h2>{editCustomer.id?t("تعديل عميل"):t("إضافة عميل")}</h2><form onSubmit={saveCustomer}><div className="formgrid">{(['name','phone','alternatePhone','city','address','notes'] as const).map(k=><label key={k}>{({name:'الاسم',phone:'رقم التليفون',alternatePhone:'تليفون بديل',city:'المدينة',address:'العنوان',notes:'ملاحظات'})[k]}<input className="field" required={k==='name'||k==='phone'} value={editCustomer[k]} onChange={e=>setEditCustomer({...editCustomer,[k]:e.target.value})}/></label>)}<label>{t("المحافظة")}<select className="field" value={editCustomer.governorate} onChange={e=>setEditCustomer({...editCustomer,governorate:e.target.value})}><option value="">{t("اختر")}</option>{govs.map(g=><option key={g} value={g}>{t(g)}</option>)}</select></label></div><div className="modalfooter"><button type="button" className="btn secondary" onClick={()=>setEditCustomer(null)}>{t("إلغاء")}</button><button className="btn" disabled={busy}>{t("حفظ العميل")}</button></div></form></section></div>}
 </div>;
 function changeShippingLocation(patch:Partial<Pick<Order,'governorate'|'city'|'shippingCompany'>>){
  setEditing(order=>{
   if(!order)return order;
   const next={...order,...patch};
   if(next.shippingCompany===talaExpress){
    next.shipping=talaRate(next.shippingCompany,next.governorate,next.city)??0;
   }else if(order.shippingCompany===talaExpress){
    next.shipping=0;
   }
   return next;
  });
 }
 function changeItem(index:number,patch:Partial<Item>){if(!editing)return;setEditing({...editing,items:editing.items.map((item,i)=>i===index?{...item,...patch}:item)})}
 function inputOrder(key:keyof Order,label:string,required=false){return <label key={key}>{t(label)}<input className="field" type={key==='phone'||key==='alternatePhone'?'tel':'text'} dir={key==='phone'||key==='alternatePhone'?'ltr':undefined} maxLength={key==='courier'?120:undefined} required={required} value={String(editing?.[key]??'')} onChange={e=>setEditing(x=>x?{...x,[key]:e.target.value}:x)}/></label>}
 function numOrder(key:'shipping'|'discount'|'prepaid',label:string){return <label key={key}>{t(label)}<input type="number" step="0.01" min="0" className="field numeric-input" value={editing?.[key]??0} onChange={e=>setEditing(x=>x?{...x,[key]:Number(e.target.value)}:x)}/></label>}
 function selectOrder(key:'governorate'|'source'|'status'|'paymentMethod',label:string,options:readonly string[],labels?:Record<string,string>){return <label key={key}>{t(label)}<select className="field" value={editing?.[key]??''} onChange={e=>setEditing(x=>x?{...x,[key]:e.target.value}:x)}>{options.map(v=><option value={v} key={v}>{t(labels?.[v]||v||'اختر')}</option>)}</select></label>}
 function table(rows:WorkspaceOrder[],selectable=false){
 if(embedded&&compactOrders){
  const mobileRows=rows.slice(0,mobileLimit);
  return <div className="mobile-orders">
   {mobileRows.map(o=><article className="mobile-order" key={o.id}>
    <div className="mobile-order-top">
     <div><button type="button" className="order-name-link" onClick={()=>setDetailOrderId(o.id)}>{o.customerName}</button>
      <div className="source-note"><bdi>#{o.id.slice(0,8).toUpperCase()}</bdi> · {o.workspaceSource==='manager'?'مدير الطلبات':'المعاينة'}</div></div>
     {selectable&&<label className="mobile-order-select"><input type="checkbox" aria-label={t("تحديد طلب ")+o.customerName} checked={selected.includes(o.id)} disabled={busy}
      onChange={e=>setSelected(current=>e.target.checked?[...current,o.id]:current.filter(id=>id!==o.id))}/></label>}
    </div>
    <dl><div><dt>الحالة</dt><dd>{t(statusLabels[o.status])}</dd></div>
     <div><dt>التحصيل</dt><dd>{orderRowFinance(o).cod===null?'غير مسجل':money(orderRowFinance(o).cod!)}</dd></div>
     <div><dt>التليفون</dt><dd><bdi>{englishDigits(o.phone)}</bdi></dd></div>
     <div><dt>التاريخ</dt><dd><bdi>{dateEN(o.createdAt)}</bdi></dd></div></dl>
    <div className="mobile-order-actions">
     <button type="button" className="btn secondary" onClick={()=>setDetailOrderId(o.id)}>تفاصيل الطلب</button>
     <button type="button" className="btn secondary" onClick={()=>setInvoiceOrderId(o.id)}>عرض الفاتورة</button>
     {canEditOrder(o)&&<button type="button" className="btn secondary" disabled={busy}
      onClick={()=>openOrderEditor(o)}>تعديل أوردر</button>}
     {o.workspaceSource==='preview'&&permissions.confirm&&(o.status==='new'||o.status==='contacted')&&
      <button type="button" className="btn" title={t("تأكيد الطلب")} disabled={busy} onClick={()=>updateOrders([o],'confirmed')}>{t("تأكيد الطلب")}</button>}
    </div>
   </article>)}
   {rows.length===0&&<p className="empty">{!loaded?'جاري تحميل الطلبات…':'مفيش طلبات مطابقة.'}</p>}
   {mobileRows.length<rows.length&&<button type="button" className="btn secondary" onClick={()=>setMobileLimit(limit=>limit+40)}>عرض طلبات أكتر</button>}
  </div>;
 }
 const allChecked=rows.length>0&&rows.every(o=>selected.includes(o.id));
 return <div className="tracking-table-scroll" tabIndex={0} role="region" aria-label={t("جدول الأوردرات")}><table className="table tracking-table"><thead><tr>{selectable&&<th><input type="checkbox" aria-label={t("تحديد كل الطلبات الظاهرة")} disabled={!rows.length||busy} checked={allChecked} onChange={()=>setSelected(allChecked?[]:rows.map(o=>o.id))}/></th>}{columns.map(x=><th key={x}>{t(x)}</th>)}</tr></thead><tbody>{rows.map(o=><tr key={o.id}>{selectable&&<td><input type="checkbox" aria-label={t("تحديد طلب ")+o.customerName} disabled={busy} checked={selected.includes(o.id)} onChange={e=>setSelected(e.target.checked?[...selected,o.id]:selected.filter(id=>id!==o.id))}/></td>}<td><strong className="order-ref" dir="ltr">#{o.id.slice(0,8).toUpperCase()}</strong>{embedded&&<small className="source-note">{o.workspaceSource==='manager'?'مدير الطلبات':'المعاينة'}</small>}</td><td><button type="button" className="order-name-link" onClick={()=>setDetailOrderId(o.id)}>{o.customerName}</button>{o.talaStatusName&&<span className={'tala-status-badge tala-status-'+(o.talaStatusCode||'').toLowerCase()} title={t('آخر حالة مزامنة من تالا')}>{o.talaStatusName}</span>}{printBadge(printed.has('order:'+o.id))}</td><td><select className="tracking-select" aria-label={t("شركة الشحن ")+o.customerName} value={o.shippingCompany||''} disabled={busy||embedded} onChange={e=>void updateOrders([o],{shippingCompany:e.target.value})}><option value="">{t("بدون شركة شحن — توصيل بنفسي")}</option>{registeredCompanies.map(name=><option key={name} value={name}>{t(name)}</option>)}{o.shippingCompany&&!registeredCompanies.includes(o.shippingCompany)&&<option value={o.shippingCompany}>{t(o.shippingCompany)}</option>}</select></td>
 <td><select className={'tracking-select tracking-'+o.status} aria-label={t("حالة الشحن ")+o.customerName} value={o.status} disabled={busy||embedded} onChange={e=>void updateOrders([o],e.target.value as Status)}>{statuses.map(status=><option key={status} value={status}>{t(statusLabels[status])}</option>)}</select>{o.status==='shipped'&&<small className="tracking-awaiting-update">{t("في انتظار تحديث شركة الشحن")}</small>}</td>
 <td><select className={'tracking-select tracking-'+collectionState(o)} aria-label={t("حالة التحصيل ")+o.customerName} value={collectionState(o)} disabled={busy||embedded} onChange={e=>chooseCollection(o,e.target.value as CollectionState)}>{collectionStates.map(state=><option key={state} value={state} disabled={state==='partial'&&carrierAmounts(o).due<=0}>{t(collectionLabels[state])}</option>)}</select>{o.carrierReceived? <button className="tracking-edit-amount" disabled={busy||embedded} title={t("تعديل المبلغ المستلم")} aria-label={t("تعديل المبلغ المستلم ")+o.customerName} onClick={()=>chooseCollection(o,collectionState(o)==='partial'?'partial':'paid')}><Pencil size={13}/></button>:null}</td>
 <td className="numeric-value order-finance-cell">{orderRowFinance(o).cod===null?<span className="finance-review">غير مسجل</span>:money(orderRowFinance(o).cod!)}</td>
 <td className="numeric-value order-finance-cell">{orderRowFinance(o).fee===null?<span className="finance-review">غير محدد</span>:money(orderRowFinance(o).fee!)}{orderRowFinance(o).feeSource==='estimated'&&<small className="finance-fee-estimate">تقديري حسب المنطقة</small>}{orderRowFinance(o).feeSource==='tala'&&<small className="finance-fee-provider">حسب تالا</small>}</td>
 <td className="numeric-value order-finance-cell">{orderRowFinance(o).net===null?<span className="finance-review">غير معروف</span>:<strong>{money(orderRowFinance(o).net!)}</strong>}{orderRowFinance(o).confirmedNet&&<small className="finance-fee-provider">مستحق حسب تالا</small>}</td>
 <td>{missingFinancialAmount(o)?<span className="finance-review" title="بيانات التحصيل أو سعر المنتج ناقصة">يحتاج مراجعة</span>:money(carrierAmounts(o).due)}{financialWarnings(o).length>0&&<span className="finance-warning" title={financialWarnings(o).join("؛ ")}>راجع الحساب</span>}</td><td>{money(carrierAmounts(o).received)}</td><td>{missingFinancialAmount(o)?<span className="finance-review">غير معروف</span>:money(carrierAmounts(o).remaining)}</td><td dir="ltr" className="numeric-value">{englishDigits(o.phone)}</td><td className="tracking-order-detail">{[t(o.governorate),o.city,o.address].filter(Boolean).join('، ')||'—'}</td><td className="tracking-order-detail">{o.items.map(i=>i.name+' × '+number(i.quantity)).join('، ')}</td><td className="numeric-value">{dateEN(o.createdAt)}</td><td className="numeric-value">{formatEntryDate(o.enteredAt||o.createdAt)}</td><td className="order-actions"><div className="links">{!embedded&&canPrepareShipment(o)&&<button className="btn tiny secondary" title={t("تجهيز ملف الشحن")} aria-label={t("تجهيز ملف الشحن")} onClick={()=>openShippingIntegration(o.shippingCompany,[o])}><Truck size={15}/></button>}{embedded?<button type="button" className="btn tiny secondary" title="عرض الفاتورة" aria-label="عرض الفاتورة" onClick={()=>setInvoiceOrderId(o.id)}><FileText size={15}/></button>:<a className="btn tiny secondary" title={t("طباعة فاتورة PDF")} href={ordersManagerPath('/orders/')+o.id+'/invoice'} target="_blank" rel="noopener noreferrer"><FileText size={15}/></a>}<button className="btn tiny secondary" title={t("طباعة البوليصة")} onClick={()=>preview([o])}><Printer size={15}/>{t("طباعة")}</button>{canEditOrder(o)&&<button className="btn tiny secondary" title={t("تعديل")} aria-label={t("تعديل")} disabled={busy} onClick={()=>openOrderEditor(o)}><Pencil size={15}/></button>}{(embedded?o.workspaceSource==='preview'&&permissions.confirm&&(o.status==='new'||o.status==='contacted'):o.status!=='confirmed')&&<button className="btn tiny secondary" title={t("تأكيد الطلب")} disabled={busy} onClick={()=>updateOrders([o],'confirmed')}><CheckCircle2 size={15}/></button>}{!embedded&&o.status!=='cancelled'&&<button className="btn tiny secondary" title={t("إلغاء الطلب")} disabled={busy} onClick={()=>updateOrders([o],'cancelled')}><XCircle size={15}/></button>}{!embedded&&<button className="btn tiny danger" title={t("حذف")} disabled={busy} onClick={()=>updateOrders([o],'delete')}><Trash2 size={15}/></button>}</div></td></tr>)}</tbody></table>{rows.length===0&&<div className="empty">{!loaded?t("جاري تحميل البيانات…"):t("مفيش أوردرات مطابقة حالياً. اضغط إضافة أوردر للبدء.")}</div>}</div>}
}
