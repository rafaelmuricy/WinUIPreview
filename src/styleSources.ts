import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import {
	indexResourceTree,
	ResourceRegistry,
} from './parser/resourceRegistry';
import { parseXamlToNodes } from './parser/xml';

interface CachedFile {
	mtimeMs: number;
	own: ResourceRegistry;
	mergedSources: string[];
}

let genericCache:
	| { filePath: string; mtimeMs: number; registry: ResourceRegistry }
	| undefined;
const fileCache = new Map<string, CachedFile>();

function compareVersion(a: string, b: string): number {
	const pa = a.split('.').map((n) => Number.parseInt(n, 10) || 0);
	const pb = b.split('.').map((n) => Number.parseInt(n, 10) || 0);
	const len = Math.max(pa.length, pb.length);
	for (let i = 0; i < len; i++) {
		const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
		if (diff !== 0) {
			return diff;
		}
	}
	return 0;
}

async function findGenericXamlPath(): Promise<string | undefined> {
	const root = path.join(
		os.homedir(),
		'.nuget',
		'packages',
		'microsoft.windowsappsdk.winui'
	);
	if (!fsSync.existsSync(root)) {
		return undefined;
	}

	const versions = (await fs.readdir(root, { withFileTypes: true }))
		.filter((entry) => entry.isDirectory())
		.map((entry) => entry.name)
		.sort(compareVersion)
		.reverse();

	for (const version of versions) {
		const verDir = path.join(root, version);
		let entries: string[];
		try {
			entries = await fs.readdir(verDir, { recursive: true });
		} catch {
			continue;
		}

		const matches = entries
			.filter((entry) =>
				entry.replace(/\\/g, '/').toLowerCase().endsWith('/themes/generic.xaml')
			)
			.map((entry) => path.join(verDir, entry));

		const preferred = matches.find((filePath) =>
			filePath.toLowerCase().includes(`${path.sep}microsoft.winui${path.sep}`.toLowerCase())
		);
		if (preferred) {
			return preferred;
		}
		if (matches[0]) {
			return matches[0];
		}
	}

	return undefined;
}

async function loadGenericXaml(
	output: vscode.OutputChannel
): Promise<ResourceRegistry | undefined> {
	const filePath = await findGenericXamlPath();
	if (!filePath) {
		output.appendLine(
			'WinUI generic.xaml not found in NuGet cache (microsoft.windowsappsdk.winui).'
		);
		return undefined;
	}

	try {
		const stat = await fs.stat(filePath);
		if (
			genericCache &&
			genericCache.filePath === filePath &&
			genericCache.mtimeMs === stat.mtimeMs
		) {
			return genericCache.registry;
		}

		const text = await fs.readFile(filePath, 'utf8');
		const nodes = parseXamlToNodes(text);
		const registry = new ResourceRegistry();
		indexResourceTree(nodes, registry, []);
		genericCache = { filePath, mtimeMs: stat.mtimeMs, registry };
		return registry;
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		output.appendLine(`Failed to load WinUI generic.xaml: ${message}`);
		return undefined;
	}
}

function pathProximity(fromPath: string, toPath: string): number {
	const fromParts = fromPath.split(path.sep);
	const toParts = toPath.split(path.sep);
	let i = 0;
	while (
		i < fromParts.length &&
		i < toParts.length &&
		fromParts[i].toLowerCase() === toParts[i].toLowerCase()
	) {
		i++;
	}
	return i;
}

async function findNearestAppXaml(
	documentUri: vscode.Uri
): Promise<string | undefined> {
	const files = await vscode.workspace.findFiles(
		'**/App.xaml',
		'**/{node_modules,bin,obj,.git}/**'
	);
	if (files.length === 0) {
		return undefined;
	}

	if (documentUri.scheme !== 'file') {
		return files[0].fsPath;
	}

	const docPath = documentUri.fsPath;
	let best = files[0];
	let bestScore = pathProximity(docPath, best.fsPath);
	for (const file of files.slice(1)) {
		const score = pathProximity(docPath, file.fsPath);
		if (
			score > bestScore ||
			(score === bestScore && file.fsPath.length < best.fsPath.length)
		) {
			best = file;
			bestScore = score;
		}
	}
	return best.fsPath;
}

function stripMsAppx(source: string): string {
	return source
		.replace(/^ms-appx:\/\/\/?/i, '')
		.replace(/^ms-appx-web:\/\/\/?/i, '');
}

async function resolveMergedSource(
	source: string,
	fromDir: string
): Promise<string | undefined> {
	const trimmed = source.trim();
	if (!trimmed) {
		return undefined;
	}

	const relative = stripMsAppx(trimmed).replace(/\//g, path.sep);

	const local = path.resolve(fromDir, relative);
	if (fsSync.existsSync(local)) {
		return local;
	}

	const posix = stripMsAppx(trimmed).replace(/\\/g, '/');
	const matches = await vscode.workspace.findFiles(
		`**/${posix}`,
		'**/{node_modules,bin,obj,.git}/**'
	);
	return matches[0]?.fsPath;
}

async function loadResourceFile(
	filePath: string,
	output: vscode.OutputChannel,
	loading: Set<string>
): Promise<ResourceRegistry | undefined> {
	const resolved = path.resolve(filePath);
	if (loading.has(resolved)) {
		return undefined;
	}
	loading.add(resolved);

	try {
		const stat = await fs.stat(resolved);
		let cached = fileCache.get(resolved);
		if (!cached || cached.mtimeMs !== stat.mtimeMs) {
			const text = await fs.readFile(resolved, 'utf8');
			const nodes = parseXamlToNodes(text);
			const own = new ResourceRegistry();
			const mergedSources: string[] = [];
			indexResourceTree(nodes, own, mergedSources);
			cached = { mtimeMs: stat.mtimeMs, own, mergedSources };
			fileCache.set(resolved, cached);
		}

		const registry = new ResourceRegistry();
		for (const source of cached.mergedSources) {
			const abs = await resolveMergedSource(source, path.dirname(resolved));
			if (!abs) {
				continue;
			}
			const nested = await loadResourceFile(abs, output, loading);
			if (nested) {
				registry.merge(nested);
			}
		}
		registry.merge(cached.own);
		return registry;
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		output.appendLine(`Failed to load resource dictionary [${resolved}]: ${message}`);
		return undefined;
	}
}

export async function loadStyleRegistry(
	documentUri: vscode.Uri,
	output: vscode.OutputChannel
): Promise<ResourceRegistry> {
	const registry = new ResourceRegistry();

	const generic = await loadGenericXaml(output);
	if (generic) {
		registry.merge(generic);
	}

	const appXaml = await findNearestAppXaml(documentUri);
	if (appXaml) {
		const appRegistry = await loadResourceFile(appXaml, output, new Set());
		if (appRegistry) {
			registry.merge(appRegistry);
		}
	}

	return registry;
}
