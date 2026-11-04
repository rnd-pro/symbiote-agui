# Local records example

Load two records from a JSON file and explicitly save an edited label through connector scripts. The interface uses uilib bindings without executable session JavaScript or an agent feedback loop.

Run setup where AGUI and its dependencies are installed, choosing a new folder:

```sh
node docs/examples/connectors/setup.js ./connector-demo
```

Setup creates the example files, registry, two prepared revisions, and a private credential profile with the data-file reference. It prints the profile name and exact revisions, grants no execution, and never overwrites an existing folder.

Choose the generated AGUI folder, attach the scripts, and inspect their source:

```sh
npx symbiote-agui config folder ./connector-demo
npx symbiote-agui connector attach records read --registry ./connector-demo/registry --script example.records.read
npx symbiote-agui connector attach records save --registry ./connector-demo/registry --script example.records.save
npx symbiote-agui connector review records read
npx symbiote-agui connector review records save
```

After review, replace these placeholders with each full revision and the profile from setup:

```sh
npx symbiote-agui connector grant records read --revision <READ_REVISION> --source agui --profile <PROFILE>
npx symbiote-agui connector grant records save --revision <SAVE_REVISION> --source agui --profile <PROFILE>
npx symbiote-agui start records
```

The manager's Connectors dialog provides the same attach, source/contract/hash review, source/profile grant, update/reconnect, revoke, and detach controls. Reviewing and granting never execute the backend. The registry field supplies an optional replacement folder when reconnecting a moved source.

Press Load records, edit the first label, then Save record. The script reads the file back before returning verified data. Typing does not write. Public viewers can observe intended output but cannot run these scripts. Keep the generated session description with the HTML; it describes the actual data flow.

This is a single-editor file example, not a concurrent database. The data toolbar is omitted because saving goes directly through connectors, without a second cache/feedback submission.
