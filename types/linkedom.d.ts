export function parseHTML(markup: string): {
  document: Pick<Document, 'body' | 'createDocumentFragment'> & {
    createElement(tag: 'template'): Pick<HTMLTemplateElement, 'innerHTML' | 'content'>;
  };
};
