import { mapAlignment, mapPropertyToCss, toCssLength } from './cssMapping';
import { resolveImplicitStyle, resolveStyleAttribute } from './styleParser';
import type { RenderContext, XmlNode } from './types';
import { getAttr, localPropName } from './xml';

const GLOBAL_STYLE_PROPS = new Set([
	'width',
	'height',
	'minwidth',
	'minheight',
	'maxwidth',
	'maxheight',
	'margin',
	'padding',
	'background',
	'foreground',
	'fontsize',
	'fontweight',
	'fontfamily',
	'lineheight',
	'istextselectionenabled',
	'opacity',
	'horizontalalignment',
	'verticalalignment',
	'style',
	'tapped',
	'click',
	'toggled',
	'checked',
	'unchecked',
	'loaded',
	'textchanged',
	'valuechanged',
	'datechanged',
	'selecteddatechanged',
	'timechanged',
	'selectedtimechanged',
	'closed',
	'closebuttonclick',
	'selectionchanged',
	'tooltipservice.tooltip',
	'textwrapping',
]);

/** Tags that use HorizontalAlignment to align children, not the element itself. */
const CONTENT_HORIZONTAL_ALIGN_TAGS = new Set(['stackpanel']);

/** Panels that sit in the center of the parent when alignment is omitted. */
const DEFAULT_CENTER_IN_PARENT_TAGS = new Set(['canvas', 'relativepanel']);

