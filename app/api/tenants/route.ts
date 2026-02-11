import { NextRequest, NextResponse } from 'next/server';
import { query, execute } from '@/lib/db-utils';
import { RowDataPacket } from 'mysql2';

// 입주자 목록/이력 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const unitId = searchParams.get('unitId');
    const status = searchParams.get('status'); // 'active', 'moved_out', or null (전체)

    let whereClause = '1=1';
    const params: any[] = [];

    if (unitId) {
      whereClause += ' AND t.unit_id = ?';
      params.push(parseInt(unitId));
    }

    if (status) {
      whereClause += ' AND t.status = ?';
      params.push(status);
    }

    const tenants = await query<RowDataPacket[]>(
      `SELECT
        t.*,
        u.unit_number
      FROM tenants t
      JOIN units u ON t.unit_id = u.id
      WHERE ${whereClause}
      ORDER BY t.unit_id, t.created_at DESC`,
      params
    );

    return NextResponse.json({ tenants });
  } catch (error: any) {
    console.error('입주자 조회 오류:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// 입주자 등록
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.unitId || !body.name || !body.moveInDate) {
      return NextResponse.json(
        { success: false, message: '호실 ID, 이름, 입주일은 필수입니다.' },
        { status: 400 }
      );
    }

    const result = await execute(
      `INSERT INTO tenants (unit_id, name, contact, email, status, move_in_date, move_in_reading)
       VALUES (?, ?, ?, ?, 'active', ?, ?)`,
      [
        body.unitId,
        body.name,
        body.contact || null,
        body.email || null,
        body.moveInDate,
        body.moveInReading || null,
      ]
    );

    // units 테이블 동기화
    await execute(
      `UPDATE units SET
        tenant_name = ?,
        contact = ?,
        email = ?,
        status = 'occupied',
        move_in_date = ?,
        updated_at = NOW()
      WHERE id = ?`,
      [body.name, body.contact || null, body.email || null, body.moveInDate, body.unitId]
    );

    return NextResponse.json(
      { success: true, tenantId: result.insertId, message: '입주자가 등록되었습니다.' },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('입주자 등록 오류:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
