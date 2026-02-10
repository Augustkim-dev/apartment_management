import { NextRequest, NextResponse } from 'next/server';
import { query, execute } from '@/lib/db-utils';
import { RowDataPacket } from 'mysql2';

// GET: 특정 ID의 parsed_excel_data 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const results = await query<RowDataPacket[]>(
      'SELECT * FROM parsed_excel_data WHERE id = ?',
      [id]
    );

    if (results.length === 0) {
      return NextResponse.json(
        { success: false, error: '데이터를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    const row = results[0];
    if (row.unit_data && typeof row.unit_data === 'string') {
      try { row.unit_data = JSON.parse(row.unit_data); } catch {}
    }
    if (row.column_mapping && typeof row.column_mapping === 'string') {
      try { row.column_mapping = JSON.parse(row.column_mapping); } catch {}
    }
    if (row.parse_warnings && typeof row.parse_warnings === 'string') {
      try { row.parse_warnings = JSON.parse(row.parse_warnings); } catch {}
    }

    return NextResponse.json({ success: true, data: row });
  } catch (error: any) {
    console.error('GET parsed-excel-data/[id] error:', error);
    return NextResponse.json(
      { success: false, error: error.message || '조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// PUT: 기존 parsed_excel_data 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { unitData } = body;

    if (!unitData || !Array.isArray(unitData)) {
      return NextResponse.json(
        { success: false, error: '호실 데이터가 필요합니다.' },
        { status: 400 }
      );
    }

    const totalUnits = unitData.length;
    const totalUsage = unitData.reduce(
      (sum: number, u: any) => sum + (Number(u.usage) || 0), 0
    );
    const averageUsage = totalUnits > 0 ? totalUsage / totalUnits : 0;

    const result = await execute(
      `UPDATE parsed_excel_data SET
        total_units = ?,
        total_usage = ?,
        average_usage = ?,
        unit_data = ?
      WHERE id = ?`,
      [
        totalUnits,
        totalUsage,
        averageUsage,
        JSON.stringify(unitData),
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
      message: '호실별 사용량 데이터가 수정되었습니다.',
      summary: { totalUnits, totalUsage, averageUsage },
    });
  } catch (error: any) {
    console.error('PUT parsed-excel-data/[id] error:', error);
    return NextResponse.json(
      { success: false, error: error.message || '수정 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
