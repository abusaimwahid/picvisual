"use client";

import { FormEvent, useState } from "react";
import { submitContactEnquiry } from "@/app/admin/actions";

export function ContactForm() {
  const [message, setMessage] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    form.set("projectType", String(form.get("type") ?? "")); form.set("estimatedVolume", String(form.get("volume") ?? ""));
    const result = await submitContactEnquiry(form); setMessage(result.error ?? result.success ?? "Unable to submit the enquiry.");
    if (result.mailto) window.location.href = result.mailto;
  }
  return <form className="contact-form" onSubmit={submit}><div className="form-row"><label>Name<input name="name" required autoComplete="name" /></label><label>Work Email<input name="email" type="email" required autoComplete="email" /></label></div><div className="form-row"><label>Company / Brand<input name="company" autoComplete="organization" /></label><label>Project Type<select name="type" defaultValue=""><option value="" disabled>Select a project type</option><option>Image post-production</option><option>Motion post-production</option><option>Creative production</option><option>Not sure yet</option></select></label></div><div className="form-row"><label>Estimated Volume<input name="volume" placeholder="e.g. a campaign, a collection" /></label><label>Timeline<input name="timeline" placeholder="When do you need it?" /></label></div><label>Tell us about the work<textarea name="message" rows={5} placeholder="The visual brief, intended channels and anything useful to know." /></label><button className="button button-light" type="submit">Start the conversation <i>↗</i></button>{message && <p className="form-status" role="status">{message}</p>}</form>;
}
