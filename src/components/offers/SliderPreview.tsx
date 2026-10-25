import React, { useState } from 'react';
import { ChevronRight, ChevronLeft, Sparkles, Smartphone, Eye } from 'lucide-react';
import { Offer } from '../../types';

interface SliderPreviewProps {
  offers: Offer[];
}

export const SliderPreview: React.FC<SliderPreviewProps> = ({ offers }) => {
  const activeOffers = offers.filter((o) => o.status === 'ACTIVE');
  const [currentIndex, setCurrentIndex] = useState(0);

  if (activeOffers.length === 0) {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-center text-slate-400 text-xs">
        <Sparkles className="w-8 h-8 text-slate-300 mx-auto mb-2" />
        <p className="font-bold text-slate-600">لا توجد عروض نشطة حاليًا في السلايدر</p>
        <p className="mt-0.5">قم بتفعيل أحد العروض لمعاينة شكله كما سيظهر للعميل في التطبيق.</p>
      </div>
    );
  }

  const current = activeOffers[currentIndex % activeOffers.length];

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? activeOffers.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === activeOffers.length - 1 ? 0 : prev + 1));
  };

  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Smartphone className="w-4 h-4 text-amber-500" />
          <h3 className="text-xs font-bold text-slate-800">
            معاينة حية لسلايدر العروض (كما يظهر للعميل في تطبيق طلبات البيت)
          </h3>
        </div>
        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
          {activeOffers.length} عروض نشطة في السلايدر
        </span>
      </div>

      {/* Banner Card Preview */}
      <div className="relative rounded-2xl overflow-hidden shadow-lg h-52 sm:h-60 group">
        <img
          src={current.bannerImage}
          alt={current.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {/* Dark Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/60 to-transparent flex flex-col justify-end p-5 text-white">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-1 bg-amber-500 text-slate-950 text-xs font-black rounded-lg shadow-sm flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              {current.discountType === 'PERCENTAGE'
                ? `خصم ${current.discountValue}%`
                : `وفر ${current.discountValue} ج.م`}
            </span>
            <span className="text-[11px] bg-white/20 backdrop-blur-xs px-2 py-0.5 rounded-md text-white font-medium">
              حتى {new Date(current.endDate).toLocaleDateString('ar-EG')}
            </span>
          </div>

          <h4 className="text-base sm:text-lg font-black text-white leading-tight mb-1">
            {current.title}
          </h4>
          <p className="text-xs text-white/80 line-clamp-1 max-w-lg">
            {current.description}
          </p>
        </div>

        {/* Carousel arrows if more than 1 offer */}
        {activeOffers.length > 1 && (
          <>
            <button
              onClick={handlePrev}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-slate-900/60 backdrop-blur-xs text-white flex items-center justify-center hover:bg-slate-900 transition-all opacity-80 hover:opacity-100"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <button
              onClick={handleNext}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-slate-900/60 backdrop-blur-xs text-white flex items-center justify-center hover:bg-slate-900 transition-all opacity-80 hover:opacity-100"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          </>
        )}
      </div>

      {/* Dots Indicator */}
      {activeOffers.length > 1 && (
        <div className="flex items-center justify-center gap-1.5 pt-1">
          {activeOffers.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className={`h-1.5 rounded-full transition-all ${
                currentIndex % activeOffers.length === i
                  ? 'w-6 bg-amber-500'
                  : 'w-2 bg-slate-300'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
};
