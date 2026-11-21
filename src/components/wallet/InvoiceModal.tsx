import React from 'react';
import { WalletTransaction, StudioProfile } from '../../types';
import { X, Printer, Download, CheckCircle2 } from 'lucide-react';

interface InvoiceModalProps {
  transaction: WalletTransaction | null;
  profile: StudioProfile;
  onClose: () => void;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({ transaction, profile, onClose }) => {
  if (!transaction) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
          <div>
            <h3 className="text-base font-bold text-gray-900">Tax Invoice</h3>
            <p className="text-xs text-gray-500">{transaction.invoiceId}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-gray-200 flex items-center justify-center text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 text-xs">
          <div className="flex items-start justify-between border-b pb-4">
            <div>
              <p className="font-extrabold text-base text-gray-900">ON AIR Technologies Pvt Ltd</p>
              <p className="text-gray-500 mt-0.5">GSTIN: 29AABCO9921D1ZB</p>
              <p className="text-gray-500">Palace Road, Bengaluru, Karnataka 560001</p>
            </div>
            <div className="text-right">
              <span className="px-2.5 py-1 rounded-full font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px]">
                PAID
              </span>
              <p className="text-gray-500 mt-2">Date: {transaction.date}</p>
            </div>
          </div>

          <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
            <span className="text-[10px] uppercase font-bold text-gray-400">Billed To Studio:</span>
            <p className="font-bold text-sm text-gray-900 mt-0.5">{profile.studioName}</p>
            <p className="text-gray-600">Owner: {profile.ownerName} | {profile.mobileNumber}</p>
          </div>

          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b text-gray-400 uppercase text-[10px] font-bold">
                <th className="py-2">Item Description</th>
                <th className="py-2 text-right">Amount (INR)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr>
                <td className="py-2.5 text-gray-800 font-medium">
                  {transaction.description}
                  {transaction.eventName && <span className="block text-[11px] text-gray-400">Event: {transaction.eventName}</span>}
                </td>
                <td className="py-2.5 text-right font-bold text-gray-900">₹{transaction.amount.toLocaleString('en-IN')}</td>
              </tr>
              <tr className="text-gray-500">
                <td className="py-2">CGST (9%) + SGST (9%)</td>
                <td className="py-2 text-right">Included</td>
              </tr>
              <tr className="font-bold text-sm text-gray-900 border-t">
                <td className="py-2.5">Total Paid</td>
                <td className="py-2.5 text-right text-[#F20D24]">₹{transaction.amount.toLocaleString('en-IN')}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-3">
          <button
            onClick={() => window.print()}
            className="px-4 py-2 rounded-xl border border-gray-300 text-xs font-semibold text-gray-700 hover:bg-white flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print</span>
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-gray-900 hover:bg-black text-white text-xs font-bold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
