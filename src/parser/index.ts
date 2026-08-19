import type * as vscode from 'vscode';
import { renderAutoSuggestBox } from './AutoSuggestBox';
import { renderBorder } from './Border';
import { renderButton } from './Button';
import { renderCalendarDatePicker } from './CalendarDatePicker';
import { renderCalendarView } from './CalendarView';
import { renderCanvas } from './Canvas';
import { renderCheckBox } from './CheckBox';
import { renderColorPicker } from './ColorPicker';
import { renderComboBox } from './ComboBox';
import { renderCommandBar, renderAppBarButton, renderSecondaryCommands } from './CommandBar';
import { renderHyperlinkButton } from './HyperlinkButton';
import { renderImage } from './Image';
import { renderInfoBar } from './InfoBar';
import { renderDataTemplate } from './DataTemplate';
import { renderDatePicker } from './DatePicker';
import { renderDropDownButton } from './DropDownButton';
import { renderEllipse } from './Ellipse';
import { renderExpander } from './Expander';
import { renderFlipView, renderFlipViewItem } from './FlipView';
import { renderFontIcon } from './FontIcon';
import { renderGrid } from './Grid';
import { renderGridView, renderGridViewItem } from './GridView';
import { renderListView, renderListViewItem } from './ListView';
import {
	renderFlyoutProperty,
	renderMenuFlyout,
	renderMenuFlyoutItem,
	renderMenuFlyoutSeparator,
} from './MenuFlyout';
import { renderMenuBar, renderMenuBarItem } from './MenuBar';
import { renderNavigationView, renderNavigationViewItem } from './NavigationView';
import { renderNumberBox } from './NumberBox';
import { renderPage } from './Page';
import { renderPasswordBox } from './PasswordBox';
import { renderPersonPicture } from './PersonPicture';
import { renderPipsPager } from './PipsPager';
import { processProperties } from './properties';
import { renderProgressBar } from './ProgressBar';
import { renderProgressRing } from './ProgressRing';
import { renderRelativePanel } from './RelativePanel';
import { renderRadioButton } from './RadioButton';
import { renderRadioButtons } from './RadioButtons';
import { renderRectangle } from './Rectangle';
import { renderRatingControl } from './RatingControl';
import { renderRichEditBox } from './RichEditBox';
import { renderParagraph, renderRichTextBlock, renderRun } from './RichTextBlock';
import { renderRepeatButton } from './RepeatButton';
import type { ResourceRegistry } from './resourceRegistry';
import { renderScrollViewer } from './ScrollViewer';
import { renderSelectorBar, renderSelectorBarItem } from './SelectorBar';
import { renderSplitView } from './SplitView';
import { renderSlider } from './Slider';
import { renderSplitButton } from './SplitButton';
import { renderStackPanel } from './StackPanel';
import { renderTabView, renderTabViewItem } from './TabView';
import { renderTextBlock } from './TextBlock';
import { renderTextBox } from './TextBox';
import { renderTimePicker } from './TimePicker';
import { renderToggleButton } from './ToggleButton';
import { renderToggleSplitButton } from './ToggleSplitButton';
import { renderToggleSwitch } from './ToggleSwitch';
import { renderUserControl } from './UserControl';
import { renderViewbox } from './Viewbox';
import { renderWindow } from './Window';
import type { ParseResult, RenderContext, TagHandler, XmlNode } from './types';
import { parseXamlToNodes } from './xml';

const handlers: Record<string, TagHandler> = {
	page: renderPage,
	usercontrol: renderUserControl,
	window: renderWindow,
	grid: renderGrid,
	stackpanel: renderStackPanel,
	border: renderBorder,
	scrollviewer: renderScrollViewer,
	viewbox: renderViewbox,
	button: renderButton,
	togglebutton: renderToggleButton,
	hyperlinkbutton: renderHyperlinkButton,
	textblock: renderTextBlock,
	richtextblock: renderRichTextBlock,
	paragraph: renderParagraph,
	run: renderRun,
	textbox: renderTextBox,
	passwordbox: renderPasswordBox,
	numberbox: renderNumberBox,
	combobox: renderComboBox,
	datepicker: renderDatePicker,
	calendardatepicker: renderCalendarDatePicker,
	calendarview: renderCalendarView,
	timepicker: renderTimePicker,
	autosuggestbox: renderAutoSuggestBox,
	toggleswitch: renderToggleSwitch,
	radiobutton: renderRadioButton,
	checkbox: renderCheckBox,
	ratingcontrol: renderRatingControl,
	infobar: renderInfoBar,
	slider: renderSlider,
	progressbar: renderProgressBar,
	progressring: renderProgressRing,
	fonticon: renderFontIcon,
	listview: renderListView,
	listviewitem: renderListViewItem,
	navigationview: renderNavigationView,
	navigationviewitem: renderNavigationViewItem,
	datatemplate: renderDataTemplate,
	ellipse: renderEllipse,
	canvas: renderCanvas,
	relativepanel: renderRelativePanel,
	splitview: renderSplitView,
	rectangle: renderRectangle,
	personpicture: renderPersonPicture,
	image: renderImage,
	colorpicker: renderColorPicker,
	expander: renderExpander,
	'expander.header': renderFlyoutProperty,
	splitbutton: renderSplitButton,
	'splitbutton.flyout': renderFlyoutProperty,
	dropdownbutton: renderDropDownButton,
	'dropdownbutton.flyout': renderFlyoutProperty,
	repeatbutton: renderRepeatButton,
	togglesplitbutton: renderToggleSplitButton,
	'togglesplitbutton.flyout': renderFlyoutProperty,
	menuflyout: renderMenuFlyout,
	menuflyoutitem: renderMenuFlyoutItem,
	menuflyoutseparator: renderMenuFlyoutSeparator,
	commandbar: renderCommandBar,
	'commandbar.secondarycommands': renderSecondaryCommands,
	appbarbutton: renderAppBarButton,
	menubar: renderMenuBar,
	menubaritem: renderMenuBarItem,
	gridview: renderGridView,
	gridviewitem: renderGridViewItem,
	tabview: renderTabView,
	tabviewitem: renderTabViewItem,
	richeditbox: renderRichEditBox,
	flipview: renderFlipView,
	flipviewitem: renderFlipViewItem,
	pipspager: renderPipsPager,
	radiobuttons: renderRadioButtons,
	selectorbar: renderSelectorBar,
	selectorbaritem: renderSelectorBarItem,
};

const ROOT_TAGS = new Set(['page', 'usercontrol', 'window']);

function lineAt(source: string, index: number): number {
	let line = 1;
	for (let i = 0; i < index && i < source.length; i++) {
		if (source.charCodeAt(i) === 10) {
			line++;
		}
	}
	return line;
}

/**
 * Finds opening tag positions in document order and assigns line numbers
 * to nodes in preorder walk order.
 */
function assignLines(source: string, roots: XmlNode[]): void {
	const tagRegex = /<\/?([A-Za-z_][\w.-]*(?::[A-Za-z_][\w.-]*)?)(\s[^>]*)?>/g;
	const openPositions: number[] = [];
	let match: RegExpExecArray | null;
	while ((match = tagRegex.exec(source)) !== null) {
		if (match[0].startsWith('</') || match[0].endsWith('/>')) {
			if (match[0].endsWith('/>') && !match[0].startsWith('</')) {
				openPositions.push(match.index);
			}
			continue;
		}
		openPositions.push(match.index);
	}

	let cursor = 0;
	const visit = (node: XmlNode): void => {
		const pos = openPositions[cursor++] ?? 0;
		node.line = lineAt(source, pos);
		for (const child of node.children) {
			visit(child);
		}
	};

	for (const root of roots) {
		visit(root);
	}
}

export interface PreviewHtmlOptions {
	nonce: string;
	cspSource: string;
	styleRegistry?: ResourceRegistry;
	resolveImageSrc?: (source: string) => string | undefined;
	hoverShadowRgb?: string;
	showUnknownTags?: boolean;
}

