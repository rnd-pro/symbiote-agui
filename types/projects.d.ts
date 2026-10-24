export interface ConnectedProject {
  id: string;
  name: string;
  folder?: string;
  lastUsedAt: string | null;
}

export interface ProjectStatus extends ConnectedProject {
  available: boolean;
  error?: string;
}

export interface ProjectRegistry {
  version: 1;
  projects: ConnectedProject[];
}

export interface ProjectListing {
  currentProjectId: string;
  projects: ProjectStatus[];
}
