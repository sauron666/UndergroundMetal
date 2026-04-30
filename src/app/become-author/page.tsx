import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ApplyForm } from "./apply-form";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Become an author" };

export default async function BecomeAuthorPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin?next=/become-author");

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: { authorApplication: true },
  });
  if (!user) redirect("/auth/signin");

  // Already an author or higher? Send them straight to the dashboard.
  if (user.role !== "READER") {
    return (
      <div className="container py-16 max-w-2xl">
        <h1 className="font-display text-3xl mb-3">
          You&apos;re already an author.
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          Your role: <Badge variant="blood">{user.role.toLowerCase()}</Badge>.
          Pitch a piece any time.
        </p>
        <Link
          href="/articles/new"
          className="inline-flex items-center gap-1 px-4 py-2 text-xs uppercase tracking-widest border border-border rounded-sm hover:border-primary"
        >
          Write something →
        </Link>
      </div>
    );
  }

  const app = user.authorApplication;

  return (
    <div className="container py-10 md:py-14 max-w-2xl">
      <p className="text-[10px] uppercase tracking-[0.3em] text-primary mb-2">
        ⛧ Editorial
      </p>
      <h1 className="font-display text-4xl md:text-5xl mb-3">
        Become an author.
      </h1>
      <p className="text-muted-foreground mb-8">
        Reviews, interviews, news, features, scene reports. Anyone can pitch,
        but to publish under your byline you need editor approval. Tell us
        what you want to cover and link to anything you&apos;ve written
        before — band Bandcamp pages, blog posts, zines, anything.
      </p>

      {app ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              Application status
              <Badge
                variant={
                  app.status === "APPROVED"
                    ? "blood"
                    : app.status === "REJECTED"
                    ? "ghost"
                    : "rust"
                }
              >
                {app.status.toLowerCase()}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="text-xs text-muted-foreground">
              Submitted {formatDate(app.createdAt)}
            </p>
            <p className="whitespace-pre-wrap">{app.pitch}</p>
            {app.samples.length > 0 && (
              <ul className="space-y-1 text-xs">
                {app.samples.map((s) => (
                  <li key={s}>
                    <a
                      href={s}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="text-primary hover:underline break-all"
                    >
                      {s}
                    </a>
                  </li>
                ))}
              </ul>
            )}
            {app.decisionNote && (
              <div className="border-l-2 border-primary/40 pl-3 mt-3">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
                  Editor&apos;s note
                </p>
                <p className="text-sm italic">{app.decisionNote}</p>
              </div>
            )}
            {app.status === "REJECTED" && (
              <ApplyForm reapply />
            )}
          </CardContent>
        </Card>
      ) : (
        <ApplyForm />
      )}
    </div>
  );
}
