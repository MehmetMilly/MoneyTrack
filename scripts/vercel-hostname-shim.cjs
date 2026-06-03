const os = require("node:os");

const safeHostname = "CodexHost";

try {
  os.hostname = () => safeHostname;
} catch {
  // Ignore if the property is not writable in this runtime.
}

process.env.SENTRY_NAME = safeHostname;
