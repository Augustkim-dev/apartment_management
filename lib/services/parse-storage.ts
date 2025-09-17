import { execute, query, transaction } from '@/lib/db-utils';
import crypto from 'crypto';
import { KepcoInvoiceData, UnitUsageData } from '@/types/bill';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { mysql } from '@/lib/db-utils';

export class ParseStorageService {
  /**
   * PDF 파싱 데이터 저장
   */
  async savePdfData(
    data: KepcoInvoiceData,
    fileName: string,
    fileBuffer: Buffer,
    rawText: string,
    warnings?: string[],
    userId?: number,
    replaceExisting: boolean = false
  ) {
    // 파일 해시 생성 (중복 방지)
    const fileHash = crypto.createHash('sha256')
      .update(fileBuffer)
      .digest('hex');

    // 중복 체크
    const existing = await query<RowDataPacket[]>(
      'SELECT id FROM parsed_pdf_data WHERE file_hash = ?',
      [fileHash]
    );

    if (existing.length > 0) {
      if (replaceExisting) {
        // 기존 데이터 삭제
        await execute('DELETE FROM parsed_pdf_data WHERE file_hash = ?', [fileHash]);
        console.log(`Deleted existing PDF data with hash: ${fileHash}`);
      } else {
        throw new Error('동일한 PDF 파일이 이미 처리되었습니다.');
      }
    }

    // 데이터 저장 (undefined를 null로 변환)
    const result = await execute(`
      INSERT INTO parsed_pdf_data (
        file_name, file_hash, customer_number, invoice_number,
        billing_period_start, billing_period_end,
        previous_reading, current_reading, total_usage,
        basic_fee, power_fee, climate_fee, fuel_fee,
        vat, power_fund, tv_license_fee, round_down,
        total_amount, due_date, raw_text, parsed_data,
        parse_warnings, parsed_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      fileName ?? null,
      fileHash ?? null,
      data.customerNumber ?? null,
      data.invoiceNumber ?? null,
      data.billingPeriod?.start ?? null,
      data.billingPeriod?.end ?? null,
      data.previousReading ?? null,
      data.currentReading ?? null,
      data.totalUsage ?? null,
      data.basicFee ?? null,
      data.powerFee ?? null,
      data.climateFee ?? null,
      data.fuelFee ?? null,
      data.vat ?? null,
      data.powerFund ?? null,
      data.tvLicenseFee ?? null,
      data.roundDown ?? null,
      data.totalAmount ?? null,
      data.dueDate ?? null,
      rawText ?? null,
      JSON.stringify(data) ?? null,
      warnings ? JSON.stringify(warnings) : null,
      userId ?? null
    ]);

    return result.insertId;
  }

  /**
   * Excel 파싱 데이터 저장
   */
  async saveExcelData(
    data: UnitUsageData[],
    fileName: string,
    fileBuffer: Buffer,
    sheetName: string,
    columnMapping: any,
    warnings?: string[],
    userId?: number,
    replaceExisting: boolean = false
  ) {
    // 파일 해시 생성
    const fileHash = crypto.createHash('sha256')
      .update(fileBuffer)
      .digest('hex');

    // 중복 체크
    const existing = await query<RowDataPacket[]>(
      'SELECT id FROM parsed_excel_data WHERE file_hash = ?',
      [fileHash]
    );

    if (existing.length > 0) {
      if (replaceExisting) {
        // 기존 데이터 삭제
        await execute('DELETE FROM parsed_excel_data WHERE file_hash = ?', [fileHash]);
        console.log(`Deleted existing Excel data with hash: ${fileHash}`);
      } else {
        throw new Error('동일한 Excel 파일이 이미 처리되었습니다.');
      }
    }

    // 통계 계산
    const totalUnits = data.length;
    const totalUsage = data.reduce((sum, unit) => sum + unit.usage, 0);
    const averageUsage = totalUsage / totalUnits;

    // 데이터 저장
    const result = await execute(`
      INSERT INTO parsed_excel_data (
        file_name, file_hash, sheet_name,
        total_units, total_usage, average_usage,
        unit_data, column_mapping, parse_warnings, parsed_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      fileName, fileHash, sheetName,
      totalUnits, totalUsage, averageUsage,
      JSON.stringify(data),
      JSON.stringify(columnMapping),
      warnings ? JSON.stringify(warnings) : null,
      userId || null
    ]);

    return result.insertId;
  }

