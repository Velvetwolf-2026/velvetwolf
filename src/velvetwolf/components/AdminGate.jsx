import { useContext, useEffect, Suspense, lazy } from "react";
import { useLocation, useNavigate } from "react-router";
import { AppContext } from "../pages/AppContext";
import Icon from "./Icon";

const AdminLayout = lazy(() => import("../admin/AdminLayout"));

export default function AdminGate() {
  const { user, showToast } = useContext(AppContext);
  const location = useLocation();
  const navigate = useNavigate();
  const canAccessAdmin = Boolean(user?.isAdmin);

  useEffect(() => {
    if (location.pathname.startsWith("/admin") && !canAccessAdmin) {
      if (!user) {
        navigate("/login");
        showToast("Please sign in with an admin account.", "info");
      } else {
        navigate("/account");
        showToast("Admin access required.", "error");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, user, canAccessAdmin]);

  // The redirect above runs via the effect on mount (client-only, since admin
  // status isn't known until the session check resolves) rather than a
  // render-time <Navigate>, which React Router's SSR pass disallows.
  if (!canAccessAdmin) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--obsidian)" }} />
    );
  }

  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", background: "var(--obsidian)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: 4, color: "var(--gold)" }}>LOADING ADMIN...</div>
      </div>
    }>
      <AdminLayout Icon={Icon} />
    </Suspense>
  );
}
