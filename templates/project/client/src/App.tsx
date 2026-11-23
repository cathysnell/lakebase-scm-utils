import { NavLink, Routes, Route } from "react-router-dom";
import { HomePage } from "./pages/HomePage";
import { AboutPage } from "./pages/AboutPage";
import { MadeWithConsort } from "./components/MadeWithConsort";

// Route-level composition lives here. Pages compose components and use hooks
// for data; components and hooks never wire routes themselves. EVERY feature
// page MUST be (a) added to <Routes> below and (b) reachable from a nav
// affordance (the navbar links) , an unrouted page is dead to the user, which
// the kit's UX gate (consort-ux-clean) flags. Model new pages on the
// AboutPage example: routed here + linked in the navbar + styled via global.css.
export function App() {
  return (
    // App shell: a full-height flex column so the kit's "Made with Consort" footer
    // (margin-top: auto) pins to the viewport bottom on short pages and trails the
    // content on tall ones. Inline + token-free — this structural layout must survive
    // both theme.css regeneration (apply-design-theme) and global.css authoring (UX).
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <nav className="navbar">
        <span className="navbar__brand">
          <img className="navbar__icon" src="/favicon.svg" alt="" />
          {{PROJECT_NAME}}
        </span>
        <span className="navbar__links">
          <NavLink
            to="/"
            end
            className={({ isActive }) => `navbar__link${isActive ? " navbar__link--active" : ""}`}
          >
            Home
          </NavLink>
          <NavLink
            to="/about"
            className={({ isActive }) => `navbar__link${isActive ? " navbar__link--active" : ""}`}
          >
            About
          </NavLink>
        </span>
      </nav>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/about" element={<AboutPage />} />
      </Routes>
      <MadeWithConsort />
    </div>
  );
}
