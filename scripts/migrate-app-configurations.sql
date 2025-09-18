-- ============================================
-- 환경설정 관리 시스템 데이터베이스 마이그레이션
-- Date: 2025-09-18
-- Description: app_configurations 테이블 생성 및 초기 데이터 입력
-- ============================================

-- 1. app_configurations 테이블 생성
CREATE TABLE IF NOT EXISTS app_configurations (
  id INT PRIMARY KEY AUTO_INCREMENT,
  config_key VARCHAR(100) UNIQUE NOT NULL COMMENT '설정 키 (예: payment.bank_name)',
  config_value TEXT COMMENT '설정 값',
  config_type ENUM('string', 'number', 'boolean', 'json', 'array') DEFAULT 'string' COMMENT '데이터 타입',
  category VARCHAR(50) NOT NULL COMMENT '카테고리 (payment, contact, billing, building, notices, contract)',
  subcategory VARCHAR(50) COMMENT '서브 카테고리',
  display_order INT DEFAULT 0 COMMENT '표시 순서',
  is_active BOOLEAN DEFAULT true COMMENT '활성화 여부',
  is_required BOOLEAN DEFAULT false COMMENT '필수 여부',
  description TEXT COMMENT '설정 설명',
  validation_rules JSON COMMENT '검증 규칙 {"min": 0, "max": 100, "pattern": "^[0-9]+$"}',
  metadata JSON COMMENT '추가 메타데이터',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  updated_by INT COMMENT '마지막 수정자',
  FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_category (category),
  INDEX idx_active_category (is_active, category),
  INDEX idx_config_key (config_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='시스템 설정 테이블';

-- 2. 초기 데이터 입력

-- 2.1 건물 정보 (building)
INSERT INTO app_configurations (config_key, config_value, config_type, category, display_order, is_required, description) VALUES
('building.name', '아르노빌리지', 'string', 'building', 1, true, '건물명'),
('building.type', '오피스텔', 'string', 'building', 2, true, '건물 유형'),
('building.unit_count', '60', 'number', 'building', 3, true, '총 호실 수'),
('building.total_usage_default', '25231', 'number', 'building', 4, false, '기본 총 사용량(kWh)');

-- 2.2 결제 정보 (payment)
INSERT INTO app_configurations (config_key, config_value, config_type, category, display_order, is_required, description) VALUES
('payment.bank_name', '신한은행', 'string', 'payment', 1, true, '주 계좌 은행명'),
('payment.account_number', '100-035-727568', 'string', 'payment', 2, true, '주 계좌번호'),
('payment.account_holder', '㈜코로코', 'string', 'payment', 3, true, '주 계좌 예금주'),
('payment.bank_name_alt', '국민은행', 'string', 'payment', 4, false, '대체 계좌 은행명'),
('payment.account_number_alt', '123-45-678900', 'string', 'payment', 5, false, '대체 계좌번호'),
('payment.account_holder_alt', '아르노빌리지 관리사무소', 'string', 'payment', 6, false, '대체 계좌 예금주');

-- 2.3 연락처 정보 (contact)
INSERT INTO app_configurations (config_key, config_value, config_type, category, display_order, is_required, description) VALUES
('contact.management_phone', '02-1234-5678', 'string', 'contact', 1, true, '관리사무소 전화번호'),
('contact.management_email', 'management@arnodvillage.com', 'string', 'contact', 2, false, '관리사무소 이메일'),
('contact.emergency_phone', '010-1234-5678', 'string', 'contact', 3, false, '비상 연락처');

-- 2.4 계약 정보 (contract)
INSERT INTO app_configurations (config_key, config_value, config_type, category, display_order, is_required, description) VALUES
('contract.type', '일반용(을)고압A선택2', 'string', 'contract', 1, true, '계약 종별'),
('contract.power', '700', 'number', 'contract', 2, true, '계약 전력(kW)'),
('contract.applied_power', '210', 'number', 'contract', 3, true, '요금적용 전력(kW)');

-- 2.5 요금 정보 (billing)
INSERT INTO app_configurations (config_key, config_value, config_type, category, display_order, is_required, description, validation_rules) VALUES
('billing.basic_fee_rate', '8320', 'number', 'billing', 1, true, 'kW당 기본료', '{"min": 0, "max": 100000}'),
('billing.late_fee_rate', '1.5', 'number', 'billing', 2, false, '연체료율(%)', '{"min": 0, "max": 10}'),
('billing.meter_reading_start', '9', 'number', 'billing', 3, false, '검침 시작일', '{"min": 1, "max": 31}'),
('billing.meter_reading_end', '10', 'number', 'billing', 4, false, '검침 종료일', '{"min": 1, "max": 31}'),
('billing.payment_due_day', '31', 'number', 'billing', 5, true, '납부 기한일', '{"min": 1, "max": 31}'),
('billing.late_fee_start_day', '5', 'number', 'billing', 6, false, '연체료 부과 시작일', '{"min": 1, "max": 31}');

-- 2.6 납부 안내 (notices) - JSON 배열로 저장
INSERT INTO app_configurations (config_key, config_value, config_type, category, display_order, is_required, description) VALUES
('notices.payment_notices', '[
  {
    "order": 1,
    "text": "전기요금은 매월 {납부일}일까지 납부해 주시기 바랍니다.",
    "type": "info",
    "active": true
  },
  {
    "order": 2,
    "text": "미납 시 다음달 {연체시작일}일부터 연체료가 부과됩니다.",
    "type": "warning",
    "active": true
  },
  {
    "order": 3,
    "text": "자동이체 신청은 관리사무소로 문의해 주세요.",
    "type": "info",
    "active": true
  },
  {
    "order": 4,
    "text": "요금 문의: 관리사무소 ({관리사무소})",
    "type": "info",
    "active": true
  },
  {
    "order": 5,
    "text": "계량기 검침일: 매월 {검침시작}일~{검침종료}일",
    "type": "info",
    "active": true
  }
]', 'json', 'notices', 1, false, '납부 안내 문구 목록');

-- 3. 데이터 확인
SELECT
  category,
  COUNT(*) as config_count
FROM app_configurations
GROUP BY category;

-- 4. 설정값 확인 (샘플 쿼리)
SELECT
  config_key,
  config_value,
  config_type,
  description
FROM app_configurations
WHERE is_active = true
ORDER BY category, display_order;