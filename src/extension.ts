import * as vscode from 'vscode';
import {
	disposePreview,
	openXamlPreview,
	refreshPreviewForActiveEditor,
	refreshPreviewForSavedDocument,
	registerPreviewViewProvider,
} from './preview';

const HAS_CODE_BEHIND_CONTEXT = 'winui-3-preview.hasCodeBehind';

function isXamlDocument(document: vscode.TextDocument | undefined): document is vscode.TextDocument {
	if (!document) {
		return false;
	}

	return document.languageId === 'xaml' || document.uri.fsPath.toLowerCase().endsWith('.xaml');
}

function getCodeBehindUri(xamlUri: vscode.Uri): vscode.Uri {
	return vscode.Uri.file(`${xamlUri.fsPath}.cs`);
}

async function hasCodeBehind(xamlUri: vscode.Uri): Promise<boolean> {
	try {
		await vscode.workspace.fs.stat(getCodeBehindUri(xamlUri));
		return true;
	} catch {
		return false;
	}
}

async function updateHasCodeBehindContext(editor: vscode.TextEditor | undefined): Promise<void> {
	const document = editor?.document;
	const exists = isXamlDocument(document)
		? await hasCodeBehind(document.uri)
		: false;

	await vscode.commands.executeCommand('setContext', HAS_CODE_BEHIND_CONTEXT, exists);
}

async function openCodeBehind(): Promise<void> {
	const document = vscode.window.activeTextEditor?.document;
	if (!isXamlDocument(document)) {
		return;
	}

	const codeBehindUri = getCodeBehindUri(document.uri);
	if (!(await hasCodeBehind(document.uri))) {
		return;
	}

	await vscode.window.showTextDocument(codeBehindUri);
}

export function activate(context: vscode.ExtensionContext) {
	registerPreviewViewProvider(context);

	const openPreviewDisposable = vscode.commands.registerCommand(
		'winui-3-preview.openPreview',
		() => {
			openXamlPreview();
		}
	);

	const viewCodeDisposable = vscode.commands.registerCommand(
		'winui-3-preview.viewCode',
		() => {
			openCodeBehind();
		}
	);

	const saveDisposable = vscode.workspace.onDidSaveTextDocument((document) => {
		refreshPreviewForSavedDocument(document);
	});

	const editorChangeDisposable = vscode.window.onDidChangeActiveTextEditor((editor) => {
		updateHasCodeBehindContext(editor);
		refreshPreviewForActiveEditor(editor);
	});

	const codeBehindWatcher = vscode.workspace.createFileSystemWatcher('**/*.xaml.cs');
	const refreshCodeBehindContext = () => {
		updateHasCodeBehindContext(vscode.window.activeTextEditor);
	};

	updateHasCodeBehindContext(vscode.window.activeTextEditor);

	context.subscriptions.push(
		openPreviewDisposable,
		viewCodeDisposable,
		saveDisposable,
		editorChangeDisposable,
		codeBehindWatcher,
		codeBehindWatcher.onDidCreate(refreshCodeBehindContext),
		codeBehindWatcher.onDidDelete(refreshCodeBehindContext)
	);
}

export function deactivate() {
	disposePreview();
}
