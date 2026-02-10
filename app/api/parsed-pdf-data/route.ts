import { NextRequest, NextResponse } from 'next/server';
import { query, execute } from '@/lib/db-utils';
import { RowDataPacket } from 'mysql2';

// GET: 특정 연/월의 parsed_pdf_data 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year');
    const month = searchParams.get('month');

    if (!year || !month) {
      return NextResponse.json(
        { success: false, error: 'year와 month 파라미터가 필요합니다.' },
        { status: 400 }
      );
    }

    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = new Date(Number(year), Number(month), 0)
      .toISOString().split('T')[0];

    const results = await query<RowDataPacket[]>(
      `SELECT * FROM parsed_pdf_data
       WHERE billing_period_start >= ? AND billing_period_end <= ?
       ORDER BY parsed_at DESC
       LIMIT 1`,
      [startDate, endDate]
    );

    if (results.length === 0) {
      return NextResponse.json({ success: true, data: null });
    }

    const row = results[0];
    if (row.parsed_data && typeof row.parsed_data === 'string') {
      try { row.parsed_data = JSON.parse(row.parsed_data); } catch {}
    }
    if (row.parse_warnings && typeof row.parse_warnings === 'string') {
      try { row.parse_warnings = JSON.parse(row.parse_warnings); } catch {}
    }

    return NextResponse.json({ success: true, data: row });
  } catch (error: any) {
    console.error('GET parsed-pdf-data error:', error);
    return NextResponse.json(
      { success: false, error: error.message || '조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// POST: 수동 입력으로 parsed_pdf_data 생성
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      billingPeriodStart,
      billingPeriodEnd,
      totalUsage,
      basicFee,
      powerFee,
      climateFee,
      fuelFee,
      powerFactorFee,
      vat,
      powerFund,
      tvLicenseFee,
      roundDown,
      totalAmount,
      contractType,
      contractPower,
      year,
      month,
    } = body;

    if (!year || !month) {
      return NextResponse.json(
        { success: false, error: '연도와 월은 필수입니다.' },
        { status: 400 }
      );
    }

    const fileName = `수동입력_${year}년_${month}월`;

    const result = await execute(
      `INSERT INTO parsed_pdf_data (
        file_name, file_hash,
        billing_period_start, billing_period_end,
        total_usage,
        basic_fee, power_fee, climate_fee, fuel_fee, power_factor_fee,
        vat, power_fund, tv_license_fee, round_down,
        total_amount, contract_type, contract_power,
        raw_text, parsed_data, parse_warnings
      ) VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        fileName,
        billingPeriodStart || null,
        billingPeriodEnd || null,
        totalUsage || 0,
        basicFee || 0,
        powerFee || 0,
        climateFee || 0,
        fuelFee || 0,
        powerFactorFee || 0,
        vat || 0,
        powerFund || 0,
        tvLicenseFee || 0,
        roundDown || 0,
        totalAmount || 0,
        contractType || null,
        contractPower || null,
        '수동 입력',
        JSON.stringify(body),
        JSON.stringify(['수동 입력 데이터']),
      ]
    );

    return NextResponse.json({
      success: true,
      id: result.insertId,
      message: '한전 청구서 데이터가 저장되었습니다.',
    });
  } catch (error: any) {
    console.error('POST parsed-pdf-data error:', error);
    return NextResponse.json(
      { success: false, error: error.message || '저장 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