  /**
   * 파싱 이력 조회
   */
  async getParseHistory(type: 'pdf' | 'excel', limit: number = 10) {
    const table = type === 'pdf' ? 'parsed_pdf_data' : 'parsed_excel_data';
    
    const results = await query<RowDataPacket[]>(`
      SELECT id, file_name, parsed_at, parse_warnings,
             ${type === 'pdf' ? 'total_amount, billing_period_start, billing_period_end' : 'total_units, total_usage, average_usage'}
      FROM ${table}
      ORDER BY parsed_at DESC
      LIMIT ?
    `, [limit]);

    return results.map(row => ({
      ...row,
      parse_warnings: row.parse_warnings ? JSON.parse(row.parse_warnings) : null
    }));
  }

  /**
   * 월별 청구서와 연결
   */
  async linkToMonthlyBill(
    pdfId: number,
    excelId: number,
    year: number,
    month: number
  ) {
    return await transaction(async (connection: mysql.PoolConnection) => {
      // PDF 데이터 가져오기
      const [pdfRows] = await connection.query<RowDataPacket[]>(
        'SELECT * FROM parsed_pdf_data WHERE id = ?',
        [pdfId]
      );

      if (!pdfRows || pdfRows.length === 0) {
        throw new Error('PDF 데이터를 찾을 수 없습니다.');
      }
      const pdfData = pdfRows[0];

      // Excel 데이터 가져오기
      const [excelRows] = await connection.query<RowDataPacket[]>(
        'SELECT * FROM parsed_excel_data WHERE id = ?',
        [excelId]
      );

      if (!excelRows || excelRows.length === 0) {
        throw new Error('Excel 데이터를 찾을 수 없습니다.');
      }
      const excelData = excelRows[0];

      // monthly_bills 레코드 생성 또는 업데이트
      const [result] = await connection.query<ResultSetHeader>(`
        INSERT INTO monthly_bills (
          bill_year, bill_month,
          billing_period_start, billing_period_end,
          total_usage, total_amount,
          basic_fee, power_fee, climate_fee, fuel_fee,
          vat, power_fund, tv_license_fee, round_down,
          pdf_file_name, excel_file_name
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          billing_period_start = VALUES(billing_period_start),
          billing_period_end = VALUES(billing_period_end),
          total_usage = VALUES(total_usage),
          total_amount = VALUES(total_amount),
          basic_fee = VALUES(basic_fee),
          power_fee = VALUES(power_fee),
          climate_fee = VALUES(climate_fee),
          fuel_fee = VALUES(fuel_fee),
          vat = VALUES(vat),
          power_fund = VALUES(power_fund),
          tv_license_fee = VALUES(tv_license_fee),
          round_down = VALUES(round_down),
          pdf_file_name = VALUES(pdf_file_name),
          excel_file_name = VALUES(excel_file_name)
      `, [
        year, month,
        pdfData.billing_period_start, pdfData.billing_period_end,
        pdfData.total_usage, pdfData.total_amount,
        pdfData.basic_fee, pdfData.power_fee, pdfData.climate_fee, pdfData.fuel_fee,
        pdfData.vat, pdfData.power_fund, pdfData.tv_license_fee, pdfData.round_down,
        pdfData.file_name, excelData.file_name
      ]);

      const monthlyBillId = result.insertId || result.affectedRows;

      // parsed_pdf_data와 parsed_excel_data 업데이트
      await connection.query(
        'UPDATE parsed_pdf_data SET monthly_bill_id = ? WHERE id = ?',
        [monthlyBillId, pdfId]
      );

      await connection.query(
        'UPDATE parsed_excel_data SET monthly_bill_id = ? WHERE id = ?',
        [monthlyBillId, excelId]
      );

      return monthlyBillId;
    });
  }
}