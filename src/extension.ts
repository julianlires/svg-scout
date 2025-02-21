import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { glob } from 'glob';

// This will store our WebView panel
let iconsPanel: vscode.WebviewPanel | undefined;

interface SVGItem {
  name: string;
  svg: string;
  filePath: string;
}

export function activate(context: vscode.ExtensionContext) {
  console.log('Extension "SVG Scout" is now active!');

  let disposable = vscode.commands.registerCommand('svg-scout.showIcons', async () => {
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

      iconsPanel.webview.html = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            .loading {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              position: fixed;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              text-align: center;
            }
            .loading-spinner {
              width: 50px;
              height: 50px;
              border: 5px solid #f3f3f3;
              border-top: 5px solid var(--vscode-textLink-foreground);
              border-radius: 50%;
              animation: spin 1s linear infinite;
              margin-bottom: 16px;
            }
            .loading-text {
              color: var(--vscode-foreground);
              font-family: var(--vscode-font-family);
            }
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          </style>
        </head>
        <body>
          <div class="loading">
            <div class="loading-spinner"></div>
            <div class="loading-text">Searching SVGs in files...</div>
          </div>
        </body>
        </html>
      `;

      iconsPanel.onDidDispose(() => {
        iconsPanel = undefined;
      });
    }

    const svgs = await findSvgIcons();

    updateWebview(iconsPanel, svgs);
  });

  context.subscriptions.push(disposable);
}

async function findSvgIcons(): Promise<SVGItem[]> {
  const svgItemsList: SVGItem[] = [];

  if (!vscode.workspace.workspaceFolders) {
    return svgItemsList;
  }

  const workspaceRoot = vscode.workspace.workspaceFolders[0].uri.fsPath;

  const files = await glob('**/*.{jsx,tsx,js,ts,html,vue}', {
    cwd: workspaceRoot,
    absolute: true,
    ignore: [
      '**/node_modules/**',
      // Include .gitignore patterns
      ...(await getGitignorePatterns(workspaceRoot))
    ]
  });

  for (const file of files) {
    const content = await fs.promises.readFile(file, 'utf8');
    const svgMatches = content.match(/<svg[^>]*>[\s\S]*?<\/svg>/g);
    const svgItemsPartial = svgMatches?.map((svg, index) => {
      return {
        name: path.basename(file).split('.').shift() || `Icon ${index + 1}`,
        svg: cleanSvg(svg),
        filePath: file
      } as SVGItem;
    });

    if (svgItemsPartial) {
      svgItemsList.push(...svgItemsPartial);
    }
  }

  return svgItemsList;
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
    return [];
  }
}

function cleanSvg(svg: string): string {
  let cleanSvg = svg;

  cleanSvg = cleanSvg.replace(/<!--[\s\S]*?-->/g, '');

  // Clean up TSX/JSX expressions
  cleanSvg = cleanSvg.replace(/{...props}/g, '');
  cleanSvg = cleanSvg.replace(/{(\d+)}/g, '"$1"'); // Replace {3} with "3"
  cleanSvg = cleanSvg.replace(/{"([^"]*)"}/g, '"$1"'); // Replace {"text"} with "text"
  cleanSvg = cleanSvg.replace(/{\'([^\']*)\'}/g, '"$1"'); // Replace {'text'} with "text"

  // If the SVG doesn't have a viewBox, add one based on height and width
  if (!cleanSvg.includes('viewBox=')) {
    const heightMatch = cleanSvg.match(/height="([0-9.]+)([^"]*)"/);
    const widthMatch = cleanSvg.match(/width="([0-9.]+)([^"]*)"/);

    if (heightMatch && widthMatch) {
      const viewBox = `0 0  ${widthMatch[1]} ${heightMatch[1]}`;
      cleanSvg = cleanSvg.replace(/<svg/, `<svg viewBox="${viewBox}"`);
    }
  }

  return cleanSvg;
}

function updateWebview(panel: vscode.WebviewPanel, icons: SVGItem[]) {
  const isDarkTheme = vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.Dark;
  const svgColor = isDarkTheme ? '#ffffff' : '#000000';
  const textColor = isDarkTheme ? '#ffffff' : '#000000';
  const getFileUri = (filePath: string) => vscode.Uri.file(filePath).toString();

  panel.webview.html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body {
          margin: 0;
          padding: 0;
          height: 100vh;
          display: flex;
          color: ${textColor};
        }
        .container {
          display: flex;
          flex-direction: row;
          width: 100%;
          height: 100%;
        }
        .left-panel {
          flex: 1;
          overflow-y: auto;
          border-right: 1px solid var(--vscode-panel-border);
        }
        .right-panel {
          width: 300px;
          padding: 16px;
          background: var(--vscode-editor-background);
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .icon-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
          gap: 16px;
          padding: 16px;
        }
        .icon-grid a {
          text-decoration: none;
          color: inherit;
        }
        .icon-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          border: 1px solid var(--vscode-panel-border);
          border-radius: 4px;
          padding: 8px;
          text-align: center;
          cursor: pointer;
          transition: background-color 0.2s;
          overflow: hidden;
          box-sizing: border-box;
          gap: 12px;
          height: 100%;
        }
        .icon-container:hover {
          background-color: var(--vscode-list-hoverBackground);
        }
        .icon-container svg {
          width: 100%;
          height: 100%;
          max-width: 96px;
          max-height: 96px;
          color: ${svgColor};
        }
        .icon-name {

            font-size: 12px;
            -webkit-line-clamp: 3;
            height: 3.6em;
          }
        .preview-container {
          text-align: center;
        }
        .preview-container svg {
          width: 200px;
          height: 200px;
          margin: 20px 0;
          color: ${svgColor};
        }
        .preview-info {
          margin-top: 16px;
          font-family: var(--vscode-font-family);
          color: var(--vscode-foreground);
        }
        .file-link {
          color: var(--vscode-textLink-foreground);
          text-decoration: none;
        }
        .file-link:hover {
          text-decoration: underline;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="left-panel">
          <div class="icon-grid">
            ${icons.map((icon, index) => `
              <a href="command:vscode.open?${encodeURIComponent(JSON.stringify([getFileUri(icon.filePath)]))}">
                <div class="icon-container" onmouseover="showPreview(${index})">
                  ${icon.svg}
                  <div class="icon-name">
                    ${icon.name}
                  </div>
                </div>
              </a>
            `).join('')}
          </div>
        </div>
        <div class="right-panel">
          <div id="preview" class="preview-container">
            <h3>Hover over an icon to preview</h3>
          </div>
        </div>
      </div>
      <script>
        const icons = ${JSON.stringify(icons)};

        function showPreview(index) {
          const icon = icons[index];
          const preview = document.getElementById('preview');
          preview.innerHTML = \`
            \${icon.svg}
            <div class="preview-info">
              <h3>\${icon.name}</h3>
              <a class="file-link" href="command:vscode.open?\${encodeURIComponent(JSON.stringify([icon.filePath]))}">
                Open file
              </a>
            </div>
          \`;
        }
      </script>
    </body>
    </html>
  `;
}

// This method is called when your extension is deactivated
export function deactivate() {}
