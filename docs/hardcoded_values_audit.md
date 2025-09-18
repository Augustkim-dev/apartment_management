# Hardcoded Values Audit Report

## 작성일: 2025-09-18

## 요약
본 문서는 코드베이스 전체에서 발견된 하드코딩된 값들을 정리하고, 개선 방안을 제시합니다.

## 1. 중요도 높음 - 즉시 조치 필요

### 1.1 은행 계좌 정보
**보안상 매우 중요 - 환경 변수로 이동 필요**

| 파일 경로 | 라인 | 하드코딩 값 | 현재 용도 |
|-----------|------|------------|-----------|
| `app/api/my/bills/[id]/route.ts` | 219-221 | 신한은행, 100-035-727568, ㈜코로코 | 입금 계좌 정보 |
| `app/dashboard/bills/[id]/units/[unitId]/page.tsx` | 197-199 | 신한은행, 100-035-727568, ㈜코로코 | 입금 계좌 정보 |
| `app/dashboard/bills/[id]/units/[unitId]/print/page.tsx` | 170-172 | 신한은행, 100-035-727568, ㈜코로코 | 인쇄용 계좌 정보 |
| `app/api/bills/[id]/units/[unitId]/route.ts` | 213-215 | 국민은행, 123-45-678900, 아르노빌리지 관리사무소 | 대체 계좌 정보 |

**권장 조치:**
```env
PAYMENT_BANK_NAME=신한은행
PAYMENT_ACCOUNT_NUMBER=100-035-727568
PAYMENT_ACCOUNT_HOLDER=㈜코로코
```

### 1.2 연락처 정보
**관리 필요 - 설정 파일로 이동**

| 파일 경로 | 라인 | 하드코딩 값 | 현재 용도 |
|-----------|------|------------|-----------|
| `app/api/my/bills/[id]/route.ts` | 126 | 02-1234-5678 | 관리사무소 전화번호 |
| `app/api/bills/[id]/units/[unitId]/route.ts` | 231 | 02-1234-5678 | 관리사무소 전화번호 |

**권장 조치:**
```env
MANAGEMENT_OFFICE_PHONE=02-1234-5678
MANAGEMENT_OFFICE_EMAIL=management@arnodvillage.com
```

## 2. 중요도 중간 - 개선 권장

### 2.1 요금 계산 관련 상수
**유지보수를 위해 설정 가능하도록 변경 필요**

| 파일 경로 | 라인 | 하드코딩 값 | 설명 | 권장 조치 |
|-----------|------|------------|------|-----------|
| `app/api/my/bills/[id]/route.ts` | 214 | 8320 | kW당 기본료 | 설정으로 이동 |
| `lib/calculation/bill-calculator.ts` | 40 | 25231 | 기본 건물 총 사용량(kWh) | 설정으로 이동 |
| 다수 파일 | 다수 | 700, 210 | 계약전력, 요금적용전력 | 설정으로 이동 |

**권장 설정:**
```javascript
// config/billing.js
export const BILLING_CONFIG = {
  DEFAULT_TOTAL_USAGE_KWH: 25231,
  BASIC_FEE_RATE_PER_KW: 8320,
  DEFAULT_CONTRACT_POWER: 700,
  DEFAULT_APPLIED_POWER: 210
};
```

### 2.2 사용자 안내 메시지
**쉬운 수정을 위해 외부화 필요**

| 파일 경로 | 라인 | 하드코딩 텍스트 | 용도 |
|-----------|------|----------------|------|
| `app/api/my/bills/[id]/route.ts` | 122-128 | 납부 안내 문구 5개 | 사용자 고지서 안내 |

**현재 하드코딩된 안내 문구:**
```javascript
const notices = [
  '• 전기요금은 매월 말일까지 납부해 주시기 바랍니다.',
  '• 미납 시 다음달 5일부터 연체료가 부과됩니다.',
  '• 자동이체 신청은 관리사무소로 문의해 주세요.',
  '• 요금 문의: 관리사무소 (02-1234-5678)',
  '• 계량기 검침일: 매월 9일~10일'
];
```

**권장 조치:**
- 데이터베이스 또는 설정 파일로 이동
- 관리자 UI에서 수정 가능하도록 개선

### 2.3 건물 정보
**중앙화 필요**

| 파일 경로 | 하드코딩 값 | 용도 |
|-----------|------------|------|
| 다수 레이아웃 파일 | 아르노빌리지 | 건물명 |
| `app/api/calculate/route.ts:79` | 아르노빌리지 | 기본 건물명 |

**권장 조치:**
```env
BUILDING_NAME=아르노빌리지
BUILDING_UNIT_COUNT=60
BUILDING_TYPE=오피스텔
```

### 2.4 계약 정보
**설정 가능하도록 변경 검토**

| 파일 경로 | 라인 | 하드코딩 값 | 설명 |
|-----------|------|------------|------|
| `app/api/my/bills/[id]/route.ts` | 211 | 일반용(을)고압A선택2 | 계약 종별 |
| `app/dashboard/bills/[id]/units/[unitId]/page.tsx` | 190 | 일반용(을) 고압A Ⅱ | 계약 종별 변형 |

## 3. 개선 방안

### 3.1 단계별 구현 계획

