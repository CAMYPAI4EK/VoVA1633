import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App.tsx";

declare global {
  interface Window {
    __platskartBooted?: boolean;
    __platskartError?: string | null;
  }
}

ReactDOM.createRoot(document.getElementById("root")!).render(<App />);
// игра смонтирована — сторожевой таймер можно не слушать
window.__platskartBooted = true;
