# Local records example

An example interface for reading two records and explicitly saving an edited label.

The generated example folder's `records.json` is the source of truth. Two prepared scripts in its `registry` folder access that file through a private `DATA_FILE` credential-profile reference. The file location and profile values stay outside markup and portable session requirements.

Load records reads the file into page state. Typing changes only the draft. Save record invokes the reviewed write script once, reads the file back, and returns verified data. Only a result matching the captured input publishes back to state; late results leave newer drafts intact. Check outcome reads an existing receipt without resubmitting input. There is no agent feedback or automatic local-cache saving in this example.

This is a small, single-editor example, not a concurrent database implementation. Public viewers observe intended UI output but cannot invoke these local backends. Copies need their own local source preparation, profile, and execution grants.
