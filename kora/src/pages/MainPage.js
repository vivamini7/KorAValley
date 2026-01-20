import React from "react";
import "./MainPage.css";
import image15 from "../images/image15.png";
import image16 from "../images/image16.png";
import image17 from "../images/image17.png";
import image19 from "../images/image19.png";
import image20 from "../images/image20.png";
import image21 from "../images/image21.png";
import image22 from "../images/image22.png";
import image23 from "../images/image23.png";
import image24 from "../images/image24.png";
import image25 from "../images/image25.png";
import { Link } from "react-router-dom";
import logo from "../images/logo.png";




export default function MainPage() {
  // 아이콘 이미지는 나중에 너가 원하는 걸로 src만 갈아끼우면 됨
  // 지금은 placeholder로 "https://picsum.photos" 사용
  const bgIcons = [
    { src: image15, className: "icon icon-1" },
    { src: image16, className: "icon icon-2" },
    { src: image17, className: "icon icon-3" },
    { src: image19, className: "icon icon-4" },
    { src: image20, className: "icon icon-5" },
    { src: image21, className: "icon icon-6" },
    { src: image22, className: "icon icon-7" },
    { src: image23, className: "icon icon-8" },
    { src: image24, className: "icon icon-9" },
    { src: image25, className: "icon icon-10" },
  ];

  return (
    <div className="mainpage">
      {/* Background */}
      <div className="bg" />

      {/* Soft glow */}
      <div className="glow" />

      {/* Floating icons */}
      <div className="iconsLayer" aria-hidden="true">
        {bgIcons.map((it, idx) => (
          <img key={idx} className={it.className} src={it.src} alt="" />
        ))}
      </div>

      {/* Top Nav */}
      <header className="topbar">
        <div className="brand">
          <img
            src={logo}
            alt="YOUR APP logo"
            className="logoImg"
          />
        </div>


        <nav className="nav">
          <Link className="navItem active" to="/">Main</Link>
          <Link className="navItem" to="/members">Members</Link>
          <Link className="navItem" to="/plans">Plans</Link>
          <Link className="navItem" to="/insights">Insights</Link>
        </nav>
      </header>

      {/* Hero */}
      <main className="hero">
        <h1 className="title">
          아기맹수
          <br />
          welcome
        </h1>

        <p className="subtitle">
          조예찬씨 배고파요.
          
        </p>
      </main>
    </div>
  );
}
