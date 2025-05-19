import React from "react";

const PrivacyPolicy = () => {
  const text = `PoliTalk 개인정보 처리방침

1. 수집하는 개인정보 항목
- 이메일 주소 (로그인 시)
- 닉네임, 프로필 이미지
- IP 주소, 브라우저 정보 (불법 행위 방지를 위한 비식별 수집)
- 선택적으로 댓글 내 업로드된 이미지 (본문 포함)

2. 개인정보의 수집 및 이용 목적
- 회원 식별 및 로그인 유지
- 커뮤니티 운영 및 알림 기능 제공
- 신고 및 제재 기능 대응
- 향후 맞춤형 광고 제공 및 통계 분석

3. 쿠키(Cookie) 및 트래킹 기술
PoliTalk은 로그인 상태 유지를 위해 쿠키를 사용할 수 있으며, 타사 분석 도구(Google Analytics 등)를 사용할 수 있습니다.

4. 제3자 제공
- 사용자의 동의 없이 개인정보를 외부에 제공하지 않으며, 단 법령에 따른 요청이 있는 경우 예외로 합니다.

5. 보유 및 파기
- 회원 탈퇴 시 모든 정보는 지체 없이 삭제되며, 관련 법령에 따라 일정 기간 보존이 필요한 경우에만 제한 보관됩니다.

6. 데이터 보안
- PoliTalk은 Firebase 인증 및 보안 규칙을 기반으로 데이터 접근을 제한하고, 비인가 접근을 방지하고 있습니다.

7. 미성년자의 개인정보
- 만 14세 미만 사용자의 개인정보는 보호자의 동의 없이 수집하지 않습니다.

문의: nss56931@naver.com
본 방침은 2025년 5월 19일부터 적용됩니다.`;

  return (
    <div className="max-w-3xl mx-auto py-10 px-4">
      <h1 className="text-2xl font-bold mb-4">개인정보처리방침</h1>
      <div className="whitespace-pre-wrap leading-relaxed text-gray-800">{text}</div>
    </div>
  );
};

export default PrivacyPolicy;
