import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { UnpaidHistoryResponse } from '@/types/database';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ unitId: string }> }
) {
  try {
    const { unitId: uid } = await params;
    const unitId = parseInt(uid);

    if (isNaN(unitId)) {
      return NextResponse.json(
        { error: 'Invalid unit ID' },
        { status: 400 }
      );
    }

    const connection = await pool.getConnection();

    try {

    // 호실 정보 조회
    const [unitRows] = await connection.execute(`
      SELECT unit_number
      FROM units
      WHERE id = ?
    `, [unitId]);

    if (!unitRows || (unitRows as any[]).length === 0) {
      return NextResponse.json(
        { error: 'Unit not found' },
        { status: 404 }
      );
    }

    const unit = (unitRows as any[])[0];

    // 미납 내역 조회
    const [unpaidRows] = await connection.execute(`
      SELECT
        bill_year,
        bill_month,
        unpaid_amount,
        is_paid,
        paid_date
      FROM unpaid_history
      WHERE unit_id = ?
      ORDER BY bill_year DESC, bill_month DESC
    `, [unitId]);

    const history = (unpaidRows as any[]).map(row => ({
      billYear: row.bill_year,
      billMonth: row.bill_month,
      amount: row.unpaid_amount,
      isPaid: Boolean(row.is_paid),
      paidDate: row.paid_date ? new Date(row.paid_date).toISOString().split('T')[0] : null
    }));

    const totalUnpaid = history
      .filter(item => !item.isPaid)
      .reduce((sum, item) => sum + item.amount, 0);

    const response: UnpaidHistoryResponse = {
      unitId: unitId,
      unitNumber: unit.unit_number,
      totalUnpaid: totalUnpaid,
      history: history
    };

    return NextResponse.json(response);

    } finally {
      connection.release();
    }

  } catch (error){
    console.error('Error fetching unpaid history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch unpaid history' },
      { status: 500 }
    );
  }
}

// 미납 내역 추가
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ unitId: string }> }
) {
  try {
    const { unitId: uid } = await params;
    const unitId = parseInt(uid);
    const body = await request.json();

    if (isNaN(unitId)) {
      return NextResponse.json(
        { error: 'Invalid unit ID' },
        { status: 400 }
      );
    }

    const {
      billYear,
      billMonth,
      unpaidAmount,
      unitBillId = null,
      notes = null
    } = body;

    if (!billYear || !billMonth || !unpaidAmount) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const connection = await pool.getConnection();

    try {

    // 중복 체크
    const [existingRows] = await connection.execute(`
      SELECT id
      FROM unpaid_history
      WHERE unit_id = ? AND bill_year = ? AND bill_month = ?
    `, [unitId, billYear, billMonth]);

    if ((existingRows as any[]).length > 0) {
      return NextResponse.json(
        { error: 'Unpaid record already exists for this period' },
        { status: 409 }
      );
    }

    // 미납 내역 추가
    const [result] = await connection.execute(`
      INSERT INTO unpaid_history (
        unit_id, unit_bill_id, bill_year, bill_month,
        unpaid_amount, notes
      ) VALUES (?, ?, ?, ?, ?, ?)
    `, [unitId, unitBillId, billYear, billMonth, unpaidAmount, notes]);

    const insertId = (result as any).insertId;

    return NextResponse.json({
      message: 'Unpaid history added successfully',
      id: insertId
    });

    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('Error adding unpaid history:', error);
    return NextResponse.json(
      { error: 'Failed to add unpaid history' },
      { status: 500 }
    );
  }
}

// 미납 내역 납부 처리
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ unitId: string }> }
) {
  try {
    const { unitId: uid } = await params;
    const unitId = parseInt(uid);
    const body = await request.json();

    if (isNaN(unitId)) {
      return NextResponse.json(
        { error: 'Invalid unit ID' },
        { status: 400 }
      );
    }

    const {
      billYear,
      billMonth,
      isPaid,
      paidDate = new Date().toISOString().split('T')[0]
    } = body;

    if (!billYear || !billMonth || isPaid === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const connection = await pool.getConnection();

    try {

    // 미납 내역 업데이트
    const [result] = await connection.execute(`
      UPDATE unpaid_history
      SET
        is_paid = ?,
        paid_date = ?
      WHERE unit_id = ? AND bill_year = ? AND bill_month = ?
    `, [isPaid, isPaid ? paidDate : null, unitId, billYear, billMonth]);

    if ((result as any).affectedRows === 0) {
      return NextResponse.json(
        { error: 'Unpaid record not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Unpaid history updated successfully'
    });

    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('Error updating unpaid history:', error);
    return NextResponse.json(
      { error: 'Failed to update unpaid history' },
      { status: 500 }
    );
  }
}