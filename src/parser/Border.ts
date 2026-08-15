import { escapeHtmlText, processProperties, styleAttr } from './properties';
import type { RenderContext, XmlNode } from './types';

export function renderBorder(node: XmlNode, ctx: RenderContext): string {
	const props = processProperties(node, ctx);
	const merged = ['box-sizing: border-box', props.style].filter(Boolean).join('; ');
	const children = ctx.renderChildren(node.children);
	const text = node.text ? escapeHtmlText(node.text) : '';
	return `<div data-xaml="Border"${styleAttr(merged)}${props.attrs}>${text}${children}</div>`;
}
