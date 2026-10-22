/** @type {1} */
export let TRANSFER_VERSION = 1;
export let DOWNLOAD_RELEASE_MS = 1_000;
export let TRANSFER_FAILURES = Object.freeze({
  INVALID_JSON: 'Choose a valid AGUI JSON data file.',
  TOO_LARGE: 'JSON transfer is limited to 1 MiB.',
  INVALID_TARGET: 'The file must contain exactly the selected providers and property keys.',
  INVALID_DESTINATION: 'Choose a JSON-file or manual export destination.',
  CONTEXT_CHANGED: 'The data context changed. Select the file again in the current interface.',
  READ_FAILED: 'Could not read the selected file. The draft was not changed.',
  APPLY_FAILED: 'Import could not finish. Check the current draft before trying again.',
  EXPORT_FAILED: 'Could not start the JSON download.',
});

/** @param {keyof typeof TRANSFER_FAILURES} code */
export function transferError(code) { return Object.assign(new Error(TRANSFER_FAILURES[code]), { code }); }