#### 1단계: 보안 중요 항목 (즉시)
- [ ] 은행 정보를 환경 변수로 이동
- [ ] 민감한 데이터를 위한 설정 서비스 생성
- [ ] 모든 결제 정보 참조 업데이트

#### 2단계: 연락처 및 건물 정보 (1주 내)
- [ ] 건물 정보 중앙화
- [ ] 연락처 정보 관리 시스템 구축
- [ ] 전화번호 및 연락처 업데이트

#### 3단계: 계산 상수 (2주 내)
- [ ] 청구 설정 서비스 생성
- [ ] 요금율 및 계산 상수를 DB/설정으로 이동
- [ ] 요금율 업데이트를 위한 관리자 인터페이스 추가

#### 4단계: 사용자 메시지 (3주 내)
- [ ] 공지/메시지 관리 시스템 생성
- [ ] 사용자 대면 텍스트를 DB/설정으로 이동
- [ ] 공지 업데이트를 위한 관리자 인터페이스 추가

### 3.2 권장 설정 구조

```typescript
// lib/config/app-config.ts
export const AppConfig = {
  building: {
    name: process.env.BUILDING_NAME || '아르노빌리지',
    unitCount: parseInt(process.env.BUILDING_UNIT_COUNT || '60'),
    type: process.env.BUILDING_TYPE || '오피스텔'
  },
  payment: {
    bankName: process.env.PAYMENT_BANK_NAME!,
    accountNumber: process.env.PAYMENT_ACCOUNT_NUMBER!,
    accountHolder: process.env.PAYMENT_ACCOUNT_HOLDER!
  },
  contact: {
    managementPhone: process.env.MANAGEMENT_OFFICE_PHONE!,
    email: process.env.MANAGEMENT_OFFICE_EMAIL
  },
  billing: {
    basicFeeRate: parseInt(process.env.BASIC_FEE_RATE_PER_KW || '8320'),
    contractPower: parseInt(process.env.CONTRACT_POWER || '700'),
    appliedPower: parseInt(process.env.APPLIED_POWER || '210'),
    contractType: process.env.CONTRACT_TYPE || '일반용(을)고압A선택2'
  }
};
```

### 3.3 환경 변수 템플릿 (.env.example)

```bash
# Building Information
BUILDING_NAME=아르노빌리지
BUILDING_UNIT_COUNT=60
BUILDING_TYPE=오피스텔

# Payment Information (REQUIRED)
PAYMENT_BANK_NAME=신한은행
PAYMENT_ACCOUNT_NUMBER=100-035-727568
PAYMENT_ACCOUNT_HOLDER=㈜코로코

# Contact Information (REQUIRED)
MANAGEMENT_OFFICE_PHONE=02-1234-5678
MANAGEMENT_OFFICE_EMAIL=management@arnodvillage.com

# Billing Configuration
BASIC_FEE_RATE_PER_KW=8320
CONTRACT_POWER=700
APPLIED_POWER=210
CONTRACT_TYPE=일반용(을)고압A선택2
DEFAULT_TOTAL_USAGE_KWH=25231

# Dates and Schedules
METER_READING_START_DAY=9
METER_READING_END_DAY=10
PAYMENT_DUE_DAY=31
LATE_FEE_START_DAY=5
```

## 4. 테스트/샘플 데이터

### 낮은 우선순위 - 테스트용으로 유지

| 파일 경로 | 하드코딩 값 | 용도 |
|-----------|------------|------|
| `app/api/units/route.ts:42-83` | 데모 사용자 데이터 | 샘플 데이터 생성 |
| `lib/parsers/kepco-invoice-parser.ts:285-305` | 샘플 송장 데이터 | 폴백 데이터 |

**권장 조치:** 테스트 목적으로 유지, 별도 테스트 데이터 파일로 분리 고려

## 5. 보안 고려사항

1. **민감한 정보는 절대 코드에 하드코딩하지 않기**
   - 계좌 정보, API 키, 비밀번호 등

2. **환경 변수 사용 시 주의사항**
   - `.env.local` 파일은 절대 git에 커밋하지 않기
   - `.env.example` 파일로 필요한 환경 변수 문서화
   - 프로덕션 환경에서는 안전한 비밀 관리 서비스 사용

3. **설정 검증**
   - 앱 시작 시 필수 환경 변수 존재 여부 확인
   - 타입 안전성을 위한 설정 스키마 검증

## 6. 마이그레이션 체크리스트

- [ ] `.env.example` 파일 생성
- [ ] 환경 변수 로드 및 검증 로직 구현
- [ ] AppConfig 서비스 생성
- [ ] 하드코딩된 값들을 AppConfig 참조로 교체
- [ ] 테스트 환경에서 검증
- [ ] 프로덕션 환경 변수 설정
- [ ] 배포 및 모니터링

## 7. 예상 효과

1. **보안 강화**: 민감한 정보가 소스 코드에서 분리됨
2. **유지보수 개선**: 설정 변경 시 코드 수정 불필요
3. **환경별 구성**: 개발/스테이징/프로덕션 환경별 다른 설정 가능
4. **관리 효율성**: 중앙화된 설정 관리

## 8. 참고 사항

- 이 문서는 2025-09-18 기준으로 작성되었습니다
- 코드베이스가 업데이트되면 이 문서도 함께 업데이트해야 합니다
- 새로운 기능 추가 시 하드코딩을 피하고 설정 기반 접근 방식을 사용하세요