export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <section className="w-full max-w-md rounded-3xl border border-border bg-surface p-8 shadow-sm">
        <div className="mb-6 inline-flex rounded-full bg-primary px-3 py-1 text-xs font-semibold tracking-[0.2em] text-white uppercase">
          Internal access only
        </div>

        <div className="space-y-3">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Audit Trainer
          </h1>
          <p className="text-base leading-7 text-muted">
            Store audit and coaching made simple.
          </p>
        </div>

        <div className="mt-8 rounded-2xl border border-border bg-background px-4 py-3 text-sm text-muted">
          Project setup completed. Next step: authentication.
        </div>
      </section>
    </main>
  );
}
