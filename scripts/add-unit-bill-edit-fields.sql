-- =====================================================
-- 호실별 청구서 수정 기능을 위한 컬럼 추가
-- 작성일: 2025-11-10
-- 설명: unit_bills 테이블에 edit_reason, is_manually_edited 컬럼 추가
-- =====================================================

USE coloco_apartment;

-- 1. edit_reason 컬럼 추가 (수정 사유)
ALTER TABLE unit_bills
ADD COLUMN edit_reason VARCHAR(255) DEFAULT NULL
COMMENT '수정 사유 (예: 이사정산, 계량기 오류 수정, 기타 조정)'
AFTER notes;

-- 2. is_manually_edited 컬럼 추가 (수동 편집 여부 플래그)
ALTER TABLE unit_bills
ADD COLUMN is_manually_edited BOOLEAN DEFAULT FALSE
COMMENT '수동으로 편집된 청구서 여부 (TRUE: 수동 편집, FALSE: 자동 계산)'
AFTER edit_reason;

-- 3. 인덱스 추가 (수동 편집된 청구서 조회 최적화)
ALTER TABLE unit_bills
ADD INDEX idx_manually_edited (is_manually_edited);

-- 4. 인덱스 추가 (월별 청구서의 수동 편집 조회 최적화)
ALTER TABLE unit_bills
ADD INDEX idx_monthly_bill_edited (monthly_bill_id, is_manually_edited);

-- 변경 사항 확인
SELECT
    COLUMN_NAME,
    COLUMN_TYPE,
    IS_NULLABLE,
    COLUMN_DEFAULT,
    COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'coloco_apartment'
  AND TABLE_NAME = 'unit_bills'
  AND COLUMN_NAME IN ('edit_reason', 'is_manually_edited');

-- 마이그레이션 완료 메시지
SELECT '✅ unit_bills 테이블에 edit_reason, is_manually_edited 컬럼 및 인덱스가 추가되었습니다.' AS result;
