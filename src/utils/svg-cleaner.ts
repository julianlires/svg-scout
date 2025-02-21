export function cleanSvg(svg: string): string {
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
