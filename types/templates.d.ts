import type { JsonValue } from './json.js';

export type TemplateConfiguration = Record<string, Record<string, JsonValue>>;

export interface TemplateSummary {
  id: string;
  title: string;
  summary: string;
}

export interface TemplateDescriptor extends TemplateSummary {
  configuration: Record<string, unknown>;
}

export interface LoadedTemplate {
  descriptor: TemplateDescriptor;
  defaults: TemplateConfiguration;
  html: string;
  description: string;
  assetsPath: string;
}

export interface RenderedTemplate {
  descriptor: TemplateDescriptor;
  configuration: TemplateConfiguration;
  html: string;
  description: string;
  assetsPath: string;
}

export interface TemplateProvenance {
  id: string;
  packageVersion: string;
}

export type TemplateCliRequest =
  | { kind: 'template'; command: 'list'; query?: string }
  | { kind: 'template'; command: 'describe'; templateId: string }
  | { kind: 'template'; command: 'create'; templateId: string; sessionId: string; config?: string };

export interface TemplateCreation {
  sessionId: string;
  created: true;
  active: false;
  template: TemplateProvenance;
  htmlPath: string;
  descriptionPath: string;
  assetsPath: string;
  metadataPath: string;
  nextCommand: string;
  requirements: string[];
}

export type TemplateResult = TemplateCreation
  | { total: number; templates: TemplateSummary[] }
  | {
    template: TemplateDescriptor;
    defaults: TemplateConfiguration;
    description: string;
    assets: import('./assets.js').AssetEntry[];
  };
