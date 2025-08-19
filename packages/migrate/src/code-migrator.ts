import { readFileSync, writeFileSync, existsSync } from 'fs';
import { glob } from 'glob';
import type { DependencyMapping, MigrationResult } from './types.ts';
import { escapeRegex } from './utils.ts';

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
    if (!existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const content = readFileSync(filePath, 'utf-8');
    let newContent = content;
    let importsReplaced = 0;

    // Replace imports for each dependency mapping
    for (const mapping of this.dependencyMappings) {
      const importRegex = this.buildImportRegex(mapping.oldPackage);
      const matches = newContent.match(importRegex);

      if (matches) {
        newContent = newContent.replace(importRegex, (match, importType, importPath, rest) => {
          importsReplaced++;

          // Handle different import patterns
          if (importPath === '*') {
            // import * as X from '@dfinity/package'
            return `${importType} * as ${rest} from '${mapping.newSubmodule}'`;
          } else if (importPath.includes('{') && importPath.includes('}')) {
            // import { X, Y } from '@dfinity/package'
            return `${importType} { ${importPath} } from '${mapping.newSubmodule}'`;
          } else {
            // import X from '@dfinity/package'
            return `${importType} ${importPath} from '${mapping.newSubmodule}'`;
          }
        });
      }
    }

    // Only write if content changed
    if (newContent !== content) {
      writeFileSync(filePath, newContent, 'utf-8');
      console.log(`📝 Updated ${filePath} (${importsReplaced} imports replaced)`);
    }

    return { importsReplaced };
  }

  private buildImportRegex(packageName: string): RegExp {
    const escapedPackage = escapeRegex(packageName);

    // Matches various import patterns:
    // import X from '@dfinity/package'
    // import { X, Y } from '@dfinity/package'
    // import * as X from '@dfinity/package'
    // const X = require('@dfinity/package')
    // import('@dfinity/package')
    return new RegExp(
      `(import)\\s+([^'"]*)\\s+from\\s+['"]${escapedPackage}['"]|` +
        `(const|let|var)\\s+([^=]*)=\\s+require\\s*\\(\\s*['"]${escapedPackage}['"]\\s*\\)|` +
        `(import)\\s*\\(\\s*['"]${escapedPackage}['"]\\s*\\)`,
      'g',
    );
  }
}
