import { NextRequest, NextResponse } from 'next/server';
import { query, execute } from '@/lib/db-utils';
import { RowDataPacket } from 'mysql2';

// GET: 특정 연/월의 parsed_excel_data 조회
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

    // file_name에서 연월 매칭 (e.g., "2025.7월", "2026.01월", "수동입력_2025년_7월")
    const monthStr = String(month);
    const monthPadded = String(month).padStart(2, '0');
    const results = await query<RowDataPacket[]>(
      `SELECT * FROM parsed_excel_data
       WHERE file_name LIKE ? OR file_name LIKE ? OR file_name LIKE ? OR file_name LIKE ?
       ORDER BY parsed_at DESC
       LIMIT 1`,
      [`%${year}.${monthStr}월%`, `%${year}.${monthPadded}월%`, `%${year}년_${monthStr}월%`, `%${year}년_${monthPadded}월%`]
    );

    if (results.length === 0) {
      return NextResponse.json({ success: true, data: null });
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
    console.error('GET parsed-excel-data error:', error);
    return NextResponse.json(
      { success: false, error: error.message || '조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// POST: 수동 입력으로 parsed_excel_data 생성
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { year, month, unitData } = body;

    if (!year || !month || !unitData || !Array.isArray(unitData)) {
      return NextResponse.json(
        { success: false, error: '연도, 월, 호실 데이터가 필요합니다.' },
        { status: 400 }
      );
    }

    const fileName = `수동입력_${year}년_${month}월_사용량`;
    const totalUnits = unitData.length;
    const totalUsage = unitData.reduce(
      (sum: number, u: any) => sum + (Number(u.usage) || 0), 0
    );
    const averageUsage = totalUnits > 0 ? totalUsage / totalUnits : 0;

    const result = await execute(
      `INSERT INTO parsed_excel_data (
        file_name, file_hash, sheet_name,
        total_units, total_usage, average_usage,
        unit_data, column_mapping, parse_warnings, parsed_by
      ) VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, NULL)`,
      [
        fileName,
        '수동입력',
        totalUnits,
        totalUsage,
        averageUsage,
        JSON.stringify(unitData),
        JSON.stringify({}),
        JSON.stringify(['수동 입력 데이터']),
      ]
    );

    return NextResponse.json({
      success: true,
      id: result.insertId,
      message: '호실별 사용량 데이터가 저장되었습니다.',
      summary: { totalUnits, totalUsage, averageUsage },
    });
  } catch (error: any) {
    console.error('POST parsed-excel-data error:', error);
    return NextResponse.json(
      { success: false, error: error.message || '저장 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
