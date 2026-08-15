import {
	escapeHtmlText,
	getAttr,
	processProperties,
	styleAttr,
	toCssLength,
} from './properties';
import type { RenderContext, XmlNode } from './types';

function contentHorizontalAlign(
	orientation: string,
	horizontal: string | undefined
): string {
	const align = (horizontal ?? '').toLowerCase();
	if (align !== 'left' && align !== 'right' && align !== 'center') {
		return '';
	}

	const flexValue =
		align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center';

	// Vertical stack: cross-axis is horizontal → align-items
	// Horizontal stack: main-axis is horizontal → justify-content
	return orientation === 'horizontal'
		? `justify-content: ${flexValue}`
		: `align-items: ${flexValue}`;
}

export function renderStackPanel(node: XmlNode, ctx: RenderContext): string {
	const props = processProperties(node, ctx);
	const orientation = (getAttr(node, 'Orientation') ?? 'Vertical').toLowerCase();
	const flexDirection = orientation === 'horizontal' ? 'row' : 'column';
	const spacing = getAttr(node, 'Spacing');
	const spacingCss = spacing ? toCssLength(spacing) : undefined;
	const marginSide =
		orientation === 'horizontal' ? 'margin-right' : 'margin-bottom';
	const childAlign = contentHorizontalAlign(
		orientation,
		getAttr(node, 'HorizontalAlignment')
	);

	const merged = [
		'display: flex',
		`flex-direction: ${flexDirection}`,
		'box-sizing: border-box',
		childAlign,
		props.style,
	]
		.filter(Boolean)
		.join('; ');

	const children = node.children
		.map((child, index) => {
			const html = ctx.renderNode(child);
			if (!spacingCss || index === node.children.length - 1) {
				return html;
			}
			return `<div style="${marginSide}: ${spacingCss}">${html}</div>`;
		})
		.join('');

	const text = node.text ? escapeHtmlText(node.text) : '';
	return `<div data-xaml="StackPanel"${styleAttr(merged)}${props.attrs}>${text}${children}</div>`;
}
