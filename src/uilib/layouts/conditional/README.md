# Conditional content

Use `agui-conditional` to render a branch from a native Symbiote context key, without a session script or expression evaluator.

```html
<agui-conditional when="APP/showHello" is="true">Hello!</agui-conditional>
<agui-conditional when="APP/currentTab" is="settings" behavior="show">Settings...</agui-conditional>
<agui-conditional when="APP/loading" is="true" behavior="hide">Ready content...</agui-conditional>
<agui-conditional when="ROUTER/currentRoute" is="dashboard" behavior="dom-add">
  <template><agui-panel>Dashboard...</agui-panel></template>
</agui-conditional>
<agui-conditional when="APP/loading" is="true" behavior="dom-remove">
  <template><agui-panel>Mounted when ready...</agui-panel></template>
</agui-conditional>
```

- `when` names a native state key such as `APP/showHello`, `ROUTER/currentRoute`, `*enabled`, or `^enabled`. Changes to that value reevaluate the branch. Missing sources do not match; named contexts created later use Symbiote's native deferred subscriptions.
- `is="true"` and `is="false"` compare actual booleans. Other attribute values compare literal strings, without numeric coercion, interpolation, or JavaScript evaluation. Omitting `is` checks the source's truthiness. A string `"true"` does not equal boolean `true`.
- `behavior` names the state applied when the condition matches. When it does not match, the opposite state applies.
- `show` (default) shows matching content and hides nonmatching content. `hide` hides matching content and shows nonmatching content. Both keep content mounted; nested component instances, subscriptions, and local drafts survive visibility changes.
- `dom-add` mounts matching content and removes nonmatching content. `dom-remove` removes matching content and mounts nonmatching content. Native Itemize owns component/tool creation and cleanup. Reappearing branches are fresh instances: keep values in a surrounding provider when they must survive removal. A direct child `<template>` keeps content inert until mounting; direct authored content is supported too.
- Content bindings use native Symbiote scope rules. Use named keys such as `APP/name` or `^name` to reach a surrounding provider. The conditional wrapper adds no layout box; put presentation and spacing on its authored content.
- Inside templated layouts such as tabs, wrap bound branch content in `<template>` so ancestor processors cannot consume its bindings before Itemize mounts it.
- Attributes can change at runtime. Native property bindings can supply `$.when`, `$.is`, and `$.behavior`; defined properties take precedence over attributes. Switching behavior immediately applies its matching or opposite state. Unsupported behavior values are configuration errors.

The component changes presentation only: it does not publish application values, invoke feedback, or expose visibility mutation tools. Existing child controls retain their own behavior. Viewer snapshots include the resulting visibility and mounted content without evaluating conditions again.