function buildDocumentHtml(
	bodyContent: string,
	options?: PreviewHtmlOptions
): string {
	const nonce = options?.nonce;
	const cspSource = options?.cspSource ?? '';
	const csp = nonce
		? `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${cspSource} 'unsafe-inline'; img-src ${cspSource} data:; script-src 'nonce-${nonce}';" />`
		: '';
	const clickScript = nonce
		? `<script nonce="${nonce}">
(function () {
	const vscode = acquireVsCodeApi();
	document.addEventListener('click', function (event) {
		const target = event.target;
		if (!(target instanceof Element)) {
			return;
		}
		const el = target.closest('[data-element-line]');
		if (!el) {
			return;
		}
		const line = Number(el.getAttribute('data-element-line'));
		if (!Number.isFinite(line) || line < 1) {
			return;
		}
		event.preventDefault();
		vscode.postMessage({ type: 'navigateToLine', line: line });
	}, true);

	const tip = document.createElement('div');
	tip.className = 'xaml-hover-tooltip';
	tip.hidden = true;
	document.body.appendChild(tip);

	const hoverOutline = document.createElement('div');
	hoverOutline.className = 'xaml-hover-outline';
	document.body.appendChild(hoverOutline);

	let hoveredControl = null;

	function hideHoverOutline() {
		hoveredControl = null;
		hoverOutline.classList.remove('is-visible');
	}

	function positionHoverOutline(el) {
		const rect = el.getBoundingClientRect();
		if (rect.width <= 0 || rect.height <= 0) {
			hoverOutline.classList.remove('is-visible');
			return;
		}
		const style = window.getComputedStyle(el);
		hoverOutline.style.left = rect.left + 'px';
		hoverOutline.style.top = rect.top + 'px';
		hoverOutline.style.width = rect.width + 'px';
		hoverOutline.style.height = rect.height + 'px';
		hoverOutline.style.borderRadius = style.borderRadius;
	}

	function showHoverOutline(el) {
		hoveredControl = el;
		positionHoverOutline(el);
		if (!hoverOutline.classList.contains('is-visible')) {
			void hoverOutline.offsetWidth;
		}
		hoverOutline.classList.add('is-visible');
	}

	window.addEventListener('message', function (event) {
		const msg = event.data;
		if (
			msg &&
			msg.type === 'hoverShadowColor' &&
			typeof msg.rgb === 'string' &&
			/^\d{1,3},\s*\d{1,3},\s*\d{1,3}$/.test(msg.rgb)
		) {
			document.documentElement.style.setProperty('--xaml-hover-rgb', msg.rgb);
		}
	});

	function hideTip() {
		tip.hidden = true;
		tip.replaceChildren();
	}

	function showTip(el) {
		const italic = el.getAttribute('data-tooltip-italic');
		const extra = el.getAttribute('data-tooltip');
		if (!italic && !extra) {
			hideTip();
			return;
		}
		tip.replaceChildren();
		if (italic) {
			const italicEl = document.createElement('div');
			italicEl.style.fontStyle = 'italic';
			italicEl.textContent = italic;
			tip.appendChild(italicEl);
		}
		if (extra) {
			const extraEl = document.createElement('div');
			extraEl.style.whiteSpace = 'pre-wrap';
			extraEl.textContent = extra;
			tip.appendChild(extraEl);
		}
		const rect = el.getBoundingClientRect();
		tip.style.left = Math.max(8, rect.left) + 'px';
		tip.style.top = rect.bottom + 6 + 'px';
		tip.hidden = false;
	}

	document.addEventListener('mouseover', function (event) {
		const target = event.target;
		if (!(target instanceof Element)) {
			return;
		}
		const control = target.closest('[data-element-line]');
		if (control) {
			if (control !== hoveredControl) {
				showHoverOutline(control);
			}
		} else {
			hideHoverOutline();
		}
		const el = target.closest('[data-tooltip-italic], [data-tooltip]');
		if (!el) {
			return;
		}
		showTip(el);
	});
	document.addEventListener('mouseout', function (event) {
		const target = event.target;
		const related = event.relatedTarget;
		if (!(target instanceof Element)) {
			return;
		}
		if (!(related instanceof Element) || !related.closest('[data-element-line]')) {
			hideHoverOutline();
		}
		const el = target.closest('[data-tooltip-italic], [data-tooltip]');
		if (!el) {
			return;
		}
		if (related instanceof Node && el.contains(related)) {
			return;
		}
		hideTip();
	});
	document.addEventListener('scroll', function () {
		hideTip();
		if (hoveredControl) {
			positionHoverOutline(hoveredControl);
		}
	}, true);

	function layoutViewboxes() {
		const boxes = document.querySelectorAll('[data-xaml="Viewbox"]');
		for (let i = boxes.length - 1; i >= 0; i--) {
			const box = boxes[i];
			const content = box.firstElementChild;
			if (!(content instanceof HTMLElement)) {
				continue;
			}
			const cw = content.offsetWidth;
			const ch = content.offsetHeight;
			const bw = box.clientWidth;
			const bh = box.clientHeight;
			if (cw <= 0 || ch <= 0 || bw <= 0 || bh <= 0) {
				continue;
			}
			let scaleX = bw / cw;
			let scaleY = bh / ch;
			const stretch = (box.getAttribute('data-stretch') || 'uniform').toLowerCase();
			const direction = (box.getAttribute('data-stretch-direction') || 'both').toLowerCase();
			if (stretch === 'none') {
				scaleX = 1;
				scaleY = 1;
			} else if (stretch === 'uniformtofill') {
				const s = Math.max(scaleX, scaleY);
				scaleX = s;
				scaleY = s;
			} else if (stretch !== 'fill') {
				const s = Math.min(scaleX, scaleY);
				scaleX = s;
				scaleY = s;
			}
			if (direction === 'uponly') {
				scaleX = Math.max(1, scaleX);
				scaleY = Math.max(1, scaleY);
			} else if (direction === 'downonly') {
				scaleX = Math.min(1, scaleX);
				scaleY = Math.min(1, scaleY);
			}
			content.style.transform = 'scale(' + scaleX + ', ' + scaleY + ')';
		}
	}

	function scheduleViewboxLayout() {
		requestAnimationFrame(layoutViewboxes);
	}

	layoutViewboxes();
	window.addEventListener('resize', function () {
		scheduleViewboxLayout();
		if (hoveredControl) {
			positionHoverOutline(hoveredControl);
		}
	});
	document.addEventListener('load', scheduleViewboxLayout, true);
	if (typeof ResizeObserver !== 'undefined') {
		document.querySelectorAll('[data-xaml="Viewbox"]').forEach(function (box) {
			new ResizeObserver(scheduleViewboxLayout).observe(box);
		});
	}
})();
</script>`
		: '';

	const hoverShadowRgb =
		options?.hoverShadowRgb &&
		/^\d{1,3},\s*\d{1,3},\s*\d{1,3}$/.test(options.hoverShadowRgb)
			? options.hoverShadowRgb
			: '124, 58, 237';

	return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8" />
	<meta name="viewport" content="width=device-width, initial-scale=1.0" />
	${csp}
	<title>WinUI 3 Preview</title>
	<style>
		:root {
			--xaml-hover-rgb: ${hoverShadowRgb};
		}
		html, body {
			width: 100%;
			height: 100%;
			margin: 0;
			padding: 0;
			font-family: var(--vscode-font-family, "Segoe UI", sans-serif);
			color: var(--vscode-foreground);
			background: var(--vscode-editor-background);
			box-sizing: border-box;
		}
		body {
			display: grid;
			min-height: 100%;
		}
		*, *::before, *::after { box-sizing: border-box; }
		button { font: inherit; cursor: pointer; }
		input { font: inherit; }
		table { border-spacing: 0; }
		[data-xaml="RichTextBlock"] {
			display: block;
			white-space: pre-wrap;
			overflow-wrap: break-word;
			font-family: "Segoe UI Variable Text", "Segoe UI", var(--vscode-font-family, sans-serif);
			font-size: 14px;
			line-height: 20px;
		}
		[data-xaml="Paragraph"] {
			display: block;
			margin: 0;
		}
		[data-xaml="Run"] {
			white-space: pre-wrap;
		}
		[data-xaml="TextBox"],
		[data-xaml="RichEditBox"],
		[data-xaml="PasswordBox"],
		[data-xaml="NumberBox"],
		[data-xaml="AutoSuggestBox"],
		[data-xaml="ComboBox"],
		[data-xaml="DatePicker"],
		[data-xaml="CalendarDatePicker"],
		[data-xaml="TimePicker"],
		[data-xaml="Slider"],
		[data-xaml="RadioButtons"] {
			gap: 8px;
		}
		[data-xaml="TextBox"] .input-header,
		[data-xaml="RichEditBox"] .input-header,
		[data-xaml="PasswordBox"] .input-header,
		[data-xaml="NumberBox"] .input-header,
		[data-xaml="AutoSuggestBox"] .input-header,
		[data-xaml="ComboBox"] .input-header,
		[data-xaml="DatePicker"] .input-header,
		[data-xaml="CalendarDatePicker"] .input-header,
		[data-xaml="TimePicker"] .input-header,
		[data-xaml="Slider"] .input-header,
		[data-xaml="RadioButtons"] .input-header {
			display: block;
			flex: 0 0 auto;
			font-family: "Segoe UI Variable Text", "Segoe UI", var(--vscode-font-family, sans-serif);
			font-size: 14px;
			line-height: 20px;
			color: var(--vscode-foreground);
		}
		[data-xaml="TextBox"] textarea,
		[data-xaml="RichEditBox"] textarea,
		[data-xaml="PasswordBox"] input,
		[data-xaml="AutoSuggestBox"] input {
			appearance: none;
			-webkit-appearance: none;
			font-family: "Segoe UI Variable Text", "Segoe UI", var(--vscode-font-family, sans-serif);
			font-size: 14px;
			line-height: 20px;
			color: var(--vscode-input-foreground, #ffffff);
			background-color: var(--vscode-input-background, #2e2e2e);
			border: 1px solid var(--vscode-input-border, var(--vscode-widget-border, rgba(255, 255, 255, 0.28)));
			border-radius: 4px;
			padding: 5px 10px 6px;
			min-height: 32px;
			outline: none;
			box-shadow: none;
			resize: none;
			overflow: hidden;
		}
		[data-xaml="TextBox"] textarea::placeholder,
		[data-xaml="RichEditBox"] textarea::placeholder,
		[data-xaml="PasswordBox"] input::placeholder,
		[data-xaml="AutoSuggestBox"] input::placeholder {
			color: var(--vscode-input-placeholderForeground, rgba(255, 255, 255, 0.55));
			opacity: 1;
		}
		[data-xaml="TextBox"] textarea:focus,
		[data-xaml="RichEditBox"] textarea:focus,
		[data-xaml="PasswordBox"] input:focus,
		[data-xaml="AutoSuggestBox"] input:focus {
			border-color: var(--vscode-focusBorder, #60cdff);
		}
		[data-xaml="RichEditBox"] {
			width: 100%;
			align-self: stretch;
		}
		[data-xaml="RichEditBox"] textarea {
			overflow: auto;
			width: 100%;
			height: 100%;
			flex: 1 1 auto;
			min-height: 0;
		}
		[data-xaml="NumberBox"] .number-field {
			display: flex;
			flex-direction: row;
			align-items: stretch;
			min-height: 32px;
			font-family: "Segoe UI Variable Text", "Segoe UI", var(--vscode-font-family, sans-serif);
			font-size: 14px;
			line-height: 20px;
			color: var(--vscode-input-foreground, #ffffff);
			background-color: var(--vscode-input-background, #2e2e2e);
			border: 1px solid var(--vscode-input-border, var(--vscode-widget-border, rgba(255, 255, 255, 0.28)));
			border-radius: 4px;
			overflow: hidden;
		}
		[data-xaml="NumberBox"] .number-input {
			appearance: none;
			-webkit-appearance: none;
			flex: 1 1 auto;
			min-width: 0;
			margin: 0;
			border: none;
			background: transparent;
			color: inherit;
			font: inherit;
			line-height: 20px;
			padding: 5px 10px 6px;
			outline: none;
			box-shadow: none;
		}
		[data-xaml="NumberBox"] .number-input::placeholder {
			color: var(--vscode-input-placeholderForeground, rgba(255, 255, 255, 0.55));
			opacity: 1;
		}
		[data-xaml="NumberBox"] .spin-buttons {
			display: flex;
			flex-shrink: 0;
			align-items: stretch;
		}
		[data-xaml="NumberBox"] .spin-buttons.inline {
			flex-direction: row;
		}
		[data-xaml="NumberBox"] .spin-buttons.compact {
			width: 32px;
			justify-content: center;
		}
		[data-xaml="NumberBox"] .spin-btn {
			display: flex;
			align-items: center;
			justify-content: center;
			min-height: 0;
			width: 20px;
			color: var(--vscode-input-foreground, #ffffff);
			font-size: 12px;
			line-height: 1;
			opacity: 0.85;
		}
		[data-xaml="ComboBox"] .combo-field {
			display: flex;
			flex-direction: row;
			align-items: center;
			min-height: 32px;
			font-family: "Segoe UI Variable Text", "Segoe UI", var(--vscode-font-family, sans-serif);
			font-size: 14px;
			line-height: 20px;
			color: var(--vscode-input-foreground, #ffffff);
			background-color: var(--vscode-input-background, #2e2e2e);
			border: 1px solid var(--vscode-input-border, var(--vscode-widget-border, rgba(255, 255, 255, 0.28)));
			border-radius: 4px;
			overflow: hidden;
		}
		[data-xaml="ComboBox"] .combo-value {
			flex: 1 1 auto;
			min-width: 0;
			padding: 5px 10px 6px;
			white-space: nowrap;
			overflow: hidden;
			text-overflow: ellipsis;
		}
		[data-xaml="ComboBox"] .combo-value.placeholder {
			color: var(--vscode-input-placeholderForeground, rgba(255, 255, 255, 0.55));
		}
		[data-xaml="ComboBox"] .combo-chevron {
			flex-shrink: 0;
			width: 32px;
			display: flex;
			align-items: center;
			justify-content: center;
			font-size: 12px;
			line-height: 1;
			opacity: 0.85;
		}
		[data-xaml="DatePicker"] .date-field,
		[data-xaml="TimePicker"] .time-field {
			display: flex;
			flex-direction: row;
			align-items: stretch;
			min-height: 32px;
			font-family: "Segoe UI Variable Text", "Segoe UI", var(--vscode-font-family, sans-serif);
			font-size: 14px;
			line-height: 20px;
			color: var(--vscode-input-foreground, #ffffff);
			background-color: var(--vscode-input-background, #2e2e2e);
			border: 1px solid var(--vscode-input-border, var(--vscode-widget-border, rgba(255, 255, 255, 0.28)));
			border-radius: 4px;
			overflow: hidden;
		}
		[data-xaml="DatePicker"] .date-part,
		[data-xaml="TimePicker"] .time-part {
			display: flex;
			align-items: center;
			padding: 5px 12px 6px;
			min-width: 0;
			white-space: nowrap;
			overflow: hidden;
			text-overflow: ellipsis;
		}
		[data-xaml="DatePicker"] .date-part + .date-part,
		[data-xaml="TimePicker"] .time-part + .time-part {
			border-left: 1px solid rgba(255, 255, 255, 0.14);
		}
		[data-xaml="DatePicker"] .date-part.day,
		[data-xaml="DatePicker"] .date-part.year {
			flex: 1 1 0;
		}
		[data-xaml="DatePicker"] .date-part.month {
			flex: 1.6 1 0;
		}
		[data-xaml="TimePicker"] .time-part.hour,
		[data-xaml="TimePicker"] .time-part.minute {
			flex: 1 1 0;
		}
		[data-xaml="TimePicker"] .time-part.period {
			flex: 0.7 1 0;
		}
		[data-xaml="DatePicker"] .date-part.placeholder,
		[data-xaml="TimePicker"] .time-part.placeholder {
			color: var(--vscode-input-placeholderForeground, rgba(255, 255, 255, 0.55));
		}
		[data-xaml="CalendarDatePicker"] .calendar-date-field {
			display: flex;
			flex-direction: row;
			align-items: center;
			min-height: 32px;
			font-family: "Segoe UI Variable Text", "Segoe UI", var(--vscode-font-family, sans-serif);
			font-size: 14px;
			line-height: 20px;
			color: var(--vscode-input-foreground, #ffffff);
			background-color: var(--vscode-input-background, #2e2e2e);
			border: 1px solid var(--vscode-input-border, var(--vscode-widget-border, rgba(255, 255, 255, 0.28)));
			border-radius: 4px;
			overflow: hidden;
		}
		[data-xaml="CalendarDatePicker"] .calendar-date-value {
			flex: 1 1 auto;
			min-width: 0;
			padding: 5px 10px 6px;
			white-space: nowrap;
			overflow: hidden;
			text-overflow: ellipsis;
		}
		[data-xaml="CalendarDatePicker"] .calendar-date-value.placeholder {
			color: var(--vscode-input-placeholderForeground, rgba(255, 255, 255, 0.55));
		}
		[data-xaml="CalendarDatePicker"] .calendar-date-glyph {
			flex-shrink: 0;
			width: 16px;
			height: 16px;
			margin-right: 10px;
			stroke: currentColor;
			fill: none;
			stroke-width: 1.2;
			opacity: 0.85;
		}
		[data-xaml="Slider"] .slider-body {
			display: flex;
			flex-direction: column;
			padding: 0 12px;
			min-width: 0;
		}
		[data-xaml="Slider"] .slider-ticks {
			position: relative;
			height: 6px;
		}
		[data-xaml="Slider"] .slider-tick {
			position: absolute;
			top: 1px;
			width: 1px;
			height: 4px;
			background: rgba(255, 255, 255, 0.7);
			transform: translateX(-50%);
		}
		[data-xaml="Slider"] .slider-track-wrap {
			position: relative;
			height: 24px;
			display: flex;
			align-items: center;
		}
		[data-xaml="Slider"] .slider-track {
			position: relative;
			width: 100%;
			height: 4px;
			border-radius: 2px;
			background: rgba(255, 255, 255, 0.22);
			overflow: hidden;
		}
		[data-xaml="Slider"] .slider-fill {
			height: 100%;
			background: #cbb8e0;
		}
		[data-xaml="Slider"] .slider-tick.inline {
			top: 0;
			height: 4px;
			background: rgba(255, 255, 255, 0.45);
		}
		[data-xaml="Slider"] .slider-thumb {
			position: absolute;
			top: 50%;
			width: 24px;
			height: 24px;
			border-radius: 50%;
			background: rgba(255, 255, 255, 0.14);
			transform: translate(-50%, -50%);
			pointer-events: none;
		}
		[data-xaml="Slider"] .slider-thumb::after {
			content: "";
			position: absolute;
			top: 50%;
			left: 50%;
			width: 10px;
			height: 10px;
			border-radius: 50%;
			background: #cbb8e0;
			transform: translate(-50%, -50%);
		}
		[data-xaml="Button"],
		[data-xaml="HyperlinkButton"],
		[data-xaml="ToggleButton"],
		[data-xaml="RepeatButton"],
		[data-xaml="DropDownButton"],
		[data-xaml="SplitButton"],
		[data-xaml="ToggleSplitButton"] {
			width: fit-content;
			max-width: 100%;
		}
		[data-xaml="HyperlinkButton"] {
			appearance: none;
			-webkit-appearance: none;
			display: inline-flex;
			align-items: center;
			justify-content: center;
			font-family: "Segoe UI Variable Text", "Segoe UI", var(--vscode-font-family, sans-serif);
			font-size: 14px;
			line-height: 20px;
			color: #cbb8e0;
			background: rgba(255, 255, 255, 0.06);
			border: 1px solid rgba(255, 255, 255, 0.07);
			border-radius: 4px;
			padding: 5px 11px 6px;
			text-decoration: none;
			cursor: pointer;
		}
		[data-xaml="ToggleButton"] {
			appearance: none;
			-webkit-appearance: none;
			display: inline-flex;
			align-items: center;
			justify-content: center;
			font-family: "Segoe UI Variable Text", "Segoe UI", var(--vscode-font-family, sans-serif);
			font-size: 14px;
			line-height: 20px;
			color: var(--vscode-foreground);
			background: rgba(255, 255, 255, 0.06);
			border: 1px solid rgba(255, 255, 255, 0.07);
			border-radius: 4px;
			padding: 5px 11px 6px;
			cursor: pointer;
		}
		[data-xaml="ToggleButton"].checked {
			color: #1c1c1c;
			background: #cbb8e0;
			border-color: #cbb8e0;
		}
		[data-xaml="Button"],
		[data-xaml="RepeatButton"],
		[data-xaml="DropDownButton"],
		[data-xaml="SplitButton"],
		[data-xaml="ToggleSplitButton"],
		[data-xaml="AppBarButton"],
		[data-xaml="CommandBar"] .commandbar-overflow {
			appearance: none;
			-webkit-appearance: none;
			display: inline-flex;
			align-items: center;
			justify-content: center;
			font-family: "Segoe UI Variable Text", "Segoe UI", var(--vscode-font-family, sans-serif);
			font-size: 14px;
			line-height: 20px;
			color: var(--vscode-foreground);
			background: rgba(255, 255, 255, 0.06);
			border: 1px solid rgba(255, 255, 255, 0.07);
			border-radius: 4px;
			cursor: pointer;
		}
		[data-xaml="Button"],
		[data-xaml="RepeatButton"] {
			padding: 5px 11px 6px;
		}
		[data-xaml="DropDownButton"] {
			gap: 8px;
			padding: 5px 8px 6px 11px;
		}
		[data-xaml="DropDownButton"] .dropdown-chevron {
			opacity: 0.85;
			font-size: 12px;
			line-height: 1;
		}
		[data-xaml="SplitButton"],
		[data-xaml="ToggleSplitButton"] {
			padding: 0;
			overflow: hidden;
		}
		[data-xaml="SplitButton"] .split-main,
		[data-xaml="ToggleSplitButton"] .split-main {
			padding: 5px 11px 6px;
		}
		[data-xaml="SplitButton"] .split-divider,
		[data-xaml="ToggleSplitButton"] .split-divider {
			width: 1px;
			align-self: stretch;
			margin: 6px 0;
			background: rgba(255, 255, 255, 0.18);
		}
		[data-xaml="SplitButton"] .split-chevron,
		[data-xaml="ToggleSplitButton"] .split-chevron {
			display: flex;
			align-items: center;
			justify-content: center;
			width: 32px;
			font-size: 12px;
			line-height: 1;
			opacity: 0.85;
		}
		[data-xaml="ToggleSplitButton"].checked {
			color: #1c1c1c;
			background: #cbb8e0;
			border-color: #cbb8e0;
		}
		[data-xaml="ToggleSplitButton"].checked .split-divider {
			background: rgba(0, 0, 0, 0.2);
		}
		[data-xaml="ColorPicker"] {
			display: inline-flex;
			flex-direction: column;
			gap: 12px;
			width: 312px;
			max-width: 100%;
			font-family: "Segoe UI Variable Text", "Segoe UI", var(--vscode-font-family, sans-serif);
			font-size: 14px;
			line-height: 20px;
			color: var(--vscode-foreground);
		}
		[data-xaml="ColorPicker"] .color-picker-row {
			display: flex;
			flex-direction: row;
			align-items: stretch;
			gap: 8px;
		}
		[data-xaml="ColorPicker"] .color-spectrum {
			position: relative;
			flex: 1 1 auto;
			min-width: 0;
			height: 224px;
			border-radius: 4px;
			overflow: hidden;
		}
		[data-xaml="ColorPicker"] .color-spectrum.box {
			background-image:
				linear-gradient(to bottom, transparent, #ffffff),
				linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000);
		}
		[data-xaml="ColorPicker"] .color-spectrum.ring {
			border-radius: 50%;
			background: conic-gradient(#ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000);
		}
		[data-xaml="ColorPicker"] .spectrum-thumb {
			position: absolute;
			width: 18px;
			height: 18px;
			border: 2px solid #ffffff;
			border-radius: 50%;
			box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.35);
			transform: translate(-50%, -50%);
			pointer-events: none;
		}
		[data-xaml="ColorPicker"] .color-preview {
			width: 48px;
			flex-shrink: 0;
			border-radius: 4px;
		}
		[data-xaml="ColorPicker"] .color-slider {
			position: relative;
			height: 24px;
			display: flex;
			align-items: center;
		}
		[data-xaml="ColorPicker"] .color-slider-track {
			width: 100%;
			height: 12px;
			border-radius: 6px;
		}
		[data-xaml="ColorPicker"] .color-slider.alpha .color-slider-track {
			background-color: #ffffff;
			background-image:
				linear-gradient(to right, var(--alpha-color), transparent),
				linear-gradient(45deg, #c0c0c0 25%, transparent 25%),
				linear-gradient(-45deg, #c0c0c0 25%, transparent 25%),
				linear-gradient(45deg, transparent 75%, #c0c0c0 75%),
				linear-gradient(-45deg, transparent 75%, #c0c0c0 75%);
			background-size: auto, 8px 8px, 8px 8px, 8px 8px, 8px 8px;
			background-position: 0 0, 0 0, 0 4px, 4px -4px, -4px 0px;
		}
		[data-xaml="ColorPicker"] .color-slider-thumb {
			position: absolute;
			top: 50%;
			width: 20px;
			height: 20px;
			border-radius: 50%;
			border: 2px solid #ffffff;
			background: transparent;
			box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.28);
			transform: translate(-50%, -50%);
			pointer-events: none;
		}
		[data-xaml="ColorPicker"] .color-more {
			display: flex;
			flex-direction: row;
			align-items: center;
			justify-content: flex-end;
			gap: 6px;
			opacity: 0.85;
		}
		[data-xaml="ColorPicker"] .color-more-chevron {
			font-size: 12px;
			line-height: 1;
		}
		[data-xaml="Expander"] {
			display: flex;
			flex-direction: column;
			overflow: hidden;
			border-radius: 4px;
			background: rgba(255, 255, 255, 0.06);
			border: 1px solid rgba(255, 255, 255, 0.07);
			font-family: "Segoe UI Variable Text", "Segoe UI", var(--vscode-font-family, sans-serif);
			font-size: 14px;
			line-height: 20px;
			color: var(--vscode-foreground);
		}
		[data-xaml="Expander"] .expander-header {
			display: flex;
			flex-direction: row;
			align-items: center;
			justify-content: space-between;
			gap: 12px;
			min-height: 48px;
			padding: 8px 12px;
		}
		[data-xaml="Expander"] .expander-header-text {
			min-width: 0;
		}
		[data-xaml="Expander"] .expander-chevron {
			flex-shrink: 0;
			opacity: 0.85;
			font-size: 12px;
			line-height: 1;
		}
		[data-xaml="Expander"] .expander-content {
			display: flex;
			flex-direction: column;
			padding: 4px 12px 12px;
			background: rgba(0, 0, 0, 0.16);
		}
		[data-xaml="CommandBar"] {
			display: inline-flex;
			flex-direction: row;
			align-items: center;
			gap: 4px;
		}
		[data-xaml="AppBarButton"] {
			flex-direction: row;
			gap: 8px;
			padding: 5px 11px 6px;
		}
		[data-xaml="AppBarButton"].label-bottom {
			flex-direction: column;
			gap: 2px;
			padding: 8px 10px;
		}
		[data-xaml="AppBarButton"] .appbar-icon {
			width: 16px;
			height: 16px;
			flex-shrink: 0;
			stroke: currentColor;
			fill: none;
			stroke-width: 1.2;
			stroke-linejoin: round;
			stroke-linecap: round;
		}
		[data-xaml="CommandBar"] .commandbar-overflow {
			width: 40px;
			height: 32px;
			padding: 0;
		}
		[data-xaml="CommandBar"] .commandbar-overflow .appbar-icon {
			width: 16px;
			height: 16px;
			stroke: none;
			fill: currentColor;
		}
		[data-xaml="RadioButton"] {
			display: inline-flex;
			flex-direction: row;
			align-items: center;
			gap: 8px;
			font-family: "Segoe UI Variable Text", "Segoe UI", var(--vscode-font-family, sans-serif);
			font-size: 14px;
			line-height: 20px;
			color: var(--vscode-foreground);
		}
		[data-xaml="RadioButton"] .radio-mark {
			display: block;
			position: relative;
			width: 20px;
			height: 20px;
			flex-shrink: 0;
			border-radius: 50%;
			background: transparent;
			border: 1px solid rgba(255, 255, 255, 0.55);
			box-sizing: border-box;
		}
		[data-xaml="RadioButton"] .radio-mark.checked {
			border-width: 2px;
			border-color: #cbb8e0;
		}
		[data-xaml="RadioButton"] .radio-mark.checked::after {
			content: "";
			position: absolute;
			top: 50%;
			left: 50%;
			width: 10px;
			height: 10px;
			border-radius: 50%;
			background: #1c1c1c;
			transform: translate(-50%, -50%);
		}
		[data-xaml="CheckBox"] {
			display: inline-flex;
			flex-direction: row;
			align-items: center;
			gap: 8px;
			font-family: "Segoe UI Variable Text", "Segoe UI", var(--vscode-font-family, sans-serif);
			font-size: 14px;
			line-height: 20px;
			color: var(--vscode-foreground);
		}
		[data-xaml="CheckBox"] .check-mark {
			display: block;
			position: relative;
			width: 20px;
			height: 20px;
			flex-shrink: 0;
			border-radius: 4px;
			background: transparent;
			border: 1px solid rgba(255, 255, 255, 0.55);
			box-sizing: border-box;
		}
		[data-xaml="CheckBox"] .check-mark.checked,
		[data-xaml="CheckBox"] .check-mark.indeterminate {
			background: #cbb8e0;
			border-color: #cbb8e0;
		}
		[data-xaml="CheckBox"] .check-mark.checked::after {
			content: "";
			position: absolute;
			left: 6px;
			top: 2px;
			width: 5px;
			height: 10px;
			border: solid #1c1c1c;
			border-width: 0 2px 2px 0;
			transform: rotate(45deg);
		}
		[data-xaml="CheckBox"] .check-mark.indeterminate::after {
			content: "";
			position: absolute;
			left: 4px;
			top: 8px;
			width: 10px;
			height: 2px;
			border-radius: 1px;
			background: #1c1c1c;
		}
		[data-xaml="RatingControl"] {
			display: inline-flex;
			flex-direction: row;
			align-items: center;
			gap: 12px;
			font-family: "Segoe UI Variable Text", "Segoe UI", var(--vscode-font-family, sans-serif);
			font-size: 14px;
			line-height: 20px;
			color: var(--vscode-foreground);
		}
		[data-xaml="RatingControl"] .rating-stars {
			display: inline-flex;
			flex-direction: row;
			align-items: center;
			gap: 4px;
		}
		[data-xaml="RatingControl"] .rating-star {
			display: inline-flex;
			align-items: center;
			justify-content: center;
			width: 20px;
			height: 20px;
			font-size: 18px;
			line-height: 1;
		}
		[data-xaml="RatingControl"] .rating-star.filled {
			color: #cbb8e0;
		}
		[data-xaml="RatingControl"] .rating-star.empty {
			color: rgba(255, 255, 255, 0.45);
		}
		[data-xaml="RatingControl"] .rating-star.partial {
			position: relative;
			color: rgba(255, 255, 255, 0.45);
		}
		[data-xaml="RatingControl"] .rating-star-fill {
			position: absolute;
			left: 0;
			top: 0;
			overflow: hidden;
			color: #cbb8e0;
			white-space: nowrap;
		}
		[data-xaml="RatingControl"] .rating-caption {
			white-space: nowrap;
		}
		[data-xaml="ListView"] {
			display: flex;
			flex-direction: column;
			min-width: 0;
			min-height: 0;
			overflow: auto;
			font-family: "Segoe UI Variable Text", "Segoe UI", var(--vscode-font-family, sans-serif);
			font-size: 14px;
			line-height: 20px;
			color: var(--vscode-foreground);
		}
		[data-xaml="ListView"] .list-header,
		[data-xaml="ListView"] .input-header {
			display: block;
			flex: 0 0 auto;
			padding: 0 12px 8px;
		}
		[data-xaml="ListView"] .list-items {
			display: flex;
			flex-direction: column;
			min-height: 0;
		}
		[data-xaml="ListViewItem"] {
			position: relative;
			padding: 8px 12px 8px 16px;
			border-radius: 4px;
		}
		[data-xaml="ListViewItem"].selected {
			background: rgba(255, 255, 255, 0.08);
		}
		[data-xaml="ListViewItem"].selected::before {
			content: "";
			position: absolute;
			left: 0;
			top: 6px;
			bottom: 6px;
			width: 3px;
			border-radius: 2px;
			background: #cbb8e0;
		}
		[data-xaml="MenuBar"] {
			display: flex;
			flex-direction: row;
			align-items: center;
			gap: 2px;
			font-family: "Segoe UI Variable Text", "Segoe UI", var(--vscode-font-family, sans-serif);
			font-size: 14px;
			line-height: 20px;
			color: var(--vscode-foreground);
		}
		[data-xaml="MenuBarItem"] {
			padding: 6px 10px;
			border-radius: 4px;
		}
		[data-xaml="GridView"] {
			display: flex;
			flex-direction: column;
			min-width: 0;
			overflow: hidden;
			font-family: "Segoe UI Variable Text", "Segoe UI", var(--vscode-font-family, sans-serif);
			font-size: 14px;
			line-height: 20px;
			color: var(--vscode-foreground);
		}
		[data-xaml="GridView"] .grid-header {
			display: block;
			flex: 0 0 auto;
			padding: 0 0 8px;
		}
		[data-xaml="GridView"] .grid-items {
			display: flex;
			flex-direction: row;
			align-items: stretch;
			gap: 8px;
			min-height: 0;
			overflow: hidden;
		}
		[data-xaml="GridViewItem"] {
			flex: 0 0 96px;
			width: 96px;
			min-height: 64px;
			padding: 10px 8px;
			border-radius: 4px;
			background: rgba(255, 255, 255, 0.06);
			border: 1px solid transparent;
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
			box-sizing: border-box;
		}
		[data-xaml="GridViewItem"].selected {
			border-color: #cbb8e0;
		}
		[data-xaml="TabView"] {
			display: flex;
			flex-direction: column;
			min-width: 0;
			min-height: 0;
			font-family: "Segoe UI Variable Text", "Segoe UI", var(--vscode-font-family, sans-serif);
			font-size: 14px;
			line-height: 20px;
			color: var(--vscode-foreground);
		}
		[data-xaml="TabView"] .tab-strip {
			display: flex;
			flex-direction: row;
			align-items: stretch;
			gap: 4px;
		}
		[data-xaml="TabViewItem"] {
			display: inline-flex;
			flex-direction: row;
			align-items: center;
			gap: 8px;
			padding: 6px 10px;
			border-radius: 4px 4px 0 0;
			background: transparent;
		}
		[data-xaml="TabViewItem"].selected {
			background: rgba(255, 255, 255, 0.08);
		}
		[data-xaml="TabView"] .tab-close {
			font-size: 10px;
			line-height: 1;
			opacity: 0.65;
		}
		[data-xaml="TabView"] .tab-add {
			padding: 6px 10px;
			opacity: 0.7;
		}
		[data-xaml="TabView"] .tab-content {
			flex: 1 1 auto;
			min-height: 0;
			background: rgba(255, 255, 255, 0.04);
			border-radius: 0 4px 4px 4px;
		}
		[data-xaml="FlipView"] {
			position: relative;
			display: flex;
			align-items: stretch;
			justify-content: center;
			overflow: hidden;
			background: rgba(255, 255, 255, 0.04);
			border-radius: 4px;
			font-family: "Segoe UI Variable Text", "Segoe UI", var(--vscode-font-family, sans-serif);
			font-size: 14px;
			line-height: 20px;
			color: var(--vscode-foreground);
		}
		[data-xaml="FlipView"] .flip-page {
			width: 100%;
			height: 100%;
			min-width: 0;
			min-height: 0;
			display: flex;
			align-items: stretch;
			justify-content: center;
			overflow: hidden;
		}
		[data-xaml="FlipView"] .flip-page > [data-xaml="Image"],
		[data-xaml="FlipView"] .flip-page > [data-xaml="FlipViewItem"] > [data-xaml="Image"] {
			width: 100%;
			height: 100%;
		}
		[data-xaml="FlipViewItem"] {
			display: flex;
			align-items: center;
			justify-content: center;
			width: 100%;
			height: 100%;
			min-width: 0;
			min-height: 0;
		}
		[data-xaml="FlipView"] .flip-nav {
			position: absolute;
			display: flex;
			align-items: center;
			justify-content: center;
			background: rgba(0, 0, 0, 0.45);
			border-radius: 4px;
			pointer-events: none;
			z-index: 1;
		}
		[data-xaml="FlipView"] .flip-nav::before {
			content: "";
			display: block;
			width: 0;
			height: 0;
			border-style: solid;
		}
		[data-xaml="FlipView"].horizontal .flip-nav {
			top: 50%;
			transform: translateY(-50%);
			width: 20px;
			height: 36px;
		}
		[data-xaml="FlipView"].horizontal .flip-prev {
			left: 8px;
		}
		[data-xaml="FlipView"].horizontal .flip-next {
			right: 8px;
		}
		[data-xaml="FlipView"].horizontal .flip-prev::before {
			border-width: 5px 6px 5px 0;
			border-color: transparent #ffffff transparent transparent;
		}
		[data-xaml="FlipView"].horizontal .flip-next::before {
			border-width: 5px 0 5px 6px;
			border-color: transparent transparent transparent #ffffff;
		}
		[data-xaml="FlipView"].vertical .flip-nav {
			left: 50%;
			transform: translateX(-50%);
			width: 36px;
			height: 20px;
		}
		[data-xaml="FlipView"].vertical .flip-prev {
			top: 8px;
		}
		[data-xaml="FlipView"].vertical .flip-next {
			bottom: 8px;
		}
		[data-xaml="FlipView"].vertical .flip-prev::before {
			border-width: 0 5px 6px 5px;
			border-color: transparent transparent #ffffff transparent;
		}
		[data-xaml="FlipView"].vertical .flip-next::before {
			border-width: 6px 5px 0 5px;
			border-color: #ffffff transparent transparent transparent;
		}
		[data-xaml="PipsPager"] {
			display: flex;
			flex-direction: row;
			align-items: center;
			justify-content: center;
			width: 100%;
			gap: 8px;
		}
		[data-xaml="PipsPager"] .pip {
			width: 6px;
			height: 6px;
			border-radius: 50%;
			background: rgba(255, 255, 255, 0.32);
		}
		[data-xaml="PipsPager"] .pip.selected {
			width: 8px;
			height: 8px;
			background: rgba(255, 255, 255, 0.92);
		}
		[data-xaml="RadioButtons"] {
			display: flex;
			flex-direction: column;
			min-width: 0;
			font-family: "Segoe UI Variable Text", "Segoe UI", var(--vscode-font-family, sans-serif);
			font-size: 14px;
			line-height: 20px;
			color: var(--vscode-foreground);
		}
		[data-xaml="RadioButtons"] .radio-items {
			display: grid;
			gap: 12px 24px;
			align-items: center;
		}
		[data-xaml="SelectorBar"] {
			display: inline-flex;
			flex-direction: row;
			align-items: stretch;
			gap: 4px;
			font-family: "Segoe UI Variable Text", "Segoe UI", var(--vscode-font-family, sans-serif);
			font-size: 14px;
			line-height: 20px;
			color: var(--vscode-foreground);
		}
		[data-xaml="SelectorBarItem"] {
			position: relative;
			display: inline-flex;
			flex-direction: row;
			align-items: center;
			gap: 8px;
			padding: 8px 12px 10px;
		}
		[data-xaml="SelectorBarItem"].selected::after {
			content: "";
			position: absolute;
			left: 10px;
			right: 10px;
			bottom: 0;
			height: 3px;
			border-radius: 2px;
			background: #cbb8e0;
		}
		[data-xaml="SelectorBarItem"] .selector-icon {
			width: 16px;
			height: 16px;
			flex-shrink: 0;
			stroke: currentColor;
			fill: none;
			stroke-width: 1.2;
			stroke-linejoin: round;
			stroke-linecap: round;
		}
		[data-xaml="InfoBar"] {
			display: flex;
			flex-direction: row;
			align-items: flex-start;
			gap: 12px;
			padding: 8px 12px;
			border-radius: 4px;
			border: 1px solid transparent;
			box-sizing: border-box;
			font-family: "Segoe UI Variable Text", "Segoe UI", var(--vscode-font-family, sans-serif);
			font-size: 14px;
			line-height: 20px;
			color: var(--vscode-foreground);
		}
		[data-xaml="InfoBar"].informational {
			background: rgba(255, 255, 255, 0.06);
			border-color: rgba(255, 255, 255, 0.1);
		}
		[data-xaml="InfoBar"].success {
			background: #393d1b;
			border-color: rgba(108, 203, 95, 0.28);
		}
		[data-xaml="InfoBar"].warning {
			background: #433519;
			border-color: rgba(252, 225, 0, 0.28);
		}
		[data-xaml="InfoBar"].error {
			background: #442726;
			border-color: rgba(255, 153, 164, 0.28);
		}
		[data-xaml="InfoBar"] .info-icon {
			display: block;
			position: relative;
			width: 16px;
			height: 16px;
			margin-top: 2px;
			flex-shrink: 0;
			border-radius: 50%;
		}
		[data-xaml="InfoBar"].informational .info-icon {
			background: #60cdff;
		}
		[data-xaml="InfoBar"].success .info-icon {
			background: #6ccb5f;
		}
		[data-xaml="InfoBar"].warning .info-icon {
			background: #fce100;
		}
		[data-xaml="InfoBar"].error .info-icon {
			background: #ff99a4;
		}
		[data-xaml="InfoBar"] .info-icon::after {
			content: "";
			position: absolute;
			box-sizing: border-box;
		}
		[data-xaml="InfoBar"].success .info-icon::after {
			left: 5px;
			top: 2px;
			width: 5px;
			height: 8px;
			border: solid #1c1c1c;
			border-width: 0 2px 2px 0;
			transform: rotate(45deg);
		}
		[data-xaml="InfoBar"].informational .info-icon::after {
			left: 7px;
			top: 3px;
			width: 2px;
			height: 8px;
			background: #1c1c1c;
			border-radius: 1px;
			box-shadow: 0 -3px 0 0.5px #1c1c1c;
		}
		[data-xaml="InfoBar"].warning .info-icon::after,
		[data-xaml="InfoBar"].error .info-icon::after {
			left: 7px;
			top: 3px;
			width: 2px;
			height: 6px;
			background: #1c1c1c;
			border-radius: 1px;
			box-shadow: 0 8px 0 -0.5px #1c1c1c;
		}
		[data-xaml="InfoBar"] .info-text {
			flex: 1 1 auto;
			min-width: 0;
		}
		[data-xaml="InfoBar"] .info-title {
			font-weight: 600;
		}
		[data-xaml="InfoBar"] .info-message {
			opacity: 0.92;
		}
		[data-xaml="InfoBar"] .info-action {
			flex-shrink: 0;
			align-self: center;
		}
		[data-xaml="InfoBar"] .info-close {
			flex-shrink: 0;
			width: 20px;
			height: 20px;
			display: flex;
			align-items: center;
			justify-content: center;
			font-size: 10px;
			line-height: 1;
			opacity: 0.85;
		}
		[data-xaml="ToggleSwitch"] {
			display: inline-flex;
			flex-direction: column;
			align-items: flex-start;
			gap: 8px;
			font-family: "Segoe UI Variable Text", "Segoe UI", var(--vscode-font-family, sans-serif);
			font-size: 14px;
			line-height: 20px;
			color: var(--vscode-foreground);
		}
		[data-xaml="ToggleSwitch"] .toggle-header {
			display: block;
		}
		[data-xaml="ToggleSwitch"] .toggle-row {
			display: flex;
			flex-direction: row;
			align-items: center;
			gap: 12px;
		}
		[data-xaml="ToggleSwitch"] .toggle-track {
			display: block;
			position: relative;
			width: 40px;
			height: 20px;
			flex-shrink: 0;
			border-radius: 10px;
			background: rgba(255, 255, 255, 0.16);
			border: 1px solid rgba(255, 255, 255, 0.28);
		}
		[data-xaml="ToggleSwitch"] .toggle-track.on {
			background: #cbb8e0;
			border-color: #cbb8e0;
		}
		[data-xaml="ToggleSwitch"] .toggle-track::after {
			content: "";
			position: absolute;
			top: 3px;
			left: 3px;
			width: 12px;
			height: 12px;
			border-radius: 50%;
			background: #f3f3f3;
		}
		[data-xaml="ToggleSwitch"] .toggle-track.on::after {
			left: 23px;
			background: #1c1c1c;
		}
		[data-xaml="PersonPicture"] {
			display: inline-flex;
			align-items: center;
			justify-content: center;
			flex-shrink: 0;
			overflow: hidden;
			border-radius: 50%;
			background: rgba(255, 255, 255, 0.12);
			color: #ffffff;
			font-family: "Segoe UI Variable Text", "Segoe UI", var(--vscode-font-family, sans-serif);
			font-weight: 600;
			line-height: 1;
		}
		[data-xaml="PersonPicture"] .person-initials {
			font-size: 0.38em;
		}
		[data-xaml="PersonPicture"] img {
			width: 100%;
			height: 100%;
			object-fit: cover;
			display: block;
		}
		[data-xaml="Image"].placeholder {
			display: flex;
			align-items: center;
			justify-content: center;
			box-sizing: border-box;
			background: rgba(255, 255, 255, 0.04);
			border: 1px solid rgba(255, 255, 255, 0.28);
			color: rgba(255, 255, 255, 0.55);
		}
		[data-xaml="Image"].placeholder .image-placeholder-mark {
			width: 70%;
			height: 70%;
			stroke: currentColor;
			fill: none;
			stroke-width: 1.5;
		}
		[data-xaml="Canvas"] {
			position: relative;
			overflow: hidden;
			box-sizing: border-box;
		}
		[data-xaml="Viewbox"] {
			overflow: hidden;
			box-sizing: border-box;
			display: flex;
			align-items: center;
			justify-content: center;
		}
		[data-xaml="Viewbox"] > .viewbox-content {
			flex: 0 0 auto;
			width: max-content;
			height: max-content;
			max-width: none;
			max-height: none;
			transform-origin: center center;
		}
		[data-xaml="RelativePanel"] {
			position: relative;
			box-sizing: border-box;
		}
		[data-xaml="SplitView"] {
			position: relative;
			display: flex;
			flex-direction: row;
			align-items: stretch;
			width: max-content;
			max-width: 100%;
			height: max-content;
			box-sizing: border-box;
		}
		[data-xaml="SplitView.Pane"],
		[data-xaml="SplitView.Content"] {
			box-sizing: border-box;
		}
		[data-xaml="Rectangle"] {
			display: block;
			box-sizing: border-box;
			flex-shrink: 0;
		}
		[data-xaml="CalendarView"] {
			min-width: 280px;
			max-width: 100%;
			padding: 4px 4px 8px;
			font-family: "Segoe UI Variable Text", "Segoe UI", var(--vscode-font-family, sans-serif);
			font-size: 14px;
			line-height: 20px;
			color: var(--vscode-foreground);
			background: rgba(255, 255, 255, 0.04);
			border: 1px solid rgba(255, 255, 255, 0.08);
			border-radius: 8px;
		}
		[data-xaml="CalendarView"] .cal-header {
			display: flex;
			flex-direction: row;
			align-items: center;
			justify-content: space-between;
			padding: 8px 12px 4px;
		}
		[data-xaml="CalendarView"] .cal-title {
			font-weight: 600;
		}
		[data-xaml="CalendarView"] .cal-nav {
			display: flex;
			flex-direction: column;
			align-items: center;
			line-height: 0.85;
			opacity: 0.85;
		}
		[data-xaml="CalendarView"] .cal-nav-btn {
			font-size: 10px;
			width: 16px;
			text-align: center;
		}
		[data-xaml="CalendarView"] .cal-dows,
		[data-xaml="CalendarView"] .cal-grid {
			display: grid;
			grid-template-columns: repeat(7, 1fr);
			padding: 0 8px;
		}
		[data-xaml="CalendarView"] .cal-dow {
			display: flex;
			align-items: center;
			justify-content: center;
			height: 32px;
			font-size: 12px;
			opacity: 0.7;
		}
		[data-xaml="CalendarView"] .cal-day {
			display: flex;
			align-items: center;
			justify-content: center;
			height: 40px;
			border-radius: 50%;
			text-align: center;
		}
		[data-xaml="CalendarView"] .cal-day.out-of-scope {
			opacity: 0.4;
		}
		[data-xaml="CalendarView"] .cal-day.today {
			background: #cbb8e0;
			color: #1c1c1c;
			opacity: 1;
		}
		[data-xaml="CalendarView"] .cal-day.selected:not(.today) {
			box-shadow: inset 0 0 0 2px #cbb8e0;
		}
		[data-xaml="CalendarView"] .cal-day.group-label {
			font-size: 11px;
			line-height: 1.1;
			border-radius: 8px;
		}
		[data-element-line] { cursor: pointer; }
		[data-xaml="ProgressBar"] {
			display: flex;
			align-items: center;
			min-width: 0;
			overflow: hidden;
		}
		[data-xaml="ProgressBar"] .progress-track {
			position: relative;
			width: 100%;
			height: 1px;
			background: rgba(255, 255, 255, 0.18);
			border-radius: 1px;
		}
		[data-xaml="ProgressBar"] .progress-fill {
			position: absolute;
			left: 0;
			top: 50%;
			height: 4px;
			border-radius: 2px;
			background: #cbb8e0;
			transform: translateY(-50%);
		}
		[data-xaml="ProgressBar"].paused .progress-fill {
			background: #fce100;
		}
		[data-xaml="ProgressBar"].error .progress-fill {
			background: #ff99a4;
		}
		[data-xaml="ProgressBar"].indeterminate .progress-fill {
			width: 30%;
			animation: progress-indeterminate 1.6s ease-in-out infinite;
		}
		@keyframes progress-indeterminate {
			0% { left: -30%; }
			100% { left: 100%; }
		}
		.spinner {
			width: 32px;
			height: 32px;
			border: 3px solid var(--vscode-widget-border, rgba(128, 128, 128, 0.35));
			border-top-color: var(--vscode-progressBar-background, #0078d4);
			border-radius: 50%;
			animation: spin 0.8s linear infinite;
			box-sizing: border-box;
		}
		@keyframes spin {
			to { transform: rotate(360deg); }
		}
		.xaml-hover-tooltip {
			position: fixed;
			z-index: 10000;
			max-width: 320px;
			padding: 6px 8px;
			border-radius: 4px;
			font-size: 12px;
			line-height: 1.4;
			pointer-events: none;
			color: var(--vscode-editorHoverWidget-foreground, var(--vscode-foreground));
			background: var(--vscode-editorHoverWidget-background, var(--vscode-editor-background));
			border: 1px solid var(--vscode-editorHoverWidget-border, var(--vscode-widget-border, rgba(128, 128, 128, 0.35)));
			box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
		}
		.xaml-hover-outline {
			position: fixed;
			z-index: 9999;
			pointer-events: none;
			box-sizing: border-box;
			opacity: 0;
			visibility: hidden;
			transition: opacity 0.5s ease, visibility 0.5s ease;
			box-shadow:
				0 0 0 2px rgba(var(--xaml-hover-rgb), 0.7),
				rgba(var(--xaml-hover-rgb), 0.3) 0px 1px 2px 0px,
				rgba(var(--xaml-hover-rgb), 0.15) 0px 2px 6px 2px;
		}
		.xaml-hover-outline.is-visible {
			opacity: 1;
			visibility: visible;
		}
	</style>
</head>
<body>
${bodyContent}
${clickScript}
</body>
</html>`;
}

export function parseXamlToHtml(
	source: string,
	output: vscode.OutputChannel,
	htmlOptions?: PreviewHtmlOptions
): ParseResult {
	const hasUnknown = { value: false };

	try {
		const roots = parseXamlToNodes(source);
		if (roots.length === 0) {
			return {
				html: buildDocumentHtml(
					`<p style="padding: 16px; margin: 0;">Empty XAML document.</p>`,
					htmlOptions
				),
				hasUnknown: false,
				error: 'Empty XAML document.',
			};
		}

		assignLines(source, roots);

		const ctx: RenderContext = {
			output,
			hasUnknown,
			showUnknownTags: htmlOptions?.showUnknownTags ?? false,
			styleRegistry: htmlOptions?.styleRegistry,
			resolveImageSrc: htmlOptions?.resolveImageSrc,
			renderChildren: (nodes) => nodes.map((n) => renderNode(n, ctx)).join(''),
			renderNode: (node) => renderNode(node, ctx),
		};

		let bodyContent = '';
		if (roots.length === 1 && ROOT_TAGS.has(roots[0].localName)) {
			const root = roots[0];
			processProperties(root, ctx);
			bodyContent = ctx.renderChildren(root.children);
		} else {
			bodyContent = roots.map((n) => renderNode(n, ctx)).join('');
		}

		return {
			html: buildDocumentHtml(
				bodyContent ||
					'<p style="padding:16px;margin:0;">No preview content.</p>',
				htmlOptions
			),
			hasUnknown: hasUnknown.value,
		};
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		output.appendLine(`XML parse error: ${message}`);
		return {
			html: buildDocumentHtml(
				`<p style="padding: 16px; margin: 0;">Failed to parse XAML: ${message}</p>`,
				htmlOptions
			),
			hasUnknown: false,
			error: message,
		};
	}
}

function renderNode(node: XmlNode, ctx: RenderContext): string {
	const handler = handlers[node.localName];
	if (!handler) {
		if (ctx.showUnknownTags) {
			ctx.hasUnknown.value = true;
			ctx.output.appendLine(
				`Unknown tag: [${node.tagName}] : [${node.line}]`
			);
		}
		return '';
	}
	return handler(node, ctx);
}
