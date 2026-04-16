import React from "react";
import "./MainPage.css";
import Navbar from "../components/Navbar";
import TypingText from "./TypingText";

export default function MainPage() {

  return (
    <div className="mainpage">
      {/* Background & Effects */}
      <div className="bg" />
      <div className="glow" />

      {/* Map Layer */}
      <div className="mapLayer" aria-hidden="true">
        <div className="mapKorea">
          <span className="mapTextKorea">AI</span>
        </div>
        <div className="mapUSA">
          <span className="mapTextUSA">Finance</span>
        </div>
        <div className="medical">
          <span className="mapmedical">Medical</span>
        </div>
        <div className="mapte">
          <span className="mapmapte">Developer</span>
        </div>
        <div className="author">
          <span className="mapauthor">Author</span>
        </div>
      </div>

      <Navbar />
      <main className="hero">
        <svg className="network" viewBox="0 0 520 420" aria-hidden="true">
          {/* lines (먼저) */}
          <line className="l l1" x1="120" y1="90"  x2="260" y2="150" />
          <line className="l l2" x1="260" y1="150" x2="410" y2="110" />
          <line className="l l3" x1="260" y1="150" x2="420" y2="260" />
          <line className="l l4" x1="170" y1="280" x2="260" y2="150" />
          <line className="l l5" x1="170" y1="280" x2="420" y2="260" />
          <line className="l l6" x1="120" y1="90"  x2="170" y2="280" />

          {/* nodes */}
          <circle className="n n1" cx="120" cy="90"  r="4" />
          <circle className="n n2" cx="260" cy="150" r="5" />
          <circle className="n n3" cx="410" cy="110" r="4" />
          <circle className="n n4" cx="420" cy="260" r="4" />
          <circle className="n n5" cx="170" cy="280" r="4" />
        </svg>
        <div className="heroInner split">
          {/* LEFT(텍스트 블록) */}
          <div className="heroRight">
            <h1 className="title brandTitle">
              <span className="brandK">K</span>or
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
