import React, { useState } from 'react';
import { useStudio } from '../../context/StudioContext';
import { InvoiceModal } from './InvoiceModal';
import { WalletTransaction } from '../../types';
import {
  Wallet,
  FileText,
} from 'lucide-react';
import { RiExchangeLine } from 'react-icons/ri';

const isAdminTransfer = (transaction: WalletTransaction) =>
  transaction.type === 'Add Money' &&
  !/^wallet top-up \((upi|card|netbanking)\)$/i.test(transaction.description.trim());

export const WalletPage: React.FC = () => {
  const {
    walletBalance,
    transactions,
    profile,
  } = useStudio();

  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [selectedInvoiceTxn, setSelectedInvoiceTxn] = useState<WalletTransaction | null>(null);

  const filteredTransactions = transactions.filter((t) => {
    if (t.type === 'Add Money' && !isAdminTransfer(t)) return false;
    if (filterCategory === 'All') return true;
    if (filterCategory === 'Plans') return t.category === 'Plan Purchase';
    if (filterCategory === 'Live Stream') return t.category === 'Live Streaming';
    if (filterCategory === 'Photos') return t.category === 'Photo Sharing';
    if (filterCategory === 'Admin Transfers') return isAdminTransfer(t);
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="bg-white p-5 rounded-2xl border border-[#E7E9F0] shadow-2xs flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-[#F20D24]">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#171717]">Wallet</h2>
            <p className="text-xs text-[#737783]">
              View your balance and track admin transfers and wallet spending.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5">
        <div className="bg-gradient-to-br from-white via-red-50/20 to-white rounded-2xl border border-[#E7E9F0] shadow-2xs p-6 flex items-center justify-between gap-5">
          <div className="w-16 h-16 rounded-full bg-red-50 border border-red-100 flex items-center justify-center text-[#F20D24] shrink-0 shadow-xs">
            <Wallet className="w-8 h-8" />
          </div>
          <div>
            <p className="text-xs font-bold text-[#737783] uppercase tracking-wider">Wallet Balance</p>
            <h3 className="text-3xl lg:text-4xl font-extrabold text-[#171717] mt-1">
              ₹{walletBalance.toLocaleString('en-IN')}
            </h3>
          </div>
          <p className="max-w-sm text-right text-xs text-gray-500">
            Wallet funds are added by the ON AIR administrator. Contact your administrator to request a transfer.
          </p>
        </div>
      </div>

      {/* Transaction History Section */}
      <div className="bg-white rounded-2xl border border-[#E7E9F0] shadow-2xs overflow-hidden">
        {/* Header with Title and Filter Dropdown */}
        <div className="p-5 border-b border-[#E7E9F0] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <RiExchangeLine className="w-5 h-5 text-[#F20D24]" />
            <h3 className="text-base font-bold text-gray-900">Transaction History</h3>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-[#E7E9F0] text-xs font-medium text-gray-700 bg-white focus:outline-none focus:border-[#F20D24] cursor-pointer"
            >
              <option value="All">All Transactions</option>
              <option value="Plans">Plans</option>
              <option value="Live Stream">Live Stream</option>
              <option value="Photos">Photos</option>
              <option value="Admin Transfers">Admin Transfers</option>
            </select>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F8F9FD] border-b border-[#E7E9F0] text-[11px] font-bold text-[#737783] uppercase tracking-wider">
                <th className="py-3 px-4">#</th>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4 text-right">Balance</th>
                <th className="py-3 px-4 text-center">Invoice</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7E9F0] text-sm">
              {filteredTransactions.map((txn) => (
                <tr
                  key={txn.id}
                  className="hover:bg-gray-50/70 transition-colors cursor-pointer"
                  onClick={() => setSelectedInvoiceTxn(txn)}
                >
                  {/* # ID */}
                  <td className="py-3.5 px-4 font-mono text-xs font-bold text-gray-500 whitespace-nowrap">
                    {txn.id}
                  </td>

                  {/* Date & Time */}
                  <td className="py-3.5 px-4 text-xs text-gray-600 whitespace-nowrap">
                    {txn.date}
                  </td>

                  {/* Type Badge */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    {txn.type === 'Add Money' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        + Admin Transfer
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-50 text-[#F20D24] border border-red-200">
                        – Debit
                      </span>
                    )}
                  </td>

                  {/* Description */}
                  <td className="py-3.5 px-4 text-xs font-medium text-gray-800">
                    <div>{txn.description}</div>
                  </td>

                  {/* Amount */}
                  <td className="py-3.5 px-4 text-right whitespace-nowrap font-bold text-xs">
                    {txn.type === 'Add Money' ? (
                      <span className="text-emerald-700">+ ₹{txn.amount.toLocaleString('en-IN')}</span>
                    ) : (
                      <span className="text-[#F20D24]">– ₹{txn.amount.toLocaleString('en-IN')}</span>
                    )}
                  </td>

                  {/* Balance after transaction */}
                  <td className="py-3.5 px-4 text-right whitespace-nowrap text-xs font-bold text-gray-900">
                    ₹{txn.balanceAfter.toLocaleString('en-IN')}
                  </td>

                  {/* Invoice action */}
                  <td className="py-3.5 px-4 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => setSelectedInvoiceTxn(txn)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                      title="View Tax Invoice"
                    >
                      <FileText className="w-4 h-4 inline" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tax Invoice Modal */}
      <InvoiceModal
        transaction={selectedInvoiceTxn}
        profile={profile}
        onClose={() => setSelectedInvoiceTxn(null)}
      />
    </div>
  );
};
