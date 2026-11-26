
import {TalaSettings} from "./tala-settings";
import {talaExpress} from "@/lib/tala-shipping";
import {useTranslation} from '@/app/language';
import {useState} from 'react';
import {Download,Truck} from 'lucide-react';
import {canPrepareShipment, shipmentCsv, shipmentDetails} from '@/lib/shipping-handoff';
import type {Brand, Order} from '@/lib/types';

const methods = [
 ['واجهة API مباشرة', 'REST أو SOAP. طريقة الدخول بتحددها الشركة، زي API key أو token أو OAuth أو حساب خدمة.'],
 ['تحديثات التتبع', 'Webhook موقّع لو الشركة بتدعمه، أو استعلام دوري برقم التتبع.'],
 ['ملفات ورفع دفعات', 'CSV أو Excel من بوابة الشركة، أو تبادل آلي للملفات عبر SFTP أو EDI لو متاح.'],
 ['منصة وسيطة أو إضافة رسمية', 'تربط شركتك عن طريق مزوّد وسيط أو إضافة الشركة لو بتدعم نظام طلبات خارجي.'],
 ['بوابة الشركة يدويًا', 'نزّل بيانات الطلبات المختارة واستخدمها في بوابة الشحن بعد مطابقة قالب الشركة.'],
];

type Props = {
 brand: Brand;
 companies: string[];
 orders: Order[];
 initialCompany: string;
 initialIds: string[];
 openOrder:(id:string)=>void;
};

export function ShippingIntegrations({brand, companies, orders, initialCompany, initialIds, openOrder}: Props) {
 const t=useTranslation();
 const [company, setCompany] = useState(initialCompany);
 const [ids, setIds] = useState(initialIds);
 const [includeContents, setIncludeContents] = useState(false);
 const eligible = orders.filter(order => order.brand === brand && order.shippingCompany === company && canPrepareShipment(order));
 const selected = eligible.filter(order => ids.includes(order.id));

 function download() {
  if (!selected.length) return;
  const url = URL.createObjectURL(new Blob([shipmentCsv(selected, includeContents)], {type: 'text/csv;charset=utf-8'}));
  const link = document.createElement('a');
  link.href = url;
  link.download = `${brand}-shipments-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
 }

 return <>
  <section className="panel shipment-workspace">
   <div className="sectionhead"><h2><Truck size={20}/>{t("تجهيز شحنات")} {brand === 'homey' ? t("هومي") : t("صدفة")}</h2></div>
   <div className="toolbar">
    <label>{t("شركة الشحن")} <select className="field" value={company} onChange={event => {setCompany(event.target.value); setIds([]); setIncludeContents(false)}}>
     <option value="">{t("اختار شركة الشحن")}</option>
     {companies.map(name => <option key={name} value={name}>{t(name)}</option>)}
    </select></label>
    {company && <span className="muted">{t("تصدير الشحنات يدويًا")}</span>}
   </div>
   {company && (eligible.length ? <>
    <div className="tracking-table-scroll" tabIndex={0} role="region" aria-label={t("الطلبات المتاحة للتصدير")}>
     <table className="table">
      <thead><tr><th>{t("اختيار")}</th><th>{t("مرجع الطلب")}</th><th>{t("العميل")}</th><th>{t("المنطقة")}</th><th>{t("التحصيل من العميل")}</th></tr></thead>
      <tbody>{eligible.map(order => {
       const details = shipmentDetails(order);
       return <tr key={order.id}>
        <td><input type="checkbox" aria-label={`${t("اختيار طلب")} ${order.customerName} ${order.id.slice(0, 8)}`} checked={ids.includes(order.id)} onChange={event => setIds(current => event.target.checked ? [...current, order.id] : current.filter(id => id !== order.id))}/></td>
        <td dir="ltr">{order.id.slice(0, 8).toUpperCase()}</td>
        <td>{details.recipient_name}</td>
        <td>{[t(details.governorate), details.city].filter(Boolean).join('، ')}</td>
        <td>{details.cash_on_delivery_egp} {t("ج.م")}</td>
       </tr>;
      })}</tbody>
     </table>
    </div>
    <div className="toolbar bulk-actions">
     <label><input type="checkbox" checked={includeContents} onChange={event => setIncludeContents(event.target.checked)}/>{t("ضم أسماء المنتجات والكميات")}</label>
     <button className="btn" type="button" disabled={!selected.length} onClick={download}><Download size={16}/>{t("تنزيل CSV (")}{selected.length})</button>
    </div>
    <p className="muted">{t("الملف فيه مرجع الطلب وبيانات التوصيل ومبلغ التحصيل من العميل. تنزيل الملف خطوة تجهيز قبل رفعه لدى الشركة.")}</p>
   </> : <p>{t("مفيش طلبات مفتوحة متعيّنة للشركة دي في المتجر الحالي.")}</p>)}
  </section>
  {company===talaExpress&&<TalaSettings key={brand} brand={brand} orderIds={new Set(orders.filter(order=>order.shippingCompany===talaExpress).map(order=>order.id))} openOrder={openOrder}/>}
  <details className="panel integration-help">
   <summary>{t("طرق الربط المتاحة حسب الشركة")}</summary>
   <ul>{methods.map(([label, detail]) => <li key={label}><strong>{t(label)}</strong> — {t(detail)}</li>)}</ul>
   <h3>{t("اطلب إيه من")} {t(company || "شركة الشحن")}؟</h3>
   <ul>
    <li>{t("طرق الربط المدعومة، التوثيق الفني، معرّف حساب التاجر، وبيانات الاختبار من خلال قناة آمنة.")}</li>
    <li>{t("مثال لإنشاء وتعديل وإلغاء شحنة، والحقول الإلزامية وأكواد المناطق والخدمات ومبلغ التحصيل.")}</li>
    <li>{t("طريقة استلام رقم التتبع والبوليصة وتحديثات الحالة والمرتجعات وكشوف التحصيل.")}</li>
    <li>{t("طريقة منع تكرار الشحنة باستخدام مرجع الطلب، وقالب الاستيراد والتصدير لو الربط بالملفات.")}</li>
   </ul>
  </details>
 </>;
}
