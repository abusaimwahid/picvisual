"use client";
import { useActionState, useState } from "react";
import { signIn, type LoginState } from "@/app/admin/actions";
const initialState: LoginState = {};
export function LoginForm() { const [email, setEmail] = useState(""); const [state, action, pending] = useActionState(signIn, initialState); return <form action={action} className="admin-login-form"><label>Work email<input name="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required /></label><label>Password<input name="password" type="password" autoComplete="current-password" required /></label>{state.error && <p role="alert" className="admin-error">{state.error}</p>}<button type="submit" disabled={pending}>{pending ? "Checking access…" : "Sign in"}</button></form>; }
