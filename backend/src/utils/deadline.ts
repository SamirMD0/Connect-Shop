export class DeadlineError extends Error {
  constructor() { super('Operation deadline exceeded'); this.name = 'DeadlineError'; }
}

export async function withDeadline<T>(load: () => Promise<T>, timeoutMs: number, onTimeout?: () => void): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      try { onTimeout?.(); } catch { /* Cancellation is best effort. */ }
      reject(new DeadlineError());
    }, timeoutMs);
  });
  try { return await Promise.race([load(), deadline]); }
  finally { clearTimeout(timer); }
}
