export interface DependencyMapping {
  oldPackage: string;
  newSubmodule: string;
}

export enum PackageManager {
  NPM = 'npm',
  YARN = 'yarn',
  PNPM = 'pnpm',
}

export type GenericPackageJson = {
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  peerDependencies: Record<string, string>;
};

export interface ProjectInfo {
  packageManager: PackageManager;
  rootDir: string;
  hasPackageJson: boolean;
}

export interface MigrationResult {
  success: boolean;
  filesProcessed: number;
  importsReplaced: number;
  dependenciesRemoved: Array<[string, string]>;
  dependenciesAdded: string[];
  errors: string[];
}
