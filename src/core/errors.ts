function formatMessage(
  domain: string,
  method: string | undefined,
  message: string,
): string {
  return `${domain}${method ? `#${method}` : ""}: ${message}`;
}

export class BlotterError extends Error {
  readonly domain: string;
  readonly method: string | undefined;

  constructor(domain: string, method: string | undefined, message: string) {
    super(formatMessage(domain, method, message));
    this.name = "BlotterError";
    this.domain = domain;
    this.method = method;
  }
}

export function logError(
  domain: string,
  method: string | undefined,
  message: string,
): void {
  console.error(formatMessage(domain, method, message));
}

export function logWarning(
  domain: string,
  method: string | undefined,
  message: string,
): void {
  console.warn(formatMessage(domain, method, message));
}
