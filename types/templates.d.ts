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
  assetsPath: string;
}

export interface RenderedTemplate {
  descriptor: TemplateDescriptor;
  configuration: TemplateConfiguration;
  html: string;
  assetsPath: string;
}
