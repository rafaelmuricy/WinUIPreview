import {
	escapeHtmlAttr,
	escapeHtmlText,
	getAttr,
	headerHtml,
	inputFillStyle,
	inputHostStyle,
	processProperties,
	styleAttr,
} from './properties';
import type { RenderContext, XmlNode } from './types';

export function renderTextBox(node: XmlNode, ctx: RenderContext): string {
	const props = processProperties(node, ctx);
	const text = getAttr(node, 'Text') ?? '';
	const placeholder = getAttr(node, 'PlaceholderText');
	const placeholderAttr = placeholder
		? ` placeholder="${escapeHtmlAttr(placeholder)}"`
		: '';
	const host = inputHostStyle(props.style);
	const fill = inputFillStyle(props.style);
	return `<div data-xaml="TextBox"${styleAttr(host)}${props.attrs}>${headerHtml(getAttr(node, 'Header'))}<textarea spellcheck="false" rows="1"${placeholderAttr}${styleAttr(fill)}>${escapeHtmlText(text)}</textarea></div>`;
}
