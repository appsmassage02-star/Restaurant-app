import React, { useState } from 'react';
import {
  Sparkles,
  Plus,
  Edit2,
  Trash2,
  Play,
  Pause,
  Percent,
  Coins,
  Calendar,
  CheckCircle,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Offer } from '../../types';
import { OfferModal } from './OfferModal';
import { SliderPreview } from './SliderPreview';

export const OffersView: React.FC = () => {
  const { offers, addOffer, updateOffer, deleteOffer, toggleOfferStatus, menuItems } = useApp();

  const [showModal, setShowModal] = useState(false);
  const [offerToEdit, setOfferToEdit] = useState<Offer | null>(null);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
            نشط في السلايدر
          </span>
        );
      case 'PAUSED':
        return (
          <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-amber-100 text-amber-800 border border-amber-200">
            متوقف مؤقتًا
          </span>
        );
      case 'DRAFT':
        return (
          <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-slate-100 text-slate-800 border border-slate-200">
            مسودة
          </span>
        );
      case 'EXPIRED':
        return (
          <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-rose-100 text-rose-800 border border-rose-200">
            منتهٍ
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            إدارة عروض السلايدر والخصومات الترويجية
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            إنشاء حملات ترويجية بنسب مئوية أو مبالغ ثابتة تظهر للعملاء في واجهة تطبيق طلبات البيت
          </p>
        </div>

        <button
          onClick={() => {
            setOfferToEdit(null);
            setShowModal(true);
          }}
          className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة عرض جديد</span>
        </button>
      </div>

      {/* Live Slider Preview */}
      <SliderPreview offers={offers} />

      {/* Offers List Grid */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-slate-700">قائمة العروض المسجلة للمطعم:</h3>

        {offers.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-xs">
            <Sparkles className="w-12 h-12 text-slate-300 mx-auto mb-3 stroke-[1.5]" />
            <h4 className="text-sm font-bold text-slate-700">لا توجد عروض ترويجية مسجلة حاليًا</h4>
            <p className="text-xs text-slate-400 mt-1 mb-4">
              أنشئ أول عرض لزيادة مبيعات مطعمك ولفت انتباه زبائن تطبيق طلبات البيت عبر سلايدر العروض الترويجية.
            </p>
            <button
              onClick={() => {
                setOfferToEdit(null);
                setShowModal(true);
              }}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة أول عرض الآن</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {offers.map((offer) => {
            const isPct = offer.discountType === 'PERCENTAGE';
            const appliesCount = offer.appliesToItemIds.length;
            return (
              <div
                key={offer.id}
                className="bg-white rounded-2xl border border-slate-200 hover:border-amber-300 transition-all p-4 flex flex-col justify-between space-y-3 shadow-xs"
              >
                <div>
                  {/* Status & Discount badge */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2.5 py-1 text-xs font-black rounded-lg bg-amber-500 text-slate-950 shadow-2xs">
                      {isPct ? `خصم ${offer.discountValue}%` : `خصم ${offer.discountValue} ج.م`}
                    </span>
                    {getStatusBadge(offer.status)}
                  </div>

                  {/* Thumbnail & Title */}
                  <div className="flex gap-3 items-start mb-2">
                    <img
                      src={offer.bannerImage}
                      alt={offer.title}
                      className="w-16 h-16 rounded-xl object-cover shrink-0 border border-slate-200"
                    />
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 leading-tight">
                        {offer.title}
                      </h4>
                      <p className="text-[11px] text-slate-500 line-clamp-2 mt-1">
                        {offer.description}
                      </p>
                    </div>
                  </div>

                  {/* Meta */}
                  <div className="bg-slate-50 p-2 rounded-xl text-[11px] text-slate-600 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span>الفترة:</span>
                      </span>
                      <span className="font-medium text-slate-800">
                        {offer.startDate} إلى {offer.endDate}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>الأصناف المشمولة:</span>
                      <span className="font-bold text-amber-700">
                        {appliesCount === 0 ? 'كافة أصناف المنيو' : `${appliesCount} أصناف محددة`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <button
                    onClick={() => toggleOfferStatus(offer.id)}
                    className={`text-xs font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-colors ${
                      offer.status === 'ACTIVE'
                        ? 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                        : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                    }`}
                  >
                    {offer.status === 'ACTIVE' ? (
                      <>
                        <Pause className="w-3.5 h-3.5" />
                        <span>إيقاف مؤقت</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5" />
                        <span>تفعيل العرض</span>
                      </>
                    )}
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setOfferToEdit(offer);
                        setShowModal(true);
                      }}
                      className="p-1.5 text-slate-600 hover:text-amber-600 hover:bg-slate-100 rounded-lg"
                      title="تعديل العرض"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteOffer(offer.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-lg"
                      title="حذف العرض"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>

      {/* Financial Rule clarification */}
      <div className="p-4 bg-amber-50/80 rounded-2xl border border-amber-200 text-xs text-slate-800 space-y-1.5">
        <div className="flex items-center gap-1.5 font-bold text-amber-900">
          <ShieldCheck className="w-4 h-4 text-amber-700" />
          <span>قاعدة الخصومات والأثر المالي على عمولة الإدارة</span>
        </div>
        <p className="text-slate-700 leading-relaxed">
          وفقًا للاتفاق المعتمد، يتحمل المطعم قيمة الخصم الترويجي المقدم للزبون. وبناءً على ذلك، يتم احتساب عمولة إدارة طلبات البيت (10%) على صافي قيمة الطعام بعد خصم العرض فقط، دون احتساب عمولة على الخصم الممنوح.
        </p>
      </div>

      {/* Modal */}
      <OfferModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSave={(data) => {
          if (offerToEdit) {
            updateOffer(offerToEdit.id, data);
          } else {
            addOffer(data);
          }
        }}
        offerToEdit={offerToEdit}
        menuItems={menuItems}
      />
    </div>
  );
};
