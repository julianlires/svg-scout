# SVG Scout

SVG Scout is a Visual Studio Code extension that helps you discover and manage SVG icons in your project. It scans your codebase for inline SVG icons and presents them in a visual grid, making it easy to find and navigate to specific icons.

## Features

- 🔍 Scans your project for inline SVG icons in various file types (JSX, TSX, JS, TS, HTML, Vue)
- 📊 Displays icons in a visual grid layout
- 🔗 Quick navigation to source files
- 🚫 Respects .gitignore patterns
- 💻 Works with React, Vue, and vanilla HTML files

[Screenshot of the SVG Scout grid view showing multiple icons]

## Installation

1. Open Visual Studio Code
2. Press `Ctrl+P` (Windows/Linux) or `Cmd+P` (macOS) to open the Quick Open dialog
3. Type `ext install svg-scout` and press Enter
4. Restart VS Code if prompted

## Usage

1. Open a project containing SVG icons
2. Access SVG Scout in one of these ways:
   - Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (macOS)
   - Type "Show Icons List" and press Enter
   - Or use the "SVG Scout: Show Icons List" command from the command palette

[GIF showing how to open and use SVG Scout]

## Supported File Types

SVG Scout searches for inline SVG icons in the following file types:
- `.jsx` and `.tsx` (React files)
- `.js` and `.ts` (JavaScript/TypeScript files)
- `.html` (HTML files)
- `.vue` (Vue files)

## Features in Detail

### Visual Grid Layout
- Each SVG is displayed in a grid cell
- SVGs maintain their original appearance
- Click on the svg to navigate to its source file

### Smart Scanning
- Respects your project's `.gitignore` patterns

## Requirements

- Visual Studio Code version 1.85.0 or higher
- A workspace containing SVG icons

## Extension Settings

This extension doesn't require any additional configuration. It works out of the box!

## Known Issues

None at the moment. If you encounter any issues, please report them on our [GitHub repository](https://github.com/julianlires/svg-scout).

## Release Notes

### 0.0.1 - Initial Release
- Basic icon scanning functionality
- Visual grid display of icons
- Navigation to source files
- Support for multiple file types
- .gitignore integration

### 0.0.2 - Add extension icon
- Adds extension icon

### 0.0.3 - Minor updates
- Allow clicking on item
- Consider SVG files
- Add bigger preview on hover
- Update README
- Update extension description

### 0.0.4 - Add Search bar
- Add a search bar for filtering SVGs

## Contributing

Contributions are welcome! Feel free to submit pull requests or create issues on our GitHub repository.

## License

This extension is licensed under the [MIT License](LICENSE).

---

## More Information

- [Source Code](https://github.com/julianlires/svg-scout)
- [Issue Tracker](https://github.com/julianlires/svg-scout/issues)

**Enjoy using SVG Scout!**
