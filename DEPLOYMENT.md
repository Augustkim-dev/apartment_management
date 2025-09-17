# Vercel 배포 가이드

## 🚀 배포 준비 체크리스트

### ✅ 완료된 항목
- [x] 테스트 파일 및 불필요한 파일 제거
- [x] vercel.json 설정 파일 생성
- [x] next.config.ts 프로덕션 최적화
- [x] .env.example 파일 생성
- [x] .gitignore 파일 업데이트
- [x] 데이터베이스 연결 코드 프로덕션 최적화

### 📋 배포 전 필수 확인 사항
- [ ] GitHub 저장소 생성 및 코드 푸시
- [ ] 프로덕션 MySQL 데이터베이스 준비
- [ ] 환경 변수 값 준비
- [ ] 도메인 준비 (선택사항)

## 📝 단계별 배포 가이드

### 1단계: GitHub 저장소 설정

```bash
# Git 초기화 (이미 되어있다면 생략)
git init

# GitHub에 새 저장소 생성 후
git remote add origin https://github.com/your-username/coloco-apartment.git

# 첫 커밋 및 푸시
git add .
git commit -m "Initial commit: 아르노빌리지 전기료 관리 시스템"
git branch -M main
git push -u origin main
```

### 2단계: 데이터베이스 준비

#### 옵션 1: 자체 MySQL 서버 사용
1. MySQL 서버에 외부 접속 허용 설정
2. 프로덕션용 데이터베이스 사용자 생성
3. 방화벽에서 MySQL 포트(3306) 열기
4. SSL 인증서 설정 (권장)

#### 옵션 2: 클라우드 데이터베이스 사용 (권장)
- **PlanetScale**: https://planetscale.com (무료 플랜 제공)
- **Railway**: https://railway.app (무료 크레딧 제공)
- **Aiven**: https://aiven.io (무료 플랜 제공)

### 3단계: Vercel 프로젝트 생성

1. [Vercel](https://vercel.com) 접속 및 로그인
2. **"New Project"** 클릭
3. GitHub 저장소 연결 및 Import
4. 프로젝트 설정:
   - **Framework Preset**: Next.js
   - **Root Directory**: `./coloco-apartment` (프로젝트가 하위 폴더에 있는 경우)
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`
   - **Install Command**: `npm install`

### 4단계: 환경 변수 설정

Vercel Dashboard > Settings > Environment Variables에서 다음 변수들을 추가:

#### 필수 환경 변수

```env
# 데이터베이스 설정
MYSQL_HOST=your-database-host
MYSQL_PORT=3306
MYSQL_USER=your-database-user
MYSQL_PASSWORD=your-secure-password
MYSQL_DATABASE=coloco_apartment
MYSQL_SSL=true

# 연결 풀 설정
MYSQL_CONNECTION_LIMIT=5
MYSQL_QUEUE_LIMIT=0
MYSQL_CONNECT_TIMEOUT=60000

# 인증 설정
NEXTAUTH_SECRET=generate-32-char-random-string
NEXTAUTH_URL=https://your-app.vercel.app

# 세션 설정
SESSION_PASSWORD=generate-32-char-random-string
```

#### 환경 변수 값 생성 방법

```bash
# NEXTAUTH_SECRET 생성
openssl rand -base64 32

# SESSION_PASSWORD 생성
openssl rand -base64 32
```

### 5단계: 데이터베이스 초기화

프로덕션 데이터베이스에 스키마 및 초기 데이터 생성:

```bash
# 통합 초기화 스크립트 실행 (권장)
mysql -h your-host -u your-user -p < scripts/all_reset.sql
```

**all_reset.sql 스크립트 내용:**
- 모든 테이블 재생성
- 48개 호실 정보 (입주 45개, 공실 3개)
- 46개 사용자 계정 (admin 1개 + 입주자 45개)
- 초기 비밀번호: 모두 `0000`
- username 자동 생성: 전화번호 끝 8자리

### 6단계: 배포 실행

1. **자동 배포**: GitHub에 push하면 자동으로 배포
   ```bash
   git push origin main
   ```

2. **수동 배포**: Vercel Dashboard에서 "Redeploy" 클릭

### 7단계: 배포 확인

1. Vercel Dashboard에서 빌드 로그 확인
2. 배포 URL 접속하여 테스트
3. 기능 테스트 체크리스트:
   - [ ] 로그인/로그아웃
   - [ ] 대시보드 접속
   - [ ] PDF 업로드
   - [ ] Excel 업로드
   - [ ] 청구서 생성
   - [ ] 청구서 조회
   - [ ] 호실 관리

## 🔧 트러블슈팅

### 데이터베이스 연결 실패
- 환경 변수가 올바르게 설정되었는지 확인
- 데이터베이스 서버가 외부 접속을 허용하는지 확인
- 방화벽 설정 확인

### 빌드 실패
- `npm run build` 로컬에서 먼저 테스트
- TypeScript 에러 확인
- 종속성 설치 확인

### 함수 타임아웃
- vercel.json의 maxDuration 설정 확인
- 무료 플랜은 10초, Pro 플랜은 60초까지 가능

## 📊 모니터링

### Vercel Analytics
1. Dashboard > Analytics 활성화
2. Web Vitals 모니터링
3. 실시간 트래픽 확인

### 로그 확인
1. Dashboard > Functions > Logs
2. 실시간 로그 스트리밍
3. 에러 추적

## 🔒 보안 권장사항

1. **환경 변수**: 절대 코드에 하드코딩하지 않기
2. **데이터베이스**: SSL 연결 사용
3. **비밀번호**: 강력한 비밀번호 사용 (최소 32자)
4. **정기 업데이트**: 종속성 정기적으로 업데이트
5. **백업**: 데이터베이스 정기 백업

## 📞 지원

문제가 발생하면:
1. [Vercel Documentation](https://vercel.com/docs)
2. [Next.js Documentation](https://nextjs.org/docs)
3. [GitHub Issues](https://github.com/your-username/coloco-apartment/issues)

## 🎉 배포 완료!

배포가 완료되면 다음 URL로 접속 가능합니다:
- **프로덕션**: https://your-app.vercel.app
- **프리뷰**: https://your-app-git-branch.vercel.app

---

*마지막 업데이트: 2025-01-17*