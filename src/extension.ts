import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { glob } from 'glob';
import { cleanSvg } from './utils/svg-cleaner';
import { humanizeFileName } from './utils/string-formatter';
import { getGitignorePatterns } from './utils/gitignore-parser';
import { SVGItem } from './types';

// This will store our WebView panel
let iconsPanel: vscode.WebviewPanel | undefined;
const supportedExtensions = [
  "jsx", "tsx","js","ts", "html", "vue", "erb", "haml", "php", "py", "rb", "scala", "swift", "astro", "svelte", "razor", "cshtml", "aspx", "jsp", "twig", "blade", "liquid", "phtml", "hbs", "handlebars", "mustache", "ejs", "jade", "pug"
];

export function activate(context: vscode.ExtensionContext) {
  console.log('Extension "SVG Scout" is now active!');

  let disposable = vscode.commands.registerCommand('svg-scout.showIcons', async () => {
    if (iconsPanel) {
      iconsPanel.reveal(vscode.ViewColumn.One);
    } else {
      iconsPanel = createWebviewPanel();
    }

    const svgs = await findSvgIcons();
    updateWebview(iconsPanel, svgs);
  });

  context.subscriptions.push(disposable);
}

function createWebviewPanel(): vscode.WebviewPanel {
  const panel = vscode.window.createWebviewPanel(
    'svgScout',
    'SVG Scout',
    vscode.ViewColumn.One,
    {
      enableScripts: true,
      enableCommandUris: true
    }
  );

  panel.webview.html = getInitialHtml();

  panel.onDidDispose(() => {
    iconsPanel = undefined;
  });

  return panel;
}

function getInitialHtml(): string {
  const isDarkTheme = vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.Dark;
  const svgColor = isDarkTheme ? '#ffffff' : '#000000';
  const textColor = isDarkTheme ? '#ffffff' : '#000000';

  return `
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

        .progress-bar-container {
          width: calc(100% - 32px);
          height: 10px;
          background-color: var(--vscode-panel-border);
          border-radius: 4px;
          margin: 0px 16px;
        }

        .progress-bar {
          height: 100%;
          background-color: var(--vscode-progressBar-background);
          border-radius: 4px;
          width: 0;
        }

        .icon-name {
          font-size: 12px;
          -webkit-line-clamp: 3;
          height: 3.6em;
          text-align: center;
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

        .search-container {
          padding: 16px;
          position: sticky;
          top: 0;
          background: var(--vscode-editor-background);
          z-index: 1;
          border-bottom: 1px solid var(--vscode-panel-border);
        }

        .search-input {
          width: 100%;
          padding: 8px;
          font-size: 14px;
          border: 1px solid var(--vscode-panel-border);
          background: var(--vscode-input-background);
          color: var(--vscode-input-foreground);
          border-radius: 4px;
          outline: none;
        }

        .search-input:focus {
          border-color: var(--vscode-focusBorder);
        }

        .no-results {
          padding: 16px;
          text-align: center;
          color: var(--vscode-foreground);
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="left-panel">
          <div class="search-container">
            <input
              type="text"
              class="search-input"
              placeholder="Search SVGs..."
              oninput="filterIcons(this.value)"
            >
          </div>
          <div class="progress-bar-container">
            <div class="progress-bar" id="progressBar"></div>
          </div>
          <div class="icon-grid" id="iconGrid">
          </div>
        </div>
        <div class="right-panel">
          <div id="preview" class="preview-container">
            <h3>Hover over an icon to preview</h3>
          </div>
        </div>
      </div>
      <script>
        let icons = [];

        function addIcon(icon, index) {
          const grid = document.getElementById('iconGrid');

          const iconElement = document.createElement('a');
          iconElement.href = \`command:vscode.open?\${encodeURIComponent(JSON.stringify([icon.filePath]))}\`;
          iconElement.className = 'icon-link';
          iconElement.setAttribute('data-name', icon.name.toLowerCase());

          iconElement.innerHTML = \`
            <div class="icon-container" onmouseover="showPreview(\${index})">
              \${icon.svg}
              <div class="icon-name">
                \${icon.name}
              </div>
            </div>
          \`;

          grid.appendChild(iconElement);
        }

        function updateProgressBar(progress) {
          const progressBar = document.getElementById('progressBar');
          if (progressBar) {
            progressBar.style.width = \`\${progress}%\`;
          }
        }

        function showPreview(index) {
          const icon = icons[index];
          const preview = document.getEleme>ntById('preview');
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

        function filterIcons(searchTerm) {
          const grid = document.getElementById('iconGrid');
          const iconLinks = grid.getElementsByClassName('icon-link');
          let visibleCount = 0;

          searchTerm = searchTerm.toLowerCase();

          for (const link of iconLinks) {
            const name = link.getAttribute('data-name');
            if (name.includes(searchTerm)) {
              link.style.display = '';
              visibleCount++;
            } else {
              link.style.display = 'none';
            }
          }

          let noResults = grid.querySelector('.no-results');
          if (visibleCount === 0) {
            if (!noResults) {
              noResults = document.createElement('div');
              noResults.className = 'no-results';
              noResults.textContent = 'No icons found';
              grid.appendChild(noResults);
            }
          } else if (noResults) {
            noResults.remove();
          }
        }

        window.addEventListener('message', event => {
          const message = event.data;
          if (message.type === 'addIcon') {
            icons.push(message.icon);
            addIcon(message.icon, icons.length - 1);
          } else if (message.type === 'updateProgressBar') {
            updateProgressBar(message.progress);
          }
        });
      </script>
    </body>
    </html>
  `;
}

