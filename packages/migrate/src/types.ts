export interface DependencyMapping {
  oldPackage: string;
  newSubmodule: string;
  description: string;
}

export type PackageManager = 'npm' | 'yarn' | 'pnpm';

export interface ProjectInfo {
  packageManager: PackageManager;
  rootDir: string;
  hasPackageJson: boolean;
}

export interface MigrationResult {
  success: boolean;
  filesProcessed: number;
  importsReplaced: number;
  dependenciesRemoved: string[];
  dependenciesAdded: string[];
  errors: string[];
}
