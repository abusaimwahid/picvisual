import { deleteFaq, moveFaq, saveFaq } from "@/app/admin/actions";
import { EmptyState, PageHeader, StatusBadge } from "@/components/admin/AdminPrimitives";
import { ConfirmDeleteButton } from "@/components/admin/ConfirmDeleteButton";
import { hasDatabaseUrl, prisma } from "@/lib/db/client";

export default async function FaqAdminPage() {
  if (!hasDatabaseUrl()) return <section className="admin-content"><PageHeader eyebrow="CONTENT / FAQ" title="FAQ" description="The public FAQ remains safely file-backed until CMS data is available." /><EmptyState title="Database not configured" description="Set DATABASE_URL to edit the published FAQ." /></section>;
  const faq = await prisma.fAQ.findMany({ where: { pageKey: "home" }, orderBy: { order: "asc" } });
  return <section className="admin-content">
    <PageHeader eyebrow="CONTENT / FAQ" title="FAQ" description="A compact, ordered list of the questions available to the homepage." />
    <div className="admin-editor-grid admin-faq-workspace">
      <form action={saveFaq} className="admin-card admin-content-form"><div className="admin-editor-group-title"><span>NEW ENTRY</span><h2>Add a question</h2><p>Create it as visible or keep it hidden until the answer is ready.</p></div><label>Question<input name="question" required /></label><label>Answer<textarea name="answer" rows={7} required /></label><input name="enabled" type="hidden" value="false" /><label className="admin-switch"><input name="enabled" type="checkbox" value="true" defaultChecked /><span aria-hidden="true" /><b>Show on website</b></label><button type="submit">Save FAQ</button></form>
      <div className="admin-card admin-faq-list"><div className="admin-editor-group-title"><span>HOMEPAGE ORDER</span><h2>{faq.length} questions</h2><p>Expand a row to edit its answer or visibility.</p></div>{faq.length ? faq.map((item, index) => <details className="admin-faq-row" key={item.id}>
        <summary><span className="admin-drag-handle" aria-hidden="true">⠿</span><i>{String(index + 1).padStart(2, "0")}</i><strong>{item.question}</strong><StatusBadge value={item.enabled ? "ACTIVE" : "HIDDEN"} /><b aria-hidden="true">⌄</b></summary>
        <div className="admin-faq-row-body"><form action={saveFaq} className="admin-content-form"><input type="hidden" name="id" value={item.id} /><label>Question<input name="question" defaultValue={item.question} required /></label><label>Answer<textarea name="answer" rows={6} defaultValue={item.answer} required /></label><input name="enabled" type="hidden" value="false" /><label className="admin-switch"><input name="enabled" type="checkbox" value="true" defaultChecked={item.enabled} /><span aria-hidden="true" /><b>Show on website</b></label><button>Save changes</button></form><div className="admin-inline-actions"><form action={moveFaq}><input type="hidden" name="id" value={item.id} /><input type="hidden" name="direction" value="up" /><button disabled={index === 0}>Move up</button></form><form action={moveFaq}><input type="hidden" name="id" value={item.id} /><input type="hidden" name="direction" value="down" /><button disabled={index === faq.length - 1}>Move down</button></form><form action={deleteFaq}><input type="hidden" name="id" value={item.id} /><ConfirmDeleteButton label={item.question} /></form></div></div>
      </details>) : <EmptyState title="No FAQ records yet" description="Create an entry to begin." />}</div>
    </div>
  </section>;
}
