import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { createApi, readToken } from "./lib/api";
import "./styles.css";

const token = readToken();
createRoot(document.getElementById("root")!).render(
  <StrictMode><App api={createApi(token)} token={token} /></StrictMode>,
);
