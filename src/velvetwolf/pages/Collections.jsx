// The old "All collections" page. The shop lists every collection along its
// top (and /shop/<collection> opens one), so this address now leads there.
import { redirect } from "react-router";

export function loader() {
  return redirect("/shop", 301);
}

export default function Collections() {
  return null;
}
