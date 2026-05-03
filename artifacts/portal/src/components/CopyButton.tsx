import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  text: string;
  className?: string;
  size?: "sm" | "md";
}

export function CopyButton({ text, className, size = "sm" }: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const s = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";

  return (
    <button
      onClick={handleCopy}
      title="Copy to clipboard"
      className={cn(
        "inline-flex items-center justify-center rounded p-1 text-muted-foreground transition-colors hover:text-foreground hover:bg-muted",
        className
      )}
    >
      {copied ? <Check className={cn(s, "text-emerald-600")} /> : <Copy className={s} />}
    </button>
  );
}
