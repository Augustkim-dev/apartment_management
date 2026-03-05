import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db-utils';
import { RowDataPacket } from 'mysql2';
import { configService } from '@/lib/services/config-service';
import { estimationService } from '@/lib/services/estimation.service';

// 이사정산 추정 청구서 조회 (공개 API - 인증 불필요)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const settlementId = parseInt(id);

    if (isNaN(settlementId)) {
      return NextResponse.json(
        { error: 'Invalid settlement ID' },
        { status: 400 }
      );
    }

    // 정산 데이터 조회
    const rows = await query<RowDataPacket[]>(
      `SELECT
        ms.*,
        u.unit_number,
        ot.name AS outgoing_name,
        ot.contact AS outgoing_contact,
        ot.move_in_reading AS previous_reading
      FROM move_settlements ms
      JOIN units u ON ms.unit_id = u.id
      JOIN tenants ot ON ms.outgoing_tenant_id = ot.id
      WHERE ms.id = ? AND ms.status != 'cancelled'`,
      [settlementId]
    );

    if (rows.length === 0) {
      return NextResponse.json(
        { error: '이사 정산을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    const row = rows[0];

    // 항목별 요금 데이터 확인 (없으면 재계산)
    let fees = {
      basicFee: row.estimated_basic_fee != null ? Number(row.estimated_basic_fee) : null,
      powerFee: row.estimated_power_fee != null ? Number(row.estimated_power_fee) : null,
      climateFee: row.estimated_climate_fee != null ? Number(row.estimated_climate_fee) : null,
      fuelFee: row.estimated_fuel_fee != null ? Number(row.estimated_fuel_fee) : null,
      powerFactorFee: row.estimated_power_factor_fee != null ? Number(row.estimated_power_factor_fee) : null,
      vat: row.estimated_vat != null ? Number(row.estimated_vat) : null,
      powerFund: row.estimated_power_fund != null ? Number(row.estimated_power_fund) : null,
      usageRatio: row.estimated_usage_ratio != null ? Number(row.estimated_usage_ratio) : null,
    };

    // fee 컬럼이 NULL이면 estimationService로 재계산 (기존 데이터 fallback)
    if (fees.basicFee === null) {
      try {
        const outgoingUsage = Number(row.outgoing_usage) || 0;
        const billYear = row.bill_year;
        const billMonth = row.bill_month;

        const monthsData = await estimationService.getLast3MonthsData(billYear, billMonth);
        const estimatedCharges = estimationService.calculateAverage(monthsData);
        const result = estimationService.calculateMoveOutBill(outgoingUsage, estimatedCharges);

        fees = {
          basicFee: result.calculatedBill.basicFee,
          powerFee: result.calculatedBill.powerFee,
          climateFee: result.calculatedBill.climateFee,
          fuelFee: result.calculatedBill.fuelFee,
          powerFactorFee: result.calculatedBill.powerFactorFee,
          vat: result.calculatedBill.vat,
          powerFund: result.calculatedBill.powerFund,
          usageRatio: result.calculatedBill.usageRatio,
        };
      } catch (error) {
        console.error('추정 요금 재계산 실패:', error);
      }
    }

    const subtotal = (fees.basicFee || 0) + (fees.powerFee || 0) +
                     (fees.climateFee || 0) + (fees.fuelFee || 0) +
                     (fees.powerFactorFee || 0);
    const totalAmount = subtotal + (fees.vat || 0) + (fees.powerFund || 0);

    // 이전 검침값 조회
    const previousReading = row.previous_reading != null
      ? Number(row.previous_reading)
      : 0;

    // baseMonths 파싱
    let baseMonths: { year: number; month: number }[] = [];
    try {
      if (row.estimation_base_months) {
        baseMonths = JSON.parse(row.estimation_base_months);
      }
    } catch { baseMonths = []; }

    // 납부 정보 조회
    const paymentConfig = await configService.getByCategory('payment');

    // 청구서 납부 상태 조회
    const billRows = await query<RowDataPacket[]>(
      `SELECT payment_status FROM unit_bills
       WHERE move_settlement_id = ? AND bill_type = 'move_out'
       LIMIT 1`,
      [settlementId]
    );
    const paymentStatus = billRows.length > 0 ? billRows[0].payment_status : 'pending';

    // 응답 구성
    const response = {
      // 기본 정보
      settlementId: row.id,
      billYear: row.bill_year,
      billMonth: row.bill_month,
      unitNumber: row.unit_number,
      tenantName: row.outgoing_name,
      isEstimated: true,
      status: row.status,
      settlementDate: row.settlement_date,

      // 요금 상세
      currentCharges: {
        basicFee: fees.basicFee || 0,
        powerFee: fees.powerFee || 0,
        climateFee: fees.climateFee || 0,
        fuelFee: fees.fuelFee || 0,
        powerFactorFee: fees.powerFactorFee || 0,
        subtotal,
        vat: fees.vat || 0,
        powerFund: fees.powerFund || 0,
        roundDown: 0,
        total: totalAmount,
      },

      // 검침 정보
      meterReading: {
        previous: previousReading,
        current: Number(row.outgoing_meter_reading) || 0,
        usage: Number(row.outgoing_usage) || 0,
      },

      // 사용 비율
      usageRate: fees.usageRatio || 0,

      // 추정 기준 데이터
      estimationBasis: {
        baseMonths,
        avgTotalUsage: Number(row.estimated_total_usage) || 0,
        avgTotalAmount: Number(row.estimated_total_amount) || 0,
        usageRatio: fees.usageRatio || 0,
      },

      // 청구 기간
      billingPeriod: {
        start: row.outgoing_period_start
          ? new Date(row.outgoing_period_start).toISOString().split('T')[0]
          : '',
        end: row.outgoing_period_end
          ? new Date(row.outgoing_period_end).toISOString().split('T')[0]
          : '',
      },

      // 납부 정보
      paymentInfo: {
        bankName: paymentConfig.bank_name || '신한은행',
        accountNumber: paymentConfig.account_number || '100-035-727568',
        accountHolder: paymentConfig.account_holder || '㈜코로코',
        dueDate: null,
      },

      // 납부 상태
      paymentStatus,
    };

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('추정 청구서 조회 오류:', error);
    return NextResponse.json(
      { error: error.message || '추정 청구서 조회에 실패했습니다.' },
      { status: 500 }
    );
  }
}
