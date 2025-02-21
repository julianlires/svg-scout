import * as path from 'path';
import * as fs from 'fs';

export async function getGitignorePatterns(workspaceRoot: string): Promise<string[]> {
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
