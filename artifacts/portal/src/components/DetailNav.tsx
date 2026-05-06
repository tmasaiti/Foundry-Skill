import { Link } from "wouter";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";

interface DetailNavProps {
  backHref: string;
  backLabel: string;
  prevHref?: string | null;
  nextHref?: string | null;
  prevLabel?: string;
  nextLabel?: string;
}

export function DetailNav({
  backHref,
  backLabel,
  prevHref,
  nextHref,
  prevLabel = "Previous",
  nextLabel = "Next",
}: DetailNavProps) {
  return (
    <div className="flex items-center justify-between mb-5 -mt-1">
      <Link href={backHref}>
        <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors group">
          <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
          {backLabel}
        </button>
      </Link>

      <div className="flex items-center gap-1">
        {prevHref ? (
          <Link href={prevHref}>
            <button className="flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors">
              <ChevronLeft className="h-3.5 w-3.5" />
              {prevLabel}
            </button>
          </Link>
        ) : (
          <button
            disabled
            className="flex items-center gap-1 rounded-md border border-border/40 px-2.5 py-1.5 text-xs font-medium text-muted-foreground/40 cursor-not-allowed"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            {prevLabel}
          </button>
        )}

        {nextHref ? (
          <Link href={nextHref}>
            <button className="flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors">
              {nextLabel}
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </Link>
        ) : (
          <button
            disabled
            className="flex items-center gap-1 rounded-md border border-border/40 px-2.5 py-1.5 text-xs font-medium text-muted-foreground/40 cursor-not-allowed"
          >
            {nextLabel}
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
