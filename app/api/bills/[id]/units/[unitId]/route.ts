import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { UnitInvoiceResponse } from '@/types/database';
import { ConfigService } from '@/lib/services/config-service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; unitId: string }> }
) {
  try {
    const { id, unitId: uid } = await params;
    const billId = parseInt(id);
    const unitId = parseInt(uid);

    if (isNaN(billId) || isNaN(unitId)) {
      return NextResponse.json(
        { error: 'Invalid bill ID or unit ID' },
        { status: 400 }
      );
    }

    const connection = await pool.getConnection();

    try {
    // 1. 호실별 청구서 조회
    const [unitBillRows] = await connection.execute(`
      SELECT
        ub.*,
        u.unit_number,
        u.tenant_name,
        mb.bill_year,
        mb.bill_month,
        mb.billing_period_start,
        mb.billing_period_end,
        mb.contract_type,
        mb.contract_power,
        mb.applied_power,
        mb.total_usage as building_total_usage,
        mb.total_amount as building_total_amount,
        mb.basic_fee as building_basic_fee,
        mb.power_fee as building_power_fee,
        mb.climate_fee as building_climate_fee,
        mb.fuel_fee as building_fuel_fee,
        mb.power_factor_fee as building_power_factor_fee,
        mb.vat as building_vat,
        mb.power_fund as building_power_fund,
        mb.due_date,
        pi.bank_name,
        pi.account_number,
        pi.account_holder
      FROM unit_bills ub
      JOIN units u ON ub.unit_id = u.id
      JOIN monthly_bills mb ON ub.monthly_bill_id = mb.id
      LEFT JOIN payment_info pi ON mb.payment_info_id = pi.id
      WHERE ub.monthly_bill_id = ? AND ub.unit_id = ?
    `, [billId, unitId]);

    if (!unitBillRows || (unitBillRows as any[]).length === 0) {
      return NextResponse.json(
        { error: 'Unit bill not found' },
        { status: 404 }
      );
    }

    const unitBill = (unitBillRows as any[])[0];

    // 디버깅용 로그
    console.log('Unit Bill Data:', {
      unitId: unitId,
      unitNumber: unitBill.unit_number,
      tenantName: unitBill.tenant_name,
      billId: billId
    });

    // 2. 전월 청구 정보 조회
    const prevMonth = unitBill.bill_month === 1 ? 12 : unitBill.bill_month - 1;
    const prevYear = unitBill.bill_month === 1 ? unitBill.bill_year - 1 : unitBill.bill_year;

    const [prevBillRows] = await connection.execute(`
      SELECT
        ub.basic_fee,
        ub.power_fee,
        ub.climate_fee,
        ub.fuel_fee,
        ub.power_factor_fee,
        ub.vat,
        ub.power_fund,
        ub.round_down,
        ub.total_amount
      FROM unit_bills ub
      JOIN monthly_bills mb ON ub.monthly_bill_id = mb.id
      WHERE mb.bill_year = ? AND mb.bill_month = ? AND ub.unit_id = ?
    `, [prevYear, prevMonth, unitId]);

    const prevBill = (prevBillRows as any[]).length > 0 ? (prevBillRows as any[])[0] : null;

    // 3. 미납 내역 조회
    const [unpaidRows] = await connection.execute(`
      SELECT
        bill_year,
        bill_month,
        unpaid_amount
      FROM unpaid_history
      WHERE unit_id = ? AND is_paid = FALSE
      ORDER BY bill_year DESC, bill_month DESC
    `, [unitId]);

    const unpaidDetails = (unpaidRows as any[]).map(row => ({
      month: `${row.bill_year}.${String(row.bill_month).padStart(2, '0')}`,
      amount: row.unpaid_amount
    }));

    const totalUnpaid = unpaidDetails.reduce((sum, item) => sum + item.amount, 0);

    // 4. 안내사항 조회
    const [noticeRows] = await connection.execute(`
      SELECT notice_content
      FROM billing_notices
      WHERE monthly_bill_id = ? AND is_active = TRUE
      ORDER BY display_order
    `, [billId]);

    let notices = (noticeRows as any[]).map(row => row.notice_content);

    // ConfigService에서 안내사항 가져오기 (DB에 없는 경우)
    const configService = ConfigService.getInstance();
    if (notices.length === 0) {
      try {
        const noticeData = await configService.getNotices();
        notices = noticeData
          .filter(n => n.active)
          .sort((a, b) => a.order - b.order)
          .map(n => n.text);
      } catch (error) {
        console.error('Failed to load notices from config:', error);
        // 폴백: 기본 안내사항 제공
        notices = [
          '* 전기요금은 매월 말일까지 납부해 주시기 바랍니다.',
          '* 미납 시 연체료가 부과될 수 있습니다.',
          '* 요금 문의: 관리사무소 (02-1234-5678)',
          '* 계량기 검침일: 매월 15일'
        ];
      }
    }

    // 5. 응답 데이터 구성
    const response: UnitInvoiceResponse = {
      // 기본 정보
      billYear: unitBill.bill_year,
      billMonth: unitBill.bill_month,
      unitNumber: unitBill.unit_number,
      tenantName: unitBill.tenant_name || `입주자${unitBill.unit_number}`,

      // 청구 정보
      currentCharges: {
        basicFee: Number(unitBill.basic_fee) || 0,
        powerFee: Number(unitBill.power_fee) || 0,
        climateFee: Number(unitBill.climate_fee) || 0,
        fuelFee: Number(unitBill.fuel_fee) || 0,
        powerFactorFee: Number(unitBill.power_factor_fee) || 0,
        subtotal: Number(unitBill.basic_fee || 0) + Number(unitBill.power_fee || 0) +
                  Number(unitBill.climate_fee || 0) + Number(unitBill.fuel_fee || 0) +
                  Number(unitBill.power_factor_fee || 0),
        vat: Number(unitBill.vat) || 0,
        powerFund: Number(unitBill.power_fund) || 0,
        roundDown: Number(unitBill.round_down) || 0,
        total: Number(unitBill.total_amount) || 0
      },

      // 이전 월 데이터가 없으면 모두 0으로 표시
      previousCharges: prevBill ? {
        basicFee: Number(prevBill.basic_fee) || 0,
        powerFee: Number(prevBill.power_fee) || 0,
        climateFee: Number(prevBill.climate_fee) || 0,
        fuelFee: Number(prevBill.fuel_fee) || 0,
        powerFactorFee: Number(prevBill.power_factor_fee) || 0,
        subtotal: Number(prevBill.basic_fee || 0) + Number(prevBill.power_fee || 0) +
                  Number(prevBill.climate_fee || 0) + Number(prevBill.fuel_fee || 0) +
                  Number(prevBill.power_factor_fee || 0),
        vat: Number(prevBill.vat) || 0,
        powerFund: Number(prevBill.power_fund) || 0,
        roundDown: Number(prevBill.round_down) || 0,
        total: Number(prevBill.total_amount) || 0
      } : {
        basicFee: 0,
        powerFee: 0,
        climateFee: 0,
        fuelFee: 0,
        powerFactorFee: 0,
        subtotal: 0,
        vat: 0,
        powerFund: 0,
        roundDown: 0,
        total: 0
      },

      // 미납 정보
      unpaidAmount: totalUnpaid,
      unpaidDetails: unpaidDetails,

      // 건물 전체 정보
      buildingTotal: {
        totalAmount: Number(unitBill.building_total_amount) || 0,
        totalUsage: Number(unitBill.building_total_usage) || 0,
        basicFee: Number(unitBill.building_basic_fee) || 0,
        powerFee: Number(unitBill.building_power_fee) || 0,
        climateFee: Number(unitBill.building_climate_fee) || 0,
        fuelFee: Number(unitBill.building_fuel_fee) || 0,
        powerFactorFee: Number(unitBill.building_power_factor_fee) || 0,
        vat: Number(unitBill.building_vat) || 0,
        powerFund: Number(unitBill.building_power_fund) || 0
      },

      // 검침 정보
      meterReading: {
        previous: Number(unitBill.previous_reading) || 0,
        current: Number(unitBill.current_reading) || 0,
        usage: Number(unitBill.usage_amount) || 0
      },

      // 계산 기준
      usageRate: Number(unitBill.usage_rate) || 0,
      unitBaseFee: Number(unitBill.basic_fee) || 0,

      // 계약 정보
      contractInfo: {
        contractType: unitBill.contract_type || '일반용(을)고압A선택2',
        contractPower: unitBill.contract_power || 400,
        appliedPower: unitBill.applied_power || 350,
        basicFeeRate: Number(await configService.get('billing.basic_fee_rate').catch(() => 8320)) || 8320
      },

      // 납부 정보 - ConfigService에서 가져오기 시도, 실패시 DB 값 또는 폴백 사용
      paymentInfo: {
        bankName: unitBill.bank_name ||
                 await configService.get('payment.bank_name').catch(() => '신한은행') ||
                 '신한은행',
        accountNumber: unitBill.account_number ||
                      await configService.get('payment.account_number').catch(() => '100-035-727568') ||
                      '100-035-727568',
        accountHolder: unitBill.account_holder ||
                      await configService.get('payment.account_holder').catch(() => '㈜코로코') ||
                      '㈜코로코',
        dueDate: unitBill.due_date ?
          new Date(unitBill.due_date).toISOString().split('T')[0] :
          new Date(unitBill.bill_year, unitBill.bill_month, 0).toISOString().split('T')[0]
      },

      // 청구 기간
      billingPeriod: {
        start: new Date(unitBill.billing_period_start).toISOString().split('T')[0],
        end: new Date(unitBill.billing_period_end).toISOString().split('T')[0]
      },

      // 안내사항
      notices: notices
    };

    return NextResponse.json(response);

    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('Error fetching unit invoice:', error);
    return NextResponse.json(
      { error: 'Failed to fetch unit invoice' },
      { status: 500 }
    );
  }
}