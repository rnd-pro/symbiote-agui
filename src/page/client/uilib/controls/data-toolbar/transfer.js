import { DATA_ENDPOINT_KIND } from '../../../../../metadata/constants.js';
import { parseTransfer, serializeTransfer } from './json.js';
import { captureDraft, draftContexts, replaceDraft } from './draft.js';
import { fileLabel, readJsonFile, downloadJson } from './files.js';
import { TRANSFER_FAILURES, transferError } from './constants.js';

export class JsonTransfer {
  generation = 0;
  reading = false;
  disposed = false;

  /** @param {import('../../../../../../types/data.js').DataTransferOptions} options */
  constructor(options) {
    this.options = options;
    let { input } = options;
    if (input.type !== 'file') { throw new Error('JSON transfer requires a native file input.'); }
    input.accept = '.json,application/json';
    input.multiple = false;
    input.addEventListener('change', this.changed);
    input.addEventListener('cancel', this.cancelled);
  }

  /** @param {import('../../../../../../types/data.js').DataTransferState} state */
  report(state) { if (!this.disposed) { this.options.report(state); } return state; }

  /**
   * @param {'import' | 'export'} operation
   * @param {unknown} error
   */
  failed(operation, error) {
    /** @type {keyof typeof TRANSFER_FAILURES} */
    let fallback = operation === 'import' ? 'READ_FAILED' : 'EXPORT_FAILED';
    let code = error instanceof Error && 'code' in error && Object.hasOwn(TRANSFER_FAILURES, String(error.code))
      ? /** @type {keyof typeof TRANSFER_FAILURES} */ (error.code) : fallback;
    return this.report({ operation, state: 'error', message: TRANSFER_FAILURES[code], failure: { code, message: TRANSFER_FAILURES[code] } });
  }

  pickImport() {
    if (this.disposed || this.reading) { return; }
    this.options.input.value = '';
    this.report({ operation: 'import', state: 'picking', message: 'Choose a JSON file.' });
    try { this.options.input.click(); }
    catch (error) { this.failed('import', error); }
  }

  changed = () => { void this.importFile(this.options.input.files?.[0] ?? null); };
  cancelled = () => {
    this.options.input.value = '';
    this.report({ operation: 'import', state: 'cancelled', message: 'Import cancelled. The draft was not changed.' });
  };

  /** @param {File | null} file */
  async importFile(file) {
    if (this.disposed || this.reading) { return; }
    if (!file) { this.cancelled(); return; }
    let generation = ++this.generation;
    this.reading = true;
    let name = fileLabel(file.name);
    try {
      let targets = structuredClone(this.options.targets());
      let contexts = draftContexts(targets);
      this.report({ operation: 'import', state: 'reading', fileName: name, targets, message: 'Reading JSON.' });
      let text = await readJsonFile(file);
      if (this.disposed || generation !== this.generation) { return; }
      let document = parseTransfer(text, targets);
      if (JSON.stringify(targets) !== JSON.stringify(this.options.targets())
        || draftContexts(targets).some((context, index) => context !== contexts[index])) { throw transferError('CONTEXT_CHANGED'); }
      try { replaceDraft(document, targets); }
      catch { throw transferError('APPLY_FAILED'); }
      return this.report({ operation: 'import', state: 'imported', fileName: name, targets,
        endpoint: { kind: DATA_ENDPOINT_KIND.JSON_FILE, reference: name, description: 'JSON file imported into the current draft.' },
        message: 'JSON imported. Changes are not saved.' });
    } catch (error) { return this.failed('import', error); }
    finally {
      this.reading = false;
      if (!this.disposed && generation === this.generation) { this.options.input.value = ''; }
    }
  }

  exportFile() {
    if (this.disposed) { return; }
    try {
      let targets = structuredClone(this.options.targets());
      this.report({ operation: 'export', state: 'exporting', targets, message: 'Preparing JSON.' });
      let text = serializeTransfer(captureDraft(targets), targets);
      let configured = this.options.exportTarget;
      if (configured && configured.kind !== DATA_ENDPOINT_KIND.JSON_FILE && configured.kind !== DATA_ENDPOINT_KIND.MANUAL) {
        throw transferError('INVALID_DESTINATION');
      }
      let name = fileLabel(configured?.reference);
      name = downloadJson(text, name, this.options.input.ownerDocument);
      return this.report({ operation: 'export', state: 'download-started', fileName: name, targets,
        endpoint: { kind: DATA_ENDPOINT_KIND.JSON_FILE, reference: name,
          description: configured?.description || 'JSON download of the current draft.' },
        message: 'JSON download started.' });
    } catch (error) { return this.failed('export', error); }
  }

  dispose() {
    this.disposed = true;
    this.generation += 1;
    this.options.input.value = '';
    this.options.input.removeEventListener('change', this.changed);
    this.options.input.removeEventListener('cancel', this.cancelled);
  }
}
