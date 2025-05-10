// src/pages/TermsPage.jsx
import React from "react";

const TermsPage = () => (
  <div className="max-w-3xl mx-auto p-6">
    <h1 className="text-2xl font-bold mb-4">이용약관</h1>
    <p className="mb-2">본 약관은 PoliTalk(이하 "서비스")의 이용과 관련하여 회사와 이용자 간의 권리, 의무 및 책임사항을 규정합니다.</p>
    <ul className="list-disc list-inside space-y-2">
      <li>회원은 본 서비스를 통해 게시글을 작성하거나 댓글을 남길 수 있습니다.</li>
      <li>회원은 타인의 권리를 침해하거나 불법적인 콘텐츠를 게재해서는 안 됩니다.</li>
      <li>회사는 서비스의 원활한 운영을 위해 게시물의 수정, 삭제 또는 제한 조치를 취할 수 있습니다.</li>
      <li>회원의 개인정보는 서비스 운영 외의 목적으로 사용되지 않으며, 관련 법령에 따라 보호됩니다.</li>
      <li>서비스를 이용함으로써 본 약관에 동의한 것으로 간주됩니다.</li>
    </ul>
  </div>
);

export default TermsPage;

