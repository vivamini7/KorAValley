import React, { useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import MainPage from "./pages/MainPage";
import MembersPage from "./pages/MembersPage";
import PlansPage from "./pages/PlansPage";
import InsightsPage from "./pages/InsightsPage";
import SplashScreen from "./pages/SplashScreen"; // 추가

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  return (
    <>
      {showSplash ? (
        <SplashScreen onFinish={() => setShowSplash(false)} />
      ) : (
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<MainPage />} />
            <Route path="/members" element={<MembersPage />} />
            <Route path="/plans" element={<PlansPage />} />
            <Route path="/insights" element={<InsightsPage />} />
          </Routes>
        </BrowserRouter>
      )}
    </>
  );
}