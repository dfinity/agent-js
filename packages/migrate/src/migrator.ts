import { DependencyManager } from './dependency-manager.ts';
import { CodeMigrator } from './code-migrator.ts';
import {
  readPackageJson,
  getDependenciesToRemove,
  hasDfinityDependencies,
  hasPackageJson,
} from './utils.ts';
import { DEPENDENCY_MAPPINGS, NEW_CORE_PACKAGE } from './constants.ts';
import type { MigrationResult, PackageManager } from './types.ts';
import chalk from 'chalk';

export class Migrator {
  private dependencyManager: DependencyManager;
  private codeMigrator: CodeMigrator;

  constructor(
    private rootDir: string,
    private filePatterns: string[],
    private ignorePatterns: string[],
    packageManager: PackageManager,
  ) {
    const projectInfo = {
      packageManager,
      rootDir,
      hasPackageJson: hasPackageJson(rootDir),
    };
    this.dependencyManager = new DependencyManager(projectInfo);
    this.codeMigrator = new CodeMigrator(
      DEPENDENCY_MAPPINGS,
      this.filePatterns,
      this.ignorePatterns,
    );
  }

  async migrate(): Promise<MigrationResult> {
    console.log(chalk.blue('🚀 Starting migration to @icp-sdk/core...\n'));

    try {
      // Check if project has @dfinity dependencies
      const packageJson = readPackageJson(this.rootDir);

      if (!hasDfinityDependencies(packageJson)) {
        console.log(chalk.yellow('⚠️  No @dfinity dependencies found. Nothing to migrate.'));
        return {
          success: true,
          filesProcessed: 0,
          importsReplaced: 0,
          dependenciesRemoved: [],
          dependenciesAdded: [],
          errors: [],
        };
      }

      const dependenciesToRemove = getDependenciesToRemove(packageJson);
      console.log(
        chalk.cyan(
          `📦 Found @dfinity dependencies to migrate: ${dependenciesToRemove.join(', ')}\n`,
        ),
      );

      // Step 1: Remove old dependencies
      console.log(chalk.blue('Step 1: Removing old @dfinity dependencies...'));
      this.dependencyManager.removeDependencies(dependenciesToRemove);

      // Step 2: Add new core package
      console.log(chalk.blue('\nStep 2: Adding @icp-sdk/core package...'));
      this.dependencyManager.addCorePackage();

      // Step 3: Migrate source code
      console.log(chalk.blue('\nStep 3: Migrating source code imports...'));
      const codeMigrationResult = await this.codeMigrator.migrateCode(this.rootDir);

      // Compile final result
      const result: MigrationResult = {
        success: codeMigrationResult.success,
        filesProcessed: codeMigrationResult.filesProcessed,
        importsReplaced: codeMigrationResult.importsReplaced,
        dependenciesRemoved: dependenciesToRemove,
        dependenciesAdded: [NEW_CORE_PACKAGE],
        errors: codeMigrationResult.errors,
      };

      // Print summary
      this.printSummary(result);

      return result;
    } catch (error) {
      const errorResult: MigrationResult = {
        success: false,
        filesProcessed: 0,
        importsReplaced: 0,
        dependenciesRemoved: [],
        dependenciesAdded: [],
        errors: [`Migration failed: ${error}`],
      };

      console.error(chalk.red(`\n❌ Migration failed: ${error}`));
      return errorResult;
    }
  }

  private printSummary(result: MigrationResult): void {
    console.log(chalk.green('\n🎉 Migration completed successfully!'));
    console.log(chalk.cyan('\n📊 Summary:'));
    console.log(`   • Files processed: ${result.filesProcessed}`);
    console.log(`   • Imports replaced: ${result.importsReplaced}`);
    console.log(`   • Dependencies removed: ${result.dependenciesRemoved.join(', ')}`);
    console.log(`   • Dependencies added: ${result.dependenciesAdded.join(', ')}`);

    if (result.errors.length > 0) {
      console.log(chalk.yellow(`   • Errors encountered: ${result.errors.length}`));
      result.errors.forEach(error => console.log(chalk.yellow(`     - ${error}`)));
    }

    console.log(chalk.blue('\n📝 Next steps:'));
    console.log('   1. Review the changes made to your source files');
    console.log('   2. Run your tests to ensure everything works correctly');
    console.log('   3. Update any documentation that references the old packages');
    console.log('   4. Commit your changes');
  }
}
