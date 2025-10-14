'use client';

import { useState } from 'react';
import {
  CreditCardIcon,
  CheckIcon,
  ClipboardDocumentIcon
} from '@heroicons/react/24/outline';

interface PaymentAccountCardProps {
  bankName: string;
  accountNumber: string;
  accountHolder: string;
}

export default function PaymentAccountCard({
  bankName,
  accountNumber,
  accountHolder
}: PaymentAccountCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const accountText = `${bankName} ${accountNumber} ${accountHolder}`;
    navigator.clipboard.writeText(accountText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg shadow p-6 mb-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div className="text-white">
          <div className="flex items-center mb-2">
            <CreditCardIcon className="h-6 w-6 mr-2" />
            <h3 className="text-lg font-semibold">납부 계좌 안내</h3>
          </div>
          <p className="text-xl md:text-2xl font-bold mb-1">
            {bankName} {accountNumber}
          </p>
          <p className="text-sm text-blue-100">예금주: {accountHolder}</p>
        </div>
        <button
          onClick={handleCopy}
          className="mt-4 md:mt-0 w-full md:w-auto inline-flex items-center justify-center px-4 py-2 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-medium"
        >
          {copied ? (
            <>
              <CheckIcon className="h-5 w-5 mr-2" />
              복사됨
            </>
          ) : (
            <>
              <ClipboardDocumentIcon className="h-5 w-5 mr-2" />
              계좌 복사
            </>
          )}
        </button>
      </div>
    </div>
  );
}
