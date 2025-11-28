import { GifGenerator } from "@/components/gif-generator";

export default function Home() {
  return (
    <div className="relative flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-center px-4 py-16">
      {/* Background gradient */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 left-1/2 h-[800px] w-[800px] -translate-x-1/2 rounded-full bg-linear-to-br from-cyan-500/12 via-teal-500/6 to-transparent blur-3xl" />
        <div className="absolute -bottom-1/4 right-0 h-[600px] w-[600px] rounded-full bg-linear-to-tl from-emerald-500/8 via-cyan-500/4 to-transparent blur-3xl" />
      </div>

      <main className="relative flex w-full max-w-xl flex-col items-center gap-8">
        <div className="space-y-4 text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            <span className="bg-linear-to-r from-cyan-400 via-teal-500 to-emerald-500 bg-clip-text text-transparent">
              ReactiGIF
            </span>
          </h1>
          <p className="text-lg text-muted-foreground">
            Get 3 perfect reaction GIFs from different perspectives
          </p>
          <p className="text-sm text-muted-foreground/70">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-primary">
              10 free generations per day
            </span>
          </p>
        </div>

        <GifGenerator />

        <footer className="pt-8 text-center text-xs text-muted-foreground/60">
          Powered by AI & Giphy
        </footer>
      </main>
    </div>
  );
}
