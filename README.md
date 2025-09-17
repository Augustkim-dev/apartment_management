# 아르노빌리지 전기료 관리 시스템

오피스텔 전기료 자동 분배 및 관리 시스템

## 🚀 시작하기

### 1. 환경 변수 설정

`.env.local.example` 파일을 복사하여 `.env.local` 파일을 생성하고 실제 값을 입력하세요:

```bash
cp .env.local.example .env.local
```

`.env.local` 파일 편집:
```env
MYSQL_HOST=your-actual-mysql-server-ip
MYSQL_PORT=3306
MYSQL_USER=your-username
MYSQL_PASSWORD=your-password
MYSQL_DATABASE=coloco_apartment
```

### 2. 데이터베이스 초기화

원격 MySQL 서버에서 `scripts/init-db.sql` 파일을 실행하여 테이블을 생성합니다:

```sql
mysql -h your-server-ip -u root -p < scripts/init-db.sql
```

### 3. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000) 접속

### 4. 데이터베이스 연결 테스트

[http://localhost:3000/api/test-db](http://localhost:3000/api/test-db) 접속하여 DB 연결 확인

## 📁 프로젝트 구조

```
coloco-apartment/
├── app/                    # Next.js App Router
│   ├── api/               # API 엔드포인트
│   │   └── test-db/       # DB 연결 테스트
│   └── page.tsx           # 홈페이지
├── lib/                   # 라이브러리
│   ├── db.ts             # MySQL 연결 풀
│   └── db-utils.ts       # DB 유틸리티 함수
├── scripts/              # 스크립트
│   └── init-db.sql       # DB 초기화 SQL
└── .env.local            # 환경 변수 (git 제외)
```

## 🛠 기술 스택

- **Framework**: Next.js 14 (App Router)
- **Database**: MySQL 8.0
- **Styling**: Tailwind CSS
- **Language**: TypeScript

## 📝 개발 단계

1. ✅ **Phase 1**: MySQL 연결 및 테이블 생성
2. ⏳ **Phase 2**: PDF/Excel 파싱 API
3. ⏳ **Phase 3**: 계산 엔진 구현
4. ⏳ **Phase 4**: 대시보드 UI 개발
5. ⏳ **Phase 5**: 인증 시스템 구현
6. ⏳ **Phase 6**: Vercel 배포

## 🔧 주요 명령어

```bash
# 개발 서버 실행
npm run dev

# 프로덕션 빌드
npm run build

# 프로덕션 서버 실행
npm start

# 타입 체크
npm run type-check

# 린트
npm run lint
```

## 📚 API 문서

### GET /api/test-db
데이터베이스 연결 테스트

**응답 예시:**
```json
{
  "success": true,
  "message": "데이터베이스 연결 성공!",
  "database": "coloco_apartment",
  "tables": ["users", "units", "monthly_bills", "unit_bills", "bill_history"],
  "unitStats": {
    "total": 60,
    "occupied": 58,
    "vacant": 2
  }
}
```

## 🐛 트러블슈팅

### MySQL 연결 실패
1. 환경 변수 확인 (.env.local)
2. MySQL 서버 상태 확인
3. 방화벽 설정 확인 (포트 3306)
4. 사용자 권한 확인

### 한글 깨짐 문제
데이터베이스와 테이블이 `utf8mb4` 문자셋을 사용하는지 확인:
```sql
ALTER DATABASE coloco_apartment CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```
