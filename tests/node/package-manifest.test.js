import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('published runtime dependencies resolve without a local checkout', async () => {
  let manifest = JSON.parse(await readFile(new URL('../../package.json', import.meta.url), 'utf8'));
  for (let dependencies of [
    manifest.dependencies,
    manifest.optionalDependencies,
  ]) {
    for (let [
      name,
      specifier,
    ] of Object.entries(dependencies || {})) {
      assert.doesNotMatch(
        specifier,
        /^(?:(?:git\+)?file:|link:|workspace:|[./~\\]|[a-z]:[\\/])/i,
        `${name} must not depend on files outside the published package.`,
      );
    }
  }
});
