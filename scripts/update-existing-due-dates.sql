-- 기존 unit_bills의 due_date를 monthly_bills의 due_date로 업데이트
-- 작성일: 2025-10-31
-- 목적: 1970-01-01로 표시되는 사용자 화면 납부기한 문제 해결

-- Step 1: monthly_bills에 due_date가 없는 경우 먼저 설정 (청구기간 종료일 + 10일)
UPDATE monthly_bills
SET due_date = DATE_ADD(billing_period_end, INTERVAL 10 DAY)
WHERE due_date IS NULL;

-- Step 2: unit_bills의 due_date를 monthly_bills의 due_date로 업데이트
UPDATE unit_bills ub
JOIN monthly_bills mb ON ub.monthly_bill_id = mb.id
SET ub.due_date = mb.due_date
WHERE ub.due_date IS NULL;

-- Step 3: 결과 확인
SELECT
  COUNT(*) as total_unit_bills,
  SUM(CASE WHEN due_date IS NULL THEN 1 ELSE 0 END) as null_due_dates,
  SUM(CASE WHEN due_date IS NOT NULL THEN 1 ELSE 0 END) as valid_due_dates
FROM unit_bills;

-- Step 4: 샘플 데이터 확인 (최근 5건)
SELECT
  ub.id,
  mb.bill_year,
  mb.bill_month,
  mb.billing_period_end,
  mb.due_date as monthly_due_date,
  ub.due_date as unit_due_date,
  u.unit_number
FROM unit_bills ub
JOIN monthly_bills mb ON ub.monthly_bill_id = mb.id
JOIN units u ON ub.unit_id = u.id
ORDER BY mb.bill_year DESC, mb.bill_month DESC, u.unit_number
LIMIT 5;