const TAG_SPECIFIC_PROPS: Record<string, Set<string>> = {
	stackpanel: new Set(['orientation', 'spacing']),
	border: new Set(['borderbrush', 'borderthickness', 'cornerradius']),
	scrollviewer: new Set(['horizontalscrollmode', 'verticalscrollmode']),
	button: new Set(['content']),
	togglebutton: new Set(['content', 'ischecked']),
	hyperlinkbutton: new Set(['content', 'navigateuri']),
	textblock: new Set(['text', 'textwrapping']),
	richtextblock: new Set(['istextselectionenabled', 'linestackingstrategy']),
	paragraph: new Set([]),
	run: new Set(['text']),
	textbox: new Set(['text', 'placeholdertext', 'header']),
	autosuggestbox: new Set(['text', 'placeholdertext', 'header']),
	toggleswitch: new Set(['header', 'oncontent', 'offcontent', 'ison']),
	passwordbox: new Set([
		'header',
		'placeholdertext',
		'password',
		'passwordrevealmode',
		'maxlength',
	]),
	numberbox: new Set([
		'header',
		'placeholdertext',
		'value',
		'minimum',
		'maximum',
		'smallchange',
		'largechange',
		'spinbuttonplacementmode',
	]),
	combobox: new Set([
		'header',
		'placeholdertext',
		'selectedindex',
		'selecteditem',
		'iseditable',
	]),
	comboboxitem: new Set(['content', 'isselected']),
	slider: new Set([
		'header',
		'value',
		'minimum',
		'maximum',
		'stepfrequency',
		'tickfrequency',
		'tickplacement',
		'orientation',
	]),
	radiobutton: new Set(['content', 'groupname', 'ischecked']),
	checkbox: new Set(['content', 'ischecked', 'isthreestate']),
	ratingcontrol: new Set([
		'caption',
		'maxrating',
		'value',
		'placeholdervalue',
		'isclearenabled',
		'isreadonly',
	]),
	infobar: new Set([
		'title',
		'message',
		'severity',
		'isopen',
		'isclosable',
	]),
	'infobar.actionbutton': new Set([]),
	grid: new Set([
		'grid.row',
		'grid.column',
		'grid.rowspan',
		'grid.columnspan',
		'rowspacing',
		'columnspacing',
	]),
	progressring: new Set(['isactive']),
	progressbar: new Set([
		'value',
		'minimum',
		'maximum',
		'showpaused',
		'showerror',
		'isindeterminate',
	]),
	datepicker: new Set([
		'header',
		'dayvisible',
		'monthvisible',
		'yearvisible',
		'date',
		'selecteddate',
		'minyear',
		'maxyear',
	]),
	timepicker: new Set([
		'header',
		'clockidentifier',
		'minuteincrement',
		'time',
		'selectedtime',
	]),
	fonticon: new Set(['glyph']),
	listview: new Set([
		'header',
		'selectedindex',
		'selecteditem',
		'selectionmode',
		'itemssource',
		'itemtemplate',
		'itemclick',
		'isitemclickenabled',
	]),
	listviewitem: new Set(['content', 'isselected']),
	'listview.header': new Set([]),
	'listview.itemtemplate': new Set([]),
	navigationview: new Set([
		'isbackbuttonvisible',
		'issettingsvisible',
		'openpanelength',
		'panedisplaymode',
		'selecteditem',
		'selectionchanged',
	]),
	'navigationview.menuitems': new Set([]),
	navigationviewitem: new Set(['content', 'tag']),
	'navigationviewitem.icon': new Set([]),
	datatemplate: new Set([]),
	ellipse: new Set(['fill', 'stroke', 'strokethickness']),
	canvas: new Set([]),
	'canvas.resources': new Set([]),
	relativepanel: new Set([]),
	'relativepanel.resources': new Set([]),
	splitview: new Set([
		'panebackground',
		'ispaneopen',
		'openpanelength',
		'compactpanelength',
		'displaymode',
		'paneplacement',
	]),
	'splitview.pane': new Set([]),
	'splitview.content': new Set([]),
	rectangle: new Set([
		'fill',
		'stroke',
		'strokethickness',
		'radiusx',
		'radiusy',
	]),
	personpicture: new Set(['displayname', 'initials', 'profilepicture']),
	image: new Set(['source', 'stretch']),
	calendardatepicker: new Set([
		'header',
		'placeholdertext',
		'dateformat',
		'date',
		'selecteddate',
	]),
	calendarview: new Set([
		'selectionmode',
		'isoutofscopeenabled',
		'istodayhighlighted',
		'isgrouplabelvisible',
		'displaydate',
		'selecteddate',
	]),
	colorpicker: new Set([
		'color',
		'colorspectrumshape',
		'isalphaenabled',
		'iscolorslidervisible',
		'iscolorchanneltextinputvisible',
		'ishexinputvisible',
		'iscolorpreviewvisible',
		'ismorebuttonvisible',
	]),
	expander: new Set([
		'header',
		'isexpanded',
		'horizontalcontentalignment',
	]),
	'expander.header': new Set([]),
	splitbutton: new Set(['content']),
	'splitbutton.flyout': new Set([]),
	dropdownbutton: new Set(['content']),
	'dropdownbutton.flyout': new Set([]),
	repeatbutton: new Set(['content', 'delay', 'interval']),
	togglesplitbutton: new Set(['content', 'ischecked']),
	'togglesplitbutton.flyout': new Set([]),
	menuflyout: new Set([]),
	menuflyoutitem: new Set(['text']),
	menuflyoutseparator: new Set([]),
	commandbar: new Set(['defaultlabelposition', 'overflowbuttonvisibility']),
	'commandbar.secondarycommands': new Set([]),
	appbarbutton: new Set(['icon', 'label']),
	menubar: new Set([]),
	menubaritem: new Set(['title']),
	gridview: new Set([
		'header',
		'selectedindex',
		'selecteditem',
		'selectionmode',
		'itemssource',
	]),
	gridviewitem: new Set(['content', 'isselected']),
	'gridview.header': new Set([]),
	tabview: new Set([
		'isaddtabbuttonvisible',
		'tabwidthmode',
		'selectedindex',
	]),
	tabviewitem: new Set(['header', 'isselected']),
	richeditbox: new Set([
		'text',
		'placeholdertext',
		'header',
		'acceptsreturn',
		'textwrapping',
	]),
	flipview: new Set([
		'selectedindex',
		'itemssource',
		'borderbrush',
		'borderthickness',
	]),
	flipviewitem: new Set(['content']),
	'flipview.itemtemplate': new Set([]),
	'flipview.itemspanel': new Set([]),
	'flipview.items': new Set([]),
	pipspager: new Set([
		'numberofpages',
		'selectedpageindex',
		'maxvisiblepips',
		'previousbuttonvisibility',
		'nextbuttonvisibility',
	]),
	radiobuttons: new Set(['header', 'selectedindex', 'maxcolumns']),
	selectorbar: new Set([]),
	selectorbaritem: new Set(['text', 'icon', 'isselected']),
	viewbox: new Set(['stretch', 'stretchdirection']),
	'viewbox.child': new Set([]),
	page: new Set([]),
	usercontrol: new Set([]),
	window: new Set([]),
	rowdefinition: new Set(['height', 'width']),
	columndefinition: new Set(['height', 'width']),
};

