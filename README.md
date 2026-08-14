# 중국 운전면허 문제은행 — 회원제 사이트 배포 가이드

이 폴더에는 다음이 들어있습니다.

```
project/
  public/
    index.html            로그인 / 회원가입
    pay.html               결제 페이지 (토스페이먼츠)
    payment-success.html   결제 성공 콜백 (자동 처리, 사용자가 볼 필요 없음)
    payment-fail.html      결제 실패 페이지
    study.html              실제 문제은행 (기존 파일 + 회원 게이트 추가)
    css/style.css
    js/supabaseClient.js
  api/
    confirm-payment.js     결제 검증 후 회원을 "결제완료"로 전환하는 서버 함수
  supabase_setup.sql        DB 테이블 및 보안 규칙
  package.json
  vercel.json
```

전체 흐름: **회원가입 → 결제(토스) → 서버가 결제를 검증 → DB에 결제완료 기록 → study.html 접근 허용**

작업은 총 4단계입니다. 순서대로 따라 하시면 됩니다. (사업자등록 없이도 테스트 결제까지는 전부 가능합니다.)

---

## 1단계. Supabase 설정 (회원 로그인 + DB) — 무료

1. https://supabase.com 접속 → 회원가입 → **New Project** 생성
   - 이름: 아무거나 (예: china-license)
   - 비밀번호는 잘 저장해두세요 (DB 접속용, 이후엔 거의 안 씁니다)
   - Region은 **Northeast Asia (Seoul)** 선택 권장
2. 프로젝트가 만들어지면 왼쪽 메뉴 **SQL Editor** 클릭
3. 이 폴더의 `supabase_setup.sql` 파일 내용을 전체 복사해서 붙여넣고 **Run** 클릭
   - 이 스크립트가 회원 정보 테이블(profiles)과 보안 규칙을 자동으로 만들어줍니다.
4. 왼쪽 메뉴 **Project Settings → API** 로 이동해서 아래 두 값을 복사해두세요.
   - **Project URL** (예: `https://abcdxyz.supabase.co`)
   - **anon public** 키 (긴 문자열)
   - **service_role** 키도 복사해두세요 (⚠️ 이건 절대 프론트 코드에 넣지 마세요, 나중에 Vercel 환경변수에만 넣습니다)

https://usypbemegsyucdqnrfpf.supabase.co

eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzeXBiZW1lZ3N5dWNkcW5yZnBmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY2OTg2NTQsImV4cCI6MjEwMjI3NDY1NH0.whx3uxgr4Fes8LWxdd0xOl3muu1aiYjp4q0GMuBydw0

eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzeXBiZW1lZ3N5dWNkcW5yZnBmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjY5ODY1NCwiZXhwIjoyMTAyMjc0NjU0fQ.rCGgA9piTBiY3MxmX9u_tjgDLptEvKf10QP40J9L5kk


5. 이 값들을 `public/js/supabaseClient.js` 파일에 넣습니다.
   ```js
   const SUPABASE_URL = "https://abcdxyz.supabase.co";        // 여기에 Project URL
   const SUPABASE_ANON_KEY = "eyJhbGciOi...";                   // 여기에 anon public 키
   ```
6. (선택) 이메일 인증을 끄고 싶다면: **Authentication → Providers → Email** 에서
   "Confirm email" 옵션을 꺼두면 가입 즉시 로그인이 가능합니다 (테스트 단계에 편리).

---

## 2단계. 토스페이먼츠 설정 (결제) — 사업자등록 없이 테스트 가능

1. https://developers.tosspayments.com 접속 → 회원가입/로그인
2. 대시보드에서 **테스트 상점**이 기본 제공됩니다. 좌측 **API 키** 메뉴로 이동
3. 아래 두 키를 복사하세요.
   - **테스트 클라이언트 키** (`test_ck_...`)
   - **테스트 시크릿 키** (`test_sk_...`)

test_gck_docs_Ovk5rk1EwkEbP0W43n07xlzm
test_gsk_docs_OaPz8L5KdmQXkzRz3y47BMw6

