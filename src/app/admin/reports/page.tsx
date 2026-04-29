import { db } from "@/lib/db";
import { ReportsList } from "./list";

export default async function AdminReports() {
  const reports = await db.report.findMany({
    where: { status: "OPEN" },
    include: { reporter: { select: { username: true, name: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div>
      <h1 className="font-display text-3xl mb-6">Open reports</h1>
      <ReportsList
        initial={reports.map((r) => ({
          id: r.id,
          target: r.target,
          targetId: r.targetId,
          reason: r.reason,
          createdAt: r.createdAt.toISOString(),
          reporter:
            r.reporter.username ?? r.reporter.name ?? "anon",
        }))}
      />
    </div>
  );
}
