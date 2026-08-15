import { escapeHtmlText, getAttr, processProperties, styleAttr } from './properties';
import type { RenderContext, XmlNode } from './types';

export function renderTextBlock(node: XmlNode, ctx: RenderContext): string {
	const props = processProperties(node, ctx);
	const textAttr = getAttr(node, 'Text');
	const children = ctx.renderChildren(node.children);
	const text =
		textAttr !== undefined
			? escapeHtmlText(textAttr)
			: node.text
				? escapeHtmlText(node.text)
				: children;
	return `<span data-xaml="TextBlock"${styleAttr(props.style)}${props.attrs}>${text}</span>`;
}
