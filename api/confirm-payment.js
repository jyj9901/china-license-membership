// Vercel Serverless Function
// 역할: (1) 프론트에서 받은 결제 정보를 토스페이먼츠 서버에 "승인 요청"으로 재확인하고
//       (2) 승인되면 Supabase의 profiles.is_paid 를 true로 바꾼다.
// 이 파일은 절대 브라우저에서 실행되지 않으므로, 여기에는 "비밀 키"(secret key)를 둬도 안전하다.
// 단, 실제 값은 Vercel 프로젝트의 Environment Variables에 넣고, 코드에는 직접 쓰지 않는다.

import { createClient } from "@supabase/supabase-js";

const TOSS_SECRET_KEY = process.env.TOSS_SECRET_KEY; // 예: test_sk_... / live_sk_...
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY; // service_role 키 (절대 프론트에 노출 금지)

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  try {
    const { paymentKey, orderId, amount } = req.body;
    if (!paymentKey || !orderId || !amount) {
      return res.status(400).json({ success: false, message: "필수 파라미터 누락" });
    }

    // 1) 요청한 사용자가 진짜 로그인된 사용자인지 확인 (Authorization 헤더의 access_token)
    const authHeader = req.headers.authorization || "";
    const accessToken = authHeader.replace("Bearer ", "");
    if (!accessToken) {
      return res.status(401).json({ success: false, message: "로그인이 필요합니다" });
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(accessToken);
    if (userErr || !userData?.user) {
      return res.status(401).json({ success: false, message: "유효하지 않은 세션입니다" });
    }
    const userId = userData.user.id;

    // 2) 토스페이먼츠에 결제 승인 요청 (금액 위변조 방지를 위해 서버에서 반드시 재검증)
    const EXPECTED_AMOUNT = 9900; // pay.html의 AMOUNT와 반드시 동일하게 유지
    if (Number(amount) !== EXPECTED_AMOUNT) {
      return res.status(400).json({ success: false, message: "결제 금액이 올바르지 않습니다" });
    }

    const tossRes = await fetch("https://api.tosspayments.com/v1/payments/confirm", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Basic " + Buffer.from(TOSS_SECRET_KEY + ":").toString("base64"),
      },
      body: JSON.stringify({ paymentKey, orderId, amount }),
    });

    const tossData = await tossRes.json();

    if (!tossRes.ok) {
      return res.status(400).json({ success: false, message: tossData.message || "토스 결제 승인 실패" });
    }

    // 3) 결제 승인 성공 -> 회원의 is_paid 를 true로 업데이트
    const { error: updateErr } = await supabaseAdmin
      .from("profiles")
      .update({
        is_paid: true,
        paid_at: new Date().toISOString(),
        order_id: orderId,
      })
      .eq("id", userId);

    if (updateErr) {
      return res.status(500).json({ success: false, message: "회원 정보 업데이트 실패: " + updateErr.message });
    }

    return res.status(200).json({ success: true });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message || "서버 오류" });
  }
}
