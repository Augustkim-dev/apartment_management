import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from '@/lib/db-utils';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // 배정되지 않은 호실 조회
    const availableUnits = await query(`
      SELECT
        u.id,
        u.unit_number,
        u.status
      FROM units u
      LEFT JOIN users usr ON u.id = usr.unit_id
      WHERE usr.unit_id IS NULL OR u.status = 'vacant'
      ORDER BY u.unit_number
    `);

    return NextResponse.json({
      success: true,
      units: availableUnits
    });
  } catch (error) {
    console.error('Error fetching available units:', error);
    return NextResponse.json(
      { error: 'Failed to fetch available units' },
      { status: 500 }
    );
  }
}