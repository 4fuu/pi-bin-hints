/**
 * pi-bin-hints — one-shot detection of modern Unix-tool replacement binaries,
 * injected as a single stable line into the system prompt.
 *
 * Why: models default to grep/find/sed/cat even when faster modern
 * replacements (rg, fd, sd, bat, ...) are installed. Telling the model
 * exactly which of these binaries exist steers it to the better tool.
 *
 * Stability: detection runs exactly once per session (session_start) by
 * scanning PATH directly — no subprocess spawning, a few milliseconds.
 * The resulting line is cached and appended verbatim to every turn's system
 * prompt via before_agent_start, so the rendered prompt is byte-identical
 * across turns (prompt-cache friendly). No per-turn probing, no prompt churn.
 *
 * Cross-platform: Windows, macOS and Linux. PATHEXT-aware on Windows;
 * executable-bit check elsewhere. Nothing is injected when no candidate
 * binary is found.
 */

import { readdirSync, statSync } from "node:fs";
import { delimiter, join } from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

/**
 * Binaries to detect, in display order. Includes Debian/Ubuntu renames
 * (fdfind/batcat) alongside the canonical names.
 */
const CANDIDATES = [
	"rg", // grep
	"fd",
	"fdfind", // find (fd on Debian/Ubuntu)
	"sd", // sed
	"bat",
	"batcat", // cat (bat on Debian/Ubuntu)
	"eza",
	"exa",
	"lsd", // ls
	"delta", // diff
	"jq",
	"yq", // JSON/YAML
	"fzf",
	"xh", // curl/httpie
	"hyperfine", // time
	"dust", // du
	"duf", // df
	"procs", // ps
	"btm", // top
	"zoxide", // cd
	"doggo", // dig
	"gping", // ping
	"hexyl", // xxd
	"choose", // cut/awk
	"sad", // sed
	"ast-grep", // structural grep
	"broot", // tree
	"tokei", // cloc
	"watchexec", // watch
	"glow", // markdown viewer
] as const;

/** Scan PATH once; return detected candidate names in CANDIDATES order. */
function detectBinaries(): string[] {
	const isWindows = process.platform === "win32";
	const exts = isWindows
		? (process.env.PATHEXT ?? ".COM;.EXE;.BAT;.CMD").toLowerCase().split(";")
		: null;
	const wanted = new Set<string>(CANDIDATES);
	const found = new Set<string>();

	for (const dir of (process.env.PATH ?? "").split(delimiter)) {
		if (!dir) continue;
		let entries: string[];
		try {
			entries = readdirSync(dir);
		} catch {
			continue; // missing or unreadable PATH entry
		}
		for (const entry of entries) {
			let base = entry;
			if (exts) {
				const dot = entry.lastIndexOf(".");
				if (dot <= 0 || !exts.includes(entry.slice(dot).toLowerCase())) continue;
				base = entry.slice(0, dot);
			}
			const name = base.toLowerCase();
			if (!wanted.has(name) || found.has(name)) continue;
			if (!isWindows) {
				// PATH entries are usually all-executable, but verify cheaply
				// (only candidate matches reach this stat).
				try {
					const st = statSync(join(dir, entry));
					if (!st.isFile() || (st.mode & 0o111) === 0) continue;
				} catch {
					continue;
				}
			}
			found.add(name);
		}
	}

	return CANDIDATES.filter((name) => found.has(name));
}

export default function (pi: ExtensionAPI) {
	/** Cached prompt suffix; computed once, constant for the whole session. */
	let line: string | undefined;

	pi.on("session_start", async () => {
		const bins = detectBinaries();
		line = bins.length > 0 ? `\n\nThese faster cross-platform tools are available: ${bins.map((b) => `\`${b}\``).join(" / ")}. Prefer them over their classical Unix equivalents.` : undefined;
	});

	// Appends the same constant suffix every turn. Because the base prompt and
	// the suffix are both stable, the rendered system prompt never changes
	// within a session.
	pi.on("before_agent_start", async (event) => {
		if (!line) return;
		return { systemPrompt: event.systemPrompt + line };
	});
}
