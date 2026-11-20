import{a as t,b as a,c as i}from"./chunk-2RD4PLY5.js";import{b as e}from"./chunk-R5MGQJ77.js";var l=e`
  <div class="agui-sidebar-heading">
    <button ref="toggle" type="button" class="agui-button-icon agui-button-ghost"
      bind="onclick: toggle; disabled: unavailable; @aria-expanded: expandedText; @aria-controls: contentId; @aria-label: toggleLabel">
      <agui-icon name="menu"></agui-icon>
    </button>
    <span bind="textContent: sidebarLabel; hidden: !expanded"></span>
  </div>
  <div ref="content" class="agui-sidebar-content" bind="hidden: !expanded; id: contentId">
    <slot></slot>
  </div>
`;var o=e`
  <fieldset bind="disabled: inactive">
    <legend ref="heading" tabindex="-1" bind="textContent: blockLabel"></legend>
    <div ref="content" bind="hidden: inactive; inert: inactive">
      <slot></slot>
    </div>
  </fieldset>
`;var u=e`
  <div ref="list" class="agui-tabs-list" role="tablist"
    bind="@aria-label: listLabel; @aria-orientation: listOrientation"
    itemize="buttons" item-tag="agui-tab-button"></div>
  <div ref="panels" class="agui-tabs-panels"><slot></slot></div>
`,c=e`
  <button ref="button" type="button" role="tab" class="agui-tab-trigger"
    bind="id: id; value: value; textContent: label; disabled: disabled; tabIndex: tabIndex; @aria-selected: selected; @aria-controls: panelId; onclick: select">
  </button>
`;var h=e`<label class="agui-control-label">${t}<input ref="control"></label>${a}`,x=e`<label class="agui-control-label">${t}<textarea ref="control"></textarea></label>${a}`;var T=e`
  <button ref="control" type="button" bind="ariaBusy: buttonBusy">
    <agui-preloader class="size-[1em]" aria-hidden="true" bind="hidden: !buttonLoading"></agui-preloader>
    <slot></slot>
  </button>
`;var y=e`
  <nav class="grid gap-2" bind="@aria-label: navigationLabel; @aria-labelledby: navigationLabelledBy" itemize="entries">
    <template>
      <agui-button class="agui-nav-item agui-button-ghost w-full justify-start aria-[current=page]:text-agui-accent"
        bind="$.value: value; @aria-current: current; @disabled: disabled; onclick: select">
        <agui-icon bind="$.name: ^icon; hidden: !^icon"></agui-icon>{{^label}}
      </agui-button>
    </template>
  </nav>
`;var $=e`
  <nav bind="@aria-label: navigationLabel; @aria-labelledby: navigationLabelledBy">
    <ol class="flex min-w-0 flex-wrap items-center gap-x-1" itemize="entries">
      <template>
        <li class="flex min-w-0 max-w-full items-center gap-1">
          <agui-icon name="chevron_right" class="text-agui-muted" aria-hidden="true"></agui-icon>
          <agui-button class="agui-button-ghost h-auto min-h-8 min-w-0 max-w-full px-1.5 py-1 text-agui-muted hover:underline aria-[current=location]:font-medium aria-[current=location]:text-agui-accent"
            bind="$.value: value; @aria-current: current; @disabled: disabled; onclick: select">
            <agui-icon bind="$.name: ^icon; hidden: !^icon"></agui-icon>
            <span class="whitespace-normal break-all text-start">{{^label}}</span>
          </agui-button>
        </li>
      </template>
    </ol>
  </nav>
`;var S=e`
  <label class="agui-control-label">
    ${t}
    <span class="agui-select-control">
      <select ref="control"></select>
      ${i}
    </span>
  </label>
  ${a}
`;var w=e`<label>${t}<input ref="control" type="checkbox" switch role="switch"></label>${a}`;var N=e`
  <div ref="message" class="agui-state-message grid gap-3 border p-4 text-sm" bind="hidden: stateHidden; @role: stateRole; @aria-busy: stateBusy">
    <div class="flex items-center gap-3">
      <agui-preloader aria-hidden="true" bind="hidden: !stateLoading"></agui-preloader>
      <p bind="textContent: stateMessage"></p>
    </div>
    <button class="agui-button justify-self-start" type="button" bind="textContent: stateRetryLabel; hidden: !retryVisible; onclick: retry"></button>
  </div>
`;var z=e`
  <progress class="agui-preloader-indicator" bind="@aria-label: progressLabel; @aria-labelledby: progressLabelledBy"></progress>
  <span class="agui-preloader-dots" aria-hidden="true">
    <span></span>
    <span></span>
    <span></span>
  </span>
`;var K=e`
  <agui-state bind="$.status: statusState; $.message: statusMessage; hidden: !statusMessage"></agui-state>
  <ol role="list" bind="@aria-label: progressLabel; @aria-labelledby: progressLabelledBy" itemize="entries">
    <template>
      <li bind="@data-state: state; @aria-current: current">
        <span class="agui-step-marker" aria-hidden="true">
          <agui-icon name="check" bind="hidden: !completed"></agui-icon>
          <span bind="textContent: number; hidden: completed"></span>
        </span>
        <span class="agui-step-label" bind="textContent: label"></span>
        <span class="sr-only" bind="textContent: statusLabel"></span>
      </li>
    </template>
  </ol>
`;var F=e`<span aria-hidden="true" bind="textContent: glyph; hidden: !fontReady"></span>`;var X=e`
  <button ref="trigger" type="button" aria-haspopup="dialog"
    bind="onclick: open; textContent: triggerLabel; hidden: !triggerLabel; @aria-controls: surfaceId; @aria-expanded: openedText"></button>
  <dialog ref="dialog" class="agui-dialog-surface" bind="id: surfaceId; @aria-label: dialogLabel">
    <div class="agui-dialog-heading">
      <h2 bind="textContent: dialogLabel; hidden: !dialogLabel"></h2>
      <button type="button" class="agui-button-icon agui-button-ghost"
        bind="onclick: close; @aria-label: dismissLabel; hidden: !dismissLabel">
        <agui-icon name="close"></agui-icon>
      </button>
    </div>
    <div class="agui-dialog-content"><slot></slot></div>
  </dialog>
`;var Q=e`
  <agui-state bind="$.status: statusState; $.message: statusMessage; hidden: !statusMessage"></agui-state>
  <figure>
    <figcaption bind="textContent: chartLabel"></figcaption>
    <p class="agui-chart-description" bind="textContent: chartDescription; hidden: !chartDescription"></p>
    <div ref="plot" class="agui-chart-plot" role="img" bind="@aria-label: chartLabel; hidden: plotHidden"></div>
  </figure>
  <details bind="hidden: !modelValid">
    <summary bind="textContent: dataLabel"></summary>
    <agui-chart-data ref="data" page-size="20"
      bind="id: dataTableId; $.label: chartLabel; $.rows: dataRows; $.columns: dataColumns; $.texts: texts; $.value: effectiveSelected; $.selection: dataSelectionMode; $.disabled: dataDisabled; $.loading: dataLoading; $.error: dataError"></agui-chart-data>
  </details>
`;var te=e`
  <agui-state bind="$.status: statusState; $.message: statusMessage; hidden: !statusMessage"></agui-state>
  <div class="agui-table-scroll" role="region" tabindex="0" bind="@aria-label: tableLabel; hidden: surfaceHidden; @aria-busy: busyText">
    <table>
      <caption bind="textContent: tableLabel"></caption>
      <thead><tr itemize="headings" item-tag="agui-table-heading"></tr></thead>
      <tbody itemize="bodyRows" item-tag="agui-table-row"></tbody>
    </table>
  </div>
  <div class="agui-table-footer" bind="hidden: surfaceHidden">
    <p aria-live="polite">
      <span bind="textContent: resultsLabel"></span> <output bind="textContent: filteredCount"></output> / <output bind="textContent: totalCount"></output>
      <span bind="hidden: !selectionEnabled"> · <span bind="textContent: selectedLabel"></span> <output bind="textContent: selectedCount"></output></span>
    </p>
    <div class="agui-table-pagination" role="group" bind="@aria-label: paginationLabel; hidden: paginationHidden">
      <button type="button" bind="onclick: previous_page; disabled: previousDisabled; @aria-label: previousLabel"><agui-icon name="chevron_left"></agui-icon></button>
      <span class="agui-table-page"><span bind="textContent: pageLabel"></span> <output bind="textContent: effectivePage"></output> / <output bind="textContent: pageCount"></output></span>
      <button type="button" bind="onclick: next_page; disabled: nextDisabled; @aria-label: nextLabel"><agui-icon name="chevron_right"></agui-icon></button>
    </div>
  </div>
`,ae=e`
  <th scope="col" bind="id: headingId; @aria-sort: ariaSort; @data-column: columnKey">
    <div class="agui-table-heading-content">
      <agui-field type="checkbox" pub-to="^selectionValue"
        bind="hidden: !selectAll; $.disabled: unavailable; $.value: selected; $.indeterminate: mixed; @aria-label: selectAllLabel"></agui-field>
      <span bind="textContent: label; hidden: sortable"></span>
      <button class="agui-table-sort" type="button" bind="onclick: sort_column; hidden: !sortable; disabled: unavailable">
        <span bind="textContent: label"></span><agui-icon bind="$.name: sortIcon" aria-hidden="true"></agui-icon>
      </button>
    </div>
  </th>
`,ie=e`
  <tr ref="row" bind="@data-row-id: rowId; @data-selectable: selectable; @aria-selected: selectedText; tabIndex: tabIndex" itemize="cells" item-tag="agui-table-cell"></tr>
`,ne=e`
  <td bind="@headers: headingId; @data-column: columnKey">
    <span bind="hidden: isSelection">
      <span bind="textContent: text; className: cellClass; @data-tone: tone"></span>
    </span>
    <agui-field pub-to="^selectionValue"
      bind="@type: selectionType; @name: groupName; @value: rowId; $.value: +selectionValue; hidden: !isSelection; $.disabled: unavailable; @aria-label: selectLabel"></agui-field>
  </td>
`;var de=e`
  <agui-state bind="$.status: statusState; $.message: statusMessage; hidden: !statusMessage"></agui-state>
  <figure>
    <figcaption bind="textContent: mapLabel"></figcaption>
    <p class="agui-map-description" bind="textContent: mapDescription; hidden: !mapDescription"></p>
    <div ref="canvas" class="agui-map-canvas" role="region" bind="@aria-label: mapLabel; hidden: mapHidden"></div>
    <p class="agui-map-attribution" bind="hidden: !attribution">
      <a target="_blank" rel="noopener noreferrer" bind="textContent: attribution; href: attributionUrl; hidden: !attributionUrl"></a>
      <span bind="textContent: attribution; hidden: attributionUrl"></span>
    </p>
    <p class="agui-map-skipped" bind="hidden: !skippedCount"><span bind="textContent: skippedLabel"></span>: <span bind="textContent: skippedCount"></span></p>
  </figure>
  <agui-toolbar bind="@aria-label: mapLabel">
    <button type="button" bind="textContent: ^fitLabel; disabled: ^fitUnavailable; onclick: ^onFit"></button>
    <button type="button" bind="textContent: ^zoomInLabel; disabled: ^unavailable; onclick: ^onZoomIn"></button>
    <button type="button" bind="textContent: ^zoomOutLabel; disabled: ^unavailable; onclick: ^onZoomOut"></button>
  </agui-toolbar>
  <details bind="hidden: !modelValid">
    <summary bind="textContent: dataLabel"></summary>
    <agui-map-data ref="data" page-size="20"
      bind="id: dataTableId; $.label: mapLabel; $.rows: dataRows; $.columns: dataColumns; $.texts: texts; $.value: effectiveSelected; $.selection: dataSelectionMode; $.disabled: dataDisabled"></agui-map-data>
  </details>
`;var be=e`
  <agui-state bind="$.status: statusState; $.message: statusMessage; hidden: !statusMessage"></agui-state>
  <article ref="body" class="agui-markdown-content" bind="@aria-label: documentLabel; @aria-busy: busy; hidden: contentHidden"></article>
`;var pe=e`
  <agui-state bind="$.status: statusState; $.message: statusMessage; hidden: !statusMessage"></agui-state>
  <figure>
    <figcaption bind="textContent: diagramLabel; hidden: !diagramLabel"></figcaption>
    <p class="text-sm text-agui-muted" bind="textContent: diagramDescription; hidden: !diagramDescription"></p>
    <div ref="plot" class="agui-diagram-plot" role="img"
      bind="@aria-label: diagramLabel; @aria-busy: busyText; hidden: plotHidden"></div>
  </figure>
  <details bind="hidden: !hasSource">
    <summary bind="textContent: sourceLabel"></summary>
    <pre class="overflow-auto text-sm"><code bind="textContent: sourceText"></code></pre>
  </details>
`;var he=e`
  <p class="agui-kanban-hint" bind="textContent: moveHint; hidden: !moveHint"></p>
  <agui-state bind="$.status: statusState; $.message: statusMessage; hidden: !statusMessage"></agui-state>
  <div class="agui-kanban-scroll" role="region" tabindex="0" bind="@aria-label: boardLabel; @aria-busy: busyText; hidden: surfaceHidden">
    <ul class="agui-kanban-columns" itemize="columnItems" item-tag="agui-kanban-column"></ul>
  </div>
`,xe=e`
  <li class="agui-kanban-column" bind="@data-status: statusValue; @data-unassigned: unassigned">
    <h3 class="agui-kanban-column-heading">
      <output class="agui-chip" bind="textContent: count; @aria-label: countLabel; @data-tone: tone"></output>
      <span bind="textContent: label"></span>
    </h3>
    <p class="agui-kanban-empty" bind="textContent: emptyLabel; hidden: !empty"></p>
    <ul class="agui-kanban-cards" itemize="cards" item-tag="agui-kanban-card"></ul>
  </li>
`,fe=e`
  <li ref="card" class="agui-kanban-card" bind="@data-record-id: recordId; draggable: !unavailable; tabIndex: tabIndex; @aria-disabled: disabledText; @aria-description: moveHint">
    <h4 bind="textContent: title"></h4>
    <p class="agui-kanban-description" bind="textContent: description; hidden: !description"></p>
  </li>
`;var Ee=e`
  <agui-field class="agui-filter-query" type="search" maxlength="2048" pub-to="^queryText"
    bind="$.label: queryLabel; $.value: queryText; $.disabled: unavailable"></agui-field>
  <div class="agui-filter-fields" itemize="fieldItems" item-tag="agui-filter-field"></div>
  <agui-state bind="$.status: statusState; $.message: statusMessage; hidden: !statusMessage"></agui-state>
`,ve=e`
  <fieldset bind="disabled: unavailable; @data-field: fieldKey">
    <legend class="block pb-2 text-xs font-medium uppercase tracking-wide text-agui-muted"
      bind="textContent: label; hidden: !isRange"></legend>
    <agui-field type="search" maxlength="2048" pub-to="^containsValue"
      bind="hidden: !isContains; $.label: label; $.value: containsValue; $.disabled: unavailable"></agui-field>
    <agui-select pub-to="^equalsValue"
      bind="hidden: !isEquals; $.label: label; $.value: equalsValue; $.options: selectOptions; $.disabled: unavailable"></agui-select>
    <div class="agui-filter-range" bind="hidden: !isRange">
      <agui-field ref="min" pub-to="^minValue"
        bind="@type: rangeType; $.label: minLabel; $.value: minValue; $.disabled: unavailable; @max: maxValue; @step: rangeStep"></agui-field>
      <agui-field ref="max" pub-to="^maxValue"
        bind="@type: rangeType; $.label: maxLabel; $.value: maxValue; $.disabled: unavailable; @min: minValue; @step: rangeStep"></agui-field>
    </div>
  </fieldset>
`;var Ae=e`
  <div ref="items" class="agui-list-items" itemize="itemsToRender"></div>
`;var _e=e`
  <div role="listitem" class="grid min-w-0 gap-1" bind="style.paddingInlineStart: indent">
    <button type="button" class="agui-button-ghost w-full justify-start aria-pressed:text-agui-accent"
      bind="value: id; onclick: activateNode; @disabled: nodeDisabled; ariaExpanded: nodeExpanded; ariaPressed: nodeSelected; @aria-label: actionLabel; @title: label">
      <agui-icon bind="$.name: ^nodeIcon"></agui-icon>
      <span class="truncate" bind="textContent: label"></span>
      <agui-preloader class="size-4" aria-hidden="true" bind="hidden: !loading"></agui-preloader>
    </button>
    <p class="break-words text-xs text-agui-muted empty:hidden" bind="textContent: message; hidden: !showMessage"></p>
    <button type="button" class="agui-button-ghost w-fit" bind="onclick: loadMore; textContent: moreLabel; hidden: !showMore; @disabled: nodeDisabled"></button>
  </div>
`;var Pe=e`
  <agui-icon 
    bind="$.name: iconName" 
    aria-hidden="true"></agui-icon>
  <p class="agui-message-text" 
    bind="textContent: message; @role: messageRole; @aria-live: liveMode" 
    aria-atomic="true"></p>
  <button 
    class="agui-message-dismiss agui-button-icon agui-button-ghost" 
    type="button" 
    bind="onclick: dismiss; @aria-label: closeLabel; hidden: !closeLabel">
    <agui-icon name="close" aria-hidden="true"></agui-icon>
  </button>
`;export{l as a,o as b,u as c,c as d,h as e,x as f,T as g,y as h,$ as i,S as j,w as k,N as l,z as m,K as n,F as o,X as p,Q as q,te as r,ae as s,ie as t,ne as u,de as v,be as w,pe as x,he as y,xe as z,fe as A,Ee as B,ve as C,Ae as D,_e as E,Pe as F};