export interface ProcessedProperties {
	style: string;
	/** Extra HTML attributes including leading space, e.g. ` data-tooltip="..."`. */
	attrs: string;
}

/** Props that any element inside a Grid may carry (attached properties). */
const GRID_ATTACHED_PROPS = new Set([
	'grid.row',
	'grid.column',
	'grid.rowspan',
	'grid.columnspan',
]);

/** Props that any element inside a Canvas may carry (attached properties). */
const CANVAS_ATTACHED_PROPS = new Set([
	'canvas.left',
	'canvas.top',
	'canvas.right',
	'canvas.bottom',
	'canvas.zindex',
]);

const RELATIVE_PANEL_ATTACHED_PROPS = new Set([
	'relativepanel.leftof',
	'relativepanel.rightof',
	'relativepanel.above',
	'relativepanel.below',
	'relativepanel.alignleftwith',
	'relativepanel.aligntopwith',
	'relativepanel.alignrightwith',
	'relativepanel.alignbottomwith',
	'relativepanel.alignhorizontalcenterwith',
	'relativepanel.alignverticalcenterwith',
	'relativepanel.alignleftwithpanel',
	'relativepanel.aligntopwithpanel',
	'relativepanel.alignrightwithpanel',
	'relativepanel.alignbottomwithpanel',
	'relativepanel.alignhorizontalcenterwithpanel',
	'relativepanel.alignverticalcenterwithpanel',
]);

function isIgnorableAttribute(name: string): boolean {
	const n = name.startsWith('@_') ? name.slice(2) : name;
	const lower = n.toLowerCase();
	if (lower === 'xmlns' || lower.startsWith('xmlns:')) {
		return true;
	}
	if (lower.startsWith('xml:')) {
		return true;
	}
	const colon = n.indexOf(':');
	if (colon >= 0) {
		const prefix = n.slice(0, colon).toLowerCase();
		if (prefix === 'x' || prefix === 'xml' || prefix === 'mc') {
			return true;
		}
	}
	return false;
}

function isKnownProperty(tagLocalName: string, propLocalLower: string): boolean {
	if (GLOBAL_STYLE_PROPS.has(propLocalLower)) {
		return true;
	}
	const specific = TAG_SPECIFIC_PROPS[tagLocalName];
	if (specific?.has(propLocalLower)) {
		return true;
	}
	if (GRID_ATTACHED_PROPS.has(propLocalLower)) {
		return true;
	}
	if (CANVAS_ATTACHED_PROPS.has(propLocalLower)) {
		return true;
	}
	if (RELATIVE_PANEL_ATTACHED_PROPS.has(propLocalLower)) {
		return true;
	}
	return false;
}

/**
 * Reports unknown properties and returns CSS + extra HTML attrs (e.g. title tooltip).
 */
