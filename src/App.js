import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import MainPage from "./pages/MainPage";
import MembersPage from "./pages/MembersPage";
import PlansPage from "./pages/PlansPage";
import InsightsPage from "./pages/InsightsPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainPage />} />

        {/* gen 파라미터 없으면 founding으로 */}
        <Route path="/members" element={<Navigate to="/members/all" replace />} />
        <Route path="/members/:gen" element={<MembersPage />} />

        <Route path="/plans" element={<PlansPage />} />
        <Route path="/insights" element={<InsightsPage />} />

        {/* 나머지 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
