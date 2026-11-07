import type { SharedCredentials } from "@/types/share";
import { formatDate } from "./defaults";

export function shareToMarkdown(data: SharedCredentials): string {
  return `# Dearplume • ${data.title.replace(/[\r\n#]/g, " ")}\n\nA little note, just for you. 🌷\n\n## Open the note\n\n- **Protected link:** ${data.url}\n- **Password:** \`${data.password}\`\n- **Access salt:** \`${data.accessSalt}\`\n- **Expires (Philippine Time):** ${formatDate(data.expiresAt)}\n\n## How to open\n\n1. Open the link.\n2. Enter the password and access salt.\n3. Enjoy the ASCII picture and typed message.\n\n> **Keep this file private.** It contains everything needed to unlock the note until expiry. The file is not encrypted.\n`;
}
