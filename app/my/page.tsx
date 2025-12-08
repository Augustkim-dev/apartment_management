import { getRequiredSession } from "@/lib/auth-utils";
import { query } from "@/lib/db-utils";
import { configService } from "@/lib/services/config-service";
import {
  CurrencyDollarIcon,
  ClockIcon,
  CheckCircleIcon,
  DocumentTextIcon
} from "@heroicons/react/24/outline";
import Link from "next/link";
import PaymentAccountCard from "@/components/PaymentAccountCard";

interface UnitBill {
  id: number;
  bill_year: number;
  bill_month: number;
  total_amount: number;
  payment_status: 'pending' | 'paid' | 'overdue';
  payment_date: string | null;
  due_date: string;
  unit_number: string;
}

interface UnpaidStats {
  unpaid_count: number;
  unpaid_total: number;
}

export default async function MyDashboard() {
  const session = await getRequiredSession();

  if (!session.user.unitId) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">호실이 배정되지 않았습니다. 관리자에게 문의하세요.</p>
      </div>
    );
  }

  // 납부 계좌 정보 조회
  const paymentConfig = await configService.getByCategory('payment');

  // 사용자의 입주/퇴거일 사이 청구서 조회
  const moveInDate = session.user.moveInDate || '2024-01-01';
  const moveOutDate = session.user.moveOutDate || '2099-12-31';

  const recentBills = await query<UnitBill[]>(`
    SELECT
      ub.id,
      mb.bill_year,
      mb.bill_month,
      ub.total_amount,
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
    LIMIT 6
  `, [session.user.unitId, moveInDate, moveOutDate]);

  // 전체 미납 통계 조회 (최근 6개월이 아닌 전체 기간)
  const unpaidStatsResult = await query<UnpaidStats[]>(`
    SELECT
      COUNT(*) as unpaid_count,
      COALESCE(SUM(ub.total_amount), 0) as unpaid_total
    FROM unit_bills ub
    JOIN monthly_bills mb ON ub.monthly_bill_id = mb.id
    WHERE ub.unit_id = ?
    AND ub.payment_status != 'paid'
    AND DATE(CONCAT(mb.bill_year, '-', LPAD(mb.bill_month, 2, '0'), '-01')) >= ?
    AND DATE(CONCAT(mb.bill_year, '-', LPAD(mb.bill_month, 2, '0'), '-01')) <= ?
  `, [session.user.unitId, moveInDate, moveOutDate]);

  const unpaidStats = unpaidStatsResult[0] || { unpaid_count: 0, unpaid_total: 0 };

  // 현재 달 청구서
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const currentBill = recentBills.find(
    bill => bill.bill_year === currentYear && bill.bill_month === currentMonth
  );

  // 전체 미납 통계 (전체 기간 기준)
  const unpaidCount = Number(unpaidStats.unpaid_count) || 0;
  const totalUnpaid = Number(unpaidStats.unpaid_total) || 0;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          안녕하세요, {session.user.name}님
        </h1>
        <p className="text-gray-600 mt-1">
          {recentBills[0]?.unit_number}호 전기료 관리
        </p>
      </div>

      {/* 현재 달 청구서 요약 */}
      {currentBill && (
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {currentYear}년 {currentMonth}월 청구서
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center">
              <CurrencyDollarIcon className="h-8 w-8 text-blue-500 mr-3" />
              <div>
                <p className="text-sm text-gray-600">청구 금액</p>
                <p className="text-xl font-bold text-gray-900">
                  {(currentBill.total_amount ? Math.floor(currentBill.total_amount) : 0).toLocaleString()}원
                </p>
              </div>
            </div>
            <div className="flex items-center">
              <ClockIcon className="h-8 w-8 text-yellow-500 mr-3" />
              <div>
                <p className="text-sm text-gray-600">납부 기한</p>
                <p className="text-xl font-bold text-gray-900">
                  {new Date(currentBill.due_date).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="flex items-center">
              {currentBill.payment_status === 'paid' ? (
                <>
                  <CheckCircleIcon className="h-8 w-8 text-green-500 mr-3" />
                  <div>
                    <p className="text-sm text-gray-600">납부 상태</p>
                    <p className="text-xl font-bold text-green-600">납부완료</p>
                  </div>
                </>
              ) : (
                <>
                  <DocumentTextIcon className="h-8 w-8 text-orange-500 mr-3" />
                  <div>
                    <p className="text-sm text-gray-600">납부 상태</p>
                    <p className="text-xl font-bold text-orange-600">미납</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">납부 대기 건수</h3>
          <p className="text-3xl font-bold text-gray-900">{unpaidCount}건</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">납부하셔야 할 총액</h3>
          <p className="text-3xl font-bold text-gray-900">
            {(totalUnpaid ? Math.floor(totalUnpaid) : 0).toLocaleString()}원
          </p>
        </div>
      </div>

      {/* 납부 계좌 안내 */}
      <PaymentAccountCard
        bankName={paymentConfig.bank_name || ''}
        accountNumber={paymentConfig.account_number || ''}
        accountHolder={paymentConfig.account_holder || ''}
      />

      {/* 최근 청구서 목록 */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">최근 청구서</h2>
            <Link
              href="/my/bills"
              className="text-sm text-blue-600 hover:text-blue-500"
            >
              전체보기 →
            </Link>
          </div>
        </div>
        <div className="divide-y divide-gray-200">
          {recentBills.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-600">
              청구서가 없습니다.
            </div>
          ) : (
            recentBills.map((bill) => (
              <Link
                key={bill.id}
                href={`/my/bills/${bill.id}`}
                className="block px-6 py-4 hover:bg-gray-50"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {bill.bill_year}년 {bill.bill_month}월
                    </p>
                    <p className="text-sm text-gray-600">
                      납부기한: {new Date(bill.due_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {(bill.total_amount ? Math.floor(bill.total_amount) : 0).toLocaleString()}원
                    </p>
                    <p className={`text-sm ${
                      bill.payment_status === 'paid'
                        ? 'text-green-600'
                        : bill.payment_status === 'overdue'
                        ? 'text-red-600'
                        : 'text-orange-600'
                    }`}>
                      {bill.payment_status === 'paid' ? '납부완료' :
                       bill.payment_status === 'overdue' ? '연체' : '미납'}
                    </p>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}