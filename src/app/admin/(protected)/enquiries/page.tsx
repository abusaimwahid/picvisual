import { updateEnquiryStatus } from "@/app/admin/actions";
import { EmptyState, PageHeader, StatusBadge } from "@/components/admin/AdminPrimitives";
import { hasDatabaseUrl, prisma } from "@/lib/db/client";

export default async function EnquiriesAdminPage() {
  if (!hasDatabaseUrl()) return <section className="admin-content"><PageHeader eyebrow="INBOX" title="Enquiries" description="Contact records are available only after the CMS database is configured." /><EmptyState title="Database not configured" description="No enquiries can be read without an approved database connection." /></section>;
  const enquiries = await prisma.contactSubmission.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
  return <section className="admin-content"><PageHeader eyebrow="INBOX" title="Enquiries" description="Sensitive contact details are only rendered inside the protected admin area." /><div className="admin-card">{enquiries.length ? <div className="admin-enquiries">{enquiries.map((item) => <article key={item.id}><div><div className="admin-record-title"><strong>{item.name}</strong><StatusBadge value={item.status} /></div><span>{item.email}{item.company ? ` · ${item.company}` : ""}</span><p>{item.message || "No message supplied."}</p><small>{item.createdAt.toLocaleString()}</small></div><form action={updateEnquiryStatus}><input type="hidden" name="id" value={item.id} /><select name="status" defaultValue={item.status}><option value="NEW">New</option><option value="IN_PROGRESS">In progress</option><option value="REPLIED">Replied</option><option value="CLOSED">Closed</option></select><button type="submit">Update</button></form></article>)}</div> : <EmptyState title="No enquiries yet" description="New website submissions will appear here." />}</div></section>;
}
