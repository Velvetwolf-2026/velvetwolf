import { Navigate, redirect } from "react-router";

// Sign-in is passwordless (email code, phone OTP or Google), so there is no
// password to reset. Old reset links and bookmarks go to the sign-in page.
export function loader() {
  return redirect("/login");
}

export function ForgetPassword() {
  return <Navigate to="/login" replace />;
}

export default ForgetPassword;
