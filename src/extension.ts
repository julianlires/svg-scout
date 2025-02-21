// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { glob } from 'glob';

// This will store our WebView panel
let iconsPanel: vscode.WebviewPanel | undefined;

interface IconItem {
  name: string;
  svg: string;
  filePath: string;
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	console.log('Extension "SVG Scout" is now active!');

	// Register the command that will show the icons panel
	let disposable = vscode.commands.registerCommand('svgScout.showIcons', async () => {
		// Create and show panel
		if (iconsPanel) {
			iconsPanel.reveal(vscode.ViewColumn.One);
		} else {
			iconsPanel = vscode.window.createWebviewPanel(
				'svgScout',
				'SVG Scout',
				vscode.ViewColumn.One,
				{
					enableScripts: true,
					enableCommandUris: true
				}
			);

			// Handle panel disposal
			iconsPanel.onDidDispose(() => {
				iconsPanel = undefined;
			});
		}

		// Find all SVG icons in the workspace
		const icons = await findSvgIcons();

		// Update the webview content
		updateWebview(iconsPanel, icons);
	});

	context.subscriptions.push(disposable);
}

async function findSvgIcons(): Promise<IconItem[]> {
	const iconItemsList: IconItem[] = [];

	if (!vscode.workspace.workspaceFolders) {
		return iconItemsList;
	}

	const workspaceRoot = vscode.workspace.workspaceFolders[0].uri.fsPath;

	// Get files using glob with gitignore patterns
	const files = await glob('**/*.{jsx,tsx,js,ts,html,vue}', {
		cwd: workspaceRoot,
		absolute: true,
		ignore: [
			'**/node_modules/**',
			// Read and include .gitignore patterns
			...(await getGitignorePatterns(workspaceRoot))
		]
	});

	for (const file of files) {
		const content = await fs.promises.readFile(file, 'utf8');
		const svgMatches = content.match(/<svg[^>]*>[\s\S]*?<\/svg>/g);
		const iconItemsPartial = svgMatches?.map((svg, index) => {
			return {
				name: path.basename(file).split('.').shift() || `Icon ${index + 1}`,
				svg,
				filePath: file
			} as IconItem;
		});

		if (iconItemsPartial) {
			iconItemsList.push(...iconItemsPartial);
		}
	}

	return iconItemsList;
}

async function getGitignorePatterns(workspaceRoot: string): Promise<string[]> {
	try {
		const gitignorePath = path.join(workspaceRoot, '.gitignore');
		const gitignoreContent = await fs.promises.readFile(gitignorePath, 'utf8');
		return gitignoreContent
			.split('\n')
			.map(line => line.trim())
			.filter(line => line && !line.startsWith('#'))
			.map(pattern => `**/${pattern}`);
	} catch (error) {
		// If .gitignore doesn't exist, return empty array
		return [];
	}
}

function cleanSvg(svg: string): string {
  // Remove TSX/JSX comments and props
  console.log(svg);
  let cleanSvg = svg;
  cleanSvg = cleanSvg.replace(/<!--[\s\S]*?-->/g, '');
  cleanSvg = cleanSvg.replace(/<svg[^>]*>/, '<svg>');
  cleanSvg = cleanSvg.replace(/{...props}/g, '');

  return cleanSvg;
}

function updateWebview(panel: vscode.WebviewPanel, icons: IconItem[]) {
	// Create URI for opening files
	const getFileUri = (filePath: string) => {
		return vscode.Uri.file(filePath).toString();
	};

	panel.webview.html = `
		<!DOCTYPE html>
		<html>
		<head>
			<meta charset="UTF-8">
			<style>
				.icon-grid {
					display: grid;
					grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
					gap: 16px;
					padding: 16px;
				}
				.icon-container {
					border: 1px solid #ccc;
					padding: 8px;
					text-align: center;
				}
				.icon-container svg {
					width: 48px;
					height: 48px;
				}
				.icon-code {
					margin-top: 8px;
					font-size: 12px;
					overflow: hidden;
					text-overflow: ellipsis;
				}
				.file-link {
					color: var(--vscode-textLink-foreground);
					text-decoration: none;
					cursor: pointer;
				}
				.file-link:hover {
					text-decoration: underline;
				}
			</style>
		</head>
		<body>
			<div class="icon-grid">
				${icons.map((icon) => `
					<div class="icon-container">
						${icon.svg}
						<div class="icon-code">
							<a class="file-link" href="command:vscode.open?${encodeURIComponent(JSON.stringify([getFileUri(icon.filePath)]))}">
								${icon.name}
							</a>
						</div>
					</div>
				`).join('')}
			</div>
		</body>
		</html>
	`;
}

function escapeHtml(unsafe: string): string {
	return unsafe
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
}

// This method is called when your extension is deactivated
export function deactivate() {}
