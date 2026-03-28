import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { execFile } from "node:child_process";

const DANGEROUS_PATTERNS = [
	/\brm\s+(-[a-zA-Z]*f[a-zA-Z]*\s+|.*-rf\b|.*--force\b)/,
	/\bsudo\b/,
	/\b(DROP|TRUNCATE|DELETE\s+FROM)\b/i,
	/\bchmod\s+777\b/,
	/\bmkfs\b/,
	/\bdd\s+if=/,
	/>\s*\/dev\/sd[a-z]/,
];

const PROTECTED_PATHS = [".env", ".git/", "node_modules/", ".pi/", "id_rsa", ".ssh/"];

function windowsToastScript(title: string, body: string): string {
	const type = "Windows.UI.Notifications";
	const mgr = `[${type}.ToastNotificationManager, ${type}, ContentType = WindowsRuntime]`;
	const template = `[${type}.ToastTemplateType]::ToastText01`;
	const toast = `[${type}.ToastNotification]::new($xml)`;
	return [
		`${mgr} > $null`,
		`$xml = [${type}.ToastNotificationManager]::GetTemplateContent(${template})`,
		`$xml.GetElementsByTagName('text')[0].AppendChild($xml.CreateTextNode('${body.replace(/'/g, "''")}')) > $null`,
		`[${type}.ToastNotificationManager]::CreateToastNotifier('${title.replace(/'/g, "''")}').Show(${toast})`,
	].join("; ");
}

function notify(title: string, body: string): void {
	if (process.env.WT_SESSION) {
		execFile("powershell.exe", ["-NoProfile", "-Command", windowsToastScript(title, body)], () => {});
		return;
	}
	if (process.env.KITTY_WINDOW_ID) {
		process.stdout.write(`\x1b]99;i=1:d=0;${title}\x1b\\`);
		process.stdout.write(`\x1b]99;i=1:p=body;${body}\x1b\\`);
		return;
	}
	process.stdout.write(`\x1b]777;notify;${title};${body}\x07`);
}

export default function (pi: ExtensionAPI) {
	pi.on("tool_call", async (event, ctx) => {
		if (event.toolName === "bash") {
			const command = (event.input as { command?: string }).command ?? "";
			const isDangerous = DANGEROUS_PATTERNS.some((pattern) => pattern.test(command));
			if (!isDangerous) return;

			notify("Pi approval needed", `Dangerous command waiting: ${command.slice(0, 180)}`);

			if (!ctx.hasUI) {
				return { block: true, reason: "Dangerous command blocked (no UI for confirmation)" };
			}

			const ok = await ctx.ui.confirm("⚠️ Dangerous Command", `Execute:\n${command}`);
			if (!ok) {
				return { block: true, reason: "Blocked by user" };
			}
			return;
		}

		if (event.toolName === "write" || event.toolName === "edit") {
			const path = (event.input as { path?: string }).path ?? "";
			const protectedPath = PROTECTED_PATHS.find((candidate) => path.includes(candidate));
			if (!protectedPath) return;

			notify("Pi approval needed", `Protected path write waiting: ${path}`);

			if (!ctx.hasUI) {
				return { block: true, reason: `Protected path blocked: ${protectedPath}` };
			}

			const ok = await ctx.ui.confirm("🛡️ Protected Path", `Allow write to:\n${path}`);
			if (!ok) {
				return { block: true, reason: `Protected path blocked: ${protectedPath}` };
			}
		}
	});
}