async function findSvgIcons(): Promise<SVGItem[]> {
  const svgItemsList: SVGItem[] = [];

  if (!vscode.workspace.workspaceFolders) {
    return svgItemsList;
  }

  const workspaceRoot = vscode.workspace.workspaceFolders[0].uri.fsPath;

  const svgFiles = await glob('**/*.svg', {
    cwd: workspaceRoot,
    absolute: true,
    ignore: [
      '**/node_modules/**',
      ...(await getGitignorePatterns(workspaceRoot))
    ]
  });

  const otherFiles = await glob(`**/*.{${supportedExtensions.join(',')}}`, {
    cwd: workspaceRoot,
    absolute: true,
    ignore: [
      '**/node_modules/**',
      '**/*.svg',
      ...(await getGitignorePatterns(workspaceRoot))
    ],
    nodir: true
  });

  const totalFiles = svgFiles.length + otherFiles.length;
  let previousReportedProgress = 0;
  let processedFiles = 0;
  const updateProgressBar = (progress: number) => {
    if (progress > previousReportedProgress + 1) {
      iconsPanel?.webview.postMessage({ type: 'updateProgressBar', progress });
      previousReportedProgress = progress;
    }
  };

  // Handle SVG files
  for (const file of svgFiles) {
    const content = await fs.promises.readFile(file, 'utf8');
    const fileName = path.basename(file).split('.').shift() || 'Icon';
    const icon = {
      name: humanizeFileName(fileName),
      svg: cleanSvg(content),
      filePath: file
    };
    svgItemsList.push(icon);
    iconsPanel?.webview.postMessage({ type: 'addIcon', icon });
    processedFiles++;
    updateProgressBar(Math.round((processedFiles / totalFiles) * 100));
  }

  // Handle SVGs inlined in other files
  for (const file of otherFiles) {
    const content = await fs.promises.readFile(file, 'utf8');
    const svgMatches = content.match(/<svg[^>]*>[\s\S]*?<\/svg>/g);

    if (svgMatches) {
      for (let i = 0; i < svgMatches.length; i++) {
        const fileName = path.basename(file).split('.').shift() || `Icon ${i + 1}`;
        const icon = {
          name: humanizeFileName(fileName),
          svg: cleanSvg(svgMatches[i]),
          filePath: file
        };
        svgItemsList.push(icon);
        iconsPanel?.webview.postMessage({ type: 'addIcon', icon });
      }
    }
    processedFiles++;
    updateProgressBar(Math.round((processedFiles / totalFiles) * 100));
  }

  return svgItemsList;
}

function updateWebview(panel: vscode.WebviewPanel, icons: SVGItem[]) {
  panel.webview.html = getInitialHtml();
}

export function deactivate() {}
