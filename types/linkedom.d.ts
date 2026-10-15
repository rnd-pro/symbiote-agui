export function parseHTML(markup: string): {
  document: {
    createElement(tag: 'template'): Pick<HTMLTemplateElement, 'innerHTML' | 'content'>;
  };
};
