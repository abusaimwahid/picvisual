"use client";
import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { submitContactEnquiry } from "@/app/admin/actions";

export function ContactForm() {
  const [message, setMessage] = useState(""); const [pending, setPending] = useState(false); const [complete, setComplete] = useState(false); const inFlight = useRef(false); const startedAt = useRef(0); const requestId = useRef("");
  useEffect(() => { startedAt.current = Date.now(); requestId.current = crypto.randomUUID(); }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (inFlight.current || complete) return;
    inFlight.current = true; setPending(true); setMessage("");
    const form = new FormData(event.currentTarget); form.set("startedAt", String(startedAt.current)); form.set("requestId", requestId.current);
    try { const result = await submitContactEnquiry(form); setMessage(result.error ?? result.success ?? "Unable to submit the enquiry."); if (result.success) setComplete(true); }
    catch { setMessage("We could not send your enquiry. Please try again, or email info@picvisual.com."); }
    finally { inFlight.current = false; setPending(false); }
  }
  return <form className="contact-form" onSubmit={submit} aria-describedby={message ? "contact-status" : undefined}>
    <div className="form-row"><label>Name<input name="name" required minLength={2} maxLength={120} autoComplete="name" disabled={complete} /></label><label>Work email<input name="email" type="email" required maxLength={200} autoComplete="email" disabled={complete} /></label></div>
    <div className="form-row"><label>Company / brand<input name="company" maxLength={160} autoComplete="organization" disabled={complete} /></label><label>Project type<select name="projectType" defaultValue="" disabled={complete}><option value="">Select a project type</option><option>Image post-production</option><option>Video post-production</option><option>Creative production</option><option>Not sure yet</option></select></label></div>
    <div className="form-row"><label>Estimated volume<input name="estimatedVolume" maxLength={160} placeholder="e.g. a campaign, a collection" disabled={complete} /></label><label>Timeline<input name="timeline" maxLength={160} placeholder="When do you need it?" disabled={complete} /></label></div>
    <label>Project or file-transfer link <small>Optional · HTTPS link</small><input name="projectLink" type="url" maxLength={500} placeholder="https://" disabled={complete} /></label>
    <label>Tell us about the work<textarea name="message" required minLength={10} maxLength={4000} rows={5} placeholder="The visual brief, intended channels and anything useful to know." disabled={complete} /></label>
    <div className="contact-honeypot" aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
    <p className="contact-privacy">We use these details to respond to your enquiry. <Link href="/privacy">Privacy policy</Link></p>
    <button className="button button-light" type="submit" disabled={pending || complete}>{pending ? "Sending…" : complete ? "Enquiry received" : "Start the conversation"} <i>↗</i></button>
    {message && <p id="contact-status" className="form-status" role={complete ? "status" : "alert"}>{message}</p>}
  </form>;
}
