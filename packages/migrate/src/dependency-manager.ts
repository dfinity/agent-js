import { execSync } from 'child_process';
import type { ProjectInfo, DependencyInfo } from './types.ts';
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

  addCorePackage(removedDependencies: DependencyInfo[]): void {
    // Determine the best dependency type to use based on removed dependencies
    // Priority: dependencies -> peerDependencies -> devDependencies
    let targetType: 'dependencies' | 'peerDependencies' | 'devDependencies' = 'dependencies';

    for (const dep of removedDependencies) {
      if (dep.type === 'dependencies') {
        targetType = 'dependencies';
        break;
      } else if (dep.type === 'peerDependencies') {
        targetType = 'peerDependencies';
        break;
      } else {
        targetType = 'devDependencies';
        break;
      }
    }

    const command = this.buildAddCommand([NEW_CORE_PACKAGE], targetType);
    console.log(`Adding ${NEW_CORE_PACKAGE} as ${targetType}`);

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

  private buildAddCommand(
    dependencies: string[],
    depType: 'dependencies' | 'peerDependencies' | 'devDependencies',
  ): string {
    const depFlag = this.getDependencyFlag(depType);

    switch (this.projectInfo.packageManager) {
      case 'npm':
        return `npm install ${depFlag} ${dependencies.join(' ')}`;
      case 'yarn':
        return `yarn add ${depFlag} ${dependencies.join(' ')}`;
      case 'pnpm':
        return `pnpm add ${depFlag} ${dependencies.join(' ')}`;
      default:
        throw new Error(`Unsupported package manager: ${this.projectInfo.packageManager}`);
    }
  }

  private getDependencyFlag(
    depType: 'dependencies' | 'peerDependencies' | 'devDependencies',
  ): string {
    switch (depType) {
      case 'dependencies':
        return '';
      case 'peerDependencies':
        return '--save-peer';
      case 'devDependencies':
        return '--save-dev';
      default:
        return '';
    }
  }
}
