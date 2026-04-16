import React, { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import SplashScreen from "./pages/SplashScreen"; // 경로 맞춰줘!
import MainPage from "./pages/MainPage";
import MembersPage from "./pages/MembersPage";
import PlansPage from "./pages/PlansPage";
import NetworkingPage from "./pages/NetworkingPage";

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainPage />} />

        <Route path="/members" element={<Navigate to="/members/all" replace />} />
        <Route path="/members/:gen" element={<MembersPage />} />

        <Route path="/plans" element={<PlansPage />} />
        <Route path="/networking" element={<NetworkingPage />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
