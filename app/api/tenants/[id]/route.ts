import { NextRequest, NextResponse } from 'next/server';
import { query, execute } from '@/lib/db-utils';
import { RowDataPacket } from 'mysql2';

// 입주자 상세 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tenants = await query<RowDataPacket[]>(
      `SELECT t.*, u.unit_number
       FROM tenants t
       JOIN units u ON t.unit_id = u.id
       WHERE t.id = ?`,
      [parseInt(id)]
    );

    if (tenants.length === 0) {
      return NextResponse.json(
        { success: false, message: '입주자를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    return NextResponse.json({ tenant: tenants[0] });
  } catch (error: any) {
    console.error('입주자 상세 조회 오류:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// 입주자 정보 수정
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const tenantId = parseInt(id);

    const updates: string[] = [];
    const values: any[] = [];

    if (body.name !== undefined) {
      updates.push('name = ?');
      values.push(body.name);
    }
    if (body.contact !== undefined) {
      updates.push('contact = ?');
      values.push(body.contact);
    }
    if (body.email !== undefined) {
      updates.push('email = ?');
      values.push(body.email);
    }
    if (body.notes !== undefined) {
      updates.push('notes = ?');
      values.push(body.notes);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { success: false, message: '수정할 항목이 없습니다.' },
        { status: 400 }
      );
    }

    updates.push('updated_at = NOW()');
    values.push(tenantId);

    await execute(
      `UPDATE tenants SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    return NextResponse.json({ success: true, message: '입주자 정보가 수정되었습니다.' });
  } catch (error: any) {
    console.error('입주자 수정 오류:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
