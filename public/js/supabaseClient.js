// ⚠️ 아래 두 값을 Supabase 프로젝트의 Project Settings > API 에서 복사해 넣으세요.
// anon public key는 브라우저에 노출되어도 되는 키입니다 (RLS로 보호됨). service_role 키는 여기 넣지 마세요.
const SUPABASE_URL = "https://usypbemegsyucdqnrfpf.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_653wTJHWz-DttTmwCzN0dw_0Z3u38P7";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* ================= 1시간 미사용 시 자동 로그아웃 ================= */
const INACTIVITY_LIMIT_MS = 60 * 60 * 1000; // 1시간

function touchActivity() {
  try { localStorage.setItem('__last_activity_ts', String(Date.now())); } catch (e) {}
}

function isInactiveTooLong() {
  try {
    const t = localStorage.getItem('__last_activity_ts');
    if (!t) return false; // 기록이 없으면(첫 방문 등) 통과시킴
    return (Date.now() - Number(t)) > INACTIVITY_LIMIT_MS;
  } catch (e) {
    return false;
  }
}

// 클릭/터치/키입력/스크롤이 있을 때마다 "마지막 활동 시각" 갱신
['click', 'touchstart', 'keydown', 'scroll', 'mousemove'].forEach(function (evt) {
  document.addEventListener(evt, touchActivity, { passive: true });
});
touchActivity(); // 페이지를 여는 순간도 활동으로 기록

// 탭을 계속 켜둔 채로 1시간 넘게 아무것도 안 하면, 새로고침 없이도 바로 로그아웃 처리
setInterval(async function () {
  if (isInactiveTooLong()) {
    try { await supabaseClient.auth.signOut(); } catch (e) {}
    if (!location.pathname.endsWith('index.html') && location.pathname !== '/') {
      window.location.href = 'index.html';
    }
  }
}, 60 * 1000); // 1분마다 체크

async function requireLogin() {
  if (isInactiveTooLong()) {
    try { await supabaseClient.auth.signOut(); } catch (e) {}
    window.location.href = "index.html";
    return null;
  }

  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) {
    window.location.href = "index.html";
    return null;
  }
  touchActivity();
  return session;
}

// 로그인 + "만료되지 않은 결제"인지 확인. 미결제/만료 시 pay.html로 이동
async function requirePaidMember() {
  const session = await requireLogin();
  if (!session) return null;

  const { data: profile, error } = await supabaseClient
    .from("profiles")
    .select("is_paid, email, paid_until")
    .eq("id", session.user.id)
    .single();

  const isActive = profile && profile.paid_until && new Date(profile.paid_until) > new Date();

  if (error || !isActive) {
    window.location.href = "pay.html";
    return null;
  }
  return { session, profile };
}

async function logout() {
  await supabaseClient.auth.signOut();
  window.location.href = "index.html";
}
