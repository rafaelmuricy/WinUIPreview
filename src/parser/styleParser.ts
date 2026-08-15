import { mapPropertyToCss, type MappedCss } from './cssMapping';
import type { ResourceRegistry } from './resourceRegistry';
import type { RenderContext, XmlNode } from './types';
import { getAttr } from './xml';

export interface MarkupExtension {
	type: 'StaticResource' | 'ThemeResource';
	key: string;
}

interface StyleSetter {
	property: string;
	value: string;
}

const MARKUP_EXTENSION_RE =
	/^\s*\{\s*(StaticResource|ThemeResource)\s+(?:ResourceKey\s*=\s*)?([A-Za-z_][\w.]*)\s*\}\s*$/i;

/** Common WinUI text styles used when generic.xaml is not available. */
const WELL_KNOWN_TEXT_STYLES: Record<string, Record<string, string>> = {
	CaptionTextBlockStyle: {
		'font-size': '12px',
		'line-height': '16px',
	},
	BodyTextBlockStyle: {
		'font-size': '14px',
		'line-height': '20px',
	},
	BodyStrongTextBlockStyle: {
		'font-size': '14px',
		'line-height': '20px',
		'font-weight': '600',
	},
	SubtitleTextBlockStyle: {
		'font-size': '20px',
		'line-height': '28px',
	},
	TitleTextBlockStyle: {
		'font-size': '28px',
		'line-height': '36px',
	},
};

/** Windows system colors that are not defined in generic.xaml. */
const SYSTEM_COLORS: Record<string, string> = {
	SystemAccentColor: '#0078D4',
	SystemAccentColorLight1: '#76B9ED',
	SystemAccentColorLight2: '#60CDFF',
	SystemAccentColorLight3: '#99EBFF',
	SystemAccentColorDark1: '#005A9E',
	SystemAccentColorDark2: '#004A80',
	SystemAccentColorDark3: '#003966',
	SystemColorWindowColor: '#FFFFFF',
	SystemColorWindowTextColor: '#000000',
};

function mapFontFamilyValue(value: string): string {
	if (/^XamlAutoFontFamily$/i.test(value.trim())) {
		return '"Segoe UI", sans-serif';
	}
	return value;
}

export function parseMarkupExtension(
	value: string
): MarkupExtension | undefined {
	const match = MARKUP_EXTENSION_RE.exec(value);
	if (!match) {
		return undefined;
	}
	const type =
		match[1].toLowerCase() === 'themeresource'
			? 'ThemeResource'
			: 'StaticResource';
	return { type, key: match[2] };
}

function toCssColor(value: string): string {
	const v = value.trim();
	const argb = /^#([0-9A-Fa-f]{8})$/.exec(v);
	if (argb) {
		const hex = argb[1];
		const alpha = parseInt(hex.slice(0, 2), 16) / 255;
		const r = parseInt(hex.slice(2, 4), 16);
		const g = parseInt(hex.slice(4, 6), 16);
		const b = parseInt(hex.slice(6, 8), 16);
		if (alpha >= 1) {
			return `#${hex.slice(2)}`;
		}
		return `rgba(${r}, ${g}, ${b}, ${Number(alpha.toFixed(3))})`;
	}
	return v;
}

function parseHexRgb(
	color: string
): { r: number; g: number; b: number } | undefined {
	const hex6 = /^#([0-9A-Fa-f]{6})$/.exec(color.trim());
	if (hex6) {
		return {
			r: parseInt(hex6[1].slice(0, 2), 16),
			g: parseInt(hex6[1].slice(2, 4), 16),
			b: parseInt(hex6[1].slice(4, 6), 16),
		};
	}
	const rgba =
		/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i.exec(color.trim());
	if (rgba) {
		return {
			r: Number(rgba[1]),
			g: Number(rgba[2]),
			b: Number(rgba[3]),
		};
	}
	return undefined;
}

