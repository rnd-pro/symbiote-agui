# Process stages

`agui-steps` shows an ordered process with numbered markers, step labels, connecting lines, and check marks for completed stages. It is a read-only indicator; the application owns the current stage.

```html
<context-provider ctx="APP">
  <script type="application/json">
    {
      "stage": "review",
      "finished": false,
      "stages": [
        { "value": "prepare", "label": "Prepare" },
        { "value": "review", "label": "Review" },
        { "value": "approve", "label": "Approve" },
        { "value": "publish", "label": "Publish" }
      ],
      "stepTexts": {
        "current": "Current step",
        "completed": "Completed",
        "pending": "Not reached",
        "invalidItems": "Steps need unique values and text labels.",
        "invalidValue": "Choose an existing stage."
      }
    }
  </script>
  <agui-steps label="Publishing progress"
    bind="$.items: APP/stages; $.value: APP/stage; $.complete: APP/finished; $.texts: APP/stepTexts"></agui-steps>
</context-provider>
```

- `items` is an ordered array of `{ value, label }` objects with unique nonempty string values. Labels render as text. An empty array renders no steps.
- `value` identifies the current stage. Bind it or set the host attribute, such as `value="review"`. Earlier items are completed; later items are pending. An empty value means the process has not started, with all steps pending. Unknown values show caller-owned `invalidValue` feedback.
- Boolean `complete` marks every step completed and removes the current marker. It accepts a property binding or the boolean host attribute; remove the attribute to unset it. It does not change the application's `value`.
- `label`, `aria-label`, or `aria-labelledby` names the ordered list. The active item has `aria-current="step"`. Supply `texts.current`, `texts.completed`, and `texts.pending` for screen-reader status text, plus the validation messages shown above. Missing copy stays empty.

The component inherits AGUI colors and standard marker sizing. Stages have equal column widths, labels can wrap, and narrow containers scroll horizontally. Use it in a dedicated row or panel rather than mixing its labels with single-height toolbar controls. Review long labels and mobile appearance manually.

There are no click handlers, navigation actions, `pub-to`, automatic progression, or saving behavior. Use existing buttons, selects, connectors, or provider updates to control the process. Existing `persist` and saving rules can retain the application's stage when required. Viewer snapshots preserve the displayed stage without executing component code.
