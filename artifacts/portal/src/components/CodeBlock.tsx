import { CopyButton } from "./CopyButton";
import { cn } from "@/lib/utils";

interface Props {
  code: string;
  language?: string;
  title?: string;
  className?: string;
}

export function CodeBlock({ code, language = "bash", title, className }: Props) {
  return (
    <div className={cn("rounded-lg border border-border overflow-hidden", className)}>
      {title && (
        <div className="flex items-center justify-between border-b border-border bg-muted/50 px-4 py-2">
          <span className="text-xs font-medium text-muted-foreground">{title}</span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{language}</span>
            <CopyButton text={code} />
          </div>
        </div>
      )}
      {!title && (
        <div className="absolute top-3 right-3">
          <CopyButton text={code} />
        </div>
      )}
      <pre className={cn("relative overflow-x-auto bg-[#0f172a] p-4 text-sm text-slate-300 font-mono leading-relaxed", !title && "relative")}>
        {!title && <CopyButton text={code} className="absolute top-3 right-3 text-slate-400 hover:text-slate-200 hover:bg-slate-700" />}
        <code>{code}</code>
      </pre>
    </div>
  );
}
