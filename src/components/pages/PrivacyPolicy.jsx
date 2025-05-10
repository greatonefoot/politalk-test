
// src/pages/PrivacyPolicy.jsx
import React from "react";

const PrivacyPolicy = () => (
  <div className="max-w-3xl mx-auto p-6">
    <h1 className="text-2xl font-bold mb-4">개인정보 처리방침</h1>
    <p className="mb-2">PoliTalk(이하 "서비스")는 이용자의 개인정보를 소중히 여기며, 관련 법령에 따라 안전하게 보호하고 있습니다.</p>
    <ul className="list-disc list-inside space-y-2">
      <li>수집 항목: 이메일, 닉네임, 로그인 이력(IP 포함)</li>
      <li>수집 목적: 서비스 제공, 이용자 식별, 부정 이용 방지</li>
      <li>보관 기간: 회원 탈퇴 시까지 또는 관련 법령 기준에 따름</li>
      <li>서비스는 제3자에게 개인정보를 제공하지 않으며, 보안 조치를 통해 보호됩니다.</li>
      <li>이용자는 언제든지 자신의 개인정보를 조회, 수정하거나 삭제 요청할 수 있습니다.</li>
    </ul>
  </div>
);

export default PrivacyPolicy;
