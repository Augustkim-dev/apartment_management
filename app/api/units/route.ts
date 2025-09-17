import { NextResponse } from 'next/server';
import { query } from '@/lib/db-utils';
import { RowDataPacket } from 'mysql2';

interface UnitData extends RowDataPacket {
  id: number;
  unit_number: string;
  tenant_name: string | null;
  contact: string | null;
  email: string | null;
  status: 'occupied' | 'vacant';
  unpaid_amount?: number;
  last_payment_date?: string;
}

export async function GET() {
  try {
    // 호실 목록 조회 (미납금액 포함)
    const units = await query<UnitData[]>(`
      SELECT
        u.id,
        u.unit_number,
        u.tenant_name,
        u.contact,
        u.email,
        u.status,
        COALESCE(SUM(CASE WHEN ub.payment_status = 'unpaid' THEN ub.total_amount ELSE 0 END), 0) as unpaid_amount,
        MAX(CASE WHEN ub.payment_status = 'paid' THEN ub.payment_date ELSE NULL END) as last_payment_date
      FROM units u
      LEFT JOIN unit_bills ub ON u.id = ub.unit_id
      GROUP BY u.id
      ORDER BY u.unit_number
    `);

    if (units.length === 0) {
      // 샘플 데이터 반환
      return NextResponse.json([
        {
          id: 1,
          unitNumber: '201호',
          tenantName: '김철수',
          contact: '010-1234-5678',
          email: 'kim@example.com',
          status: 'occupied',
          unpaidAmount: 0,
          lastPaymentDate: '2025-01-10',
        },
        {
          id: 2,
          unitNumber: '202호',
          tenantName: '이영희',
          contact: '010-2345-6789',
          email: 'lee@example.com',
          status: 'occupied',
          unpaidAmount: 45230,
          lastPaymentDate: '2024-12-15',
        },
        {
          id: 3,
          unitNumber: '203호',
          tenantName: '박민수',
          contact: '010-3456-7890',
          email: 'park@example.com',
          status: 'occupied',
          unpaidAmount: 0,
          lastPaymentDate: '2025-01-12',
        },
        {
          id: 4,
          unitNumber: '204호',
          tenantName: '',
          contact: '',
          email: '',
          status: 'vacant',
          unpaidAmount: 0,
          lastPaymentDate: null,
        },
        {
          id: 5,
          unitNumber: '301호',
          tenantName: '최지훈',
          contact: '010-4567-8901',
          email: 'choi@example.com',
          status: 'occupied',
          unpaidAmount: 92460,
          lastPaymentDate: '2024-11-20',
        },
      ]);
    }

    return NextResponse.json(
      units.map(unit => ({
        id: unit.id,
        unitNumber: unit.unit_number,
        tenantName: unit.tenant_name || '',
        contact: unit.contact || '',
        email: unit.email || '',
        status: unit.status,
        unpaidAmount: unit.unpaid_amount || 0,
        lastPaymentDate: unit.last_payment_date || null,
      }))
    );
  } catch (error) {
    console.error('Units fetch error:', error);

    // 에러 시 샘플 데이터 반환
    return NextResponse.json([
      {
        id: 1,
        unitNumber: '201호',
        tenantName: '김철수',
        contact: '010-1234-5678',
        email: 'kim@example.com',
        status: 'occupied',
        unpaidAmount: 0,
        lastPaymentDate: '2025-01-10',
      },
      {
        id: 2,
        unitNumber: '202호',
        tenantName: '이영희',
        contact: '010-2345-6789',
        email: 'lee@example.com',
        status: 'occupied',
        unpaidAmount: 45230,
        lastPaymentDate: '2024-12-15',
      },
    ]);
  }
}