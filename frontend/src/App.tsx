import { BrowserRouter, Routes, Route } from "react-router-dom";
import { TransQualityProvider } from "./context/TransQualityContext";
import { Board } from "./pages/Board";
import { SubmitPage } from "./pages/SubmitPage";
import { JobDetailPage } from "./pages/JobDetailPage";
import "./index.css";

function App() {
  return (
    <BrowserRouter>
      <TransQualityProvider>
        <Routes>
          <Route path="/" element={<Board />} />
          <Route path="/submit" element={<SubmitPage />} />
          <Route path="/job/:id" element={<JobDetailPage />} />
        </Routes>
      </TransQualityProvider>
    </BrowserRouter>
  );
}

export default App;