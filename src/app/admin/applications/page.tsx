import Link from "next/link";
import { db } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ApplicationActions } from "./actions";
import { formatDate, formatDistance } from "@/lib/utils";

export default async function AdminApplications() {
  const apps = await db.authorApplication.findMany({
    where: { status: "PENDING" },
    include: { user: { select: { id: true, username: true, name: true, email: true } } },
    orderBy: { createdAt: "asc" },
  }).catch(() => []);

  return (
    <div>
      <h1 className="font-display text-3xl mb-6">
        Author applications ({apps.length})
      </h1>

      {apps.length === 0 ? (
        <p className="text-center text-muted-foreground italic py-12">
          No pending applications.
        </p>
      ) : (
        <div className="space-y-4">
          {apps.map((a) => (
            <Card key={a.id}>
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <Link
                      href={
                        a.user.username ? `/u/${a.user.username}` : "#"
                      }
                      className="font-medium hover:text-primary"
                    >
                      {a.user.username ?? a.user.name ?? a.user.email}
                    </Link>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDate(a.createdAt)} ·{" "}
                      {formatDistance(a.createdAt)}
                    </p>
                  </div>
                  <Badge variant="rust">{a.status.toLowerCase()}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm whitespace-pre-wrap">{a.pitch}</p>
                {a.samples.length > 0 && (
                  <ul className="text-xs space-y-1">
                    {a.samples.map((s) => (
                      <li key={s}>
                        <a
                          href={s}
                          target="_blank"
                          rel="noopener noreferrer nofollow"
                          className="text-primary break-all hover:underline"
                        >
                          {s}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
                <ApplicationActions applicationId={a.id} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
