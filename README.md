# WinUI 3 Preview

A Visual Studio Code extension that renders a live visual preview of WinUI 3 XAML files without running the app.

![Preview](https://raw.githubusercontent.com/rafaelmuricy/WinUIPreview/refs/heads/main/examples/ezgif-42994a32c7db7a62.gif)

Open a `.xaml` file and use **Preview XAML** from the editor title bar or the command palette. The markup is parsed and shown as HTML in a webview, so you can inspect layout and controls while you edit.

## Features

- Preview `Page`, `UserControl`, and `Window` XAML in the sidebar or in an editor tab
- Refresh the preview when you save the file or switch to another XAML editor
- Hover a control in the preview to highlight it
- Open the matching `.xaml.cs` code-behind with **View Code**
- Resolve local images, including `ms-appx:///` paths
- Apply styles and resources from the workspace when they can be resolved

The preview covers common WinUI 3 layouts and controls, including Grid, StackPanel, NavigationView, ListView, buttons, text inputs, pickers, and more.

## Usage

1. Open a `.xaml` file.
2. Run **Preview XAML**, or click the preview icon in the editor title bar.
3. Edit and save the file to update the preview.

## Settings

| Setting                            | Description                                                                    | Default   |
| ---------------------------------- | ------------------------------------------------------------------------------ | --------- |
| `winui-3-preview.openTarget`       | Open the preview in the **sidebar** activity bar panel or in an **editor** tab | `sidebar` |
| `winui-3-preview.hoverShadowColor` | Highlight color when hovering a control in the preview                         | `#7c3aed` |
| `winui-3-preview.showUnknownTags`  | Show unrecognized XAML tags in the Output channel                              | `false`   |

## Requirements

- Visual Studio Code 1.125 or later
- A workspace that contains WinUI 3 XAML files

This is a design-time preview. It does not execute C# code-behind or run the WinUI runtime.

## Development

```bash
pnpm install
pnpm compile
```

Press **F5** in VS Code to launch the Extension Development Host.
