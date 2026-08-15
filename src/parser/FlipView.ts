import {
	getAttr,
	isMarkupExtension,
	processProperties,
	styleAttr,
} from './properties';
import type { RenderContext, XmlNode } from './types';

function parseIndex(raw: string | undefined): number {
	if (!raw || isMarkupExtension(raw)) {
		return 0;
	}
	const index = Number.parseInt(raw.trim(), 10);
	return Number.isInteger(index) && index >= 0 ? index : 0;
}

export function renderFlipViewItem(node: XmlNode, ctx: RenderContext): string {
	const props = processProperties(node, ctx);
	return `<div data-xaml="FlipViewItem"${styleAttr(props.style)}${props.attrs}>${ctx.renderChildren(node.children)}</div>`;
}

export function renderFlipView(node: XmlNode, ctx: RenderContext): string {
	const props = processProperties(node, ctx);
	const nested = node.children.find(
		(child) =>
			child.localName === 'flipview.items' || child.localName.endsWith('.items')
	);
	const pages = nested
		? nested.children
		: node.children.filter(
				(child) =>
					child.localName === 'flipviewitem' || child.localName === 'string'
			);
	const selected = Math.min(parseIndex(getAttr(node, 'SelectedIndex')), Math.max(pages.length - 1, 0));
	const page = pages[selected];
	const inner = page
		? page.localName === 'flipviewitem'
			? renderFlipViewItem(page, ctx)
			: ctx.renderNode(page)
		: '';
	const showNext = pages.length > 1;

	return `<div data-xaml="FlipView"${styleAttr(props.style)}${props.attrs}><div class="flip-page">${inner}</div>${showNext ? '<span class="flip-next">&#8250;</span>' : ''}</div>`;
}
