// The old saved-items page now lives in the account (Account > Saved), with real restock alerts
// in place of the old checkboxes that never sent anything. Old links land there.
import { Navigate } from "react-router";

export function meta() {
  return [{ title: "Saved · VelvetWolf" }, { name: "robots", content: "noindex" }];
}

export default function WishlistRedirect() {
  return <Navigate to="/account?tab=saved" replace />;
}
