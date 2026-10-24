export interface ProjectEntry {
  name: string;
  path: string;
  kind: 'directory' | 'file' | 'unavailable';
  error?: string;
}

export interface ProjectDirectory {
  projectId: string;
  path: string;
  entries: ProjectEntry[];
  nextOffset?: number;
}

export interface ProjectPreview {
  projectId: string;
  path: string;
  kind: 'text' | 'markdown' | 'unsupported' | 'too-large';
  text?: string;
  size: number;
  message?: string;
}
