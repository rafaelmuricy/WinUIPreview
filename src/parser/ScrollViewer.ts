import {
	escapeHtmlText,
	getAttr,
	processProperties,
	styleAttr,
} from './properties';
import type { RenderContext, XmlNode } from './types';

function scrollModeToOverflow(value: string | undefined): string {
	return (value ?? '').toLowerCase() === 'disabled' ? 'hidden' : 'auto';
}

export function renderScrollViewer(node: XmlNode, ctx: RenderContext): string {
	const props = processProperties(node, ctx);
	const overflowX = scrollModeToOverflow(getAttr(node, 'HorizontalScrollMode'));
	const overflowY = scrollModeToOverflow(getAttr(node, 'VerticalScrollMode'));
	const merged = [
		`overflow-x: ${overflowX}`,
		`overflow-y: ${overflowY}`,
		'box-sizing: border-box',
		'height: 100%',
		'width: 100%',
		props.style,
	]
		.filter(Boolean)
		.join('; ');
	const children = ctx.renderChildren(node.children);
	const text = node.text ? escapeHtmlText(node.text) : '';
	return `<div data-xaml="ScrollViewer"${styleAttr(merged)}${props.attrs}>${text}${children}</div>`;
}
