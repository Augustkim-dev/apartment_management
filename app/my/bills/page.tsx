import { getRequiredSession } from "@/lib/auth-utils";
import { query } from "@/lib/db-utils";
import Link from "next/link";
import {
  DocumentTextIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon
} from "@heroicons/react/24/outline";

interface UnitBill {
  id: number;
  bill_year: number;
  bill_month: number;
  total_amount: number;
  payment_status: 'pending' | 'paid' | 'overdue';
  payment_date: string | null;
  due_date: string;
  unit_number: string;
  basic_fee: number;
  power_fee: number;
  vat: number;
}

export default async function MyBillsPage() {
  const session = await getRequiredSession();

  if (!session.user.unitId) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">호실이 배정되지 않았습니다. 관리자에게 문의하세요.</p>
      </div>
    );
  }

  // 사용자의 입주일과 퇴거일을 고려한 청구서 조회
  const moveInDate = session.user.moveInDate || '2024-01-01';
  const moveOutDate = session.user.moveOutDate || '2099-12-31';

  const bills = await query<UnitBill[]>(`
    SELECT
      ub.id,
      mb.bill_year,
      mb.bill_month,
      ub.total_amount,
      ub.basic_fee,
      ub.power_fee,
      ub.vat,
      ub.payment_status,
      ub.payment_date,
      ub.due_date,
      u.unit_number
    FROM unit_bills ub
    JOIN monthly_bills mb ON ub.monthly_bill_id = mb.id
    JOIN units u ON ub.unit_id = u.id
    WHERE ub.unit_id = ?
    AND DATE(CONCAT(mb.bill_year, '-', LPAD(mb.bill_month, 2, '0'), '-01')) >= ?
    AND DATE(CONCAT(mb.bill_year, '-', LPAD(mb.bill_month, 2, '0'), '-01')) <= ?
    ORDER BY mb.bill_year DESC, mb.bill_month DESC
  `, [session.user.unitId, moveInDate, moveOutDate]);

  // 통계 계산
  const totalAmount = bills.reduce((sum, bill) => sum + (bill.total_amount || 0), 0);
  const paidAmount = bills
    .filter(b => b.payment_status === 'paid')
    .reduce((sum, bill) => sum + (bill.total_amount || 0), 0);
  const unpaidAmount = bills
    .filter(b => b.payment_status !== 'paid')
    .reduce((sum, bill) => sum + (bill.total_amount || 0), 0);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'overdue':
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      default:
        return <ClockIcon className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'paid':
        return '납부완료';
      case 'overdue':
        return '연체';
      default:
        return '미납';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'text-green-600';
      case 'overdue':
        return 'text-red-600';
      default:
        return 'text-yellow-600';
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">청구서 내역</h1>
        <p className="text-gray-600 mt-1">
          {bills[0]?.unit_number}호 전기료 청구 내역
          {session.user.moveInDate && (
            <span className="ml-2 text-sm">
              (입주일: {new Date(session.user.moveInDate).toLocaleDateString()})
            </span>
          )}
        </p>
      </div>

      {/* 요약 통계 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">총 청구액</h3>
          <p className="text-2xl font-bold text-gray-900">
            {(!totalAmount || isNaN(totalAmount) ? 0 : Math.floor(totalAmount)).toLocaleString()}원
          </p>
          <p className="text-xs text-gray-500 mt-1">전체 {bills.length}건</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">납부 완료</h3>
          <p className="text-2xl font-bold text-green-600">
            {(!paidAmount || isNaN(paidAmount) ? 0 : Math.floor(paidAmount)).toLocaleString()}원
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {bills.filter(b => b.payment_status === 'paid').length}건
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">미납액</h3>
          <p className="text-2xl font-bold text-orange-600">
            {(!unpaidAmount || isNaN(unpaidAmount) ? 0 : Math.floor(unpaidAmount)).toLocaleString()}원
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {bills.filter(b => b.payment_status !== 'paid').length}건
          </p>
        </div>
      </div>

      {/* 청구서 목록 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">전체 청구서 목록</h2>
        </div>

        {bills.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-500">
            청구서가 없습니다.
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {bills.map((bill) => (
              <Link
                key={bill.id}
                href={`/my/bills/${bill.id}`}
                className="block px-6 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <DocumentTextIcon className="h-8 w-8 text-gray-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {bill.bill_year}년 {bill.bill_month}월 청구서
                      </p>
                      <div className="flex items-center gap-4 mt-1">
                        <p className="text-sm text-gray-500">
                          기본료: {(bill.basic_fee ? Math.floor(bill.basic_fee) : 0).toLocaleString()}원
                        </p>
                        <p className="text-sm text-gray-500">
                          전력량요금: {(bill.power_fee ? Math.floor(bill.power_fee) : 0).toLocaleString()}원
                        </p>
                        <p className="text-sm text-gray-500">
                          부가세: {(bill.vat ? Math.floor(bill.vat) : 0).toLocaleString()}원
                        </p>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        납부기한: {new Date(bill.due_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="text-lg font-semibold text-gray-900">
                        {(bill.total_amount ? Math.floor(bill.total_amount) : 0).toLocaleString()}원
                      </p>
                      <div className={`flex items-center gap-1 mt-1 ${getStatusColor(bill.payment_status)}`}>
                        {getStatusIcon(bill.payment_status)}
                        <span className="text-sm font-medium">
                          {getStatusText(bill.payment_status)}
                        </span>
                      </div>
                      {bill.payment_date && (
                        <p className="text-xs text-gray-400 mt-1">
                          납부일: {new Date(bill.payment_date).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}