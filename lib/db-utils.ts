import pool from './db';
import { RowDataPacket, ResultSetHeader, FieldPacket } from 'mysql2';

/**
 * 쿼리 실행 (SELECT 용)
 * @param sql SQL 쿼리문
 * @param params 파라미터 배열
 * @returns 쿼리 결과
 */
export async function query<T extends RowDataPacket[]>(
  sql: string,
  params?: any[]
): Promise<T> {
  try {
    const [results] = await pool.execute<T>(sql, params);
    return results;
  } catch (error) {
    console.error('Query error:', error);
    throw error;
  }
}

/**
 * 명령 실행 (INSERT, UPDATE, DELETE 용)
 * @param sql SQL 쿼리문
 * @param params 파라미터 배열
 * @returns 실행 결과
 */
export async function execute(
  sql: string,
  params?: any[]
): Promise<ResultSetHeader> {
  try {
    const [results] = await pool.execute<ResultSetHeader>(sql, params);
    return results;
  } catch (error) {
    console.error('Execute error:', error);
    throw error;
  }
}

/**
 * 트랜잭션 실행
 * @param callback 트랜잭션 내에서 실행할 함수
 * @returns 트랜잭션 결과
 */
export async function transaction<T>(
  callback: (connection: mysql.PoolConnection) => Promise<T>
): Promise<T> {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    console.error('Transaction error:', error);
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * 단일 행 조회
 * @param sql SQL 쿼리문
 * @param params 파라미터 배열
 * @returns 단일 행 또는 null
 */
export async function queryOne<T extends RowDataPacket>(
  sql: string,
  params?: any[]
): Promise<T | null> {
  const results = await query<T[]>(sql, params);
  return results.length > 0 ? results[0] : null;
}

/**
 * 존재 여부 확인
 * @param sql SQL 쿼리문
 * @param params 파라미터 배열
 * @returns 존재 여부
 */
export async function exists(
  sql: string,
  params?: any[]
): Promise<boolean> {
  const results = await query<RowDataPacket[]>(sql, params);
  return results.length > 0;
}

// MySQL2 모듈 타입 내보내기
import mysql from 'mysql2/promise';
export type { mysql };