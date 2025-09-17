import { NextResponse } from 'next/server';
import { query } from '@/lib/db-utils';
import { RowDataPacket } from 'mysql2';

interface TestResult extends RowDataPacket {
  test: number;
}

interface UnitCount extends RowDataPacket {
  total: number;
}

export async function GET() {
  try {
    // 1. 기본 연결 테스트
    const testResult = await query<TestResult[]>('SELECT 1 as test');
    
    // 2. 테이블 존재 확인
    const tables = await query<RowDataPacket[]>(`
      SELECT TABLE_NAME 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = ? 
      ORDER BY TABLE_NAME
    `, [process.env.MYSQL_DATABASE]);
    
    // 3. units 테이블 데이터 확인
    let unitStats = null;
    if (tables.some(t => t.TABLE_NAME === 'units')) {
      const [totalUnits] = await query<UnitCount[]>('SELECT COUNT(*) as total FROM units');
      const [occupiedUnits] = await query<UnitCount[]>('SELECT COUNT(*) as total FROM units WHERE status = "occupied"');
      const [vacantUnits] = await query<UnitCount[]>('SELECT COUNT(*) as total FROM units WHERE status = "vacant"');
      
      unitStats = {
        total: totalUnits?.total || 0,
        occupied: occupiedUnits?.total || 0,
        vacant: vacantUnits?.total || 0,
      };
    }
    
    return NextResponse.json({
      success: true,
      message: '데이터베이스 연결 성공!',
      database: process.env.MYSQL_DATABASE,
      tables: tables.map(t => t.TABLE_NAME),
      unitStats,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Database test error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        code: error.code,
        errno: error.errno,
        sqlState: error.sqlState,
        sqlMessage: error.sqlMessage,
      },
      { status: 500 }
    );
  }
}