export function processProperties(
	node: XmlNode,
	ctx: RenderContext
): ProcessedProperties {
	const styles: Record<string, string> = {};
	let horizontal: string | undefined;
	let vertical: string | undefined;
	const tooltipParts: string[] = [];
	let serviceTooltip: string | undefined;

	const styleValue = getAttr(node, 'Style');
	if (styleValue) {
		const fromStyle = resolveStyleAttribute(styleValue, ctx, node.line);
		Object.assign(styles, fromStyle.styles);
		horizontal = fromStyle.horizontal;
		vertical = fromStyle.vertical;
	} else {
		const fromStyle = resolveImplicitStyle(node.localName, ctx);
		Object.assign(styles, fromStyle.styles);
		horizontal = fromStyle.horizontal;
		vertical = fromStyle.vertical;
	}

	for (const [rawName, rawValue] of Object.entries(node.attributes)) {
		if (isIgnorableAttribute(rawName)) {
			continue;
		}

		const propName = localPropName(rawName);
		const propLower = propName.toLowerCase();

		if (!isKnownProperty(node.localName, propLower)) {
			ctx.hasUnknown.value = true;
			ctx.output.appendLine(
				`Unknown property: [${node.tagName}] > [${propName}] : [${node.line}]`
			);
			continue;
		}

		if (
			propLower === 'style' ||
			propLower === 'content' ||
			propLower === 'text' ||
			propLower === 'placeholdertext' ||
			propLower === 'password' ||
			propLower === 'passwordrevealmode' ||
			propLower === 'maxlength' ||
			propLower === 'header' ||
			propLower === 'value' ||
			propLower === 'minimum' ||
			propLower === 'maximum' ||
			propLower === 'smallchange' ||
			propLower === 'largechange' ||
			propLower === 'spinbuttonplacementmode' ||
			propLower === 'selectedindex' ||
			propLower === 'selecteditem' ||
			propLower === 'selectionmode' ||
			propLower === 'itemssource' ||
			propLower === 'iseditable' ||
			propLower === 'isselected' ||
			propLower === 'stepfrequency' ||
			propLower === 'tickfrequency' ||
			propLower === 'tickplacement' ||
			propLower === 'oncontent' ||
			propLower === 'offcontent' ||
			propLower === 'ison' ||
			propLower === 'ischecked' ||
			propLower === 'isthreestate' ||
			propLower === 'groupname' ||
			propLower === 'orientation' ||
			propLower === 'spacing' ||
			propLower === 'rowspacing' ||
			propLower === 'columnspacing' ||
			propLower === 'isactive' ||
			propLower === 'isindeterminate' ||
			propLower === 'showpaused' ||
			propLower === 'showerror' ||
			propLower === 'dayvisible' ||
			propLower === 'monthvisible' ||
			propLower === 'yearvisible' ||
			propLower === 'date' ||
			propLower === 'selecteddate' ||
			propLower === 'minyear' ||
			propLower === 'maxyear' ||
			propLower === 'clockidentifier' ||
			propLower === 'minuteincrement' ||
			propLower === 'time' ||
			propLower === 'selectedtime' ||
			propLower === 'caption' ||
			propLower === 'maxrating' ||
			propLower === 'placeholdervalue' ||
			propLower === 'isclearenabled' ||
			propLower === 'isreadonly' ||
			propLower === 'title' ||
			propLower === 'message' ||
			propLower === 'severity' ||
			propLower === 'isopen' ||
			propLower === 'isclosable' ||
			propLower === 'horizontalscrollmode' ||
			propLower === 'verticalscrollmode' ||
			propLower === 'isbackbuttonvisible' ||
			propLower === 'issettingsvisible' ||
			propLower === 'openpanelength' ||
			propLower === 'compactpanelength' ||
			propLower === 'panebackground' ||
			propLower === 'ispaneopen' ||
			propLower === 'displaymode' ||
			propLower === 'paneplacement' ||
			propLower === 'itemtemplate' ||
			propLower === 'isitemclickenabled' ||
			propLower === 'panedisplaymode' ||
			propLower === 'tag' ||
			propLower === 'displayname' ||
			propLower === 'initials' ||
			propLower === 'profilepicture' ||
			propLower === 'source' ||
			propLower === 'stretch' ||
			propLower === 'stretchdirection' ||
			propLower === 'dateformat' ||
			propLower === 'isoutofscopeenabled' ||
			propLower === 'istodayhighlighted' ||
			propLower === 'isgrouplabelvisible' ||
			propLower === 'displaydate' ||
			propLower === 'color' ||
			propLower === 'colorspectrumshape' ||
			propLower === 'isalphaenabled' ||
			propLower === 'iscolorslidervisible' ||
			propLower === 'iscolorchanneltextinputvisible' ||
			propLower === 'ishexinputvisible' ||
			propLower === 'iscolorpreviewvisible' ||
			propLower === 'ismorebuttonvisible' ||
			propLower === 'isexpanded' ||
			propLower === 'horizontalcontentalignment' ||
			propLower === 'delay' ||
			propLower === 'interval' ||
			propLower === 'defaultlabelposition' ||
			propLower === 'overflowbuttonvisibility' ||
			propLower === 'icon' ||
			propLower === 'label' ||
			propLower === 'isaddtabbuttonvisible' ||
			propLower === 'tabwidthmode' ||
			propLower === 'acceptsreturn' ||
			propLower === 'numberofpages' ||
			propLower === 'selectedpageindex' ||
			propLower === 'maxvisiblepips' ||
			propLower === 'previousbuttonvisibility' ||
			propLower === 'nextbuttonvisibility' ||
			propLower === 'maxcolumns' ||
			propLower === 'linestackingstrategy' ||
			propLower === 'radiusx' ||
			propLower === 'radiusy' ||
			GRID_ATTACHED_PROPS.has(propLower) ||
			CANVAS_ATTACHED_PROPS.has(propLower) ||
			RELATIVE_PANEL_ATTACHED_PROPS.has(propLower)
		) {
			continue;
		}

		switch (propLower) {
			case 'tapped':
			case 'click':
			case 'toggled':
			case 'checked':
			case 'unchecked':
			case 'loaded':
			case 'textchanged':
			case 'valuechanged':
			case 'datechanged':
			case 'selecteddatechanged':
			case 'timechanged':
			case 'selectedtimechanged':
			case 'closed':
			case 'closebuttonclick':
			case 'selectionchanged':
			case 'itemclick':
			case 'navigateuri':
				if (rawValue.trim()) {
					tooltipParts.push(`${propName}: ${rawValue.trim()}`);
				}
				break;
			case 'tooltipservice.tooltip':
				if (rawValue.trim()) {
					serviceTooltip = rawValue.trim();
				}
				break;
			case 'glyph':
			case 'selecteditem':
				if (isMarkupExtension(rawValue)) {
					tooltipParts.push(rawValue.trim());
				}
				break;
			default: {
				const mapped = mapPropertyToCss(propLower, rawValue);
				Object.assign(styles, mapped.styles);
				if (mapped.horizontal !== undefined) {
					horizontal = mapped.horizontal;
				}
				if (mapped.vertical !== undefined) {
					vertical = mapped.vertical;
				}
				break;
			}
		}
	}

	if (DEFAULT_CENTER_IN_PARENT_TAGS.has(node.localName)) {
		if (getAttr(node, 'HorizontalAlignment') === undefined) {
			horizontal = 'center';
		}
		if (getAttr(node, 'VerticalAlignment') === undefined) {
			vertical = 'center';
		}
	}
	const selfHorizontal = CONTENT_HORIZONTAL_ALIGN_TAGS.has(node.localName)
		? undefined
		: horizontal;
	if (styles['height'] !== undefined && vertical === undefined) {
		vertical = 'center';
	}
	const alignmentStyles = mapAlignment(selfHorizontal, vertical);
	// Explicit Width wins over alignment's fit-content / 100%.
	if (styles['width'] !== undefined) {
		delete alignmentStyles['width'];
	}
	if (styles['max-width'] !== undefined) {
		delete alignmentStyles['max-width'];
	}
	Object.assign(styles, alignmentStyles);

	const style = Object.entries(styles)
		.map(([k, v]) => `${k}: ${v}`)
		.join('; ');

	const attrParts = [` data-element-line="${node.line}"`];
	if (tooltipParts.length) {
		attrParts.push(` data-tooltip="${escapeHtmlAttr(tooltipParts.join('\n'))}"`);
	}
	if (serviceTooltip) {
		attrParts.push(
			` data-tooltip-italic="${escapeHtmlAttr(serviceTooltip)}"`
		);
	}

	return { style, attrs: attrParts.join('') };
}

