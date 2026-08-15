import type { XmlNode } from './types';
import { getAttr } from './xml';

export type ResourceKind =
	| 'style'
	| 'color'
	| 'brush'
	| 'thickness'
	| 'cornerRadius'
	| 'double'
	| 'fontFamily'
	| 'alias'
	| 'other';

export interface ResourceEntry {
	kind: ResourceKind;
	key: string;
	node: XmlNode;
	aliasOf?: string;
}

export class ResourceRegistry {
	private readonly entries = new Map<string, ResourceEntry>();
	private readonly implicitStyles = new Map<string, XmlNode>();

	set(entry: ResourceEntry): void {
		this.entries.set(entry.key, entry);
	}

	setImplicitStyle(targetType: string, node: XmlNode): void {
		this.implicitStyles.set(targetType.toLowerCase(), node);
	}

	merge(other: ResourceRegistry): void {
		for (const [key, entry] of other.entries) {
			this.entries.set(key, entry);
		}
		for (const [type, node] of other.implicitStyles) {
			this.implicitStyles.set(type, node);
		}
	}

	get(key: string): ResourceEntry | undefined {
		return this.entries.get(key);
	}

	getStyle(key: string): XmlNode | undefined {
		const entry = this.entries.get(key);
		return entry?.kind === 'style' ? entry.node : undefined;
	}

	getImplicitStyle(targetType: string): XmlNode | undefined {
		return this.implicitStyles.get(targetType.toLowerCase());
	}
}

function localTypeName(targetType: string): string {
	const trimmed = targetType.trim();
	const colon = trimmed.lastIndexOf(':');
	return (colon >= 0 ? trimmed.slice(colon + 1) : trimmed).toLowerCase();
}

function kindForTag(localName: string): ResourceKind | undefined {
	switch (localName) {
		case 'style':
			return 'style';
		case 'staticresource':
			return 'alias';
		case 'color':
			return 'color';
		case 'solidcolorbrush':
		case 'lineargradientbrush':
			return 'brush';
		case 'thickness':
			return 'thickness';
		case 'cornerradius':
			return 'cornerRadius';
		case 'double':
		case 'int32':
		case 'gridlength':
			return 'double';
		case 'fontfamily':
			return 'fontFamily';
		default:
			return 'other';
	}
}

function addResource(node: XmlNode, registry: ResourceRegistry): void {
	const key = getAttr(node, 'Key');
	const kind = kindForTag(node.localName) ?? 'other';

	if (kind === 'style') {
		const targetType = getAttr(node, 'TargetType');
		if (!key && targetType) {
			registry.setImplicitStyle(localTypeName(targetType), node);
			return;
		}
	}

	if (!key) {
		return;
	}

	if (kind === 'alias') {
		const aliasOf = getAttr(node, 'ResourceKey');
		if (!aliasOf) {
			return;
		}
		registry.set({ kind, key, node, aliasOf });
		return;
	}

	registry.set({ kind, key, node });
}

function isThemeDictionaries(name: string): boolean {
	return (
		name === 'resourcedictionary.themedictionaries' ||
		name.endsWith('.themedictionaries')
	);
}

function isMergedDictionaries(name: string): boolean {
	return (
		name === 'resourcedictionary.mergeddictionaries' ||
		name.endsWith('.mergeddictionaries')
	);
}

function isResourcesProperty(name: string): boolean {
	return name === 'application.resources' || name.endsWith('.resources');
}

/**
 * Walks Application / ResourceDictionary trees, indexing keyed resources.
 * Theme dictionaries: only `Default` is indexed. Merged `Source` paths are collected.
 */
export function indexResourceTree(
	nodes: XmlNode[],
	registry: ResourceRegistry,
	mergedSources: string[]
): void {
	for (const node of nodes) {
		const name = node.localName;

		if (name === 'application' || isResourcesProperty(name)) {
			indexResourceTree(node.children, registry, mergedSources);
			continue;
		}

		if (name === 'resourcedictionary') {
			indexResourceTree(node.children, registry, mergedSources);
			continue;
		}

		if (isThemeDictionaries(name)) {
			const def = node.children.find((child) => {
				if (child.localName !== 'resourcedictionary') {
					return false;
				}
				return (getAttr(child, 'Key') ?? '').toLowerCase() === 'default';
			});
			if (def) {
				indexResourceTree(def.children, registry, mergedSources);
			}
			continue;
		}

		if (isMergedDictionaries(name)) {
			for (const child of node.children) {
				const source = getAttr(child, 'Source');
				if (source) {
					mergedSources.push(source);
					continue;
				}
				if (child.localName === 'resourcedictionary') {
					indexResourceTree(child.children, registry, mergedSources);
				}
			}
			continue;
		}

		addResource(node, registry);
	}
}
