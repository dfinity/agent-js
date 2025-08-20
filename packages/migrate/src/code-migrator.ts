import { readFileSync, writeFileSync } from 'fs';
import { glob } from 'glob';
import type { DependencyMapping, MigrationResult } from './types.ts';

export class CodeMigrator {
  constructor(
    private dependencyMappings: DependencyMapping[],
    private filePatterns: string[],
    private ignorePatterns: string[],
  ) {}

  async migrateCode(rootDir: string): Promise<MigrationResult> {
    const result: MigrationResult = {
      success: true,
      filesProcessed: 0,
      importsReplaced: 0,
      dependenciesRemoved: [],
      dependenciesAdded: [],
      errors: [],
    };

    try {
      // Find all source files
      const sourceFiles = await this.findSourceFiles(rootDir);
      console.log(`Found ${sourceFiles.length} source files to process`);

      // Process each file
      for (const filePath of sourceFiles) {
        try {
          const fileResult = await this.migrateFile(filePath);
          result.filesProcessed++;
          result.importsReplaced += fileResult.importsReplaced;
        } catch (error) {
          result.errors.push(`Error processing ${filePath}: ${error}`);
          result.success = false;
        }
      }

      console.log(
        `✅ Code migration completed. Processed ${result.filesProcessed} files, replaced ${result.importsReplaced} imports`,
      );
    } catch (error) {
      result.errors.push(`Migration failed: ${error}`);
      result.success = false;
    }

    return result;
  }

  private async findSourceFiles(rootDir: string): Promise<string[]> {
    const allPatterns = this.filePatterns.map(pattern => `**/${pattern}`);

    const files = await glob(allPatterns, {
      cwd: rootDir,
      absolute: true,
      ignore: this.ignorePatterns,
    });

    return files.filter((file: string) => {
      // Additional filtering to ensure we only process source files
      const relativePath = file.replace(rootDir, '').replace(/^\/+/, '');
      return (
        !relativePath.startsWith('node_modules') &&
        !relativePath.startsWith('dist') &&
        !relativePath.startsWith('build') &&
        !relativePath.startsWith('.git')
      );
    });
  }

  private async migrateFile(filePath: string): Promise<{ importsReplaced: number }> {
    const content = readFileSync(filePath, 'utf-8');
    let newContent = content;
    let importsReplaced = 0;

    // Replace imports for each dependency mapping
    for (const mapping of this.dependencyMappings) {
      // Handle all import types by looking for the package name in various contexts
      const packageRegex = this.buildPackageRegex(mapping.oldPackage);

      newContent = newContent.replace(packageRegex, match => {
        importsReplaced++;

        // Replace the package name with the new submodule
        return match.replace(mapping.oldPackage, mapping.newSubmodule);
      });
    }

    // Only write if content changed
    if (newContent !== content) {
      writeFileSync(filePath, newContent, 'utf-8');
      console.log(`📝 Updated ${filePath} (${importsReplaced} imports replaced)`);
    }

    return { importsReplaced };
  }

  private buildPackageRegex(packageName: string): RegExp {
    // Matches package names in import-related contexts:
    // from '@dfinity/package'
    // require('@dfinity/package')
    // import('@dfinity/package')
    return new RegExp(
      `(?:from\\s+['"]${packageName}['"]|` +
        `require\\s*\\(\\s*['"]${packageName}['"]\\s*\\)|` +
        `import\\s*\\(\\s*['"]${packageName}['"]\\s*\\))`,
      'g',
    );
  }
}
