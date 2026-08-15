import { getAttr, processProperties, styleAttr } from './properties';
import type { RenderContext, XmlNode } from './types';

export function renderProgressRing(node: XmlNode, ctx: RenderContext): string {
	const props = processProperties(node, ctx);
	const isActive = (getAttr(node, 'IsActive') ?? 'True').toLowerCase();
	const animate = isActive !== 'false';
	const foreground = getAttr(node, 'Foreground')?.trim();

	const merged = [
		props.style,
		foreground ? `border-top-color: ${foreground}` : '',
		!animate ? 'animation: none' : '',
	]
		.filter(Boolean)
		.join('; ');

	return `<div class="spinner" data-xaml="ProgressRing" role="status" aria-label="Loading"${styleAttr(merged)}${props.attrs}></div>`;
}
