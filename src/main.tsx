import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App.tsx";

declare global {
  interface Window {
    __platskartBooted?: boolean;
  }
}

// Защита от двойного монтирования: скрипт может исполниться дважды,
// если сработает запасной загрузчик из index.html (fetch → blob).
if (!window.__platskartBooted) {
  window.__platskartBooted = true;
  ReactDOM.createRoot(document.getElementById("root")!).render(<App />);
}
