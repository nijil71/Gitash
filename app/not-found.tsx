import Link from "next/link";
import { GitashIcon } from "@/components/GitashIcon";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
      <GitashIcon size={48} />
      <div className="space-y-2">
        <p className="font-mono text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          404 — branch not found
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          This page doesn&apos;t exist
        </h1>
        <p className="mx-auto max-w-xs text-sm text-muted-foreground leading-relaxed">
          The page you&apos;re looking for was moved, deleted, or never merged.
        </p>
      </div>
      <Link
        href="/"
        className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
      >
        Back to Gitash
      </Link>
    </div>
  );
}