4. 클라이언트 키를 `public/pay.html` 파일에 넣습니다.
   ```js
   const TOSS_CLIENT_KEY = "test_ck_...";
   ```
5. 시크릿 키는 코드에 넣지 않고, 4단계(Vercel 환경변수)에서 넣습니다.

> **실제 운영(실결제) 전환은 나중에**: 위 방식으로 먼저 테스트 결제까지 전부 동작 확인한 뒤,
> 토스페이먼츠에서 사업자 심사(사업자등록증 필요)를 받아 **live 키**로 교체하기만 하면 됩니다.
> 코드는 그대로 두고 키 값만 test_ → live_ 로 바꾸면 됩니다.

---

## 3단계. Vercel에 배포하기 — 무료

1. https://vercel.com 접속 → GitHub 계정으로 가입/로그인
2. 이 `project` 폴더를 GitHub 저장소에 올립니다 (GitHub Desktop이나 웹에서 파일 업로드로 가능)
3. Vercel 대시보드에서 **Add New → Project** → 방금 만든 저장소 선택
4. **Environment Variables**에 아래 3개를 추가 (여기가 비밀 키를 넣는 곳입니다)
   | Key | Value |
   |---|---|
   | `TOSS_SECRET_KEY` | 2단계에서 복사한 테스트 시크릿 키 |
   | `SUPABASE_URL` | 1단계의 Project URL |
   | `SUPABASE_SERVICE_ROLE_KEY` | 1단계의 service_role 키 |
5. **Deploy** 클릭 → 몇 분 후 `https://프로젝트이름.vercel.app` 주소가 생성됩니다.
6. 접속해서 회원가입 → 결제(토스 테스트 결제창에서는 아무 카드번호나 테스트용 번호 사용 가능) → study.html 로 이동되는지 확인하세요.

---

## 4단계. 도메인 연결 (선택)

이미 도메인이 있다면 Vercel 프로젝트 **Settings → Domains** 에서 도메인을 추가하고,
도메인 구입처(가비아 등)의 DNS 설정에서 안내해주는 값(CNAME 또는 A 레코드)을 등록하면
`vercel.app` 대신 원하는 주소로 접속할 수 있습니다. 보통 반영까지 몇 분~수 시간 걸립니다.

---

## 자주 묻는 질문

**Q. 테스트 결제와 실제 결제의 차이는?**
테스트 키(`test_`)로는 실제 카드가 청구되지 않고, 토스 개발자센터가 제공하는 가상 결제창에서 승인 흐름만 확인할 수 있습니다. 실제 결제를 받으려면 사업자등록 후 토스페이먼츠 심사를 통과해 `live_` 키를 발급받아야 합니다 (보통 1~3영업일).

**Q. 문제를 나중에 추가/수정하고 싶어요.**
`public/study.html` 안의 `const QUESTIONS = [...]` 부분에 같은 형식으로 문제를 추가하면 됩니다. 보유하신 다른 파트(2부, 3부 등) 문제도 같은 배열에 이어붙이면 됩니다.

**Q. 무료 요금제로 몇 명까지 감당되나요?**
Supabase 무료 티어는 월 5만 MAU(활성 사용자), Vercel 무료 티어는 개인 프로젝트 기준 트래픽이 넉넉해서 초기 단계에는 충분합니다. 이용자가 많아지면 그때 유료 플랜으로 전환하면 됩니다.

**Q. 결제 위변조는 안전한가요?**
네. 결제 승인은 브라우저가 아니라 `api/confirm-payment.js` 서버 함수가 토스 서버와 직접 통신해서 금액까지 재검증한 후에만 회원을 "결제완료"로 바꿉니다. 브라우저 개발자도구로 값을 조작해도 서버 쪽 검증을 통과하지 못합니다.

---

막히는 단계가 있으면 어느 단계에서 어떤 화면이 나오는지 알려주세요. 화면 캡처를 붙여넣어 주셔도 좋습니다.
