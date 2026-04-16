import React, { useEffect, useRef } from "react";
import "./SplashScreen.css";
import { ReactComponent as Logo } from "../images/logo.svg"; // SVG를 컴포넌트로 임포트

export default function SplashScreen({ onFinish }) {
  const containerRef = useRef(null);

  useEffect(() => {
    // 1. SVG 내부의 모든 path 요소를 찾아서 길이를 계산하고 애니메이션 준비
    const paths = containerRef.current.querySelectorAll("path");
    
    paths.forEach((path) => {
      const length = path.getTotalLength();
      path.style.strokeDasharray = length;
      path.style.strokeDashoffset = length;
      // CSS에서 정의한 draw 애니메이션 적용
      path.style.animation = "draw 3s ease-in-out forwards";
    });

    // 2. 3.5초 뒤 메인 페이지로 이동 (애니메이션 시간보다 조금 길게)
    const timer = setTimeout(() => {
      onFinish();
    }, 2700);

    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div className="splash-container" ref={containerRef}>
      <div className="splash-glow" />
      <div className="splash-light-sweep" />

      <div className="logo-wrapper">
        <Logo className="drawing-logo" />
      </div>
    </div>
  );

}