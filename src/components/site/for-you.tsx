import Link from "next/link";
import { Sparkles, Calendar, Ticket } from "lucide-react";
import { auth } from "@/auth";
import { getForYou } from "@/server/recommendations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

export async function ForYou() {
  const session = await auth();
  const userId = session?.user?.id ?? null;
  const data = await getForYou(userId).catch(() => null);
  if (!data || (data.recommendedBands.length === 0 && data.upcomingShows.length === 0)) {
    return null;
  }

  const personalised = !!userId && data.followedBandIds.length > 0;

  return (
    <section className="container py-16 border-t border-border/60">
      <div className="flex items-end justify-between mb-8">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-primary mb-2 flex items-center gap-1.5">
            <Sparkles className="h-3 w-3" /> {personalised ? "For you" : "Editor's picks"}
          </p>
          <h2 className="font-display text-3xl">
            {personalised
              ? "Based on what you follow."
              : "While you decide what to follow."}
          </h2>
        </div>
        {!personalised && (
          <Link
            href="/auth/signin"
            className="hidden sm:inline-flex text-xs uppercase tracking-widest text-muted-foreground hover:text-primary"
          >
            Personalise →
          </Link>
        )}
      </div>

      {data.recommendedBands.length > 0 && (
        <div className="mb-12">
          <h3 className="font-display text-xl mb-4">Bands</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {data.recommendedBands.slice(0, 8).map((b) => (
              <Link key={b.id} href={`/bands/${b.slug}`} className="group">
                <Card className="hover:border-primary/60 transition-colors h-full">
                  <CardHeader>
                    <CardTitle className="text-lg group-hover:text-primary transition-colors">
                      {b.name}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground font-mono">
                      [{b.countryCode ?? "—"}]
                      {b.formedYear ? ` · ${b.formedYear}` : ""}
                    </p>
                  </CardHeader>
                  <CardContent>
                    {b.reasons.length > 0 ? (
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                        {b.reasons.slice(0, 3).join(" · ")}
                      </p>
                    ) : (
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                        recently reviewed
                      </p>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {data.upcomingShows.length > 0 && (
        <div>
          <h3 className="font-display text-xl mb-4 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" /> Upcoming shows
          </h3>
          <div className="space-y-2">
            {data.upcomingShows.map((s) => (
              <Link key={s.id} href={`/concerts/${s.slug}`} className="block">
                <Card className="hover:border-primary/60 transition-colors">
                  <CardContent className="py-3 flex justify-between items-baseline gap-4">
                    <div>
                      <p className="font-medium">{s.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(s.date)} · {s.venue.name}, {s.venue.city}
                      </p>
                    </div>
                    <Badge variant="ghost">
                      <Ticket className="h-3 w-3 mr-1" /> details
                    </Badge>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