export function styleAttr(style: string): string {
	return style ? ` style="${escapeHtmlAttr(style)}"` : '';
}

export function hasCssProperty(style: string, prop: string): boolean {
	return new RegExp(`(?:^|;\\s*)${prop}\\s*:`, 'i').test(style);
}

/**
 * Layout host for input controls so they can fill the parent while still
 * honoring Margin (inner flex item) and explicit Width/Height.
 */
export function inputHostStyle(contentStyle: string): string {
	return [
		'display: flex',
		'flex-direction: column',
		'min-width: 0',
		'min-height: 0',
		'box-sizing: border-box',
		hasCssProperty(contentStyle, 'width') ? '' : 'width: 100%',
		hasCssProperty(contentStyle, 'height') ? '' : 'height: 100%',
	]
		.filter(Boolean)
		.join('; ');
}

export function inputFillStyle(contentStyle: string): string {
	return [
		hasCssProperty(contentStyle, 'height') ? '' : 'flex: 1 1 auto',
		'align-self: stretch',
		'min-width: 0',
		'box-sizing: border-box',
		'margin: 0',
		contentStyle,
	]
		.filter(Boolean)
		.join('; ');
}

export function isMarkupExtension(value: string): boolean {
	return /^\s*\{[\s\S]+\}\s*$/.test(value);
}

export function escapeHtmlAttr(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/"/g, '&quot;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;');
}

export function escapeHtmlText(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;');
}

export function headerHtml(header: string | undefined): string {
	const text = header?.trim();
	return text ? `<span class="input-header">${escapeHtmlText(text)}</span>` : '';
}

export { getAttr, localPropName, toCssLength };
