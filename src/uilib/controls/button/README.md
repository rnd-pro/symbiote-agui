# Declarative button

Use `agui-button` for state actions without authoring an onclick handler. Its native button uses the shared button styles, authored text/icons, keyboard activation, and native form/popover behavior.

```html
<agui-button toggle="UI/showModal">Toggle modal</agui-button>
<agui-button set="UI/showModal" value="true">Open modal</agui-button>
<agui-button set="UI/showModal" value="false">Close</agui-button>
<agui-button set="NAV/currentSection" value="settings">Settings</agui-button>
```

- `toggle` names an existing boolean state key and flips its current value on activation. `set` assigns a value to an existing state key. Native named, shared, and parent context keys work, including `UI/showModal`, `*showModal`, and `^showModal`.
- Use either `toggle` or `set`. With neither, the component acts as a plain native button. Unknown targets, nonboolean toggle values, and conflicting actions are configuration errors; no state changes occur.
- `value="true"` and `value="false"` assign booleans; other attribute values are literal strings. Omitting `value` assigns an empty string. There is no expression or JSON evaluation. Native `$.toggle`, `$.set`, and `$.value` bindings can supply dynamic action configuration.
- The native button defaults to `type="button"`. Additional attributes transfer to it, including `id`, `class`, `style`, ARIA, `data-*`, `disabled`, `name`, `form`, `type`, `formaction`, `popovertarget`, and `commandfor`. Existing global button styles apply without copies. `value` configures the action and also supplies the native button value for forms.
- Action attributes and Symbiote/layout attributes (`bind`, `ctx`, `ref`, `use-template`, and `slot`) remain on the wrapper. The wrapper adds no layout box or duplicate ID. A supplied ID identifies the native button; use `#button-id` for native operations or its closest `agui-button` for the component owner.
- Native attribute bindings such as `bind="@disabled: UI/busy; ariaExpanded: UI/showModal"` and later `setAttribute`, `removeAttribute`, or `toggleAttribute` calls on the wrapper forward to the button. Supply caller-owned accessible names and state attributes; no label, status text, or `aria-pressed` meaning is invented.
- Disabled buttons, disabled fieldsets, `readonly`, and `aria-disabled="true"` block state changes and activation. Initialization and incoming configuration changes never publish. Equivalent assignments are no-ops; real state changes reuse bounded `agui:action` notifications. Application values change only in the named context, without an extra `pub-to` or automatic Save/feedback.

Discover `activate` by owner `agui-button` and the authored native button ID in its component description. It activates the actual button, including native form/popover actions, and returns `activated` and `changed` flags without application data. Disconnection removes tools, listeners, and attribute observers. Viewer snapshots contain an inert native button.
