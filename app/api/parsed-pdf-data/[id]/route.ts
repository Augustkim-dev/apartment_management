import { NextRequest, NextResponse } from 'next/server';
import { query, execute } from '@/lib/db-utils';
import { RowDataPacket } from 'mysql2';

// GET: 특정 ID의 parsed_pdf_data 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const results = await query<RowDataPacket[]>(
      'SELECT * FROM parsed_pdf_data WHERE id = ?',
      [id]
    );

    if (results.length === 0) {
      return NextResponse.json(
        { success: false, error: '데이터를 찾을 수 없습니다.' },
        { status: 404 }
      );
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
    console.error('GET parsed-pdf-data/[id] error:', error);
    return NextResponse.json(
      { success: false, error: error.message || '조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// PUT: 기존 parsed_pdf_data 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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
    } = body;

    const result = await execute(
      `UPDATE parsed_pdf_data SET
        billing_period_start = ?,
        billing_period_end = ?,
        total_usage = ?,
        basic_fee = ?,
        power_fee = ?,
        climate_fee = ?,
        fuel_fee = ?,
        power_factor_fee = ?,
        vat = ?,
        power_fund = ?,
        tv_license_fee = ?,
        round_down = ?,
        total_amount = ?,
        contract_type = ?,
        contract_power = ?,
        parsed_data = ?
      WHERE id = ?`,
      [
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
        JSON.stringify(body),
        id,
      ]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { success: false, error: '데이터를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '한전 청구서 데이터가 수정되었습니다.',
    });
  } catch (error: any) {
    console.error('PUT parsed-pdf-data/[id] error:', error);
    return NextResponse.json(
      { success: false, error: error.message || '수정 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
