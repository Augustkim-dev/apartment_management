# 010. 연락처 기반 username 자동 생성 기능

## 작업일
2025-01-17

## 작업 내용

### 1. 요구사항 분석
- **배경**: 사용자 인증 시 username을 기억하기 쉽게 하기 위함
- **목표**: 연락처 변경 시 자동으로 username 생성
- **범위**:
  - 관리자 모드의 [유저관리]
  - 사용자 모드의 [프로필]

### 2. username 생성 규칙
- **변환 규칙**:
  - 전화번호에서 010과 하이픈(-) 제거
  - 8자리 숫자만 추출
  - 예: 010-2222-0201 → 22220201
- **중복 처리**:
  - 중복 시 suffix 추가 (_2, _3 등)
  - 최대 100개까지 suffix 시도
- **예외 처리**:
  - admin 계정은 username 변경 불가
  - 전화번호가 없거나 형식이 잘못된 경우 기존 username 유지

### 3. 유틸리티 함수 구현
- **파일**: `/lib/user-utils.ts`
- **주요 함수**:
  ```typescript
  // username 생성 및 중복 체크
  generateUsernameFromPhone(phone: string, userId?: number): Promise<string | null>

  // admin 계정 확인
  isAdminUser(userId: number): Promise<boolean>

  // 전화번호 변경 감지
  hasPhoneChanged(userId: number, newPhone: string): Promise<boolean>
  ```

### 4. API 엔드포인트 수정

#### 관리자용 유저 수정 (`/api/users/[id]/route.ts`)
- **일반 사용자 권한**:
  - 본인 정보만 수정 가능
  - phone 변경 시 username 자동 생성
- **관리자 권한**:
  - 모든 사용자 정보 수정 가능
  - phone 변경 시 username 자동 생성 (admin 제외)

#### 사용자 프로필 수정 (`/api/users/profile/route.ts`)
- **기능**:
  - phone 변경 감지
  - admin이 아닌 경우 username 자동 생성
  - 비밀번호 변경과 별도로 처리

### 5. 프론트엔드 UI 개선

#### 관리자 유저관리 페이지 (`/dashboard/users/[id]/edit/page.tsx`)
- **추가 기능**:
  - username 필드 완전 읽기 전용
  - 실시간 username 미리보기
  - 전화번호 입력 시 즉시 8자리 변환 표시
  - "연락처 변경 시 아이디가 자동으로 변경됩니다" 안내 문구

#### 사용자 프로필 페이지 (`/my/profile/page.tsx`)
- **추가 기능**:
  - 실시간 username 미리보기
  - 수정 모드에서만 미리보기 활성화
  - 변경 예정 username 파란색으로 표시
  - 안내 문구 추가

### 6. 구현 상세

#### username 생성 로직
```javascript
1. 전화번호에서 숫자만 추출
2. 010으로 시작하면 010 제거
3. 8자리 확인
4. 데이터베이스에서 중복 확인
5. 중복 시 suffix 추가 (_2, _3...)
6. 최종 username 반환
```

#### 중복 체크 쿼리
```sql
SELECT id FROM users
WHERE username = ?
AND id != ?  -- 본인 제외
```

### 7. 보안 고려사항
- admin 계정 username 변경 방지
- 트랜잭션 처리로 동시성 문제 해결
- SQL Injection 방지 (파라미터 바인딩)

### 8. 테스트 시나리오
1. **정상 케이스**:
   - 010-1234-5678 → 12345678
   - 중복 없음 → 그대로 저장

2. **중복 케이스**:
   - 12345678 이미 존재 → 12345678_2

3. **예외 케이스**:
   - admin 계정 → username 변경 안 됨
   - 전화번호 삭제 → 기존 username 유지
   - 잘못된 형식 → 기존 username 유지

## 기술적 구현 사항

### 파일 구조
```
lib/
├── user-utils.ts           (신규 - username 생성 유틸리티)
app/
├── api/
│   └── users/
│       ├── [id]/
│       │   └── route.ts    (수정 - username 자동 생성 추가)
│       └── profile/
│           └── route.ts    (수정 - username 자동 생성 추가)
└── dashboard/
    └── users/
        └── [id]/
            └── edit/
                └── page.tsx (수정 - 실시간 미리보기)
└── my/
    └── profile/
        └── page.tsx        (수정 - 실시간 미리보기)
```

### 주요 변경사항
1. **백엔드**:
   - phone 변경 감지 로직
   - username 자동 생성 및 중복 체크
   - admin 계정 보호

2. **프론트엔드**:
   - 실시간 미리보기 구현
   - 사용자 친화적 안내 메시지
   - 읽기 전용 username 필드

## 성과
✅ 사용자가 username을 기억하기 쉬움 (전화번호 기반)
✅ 중복 username 자동 처리
✅ admin 계정 보호
✅ 실시간 미리보기로 UX 개선
✅ 관리자/사용자 모두 동일한 로직 적용

## 추가 고려사항
- 기존 사용자들의 username 일괄 변경 SQL 스크립트 제공
- 전화번호 형식 유효성 검사 강화
- username 변경 이력 로깅 (추후 구현)