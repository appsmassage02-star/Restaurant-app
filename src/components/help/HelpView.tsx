import React from 'react';
import {
  HelpCircle,
  Phone,
  Mail,
  MessageSquare,
  ShieldCheck,
  FileQuestion,
  ChevronDown,
  Truck,
  PhoneCall,
  DollarSign,
} from 'lucide-react';

export const HelpView: React.FC = () => {
  const faqs = [
    {
      q: 'كيف يتم احتساب عمولة إدارة طلبات البيت على مبيعات المطعم؟',
      a: 'تُحتسب العمولة بنسبة 10% على صافي قيمة الطعام بعد خصم العروض الترويجية فقط. ولا يتم احتساب أي عمولة على رسوم التوصيل، كما لا يتحمل المطعم عمولة على الخصومات التي يقدمها للزبائن.',
    },
    {
      q: 'ما هو الفرق بين مسار التوصيل الذاتي ومسار اتصال المندوب؟',
      a: 'في مسار التوصيل الذاتي، يستقبل المطعم الطلب إلكترونيًا، يجهزه ويقوم طياره بتوصيله للعميل وتؤول رسوم التوصيل للمطعم. أما في مسار المندوب، يتم توجيه الطلب للمندوب للاتصال هاتفيًا بالمطعم للتأكيد، وتؤول رسوم التوصيل للمندوب المستقل.',
    },
    {
      q: 'متى تصدر الفاتورة الرسمية للطلب؟',
      a: 'يصدر النظام الفاتورة النهائية بمجرد قبول المطعم للطلب إلكترونيًا، ولا تصدر الفاتورة قبل الموافقة.',
    },
    {
      q: 'ماذا يحدث إذا نفد صنف من المنيو أثناء ساعات العمل؟',
      a: 'يمكنك بضغطة زر واحدة من قسم «المنيو» تحويل حالة الصنف إلى «غير متاح»، وسيختفي فورًا من قائمة الطلبات المتاحة للزبائن دون حذفه نهائيًا.',
    },
    {
      q: 'كيف ومتى يتم تحويل مستحقات المطعم المالية؟',
      a: 'تتم التسوية وفق الدورة المعتمدة (أسبوعيًا)، حيث يتم تجميع صافي مبيعات الطعام ورسوم التوصيل الذاتي بعد خصم العمولة الإدارية، وإصدار إيصال تحويل بنكي رسمي.',
    },
  ];

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-amber-500" />
          مركز المساعدة ودعم شركاء طلبات البيت
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          إرشادات التشغيل، الإجابة عن الأسئلة الشائعة وقنوات التواصل مع فريق العمليات
        </p>
      </div>

      {/* Support Channels Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs text-center space-y-2">
          <div className="w-10 h-10 bg-amber-100 text-amber-700 rounded-xl mx-auto flex items-center justify-center">
            <Phone className="w-5 h-5" />
          </div>
          <h4 className="text-xs font-bold text-slate-800">الخط الساخن للمطاعم</h4>
          <p className="text-sm font-black text-amber-700 font-mono dir-ltr">19980</p>
          <span className="text-[10px] text-slate-400 block">متاح طوال 24 ساعة</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs text-center space-y-2">
          <div className="w-10 h-10 bg-emerald-100 text-emerald-700 rounded-xl mx-auto flex items-center justify-center">
            <MessageSquare className="w-5 h-5" />
          </div>
          <h4 className="text-xs font-bold text-slate-800">واتساب الدعم الفني</h4>
          <p className="text-sm font-black text-emerald-700 font-mono dir-ltr">01009988776</p>
          <span className="text-[10px] text-slate-400 block">استجابة سريعة للمشكلات التشغيلية</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs text-center space-y-2">
          <div className="w-10 h-10 bg-blue-100 text-blue-700 rounded-xl mx-auto flex items-center justify-center">
            <Mail className="w-5 h-5" />
          </div>
          <h4 className="text-xs font-bold text-slate-800">البريد الإلكتروني للشركاء</h4>
          <p className="text-xs font-bold text-blue-700 font-mono dir-ltr truncate">
            partners@talabat-elbeit.com
          </p>
          <span className="text-[10px] text-slate-400 block">للتسويات والعقود الإدارية</span>
        </div>
      </div>

      {/* FAQs */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-2">
          <FileQuestion className="w-4 h-4 text-amber-600" />
          الأسئلة الشائعة وقواعد المنظومة
        </h3>

        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <div key={i} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5">
              <h4 className="text-xs font-bold text-slate-900">{faq.q}</h4>
              <p className="text-xs text-slate-600 leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
