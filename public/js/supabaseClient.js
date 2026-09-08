// ⚠️ 아래 두 값을 Supabase 프로젝트의 Project Settings > API 에서 복사해 넣으세요.
// anon public key는 브라우저에 노출되어도 되는 키입니다 (RLS로 보호됨). service_role 키는 여기 넣지 마세요.
const SUPABASE_URL = "https://usypbemegsyucdqnrfpf.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzeXBiZW1lZ3N5dWNkcW5yZnBmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY2OTg2NTQsImV4cCI6MjEwMjI3NDY1NH0.whx3uxgr4Fes8LWxdd0xOl3muu1aiYjp4q0GMuBydw0";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function requireLogin() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) {
    window.location.href = "index.html";
    return null;
  }
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
