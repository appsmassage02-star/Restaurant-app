import React, { useState } from 'react';
import { X, Check, Wallet, Receipt, AlertCircle } from 'lucide-react';

interface SettlementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (amount: number, receiptNum: string, notes: string) => void;
  maxAmount: number;
}

export const SettlementModal: React.FC<SettlementModalProps> = ({
  isOpen,
  onClose,
  onSave,
  maxAmount,
}) => {
  const [amount, setAmount] = useState<number | ''>(Math.min(1000, maxAmount || 500));
  const [receiptNumber, setReceiptNumber] = useState(`SET-${Math.floor(1000 + Math.random() * 9000)}`);
  const [notes, setNotes] = useState('تحويل أرباح تسوية دورية لحساب المطعم البنكي معتمد من الإدارة.');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount === '' || amount <= 0) {
      setError('يرجى إدخال مبلغ تسوية صحيح أكبر من الصفر.');
      return;
    }
    if (amount > maxAmount && maxAmount > 0) {
      setError(`المبلغ المطلوب يتجاوز الرصيد غير المسوى المتاح (${maxAmount.toLocaleString('ar-EG')} ج.م).`);
      return;
    }
    if (!receiptNumber.trim()) {
      setError('يرجى إدخال رقم أو مرجع إيصال التسوية.');
      return;
    }

    onSave(Number(amount), receiptNumber.trim(), notes.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden text-right">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">تسجيل تسوية مستحقات تجريبية</h3>
              <p className="text-[11px] text-slate-400">محاكاة اعتماد صرف الأرباح للمطعم</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-700 font-bold">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-slate-700 font-bold">المبلغ المطلوب تسويته (ج.م) *</label>
              <span className="text-[11px] text-emerald-700 font-semibold">
                الرصيد المتاح: {maxAmount.toLocaleString('ar-EG')} ج.م
              </span>
            </div>
            <input
              type="number"
              min="1"
              required
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value === '' ? '' : parseFloat(e.target.value));
                setError('');
              }}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">رقم مرجع الإيصال الإداري *</label>
            <input
              type="text"
              required
              value={receiptNumber}
              onChange={(e) => setReceiptNumber(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">ملاحظات التحويل والتسوية</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 font-bold hover:bg-slate-100"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-xs"
            >
              <Check className="w-4 h-4" />
              <span>اعتماد وتسجيل التسوية</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
