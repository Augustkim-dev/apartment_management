-- ============================================
-- 009. 이사 정산 - 중도 퇴거/입주 분할 청구
-- Migration Script
-- Created: 2026-02-11
--
-- 이 스크립트는 다음 작업을 수행합니다:
-- 1. tenants 테이블 생성 (입주자 이력 관리)
-- 2. move_settlements 테이블 생성 (이사 정산 이벤트)
-- 3. unit_bills 테이블 변경 (분할 청구 지원)
-- 4. 기존 데이터 마이그레이션
--
-- 실행 전 주의사항:
-- - 반드시 DB 백업 후 실행
-- - 기존 unit_bills 데이터가 있는 상태에서 실행해야 함
-- ============================================

-- ============================================
-- STEP 1: tenants 테이블 생성
-- ============================================

CREATE TABLE IF NOT EXISTS tenants (
  id INT PRIMARY KEY AUTO_INCREMENT,
  unit_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  contact VARCHAR(20),
  email VARCHAR(100),
  status ENUM('active', 'moved_out') DEFAULT 'active',
  move_in_date DATE NOT NULL,
  move_out_date DATE,
  move_in_reading DECIMAL(10,2),    -- 입주 시 계량기 값
  move_out_reading DECIMAL(10,2),   -- 퇴거 시 계량기 값
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE CASCADE,
  INDEX idx_unit_id (unit_id),
  INDEX idx_status (status),
  INDEX idx_unit_status (unit_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- STEP 2: move_settlements 테이블 생성
-- ============================================

CREATE TABLE IF NOT EXISTS move_settlements (
  id INT PRIMARY KEY AUTO_INCREMENT,
  unit_id INT NOT NULL,
  settlement_date DATETIME NOT NULL,         -- 정산 일시
  bill_year INT NOT NULL,
  bill_month INT NOT NULL,

  -- 퇴거자 정보
  outgoing_tenant_id INT NOT NULL,
  outgoing_period_start DATE NOT NULL,       -- 퇴거자 청구 시작일
  outgoing_period_end DATETIME NOT NULL,     -- 퇴거 일시
  outgoing_meter_reading DECIMAL(10,2),      -- 퇴거 시 계량기값
  outgoing_usage DECIMAL(10,2),              -- 퇴거자 사용량

  -- 입주자 정보 (나중에 등록 가능)
  incoming_tenant_id INT,
  incoming_period_start DATETIME,            -- 입주 일시
  incoming_meter_reading DECIMAL(10,2),      -- 입주 시 계량기값

  -- 추정 기준 데이터
  estimated_total_usage DECIMAL(10,2),       -- 추정 건물 전체 사용량 (3개월 평균)
  estimated_total_amount DECIMAL(10,2),      -- 추정 건물 전체 요금
  estimation_base_months TEXT,               -- 참조한 월 목록 (JSON)

  status ENUM('pending', 'completed', 'cancelled') DEFAULT 'pending',
  notes TEXT,
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (unit_id) REFERENCES units(id),
  FOREIGN KEY (outgoing_tenant_id) REFERENCES tenants(id),
  FOREIGN KEY (incoming_tenant_id) REFERENCES tenants(id),
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_unit_year_month (unit_id, bill_year, bill_month),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- STEP 3: unit_bills 테이블 변경
-- ============================================

-- 3-1. 새 컬럼 추가
ALTER TABLE unit_bills
  ADD COLUMN tenant_id INT AFTER unit_id,
  ADD COLUMN tenant_name_snapshot VARCHAR(100) AFTER tenant_id,
  ADD COLUMN bill_type ENUM('regular', 'move_out', 'move_in') DEFAULT 'regular' AFTER tenant_name_snapshot,
  ADD COLUMN move_settlement_id INT AFTER bill_type,
  ADD COLUMN billing_period_start DATE AFTER move_settlement_id,
  ADD COLUMN billing_period_end DATE AFTER billing_period_start,
  ADD COLUMN is_estimated BOOLEAN DEFAULT FALSE AFTER billing_period_end;

-- 3-2. 기존 UNIQUE KEY 삭제 후 새 UNIQUE KEY 생성
-- (같은 호실에 bill_type/tenant_id 조합이 다르면 2건 허용)
ALTER TABLE unit_bills DROP INDEX unique_unit_bill;
ALTER TABLE unit_bills ADD UNIQUE KEY unique_unit_tenant_bill
  (monthly_bill_id, unit_id, bill_type, tenant_id);

-- 3-3. FK 추가
ALTER TABLE unit_bills
  ADD CONSTRAINT fk_unit_bills_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_unit_bills_move_settlement
    FOREIGN KEY (move_settlement_id) REFERENCES move_settlements(id) ON DELETE SET NULL;

-- 3-4. 인덱스 추가
ALTER TABLE unit_bills
  ADD INDEX idx_bill_type (bill_type),
  ADD INDEX idx_tenant_id (tenant_id);

-- ============================================
-- STEP 4: 기존 데이터 마이그레이션
-- ============================================

-- 4-1. 현재 units 데이터에서 tenants 레코드 생성
-- (tenant_name이 있는 호실만 대상)
INSERT INTO tenants (unit_id, name, contact, email, status, move_in_date)
SELECT
  id,
  tenant_name,
  contact,
  email,
  CASE WHEN status = 'occupied' THEN 'active' ELSE 'moved_out' END,
  COALESCE(move_in_date, '2024-01-01')
FROM units
WHERE tenant_name IS NOT NULL;

-- 4-2. 기존 unit_bills에 tenant_id, bill_type 연결
UPDATE unit_bills ub
JOIN units u ON ub.unit_id = u.id
JOIN tenants t ON t.unit_id = u.id AND t.status = 'active'
SET
  ub.tenant_id = t.id,
  ub.tenant_name_snapshot = t.name,
  ub.bill_type = 'regular';

-- ============================================
-- STEP 5: 검증 쿼리
-- ============================================

-- tenants 테이블 생성 확인
SELECT '--- tenants 테이블 ---' AS '';
SELECT
  COUNT(*) AS total_tenants,
  SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS active,
  SUM(CASE WHEN status = 'moved_out' THEN 1 ELSE 0 END) AS moved_out
FROM tenants;

-- unit_bills 마이그레이션 확인
SELECT '--- unit_bills 마이그레이션 ---' AS '';
SELECT
  COUNT(*) AS total_unit_bills,
  SUM(CASE WHEN tenant_id IS NOT NULL THEN 1 ELSE 0 END) AS with_tenant,
  SUM(CASE WHEN tenant_id IS NULL THEN 1 ELSE 0 END) AS without_tenant,
  SUM(CASE WHEN bill_type = 'regular' THEN 1 ELSE 0 END) AS regular_bills
FROM unit_bills;

-- UNIQUE KEY 동작 확인 (같은 호실에 다른 bill_type으로 삽입 가능한지)
SELECT '--- UNIQUE KEY 확인 ---' AS '';
SELECT
  CONSTRAINT_NAME, COLUMN_NAME
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE TABLE_NAME = 'unit_bills'
  AND CONSTRAINT_NAME = 'unique_unit_tenant_bill'
ORDER BY ORDINAL_POSITION;

SELECT '✅ 009 마이그레이션 완료' AS '상태';
