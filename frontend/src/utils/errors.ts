export function safeErrorMessage(e: unknown): string {
  if (typeof e === 'string') {
    return e;
  }
  if (e instanceof Error) {
    return e.message;
  }
  return 'An unknown error occurred';
}
