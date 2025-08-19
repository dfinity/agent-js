import { execSync } from 'child_process';
import type { ProjectInfo } from './types.ts';
import { NEW_CORE_PACKAGE } from './constants.ts';

export class DependencyManager {
  constructor(private projectInfo: ProjectInfo) {}

  removeDependencies(dependencies: string[]): void {
    if (dependencies.length === 0) return;

    const command = this.buildRemoveCommand(dependencies);
    console.log(`Removing dependencies: ${dependencies.join(', ')}`);

    try {
      execSync(command, {
        cwd: this.projectInfo.rootDir,
        stdio: 'inherit',
        encoding: 'utf-8',
      });
      console.log('✅ Dependencies removed successfully');
    } catch (error) {
      throw new Error(`Failed to remove dependencies: ${error}`);
    }
  }

  addCorePackage(): void {
    const command = this.buildAddCommand([NEW_CORE_PACKAGE]);
    console.log(`Adding ${NEW_CORE_PACKAGE} dependency`);

    try {
      execSync(command, {
        cwd: this.projectInfo.rootDir,
        stdio: 'inherit',
        encoding: 'utf-8',
      });
      console.log('✅ Core package added successfully');
    } catch (error) {
      throw new Error(`Failed to add core package: ${error}`);
    }
  }

  private buildRemoveCommand(dependencies: string[]): string {
    switch (this.projectInfo.packageManager) {
      case 'npm':
        return `npm remove ${dependencies.join(' ')}`;
      case 'yarn':
        return `yarn remove ${dependencies.join(' ')}`;
      case 'pnpm':
        return `pnpm remove ${dependencies.join(' ')}`;
      default:
        throw new Error(`Unsupported package manager: ${this.projectInfo.packageManager}`);
    }
  }

  private buildAddCommand(dependencies: string[]): string {
    switch (this.projectInfo.packageManager) {
      case 'npm':
        return `npm install ${dependencies.join(' ')}`;
      case 'yarn':
        return `yarn add ${dependencies.join(' ')}`;
      case 'pnpm':
        return `pnpm add ${dependencies.join(' ')}`;
      default:
        throw new Error(`Unsupported package manager: ${this.projectInfo.packageManager}`);
    }
  }
}
