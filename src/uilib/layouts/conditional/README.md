# Conditional content

Use `agui-conditional` to render a branch from a native Symbiote context key, without a session script or expression evaluator.

```html
<agui-conditional when="APP/showHello" is="true">Hello!</agui-conditional>
<agui-conditional when="APP/currentTab" is="settings" behavior="show">Settings...</agui-conditional>
<agui-conditional when="ROUTER/currentRoute" is="dashboard" behavior="dom-add">
  <template><agui-panel>Dashboard...</agui-panel></template>
</agui-conditional>
```

- `when` names a native state key such as `APP/showHello`, `ROUTER/currentRoute`, `*enabled`, or `^enabled`. Changes to that value reevaluate the branch. Missing sources do not match; named contexts created later use Symbiote's native deferred subscriptions.
- `is="true"` and `is="false"` compare actual booleans. Other attribute values compare literal strings, without numeric coercion, interpolation, or JavaScript evaluation. Omitting `is` checks the source's truthiness. A string `"true"` does not equal boolean `true`.
- `behavior="show"` is the default. The content stays mounted, and native `hidden` on the host follows the condition. Nested component instances, subscriptions, and local drafts survive visibility changes.
- `behavior="dom-add"` mounts content only while matched. Native Itemize creates and removes the branch, including its component/tool lifecycle. Reappearing branches are fresh instances: keep values in a surrounding provider when they must survive removal. A direct child `<template>` keeps content inert until mounting; direct authored content is supported too.
- Content bindings use native Symbiote scope rules. Use named keys such as `APP/name` or `^name` to reach a surrounding provider. The conditional wrapper adds no layout box; put presentation and spacing on its authored content.
- Attributes can change at runtime. Native property bindings can supply `$.when`, `$.is`, and `$.behavior`; defined properties take precedence over attributes. Switching from show to DOM mode while unmatched removes the mounted content. Unsupported behavior values are configuration errors.

The component changes presentation only: it does not publish application values, invoke feedback, or expose visibility mutation tools. Existing child controls retain their own behavior. Viewer snapshots include the resulting visibility and mounted content without evaluating conditions again.
