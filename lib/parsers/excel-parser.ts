import * as XLSX from 'xlsx';
import { UnitUsageData, ParseResult } from '@/types/bill';

export class UnitUsageParser {
  private findHeaderRow(sheet: any, headers: string[]): number {
    const range = XLSX.utils.decode_range(sheet['!ref']);
    
    for (let row = 0; row <= Math.min(10, range.e.r); row++) {
      let matchCount = 0;
      for (let col = 0; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        const cell = sheet[cellAddress];
        if (cell && headers.includes(cell.v?.toString().trim())) {
          matchCount++;
        }
      }
      if (matchCount >= headers.length * 0.5) {
        return row;
      }
    }
    return -1;
  }

  private parseSheet(sheet: any): UnitUsageData[] {
    const data: UnitUsageData[] = [];
    
    // 가능한 헤더 패턴들
    const headerPatterns = [
      ['호실', '전월지침', '당월지침', '사용량'],
      ['호수', '전월', '당월', '사용'],
      ['Unit', 'Previous', 'Current', 'Usage'],
    ];

    let headerRow = -1;
    let headers: string[] = [];

    // 헤더 찾기
    for (const pattern of headerPatterns) {
      headerRow = this.findHeaderRow(sheet, pattern);
      if (headerRow !== -1) {
        headers = pattern;
        break;
      }
    }

    if (headerRow === -1) {
      throw new Error('Excel 파일에서 헤더를 찾을 수 없습니다.');
    }

    // 헤더 컬럼 인덱스 찾기
    const range = XLSX.utils.decode_range(sheet['!ref']);
    const columnMap: { [key: string]: number } = {};

    for (let col = 0; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: headerRow, c: col });
      const cell = sheet[cellAddress];
      if (cell?.v) {
        const value = cell.v.toString().trim();
        if (value.includes('호실') || value.includes('호수') || value === 'Unit') {
          columnMap.unitNumber = col;
        } else if (value.includes('전월') || value === 'Previous') {
          columnMap.previousReading = col;
        } else if (value.includes('당월') || value === 'Current') {
          columnMap.currentReading = col;
        } else if (value.includes('사용') || value === 'Usage') {
          columnMap.usage = col;
        } else if (value.includes('비고') || value === 'Notes') {
          columnMap.notes = col;
        }
      }
    }

    // 데이터 파싱
    for (let row = headerRow + 1; row <= range.e.r; row++) {
      const unitCell = sheet[XLSX.utils.encode_cell({ r: row, c: columnMap.unitNumber })];
      
      if (!unitCell?.v) continue; // 빈 행 스킵

      const unitData: UnitUsageData = {
        unitNumber: unitCell.v.toString().trim(),
        previousReading: 0,
        currentReading: 0,
        usage: 0,
      };

      // 각 필드 파싱
      if (columnMap.previousReading !== undefined) {
        const cell = sheet[XLSX.utils.encode_cell({ r: row, c: columnMap.previousReading })];
        unitData.previousReading = parseFloat(cell?.v) || 0;
      }

      if (columnMap.currentReading !== undefined) {
        const cell = sheet[XLSX.utils.encode_cell({ r: row, c: columnMap.currentReading })];
        unitData.currentReading = parseFloat(cell?.v) || 0;
      }

      if (columnMap.usage !== undefined) {
        const cell = sheet[XLSX.utils.encode_cell({ r: row, c: columnMap.usage })];
        unitData.usage = parseFloat(cell?.v) || 0;
      } else {
        // 사용량이 없으면 계산
        unitData.usage = unitData.currentReading - unitData.previousReading;
      }

      if (columnMap.notes !== undefined) {
        const cell = sheet[XLSX.utils.encode_cell({ r: row, c: columnMap.notes })];
        unitData.notes = cell?.v?.toString() || '';
      }

      // 유효성 검증
      if (unitData.unitNumber && unitData.usage >= 0) {
        data.push(unitData);
      }
    }

    return data;
  }

  async parse(buffer: Buffer): Promise<ParseResult<UnitUsageData[]>> {
    try {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      
      if (workbook.SheetNames.length === 0) {
        return {
          success: false,
          error: 'Excel 파일에 시트가 없습니다.',
        };
      }

      // 첫 번째 시트 사용
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      
      const data = this.parseSheet(sheet);
      
      const warnings: string[] = [];
      
      // 데이터 검증
      if (data.length === 0) {
        return {
          success: false,
          error: '유효한 데이터를 찾을 수 없습니다.',
        };
      }

      // 중복 호실 체크
      const unitNumbers = new Set<string>();
      const duplicates: string[] = [];
      
      for (const unit of data) {
        if (unitNumbers.has(unit.unitNumber)) {
          duplicates.push(unit.unitNumber);
        }
        unitNumbers.add(unit.unitNumber);
      }
      
      if (duplicates.length > 0) {
        warnings.push(`중복된 호실: ${duplicates.join(', ')}`);
      }

      // 음수 사용량 체크
      const negativeUsage = data.filter(u => u.usage < 0);
      if (negativeUsage.length > 0) {
        warnings.push(`음수 사용량 호실: ${negativeUsage.map(u => u.unitNumber).join(', ')}`);
      }

      return {
        success: true,
        data,
        warnings: warnings.length > 0 ? warnings : undefined,
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Excel 파싱 실패: ${error.message}`,
      };
    }
  }
}