function applyOpacity(color: string, opacity: string): string {
	const op = Number(opacity);
	if (!Number.isFinite(op) || op >= 1) {
		return color;
	}
	const rgb = parseHexRgb(color);
	if (!rgb) {
		return color;
	}
	return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${op})`;
}

function findFirstColorInTree(
	node: XmlNode,
	registry: ResourceRegistry,
	seen: Set<string>
): string | undefined {
	const color = getAttr(node, 'Color');
	if (color) {
		return resolveRawValue(color, registry, seen);
	}
	for (const child of node.children) {
		const found = findFirstColorInTree(child, registry, seen);
		if (found) {
			return found;
		}
	}
	if (node.text) {
		return toCssColor(node.text);
	}
	return undefined;
}

export function resolveRawValue(
	raw: string,
	registry: ResourceRegistry,
	seen: Set<string> = new Set()
): string | undefined {
	const me = parseMarkupExtension(raw);
	if (me) {
		return resolveResourceValue(me.key, registry, seen);
	}
	return toCssColor(raw);
}

export function resolveResourceValue(
	key: string,
	registry: ResourceRegistry,
	seen: Set<string> = new Set()
): string | undefined {
	if (seen.has(key)) {
		return undefined;
	}
	seen.add(key);

	const entry = registry.get(key);
	if (!entry) {
		return SYSTEM_COLORS[key];
	}

	switch (entry.kind) {
		case 'alias':
			return entry.aliasOf
				? resolveResourceValue(entry.aliasOf, registry, seen)
				: undefined;
		case 'color':
			return entry.node.text
				? toCssColor(entry.node.text)
				: undefined;
		case 'brush': {
			const color = getAttr(entry.node, 'Color');
			const opacity = getAttr(entry.node, 'Opacity');
			let resolved = color
				? resolveRawValue(color, registry, seen)
				: findFirstColorInTree(entry.node, registry, seen);
			if (!resolved) {
				return undefined;
			}
			resolved = toCssColor(resolved);
			if (opacity) {
				resolved = applyOpacity(resolved, opacity);
			}
			return resolved;
		}
		case 'thickness':
		case 'cornerRadius':
		case 'double':
			return entry.node.text || undefined;
		case 'fontFamily':
			return entry.node.text
				? mapFontFamilyValue(entry.node.text)
				: undefined;
		case 'other': {
			const color = getAttr(entry.node, 'Color');
			if (color) {
				return resolveRawValue(color, registry, seen);
			}
			return entry.node.text ? toCssColor(entry.node.text) : undefined;
		}
		case 'style':
			return undefined;
		default:
			return undefined;
	}
}

function collectSetters(styleNode: XmlNode): StyleSetter[] {
	const setters: StyleSetter[] = [];
	for (const child of styleNode.children) {
		if (child.localName !== 'setter') {
			continue;
		}
		const property = getAttr(child, 'Property');
		const value = getAttr(child, 'Value');
		if (!property || value === undefined) {
			continue;
		}
		if (property.toLowerCase() === 'template') {
			continue;
		}
		setters.push({ property, value });
	}
	return setters;
}

function resolveStyleSetters(
	styleNode: XmlNode,
	registry: ResourceRegistry,
	seen: Set<string>
): StyleSetter[] {
	const key = getAttr(styleNode, 'Key') ?? '';
	const cycleKey = key
		? `style:${key}`
		: `implicit:${(getAttr(styleNode, 'TargetType') ?? '').toLowerCase()}`;
	if (seen.has(cycleKey)) {
		return [];
	}
	seen.add(cycleKey);

	const merged = new Map<string, StyleSetter>();
	const basedOn = getAttr(styleNode, 'BasedOn');
	if (basedOn) {
		const me = parseMarkupExtension(basedOn);
		if (me) {
			const parent = registry.getStyle(me.key);
			if (parent) {
				for (const setter of resolveStyleSetters(parent, registry, seen)) {
					merged.set(setter.property.toLowerCase(), setter);
				}
			}
		}
	}

	for (const setter of collectSetters(styleNode)) {
		merged.set(setter.property.toLowerCase(), setter);
	}

	return [...merged.values()];
}

function settersToCss(
	setters: StyleSetter[],
	registry: ResourceRegistry
): MappedCss {
	const styles: Record<string, string> = {};
	let horizontal: string | undefined;
	let vertical: string | undefined;

	for (const setter of setters) {
		const resolved = resolveRawValue(setter.value, registry);
		if (resolved === undefined) {
			continue;
		}
		const mapped = mapPropertyToCss(setter.property.toLowerCase(), resolved);
		Object.assign(styles, mapped.styles);
		if (mapped.horizontal !== undefined) {
			horizontal = mapped.horizontal;
		}
		if (mapped.vertical !== undefined) {
			vertical = mapped.vertical;
		}
	}

	return { styles, horizontal, vertical };
}

/**
 * Resolves Style="{StaticResource Key}" into CSS, following BasedOn and Setters.
 */
export function resolveStyleAttribute(
	styleAttrValue: string,
	ctx: RenderContext,
	line: number
): MappedCss {
	const empty: MappedCss = { styles: {} };
	const me = parseMarkupExtension(styleAttrValue);
	if (!me) {
		return empty;
	}

	const registry = ctx.styleRegistry;
	const styleNode = registry?.getStyle(me.key);
	if (!registry || !styleNode) {
		const known = WELL_KNOWN_TEXT_STYLES[me.key];
		if (known) {
			return { styles: { ...known } };
		}
		ctx.hasUnknown.value = true;
		ctx.output.appendLine(
			`Unknown style resource: [${me.key}] : [${line}]`
		);
		return empty;
	}

	const setters = resolveStyleSetters(styleNode, registry, new Set());
	return settersToCss(setters, registry);
}

/**
 * Layout setters from implicit control styles. Visual setters (Background,
 * FontFamily, …) belong to ControlTemplates we do not render; applying them
 * as inline CSS strips the preview chrome (e.g. ButtonBackground is ~6% white).
 */
const IMPLICIT_LAYOUT_PROPS = new Set([
	'horizontalalignment',
	'verticalalignment',
	'width',
	'height',
	'minwidth',
	'minheight',
	'maxwidth',
	'maxheight',
	'margin',
]);

/**
 * Applies the implicit Style for a control type (TargetType, no x:Key),
 * e.g. Button → HorizontalAlignment=Left from DefaultButtonStyle.
 */
export function resolveImplicitStyle(
	tagLocalName: string,
	ctx: RenderContext
): MappedCss {
	const empty: MappedCss = { styles: {} };
	const registry = ctx.styleRegistry;
	const styleNode = registry?.getImplicitStyle(tagLocalName);
	if (!registry || !styleNode) {
		return empty;
	}

	const setters = resolveStyleSetters(styleNode, registry, new Set()).filter(
		(setter) => IMPLICIT_LAYOUT_PROPS.has(setter.property.toLowerCase())
	);
	return settersToCss(setters, registry);
}
