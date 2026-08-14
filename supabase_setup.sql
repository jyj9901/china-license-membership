-- ============================================================
-- 중국 운전면허 문제은행 회원제 사이트 - Supabase 초기 설정
-- Supabase 대시보드 > SQL Editor 에서 이 파일 전체를 붙여넣고 실행하세요.
-- ============================================================

-- 1) 회원 프로필 테이블 (결제 여부 저장용)
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text,
  is_paid boolean not null default false,
  paid_at timestamptz,
  order_id text,
  created_at timestamptz not null default now()
);

-- 2) 회원가입 시 자동으로 profiles 행 생성
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 3) RLS(Row Level Security) 활성화 - 본인 데이터만 조회 가능, 결제 여부는 서버(service_role)만 수정 가능
alter table public.profiles enable row level security;

drop policy if exists "본인 프로필만 조회" on public.profiles;
create policy "본인 프로필만 조회"
  on public.profiles for select
  using (auth.uid() = id);

-- 주의: is_paid를 업데이트하는 정책은 일부러 만들지 않습니다.
-- 결제 승인은 반드시 서버(api/confirm-payment.js, service_role 키)에서만 처리되어야
-- 사용자가 브라우저 콘솔로 직접 "결제완료"로 바꿔치기 하는 것을 막을 수 있습니다.
