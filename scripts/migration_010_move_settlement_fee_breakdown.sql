-- Migration 010: move_settlements 테이블에 항목별 추정 요금 컬럼 추가
-- 이사정산 시 추정 청구서의 개별 요금 항목을 저장하여
-- monthly_bill 없이도 추정 청구서를 표시할 수 있도록 함
-- Created: 2026-03-05

ALTER TABLE move_settlements
  ADD COLUMN estimated_basic_fee DECIMAL(10,0) DEFAULT NULL AFTER estimation_base_months,
  ADD COLUMN estimated_power_fee DECIMAL(10,0) DEFAULT NULL AFTER estimated_basic_fee,
  ADD COLUMN estimated_climate_fee DECIMAL(10,0) DEFAULT NULL AFTER estimated_power_fee,
  ADD COLUMN estimated_fuel_fee DECIMAL(10,0) DEFAULT NULL AFTER estimated_climate_fee,
  ADD COLUMN estimated_power_factor_fee DECIMAL(10,0) DEFAULT NULL AFTER estimated_fuel_fee,
  ADD COLUMN estimated_vat DECIMAL(10,0) DEFAULT NULL AFTER estimated_power_factor_fee,
  ADD COLUMN estimated_power_fund DECIMAL(10,0) DEFAULT NULL AFTER estimated_vat,
  ADD COLUMN estimated_usage_ratio DECIMAL(10,6) DEFAULT NULL AFTER estimated_power_fund;
