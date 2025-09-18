-- ============================================
-- 납부 안내 display_order 필드 업데이트
-- Date: 2025-01-18
-- Description: notices.payment_notices의 order 필드를 display_order로 변경
-- ============================================

-- 1. 백업 (안전을 위해 현재 데이터 확인)
SELECT config_key, config_value
FROM app_configurations
WHERE config_key = 'notices.payment_notices';

-- 2. notices.payment_notices 업데이트 (order → display_order)
UPDATE app_configurations
SET config_value = '[
  {
    "display_order": 1,
    "text": "전기요금은 매월 {납부일}일까지 납부해 주시기 바랍니다.",
    "type": "info",
    "active": true
  },
  {
    "display_order": 2,
    "text": "미납 시 다음달 {연체시작일}일부터 연체료가 부과됩니다.",
    "type": "warning",
    "active": true
  },
  {
    "display_order": 3,
    "text": "자동이체 신청은 관리사무소로 문의해 주세요.",
    "type": "info",
    "active": true
  },
  {
    "display_order": 4,
    "text": "요금 문의: 관리사무소 ({관리사무소})",
    "type": "info",
    "active": true
  },
  {
    "display_order": 5,
    "text": "계량기 검침일: 매월 {검침시작}일~{검침종료}일",
    "type": "info",
    "active": true
  }
]',
updated_at = CURRENT_TIMESTAMP
WHERE config_key = 'notices.payment_notices';

-- 3. 변경 확인
SELECT config_key, config_value
FROM app_configurations
WHERE config_key = 'notices.payment_notices';

-- 4. 결과 확인
SELECT
  CASE
    WHEN JSON_VALID(config_value) THEN 'Valid JSON'
    ELSE 'Invalid JSON'
  END as json_status,
  JSON_LENGTH(config_value) as array_length
FROM app_configurations
WHERE config_key = 'notices.payment_notices';