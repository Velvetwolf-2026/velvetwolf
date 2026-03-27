// AppContext.js
// Single source of truth for the React context.
// Import this in BOTH App.jsx AND Login.jsx / Signup.jsx / ForgetPassword.jsx
// so they all share the exact same context object reference.
//
// ─── USAGE ───────────────────────────────────────────────────────────────────
// In App.jsx:
//   import { AppContext } from './AppContext';          ← remove createContext() from App.jsx
//
// In Login.jsx / Signup.jsx / ForgetPassword.jsx:
//   import { AppContext } from './AppContext';          ← replaces the broken require() pattern
//
// ─────────────────────────────────────────────────────────────────────────────

import { createContext } from "react";

export const AppContext = createContext();
