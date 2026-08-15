export interface MappedCss {
	styles: Record<string, string>;
	horizontal?: string;
	vertical?: string;
}

export function toCssLength(value: string): string | undefined {
	const v = value.trim();
	if (!v || /^auto$/i.test(v)) {
		return undefined;
	}
	if (v === '*') {
		return '100%';
	}
	if (/^\d+(\.\d+)?$/.test(v)) {
		return `${v}px`;
	}
	if (/^\d+(\.\d+)?\*$/.test(v)) {
		return '100%';
	}
	return v;
}

export function toCssSpacing(value: string): string {
	return value
		.split(',')
		.map((part) => {
			const t = part.trim();
			if (/^\d+(\.\d+)?$/.test(t)) {
				return `${t}px`;
			}
			return t;
		})
		.join(' ');
}

export function mapAlignment(
	horizontal?: string,
	vertical?: string
): Record<string, string> {
	const styles: Record<string, string> = {};

	switch ((horizontal ?? '').toLowerCase()) {
		case 'left':
			styles['width'] = 'fit-content';
			styles['max-width'] = '100%';
			styles['margin-right'] = 'auto';
			break;
		case 'center':
			styles['width'] = 'fit-content';
			styles['max-width'] = '100%';
			styles['margin-left'] = 'auto';
			styles['margin-right'] = 'auto';
			break;
		case 'right':
			styles['width'] = 'fit-content';
			styles['max-width'] = '100%';
			styles['margin-left'] = 'auto';
			break;
		case 'stretch':
			styles['width'] = '100%';
			break;
	}

	switch ((vertical ?? '').toLowerCase()) {
		case 'top':
			styles['align-self'] = 'flex-start';
			break;
		case 'center':
			styles['align-self'] = 'center';
			break;
		case 'bottom':
			styles['align-self'] = 'flex-end';
			break;
		case 'stretch':
			styles['align-self'] = 'stretch';
			break;
	}

	return styles;
}

function mapFontFamily(value: string): string {
	const v = value.trim();
	if (/^XamlAutoFontFamily$/i.test(v)) {
		return '"Segoe UI", sans-serif';
	}
	if (v.includes(',') || /^["'].*["']$/.test(v)) {
		return v;
	}
	if (/\s/.test(v)) {
		return `"${v.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
	}
	return v;
}

/** WinUI FontWeights → CSS numeric weights (CSS only understands `normal`/`bold` as names). */
const FONT_WEIGHT_MAP: Record<string, string> = {
	thin: '100',
	extralight: '200',
	ultralight: '200',
	light: '300',
	semilight: '350',
	normal: '400',
	regular: '400',
	medium: '500',
	semibold: '600',
	demibold: '600',
	bold: '700',
	extrabold: '800',
	ultrabold: '800',
	black: '900',
	heavy: '900',
	extrablack: '950',
	ultrablack: '950',
};

function mapFontWeight(value: string): string {
	const named = FONT_WEIGHT_MAP[value.toLowerCase()];
	if (named) {
		return named;
	}
	return value;
}

/**
 * Maps a XAML property name/value to CSS. Unknown properties return empty styles.
 */
export function mapPropertyToCss(propLower: string, rawValue: string): MappedCss {
	const styles: Record<string, string> = {};
	const value = rawValue.trim();
	if (!value) {
		return { styles };
	}

	switch (propLower) {
		case 'width': {
			const css = toCssLength(value);
			if (css) {
				styles['width'] = css;
			}
			break;
		}
		case 'height': {
			const css = toCssLength(value);
			if (css) {
				styles['height'] = css;
			}
			break;
		}
		case 'minwidth': {
			const css = toCssLength(value);
			if (css) {
				styles['min-width'] = css;
			}
			break;
		}
		case 'minheight': {
			const css = toCssLength(value);
			if (css) {
				styles['min-height'] = css;
			}
			break;
		}
		case 'maxwidth': {
			const css = toCssLength(value);
			if (css) {
				styles['max-width'] = css;
			}
			break;
		}
		case 'maxheight': {
			const css = toCssLength(value);
			if (css) {
				styles['max-height'] = css;
			}
			break;
		}
		case 'margin':
			styles['margin'] = toCssSpacing(value);
			break;
		case 'padding':
			styles['padding'] = toCssSpacing(value);
			break;
		case 'background':
			styles['background-color'] = value;
			break;
		case 'foreground':
			styles['color'] = value;
			break;
		case 'fontsize': {
			const css = toCssLength(value);
			if (css) {
				styles['font-size'] = css;
			}
			break;
		}
		case 'fontweight':
			styles['font-weight'] = mapFontWeight(value);
			break;
		case 'fontfamily':
			styles['font-family'] = mapFontFamily(value);
			break;
		case 'lineheight': {
			const css = toCssLength(value);
			if (css) {
				styles['line-height'] = css;
			}
			break;
		}
		case 'istextselectionenabled':
			if (/^(false|0)$/i.test(value)) {
				styles['user-select'] = 'none';
			} else {
				styles['user-select'] = 'text';
			}
			break;
		case 'opacity':
			styles['opacity'] = value;
			break;
		case 'horizontalalignment':
			return { styles, horizontal: value };
		case 'verticalalignment':
			return { styles, vertical: value };
		case 'borderbrush':
			styles['border-color'] = value;
			styles['border-style'] = 'solid';
			break;
		case 'borderthickness':
			styles['border-width'] = toCssSpacing(value);
			styles['border-style'] = styles['border-style'] ?? 'solid';
			break;
		case 'cornerradius':
			styles['border-radius'] = toCssSpacing(value);
			break;
		case 'fill':
			styles['background-color'] = value;
			break;
		case 'stroke':
			styles['border-color'] = value;
			styles['border-style'] = 'solid';
			break;
		case 'strokethickness': {
			const css = toCssLength(value);
			if (css) {
				styles['border-width'] = css;
			}
			styles['border-style'] = styles['border-style'] ?? 'solid';
			break;
		}
		case 'textwrapping':
			switch (value.toLowerCase()) {
				case 'nowrap':
					styles['white-space'] = 'nowrap';
					break;
				case 'wrap':
				case 'wrapwholewords':
					styles['white-space'] = 'normal';
					styles['overflow-wrap'] = 'break-word';
					break;
			}
			break;
		default:
			break;
	}

	return { styles };
}
