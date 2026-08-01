import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app/app.js";
import "./styles/index.css";

const container = document.querySelector("#root");

if (!container) {
  throw new Error("Admin root container is missing.");
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
