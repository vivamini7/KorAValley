import React, { useState, useEffect } from "react";
import "./MainPage.css";
import Navbar from "../components/Navbar";
import TypingText from "./TypingText";
import ThreeScene from "./ThreeScene";

function useIsMobile(breakpoint = 900) {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < breakpoint);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < breakpoint);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, [breakpoint]);
  return isMobile;
}

export default function MainPage() {
  const isMobile = useIsMobile();

  return (
    <div className="mainpage">
      {/* Background & Effects */}
      <div className="bg" />
      <div className="glow" />

      {/* Full-screen water flow layer */}
      <div className="waterLayer" aria-hidden="true">
        <div className="waterStream s1" />
        <div className="waterStream s2" />
        <div className="waterStream s3" />
        <div className="waterStream s4" />
        <div className="waterStream s5" />
      </div>


      <Navbar />
      <main className="hero">
        <div className="heroInner split">
          <div className="heroRight">
            <h1 className="title brandTitle">
              <span className="brandK">K</span><span className="brandOHeart">🌊</span>r
              <span className="brandA">A</span> Valley
            </h1>

            <p className="subtitle">
              <TypingText
                text="Professional Minds, Colorful Lives."
                speed={50}
                startDelay={350}
              />
            </p>

            <div className="ctaRow">
              <button
                className="btnPrimary"
                onClick={() =>
                  window.open("https://www.linkedin.com/company/kora-valley/", "_blank")
                }
              >
                LinkedIn
              </button>
              <button
                className="btnGhost"
                onClick={() =>
                  window.open("https://www.instagram.com/kora.valley/", "_blank")
                }
              >
                Instagram
              </button>
            </div>
          </div>

          {!isMobile && (
            <div className="heroSphereCol">
              <ThreeScene />
            </div>
          )}
        </div>

        {/* Hero bottom accent waves */}
        <div className="heroWaves" aria-hidden="true">
          <svg className="hWave hw1" viewBox="0 0 2880 100" preserveAspectRatio="none">
            <path d="M0,50 C240,10 480,90 720,50 S1440,10 1440,50 S2160,90 2160,50 S2880,10 2880,50 L2880,100 L0,100 Z" fill="rgba(35,130,215,0.18)" />
          </svg>
          <svg className="hWave hw2" viewBox="0 0 2880 100" preserveAspectRatio="none">
            <path d="M0,65 C180,35 360,90 540,65 S1080,35 1080,65 S1620,90 1620,65 S2160,35 2160,65 S2700,90 2880,65 L2880,100 L0,100 Z" fill="rgba(25,165,215,0.13)" />
          </svg>
          <svg className="hWave hw3" viewBox="0 0 2880 100" preserveAspectRatio="none">
            <path d="M0,80 C120,62 240,95 360,80 S720,62 720,80 S1080,95 1080,80 S1440,62 1440,80 S1800,95 1800,80 S2160,62 2160,80 S2520,95 2880,80 L2880,100 L0,100 Z" fill="rgba(55,185,230,0.09)" />
          </svg>
        </div>

        {/* Scroll Down Arrow */}
        <div
          className="scrollArrow"
          onClick={() => document.getElementById("about").scrollIntoView({ behavior: "smooth" })}
          aria-label="아래로 스크롤"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </main>

      {/* About Section */}
      <section className="aboutSection" id="about">
        <div className="aboutWrap">

          <div className="aboutRow">
            <div className="aboutLeft">
              <span className="aboutTag">Community</span>
              <h2 className="aboutTitle">Who<br /><span className="aboutGrad">are we?</span></h2>
            </div>
            <div className="aboutRight">
              <p className="aboutBody">
                <b>한국</b> 혹은 <b>미국</b>을 무대로,
                자신만의 <b>비전</b>을 펼치고자 하는
                도전자들이 모인 커뮤니티입니다.
              </p>
              <ul className="aboutPills">
                <li>AI</li><li>Finance</li><li>Medical</li>
                <li>Developer</li><li>Research</li>
              </ul>
            </div>
          </div>

          <div className="aboutSep" />

          <div className="aboutRow">
            <div className="aboutLeft">
              <span className="aboutTag">Values</span>
              <h2 className="aboutTitle">Who do<br /><span className="aboutGrad">we want?</span></h2>
            </div>
            <div className="aboutRight">
              <p className="aboutBody">
                주어진 환경에 안주하지 않고,
                자신의 <b>확고한 비전</b>을 위해 끊임없이
                움직이며 <b>자신만의 파도</b>를 만들어가는 사람들.
              </p>
              <ul className="aboutPills">
                <li>도전</li><li>성장</li><li>비전</li><li>연결</li>
              </ul>
            </div>
          </div>

        </div>
      </section>
    </div>
  );
}
