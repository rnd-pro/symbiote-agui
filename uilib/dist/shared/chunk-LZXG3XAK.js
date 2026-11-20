import{a as P,d as h,e as b,g as k,h as Ve,p as m,x as Ut}from"./chunk-2HFCZ3PH.js";import{a as Mt,b as B,c as le,d as Fe,e as Ae,f as de,g as ue,h as Ot,i as Rt}from"./chunk-JV4FAEZT.js";import{a as S,b as Nt,c as Dt,d as Pt,e as I,f as ce}from"./chunk-RLRHNZQE.js";import{a as jt,c as We,d as qt}from"./chunk-SCWUJSPD.js";import{a as zt,b as C,c as Bt,e as Le,f as Ge}from"./chunk-HUQDBIKO.js";function w(i,e){return i.dispatchEvent(new CustomEvent("agui:action",{bubbles:!0,composed:!0,detail:e}))}var j=2048,mt=Object.freeze(["name","autocomplete","form","aria-label","aria-labelledby"]),pt=Object.freeze(["placeholder","min","max","step","minlength","maxlength","pattern","size","rows","cols","wrap","inputmode","enterkeyhint","spellcheck","autocapitalize"]),M=Object.freeze(Object.fromEntries([...mt,"aria-describedby","required-mark","label","hint","error","disabled","readonly","required","value"].map(i=>[i,`attribute-${i}`]))),Kt=Object.freeze(["text","search","email","url","tel","number","date","checkbox","radio"]);var c=class extends Ve{processInnerHtml=!1;allowCustomTemplate=!1;get actionId(){return this.id||this.getAttribute("ctx")?.trim()||this.localName}announce(e,t){let r=this.getAttribute("ctx")?.trim()||null,a={widgetId:this.actionId,context:r,action:e};return typeof t=="string"&&t.length>j?a.valueLength=t.length:t!==void 0&&(a.value=t),w(this,a)}};var Ht=b`
  @layer components {
    agui-dashboard {
      display: grid;
      width: 100%;
      min-width: 0;
      max-width: var(--agui-content-width);
      margin-inline: auto;
      grid-template-columns: minmax(0, 1fr);
      gap: calc(var(--spacing, .25rem) * 4);
      padding: calc(var(--spacing, .25rem) * 4);
      font-family: var(--font-sans, ui-sans-serif, system-ui, sans-serif);
      font-size: var(--text-base, 1rem);
      line-height: var(--text-base--line-height, 1.5);
    }
    agui-dashboard[density='compact'] {
      --agui-panel-padding: 1rem;
    }
    agui-dashboard > agui-header,
    agui-dashboard > agui-toolbar,
    agui-dashboard > [slot='full'] {
      grid-column: 1 / -1;
    }
    @media (width >= 40rem) {
      agui-dashboard {
        gap: calc(var(--spacing, .25rem) * 6);
        padding: calc(var(--spacing, .25rem) * 6);
      }
    }
    @media (width >= 48rem) {
      agui-dashboard:is([layout='equal'], [layout='grid']) {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }
    @media (width >= 64rem) {
      agui-dashboard[layout='split'] {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }
      agui-dashboard[layout='split'] > [slot='main'] {
        grid-column: span 2 / span 2;
      }
    }
    @media (width >= 80rem) {
      agui-dashboard[layout='grid'] {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }
    }
  }
`;var ke=class extends c{processInnerHtml=!0};ke.rootStyles=Ht;var Vt=b`
  @layer components {
    agui-app {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      grid-template-rows: auto auto minmax(0, 1fr) auto auto auto;
      box-sizing: border-box;
      block-size: var(--agui-app-height, 100dvh);
      min-inline-size: 0;
      overflow: clip;
    }
    agui-app > agui-header,
    agui-app > [slot='header'] {
      grid-column: 1;
      grid-row: 1;
    }
    agui-app > agui-sidebar {
      grid-column: 1;
      grid-row: 2;
    }
    agui-app > agui-viewport {
      grid-column: 1;
      grid-row: 3;
    }
    agui-app > agui-sidebar[side='end'] {
      grid-row: 4;
    }
    agui-app > agui-footer,
    agui-app > [slot='footer'] {
      grid-column: 1;
      grid-row: 5;
    }
    @media (width >= 64rem) {
      agui-app {
        grid-template-columns: auto minmax(0, 1fr) auto;
        grid-template-rows: auto minmax(0, 1fr) auto auto;
      }
      agui-app > agui-header,
      agui-app > [slot='header'] {
        grid-column: 1 / -1;
      }
      agui-app > agui-viewport {
        grid-column: 2;
        grid-row: 2;
      }
      agui-app > agui-sidebar[side='end'] {
        grid-column: 3;
        grid-row: 2;
      }
      agui-app > agui-footer,
      agui-app > [slot='footer'] {
        grid-column: 1 / -1;
        grid-row: 3;
      }
    }
  }
`;var $e=class extends c{processInnerHtml=!0};$e.rootStyles=Vt;function O(i,e){if(e.shadowRoot)return;let t=[...i.querySelectorAll("slot")];if(!t.length)return;let r={};t.forEach(a=>{let s=a.getAttribute("name")||P.DEFAULT_SLOT_KEY;r[s]={slot:a,fr:document.createDocumentFragment()}}),e.initChildren.forEach(a=>{let s=P.DEFAULT_SLOT_KEY;a instanceof Element&&a.hasAttribute("slot")&&(s=a.getAttribute("slot"),a.removeAttribute("slot")),r[s]?.fr.appendChild(a)}),Object.values(r).forEach(a=>{if(a.fr.childNodes.length)a.slot.parentNode.replaceChild(a.fr,a.slot);else if(a.slot.childNodes.length){let s=document.createDocumentFragment();s.append(...a.slot.childNodes),a.slot.parentNode.replaceChild(s,a.slot)}else a.slot.remove()})}var Ft=h`
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
`;var Gt=b`
  @layer components {
    agui-sidebar {
      display: grid;
      grid-template-rows: auto minmax(0, 1fr);
      min-inline-size: 0;
      min-block-size: 0;
      max-block-size: min(30dvh, 16rem);
      background: var(--agui-surface);
      border-block-end: 1px solid var(--agui-divider);
    }
    .agui-sidebar-heading {
      display: flex;
      align-items: center;
      gap: .5rem;
      min-inline-size: 0;
      padding: .5rem;
    }
    .agui-sidebar-heading > span {
      overflow-wrap: anywhere;
    }
    .agui-sidebar-content {
      min-block-size: 0;
      overflow: auto;
      overscroll-behavior: contain;
      padding: 1rem;
    }
    .agui-sidebar-content[hidden] {
      display: none;
    }
    @media (width >= 64rem) {
      agui-sidebar {
        inline-size: var(--agui-sidebar-width);
        max-inline-size: 35vw;
        max-block-size: none;
        border-block-end: 0;
        border-inline-end: 1px solid var(--agui-divider);
      }
      agui-sidebar[side='end'] {
        border-inline-end: 0;
        border-inline-start: 1px solid var(--agui-divider);
      }
      agui-sidebar[data-expanded='false'] {
        inline-size: calc(var(--agui-control-height) + 1rem);
      }
    }
  }
`;var sa=0,Wt=Object.freeze({value:"collapsed",label:"label",expandLabel:"expand-label",collapseLabel:"collapse-label",collapseEmpty:"collapse-empty",disabled:"disabled",readonly:"readonly"}),U=class extends c{desktopQuery;contentObserver;init$={value:void 0,label:void 0,expandLabel:void 0,collapseLabel:void 0,collapseEmpty:void 0,disabled:void 0,readonly:void 0,expanded:!0,expandedText:"true",sidebarLabel:"",toggleLabel:"",unavailable:!1,contentId:"",set_value:new m({description:"Expand or collapse this sidebar. Returns its value and change flag.",inputSchema:{type:"object",properties:{value:{type:"boolean"}},required:["value"],additionalProperties:!1},execute:({value:e})=>this.commit(e)}),read_value:new m({description:"Read whether this sidebar is expanded.",execute:()=>({value:this.$.expanded})}),toggle:new m({description:"Toggle this sidebar between expanded and collapsed.",execute:()=>this.commit(!this.$.expanded)})};constructor(){super(),this.templateProcessors.add(O)}renderCallback(){this.desktopQuery=matchMedia("(width >= 64rem)"),this.desktopQuery.addEventListener("change",this.refreshLayout);let e=this.attachInternals();e.role="complementary",this.hasAttribute("tabindex")||(this.tabIndex=-1),this.$.contentId=`agui-sidebar-content-${++sa}`;for(let[t,r]of Object.entries(Wt)){let a=()=>{this.refresh(),e.ariaLabel=String(this.$.sidebarLabel)};this.sub(t,a),this.sub(`attribute-${r}`,a)}}refreshLayout=()=>this.refresh();hasContent(e){return[...e.childNodes].some(t=>{if(t.nodeType===Node.TEXT_NODE)return!!t.textContent?.trim();if(!(t instanceof Element)||t.matches("template, script, style"))return!1;let r=getComputedStyle(t);return r.display==="none"||r.visibility==="hidden"||r.visibility==="collapse"?!1:t.matches('input, select, textarea, button, a[href], img, svg, canvas, video, audio, iframe, [contenteditable], [role="progressbar"]')?!0:this.hasContent(t)})}refresh(){let e=!!(this.$.collapseEmpty??this.hasAttribute("collapse-empty"));e&&!this.contentObserver&&(this.contentObserver=new MutationObserver(()=>this.refresh()),this.contentObserver.observe(this.ref.content,{childList:!0,subtree:!0,characterData:!0,attributes:!0,attributeFilter:["hidden","class","style"]}));let t=e&&!this.hasContent(this.ref.content),r=this.$.value??(!this.hasAttribute("collapsed")&&!!this.desktopQuery?.matches);if(typeof r!="boolean")throw new Error("Sidebar value must be a boolean.");r&&=!t;let a=String(this.$.label??this.getAttribute("label")??""),s=r?this.$.collapseLabel??this.getAttribute("collapse-label"):this.$.expandLabel??this.getAttribute("expand-label"),n=t||!!(this.$.disabled??this.hasAttribute("disabled"))||!!(this.$.readonly??this.hasAttribute("readonly"));!r&&this.ref.content.contains(document.activeElement)&&(n||this.ref.toggle.matches(":disabled")?this:this.ref.toggle).focus({preventScroll:!0}),this.set$({expanded:r,expandedText:String(r),sidebarLabel:a,toggleLabel:String(s??a),unavailable:n}),this.dataset.expanded=String(r)}commit(e){if(this.$.unavailable||this.ref.toggle.matches(":disabled"))throw new Error("This sidebar is disabled or read-only.");if(typeof e!="boolean")throw new Error("Sidebar value must be a boolean.");let t=!Object.is(this.$.expanded,e);if(t){this.$.value=e;let r=this.getAttribute("pub-to")?.trim();r&&!Object.is(this.$[r],e)&&(this.$[r]=e),this.announce("change",e)}return{value:e,changed:t}}destroyCallback(){super.destroyCallback(),this.contentObserver?.disconnect(),this.desktopQuery?.removeEventListener("change",this.refreshLayout)}};U.bindAttributes(Object.fromEntries(Object.values(Wt).map(i=>[i,`attribute-${i}`])));U.template=Ft;U.rootStyles=Gt;function Yt(i){return i==="true"?!0:i==="false"?!1:i}var Jt=h`
  <fieldset bind="disabled: inactive">
    <legend ref="heading" tabindex="-1" bind="textContent: blockLabel"></legend>
    <div ref="content" bind="hidden: inactive; inert: inactive">
      <slot></slot>
    </div>
  </fieldset>
`;var Xt=b`
  @layer components {
    agui-sidebar-block {
      display: block;
      min-inline-size: 0;
      border-block-end: 1px solid var(--agui-divider);
      padding-top: .5rem;
      padding-bottom: 1rem;

      &:first-of-type {
        padding-top: 0;
      }

      &:last-of-type {
        border: none;
      }

      > fieldset {
        min-inline-size: 0;
        margin: 0;
        border: 0;
        padding: 0;

        > legend {
          max-inline-size: 100%;
          padding: 0;
          overflow-wrap: anywhere;
          color: var(--agui-muted);
          font-size: var(--text-xs, .75rem);
          line-height: var(--text-xs--line-height, 1.3333333333);
          font-weight: var(--font-weight-medium, 500);
          letter-spacing: var(--tracking-wider, .05em);
          text-transform: uppercase;
        }

        > div {
          display: grid;
          gap: calc(var(--spacing, .25rem) * 3);
          margin-block-start: calc(var(--spacing, .25rem) * 2);
        }

        > div[hidden] {
          display: none;
        }
      }

      &[data-active='false'] > fieldset > legend {
        opacity: .5;
        pointer-events: none;
        user-select: none;
      }
    }
    @media (prefers-reduced-motion: no-preference) {
      agui-sidebar-block > fieldset > legend {
        transition-property: color, opacity;
        transition-duration: var(--agui-motion-fast);
        transition-timing-function: var(--agui-motion-ease);
      }
    }
  }
`;var K=class extends c{init$={label:void 0,active:void 0,blockLabel:"",inactive:!1};constructor(){super(),this.templateProcessors.add(O)}renderCallback(){for(let e of["label","active","attribute-label","attribute-active"])this.sub(e,()=>this.refresh())}refresh(){let e=Yt(this.$.active??this.getAttribute("active")??!0);if(e===""&&(e=!0),typeof e!="boolean")throw new TypeError("agui-sidebar-block active must be a boolean.");!e&&this.ref.content.contains(document.activeElement)&&this.ref.heading.focus({preventScroll:!0}),this.set$({blockLabel:String(this.$.label??this.getAttribute("label")??""),inactive:!e}),this.dataset.active=String(e)}};K.bindAttributes({label:"attribute-label",active:"attribute-active"});K.template=Jt;K.rootStyles=Xt;var Zt=b`
  @layer components {
    agui-viewport {
      --agui-header-height: 0px;
      display: block;
      min-inline-size: 0;
      min-block-size: 0;
      overflow: auto;
      overscroll-behavior: contain;
    }
    agui-viewport:focus-visible {
      outline: 2px solid var(--agui-accent);
      outline-offset: -2px;
    }
  }
`;var _e=class extends c{processInnerHtml=!0;renderCallback(){this.hasAttribute("role")||this.setAttribute("role","main"),this.hasAttribute("tabindex")||(this.tabIndex=0)}};_e.rootStyles=Zt;var Qt=0,ei=Object.freeze(["value","label","disabled"]),H=class extends c{processInnerHtml=!0;ready=!1;buttonId="";init$={value:void 0,label:void 0,disabled:void 0};renderCallback(){this.id||=`agui-tab-panel-${++Qt}`,this.buttonId=`agui-tab-trigger-${++Qt}`,this.setAttribute("role","tabpanel"),this.setAttribute("aria-labelledby",this.buttonId),this.hasAttribute("tabindex")||(this.tabIndex=0),this.ready=!0;for(let e of ei)this.sub(e,()=>this.refreshOwner()),this.sub(`attribute-${e}`,()=>this.refreshOwner())}get definition(){let e=this.$.value??this.getAttribute("value")??"";if(typeof e!="string")throw new Error("Tab values must be strings.");return{value:e,label:String(this.$.label??this.getAttribute("label")??""),disabled:!!(this.$.disabled??this.hasAttribute("disabled"))}}refreshOwner(){let e=this.parentElement?.closest("agui-tabs");e?.ready&&e.refresh()}destroyCallback(){super.destroyCallback(),this.ready=!1}};H.bindAttributes(Object.fromEntries(ei.map(i=>[i,`attribute-${i}`])));var ti=h`
  <div ref="list" class="agui-tabs-list" role="tablist"
    bind="@aria-label: listLabel; @aria-orientation: listOrientation"
    itemize="buttons" item-tag="agui-tab-button"></div>
  <div ref="panels" class="agui-tabs-panels"><slot></slot></div>
`,ii=h`
  <button ref="button" type="button" role="tab" class="agui-tab-trigger"
    bind="id: id; value: value; textContent: label; disabled: disabled; tabIndex: tabIndex; @aria-selected: selected; @aria-controls: panelId; onclick: select">
  </button>
`;var ri=b`
  @layer components {
    agui-tabs {
      display: grid;
      min-inline-size: 0;
      gap: 1rem;
    }
    .agui-tabs-list {
      display: flex;
      align-items: stretch;
      min-inline-size: 0;
      gap: .5rem;
      overflow: auto;
      padding: 0;
      border-bottom: 1px solid var(--agui-divider);
    }
    agui-tab-button {
      display: contents;
    }
    .agui-tab-trigger {
      position: relative;
      flex-shrink: 0;
      height: auto;
      min-height: var(--agui-control-height);
      padding: .625rem .75rem;
      font-weight: inherit;
      white-space: nowrap;
      color: var(--agui-muted);
    }
    .agui-tab-trigger,
    .agui-tab-trigger:hover:enabled,
    .agui-tab-trigger:active:enabled {
      border: 0;
      border-radius: 0;
      background: transparent;
      box-shadow: none;
    }
    .agui-tab-trigger::after {
      position: absolute;
      inset-inline: .75rem;
      inset-block-end: 0;
      block-size: 2px;
      background: transparent;
      content: '';
    }
    .agui-tab-trigger:hover:enabled,
    .agui-tab-trigger[aria-selected='true'] {
      color: var(--agui-text);
    }
    .agui-tab-trigger[aria-selected='true']::after {
      background: var(--agui-accent);
    }
    .agui-tab-trigger:focus-visible {
      outline-offset: -2px;
    }
    .agui-tabs-panels,
    agui-tab {
      display: block;
      min-inline-size: 0;
    }
    agui-tab[hidden] {
      display: none;
    }
    agui-tab:focus-visible {
      outline: 2px solid var(--agui-accent);
      outline-offset: 2px;
    }
    agui-tabs[data-orientation='vertical'] {
      grid-template-columns: fit-content(16rem) minmax(0, 1fr);
    }
    .agui-tabs-list[aria-orientation='vertical'] {
      flex-direction: column;
      align-self: start;
      border-bottom: 0;
      border-inline-end: 1px solid var(--agui-divider);
    }
    .agui-tabs-list[aria-orientation='vertical'] .agui-tab-trigger {
      justify-content: flex-start;
      text-align: start;
      white-space: normal;
      overflow-wrap: anywhere;
    }
    .agui-tabs-list[aria-orientation='vertical'] .agui-tab-trigger::after {
      inset-block: .5rem;
      inset-inline-start: auto;
      inset-inline-end: 0;
      inline-size: 2px;
      block-size: auto;
    }
    @supports (anchor-name: --agui-active-tab) and (anchor-scope: --agui-active-tab) {
      .agui-tabs-list {
        position: relative;
        anchor-scope: --agui-active-tab;
      }
      .agui-tab-trigger[aria-selected='true'] {
        anchor-name: --agui-active-tab;
      }
      .agui-tab-trigger::after {
        content: none;
      }
      .agui-tabs-list:has([aria-selected='true'])::after {
        position: absolute;
        position-anchor: --agui-active-tab;
        inset-inline-start: calc(anchor(start) + .75rem);
        inset-inline-end: calc(anchor(end) + .75rem);
        inset-block-start: calc(anchor(end) - 2px);
        inset-block-end: anchor(end);
        background: var(--agui-accent);
        pointer-events: none;
        content: '';
      }
      .agui-tabs-list[aria-orientation='vertical']::after {
        inset-inline-start: calc(anchor(end) - 2px);
        inset-inline-end: anchor(end);
        inset-block-start: calc(anchor(start) + .5rem);
        inset-block-end: calc(anchor(end) + .5rem);
      }
      @media (prefers-reduced-motion: no-preference) {
        .agui-tabs-list::after {
          transition: inset var(--agui-motion-fast) var(--agui-motion-ease);
        }
      }
    }
    @media (forced-colors: active) {
      .agui-tabs-list:has([aria-selected='true'])::after,
      .agui-tab-trigger[aria-selected='true']::after {
        forced-color-adjust: none;
        background: Highlight;
      }
    }
  }
`;var na=Object.freeze({ArrowLeft:-1,ArrowRight:1}),oa=Object.freeze({ArrowUp:-1,ArrowDown:1}),ai=Object.freeze(["value","label","orientation","disabled","readonly"]),V=class extends c{componentDescription=()=>JSON.stringify({id:this.id,label:String(this.$.label??this.getAttribute("label")??"")});ready=!1;focusValue="";panelObserver;init$={value:void 0,label:void 0,orientation:void 0,disabled:void 0,readonly:void 0,activeValue:"",buttons:[],listLabel:"",listOrientation:"horizontal",selectTab:e=>this.commit(e),set_value:new m({description:"Select an enabled tab by value. Returns only its effective value and change flag.",inputSchema:{type:"object",properties:{value:{type:"string",minLength:1,maxLength:j}},required:["value"],additionalProperties:!1},execute:({value:e})=>this.commit(e)}),read_value:new m({description:"Read the effective active tab value, including any local fallback.",execute:()=>({value:this.$.activeValue})})};constructor(){super(),this.templateProcessors.add(O),this.templateProcessors.add(k)}renderCallback(){this.ready=!0,this.ref.list.addEventListener("keydown",this.onKeydown),this.ref.list.addEventListener("focusout",this.onFocusout),this.panelObserver=new MutationObserver(()=>this.refresh()),this.panelObserver.observe(this.ref.panels,{childList:!0});for(let e of ai)this.sub(e,()=>this.refresh()),this.sub(`attribute-${e}`,()=>this.refresh())}get panels(){return[...this.ref.panels.children].filter(e=>e instanceof H&&e.ready)}get unavailable(){return!!(this.$.disabled??this.hasAttribute("disabled"))||!!(this.$.readonly??this.hasAttribute("readonly"))}refresh(){if(!this.ready||!this.isConnected)return;let e=this.panels,t=e.map(d=>d.definition.value);if(t.some(d=>typeof d!="string"||!d.trim()||d.length>j)||new Set(t).size!==t.length)throw new Error("Tabs require unique nonempty string values within the action size limit.");let r=e.filter(d=>!d.definition.disabled),a=this.$.value??this.getAttribute("value")??"",s=r.find(d=>d.definition.value===a)||r[0],n=s?.definition.value??"",o=this.$.orientation??this.getAttribute("orientation")??"horizontal";if(o!=="horizontal"&&o!=="vertical")throw new Error("Tabs orientation must be horizontal or vertical.");let l=e.some(d=>d!==s&&d.contains(document.activeElement));(this.$.activeValue!==n||!r.some(d=>d.definition.value===this.focusValue))&&(this.focusValue=n),this.set$({activeValue:n,listLabel:String(this.$.label??this.getAttribute("label")??""),listOrientation:o,buttons:e.map(d=>({id:d.buttonId,value:d.definition.value,label:d.definition.label,disabled:this.unavailable||d.definition.disabled,selected:String(d===s),tabIndex:!this.unavailable&&d.definition.value===this.focusValue?0:-1,panelId:d.id}))}),this.dataset.orientation=o,l&&(this.buttons.find(p=>p.value===n&&!p.disabled)||this.ref.list).focus(),this.ref.list.tabIndex=this.unavailable||!r.length?0:-1;for(let d of e)d.hidden=d!==s;this.syncWebMCPTools()}get buttons(){return[...this.ref.list.querySelectorAll('button[role="tab"]')]}commit(e){if(this.unavailable)throw new Error("These tabs are disabled or read-only.");if(!this.panels.find(a=>a.definition.value===e&&!a.definition.disabled)||typeof e!="string")throw new Error("Choose an enabled tab value.");let r=this.$.activeValue!==e;if(r){this.$.value=e;let a=this.getAttribute("pub-to")?.trim();a&&!Object.is(this.$[a],e)&&(this.$[a]=e),this.announce("change",e)}return{value:e,changed:r}}onKeydown=e=>{if(e.defaultPrevented||e.altKey||e.ctrlKey||e.metaKey||this.unavailable)return;let t=this.buttons.filter(l=>!l.disabled),r=t.indexOf(e.target);if(r<0)return;let a=this.$.listOrientation==="vertical",n=(a?oa:na)[e.key];!a&&getComputedStyle(this.ref.list).direction==="rtl"&&(n*=-1);let o=e.key==="Home"?0:e.key==="End"?t.length-1:n?(r+n+t.length)%t.length:void 0;o!==void 0&&(e.preventDefault(),this.focusValue=t[o].value,this.refresh(),t[o].focus())};onFocusout=e=>{e.relatedTarget instanceof Node&&this.ref.list.contains(e.relatedTarget)||(this.focusValue=String(this.$.activeValue),this.refresh())};destroyCallback(){super.destroyCallback(),this.ready=!1,this.panelObserver?.disconnect(),this.ref.list.removeEventListener("keydown",this.onKeydown),this.ref.list.removeEventListener("focusout",this.onFocusout)}};V.bindAttributes(Object.fromEntries(ai.map(i=>[i,`attribute-${i}`])));V.template=ti;V.rootStyles=ri;var Ce=class extends c{componentDescription=()=>JSON.stringify({tabsId:this.closest("agui-tabs")?.id||"",value:this.$.value,label:this.$.label});init$={id:"",value:"",label:"",disabled:!1,selected:"false",tabIndex:-1,panelId:"",select:new m({description:"Select this tab without returning unrelated application state.",deps:["disabled","label","value"],when:()=>!this.$.disabled,execute:()=>{let e=this.$["^selectTab"];return e(this.$.value)}})}};Ce.template=ii;var si=b`
  @layer components {
    agui-panel {
      display: block;
      min-width: 0;
      border: 1px solid var(--agui-divider);
      border-radius: var(--agui-radius-panel);
      background-color: var(--agui-surface);
      padding: var(--agui-panel-padding);
      box-shadow: var(--agui-shadow-panel);

      agui-panel {
        border-color: var(--agui-divider);
        border-radius: var(--agui-radius-inset);
        background-color: var(--agui-bg);
        box-shadow: none;
      }
    }
    agui-panel > h2 {
      margin-bottom: calc(var(--spacing, .25rem) * 4);
      font-size: var(--text-lg, 1.125rem);
      line-height: var(--text-lg--line-height, 1.5555555556);
      font-weight: var(--font-weight-semibold, 600);
    }
    agui-panel[selectable] {
      border-color: var(--agui-border);
    }
    agui-panel[selectable]:not([aria-disabled='true']) {
      cursor: pointer;
    }
    @media (hover: hover) {
      agui-panel[selectable]:not([aria-disabled='true']):not([data-selected]):hover {
        background-color: var(--agui-hover);
      }
    }
    agui-panel[selectable][data-selected] {
      border-color: var(--agui-accent);
      outline: 2px solid var(--agui-accent);
    }
    agui-panel[selectable]:has(:focus-visible) {
      outline: 2px solid var(--agui-accent);
      outline-offset: 3px;
    }
    @media (prefers-reduced-motion: no-preference) {
      agui-panel[selectable] {
        transition-property: border-color, background-color;
        transition-duration: var(--agui-motion-fast);
        transition-timing-function: var(--agui-motion-ease);
      }
    }
  }
`;var Ie=class extends c{processInnerHtml=!0};Ie.rootStyles=si;var ni=b`
  @layer components {
    agui-header {
      --agui-header-gutter: calc(var(--spacing, .25rem) * 4);
      display: flex;
      width: 100%;
      min-width: 0;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: calc(var(--spacing, .25rem) * 3);
      padding-block: calc(var(--spacing, .25rem) * 3);
      padding-inline: max(var(--agui-header-gutter), calc((100% - var(--agui-content-width)) / 2 + var(--agui-header-gutter)));
    }
    agui-header h1 {
      font-size: var(--text-xl, 1.25rem);
      line-height: var(--text-xl--line-height, 1.4);
      font-weight: var(--font-weight-semibold, 600);
    }
    agui-header[floating] {
      position: sticky;
      z-index: 20;
      top: var(--agui-header-offset);
      border-bottom: 1px solid var(--agui-divider);
    }
    @media (width >= 40rem) {
      agui-header {
        --agui-header-gutter: calc(var(--spacing, .25rem) * 6);
      }
      agui-header h1 {
        font-size: var(--text-2xl, 1.5rem);
        line-height: var(--text-2xl--line-height, 1.3333333333);
      }
    }
  }
`;var he=class extends c{processInnerHtml=!0;sizeObserver;spacingTarget;renderCallback(){this.sizeObserver=new ResizeObserver(()=>this.updateSpacing()),this.sizeObserver.observe(this),this.sub("attribute-floating",()=>this.updateSpacing())}updateSpacing(){let e=this.closest("agui-dashboard")||this.nextElementSibling,t=this.closest("agui-viewport")||(e?.localName==="agui-dashboard"?e:void 0);this.spacingTarget!==t&&this.spacingTarget?.style.removeProperty("--agui-header-height"),this.spacingTarget=t instanceof HTMLElement?t:void 0,this.spacingTarget?.style.setProperty("--agui-header-height",`${this.hasAttribute("floating")?this.getBoundingClientRect().height:0}px`)}destroyCallback(){super.destroyCallback(),this.sizeObserver?.disconnect(),this.spacingTarget?.style.removeProperty("--agui-header-height")}};he.bindAttributes({floating:"attribute-floating"});he.rootStyles=ni;var oi=b`
  @layer components {
    agui-footer {
      display: flex;
      box-sizing: border-box;
      inline-size: 100%;
      min-inline-size: 0;
      flex-wrap: wrap;
      justify-content: space-between;
      gap: calc(var(--spacing, .25rem) * 2);
      border-block-start: 1px solid var(--agui-border);
      background-color: var(--agui-surface);
      padding-block: calc(var(--spacing, .25rem) * 2);
      padding-inline: calc(var(--spacing, .25rem) * 4);
      color: var(--agui-muted);
      font-size: var(--text-xs, .75rem);
      line-height: var(--text-xs--line-height, 1.3333333333);
    }
  }
`;var Me=class extends c{processInnerHtml=!0;renderCallback(){this.hasAttribute("role")||this.setAttribute("role","contentinfo")}};Me.rootStyles=oi;var li=b`
  @layer components {
    agui-toolbar {
      display: flex;
      min-width: 0;
      flex-wrap: wrap;
      align-items: start; /** Do not change to 'end'! This brakes layout when inner elements have different height */
      gap: calc(var(--spacing, .25rem) * 2);
    }
    agui-toolbar > agui-field,
    agui-toolbar > agui-select {
      min-width: 0;
      flex-grow: 1;
      flex-basis: calc(var(--spacing, .25rem) * 48);
    }
  }
`;var Oe=class extends c{processInnerHtml=!0;renderCallback(){this.setAttribute("role","group"),!this.hasAttribute("aria-label")&&!this.hasAttribute("aria-labelledby")&&this.hasAttribute("label")&&this.setAttribute("aria-label",this.getAttribute("label")||"")}};Oe.rootStyles=li;function Ye(i,e,t){for(let r of t)i.sub(`attribute-${r}`,()=>{di(i,e,r)})}function di(i,e,t){let r=Element.prototype.getAttribute.call(i,t);r===null?e.removeAttribute(t):e.setAttribute(t,r)}function ui(i,e,t){let r=new MutationObserver(s=>{a(new Set(s.map(n=>n.attributeName).filter(n=>n!==null)))}),a=s=>{r.disconnect();for(let n of s)t.has(n)||(di(i,e,n),Element.prototype.removeAttribute.call(i,n));r.observe(i,{attributes:!0})};return a(i.getAttributeNames()),r}var la=0,A=class extends c{control;descriptionIds="";init$={value:void 0,label:void 0,hint:void 0,error:void 0,requiredMark:void 0,fieldRequiredMark:"",disabled:void 0,readonly:void 0,required:void 0,fieldLabel:"",fieldHint:"",fieldError:"",fieldDisabled:!1,fieldReadonly:!1,fieldRequired:!1,set_value:new m({description:"Set this control value. Returns only the resulting value and change flag.",inputSchema:{type:"object",properties:{value:{anyOf:[{type:"string"},{type:"boolean"}]}},required:["value"],additionalProperties:!1},execute:({value:e})=>this.commit(e)}),clear_value:new m({description:"Clear this control value through its context.",execute:()=>this.commit(this.isBoolean?!1:"")}),read_value:new m({description:"Read this control value without returning unrelated application state.",execute:()=>({value:this.$.value})})};get isCheckbox(){return this.control instanceof HTMLInputElement&&this.control.type==="checkbox"}get isBoolean(){return this.isCheckbox||this.control instanceof HTMLButtonElement}renderCallback(){let e=this.ref.control;if(!(e instanceof HTMLInputElement||e instanceof HTMLTextAreaElement||e instanceof HTMLSelectElement||e instanceof HTMLButtonElement))throw new Error(`${this.localName} requires a native input, textarea, select, or toggle button.`);this.control=e,Ye(this,e,mt),e.id||=`agui-field-${++la}`;let t=this.ref.label.parentElement;t instanceof HTMLLabelElement&&(t.htmlFor=e.id),this.ref.hint.id=`${e.id}-hint`,this.ref.error.id=`${e.id}-error`,this.sub("attribute-aria-describedby",()=>{this.descriptionIds=this.getAttribute("aria-describedby")||"",this.describe()}),this.watchControlState("label",()=>this.getAttribute("label")||"",a=>{this.$.fieldLabel=String(a)});let r=()=>{this.$.fieldRequiredMark=String(this.$.requiredMark??this.getAttribute("required-mark")??"")};this.sub("requiredMark",r),this.sub("attribute-required-mark",r),this.watchControlState("hint",()=>this.getAttribute("hint")||"",a=>{this.$.fieldHint=String(a),this.describe()}),this.watchControlState("error",()=>this.getAttribute("error")||"",a=>{this.$.fieldError=String(a??""),this.describe()}),this.watchControlState("disabled",()=>this.hasAttribute("disabled"),a=>{this.$.fieldDisabled=!!a,this.setAvailability()}),this.watchControlState("readonly",()=>this.hasAttribute("readonly"),a=>{this.$.fieldReadonly=!!a,this.setAvailability()}),this.watchControlState("required",()=>this.hasAttribute("required"),a=>{"required"in e&&(e.required=!!a),this.$.fieldRequired=!!a}),this.$.value===void 0&&(this.$.value=e instanceof HTMLButtonElement?!1:this.isCheckbox&&e instanceof HTMLInputElement?e.checked:this.getAttribute("value")??e.value),this.sub("value",a=>this.showValue(a)),e.addEventListener("input",this.onInput),e.addEventListener("change",this.onInput),e.addEventListener("blur",this.onValidity),e.addEventListener("invalid",this.onValidity),e instanceof HTMLButtonElement&&e.addEventListener("click",this.onInput)}watchControlState(e,t,r){let a=()=>r(this.$[e]??t());this.sub(e,a),this.sub(`attribute-${e}`,a)}setAvailability(){if(!this.control)return;let e=!!this.$.fieldReadonly;this.control.disabled=!!this.$.fieldDisabled||e&&(this.control instanceof HTMLSelectElement||this.isBoolean||this.control.type==="radio"),"readOnly"in this.control&&(this.control.readOnly=e)}showValue(e){let t=this.control;t&&(t instanceof HTMLButtonElement?t.setAttribute("aria-pressed",String(e===!0)):t instanceof HTMLInputElement&&["checkbox","radio"].includes(t.type)?t.checked=this.isCheckbox?e===!0:String(e??"")===t.value:t.value=String(e??""),this.describe())}describe(){let e=this.control;if(!e)return;let t=[this.descriptionIds,this.$.fieldHint?this.ref.hint.id:"",this.$.fieldError?this.ref.error.id:""].filter(Boolean).join(" ");t?e.setAttribute("aria-describedby",t):e.removeAttribute("aria-describedby"),this.$.fieldError||e.matches(":user-invalid")?e.setAttribute("aria-invalid","true"):e.removeAttribute("aria-invalid")}commit(e){if(!this.control||this.control.matches(":disabled")||this.$.fieldDisabled||this.$.fieldReadonly)throw new Error("This control is disabled or read-only.");if(typeof e!=(this.isBoolean?"boolean":"string"))throw new Error(this.isBoolean?"Use a boolean value.":"Use a string value.");let t=!Object.is(this.$.value,e);if(t){this.$.value=e;let r=this.getAttribute("pub-to")?.trim();r&&!Object.is(this.$[r],e)&&(this.$[r]=e),this.announce("change",e)}return{value:e,changed:t}}onInput=()=>{this.control&&(this.control instanceof HTMLInputElement&&this.control.type==="radio"&&!this.control.checked||(this.commit(this.control instanceof HTMLButtonElement?!this.$.value:this.isCheckbox&&this.control instanceof HTMLInputElement?this.control.checked:this.control.value),this.describe()))};onValidity=()=>this.describe();destroyCallback(){super.destroyCallback(),this.control?.removeEventListener("input",this.onInput),this.control?.removeEventListener("change",this.onInput),this.control?.removeEventListener("blur",this.onValidity),this.control?.removeEventListener("invalid",this.onValidity),this.control?.removeEventListener("click",this.onInput)}};A.bindAttributes(M);var F=h`<span ref="label" class="inline-flex gap-1 text-sm text-agui-text" bind="hidden: !fieldLabel"><span bind="textContent: fieldLabel"></span><span aria-hidden="true" bind="textContent: fieldRequiredMark; hidden: !fieldRequired"></span></span>`,R=h`
  <p ref="hint" class="text-sm text-agui-muted" bind="textContent: fieldHint; hidden: !fieldHint"></p>
  <p ref="error" class="text-sm text-agui-danger" role="status" bind="textContent: fieldError; hidden: !fieldError"></p>
`,ci=h`
  <svg class="agui-select-chevron" viewBox="0 0 20 20" fill="none" aria-hidden="true" focusable="false">
    <path d="m5 7.5 5 5 5-5" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"></path>
  </svg>
`;var hi=h`<label class="agui-control-label">${F}<input ref="control"></label>${R}`,mi=h`<label class="agui-control-label">${F}<textarea ref="control"></textarea></label>${R}`;var Re=class extends A{static observedAttributes=[...A.observedAttributes,"type","checked"];constructor(){super(),Object.assign(this.init$,{indeterminate:!1})}render(e,t){super.render(e??(this.getAttribute("type")==="textarea"?mi:hi),t)}renderCallback(){let e=this.ref.control;if(!(e instanceof HTMLInputElement||e instanceof HTMLTextAreaElement))throw new Error("agui-field requires its template control.");Ye(this,e,pt),this.sub("attribute-value",()=>{e.defaultValue=this.getAttribute("value")??"",e instanceof HTMLInputElement&&e.type==="radio"&&this.showValue(this.$.value)}),this.defineAccessor("type",t=>{let r=t||"text";if(e instanceof HTMLTextAreaElement){if(r!=="textarea")throw new Error("Recreate the field to change between textarea and input.");return}if(!Kt.includes(r))throw new Error(`Unsupported agui-field input type: ${r}.`);e.type=r}),e instanceof HTMLInputElement&&this.defineAccessor("checked",t=>{e.defaultChecked=t!=null}),super.renderCallback(),this.sub("indeterminate",t=>{e instanceof HTMLInputElement&&(e.indeterminate=!!t)})}};Re.bindAttributes({...M,...Object.fromEntries(pt.map(i=>[i,`attribute-${i}`]))});var bt=Object.freeze(["value","loading"]),gt=new Set([...bt,P.BIND_ATTR,P.CTX_NAME_ATTR,P.EL_REF_ATTR,P.USE_TPL_ATTR,"pub-map","slot"]),Je=class extends c{control;attributeTarget(e){return gt.has(e.toLowerCase())?void 0:this.control}getAttribute(e){return this.attributeTarget(e)?.getAttribute(e)??super.getAttribute(e)}hasAttribute(e){return this.attributeTarget(e)?.hasAttribute(e)??super.hasAttribute(e)}setAttribute(e,t){let r=this.attributeTarget(e);r?r.setAttribute(e,t):super.setAttribute(e,t)}removeAttribute(e){let t=this.attributeTarget(e);t?t.removeAttribute(e):super.removeAttribute(e)}toggleAttribute(e,t){let r=this.attributeTarget(e);return r?t===void 0?r.toggleAttribute(e):r.toggleAttribute(e,t):t===void 0?super.toggleAttribute(e):super.toggleAttribute(e,t)}};var pi=h`
  <button ref="control" type="button" bind="ariaBusy: buttonBusy">
    <agui-preloader class="size-[1em]" aria-hidden="true" bind="hidden: !buttonLoading"></agui-preloader>
    <slot></slot>
  </button>
`;var bi=b`
  @layer components {
    agui-button {
      display: contents;
    }
  }
`;var G=class extends Je{disposed=!1;forwardedAttributes;controlObserver;componentDescription=()=>JSON.stringify({id:this.control?.id||"",label:this.control?.getAttribute("aria-label")??this.control?.textContent?.trim()??""});init$={value:void 0,loading:void 0,buttonLoading:!1,buttonBusy:"false",unavailable:!1,activate:new m({description:"Activate this native button, including its form or popover action, without returning application data.",deps:["unavailable"],when:()=>!this.unavailable,execute:()=>this.activate()})};constructor(){super(),this.templateProcessors.add(O)}get actionId(){return this.control?.id||super.actionId}get unavailable(){return this.disposed||!this.isConnected||!!this.$.buttonLoading||!this.control||this.control.matches(":disabled")||this.control.hasAttribute("readonly")||this.control.getAttribute("aria-disabled")==="true"}renderCallback(){this.control=this.ref.control,this.forwardedAttributes=ui(this,this.control,gt),this.control.addEventListener("click",this.blockLoadingClick,!0),this.controlObserver=new MutationObserver(()=>{this.$.unavailable=this.unavailable,this.syncWebMCPTools()}),this.controlObserver.observe(this.control,{attributes:!0,childList:!0,characterData:!0,subtree:!0});let e=()=>{let r=this.$.value??this.getAttribute("value");r==null?this.control?.removeAttribute("value"):this.control?.setAttribute("value",String(r))};this.sub("value",e),this.sub("attribute-value",e);let t=()=>{let r=!!(this.$.loading??this.hasAttribute("loading"));this.$.buttonLoading=r,this.$.buttonBusy=String(r),this.$.unavailable=this.unavailable};this.sub("loading",t),this.sub("attribute-loading",t),this.$.unavailable=this.unavailable}activate(){if(this.unavailable)throw new Error("This button is loading, disabled, read-only, or disconnected.");return this.control?.click(),{activated:!0}}blockLoadingClick=e=>{this.unavailable&&(e.preventDefault(),e.stopImmediatePropagation())};destroyCallback(){super.destroyCallback(),this.disposed=!0,this.forwardedAttributes?.disconnect(),this.controlObserver?.disconnect(),this.control?.removeEventListener("click",this.blockLoadingClick,!0)}};G.bindAttributes(Object.fromEntries(bt.map(i=>[i,`attribute-${i}`])));G.template=pi;G.rootStyles=bi;var gi=h`
  <nav class="grid gap-2" bind="@aria-label: navigationLabel; @aria-labelledby: navigationLabelledBy" itemize="entries">
    <template>
      <agui-button class="agui-nav-item agui-button-ghost w-full justify-start aria-[current=page]:text-agui-accent"
        bind="$.value: value; @aria-current: current; @disabled: disabled; onclick: select">
        <agui-icon bind="$.name: ^icon; hidden: !^icon"></agui-icon>{{^label}}
      </agui-button>
    </template>
  </nav>
`;var fi=b`
  @layer components {
    agui-nav {
      display: block;
      min-inline-size: 0;
    }
    .agui-nav-item {
      position: relative;
    }
    .agui-nav-item[aria-current='page']::before {
      content: '';
      position: absolute;
      inset-inline-end: 6px;
      inset-block: .5rem;
      inline-size: 3px;
      border-radius: 3px;
      background-color: var(--agui-accent);
      pointer-events: none;
    }
  }
`;var vi=Object.freeze(["value","label","disabled","readonly","aria-label","aria-labelledby"]),z=class extends c{ready=!1;componentDescription=()=>JSON.stringify({id:this.id,label:this.$.navigationLabel});init$={items:[],routes:void 0,value:void 0,label:void 0,disabled:void 0,readonly:void 0,activeValue:"",section:"",sectionName:"",sectionIcon:"",sectionSrc:"",entries:[],navigationLabel:"",navigationLabelledBy:!1,set_value:new m({description:"Select an enabled navigation section and publish its value. Returns the value and change flag.",inputSchema:{type:"object",properties:{value:{type:"string",minLength:1,maxLength:j}},required:["value"],additionalProperties:!1},execute:({value:e})=>this.commit(e)}),read_value:new m({description:"Read the current navigation section without returning application data.",execute:()=>({value:this.$.activeValue})})};renderCallback(){this.ready=!0,this.sub("items",()=>this.refresh()),this.sub("routes",()=>this.refresh());for(let e of vi)e.startsWith("aria-")||this.sub(e,()=>this.refresh()),this.sub(`attribute-${e}`,()=>this.refresh())}get unavailable(){return!this.ready||!this.isConnected||!!(this.$.disabled??this.hasAttribute("disabled"))||!!(this.$.readonly??this.hasAttribute("readonly"))}get defaultValue(){return""}get currentKind(){return"page"}get items(){let e=this.$.items,t=this.$.routes;if(t!=null){if(typeof t!="object"||Array.isArray(t))throw new TypeError("Navigation routes must be a route map.");e=Object.entries(t).filter(r=>!r[1].error).map(([r,a])=>({value:r,label:a.title??"",icon:a.icon,disabled:a.disabled,src:a.src}))}if(!Array.isArray(e)||e.some(r=>!r||typeof r.value!="string"||!r.value.trim()||r.value.length>j||typeof r.label!="string"||r.icon!==void 0&&typeof r.icon!="string"||r.src!==void 0&&typeof r.src!="string"||r.disabled!==void 0&&typeof r.disabled!="boolean")||new Set(e.map(r=>r.value)).size!==e.length)throw new TypeError("Navigation items require unique nonempty string values, string labels, and optional icon and disabled fields.");return e}refresh(){if(!this.ready||!this.isConnected)return;let e=this.items,t=this.$.value??this.getAttribute("value")??this.defaultValue;if(typeof t!="string")throw new TypeError("Navigation value must be a string.");let r=e.find(a=>!a.disabled&&a.value===t);this.set$({activeValue:r?.value??"",section:r?.value??"",sectionName:r?.label??"",sectionIcon:r?.icon??"",sectionSrc:r?.src??"",navigationLabel:String(this.$.label??this.getAttribute("label")??this.getAttribute("aria-label")??""),navigationLabelledBy:this.getAttribute("aria-labelledby")||!1,entries:e.map(a=>({value:a.value,label:a.label,icon:a.icon??"",current:a===r?this.currentKind:!1,disabled:this.unavailable||!!a.disabled,select:()=>this.commit(a.value)}))})}commit(e){if(this.unavailable)throw new Error("This navigation is disabled or read-only.");if(typeof e!="string"||!this.items.some(r=>r.value===e&&!r.disabled))throw new Error("Choose an enabled navigation section.");let t=this.$.activeValue!==e;if(t){this.$.value=e;let r=this.getAttribute("pub-to")?.trim();r&&!Object.is(this.$[r],e)&&(this.$[r]=e),this.announce("change",e),this.setAttribute("value",e),this.dispatchEvent(new Event("change",{bubbles:!0}))}return{value:e,changed:t}}destroyCallback(){super.destroyCallback(),this.ready=!1}};z.bindAttributes(Object.fromEntries(vi.map(i=>[i,`attribute-${i}`])));z.template=gi;z.rootStyles=fi;var ft=h`
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
`;var yi=b`
  @layer components {
    agui-breadcrumbs {
      display: block;
      min-inline-size: 0;
    }
    agui-breadcrumbs ol > :first-child > li > agui-icon {
      display: none;
    }
    agui-breadcrumbs:dir(rtl) li > agui-icon {
      rotate: 180deg;
    }
  }
`;var me=class extends z{render(e=ft,t){super.render(e,t)}get defaultValue(){return this.items.at(-1)?.value??""}get currentKind(){return"location"}};me.template=ft;me.rootStyles=yi;var xi=h`
  <label class="agui-control-label">
    ${F}
    <span class="agui-select-control">
      <select ref="control"></select>
      ${ci}
    </span>
  </label>
  ${R}
`;var pe=class extends A{constructor(){super(),Object.assign(this.init$,{options:[],placeholder:void 0})}renderCallback(){super.renderCallback(),this.watchControlState("placeholder",()=>this.getAttribute("placeholder")||"",()=>this.renderOptions()),this.sub("options",e=>{if(!Array.isArray(e)||e.some(t=>!t||typeof t.value!="string"||typeof t.label!="string"))throw new Error("agui-select options require string value and label properties.");this.renderOptions()})}renderOptions(){let e=this.control;if(!(e instanceof HTMLSelectElement))return;let t=String(this.$.placeholder??this.getAttribute("placeholder")??""),r=this.$.options,a=document.createDocumentFragment();t&&a.append(new Option(t,""));for(let s of r){let n=new Option(s.label,s.value);n.disabled=!!s.disabled,a.append(n)}e.replaceChildren(a),this.showValue(this.$.value)}commit(e){let t=this.$.options;if(e!==""&&!t.some(r=>r.value===e&&!r.disabled))throw new Error("Choose an enabled option value.");return super.commit(e)}};pe.bindAttributes({...M,placeholder:"attribute-placeholder"});pe.template=xi;var wi=h`
  <button ref="control" type="button"
    bind="className: buttonClass; @aria-label: buttonLabel; @title: fieldLabel; @aria-busy: saveBusy">
    <agui-preloader aria-hidden="true" bind="hidden: !saving"></agui-preloader>
    <agui-icon bind="$.name: themeIcon; hidden: saving"></agui-icon>
    <span ref="label" bind="textContent: fieldLabel; hidden: !showText"></span>
  </button>
  ${R}
  <agui-message bind="$.message: saveMessage; $.tone: saveTone; $.closeLabel: saveCloseLabel"></agui-message>
`;var be=class extends A{schemeQuery;constructor(){super(),Object.assign(this.init$,{"*theme":"system",lightLabel:void 0,darkLabel:void 0,showLabel:void 0,showText:!1,buttonClass:"agui-button-icon",buttonLabel:"",themeIcon:"",texts:void 0,saving:!1,saveBusy:"false",saveState:"idle",saveMessage:"",saveTone:"error",saveCloseLabel:""})}get isDark(){return this.$["*theme"]==="dark"||this.$["*theme"]==="system"&&!!this.schemeQuery?.matches}renderCallback(){this.schemeQuery=matchMedia("(prefers-color-scheme: dark)"),super.renderCallback();for(let[e,t]of Object.entries({"light-label":"lightLabel","dark-label":"darkLabel","show-label":"showLabel",label:"label"}))this.sub(t,this.refreshLabel),this.sub(`attribute-${e}`,this.refreshLabel);this.sub("attribute-aria-label",this.refreshLabel),this.schemeQuery.addEventListener("change",this.refreshChecked),this.sub("*theme",this.refreshChecked),this.sub("saving",()=>{this.$.saveBusy=String(this.$.saving),this.setAvailability()}),this.sub("texts",this.refreshSaveMessage),this.sub("saveState",this.refreshSaveMessage)}setAvailability(){super.setAvailability(),this.control&&(this.$.saving||this.$.saveState==="unknown")&&(this.control.disabled=!0)}refreshSaveMessage=()=>{let e=this.$.texts,t=String(this.$.saveState);this.set$({saveMessage:t==="rejected"||t==="unknown"?String(e?.[t]??""):"",saveTone:t==="unknown"?"warning":"error",saveCloseLabel:String(e?.closeMessage??"")}),this.setAvailability()};refreshChecked=()=>{this.ownerDocument.body.dataset.theme=String(this.$["*theme"]);let e=this.isDark;this.$.value=e,this.refreshLabel()};refreshLabel=()=>{let e=this.isDark?this.$.lightLabel??this.getAttribute("light-label"):this.$.darkLabel??this.getAttribute("dark-label"),t=String(e??this.$.label??this.getAttribute("label")??""),r=!!(this.$.showLabel??this.hasAttribute("show-label"))&&!!t;this.set$({fieldLabel:t,buttonLabel:this.getAttribute("aria-label")??t,showText:r,buttonClass:r?"":"agui-button-icon",themeIcon:this.isDark?"light_mode":"dark_mode"})};commit(e){let t=super.commit(e);return this.$["*theme"]=e?"dark":"light",t}destroyCallback(){super.destroyCallback(),this.schemeQuery?.removeEventListener("change",this.refreshChecked)}};be.bindAttributes({...M,"light-label":"attribute-light-label","dark-label":"attribute-dark-label","show-label":"attribute-show-label"});be.template=wi;var ze=Object.freeze(["graphite","ocean","forest","desert"]);var vt=Object.freeze({failure:"mt-3 text-sm text-agui-danger",idle:"mt-3 text-sm text-agui-muted"}),Ti=h`
  <button ref="trigger" type="button" class="agui-button-icon"
    bind="@popovertarget: popupId; @aria-label: selectorLabel; @title: selectorLabel; disabled: unavailable">
    <agui-preloader aria-hidden="true" bind="hidden: !saving"></agui-preloader>
    <agui-icon name="palette" aria-hidden="true" bind="hidden: saving"></agui-icon>
  </button>
  <div ref="panel" popover="auto" class="agui-theme-panel agui-popover" role="group"
    bind="id: popupId; @aria-label: selectorLabel">
    <div class="grid gap-2" itemize="entries">
      <template>
        <button type="button" class="agui-theme-option" bind="value: value; onclick: select; @aria-pressed: pressed; disabled: disabled">
          <span class="agui-theme-preview" aria-hidden="true"><span></span><span></span><span></span></span>
          <span bind="textContent: label"></span>
          <agui-icon name="check" aria-hidden="true" bind="hidden: !selected"></agui-icon>
        </button>
      </template>
    </div>
    <p role="status" aria-live="polite"
      bind="className: statusClass; textContent: statusMessage; hidden: !statusMessage"></p>
  </div>
`;var Ei=b`
  @layer components {
    agui-theme-selector {
      display: inline-block;
    }
    .agui-theme-panel {
      inline-size: 18rem;
    }
    .agui-theme-option {
      inline-size: 100%;
      justify-content: flex-start;
      gap: .75rem;
    }
    .agui-theme-option[aria-pressed='true'] {
      border-color: var(--agui-accent);
      color: var(--agui-accent);
    }
    .agui-theme-option > agui-icon {
      margin-inline-start: auto;
    }
    .agui-theme-preview {
      display: flex;
      gap: .2rem;
    }
    .agui-theme-preview > span {
      inline-size: .875rem;
      block-size: .875rem;
      border: 1px solid var(--agui-border);
      border-radius: .2rem;
      background: var(--agui-bg);
    }
    .agui-theme-preview > span:nth-child(2) {
      background: var(--agui-text);
    }
    .agui-theme-preview > span:nth-child(3) {
      background: var(--agui-accent);
    }
  }
`;var da=0,Si=Object.freeze(["value","label","aria-label","disabled","readonly","pub-to"]),ua=Object.freeze(Object.fromEntries(Si.map(i=>[i,`attribute-${i}`]))),W=class extends c{ready=!1;componentDescription=()=>JSON.stringify({id:this.id,label:this.$.selectorLabel});init$={value:void 0,label:void 0,texts:void 0,disabled:void 0,readonly:void 0,popupId:`agui-theme-palettes-${++da}`,selectorLabel:"",activeValue:"graphite",entries:[],unavailable:!0,saving:!1,saveState:"idle",statusMessage:"",statusClass:"",set_value:new m({description:"Apply a palette and publish its value without saving data.",inputSchema:{type:"object",properties:{value:{type:"string",enum:ze}},required:["value"],additionalProperties:!1},execute:({value:e})=>this.commit(e)}),read_value:new m({description:"Read the selected palette and local saving state without returning application data.",execute:()=>({value:this.$.activeValue,saveState:this.$.saveState})})};renderCallback(){this.ready=!0;for(let e of Si)e.includes("-")||this.sub(e,()=>this.refresh()),this.sub(`attribute-${e}`,()=>this.refresh());for(let e of["texts","saving","saveState"])this.sub(e,()=>this.refresh())}text(e){let t=this.$.texts;return String(t?.[e]??"")}get unavailable(){return!!(this.$.disabled??this.hasAttribute("disabled"))||!!(this.$.readonly??this.hasAttribute("readonly"))||!!this.$.saving||this.$.saveState==="unknown"}refresh(){if(!this.ready||!this.isConnected)return;let e=this.$.value??this.getAttribute("value")??"graphite";if(typeof e!="string"||!ze.includes(e))throw new TypeError(this.text("invalidValue"));this.ownerDocument.body.dataset.palette=e;let t=String(this.$.saveState);e!==this.$.activeValue&&!this.$.saving&&t!=="unknown"&&(t="idle");let r=this.unavailable;this.set$({activeValue:e,saveState:t,unavailable:r,selectorLabel:String(this.getAttribute("aria-label")??this.$.label??this.getAttribute("label")??""),statusMessage:this.text(t),statusClass:["rejected","unknown","invalidTarget"].includes(t)?vt.failure:vt.idle,entries:ze.map(a=>({value:a,label:this.text(a),selected:a===e,pressed:String(a===e),disabled:r,select:s=>this.choose(a,s)}))})}commit(e){if(this.$.unavailable)throw new Error(this.text("unavailable"));if(typeof e!="string"||!ze.includes(e))throw new TypeError(this.text("invalidValue"));let t=e!==this.$.activeValue;if(t){this.$.value=e;let r=this.getAttribute("pub-to")?.trim();r&&!Object.is(this.$[r],e)&&(this.$[r]=e),this.announce("change",e)}return{value:e,changed:t}}async choose(e,t){this.commit(e)}destroyCallback(){super.destroyCallback(),this.ready=!1,this.ownerDocument.querySelector("agui-theme-selector")||delete this.ownerDocument.body.dataset.palette}};W.bindAttributes(ua);W.template=Ti;W.rootStyles=Ei;var Ai=h`<label>${F}<input ref="control" type="checkbox" switch role="switch"></label>${R}`;var ge=class extends A{static observedAttributes=[...A.observedAttributes,"checked"];renderCallback(){let e=this.ref.control;this.defineAccessor("checked",t=>{e.defaultChecked=t!=null}),super.renderCallback()}};ge.bindAttributes(M);ge.template=Ai;var Li=Object.freeze(["ready","loading","empty","error"]);var ki=h`
  <div ref="message" class="agui-state-message grid gap-3 border p-4 text-sm" bind="hidden: stateHidden; @role: stateRole; @aria-busy: stateBusy">
    <div class="flex items-center gap-3">
      <agui-preloader aria-hidden="true" bind="hidden: !stateLoading"></agui-preloader>
      <p bind="textContent: stateMessage"></p>
    </div>
    <button class="agui-button justify-self-start" type="button" bind="textContent: stateRetryLabel; hidden: !retryVisible; onclick: retry"></button>
  </div>
`;var $i=b`
  @layer components {
    agui-state {
      display: block;
      min-width: 0;
    }
    .agui-state-message {
      border-color: var(--agui-divider);
      border-radius: var(--agui-radius-inset);
      background-color: var(--agui-bg);
    }
    .agui-state-message[aria-busy='true'] {
      border-style: dashed;
    }
    .agui-state-message[role='alert'] {
      border-color: var(--agui-danger);
      background-color: var(--agui-danger-soft);
      color: var(--agui-danger);
    }
  }
`;var Y=class extends c{init$={status:void 0,message:void 0,retryLabel:void 0,stateHidden:!0,stateRole:"status",stateBusy:"false",stateMessage:"",stateRetryLabel:"",retryVisible:!1,stateLoading:!1,retry:new m({description:"Request retry for this error state. This does not claim the request has succeeded.",deps:["retryVisible"],when:()=>this.$.retryVisible===!0,execute:()=>({requested:this.announce("retry")})})};renderCallback(){for(let[e,t]of[["status","status"],["message","message"],["retryLabel","retry-label"]])this.sub(e,()=>this.refresh()),this.sub(`attribute-${t}`,()=>this.refresh())}refresh(){let e=String(this.$.status??this.getAttribute("status")??"ready");if(!Li.includes(e))throw new Error("agui-state status must be ready, loading, empty, or error.");let t=String(this.$.retryLabel??this.getAttribute("retry-label")??"");this.set$({stateHidden:e==="ready",stateRole:e==="error"?"alert":"status",stateBusy:String(e==="loading"),stateLoading:e==="loading",stateMessage:String(this.$.message??this.getAttribute("message")??""),stateRetryLabel:t,retryVisible:e==="error"&&!!t})}};Y.bindAttributes({status:"attribute-status",message:"attribute-message","retry-label":"attribute-retry-label"});Y.template=ki;Y.rootStyles=$i;var _i=h`
  <progress class="agui-preloader-indicator" bind="@aria-label: progressLabel; @aria-labelledby: progressLabelledBy"></progress>
  <span class="agui-preloader-dots" aria-hidden="true">
    <span></span>
    <span></span>
    <span></span>
  </span>
`;var Ci=b`
  @layer components {
    agui-preloader {
      position: relative;
      display: inline-flex;
      flex: none;
      align-items: center;
      justify-content: center;
      inline-size: var(--agui-preloader-size, 1.5rem);
      block-size: var(--agui-preloader-size, 1.5rem);
      vertical-align: middle;
      color: inherit;
    }
    agui-preloader[hidden] {
      display: none;
    }
    .agui-preloader-indicator {
      display: block;
      box-sizing: border-box;
      inline-size: 100%;
      block-size: 100%;
      appearance: none;
      border: 0;
      background: transparent;
      color: inherit;
    }
    agui-preloader[variant='ring'] > .agui-preloader-indicator {
      border: var(--agui-preloader-thickness, 2px) solid currentColor;
      border-inline-end-color: transparent;
      border-radius: 50%;
      animation: agui-preloader-working 1.2s linear infinite;
    }
    .agui-preloader-dots {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12%;
      pointer-events: none;
    }
    agui-preloader[variant='ring'] > .agui-preloader-dots {
      display: none;
    }
    .agui-preloader-dots > span {
      inline-size: 22%;
      block-size: 22%;
      border-radius: 50%;
      background: currentColor;
      animation: agui-preloader-pulse 1.2s ease-in-out infinite;
    }
    .agui-preloader-dots > span:nth-child(1) {
      animation-delay: -0.3s;
    }
    .agui-preloader-dots > span:nth-child(2) {
      animation-delay: -0.15s;
    }
    .agui-preloader-indicator::-webkit-progress-bar {
      display: none;
    }
    .agui-preloader-indicator::-webkit-progress-value {
      display: none;
    }
    .agui-preloader-indicator::-moz-progress-bar {
      /* Firefox keeps this native fill even when display: none is requested. */
      background: transparent;
      border: 0;
    }
    @media (prefers-reduced-motion: reduce) {
      agui-preloader[variant='ring'] > .agui-preloader-indicator,
      .agui-preloader-dots > span {
        animation-duration: 6s;
      }
    }
    @media (forced-colors: active) {
      .agui-preloader-indicator,
      .agui-preloader-dots {
        forced-color-adjust: none;
      }
    }
    @keyframes agui-preloader-working {
      to {
        rotate: 360deg;
      }
    }
    @keyframes agui-preloader-pulse {
      0%, 60%, 100% {
        opacity: 0.35;
        scale: 0.65;
      }
      30% {
        opacity: 1;
        scale: 1;
      }
    }
  }
`;var J=class extends c{init$={label:void 0,progressLabel:"",progressLabelledBy:""};renderCallback(){for(let e of["label","attribute-label","attribute-aria-label","attribute-aria-labelledby"])this.sub(e,this.describe)}describe=()=>{this.set$({progressLabel:this.getAttribute("aria-label")||String(this.$.label??this.getAttribute("label")??""),progressLabelledBy:this.getAttribute("aria-labelledby")||""})}};J.bindAttributes({label:"attribute-label","aria-label":"attribute-aria-label","aria-labelledby":"attribute-aria-labelledby"});J.template=_i;J.rootStyles=Ci;var Ii=h`
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
`;var Mi=b`
  @layer components {
    agui-steps {
      display: block;
      min-inline-size: 0;
      overflow: auto;
    }
    agui-steps ol {
      display: grid;
      grid-auto-flow: column;
      grid-auto-columns: minmax(8rem, 1fr);
      list-style: none;
      padding: 0;
      margin: 0;
    }
    agui-steps li {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: .5rem;
      padding-inline: .5rem;
      color: var(--agui-muted);
      text-align: center;
    }
    agui-steps li::before {
      content: '';
      position: absolute;
      inset-block-start: calc(var(--agui-control-height) / 2);
      inset-inline-start: calc(-50% + var(--agui-control-height) / 2 + .5rem);
      inline-size: calc(100% - var(--agui-control-height) - 1rem);
      border-block-start: 2px dashed var(--agui-border);
    }
    agui-steps ol > :first-child > li::before {
      content: none;
    }
    .agui-step-marker {
      display: grid;
      place-items: center;
      flex: none;
      inline-size: var(--agui-control-height);
      block-size: var(--agui-control-height);
      border: 1px solid var(--agui-border);
      border-radius: 50%;
      background: var(--agui-surface);
      font-size: .875rem;
    }
    .agui-step-label {
      max-inline-size: 100%;
      overflow-wrap: anywhere;
      font-size: .875rem;
    }
    agui-steps li[data-state='completed'],
    agui-steps li[data-state='current'] {
      color: var(--agui-accent);
    }
    agui-steps li[data-state='completed']::before,
    agui-steps li[data-state='current']::before {
      border-color: var(--agui-accent);
      border-block-start-style: solid;
    }
    agui-steps li[data-state='current'] .agui-step-marker {
      border: 2px solid var(--agui-accent);
      background: var(--agui-accent-soft);
    }
    agui-steps li[data-state='completed'] .agui-step-marker {
      border-color: var(--agui-accent);
      background: var(--agui-accent);
      color: var(--agui-on-accent);
    }
  }
`;var Oi=Object.freeze(["value","complete","label","aria-label","aria-labelledby"]),X=class extends c{init$={items:[],value:void 0,complete:void 0,label:void 0,texts:{},entries:[],progressLabel:"",progressLabelledBy:"",statusState:"ready",statusMessage:"","+renderInput":()=>[this.$.items,this.$.texts,this.$.value,this.$.complete,this.$.label,...Oi.map(e=>this.$[`attribute-${e}`])]};renderCallback(){this.sub("+renderInput",()=>this.refresh())}text(e){return String(this.$.texts?.[e]??"")}refresh(){let e=this.$.items,t=this.$.value??this.getAttribute("value")??"",r=this.$.complete??this.hasAttribute("complete"),a="";!Array.isArray(e)||e.some(o=>!o||typeof o.value!="string"||!o.value.trim()||typeof o.label!="string")||new Set(e.map(o=>o.value)).size!==e.length?a="invalidItems":(typeof t!="string"||typeof r!="boolean"||!r&&t!==""&&!e.some(o=>o.value===t))&&(a="invalidValue");let s=a?[]:e,n=s.findIndex(o=>o.value===t);this.set$({progressLabel:String(this.getAttribute("aria-label")??this.$.label??this.getAttribute("label")??""),progressLabelledBy:this.getAttribute("aria-labelledby")||!1,statusState:a?"error":"ready",statusMessage:this.text(a),entries:s.map((o,l)=>{let d=r||l<n?"completed":l===n?"current":"pending";return{label:o.label,number:String(l+1),state:d,completed:d==="completed",current:d==="current"?"step":!1,statusLabel:this.text(d)}})})}};X.bindAttributes(Object.fromEntries(Oi.map(i=>[i,`attribute-${i}`])));X.template=Ii;X.rootStyles=Mi;var Z=Object.freeze({account_circle:"account_circle",add:"add",analytics:"analytics",apps:"apps",arrow_back:"arrow_back",arrow_downward:"arrow_downward",arrow_drop_down:"arrow_drop_down",arrow_drop_up:"arrow_drop_up",arrow_forward:"arrow_forward",arrow_upward:"arrow_upward",article:"article",attach_file:"attach_file",autorenew:"autorenew",bar_chart:"bar_chart",bookmark:"bookmark",cable:"cable",calendar_month:"calendar_month",cancel:"cancel",chat:"chat",check:"check",check_box:"check_box",check_box_outline_blank:"check_box_outline_blank",check_circle:"check_circle",chevron_left:"chevron_left",chevron_right:"chevron_right",close:"close",cloud:"cloud",cloud_done:"cloud_done",cloud_download:"cloud_download",cloud_off:"cloud_off",cloud_upload:"cloud_upload",code:"code",comment:"comment",content_copy:"content_copy",contrast:"contrast",create_new_folder:"create_new_folder",dark_mode:"dark_mode",dashboard:"dashboard",data_object:"data_object",database:"database",delete:"delete",description:"description",deselect:"deselect",done_all:"done_all",download:"download",drag_indicator:"drag_indicator",draw:"draw",drive_file_move:"drive_file_move",edit:"edit",edit_note:"edit_note",error:"error",event:"event",expand_less:"expand_less",expand_more:"expand_more",filter_alt:"filter_alt",filter_alt_off:"filter_alt_off",filter_list:"filter_list",first_page:"first_page",folder:"folder",folder_copy:"folder_copy",folder_open:"folder_open",folder_shared:"folder_shared",format_paint:"format_paint",fullscreen:"fullscreen",fullscreen_exit:"fullscreen_exit",groups:"groups",help:"help",history:"history",home:"home",hub:"hub",image:"image",info:"info",insert_drive_file:"insert_drive_file",inventory_2:"inventory_2",key:"key",label:"label",lan:"lan",language:"language",last_page:"last_page",light_mode:"light_mode",link:"link",link_off:"link_off",list:"list",lock:"lock",lock_open:"lock_open",login:"login",logout:"logout",mail:"mail",manage_accounts:"manage_accounts",map:"map",markdown:"markdown",menu:"menu",menu_open:"menu_open",more_horiz:"more_horiz",more_vert:"more_vert",mouse:"mouse",my_location:"my_location",notes:"notes",notifications:"notifications",notifications_off:"notifications_off",open_in_new:"open_in_new",palette:"palette",pan_tool:"pan_tool",pause:"pause",people:"people",perm_media:"perm_media",person:"person",person_add:"person_add",picture_as_pdf:"picture_as_pdf",pie_chart:"pie_chart",play_arrow:"play_arrow",power_settings_new:"power_settings_new",public:"public",radio_button_checked:"radio_button_checked",radio_button_unchecked:"radio_button_unchecked",redo:"redo",refresh:"refresh",restart_alt:"restart_alt",save:"save",schedule:"schedule",search:"search",select_all:"select_all",settings:"settings",share:"share",shield:"shield",show_chart:"show_chart",sort:"sort",sort_by_alpha:"sort_by_alpha",star:"star",stop:"stop",storage:"storage",swap_horiz:"swap_horiz",swap_vert:"swap_vert",sync:"sync",table_chart:"table_chart",table_rows:"table_rows",table_view:"table_view",task_alt:"task_alt",terminal:"terminal",text_fields:"text_fields",timeline:"timeline",touch_app:"touch_app",translate:"translate",tune:"tune",undo:"undo",update:"update",upload:"upload",upload_file:"upload_file",verified_user:"verified_user",view_kanban:"view_kanban",view_list:"view_list",view_module:"view_module",visibility:"visibility",visibility_off:"visibility_off",warning:"warning",widgets:"widgets",wifi:"wifi",wifi_off:"wifi_off",zoom_in:"zoom_in",zoom_out:"zoom_out"});var Ri=h`<span aria-hidden="true" bind="textContent: glyph; hidden: !fontReady"></span>`;var Ne="Material Symbols Outlined",ca="https://fonts.googleapis.com";var Xe=new URL("/css2",ca);Xe.searchParams.set("family",`${Ne}:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200`);Xe.searchParams.set("icon_names",[...new Set(Object.values(Z))].sort().join(","));Xe.searchParams.set("display","block");var Ze=Xe.href;var zi=b`
  @layer components {
    agui-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex: none;
      vertical-align: middle;
      overflow: hidden;
      font-family: '${Ne}';
      width: 1em;
      height: 1em;
      font-size: var(--agui-icon-size, 1.4em);
      /* Icon glyphs must not inherit the page's text x-height adjustment. */
      font-size-adjust: none;
      font-style: normal;
      font-weight: normal;
      font-variant-ligatures: discretionary-ligatures;
      font-feature-settings: 'liga';
      font-variation-settings: 'FILL' var(--agui-icon-fill, 0), 'wght' var(--agui-icon-weight, 400), 'GRAD' var(--agui-icon-grade, 0), 'opsz' var(--agui-icon-optical-size, 24);
      line-height: 1;
      letter-spacing: normal;
      text-transform: none;
      white-space: nowrap;
      direction: ltr;
      user-select: none;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
  }
`;var Ni=new WeakMap;function Qe(i){let e=Ni.get(i);if(e)return e;let t=ha(i).catch(()=>!1);return Ni.set(i,t),t}async function ha(i){let e=i.querySelectorAll('link[rel~="stylesheet"]'),t=Array.from(e).find(n=>n.href===Ze),r=t||i.createElement("link");if(t||(r.rel="stylesheet",r.href=Ze,r.crossOrigin="anonymous",r.referrerPolicy="no-referrer"),!(r.sheet?!0:await new Promise(n=>{let o=g=>{clearTimeout(p),r.removeEventListener("load",l),r.removeEventListener("error",d),n(g)},l=()=>o(!0),d=()=>o(!1),p=setTimeout(d,1e4);r.addEventListener("load",l),r.addEventListener("error",d),t||i.head.append(r)})))return!1;let s=await i.fonts.load(`400 24px "${Ne}"`,Object.values(Z)[0]);return s.length>0&&s.every(n=>n.status==="loaded")}var Q=class extends c{init$={name:void 0,glyph:"",fontReady:!1};renderCallback(){let e=this.attachInternals();e.role="img";let t=()=>{e.ariaHidden=String(!this.getAttribute("aria-label")&&!this.getAttribute("aria-labelledby"))};this.sub("attribute-aria-label",t),this.sub("attribute-aria-labelledby",t),this.sub("name",this.refreshGlyph),this.sub("attribute-name",this.refreshGlyph),Qe(this.ownerDocument).then(r=>{this.isConnected&&(this.$.fontReady=r)})}refreshGlyph=()=>{let e=String(this.$.name??this.getAttribute("name")??"");this.$.glyph=Object.hasOwn(Z,e)?Z[e]:""}};Q.bindAttributes({name:"attribute-name","aria-label":"attribute-aria-label","aria-labelledby":"attribute-aria-labelledby"});Q.template=Ri;Q.rootStyles=zi;var Di=h`
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
`;var Pi=b`
  @layer components {
    agui-dialog {
      display: block;
      min-inline-size: 0;
    }
    .agui-dialog-surface {
      inline-size: min(var(--agui-dialog-width, 36rem), calc(100vw - 2rem));
      max-inline-size: calc(100vw - 2rem);
      max-block-size: calc(100dvh - 2rem);
      overflow: auto;
      margin: auto;
      padding: var(--agui-panel-padding);
      border: 1px solid var(--agui-border);
      border-radius: var(--agui-radius-panel);
      background: var(--agui-surface);
      color: var(--agui-text);
      box-shadow: var(--agui-shadow-floating);
    }
    .agui-dialog-surface[open] {
      display: grid;
      gap: 1rem;
    }
    .agui-dialog-surface::backdrop {
      background: rgb(0 0 0 / .5);
    }
    .agui-dialog-heading {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
    }
    .agui-dialog-heading h2 {
      min-inline-size: 0;
      overflow-wrap: anywhere;
      font-size: 1.125rem;
    }
    .agui-dialog-content {
      display: grid;
      min-inline-size: 0;
      gap: 1rem;
    }
  }
`;var ma=0,Bi=Object.freeze({value:"open",label:"label",openLabel:"open-label",closeLabel:"close-label"}),ee=class extends c{componentDescription=()=>JSON.stringify({id:this.id,label:String(this.$.dialogLabel)});disposed=!1;init$={value:void 0,label:void 0,openLabel:void 0,closeLabel:void 0,opened:!1,openedText:"false",surfaceId:"",dialogLabel:"",triggerLabel:"",dismissLabel:"",open:new m({description:"Open this modal dialog without saving or discarding draft values.",execute:()=>this.commit(!0)}),close:new m({description:"Close this dialog without saving or discarding draft values.",execute:()=>this.commit(!1)}),read_value:new m({description:"Read whether this dialog is open.",execute:()=>({value:this.$.opened})})};constructor(){super(),this.templateProcessors.add(O)}renderCallback(){this.$.surfaceId=`agui-dialog-surface-${++ma}`,this.ref.dialog.addEventListener("close",this.onClose);for(let[e,t]of Object.entries(Bi))this.sub(e,()=>this.refresh()),this.sub(`attribute-${t}`,()=>this.refresh())}refresh(){if(this.disposed||!this.isConnected)return;let e=this.$.value??this.hasAttribute("open");if(typeof e!="boolean")throw new TypeError("Dialog value must be a boolean.");let t=this.ref.dialog;this.set$({dialogLabel:String(this.$.label??this.getAttribute("label")??""),triggerLabel:String(this.$.openLabel??this.getAttribute("open-label")??""),dismissLabel:String(this.$.closeLabel??this.getAttribute("close-label")??"")}),e&&!t.open?t.showModal():!e&&t.open&&t.close(),this.set$({opened:t.open,openedText:String(t.open)}),this.syncWebMCPTools()}commit(e){let t=!Object.is(this.$.opened,e);if(t){this.$.value=e;let r=this.getAttribute("pub-to")?.trim();r&&!Object.is(this.$[r],e)&&(this.$[r]=e),this.announce("change",e)}return{value:e,changed:t}}onClose=()=>{this.isConnected&&!this.ref.dialog.open&&this.commit(!1)};destroyCallback(){super.destroyCallback(),this.disposed=!0;let e=this.ref.dialog;e.removeEventListener("close",this.onClose),e.open&&e.close()}};ee.bindAttributes(Object.fromEntries(Object.values(Bi).map(i=>[i,`attribute-${i}`])));ee.template=Di;ee.rootStyles=Pi;var u=Object.freeze({rows:5e3,fields:24,options:100,id:128,key:64,text:2048,pageSize:100,readBytes:8192});var y=(i,e)=>typeof i=="string"&&!!i.trim()&&i.length<=e,L=i=>!!i&&typeof i=="object"&&!Array.isArray(i);function et(i){if(!Array.isArray(i)||i.length>u.fields||new Set(i.map(e=>e?.key)).size!==i.length||i.some(e=>!L(e)||!/^[a-zA-Z_][\w-]*$/.test(e.key)||e.key.length>u.key||!y(e.label,u.text)||!["text","number","date","boolean","status"].includes(e.type)))throw new Error("invalidFields");for(let e of i)e.options!==void 0&&yt(e.options)}function yt(i){if(!Array.isArray(i)||i.length>u.options||new Set(i.map(e=>e?.value)).size!==i.length||i.some(e=>!L(e)||!y(e.value,u.text)||typeof e.label!="string"||e.label.length>u.text||e.tone!==void 0&&!["info","success","warning","danger"].includes(e.tone)))throw new Error("invalidFields")}function T(i,e){if(!y(e,u.key)||!Array.isArray(i)||i.length>u.rows||i.some(t=>!L(t)||!y(t[e],u.id))||new Set(i.map(t=>t[e])).size!==i.length)throw new Error("invalidRows")}function E(i){if(!Array.isArray(i)||i.length>u.rows||i.some(e=>!y(e,u.id))||new Set(i).size!==i.length)throw new Error("invalidState")}function fe(i){try{new Intl.Collator(i)}catch{throw new Error("invalidState")}}function ji(i){if(T(i.rows,i.idKey),i.rows.length>B.rows)throw new Error("invalidRows");if(E(i.value),fe(i.locale),!["line","bar","donut"].includes(i.type)||!["none","single","multiple"].includes(i.selection)||!["text","number","date"].includes(i.xType)||!y(i.xKey,u.key)||!y(i.xLabel,u.text))throw new Error("invalidState");if(!Array.isArray(i.series)||!i.series.length||i.series.length>B.series||i.type==="donut"&&i.series.length!==1||new Set(i.series.map(s=>s?.key)).size!==i.series.length)throw new Error("invalidSeries");for(let s of i.series)if(!L(s)||!y(s.key,u.key)||!y(s.valueKey,u.key)||!y(s.label,u.text)||s.color!==void 0&&!Fe.includes(s.color)||s.format!==void 0&&!["number","currency","percent"].includes(s.format)||s.format==="currency"&&!/^[A-Z]{3}$/.test(s.currency??"")||s.digits!==void 0&&(!Number.isInteger(s.digits)||s.digits<0||s.digits>6)||s.unit!==void 0&&(typeof s.unit!="string"||s.unit.length>u.text))throw new Error("invalidSeries");if(i.type!=="donut"&&i.series.some(s=>(s.format??"number")!==(i.series[0].format??"number")||s.currency!==i.series[0].currency||s.unit!==i.series[0].unit))throw new Error("invalidSeries");let e;try{e=i.series.map(s=>Ot(s,i.locale))}catch{throw new Error("invalidSeries")}let t=i.rows.map(s=>{let n=i.series.map(o=>{let l=s[o.valueKey];if(l==null)return null;if(typeof l!="number"||!Number.isFinite(l)||i.type==="donut"&&l<0)throw new Error("invalidRows");return l});return{id:String(s[i.idKey]),x:Rt(s[i.xKey],i),values:n,formatted:n.map((o,l)=>o===null?"":`${e[l].format(o)}${i.series[l].unit?` ${i.series[l].unit}`:""}`)}}),r=new Set(t.map(s=>s.id)),a=i.selection==="none"?[]:i.value.filter(s=>r.has(s));return i.selection==="single"&&(a=a.slice(0,1)),{state:i,points:t,selected:a,hasData:t.some(s=>s.values.some(n=>n!==null&&(i.type!=="donut"||n>0)))}}function qi(i,e){E(e);let t=new Set(i.points.map(r=>r.id));if(i.state.selection==="none"||i.state.selection==="single"&&e.length>1||e.some(r=>!t.has(r)))throw new Error("invalidState");return e.slice()}function xt(i){let e=i.stateInput(),t=i.model,r=o=>String(e.texts?.[o]??""),a=i.runtimeError?r(i.runtimeError):"",s=!i.$.runtimeReady||e.loading,n=!t||s||e.disabled||e.readonly||!!e.error||!!i.runtimeError;i.set$({modelValid:!!t,chartLabel:e.label,chartDescription:e.description,dataLabel:r("data"),dataTableId:`${i.id||i.domId}-data`,dataSelectionMode:e.selection,dataLoading:e.loading,dataError:e.error,dataDisabled:n,unavailable:n||e.selection==="none",plotHidden:!t?.hasData||s||!!e.error||!!i.runtimeError,statusState:e.error||i.runtimeError||i.issue?"error":s?"loading":t?.hasData?"ready":"empty",statusMessage:e.error||a||(i.issue?r(i.issue):s?r("loading"):t?.hasData?"":r("empty")),effectiveSelected:t?.selected??[],dataRows:t?.points.map(o=>({id:o.id,x:o.x,...Object.fromEntries(o.formatted.map((l,d)=>[`s${d}`,l]))}))??[],dataColumns:t?[{key:"x",label:e.xLabel,type:"text"},...e.series.map((o,l)=>({key:`s${l}`,label:o.label,type:"text"}))]:[]})}function Ui(i,e,t=0,r=20){let a=i.requireModel();if(!Number.isInteger(t)||t<0||t>B.rows||!Number.isInteger(r)||r<1||r>u.pageSize)throw new Error(i.text("invalidState"));let s=e?a.selected:a.state.loading||a.state.error?[]:a.points,n=[],o={offset:t,nextOffset:null,totalCount:s.length,items:n};for(let l=t;l<Math.min(s.length,t+r);l+=1){let d=s[l],p=typeof d=="string"?d:{id:d.id,x:d.x,values:Object.fromEntries(a.state.series.map((g,v)=>[g.key,d.formatted[v]]))};if(n.push(p),o.nextOffset=l+1<s.length?l+1:null,!(new TextEncoder().encode(JSON.stringify(o)).byteLength<=u.readBytes)){n.pop(),!n.length&&typeof p!="string"&&n.push({id:p.id,truncated:!0}),o.nextOffset=t+n.length<s.length?t+n.length:null;break}}return o}function Ki(i){let e=t=>new m({description:t?"Read a bounded page of effective selected record IDs.":"Read bounded formatted chart data, excluding unrelated record fields. Follow nextOffset.",deps:["modelValid"],when:()=>!!i.$.modelValid,inputSchema:{type:"object",properties:{offset:{type:"integer",minimum:0,maximum:B.rows},limit:{type:"integer",minimum:1,maximum:u.pageSize}},additionalProperties:!1},execute:({offset:r,limit:a})=>Ui(i,t,r,a)});return{set_selection:new m({description:"Set source record IDs selected by this chart. Return bounded change/count metadata without records or full selections.",deps:["unavailable"],when:()=>!i.$.unavailable,inputSchema:{type:"object",properties:{ids:{type:"array",maxItems:B.rows,uniqueItems:!0,items:{type:"string",minLength:1,maxLength:u.id}}},required:["ids"],additionalProperties:!1},execute:({ids:t})=>i.setSelection(t)}),read_view:e(!1),read_selection:e(!0)}}var Hi;function Vi(){let i=C(Mt);return Hi??=import(i),Hi}function Fi(i){let e=getComputedStyle(i),t=document.createElement("span");t.hidden=!0,i.append(t);let r=s=>(t.style.color=`var(--agui-${s})`,getComputedStyle(t).color),a={text:r("text"),muted:r("muted"),divider:r("divider"),surface:r("surface"),colors:Object.fromEntries(Fe.map(s=>[s,r(s)])),font:e.fontFamily,reducedMotion:matchMedia("(prefers-reduced-motion: reduce)").matches};return t.remove(),a}function Gi(i){let e=()=>i.schedulePaint(),t=new ResizeObserver(e);t.observe(i.ref.plot);let r=new MutationObserver(e);for(let s of[i,document.body,document.documentElement])r.observe(s,{attributes:!0,attributeFilter:["class","style","data-theme","data-palette"]});let a=[matchMedia("(prefers-color-scheme: dark)"),matchMedia("(prefers-reduced-motion: reduce)")];for(let s of a)s.addEventListener("change",e);return()=>{t.disconnect(),r.disconnect();for(let s of a)s.removeEventListener("change",e)}}var Wi=h`
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
`;var Yi=b`
  @layer components {
    agui-chart,
    agui-chart-data {
      display: grid;
      min-inline-size: 0;
      gap: 1rem;
    }
    agui-chart figure {
      display: grid;
      min-inline-size: 0;
      gap: .5rem;
      margin: 0;
    }
    agui-chart figcaption {
      font-weight: 400;
    }
    .agui-chart-description {
      color: var(--agui-muted);
      font-size: .875rem;
    }
    .agui-chart-plot {
      min-inline-size: 0;
      block-size: var(--agui-chart-height, 18rem);
    }
    agui-chart agui-chart-data {
      margin-block-start: 1rem;
    }
  }
`;var pa=0,te=class extends c{domId=`agui-chart-${++pa}`;componentDescription=()=>JSON.stringify({id:this.id,label:this.$.chartLabel});model;issue;runtimeError;runtime;renderer;stopWatching;disposed=!1;paintFrame=0;init$={rows:[],series:[],value:[],texts:{},...Object.fromEntries(Object.keys(le).map(e=>[e,void 0])),runtimeReady:!1,unavailable:!0,modelValid:!1,plotHidden:!0,statusMessage:"",statusState:"ready",chartLabel:"",chartDescription:"",dataLabel:"",dataTableId:"",dataSelectionMode:"none",dataLoading:!1,dataError:"",dataDisabled:!0,dataRows:[],dataColumns:[],effectiveSelected:[],selectIds:e=>this.setSelection(e),...Ki(this)};renderCallback(){for(let e of["rows","series","value","texts",...Object.keys(le),...Object.values(le).map(t=>`attribute-${t}`)])this.sub(e,()=>this.refresh());this.stopWatching=Gi(this),this.loadRuntime()}connectedCallback(){super.connectedCallback(),!(this.disposed||!this.runtime&&!this.runtimeError)&&(this.$.runtimeReady=!!this.runtime,this.refresh())}async loadRuntime(){try{let e=await Vi();if(this.disposed||(this.runtime=e,!this.isConnected))return;this.$.runtimeReady=!0}catch{if(this.disposed)return;this.runtimeError="loadFailed"}this.refresh()}stateInput(){let e=(t,r)=>this.$[t]??this.getAttribute(le[t])??r;return{rows:this.$.rows,series:this.$.series,value:this.$.value,texts:this.$.texts,type:e("type","line"),selection:e("selection","none"),idKey:e("idKey","id"),xKey:e("xKey","label"),xLabel:e("xLabel",""),xType:e("xType","text"),locale:e("locale",document.documentElement.lang||navigator.language),label:String(e("label","")),description:String(e("description","")),error:String(e("error","")),loading:!!(this.$.loading??this.hasAttribute("loading")),disabled:!!(this.$.disabled??this.hasAttribute("disabled")),readonly:!!(this.$.readonly??this.hasAttribute("readonly"))}}refresh(){if(!(this.disposed||!this.isConnected)){this.issue=void 0;try{this.model=ji(this.stateInput())}catch(e){this.model=void 0;let t=e instanceof Error?e.message:"";this.issue=t==="invalidRows"||t==="invalidSeries"?t:"invalidState"}xt(this),this.syncWebMCPTools(),this.schedulePaint()}}schedulePaint(){this.paintFrame||this.disposed||!this.isConnected||(this.paintFrame=requestAnimationFrame(()=>{this.paintFrame=0,this.paint()}))}paint(){if(this.disposed||!this.isConnected||!this.runtime||this.runtimeError)return;let e=this.model;if(this.$.plotHidden||!e){this.renderer?.dispose(),this.renderer=void 0;return}let t=this.ref.plot;if(!(!t.clientWidth||!t.clientHeight))try{this.renderer??=this.runtime.createChartRenderer(t,r=>{this.$.unavailable||this.selectPoint(r)}),this.renderer.render(e,Fi(this))}catch{this.renderer?.dispose(),this.renderer=void 0,this.runtimeError="renderFailed",xt(this),this.syncWebMCPTools()}}text(e){return String(this.$.texts?.[e]??"")}requireModel(){if(!this.model)throw new Error(this.text(this.issue??"invalidState"));return this.model}setSelection(e){let t=this.requireModel();if(this.disposed||!this.isConnected||this.$.unavailable)throw new Error(this.text("unavailable"));try{e=qi(t,e)}catch{throw new Error(this.text("invalidState"))}let r=!S(t.selected.slice().sort(),e.slice().sort());if(r){this.$.value=e;let a=this.getAttribute("pub-to")?.trim();a&&(this.$[a]=e.slice());let s={widgetId:this.id||this.localName,context:this.getAttribute("ctx")?.trim()||null,action:"chart-change",selectedCount:e.length,totalCount:t.points.length};w(this,s)}return{changed:r,selectedCount:this.requireModel().selected.length,totalCount:t.points.length}}selectPoint(e){let t=this.requireModel(),r=new Set(t.state.selection==="single"&&!t.selected.includes(e)?[]:t.selected);return r.has(e)?r.delete(e):r.add(e),this.setSelection(Array.from(r))}destroyCallback(){super.destroyCallback(),this.disposed=!0,cancelAnimationFrame(this.paintFrame),this.stopWatching?.(),this.renderer?.dispose(),this.renderer=void 0}};te.bindAttributes(Object.fromEntries(Object.values(le).map(i=>[i,`attribute-${i}`])));te.template=Wi;te.rootStyles=Yi;var tt="agui-table, agui-chart-data, agui-map-data",$=Object.freeze({...u,columns:u.fields}),ve=Object.freeze({label:"label",idKey:"id-key",selection:"selection",locale:"locale",pageSize:"page-size",disabled:"disabled",readonly:"readonly",loading:"loading",error:"error"}),md=Object.freeze(["agui-table-heading","agui-table-row","agui-table-cell"]);function Ji(i){try{et(i.columns)}catch{throw new Error("invalidColumns")}if(i.columns.some(t=>t.sortable!==void 0&&typeof t.sortable!="boolean"))throw new Error("invalidColumns");if(T(i.rows,i.idKey),E(i.value),i.filteredIds!==null&&E(i.filteredIds),!["none","single","multiple"].includes(i.selection)||!Number.isInteger(i.page)||i.page<1||!Number.isInteger(i.pageSize)||i.pageSize<1||i.pageSize>$.pageSize)throw new Error("invalidState");let e=i.sort;if(e!==null&&(!L(e)||!["ascending","descending"].includes(e.direction)||!i.columns.some(t=>t.key===e.key&&t.sortable)))throw new Error("invalidState");fe(i.locale)}function it(i,e){let t=new Set(i.rows.map(a=>String(a[i.idKey]))),r=i.selection==="none"?[]:e.filter(a=>t.has(a));return i.selection==="single"?r.slice(0,1):r}function rt(i,e){if(i.selection==="none"||!Array.isArray(e)||e.some(r=>typeof r!="string")||new Set(e).size!==e.length||i.selection==="single"&&e.length>1)throw new Error("invalidState");let t=new Set(i.rows.map(r=>String(r[i.idKey])));if(e.some(r=>!t.has(r)))throw new Error("invalidState");return[...e]}function wt(i){Ji(i);let e=i.filteredIds===null?null:new Set(i.filteredIds),t=i.rows.filter(n=>!e||e.has(String(n[i.idKey])));if(i.sort){let n=i.columns.find(d=>d.key===i.sort?.key),o=i.sort.direction==="ascending"?1:-1,l=new Intl.Collator(i.locale,{sensitivity:"base",numeric:!0});t.sort((d,p)=>{let g=Ae(d,n),v=Ae(p,n);return g===null||v===null?g===v?0:g===null?1:-1:o*(typeof g=="number"&&typeof v=="number"?g-v:l.compare(String(g),String(v)))})}let r=it(i,i.value),a=Math.max(1,Math.ceil(t.length/i.pageSize)),s=Math.min(i.page,a);return{state:i,filtered:t,visible:t.slice((s-1)*i.pageSize,s*i.pageSize),selected:r,page:s,pageCount:a}}function Xi(i,e){return rt(i.state,e)}function Zi(i){if(i.state.selection!=="multiple")throw new Error("invalidState");let e=i.filtered.map(a=>String(a[i.state.idKey])),t=new Set(i.selected),r=e.length>0&&e.every(a=>t.has(a));for(let a of e)r?t.delete(a):t.add(a);return[...t]}function Qi(i,e){let t=i.model,r=!t||e.disabled||e.readonly||e.loading||!!e.error,a=new Set(t?.selected),s=t?.filtered.map(f=>String(f[e.idKey]))??[],n=s.length>0&&s.every(f=>a.has(f)),o=e.selection!=="none",l=f=>String(e.texts?.[f]??""),d=f=>`${i.domId}-${f}`,p=t?e.columns:[],g={unavailable:r,groupName:i.domId,selectionType:e.selection==="single"?"radio":"checkbox"},v={id:"$selection",headingId:d("$selection"),columnKey:"",label:l("selection"),sortable:!1,ariaSort:!1,sortIcon:"sort",selectAll:e.selection==="multiple",selectAllLabel:l("selectAll"),selected:n,mixed:!n&&s.some(f=>a.has(f)),unavailable:r||!s.length};i.set$({unavailable:r,selectionEnabled:o&&!!t,modelValid:!!t,tableLabel:e.label,busyText:String(e.loading),surfaceHidden:!t||e.loading||!!e.error,statusState:e.loading?"loading":e.error||i.issue?"error":t?.filtered.length?"ready":"empty",statusMessage:e.loading?l("loading"):e.error||(i.issue?l(i.issue):t?.filtered.length?"":l("empty")),resultsLabel:l("results"),selectedLabel:l("selected"),pageLabel:l("page"),paginationLabel:l("pagination"),previousLabel:l("previous"),nextLabel:l("next"),totalCount:e.rows?.length??0,filteredCount:t?.filtered.length??0,selectedCount:a.size,effectivePage:t?.page??1,pageCount:t?.pageCount??1,paginationHidden:(t?.pageCount??1)<=1,previousDisabled:r||!t||t.page<=1,nextDisabled:r||!t||t.page>=t.pageCount,headings:[...o?[v]:[],...p.map(f=>({...v,id:f.key,headingId:d(f.key),columnKey:f.key,label:f.label,selectAll:!1,sortable:!!f.sortable,ariaSort:e.sort?.key===f.key?e.sort.direction:!1,sortIcon:e.sort?.key===f.key?e.sort.direction==="ascending"?"expand_less":"expand_more":"sort",unavailable:r}))],bodyRows:(e.loading||e.error?[]:t?.visible??[]).map(f=>{let x=String(f[e.idKey]),q={...g,id:"$selection",rowId:x,headingId:d("$selection"),columnKey:"",text:"",cellClass:"",tone:!1,isSelection:!0,selected:a.has(x),selectLabel:`${l("selectRow")} ${x}`.trim()};return{id:x,rowId:x,selectionType:g.selectionType,selected:a.has(x),selectable:o&&!r,selectedText:o?String(a.has(x)):!1,tabIndex:o&&!r?0:-1,cells:[...o?[q]:[],...p.map(_=>({...q,id:_.key,headingId:d(_.key),columnKey:_.key,text:de(f,_,e),cellClass:_.type==="status"?"agui-chip":"",tone:_.options?.find(He=>He.value===f[_.key])?.tone??!1,isSelection:!1,selectionType:"checkbox",groupName:"",selected:!1}))]}})})}function er(i,e,t=0,r=20){let a=i.requireModel();if(!Number.isInteger(t)||t<0||!Number.isInteger(r)||r<1||r>$.pageSize)throw new Error(i.text("invalidState"));let s=a.state.loading||a.state.error?[]:a.visible,n=e?a.selected:s,o=Math.min(n.length,t+r),l=[],d={offset:t,nextOffset:null,page:a.page,pageCount:a.pageCount,totalCount:a.state.rows.length,filteredCount:a.filtered.length,selectedCount:a.selected.length,items:l},p=()=>new TextEncoder().encode(JSON.stringify(d)).byteLength;for(let g=t;g<o;g+=1){let v=s[g],f=e?a.selected[g]:{id:String(v[a.state.idKey]),selected:a.selected.includes(String(v[a.state.idKey])),cells:Object.fromEntries(a.state.columns.map(x=>[x.key,de(v,x,a.state)]))};if(l.push(f),d.nextOffset=g+1<n.length?g+1:null,!(p()<=$.readBytes)){l.pop(),!l.length&&typeof f!="string"&&l.push({id:f.id,selected:f.selected,truncated:!0}),d.nextOffset=t+l.length<n.length?t+l.length:null;break}}return d}function tr(i){let e=(a,s,n)=>new m({description:`Set this table's ${n}. Return bounded change/count metadata, not records or the selection array.`,deps:["unavailable","selectionEnabled"],when:()=>!i.$.unavailable&&(n!=="value"||!!i.$.selectionEnabled),inputSchema:{type:"object",properties:{[a]:s},required:[a],additionalProperties:!1},execute:o=>i.edit(n,o[a])}),t=a=>new m({description:a?"Show the next local table page.":"Show the previous local table page.",deps:[a?"nextDisabled":"previousDisabled"],when:()=>!i.$[a?"nextDisabled":"previousDisabled"],execute:()=>i.edit("page",i.requireModel().page+(a?1:-1))}),r=a=>new m({description:a?"Read a bounded page of effective selected IDs. Follow nextOffset. No records are returned.":"Read a bounded page of currently visible formatted rows. Oversized rows return ID and truncated=true. Follow nextOffset.",deps:["modelValid"],when:()=>!!i.$.modelValid,inputSchema:{type:"object",properties:{offset:{type:"integer",minimum:0,maximum:$.rows},limit:{type:"integer",minimum:1,maximum:$.pageSize}},additionalProperties:!1},execute:({offset:s,limit:n})=>er(i,a,s,n)});return{set_selection:e("ids",{type:"array",maxItems:$.rows,uniqueItems:!0,items:{type:"string",minLength:1,maxLength:$.id}},"value"),set_sort:e("sort",{anyOf:[{type:"null"},{type:"object",properties:{key:{type:"string",maxLength:$.key},direction:{enum:["ascending","descending"]}},required:["key","direction"],additionalProperties:!1}]},"sort"),set_page:e("page",{type:"integer",minimum:1,maximum:$.rows},"page"),read_view:r(!1),read_selection:r(!0),previous_page:t(!1),next_page:t(!0)}}var ir=h`
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
`,rr=h`
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
`,ar=h`
  <tr ref="row" bind="@data-row-id: rowId; @data-selectable: selectable; @aria-selected: selectedText; tabIndex: tabIndex" itemize="cells" item-tag="agui-table-cell"></tr>
`,sr=h`
  <td bind="@headers: headingId; @data-column: columnKey">
    <span bind="hidden: isSelection">
      <span bind="textContent: text; className: cellClass; @data-tone: tone"></span>
    </span>
    <agui-field pub-to="^selectionValue"
      bind="@type: selectionType; @name: groupName; @value: rowId; $.value: +selectionValue; hidden: !isSelection; $.disabled: unavailable; @aria-label: selectLabel"></agui-field>
  </td>
`;var nr=b`
  @layer components {
    agui-table {
      display: grid;
      min-inline-size: 0;
      gap: 1rem;
    }
    agui-table-heading,
    agui-table-row,
    agui-table-cell {
      display: contents;
      /* Itemize must remove structural hosts without waiting for scrollbar fades. */
      transition: none;
    }
    .agui-table-scroll {
      min-inline-size: 0;
      max-inline-size: 100%;
      max-block-size: var(--agui-table-height, 100dvh);
      overflow: auto;
      border: 1px solid var(--agui-divider);
      border-radius: var(--agui-radius-inset);
    }
    .agui-table-scroll:focus-visible {
      outline: 2px solid var(--agui-accent);
      outline-offset: 2px;
    }
    .agui-table-scroll table {
      inline-size: 100%;
      border-collapse: separate;
      border-spacing: 0;
      font-size: .875rem;
    }
    .agui-table-scroll caption {
      padding: .75rem;
      text-align: start;
      color: var(--agui-muted);
    }
    .agui-table-scroll th,
    .agui-table-scroll td {
      height: var(--agui-control-height);
      padding: 0 .75rem;
      border-block-end: 1px solid var(--agui-divider);
      text-align: start;
      vertical-align: middle;
      white-space: nowrap;
      max-inline-size: 32rem;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .agui-table-scroll th {
      position: sticky;
      inset-block-start: 0;
      z-index: 1;
      background: var(--agui-surface);
      font-weight: 400;
    }
    .agui-table-scroll tbody tr:hover {
      background: var(--agui-hover);
    }
    .agui-table-scroll tbody tr[data-selectable] {
      cursor: pointer;
    }
    .agui-table-scroll tbody tr[aria-selected='true'] {
      background: var(--agui-accent-soft);
    }
    .agui-table-scroll tbody tr:focus-visible {
      outline: 2px solid var(--agui-accent);
      outline-offset: -2px;
    }
    .agui-table-heading-content {
      display: flex;
      align-items: center;
      gap: .5rem;
    }
    .agui-table-sort {
      height: auto;
      min-height: var(--agui-control-height);
      border-color: transparent;
      background: transparent;
      padding: .25rem;
    }
    .agui-table-sort:hover:enabled {
      border-color: transparent;
    }
    .agui-table-footer {
      display: grid;
      gap: .75rem;
      font-size: .875rem;
    }
    .agui-table-pagination {
      display: flex;
      align-items: center;
      justify-content: start;
      flex-wrap: wrap;
      gap: .75rem;
      font-size: .875rem;
    }
    .agui-table-page {
      display: inline-flex;
      align-items: center;
      gap: .25rem;
      min-block-size: var(--agui-control-height);
    }
    .agui-table-footer p {
      color: var(--agui-muted);
    }
  }
`;var ba=0,N=class extends c{componentDescription=()=>JSON.stringify({id:this.id,label:this.$.tableLabel});domId=`agui-table-${++ba}`;model;issue;disposed=!1;lastFilteredIds;init$={rows:[],columns:[],value:[],filteredIds:null,sort:null,texts:{},page:1,...Object.fromEntries(Object.keys(ve).map(e=>[e,void 0])),unavailable:!0,modelValid:!1,selectionEnabled:!1,headings:[],bodyRows:[],tableLabel:"",busyText:"false",surfaceHidden:!0,statusMessage:"",statusState:"ready",resultsLabel:"",selectedLabel:"",pageLabel:"",paginationLabel:"",previousLabel:"",nextLabel:"",totalCount:0,filteredCount:0,selectedCount:0,effectivePage:1,pageCount:1,paginationHidden:!0,previousDisabled:!0,nextDisabled:!0,selectRow:(e,t)=>this.selectRow(e,t),sortColumn:e=>this.sortColumn(e),selectFiltered:()=>this.selectFiltered(),...tr(this)};constructor(){super(),this.templateProcessors.add(k)}renderCallback(){for(let e of["rows","columns","value","filteredIds","sort","texts","page",...Object.keys(ve),...Object.values(ve).map(t=>`attribute-${t}`)])this.sub(e,()=>this.refresh())}stateInput(){let e=(t,r)=>this.$[t]??this.getAttribute(ve[t])??r;return{rows:this.$.rows,columns:this.$.columns,value:this.$.value,filteredIds:this.$.filteredIds,sort:this.$.sort,texts:this.$.texts,page:this.$.page,pageSize:Number(e("pageSize",20)),idKey:e("idKey","id"),selection:e("selection","none"),locale:e("locale",document.documentElement.lang||navigator.language),label:String(e("label","")),error:String(e("error","")),loading:!!(this.$.loading??this.hasAttribute("loading")),disabled:!!(this.$.disabled??this.hasAttribute("disabled")),readonly:!!(this.$.readonly??this.hasAttribute("readonly"))}}refresh(){if(this.disposed)return;let e=this.stateInput();this.issue=void 0;try{if(this.model=wt(e),!S(e.filteredIds,this.lastFilteredIds)&&(this.lastFilteredIds=structuredClone(e.filteredIds),e.page!==1)){this.$.page=1;return}}catch(t){this.model=void 0;let r=t instanceof Error?t.message:"";this.issue=r==="invalidRows"||r==="invalidColumns"?r:"invalidState"}Qi(this,e),this.syncWebMCPTools()}text(e){return String(this.$.texts?.[e]??"")}requireModel(){if(!this.model)throw new Error(this.text(this.issue??"invalidState"));return this.model}edit(e,t){let r=this.requireModel();if(this.$.unavailable||this.disposed)throw new Error(this.text("unavailable"));if(e==="value")try{t=Xi(r,t)}catch{throw new Error(this.text("invalidState"))}let a={...r.state,[e]:t};try{wt(a)}catch{throw new Error(this.text("invalidState"))}if(e==="page"&&Number(t)>r.pageCount)throw new Error(this.text("invalidState"));let s=e==="value"?r.selected:e==="page"?r.page:r.state[e],n=e==="value"?!S([...s].sort(),[...t].sort()):!S(s,t);if(n){e==="sort"&&(this.$.page=1),this.$[e]=structuredClone(t);let l=e==="value"?"pub-to":`${e}-pub-to`,d=e==="page"?"":this.getAttribute(l)?.trim();d&&(this.$[d]=structuredClone(t));let p=this.requireModel(),g={widgetId:this.id||this.localName,context:this.getAttribute("ctx")?.trim()||null,action:"table-change",property:e,selectedCount:p.selected.length,filteredCount:p.filtered.length};w(this,g)}let o=this.requireModel();return{changed:n,selectedCount:o.selected.length,filteredCount:o.filtered.length,page:o.page}}selectRow(e,t){let r=this.requireModel();if(typeof t!="boolean"||!r.state.rows.some(s=>s[r.state.idKey]===e))throw new Error(this.text("invalidState"));let a=new Set(r.state.selection==="single"&&t?[]:r.selected);return t?a.add(e):a.delete(e),this.edit("value",[...a])}selectFiltered(){return this.edit("value",Zi(this.requireModel()))}sortColumn(e){let t=this.requireModel().state.sort;return this.edit("sort",t?.key!==e?{key:e,direction:"ascending"}:t.direction==="ascending"?{key:e,direction:"descending"}:null)}destroyCallback(){super.destroyCallback(),this.disposed=!0}};N.bindAttributes(Object.fromEntries(Object.values(ve).map(i=>[i,`attribute-${i}`])));N.template=ir;N.rootStyles=nr;var ye=class extends N{edit(e,t){if(e!=="value")return super.edit(e,t);let r=this.$["^selectIds"],a=r(t),s=this.requireModel();return{changed:a.changed,selectedCount:a.selectedCount,filteredCount:s.filtered.length,page:s.page}}};var at=class extends ye{};function lr(i){return typeof i=="number"&&Number.isFinite(i)&&Math.abs(i)<=I.latitude}function dr(i){return typeof i=="number"&&Number.isFinite(i)&&Math.abs(i)<=180}function Tt(i){if(!L(i)||!Array.isArray(i.center)||i.center.length!==2||!lr(i.center[0])||!dr(i.center[1])||!Number.isInteger(i.zoom)||i.zoom<0||i.zoom>I.zoom)throw new Error("invalidState")}function or(i){try{let e=new URL(i);return e.protocol==="https:"&&!e.username&&!e.password&&!e.hash}catch{return!1}}function ga(i){if(i!==null&&(!L(i)||!y(i.url,2048)||!or(i.url)||!y(i.attribution,u.text)||i.attributionUrl!==void 0&&!or(i.attributionUrl)||!["{z}","{x}","{y}"].every(e=>i.url.includes(e))||/[{}]/.test(i.url.replace(/\{[zxy]\}/g,""))||!Number.isInteger(i.minZoom??0)||!Number.isInteger(i.maxZoom??19)||(i.minZoom??0)<0||(i.maxZoom??19)>I.zoom||(i.minZoom??0)>(i.maxZoom??19)))throw new Error("invalidTiles")}function ur(i){if(T(i.rows,i.idKey),E(i.value),Tt(i.view),ga(i.tiles),i.rows.length>I.rows)throw new Error("invalidRows");if(!["none","single","multiple"].includes(i.selection)||![i.latitudeKey,i.longitudeKey,i.labelKey].every(a=>y(a,u.key)))throw new Error("invalidState");let e=i.rows.filter(a=>lr(a[i.latitudeKey])&&dr(a[i.longitudeKey])).map(a=>({id:String(a[i.idKey]),label:String(a[i.labelKey]??a[i.idKey]),latitude:a[i.latitudeKey],longitude:a[i.longitudeKey]})),t=new Set(e.map(a=>a.id)),r=i.selection==="none"?[]:i.value.filter(a=>t.has(a));return{state:i,points:e,selected:i.selection==="single"?r.slice(0,1):r,skippedCount:i.rows.length-e.length}}function cr(i,e){E(e);let t=new Set(i.points.map(r=>r.id));if(i.state.selection==="none"||i.state.selection==="single"&&e.length>1||e.some(r=>!t.has(r)))throw new Error("invalidState");return e.slice()}function xe(i){let e=i.stateInput(),t=i.model,r=n=>String(e.texts?.[n]??""),a=!i.$.runtimeReady||e.loading,s=!t||a||!i.$.rendererReady||e.disabled||e.readonly||!!e.error||!!i.runtimeError;i.set$({modelValid:!!t,viewReady:!!t&&!a&&!!i.$.rendererReady&&!e.error&&!i.runtimeError,mapLabel:e.label,mapDescription:e.description,attribution:t?.state.tiles?.attribution??"",attributionUrl:t?.state.tiles?.attributionUrl??"",skippedCount:t?.skippedCount??0,skippedLabel:r("skipped"),fitLabel:r("fit"),zoomInLabel:r("zoomIn"),zoomOutLabel:r("zoomOut"),dataLabel:r("data"),dataTableId:`${i.id||i.domId}-data`,dataSelectionMode:e.selection,dataDisabled:s,unavailable:s,selectionUnavailable:s||e.selection==="none",fitUnavailable:s||!t?.points.length,mapHidden:!t||a||!!e.error||!!i.runtimeError,statusState:e.error||i.runtimeError||i.issue?"error":a?"loading":i.tileError?"error":t?.points.length?"ready":"empty",statusMessage:e.error||(i.runtimeError?r(i.runtimeError):i.issue?r(i.issue):a?r("loading"):i.tileError?r("tileFailed"):t?.points.length?"":r("empty")),effectiveSelected:t?.selected??[],dataRows:t?.points.map(n=>({id:n.id,label:n.label,latitude:n.latitude,longitude:n.longitude}))??[],dataColumns:[{key:"label",label:r("point"),type:"text"},{key:"latitude",label:r("latitude"),type:"number"},{key:"longitude",label:r("longitude"),type:"number"}]})}function hr(i,e=0,t=20){if(!Number.isInteger(e)||e<0||e>I.rows||!Number.isInteger(t)||t<1||t>u.pageSize||!i.renderer)throw new Error(i.text("unavailable"));i.paint();let r=i.requireModel(),a=i.renderer.visibleIds(),s={view:i.renderer.view(),selectedCount:r.selected.length,skippedCount:r.skippedCount,totalCount:a.length,offset:e,items:[],nextOffset:null};for(let n of a.slice(e,e+t))if(s.items.push(n),s.nextOffset=e+s.items.length<a.length?e+s.items.length:null,!(new TextEncoder().encode(JSON.stringify(s)).byteLength<=u.readBytes)){s.items.pop(),s.nextOffset=e+s.items.length;break}return s}function mr(i){return{set_selection:new m({description:"Select valid marker source IDs without editing records.",deps:["selectionUnavailable"],when:()=>!i.$.selectionUnavailable,inputSchema:{type:"object",properties:{ids:{type:"array",maxItems:I.rows,uniqueItems:!0,items:{type:"string",minLength:1,maxLength:u.id}}},required:["ids"],additionalProperties:!1},execute:({ids:e})=>i.setSelection(e)}),set_view:new m({description:"Set map center and zoom; publish only a changed viewport.",deps:["unavailable"],when:()=>!i.$.unavailable,inputSchema:{type:"object",properties:{center:{type:"array",minItems:2,maxItems:2,items:{type:"number",minimum:-180,maximum:180}},zoom:{type:"integer",minimum:0,maximum:I.zoom}},required:["center","zoom"],additionalProperties:!1},execute:({center:e,zoom:t})=>i.setView({center:e,zoom:t})}),fit_records:new m({description:"Fit the viewport to all records with valid coordinates.",deps:["fitUnavailable"],when:()=>!i.$.fitUnavailable,execute:()=>i.fitRecords()}),read_view:new m({description:"Read the viewport, skipped count, and a bounded page of visible marker IDs. Follow nextOffset.",deps:["viewReady","mapLabel"],when:()=>!!i.$.viewReady,inputSchema:{type:"object",properties:{offset:{type:"integer",minimum:0,maximum:I.rows},limit:{type:"integer",minimum:1,maximum:u.pageSize}},additionalProperties:!1},execute:({offset:e,limit:t})=>hr(i,e,t)})}}var pr;function br(){let i=C(Nt);return pr??=Promise.all([import(i),fetch(C(Dt)).then(async e=>{if(!e.ok)throw new Error;let t=new CSSStyleSheet,r=(await e.text()).replaceAll("url(images/",`url(${C(Pt)}`);t.replaceSync(`@layer base { ${r} }`),document.adoptedStyleSheets=[...document.adoptedStyleSheets,t]})]).then(([e])=>e),pr}var gr=h`
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
`;var fr=b`
  @layer components {
    agui-map,
    agui-map-data {
      display: grid;
      min-inline-size: 0;
      gap: 1rem;
    }
    agui-map figure {
      display: grid;
      min-inline-size: 0;
      gap: .5rem;
      margin: 0;
    }
    .agui-map-description,
    .agui-map-attribution,
    .agui-map-skipped {
      color: var(--agui-muted);
      font-size: .875rem;
    }
    .agui-map-canvas {
      isolation: isolate;
      min-inline-size: 0;
      block-size: var(--agui-map-height, 22rem);
      background: #ccc;
      border: 1px solid var(--agui-divider);
      border-radius: var(--agui-radius-inset);
      overflow: hidden;
      color: var(--agui-text);
      font: inherit;
    }
    .agui-map-marker {
      display: grid;
      place-items: center;
      background: transparent;
      border: 0;
    }
    .agui-map-marker::after {
      content: '';
      inline-size: 1rem;
      block-size: 1rem;
      border: 2px solid var(--agui-surface);
      border-radius: 50%;
      background: var(--agui-accent);
      box-shadow: 0 0 0 1px var(--agui-text);
    }
    .agui-map-marker[aria-pressed="true"]::after {
      background: var(--agui-success);
      box-shadow: 0 0 0 3px var(--agui-text);
    }
    agui-map .leaflet-popup-content-wrapper {
      background: var(--agui-surface);
      color: var(--agui-text);
      font: inherit;
    }
    agui-map .leaflet-popup-tip {
      background: var(--agui-surface);
    }
    agui-map agui-map-data {
      margin-block-start: 1rem;
    }
    .agui-map-snapshot {
      display: block;
      inline-size: 100%;
      block-size: auto;
    }
  }
`;var fa=0,ie=class extends c{domId=`agui-map-${++fa}`;componentDescription=()=>JSON.stringify({id:this.id,label:this.$.mapLabel});model;issue;runtimeError;runtime;renderer;resizeObserver;disposed=!1;paintFrame=0;tileError=!1;init$={rows:[],value:[],view:{center:[0,0],zoom:2},tiles:null,texts:{},...Object.fromEntries(Object.keys(ce).map(e=>[e,void 0])),runtimeReady:!1,rendererReady:!1,viewReady:!1,unavailable:!0,selectionUnavailable:!0,fitUnavailable:!0,modelValid:!1,mapHidden:!0,statusMessage:"",statusState:"ready",mapLabel:"",mapDescription:"",attribution:"",attributionUrl:"",skippedCount:0,skippedLabel:"",fitLabel:"",zoomInLabel:"",zoomOutLabel:"",dataLabel:"",dataTableId:"",dataSelectionMode:"none",dataDisabled:!0,dataRows:[],dataColumns:[],effectiveSelected:[],selectIds:e=>this.setSelection(e),onFit:()=>this.fitRecords(),onZoomIn:()=>this.zoom(1),onZoomOut:()=>this.zoom(-1),...mr(this)};renderCallback(){for(let e of["rows","value","view","tiles","texts",...Object.keys(ce),...Object.values(ce).map(t=>`attribute-${t}`)])this.sub(e,()=>this.refresh());this.resizeObserver=new ResizeObserver(()=>this.schedulePaint()),this.resizeObserver.observe(this.ref.canvas),this.loadRuntime()}connectedCallback(){super.connectedCallback(),!(this.disposed||!this.runtime&&!this.runtimeError)&&(this.$.runtimeReady=!!this.runtime,this.refresh())}async loadRuntime(){try{let e=await br();if(this.disposed||(this.runtime=e,!this.isConnected))return;this.$.runtimeReady=!0}catch{if(this.disposed)return;this.runtimeError="loadFailed"}this.refresh()}stateInput(){let e=(t,r)=>this.$[t]??this.getAttribute(ce[t])??r;return{rows:this.$.rows,value:this.$.value,view:this.$.view,tiles:this.$.tiles,texts:this.$.texts,selection:e("selection","multiple"),idKey:e("idKey","id"),latitudeKey:e("latitudeKey","latitude"),longitudeKey:e("longitudeKey","longitude"),labelKey:e("labelKey","label"),label:String(e("label","")),description:String(e("description","")),error:String(e("error","")),loading:!!(this.$.loading??this.hasAttribute("loading")),disabled:!!(this.$.disabled??this.hasAttribute("disabled")),readonly:!!(this.$.readonly??this.hasAttribute("readonly"))}}refresh(){if(!(this.disposed||!this.isConnected)){this.issue=void 0;try{this.model=ur(this.stateInput())}catch(e){this.model=void 0;let t=e instanceof Error?e.message:"";this.issue=t==="invalidRows"||t==="invalidTiles"?t:"invalidState"}xe(this),this.schedulePaint()}}schedulePaint(){this.paintFrame||this.disposed||!this.isConnected||(this.paintFrame=requestAnimationFrame(()=>{this.paintFrame=0,this.paint()}))}paint(){if(this.disposed||!this.isConnected||!this.runtime||this.runtimeError)return;if(this.$.mapHidden||!this.model){this.renderer?.dispose(),this.renderer=void 0,this.$.rendererReady=!1,xe(this);return}let e=this.ref.canvas;if(!(!e.clientWidth||!e.clientHeight))try{this.renderer??=this.runtime.createMapRenderer(e,{select:t=>{!this.disposed&&this.isConnected&&!this.$.selectionUnavailable&&this.selectPoint(t)},view:t=>{!this.disposed&&this.isConnected&&!this.$.unavailable&&this.setView(t)},tileError:t=>{this.disposed||(this.tileError=t,xe(this))}}),this.$.rendererReady=!0,xe(this),this.renderer.render(this.model,!!this.$.unavailable)}catch{this.renderer?.dispose(),this.renderer=void 0,this.$.rendererReady=!1,this.runtimeError="renderFailed",xe(this)}}text(e){return String(this.$.texts?.[e]??"")}requireModel(){if(!this.model)throw new Error(this.text(this.issue??"invalidState"));return this.model}assertAvailable(e=!1){if(this.disposed||!this.isConnected||this.$.unavailable||e&&this.$.selectionUnavailable)throw new Error(this.text("unavailable"))}publish(e,t){this.$[e]=structuredClone(t);let r=this.getAttribute(e==="value"?"pub-to":"view-pub-to")?.trim();r&&(this.$[r]=structuredClone(t)),w(this,{widgetId:this.id||this.localName,context:this.getAttribute("ctx")?.trim()||null,action:e==="value"?"map-selection-change":"map-view-change",selectedCount:this.requireModel().selected.length,totalCount:this.requireModel().points.length})}setSelection(e){this.assertAvailable(!0);let t=this.requireModel();try{e=cr(t,e)}catch{throw new Error(this.text("invalidState"))}let r=!S(t.selected.slice().sort(),e.slice().sort());return r&&this.publish("value",e),{changed:r,selectedCount:this.requireModel().selected.length,totalCount:t.points.length}}selectPoint(e){let t=this.requireModel(),r=new Set(t.state.selection==="single"&&!t.selected.includes(e)?[]:t.selected);return r.has(e)?r.delete(e):r.add(e),this.setSelection(Array.from(r))}setView(e){this.assertAvailable();try{Tt(e)}catch{throw new Error(this.text("invalidState"))}let t=this.requireModel().state.view,r=t.zoom!==e.zoom||e.center.some((a,s)=>Math.abs(a-t.center[s])>1e-7);return r&&this.publish("view",e),{changed:r,view:structuredClone(this.requireModel().state.view)}}fitRecords(){this.assertAvailable(),this.paint();let e=this.renderer?.fitView();if(!e)throw new Error(this.text("unavailable"));return this.setView(e)}zoom(e){this.assertAvailable(),this.paint(),this.renderer?.zoom(e)}destroyCallback(){super.destroyCallback(),this.disposed=!0,cancelAnimationFrame(this.paintFrame),this.resizeObserver?.disconnect(),this.renderer?.dispose(),this.renderer=void 0}};ie.bindAttributes(Object.fromEntries(Object.values(ce).map(i=>[i,`attribute-${i}`])));ie.template=gr;ie.rootStyles=fr;var st=class extends ye{};var vr;function yr(){let i=C(Bt);return vr??=import(i).then(e=>(e.setLibraryAssetBase(C("./")),e)),vr}var va=(i,e)=>e.url||i;function Et(i,e){try{let t=new URL(i,e);if(!["https:","http:"].includes(t.protocol)||t.username||t.password)throw new Error;return t.hash="",t.href}catch{throw new Error("invalidSrc")}}async function xr(i,e,t,r){let a=await fetch(i,{signal:AbortSignal.any([e,AbortSignal.timeout(t.fetchTimeoutMs)]),credentials:"omit",referrerPolicy:"no-referrer",mode:"cors"});if(!a.ok)throw await a.body?.cancel(),new Error("fetchFailed");if(Number(a.headers.get("content-length"))>t.inputBytes)throw await a.body?.cancel(),new Error("inputTooLarge");let s;try{s=va(i,a,r)}catch(p){throw await a.body?.cancel(),p}if(!a.body)return{text:"",url:s};let n=a.body.getReader(),o=new TextDecoder,l=0,d="";try{for(;;){let p=await n.read();if(p.done)return{text:d+o.decode(),url:s};if(l+=p.value.byteLength,l>t.inputBytes)throw await n.cancel(),new Error("inputTooLarge");d+=o.decode(p.value,{stream:!0})}}finally{n.releaseLock()}}function wr(i,e,t){return xr(i,e,Le,t)}var Tr=h`
  <agui-state bind="$.status: statusState; $.message: statusMessage; hidden: !statusMessage"></agui-state>
  <article ref="body" class="agui-markdown-content" bind="@aria-label: documentLabel; @aria-busy: busy; hidden: contentHidden"></article>
`;var ya=["string","comment","attr","attribute","function","variable","title","property","selector-class","keyword","tag","name","number","params","literal","type","built_in","meta","regexp","symbol"],Er=ya.map((i,e)=>`
  .agui-markdown-content pre code .hljs-${i} {
    color: var(--agui-code-${i}, light-dark(hsl(${e*150}deg 85% 34%), hsl(${e*150}deg 85% 74%)));
  }
`).join(`
`);var Sr=b`
  @layer components {
    agui-markdown {
      display: block;
      min-inline-size: 0;
    }
    .agui-markdown-content {
      min-inline-size: 0;
      overflow-wrap: anywhere;
      line-height: 1.2;
    }
    .agui-markdown-content > * + * {
      margin-block-start: 1rem;
    }
    .agui-markdown-content :is(h1, h2, h3, h4, h5, h6) {
      font-weight: 400;
      line-height: 1.3;
      scroll-margin-block-start: 5rem;
    }
    .agui-markdown-content h1 {
      font-size: 1.75rem;
    }
    .agui-markdown-content h2 {
      font-size: 1.5rem;
    }
    .agui-markdown-content h3 {
      font-size: 1.25rem;
    }
    .agui-markdown-content :is(h4, h5, h6) {
      font-size: 1rem;
    }
    .agui-markdown-content :is(ul, ol) {
      padding-inline-start: 1.5rem;
    }
    .agui-markdown-content ul {
      list-style: disc;
    }
    .agui-markdown-content ol {
      list-style: decimal;
    }
    .agui-markdown-content li + li,
    .agui-markdown-content li > :is(ul, ol, p) {
      margin-block-start: .375rem;
    }
    .agui-markdown-content input[type="checkbox"] {
      margin-inline-end: .5rem;
      vertical-align: middle;
      accent-color: var(--agui-accent);
    }
    .agui-markdown-content blockquote {
      border-inline-start: 3px solid var(--agui-accent);
      padding-inline-start: 1rem;
      color: var(--agui-muted);
    }
    .agui-markdown-content code {
      padding: .125rem .375rem;
      border-radius: var(--agui-radius-control);
      background: var(--agui-raised);
      font-family: monospace;
      font-size: .875em;
    }
    .agui-markdown-content pre {
      overflow-x: auto;
      padding: 1rem;
      border: 1px solid var(--agui-divider);
      border-radius: var(--agui-radius-inset);
      background: var(--agui-bg);
      white-space: pre;
    }
    .agui-markdown-content pre code {
      display: block;
      padding: 0;
      background: transparent;
    }
    ${Er}
    .agui-markdown-content pre code .hljs-comment {
      font-style: italic;
      opacity: .7;
    }
    .agui-markdown-content a {
      color: var(--agui-accent);
      text-decoration: underline;
      text-underline-offset: .2em;
    }
    .agui-markdown-content .agui-markdown-table {
      overflow-x: auto;
      border: 1px solid var(--agui-divider);
      border-radius: var(--agui-radius-inset);
    }
    .agui-markdown-content table {
      inline-size: 100%;
      border-collapse: collapse;
      font-size: .875rem;
    }
    .agui-markdown-content :is(th, td) {
      padding: .5rem .75rem;
      border-block-end: 1px solid var(--agui-divider);
      text-align: start;
    }
    .agui-markdown-content th {
      background: var(--agui-raised);
      font-weight: 400;
    }
    .agui-markdown-content hr {
      border: 0;
      border-block-start: 1px solid var(--agui-divider);
    }
  }
`;var xa=0,re=class extends c{headingPrefix=`agui-md-${++xa}`;runtime;loadFailed=!1;disposed=!1;revision=0;scheduled=!1;sourceUrl="";sourceBaseUrl="";sourceValue="";sourceIssue="";sourceLoading=!1;sourceController;init$={value:"",extensions:!0,texts:{},label:void 0,src:void 0,loading:void 0,error:void 0,statusMessage:"",statusState:"ready",documentLabel:"",busy:!1,contentHidden:!0};renderCallback(){for(let e of["value","extensions","texts",...Object.keys(Ge),...Object.values(Ge).map(t=>`attribute-${t}`)])this.sub(e,()=>this.refresh());this.loadRuntime()}connectedCallback(){super.connectedCallback(),(this.runtime||this.loadFailed)&&this.refresh()}disconnectedCallback(){super.disconnectedCallback(),this.stopSource()}async loadRuntime(){try{let e=await yr();if(this.disposed)return;this.runtime=e}catch{if(this.disposed)return;this.loadFailed=!0}this.refresh()}text(e){return String(this.$.texts?.[e]??"")}refresh(){this.revision+=1,!(this.disposed||!this.isConnected||this.scheduled)&&(this.scheduled=!0,queueMicrotask(()=>{this.scheduled=!1,!this.disposed&&this.isConnected&&this.renderDocument(this.revision)}))}stopSource(){this.sourceController?.abort(),this.sourceController=void 0,this.sourceUrl="",this.sourceBaseUrl="",this.sourceValue="",this.sourceIssue="",this.sourceLoading=!1}async loadSource(e){this.stopSource(),this.sourceUrl=e,this.sourceLoading=!0;let t=new AbortController;this.sourceController=t;try{let r=await wr(e,t.signal,window.location.href);if(this.disposed||this.sourceController!==t)return;this.sourceValue=r.text,this.sourceBaseUrl=r.url}catch(r){if(this.disposed||this.sourceController!==t)return;this.sourceIssue=r instanceof Error&&r.message==="inputTooLarge"?"inputTooLarge":"fetchFailed"}this.sourceLoading=!1,this.refresh()}readSource(){let e=this.$.src??this.getAttribute("src")??"";if(typeof e!="string")return this.stopSource(),{value:"",issue:"invalidSrc",loading:!1};if(!e.trim())return this.stopSource(),{value:this.$.value,issue:"",loading:!1};let t;try{t=Et(e,document.baseURI)}catch{return this.stopSource(),{value:"",issue:"invalidSrc",loading:!1}}return t!==this.sourceUrl&&this.loadSource(t),{value:this.sourceValue,issue:this.sourceIssue,loading:this.sourceLoading}}async renderDocument(e){let t=this.readSource(),r=t.value,a=String(this.$.error??this.getAttribute("error")??""),s=t.loading||!!(this.$.loading??this.hasAttribute("loading")),n=t.issue||(typeof r!="string"||typeof this.$.extensions!="boolean"?"invalidValue":r.length>Le.inputBytes||new TextEncoder().encode(r).byteLength>Le.inputBytes?"inputTooLarge":r.trim()?this.loadFailed?"loadFailed":"":"empty"),o=!a&&(s||!n&&!this.runtime);if(this.ref.body.replaceChildren(),this.set$({documentLabel:String(this.$.label??this.getAttribute("label")??""),contentHidden:!0,busy:o,statusState:a?"error":s?"loading":n?n==="empty"?"empty":"error":o?"loading":"ready",statusMessage:a||this.text(s?"loading":n||(o?"loading":""))}),!(n||a||s||!this.runtime)){this.set$({busy:!0,statusState:"loading",statusMessage:this.text("loading")});try{let l=await this.runtime.renderMarkdown(String(r),this.headingPrefix,this.sourceBaseUrl||document.baseURI,this.$.extensions===!0);if(this.disposed||!this.isConnected||e!==this.revision)return;this.ref.body.replaceChildren(l),this.set$({busy:!1,contentHidden:!1,statusState:"ready",statusMessage:""})}catch(l){if(this.disposed||!this.isConnected||e!==this.revision)return;let d=l instanceof Error&&["loadFailed","outputTooLarge"].includes(l.message)?l.message:"renderFailed";this.set$({busy:!1,statusMessage:this.text(d),statusState:"error"})}}}destroyCallback(){super.destroyCallback(),this.stopSource(),this.disposed=!0,this.revision+=1}};re.bindAttributes(Object.fromEntries(Object.values(Ge).map(i=>[i,`attribute-${i}`])));re.template=Tr;re.rootStyles=Sr;var Ar;function Lr(){let i=C(jt);return Ar??=import(i),Ar}var kr=h`
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
`;var $r=b`
  @layer components {
    agui-diagram {
      display: grid;
      min-inline-size: 0;
      gap: .75rem;
    }
    agui-diagram figure {
      display: grid;
      min-inline-size: 0;
      gap: .5rem;
      margin: 0;
    }
    .agui-diagram-plot {
      min-inline-size: 0;
      max-block-size: var(--agui-diagram-max-height, 40rem);
      overflow: auto;
    }
    .agui-diagram-plot > svg {
      --pele-bg: var(--agui-bg);
      --pele-fg: var(--agui-text);
      --pele-muted: var(--agui-muted);
      --pele-line: var(--agui-muted);
      --pele-surface: var(--agui-surface);
      --pele-surface-alt: var(--agui-raised);
      --pele-border: var(--agui-border-hover);
      --pele-accent: var(--agui-accent);
      --pele-font: var(--font-sans, sans-serif);
      --pele-font-mono: monospace;
      --pele-radius: var(--agui-radius-control);
      --pele-series-1: var(--agui-accent);
      --pele-series-2: var(--agui-success);
      --pele-series-3: var(--agui-warning);
      --pele-series-4: var(--agui-danger);
      display: block;
      max-inline-size: 100%;
    }
  }
`;var wa=0,ae=class extends c{svgPrefix=`agui-diagram-${++wa}-`;runtime;disposed=!1;loadFailed=!1;scheduled=!1;revision=0;init$={value:"",label:void 0,description:void 0,loading:void 0,error:void 0,texts:{},diagramLabel:"",diagramDescription:"",statusState:"ready",statusMessage:"",busyText:"false",plotHidden:!0,sourceLabel:"",sourceText:"",hasSource:!1};renderCallback(){for(let e of["value","texts",...We,...We.map(t=>`attribute-${t}`)])this.sub(e,()=>this.refresh());this.loadRuntime()}connectedCallback(){super.connectedCallback(),(this.runtime||this.loadFailed)&&this.refresh()}disconnectedCallback(){this.revision+=1,super.disconnectedCallback()}async loadRuntime(){try{let e=await Lr();if(this.disposed)return;this.runtime=e}catch{if(this.disposed)return;this.loadFailed=!0}this.refresh()}text(e){let t=this.$.texts;return String(t?.[e]??"")}refresh(){this.revision+=1,!(this.disposed||!this.isConnected||this.scheduled)&&(this.scheduled=!0,queueMicrotask(()=>{this.scheduled=!1,!this.disposed&&this.isConnected&&this.draw(this.revision)}))}async draw(e){let t=this.$.value,r=qt(t),a=String(this.$.error??this.getAttribute("error")??""),s=!!(this.$.loading??this.hasAttribute("loading")),n=!a&&(s||!r&&!this.runtime&&!this.loadFailed),o=r||(this.loadFailed?"loadFailed":"");if(this.ref.plot.replaceChildren(),this.set$({diagramLabel:String(this.$.label??this.getAttribute("label")??""),diagramDescription:String(this.$.description??this.getAttribute("description")??""),sourceLabel:this.text("source"),sourceText:!r||r==="empty"?String(t):"",hasSource:!r,plotHidden:!0,busyText:String(n),statusState:a?"error":n?"loading":o?o==="empty"?"empty":"error":"ready",statusMessage:a||this.text(n?"loading":o)}),!(r||a||s||!this.runtime))try{let l=await this.runtime.renderDiagram(String(t),this.svgPrefix);if(this.disposed||!this.isConnected||e!==this.revision)return;this.ref.plot.replaceChildren(l),this.set$({plotHidden:!1,busyText:"false",statusState:"ready",statusMessage:""})}catch(l){if(this.disposed||!this.isConnected||e!==this.revision)return;let d=l instanceof Error?l.message:"";this.set$({busyText:"false",statusState:"error",statusMessage:this.text(["invalidSource","unsupported","inputTooLarge","outputTooLarge","limitExceeded"].includes(d)?d:"renderFailed")})}}destroyCallback(){super.destroyCallback(),this.disposed=!0,this.revision+=1}};ae.bindAttributes(Object.fromEntries(We.map(i=>[i,`attribute-${i}`])));ae.template=kr;ae.rootStyles=$r;var we=Object.freeze({idKey:"id-key",statusKey:"status-key",titleKey:"title-key",descriptionKey:"description-key",label:"label",disabled:"disabled",readonly:"readonly",loading:"loading",error:"error"});function _r(i){if(T(i.value,i.idKey),!y(i.statusKey,u.key)||i.statusKey===i.idKey||!y(i.titleKey,u.key)||typeof i.descriptionKey!="string"||i.descriptionKey.length>u.key)throw new Error("invalidState");try{yt(i.columns)}catch{throw new Error("invalidColumns")}if(!i.columns.length||i.columns.length>u.fields||i.columns.some(s=>!y(s.value,u.id)||!y(s.label,u.text)||s.disabled!==void 0&&typeof s.disabled!="boolean"))throw new Error("invalidColumns");let e=new Set(i.columns.map(s=>s.value)),t=i.columns.map(s=>({id:`status:${s.value}`,status:s.value,label:s.label,tone:s.tone,rows:[]})),r=new Map(t.map(s=>[s.status,s])),a=[];for(let s of i.value){let n=s[i.statusKey];typeof n=="string"&&e.has(n)?r.get(n)?.rows.push(s):a.push(s)}return a.length&&t.push({id:"unassigned",status:null,label:String(i.texts?.unassigned??""),rows:a}),{state:i,groups:t}}function Cr(i,e,t){let r=i.state,a=r.value.find(n=>n[r.idKey]===e);if(!a||!r.columns.some(n=>n.value===t&&!n.disabled))throw new Error("invalidState");let s=a[r.statusKey]!==t;return{changed:s,value:s?r.value.map(n=>n===a?{...n,[r.statusKey]:t}:n):r.value}}function Te(i){return typeof i=="string"||typeof i=="boolean"||typeof i=="number"&&Number.isFinite(i)?String(i):""}function Ir(i,e){let t=i.model,r=n=>String(e.texts?.[n]??""),a=!t||e.disabled||e.readonly||e.loading||!!e.error||!e.columns.some(n=>!n.disabled),s=!t||e.loading||!!e.error;i.set$({unavailable:a,modelValid:!!t,boardLabel:e.label,moveHint:r("moveHint"),busyText:String(e.loading),surfaceHidden:s,statusState:e.loading?"loading":e.error||i.issue?"error":e.value.length?"ready":"empty",statusMessage:e.loading?r("loading"):e.error||(i.issue?r(i.issue):e.value.length?"":r("empty")),columnItems:(s?[]:t?.groups??[]).map(n=>({id:n.id,statusValue:n.status??!1,unassigned:n.status===null?"true":!1,label:n.label,tone:n.tone??!1,count:n.rows.length,countLabel:r("items"),empty:!n.rows.length,emptyLabel:r("emptyColumn"),cards:n.rows.map(o=>({id:String(o[e.idKey]),recordId:String(o[e.idKey]),title:Te(o[e.titleKey])||r("untitled"),description:e.descriptionKey?Te(o[e.descriptionKey]):"",moveHint:r("moveHint"),tabIndex:a?-1:0,disabledText:String(a),unavailable:a,unavailableMessage:r("unavailable")}))}))})}function Mr(i,e,t=0,r=20){let a=i.requireModel(),s=a.state;if(!Number.isInteger(t)||t<0||t>u.rows||!Number.isInteger(r)||r<1||r>u.pageSize||e!==void 0&&e!==""&&!s.columns.some(p=>p.value===e))throw new Error(i.text("invalidState"));let n=e===void 0?s.value:a.groups.find(p=>p.status===(e||null))?.rows??[];(s.loading||s.error)&&(n=[]);let o=[],l={offset:t,nextOffset:null,totalCount:s.value.length,matchingCount:n.length,items:o},d=()=>new TextEncoder().encode(JSON.stringify(l)).byteLength;for(let p=t;p<Math.min(n.length,t+r);p+=1){let g=n[p],v=g[s.statusKey],f={id:String(g[s.idKey]),title:Te(g[s.titleKey])||i.text("untitled"),description:s.descriptionKey?Te(g[s.descriptionKey]):"",status:typeof v=="string"?v:null,unassigned:!s.columns.some(x=>x.value===v)};if(o.push(f),l.nextOffset=p+1<n.length?p+1:null,!(d()<=u.readBytes)){o.pop(),o.length||o.push({id:f.id,truncated:!0}),l.nextOffset=t+o.length<n.length?t+o.length:null;break}}return l}function Or(i){return{move_item:new m({description:"Move one record to an enabled status column. Preserve other fields and record order. Return bounded ID, status, and change/count metadata.",deps:["unavailable"],when:()=>!i.$.unavailable,inputSchema:{type:"object",properties:{id:{type:"string",minLength:1,maxLength:u.id},status:{type:"string",minLength:1,maxLength:u.id}},required:["id","status"],additionalProperties:!1},execute:({id:e,status:t})=>i.moveItem(e,t)}),read_view:new m({description:"Read a bounded page of card IDs, titles, descriptions, and statuses. Optional status selects a column; empty status selects unassigned cards. Follow nextOffset.",deps:["modelValid"],when:()=>!!i.$.modelValid,inputSchema:{type:"object",properties:{status:{type:"string",maxLength:u.id},offset:{type:"integer",minimum:0,maximum:u.rows},limit:{type:"integer",minimum:1,maximum:u.pageSize}},additionalProperties:!1},execute:({status:e,offset:t,limit:r})=>Mr(i,e,t,r)})}}var Rr=h`
  <p class="agui-kanban-hint" bind="textContent: moveHint; hidden: !moveHint"></p>
  <agui-state bind="$.status: statusState; $.message: statusMessage; hidden: !statusMessage"></agui-state>
  <div class="agui-kanban-scroll" role="region" tabindex="0" bind="@aria-label: boardLabel; @aria-busy: busyText; hidden: surfaceHidden">
    <ul class="agui-kanban-columns" itemize="columnItems" item-tag="agui-kanban-column"></ul>
  </div>
`,zr=h`
  <li class="agui-kanban-column" bind="@data-status: statusValue; @data-unassigned: unassigned">
    <h3 class="agui-kanban-column-heading">
      <output class="agui-chip" bind="textContent: count; @aria-label: countLabel; @data-tone: tone"></output>
      <span bind="textContent: label"></span>
    </h3>
    <p class="agui-kanban-empty" bind="textContent: emptyLabel; hidden: !empty"></p>
    <ul class="agui-kanban-cards" itemize="cards" item-tag="agui-kanban-card"></ul>
  </li>
`,Nr=h`
  <li ref="card" class="agui-kanban-card" bind="@data-record-id: recordId; draggable: !unavailable; tabIndex: tabIndex; @aria-disabled: disabledText; @aria-description: moveHint">
    <h4 bind="textContent: title"></h4>
    <p class="agui-kanban-description" bind="textContent: description; hidden: !description"></p>
  </li>
`;var Dr=b`
  @layer components {
    agui-kanban {
      display: grid;
      min-inline-size: 0;
      gap: 1rem;
    }
    agui-kanban-column,
    agui-kanban-card {
      display: contents;
      /* Structural Itemize hosts must not retain old cards during scrollbar fades. */
      transition: none;
    }
    .agui-kanban-scroll {
      min-inline-size: 0;
      max-inline-size: 100%;
      overflow: auto;
    }
    .agui-kanban-scroll:focus-visible {
      outline: 2px solid var(--agui-accent);
      outline-offset: 2px;
    }
    .agui-kanban-columns,
    .agui-kanban-cards {
      display: grid;
      align-content: start;
      gap: 1rem;
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .agui-kanban-columns {
      grid-template-columns: repeat(auto-fit, minmax(min(100%, var(--agui-kanban-column-width, 16rem)), 1fr));
      align-items: stretch;
      grid-auto-rows: 1fr;
    }
    .agui-kanban-column {
      display: grid;
      min-inline-size: 0;
      align-content: start;
      gap: 1rem;
      padding: 1rem;
      border: 1px solid var(--agui-divider);
      border-radius: var(--agui-radius-panel);
      background: var(--agui-bg);
    }
    .agui-kanban-column-heading {
      display: flex;
      align-items: center;
      gap: .5rem;
      overflow-wrap: anywhere;
      font-weight: 400;
    }
    .agui-kanban-card {
      display: grid;
      min-inline-size: 0;
      gap: .75rem;
      padding: 1rem;
      border: 1px solid var(--agui-divider);
      border-radius: var(--agui-radius-inset);
      background: var(--agui-surface);
      box-shadow: var(--agui-shadow-panel);
      overflow-wrap: anywhere;
    }
    .agui-kanban-card h4 {
      font-weight: 400;
    }
    .agui-kanban-description,
    .agui-kanban-hint,
    .agui-kanban-empty {
      font-size: .875rem;
      color: var(--agui-muted);
    }
    .agui-kanban-card[draggable='true'] {
      cursor: grab;
    }
    .agui-kanban-card[data-dragging] {
      cursor: grabbing;
      opacity: .5;
    }
    .agui-kanban-card:focus-visible {
      outline: 2px solid var(--agui-accent);
      outline-offset: 2px;
    }
    .agui-kanban-column[data-drop-target] {
      border-color: var(--agui-accent);
      background: var(--agui-accent-soft);
    }
  }
`;var Pr="application/x-symbiote-agui-kanban",nt=class{drag;target;constructor(e){this.board=e,this.handlers={dragstart:this.onStart,dragover:this.onOver,dragleave:this.onLeave,drop:this.onDrop,dragend:this.cancel,keydown:this.onKey};for(let[t,r]of Object.entries(this.handlers))e.addEventListener(t,r)}element(e,t){let r=e.target instanceof Element?e.target.closest(t):null;return r instanceof HTMLElement&&r.closest("agui-kanban")===this.board?r:void 0}onStart=e=>{let t=this.element(e,".agui-kanban-card"),r=e.dataTransfer;if(!t||this.board.$.unavailable||!r){e.preventDefault();return}let a=t.dataset.recordId;if(!a){e.preventDefault();return}this.cancel(),this.drag={id:a,element:t},r.effectAllowed="move",r.setData(Pr,a),t.setAttribute("data-dragging",""),t.focus()};destination(e){let t=this.element(e,".agui-kanban-column"),r=t?.dataset.status;return t&&r&&this.board.model?.state.columns.some(a=>a.value===r&&!a.disabled)?t:void 0}onOver=e=>{if(!this.drag||this.board.$.unavailable)return;let t=this.destination(e);this.target?.removeAttribute("data-drop-target"),this.target=t;let r=e.dataTransfer;r&&(r.dropEffect=t?"move":"none"),t&&(e.preventDefault(),t.setAttribute("data-drop-target",""))};onLeave=e=>{if(!this.target||this.element(e,".agui-kanban-column")!==this.target)return;let t=e.relatedTarget;t instanceof Node&&this.target.contains(t)||(this.target.removeAttribute("data-drop-target"),this.target=void 0)};onDrop=e=>{let t=this.drag,r=this.destination(e),a=e.dataTransfer,s=r?.dataset.status,n=t&&t.element.isConnected&&!this.board.$.unavailable&&s&&a?.getData(Pr)===t.id;this.cancel(),!(!n||!t||!s)&&(e.preventDefault(),this.board.moveItem(t.id,s),this.board.focusItem(t.id))};onKey=e=>{let t=e;if(t.key==="Escape"){this.cancel();return}if(!t.altKey||t.ctrlKey||t.metaKey||t.shiftKey||t.key!=="ArrowLeft"&&t.key!=="ArrowRight")return;let r=this.element(e,".agui-kanban-card");if(!r||this.board.$.unavailable)return;e.preventDefault();let a=this.board.requireModel(),s=r.dataset.recordId,n=a.state.columns.filter(g=>!g.disabled),o=a.state.value.find(g=>g[a.state.idKey]===s);if(!o)return;let l=n.findIndex(g=>g.value===o?.[a.state.statusKey]),d=(t.key==="ArrowRight"?1:-1)*(getComputedStyle(this.board).direction==="rtl"?-1:1),p=l<0?d>0?n[0]:n.at(-1):n[l+d];!p||!s||(this.board.moveItem(s,p.value),this.board.focusItem(s))};cancel=()=>{this.drag?.element.removeAttribute("data-dragging"),this.target?.removeAttribute("data-drop-target"),this.drag=void 0,this.target=void 0};destroy(){this.cancel();for(let[e,t]of Object.entries(this.handlers))this.board.removeEventListener(e,t)}};var se=class extends c{componentDescription=()=>JSON.stringify({id:this.id,label:this.$.boardLabel});model;issue;disposed=!1;interaction;init$={value:[],columns:[],texts:{},...Object.fromEntries(Object.keys(we).map(e=>[e,void 0])),unavailable:!0,modelValid:!1,boardLabel:"",moveHint:"",busyText:"false",surfaceHidden:!0,statusMessage:"",statusState:"ready",columnItems:[],moveItem:(e,t)=>this.moveItem(e,t),...Or(this)};constructor(){super(),this.templateProcessors.add(k)}renderCallback(){this.interaction=new nt(this);for(let e of["value","columns","texts",...Object.keys(we),...Object.values(we).map(t=>`attribute-${t}`)])this.sub(e,()=>this.refresh())}stateInput(){let e=(t,r)=>this.$[t]??this.getAttribute(we[t])??r;return{value:this.$.value,columns:this.$.columns,texts:this.$.texts,idKey:e("idKey","id"),statusKey:e("statusKey","status"),titleKey:e("titleKey","title"),descriptionKey:e("descriptionKey",""),label:String(e("label","")),error:String(e("error","")),loading:!!(this.$.loading??this.hasAttribute("loading")),disabled:!!(this.$.disabled??this.hasAttribute("disabled")),readonly:!!(this.$.readonly??this.hasAttribute("readonly"))}}refresh(){if(this.disposed||!this.isConnected)return;this.interaction?.cancel();let e=this.stateInput();this.issue=void 0;try{this.model=_r(e)}catch(t){this.model=void 0;let r=t instanceof Error?t.message:"";this.issue=r==="invalidRows"||r==="invalidColumns"?r:"invalidState"}Ir(this,e),this.syncWebMCPTools()}text(e){return String(this.$.texts?.[e]??"")}requireModel(){if(!this.model)throw new Error(this.text(this.issue??"invalidState"));return this.model}moveItem(e,t){let r=this.requireModel();if(this.$.unavailable||this.disposed||!this.isConnected)throw new Error(this.text("unavailable"));let a;try{a=Cr(r,e,t)}catch{throw new Error(this.text("invalidState"))}if(a.changed){this.$.value=a.value;let s=this.getAttribute("pub-to")?.trim();s&&(this.$[s]=a.value);let n={widgetId:this.id||this.localName,context:this.getAttribute("ctx")?.trim()||null,action:"kanban-change",recordId:e,status:t,totalCount:a.value.length};w(this,n)}return{changed:a.changed,recordId:e,status:t,totalCount:a.value.length}}focusItem(e){queueMicrotask(()=>{if(!(this.disposed||!this.isConnected))for(let t of this.querySelectorAll("agui-kanban-card")){let r=t;if(r.$.recordId===e){r.ref.card?.focus();break}}})}destroyCallback(){super.destroyCallback(),this.disposed=!0,this.interaction?.destroy()}};se.bindAttributes(Object.fromEntries(Object.values(we).map(i=>[i,`attribute-${i}`])));se.template=Rr;se.rootStyles=Dr;var De=class extends c{init$={id:"",label:"",statusValue:!1,unassigned:!1,tone:!1,count:0,countLabel:"",emptyLabel:"",empty:!0,cards:[]};constructor(){super(),this.templateProcessors.add(k)}};De.template=zr;var Pe=class extends c{componentDescription=()=>JSON.stringify({boardId:this.closest("agui-kanban")?.id||"",recordId:this.$.recordId});init$={id:"",recordId:"",title:"",description:"",moveHint:"",tabIndex:-1,disabledText:"true",unavailable:!0,unavailableMessage:"",set_status:new m({description:"Set this card status to an enabled board column. Return only ID, status, and change/count metadata.",deps:["unavailable"],when:()=>!this.$.unavailable,inputSchema:{type:"object",properties:{status:{type:"string",minLength:1,maxLength:u.id}},required:["status"],additionalProperties:!1},execute:({status:e})=>this.edit(e)})};edit(e){if(!this.isConnected||this.$.unavailable)throw new Error(String(this.$.unavailableMessage));let t=this.$["^moveItem"];return t(String(this.$.recordId),e)}};Pe.template=Nr;function St(i,e){let t=i.target;if(i.defaultPrevented||!(t instanceof Element)||t.closest('a, button, input, select, textarea, label, summary, [contenteditable], [role="button"], [role="link"]'))return!1;let r=window.getSelection();return!r||r.isCollapsed||!r.containsNode(e,!0)}function Br(i,e,t){let r=s=>{!e()||!St(s,i)||t()},a=s=>{s.defaultPrevented||s.repeat||s.target!==i||!e()||s.key!=="Enter"&&s.key!==" "||(s.preventDefault(),t())};return i.addEventListener("click",r),i.addEventListener("keydown",a),()=>{i.removeEventListener("click",r),i.removeEventListener("keydown",a)}}var Be=class extends c{init$={id:"",rowId:"",cells:[],selectionType:"checkbox",selected:!1,selectable:!1,selectedText:!1,tabIndex:-1};constructor(){super(),this.templateProcessors.add(k)}renderCallback(){this.clearSelectionListeners=Br(this.ref.row,()=>!!this.$.selectable,()=>this.select())}select(){if(!this.isConnected||!this.$.selectable)return;let e=this.$["^selectRow"];return e(String(this.$.rowId),this.$.selectionType==="radio"||!this.$.selected)}destroyCallback(){super.destroyCallback(),this.clearSelectionListeners?.()}};Be.template=ar;var je=class extends c{componentDescription=()=>JSON.stringify({tableId:this.closest(tt)?.id||"",recordId:this.$.rowId,column:this.$.columnKey});init$={id:"",rowId:"",columnKey:"",headingId:"",text:"",tone:!1,cellClass:"",isSelection:!1,selected:!1,selectionValue:!1,"+selectionValue":()=>this.$.selectionType==="radio"?this.$.selected?String(this.$.rowId):"":!!this.$.selected,selectionType:"checkbox",groupName:"",selectLabel:"",unavailable:!1,set_selected:new m({description:"Select or deselect this record by stable ID.",deps:["isSelection","unavailable"],when:()=>!!this.$.isSelection&&!this.$.unavailable,inputSchema:{type:"object",properties:{selected:{type:"boolean"}},required:["selected"],additionalProperties:!1},execute:({selected:e})=>this.select(e)})};renderCallback(){this.sub("+selectionValue",e=>{this.$.selectionValue=e}),this.sub("selectionValue",e=>{let t=this.$.selectionType==="radio"?e===String(this.$.rowId):e===!0;t!==this.$.selected&&this.select(t)})}select(e){let t=this.$["^selectRow"];return t(String(this.$.rowId),e)}};je.template=sr;var qe=class extends c{componentDescription=()=>JSON.stringify({tableId:this.closest(tt)?.id||"",column:this.$.columnKey,label:this.$.label});init$={id:"",headingId:"",columnKey:"",label:"",sortable:!1,ariaSort:!1,sortIcon:"sort",selectAll:!1,selectAllLabel:"",selected:!1,selectionValue:!1,mixed:!1,unavailable:!1,sort_column:new m({description:"Cycle this column through ascending, descending, and source order.",deps:["sortable","unavailable"],when:()=>!!this.$.sortable&&!this.$.unavailable,execute:()=>{let e=this.$["^sortColumn"];return e(String(this.$.columnKey))}}),select_filtered:new m({description:"Toggle selection of all filtered rows, including other pages. Preserve selections outside the filter.",deps:["selectAll","unavailable"],when:()=>!!this.$.selectAll&&!this.$.unavailable,execute:()=>this.selectFiltered()})};renderCallback(){this.sub("selected",e=>{this.$.selectionValue=e}),this.sub("selectionValue",e=>{e!==this.$.selected&&this.selectFiltered()})}selectFiltered(){let e=this.$["^selectFiltered"];return e()}};qe.template=rr;function jr(i){et(i.fields),T(i.rows,i.idKey),fe(i.locale);for(let e of i.fields){let t={text:["contains",...e.options?["equals"]:[]],number:["range"],date:["range"],boolean:["equals"],status:e.options?["equals"]:[]};if(e.filter!==void 0&&!t[e.type].includes(e.filter))throw new Error("invalidFields")}if(typeof i.query!="string"||i.query.length>u.text||!L(i.value)||Object.keys(i.value).length>u.fields)throw new Error("invalidState");for(let[e,t]of Object.entries(i.value)){let r=i.fields.find(a=>a.key===e&&a.filter);if(!r)throw new Error("invalidState");if(r.filter==="range"){if(!L(t)||Object.keys(t).some(o=>!["min","max"].includes(o)))throw new Error("invalidState");let a=t,s=ue(r,a.min),n=ue(r,a.max,!0);if(Number.isNaN(s)||Number.isNaN(n)||s!==null&&n!==null&&s>n)throw new Error("invalidState")}else{if(typeof t!="string"||t.length>u.text)throw new Error("invalidState");let a=r.type==="boolean"?["true","false"]:r.options?.filter(s=>!s.disabled).map(s=>s.value);if(r.filter==="equals"&&t&&!a?.includes(t))throw new Error("invalidState")}}}function At(i){jr(i);let e=a=>a.toLocaleLowerCase(i.locale),t=e(i.query.trim()),r=i.rows.filter(a=>t&&!i.fields.some(s=>e(de(a,s,i)).includes(t))?!1:Object.entries(i.value).every(([s,n])=>{let o=i.fields.find(g=>g.key===s),l=Ae(a,o);if(typeof n=="string")return n?o.filter==="contains"?e(String(l??"")).includes(e(n)):l!==null&&(o.type==="boolean"?String(!!l):String(l))===n:!0;let d=ue(o,n.min),p=ue(o,n.max,!0);return d===null&&p===null||typeof l=="number"&&(d===null||l>=d)&&(p===null||l<=p)}));return{state:i,ids:r.map(a=>String(a[i.idKey]))}}function qr(i,e){let t=a=>String(e.texts?.[a]??""),r=!i.model||e.disabled||e.readonly||e.loading||!!e.error;i.set$({unavailable:r,modelValid:!!i.model,queryLabel:t("search"),queryText:e.query,resultIds:e.loading||e.error?[]:i.model?.ids??[],statusState:e.loading?"loading":e.error||i.issue?"error":i.model?.ids.length?"ready":"empty",statusMessage:e.loading?t("loading"):e.error||(i.issue?t(i.issue):i.model?.ids.length?"":t("empty")),fieldItems:(i.model?e.fields:[]).filter(a=>a.filter).map(a=>({id:a.key,fieldKey:a.key,label:a.label,minLabel:t("minimum"),maxLabel:t("maximum"),allLabel:t("all"),isContains:a.filter==="contains",isEquals:a.filter==="equals",isRange:a.filter==="range",rangeType:a.type==="date"?"date":"number",filterValue:e.value[a.key]??"",options:a.type==="boolean"?[{value:"true",label:t("trueLabel")},{value:"false",label:t("falseLabel")}]:a.options??[],unavailable:r}))})}var ot={anyOf:[{type:"string",maxLength:u.text},{type:"object",properties:Object.fromEntries(["min","max"].map(i=>[i,{anyOf:[{type:"number"},{type:"string",maxLength:u.text}]}])),additionalProperties:!1}]};function Ur(i){let e=(t,r)=>new m({description:`Set this filter's ${t}. Return bounded change/count metadata, not records.`,deps:["unavailable"],when:()=>!i.$.unavailable,inputSchema:{type:"object",properties:{[t]:r},required:[t],additionalProperties:!1},execute:a=>i.edit(t,a[t])});return{set_value:e("value",{type:"object",maxProperties:u.fields,additionalProperties:ot}),set_query:e("query",{type:"string",maxLength:u.text}),read_result:new m({description:"Read a bounded page of matching record IDs. Follow nextOffset. No records are returned.",deps:["modelValid"],when:()=>!!i.$.modelValid,inputSchema:{type:"object",properties:{offset:{type:"integer",minimum:0,maximum:u.rows},limit:{type:"integer",minimum:1,maximum:u.pageSize}},additionalProperties:!1},execute:({offset:t,limit:r})=>i.readResult(t,r)})}}var Kr=h`
  <agui-field class="agui-filter-query" type="search" maxlength="2048" pub-to="^queryText"
    bind="$.label: queryLabel; $.value: queryText; $.disabled: unavailable"></agui-field>
  <div class="agui-filter-fields" itemize="fieldItems" item-tag="agui-filter-field"></div>
  <agui-state bind="$.status: statusState; $.message: statusMessage; hidden: !statusMessage"></agui-state>
`,Hr=h`
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
`;var Vr=b`
  @layer components {
    agui-filter {
      display: grid;
      min-inline-size: 0;
      gap: 1rem;
      font-size: .875rem;
    }
    .agui-filter-query,
    .agui-filter-fields,
    agui-filter-field,
    agui-filter-field fieldset {
      display: grid;
      min-inline-size: 0;
      gap: .25rem;
    }
    .agui-filter-fields {
      gap: 1rem;
    }
    .agui-filter-fields:empty {
      display: none;
    }
    .agui-filter-range {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: .5rem;
    }
  }
`;var Ue=Object.freeze({idKey:"id-key",locale:"locale",label:"label",disabled:"disabled",readonly:"readonly",loading:"loading",error:"error"}),ne=class extends c{componentDescription=()=>JSON.stringify({id:this.id,label:this.stateInput().label});model;issue;disposed=!1;init$={rows:[],fields:[],value:{},query:"",texts:{},...Object.fromEntries(Object.keys(Ue).map(e=>[e,void 0])),unavailable:!0,modelValid:!1,resultIds:[],fieldItems:[],queryLabel:"",queryText:"",statusMessage:"",statusState:"ready",editField:(e,t)=>this.editField(e,t),...Ur(this)};constructor(){super(),this.templateProcessors.add(k)}renderCallback(){this.sub("queryText",e=>{e!==this.$.query&&this.edit("query",e)},!1);for(let e of["rows","fields","value","query","texts",...Object.keys(Ue),...Object.values(Ue).map(t=>`attribute-${t}`),"attribute-results-to"])this.sub(e,()=>this.refresh())}stateInput(){let e=(t,r)=>this.$[t]??this.getAttribute(Ue[t])??r;return{rows:this.$.rows,fields:this.$.fields,value:this.$.value,query:this.$.query,texts:this.$.texts,idKey:e("idKey","id"),locale:e("locale",document.documentElement.lang||navigator.language),label:String(e("label","")),error:String(e("error","")),loading:!!(this.$.loading??this.hasAttribute("loading")),disabled:!!(this.$.disabled??this.hasAttribute("disabled")),readonly:!!(this.$.readonly??this.hasAttribute("readonly"))}}refresh(){if(this.disposed||!this.isConnected)return;let e=this.stateInput();this.issue=void 0;try{this.model=At(e)}catch(r){this.model=void 0;let a=r instanceof Error?r.message:"";this.issue=a==="invalidRows"||a==="invalidFields"?a:"invalidState"}qr(this,e);let t=this.getAttribute("results-to")?.trim();t&&!S(this.$[t],this.$.resultIds)&&(this.$[t]=structuredClone(this.$.resultIds)),this.syncWebMCPTools()}text(e){return String(this.$.texts?.[e]??"")}requireModel(){if(!this.model)throw new Error(this.text(this.issue??"invalidState"));return this.model}edit(e,t){let r=this.requireModel();if(this.$.unavailable||this.disposed)throw new Error(this.text("unavailable"));try{At({...r.state,[e]:t})}catch{throw new Error(this.text("invalidState"))}let a=!S(r.state[e],t);if(a){this.$[e]=structuredClone(t);let s=this.getAttribute(e==="value"?"pub-to":"query-pub-to")?.trim();s&&(this.$[s]=structuredClone(t));let n={widgetId:this.id||this.localName,context:this.getAttribute("ctx")?.trim()||null,action:"filter-change",property:e,resultCount:this.requireModel().ids.length};w(this,n)}return{changed:a,resultCount:this.requireModel().ids.length}}editField(e,t){let r={...this.requireModel().state.value};return t===""||t&&typeof t=="object"&&!Object.keys(t).length?delete r[e]:r[e]=t,this.edit("value",r)}readResult(e=0,t=20){if(this.requireModel(),!Number.isInteger(e)||e<0||e>u.rows||!Number.isInteger(t)||t<1||t>u.pageSize)throw new Error(this.text("invalidState"));let r=this.$.resultIds,a=r.slice(e,e+t),s=()=>({total:r.length,items:a,nextOffset:e+a.length<r.length?e+a.length:null});for(;new TextEncoder().encode(JSON.stringify(s())).byteLength>u.readBytes&&a.length;)a.pop();return s()}destroyCallback(){super.destroyCallback(),this.disposed=!0}};ne.bindAttributes({...Object.fromEntries(Object.values(Ue).map(i=>[i,`attribute-${i}`])),"results-to":"attribute-results-to"});ne.template=Kr;ne.rootStyles=Vr;var Ke=class extends c{refreshing=!0;componentDescription=()=>JSON.stringify({filterId:this.closest("agui-filter")?.id||"",field:this.$.fieldKey,label:this.$.label});init$={id:"",fieldKey:"",label:"",minLabel:"",maxLabel:"",allLabel:"",isContains:!1,isEquals:!1,isRange:!1,rangeType:"number",filterValue:"",options:[],containsValue:"",equalsValue:"",minValue:"",maxValue:"",rangeStep:"any",selectOptions:[],unavailable:!1,set_filter:new m({description:"Set this filter field to text, an option value, or inclusive min/max bounds.",deps:["unavailable"],when:()=>!this.$.unavailable,inputSchema:{type:"object",properties:{value:ot},required:["value"],additionalProperties:!1},execute:({value:e})=>this.edit(e)})};renderCallback(){for(let e of["filterValue","options","allLabel"])this.sub(e,()=>this.refresh());for(let e of["containsValue","equalsValue","minValue","maxValue"])this.sub(e,()=>{this.refreshing||this.onInput()});this.refreshing=!1}refresh(){let e=this.$.filterValue,t=e&&typeof e=="object"?e:{},r=this.$.options,a=typeof e=="string"?e:"",s=o=>o===void 0?"":String(o).slice(0,this.$.rangeType==="date"?10:void 0),n=this.refreshing;this.refreshing=!0;try{this.set$({containsValue:a,equalsValue:a,minValue:s(t.min),maxValue:s(t.max),rangeStep:this.$.rangeType==="date"?"1":"any",selectOptions:[{value:"",label:String(this.$.allLabel)},...r]})}finally{this.refreshing=n}}edit(e){let t=this.$["^editField"];return t(String(this.$.fieldKey),e)}onInput=()=>{if(this.$.isContains)this.edit(this.$.containsValue);else if(this.$.isEquals)this.edit(this.$.equalsValue);else{let e=this.ref.min.control,t=this.ref.max.control;if(!(e instanceof HTMLInputElement)||!(t instanceof HTMLInputElement)||!e.checkValidity()||!t.checkValidity())return;let r={};e.value&&(r.min=this.$.rangeType==="date"?e.value:Number(e.value)),t.value&&(r.max=this.$.rangeType==="date"?t.value:Number(t.value)),this.edit(r)}}};Ke.template=Hr;var Ee=Object.freeze({label:"label",idKey:"id-key",selection:"selection",itemTemplate:"item-template",disabled:"disabled",readonly:"readonly",loading:"loading",error:"error"}),lt=Object.fromEntries(Object.values(Ee).map(i=>[i,`attribute-${i}`]));function Fr(i){if(T(i.rows,i.idKey),E(i.value),i.filteredIds!==null&&E(i.filteredIds),!["none","single","multiple"].includes(i.selection))throw new Error("invalidState");let e=i.filteredIds===null?null:new Set(i.filteredIds);return{state:i,filtered:i.rows.filter(t=>!e||e.has(String(t[i.idKey]))),selected:it(i,i.value)}}function Gr(i){return{set_selection:new m({description:"Select this list's items by stable ID. Returns change/count metadata without records.",deps:["unavailable","selectionEnabled"],when:()=>!i.$.unavailable&&!!i.$.selectionEnabled,inputSchema:{type:"object",properties:{ids:{type:"array",maxItems:u.rows,uniqueItems:!0,items:{type:"string",minLength:1,maxLength:u.id}}},required:["ids"],additionalProperties:!1},execute:({ids:e})=>i.edit(e)})}}var Lt=h`
  <div ref="items" class="agui-list-items" itemize="itemsToRender"></div>
`;var dt=b`
  @layer components {
    :is(agui-list, agui-explorer) {
      display: block;
      min-inline-size: 0;
    }
    :is(agui-list, agui-explorer) > .agui-list-items {
      display: contents;
    }
    :is(agui-list, agui-explorer) > .agui-list-items > * {
      /* Itemize reuses structural hosts; pending exit timers must not remove reused items. */
      transition: none;
    }
    :is(agui-list, agui-explorer)[data-message]:not([data-message=''])::before {
      content: attr(data-message);
      grid-column: 1 / -1;
    }
  }
`;var D=class i extends c{inlineTemplate;itemTemplate;semantics;model;issue="";disposed=!1;handledEvents=new WeakSet;componentDescription=()=>JSON.stringify({id:this.id,label:this.stateInput().label});init$={items:[],value:[],filteredIds:null,texts:{},...Object.fromEntries(Object.keys(Ee).map(e=>[e,void 0])),itemsToRender:[],unavailable:!0,selectionEnabled:!1,selectItem:e=>this.selectItem(e),...Gr(this)};render(e,t){this.inlineTemplate=[...this.children].find(a=>a instanceof HTMLTemplateElement),this.itemTemplate=this.resolveTemplate();let r=document.createElement("template");r.innerHTML=Lt,r.content.querySelector("[itemize]")?.append(this.itemTemplate?.cloneNode(!0)??document.createElement("template")),this.replaceChildren(),super.render(r.content,t)}resolveTemplate(){let e=this.$.itemTemplate??this.getAttribute("item-template");if(!e)return this.inlineTemplate;try{let r=this.getRootNode().querySelector(String(e))||document.querySelector(String(e));return r instanceof HTMLTemplateElement?r:void 0}catch{return}}renderCallback(){this.semantics=this.attachInternals(),this.semantics.role="list",this.ref.items.addEventListener("click",this.onClick);for(let e of["items","value","filteredIds","texts",...Object.keys(Ee),...Object.values(Ee).map(t=>`attribute-${t}`)])this.sub(e,()=>this.refresh())}stateInput(){let e=(t,r)=>this.$[t]??this.getAttribute(Ee[t])??r;return{rows:this.$.items,value:this.$.value,filteredIds:this.$.filteredIds,texts:this.$.texts,idKey:e("idKey","id"),selection:e("selection","none"),label:String(e("label","")),error:String(e("error","")),loading:!!(this.$.loading??this.hasAttribute("loading")),disabled:!!(this.$.disabled??this.hasAttribute("disabled")),readonly:!!(this.$.readonly??this.hasAttribute("readonly"))}}refresh(){if(this.disposed)return;let e=this.stateInput();this.issue="";try{if(!this.itemTemplate||this.resolveTemplate()!==this.itemTemplate)throw new Error("invalidState");this.model=this.deriveModel(e)}catch(n){this.model=void 0,this.issue=n instanceof Error&&n.message==="invalidRows"?"invalidRows":"invalidState"}let t=this.model,r=!t||e.disabled||e.readonly||e.loading||!!e.error,a=new Set(t?.selected),s=e.selection!=="none";this.semantics&&(this.semantics.ariaLabel=e.label),this.setAttribute("aria-busy",String(e.loading)),this.dataset.state=e.loading?"loading":e.error||this.issue?"error":t?.filtered.length?"ready":"empty",this.dataset.message=e.loading?this.text("loading"):e.error||(this.issue?this.text(this.issue):t?.filtered.length?"":this.text("empty")),this.set$({unavailable:r,selectionEnabled:s&&!!t,itemsToRender:e.loading||e.error||!t?null:t.filtered.map(n=>({...n,_selected:a.has(String(n[e.idKey])),_selectionDisabled:r||!s}))}),this.syncWebMCPTools()}text(e){return String(this.$.texts?.[e]??"")}deriveModel(e){return Fr(e)}requireModel(){if(!this.model)throw new Error(this.text(this.issue||"invalidState"));return this.model}edit(e){let t=this.requireModel();if(this.$.unavailable||this.disposed)throw new Error(this.text("unavailable"));try{e=rt(t.state,e)}catch{throw new Error(this.text("invalidState"))}let r=!S([...t.selected].sort(),[...e].sort());if(r){this.$.value=[...e];let a=this.getAttribute("pub-to")?.trim();a&&(this.$[a]=[...e]),w(this,{widgetId:this.id||this.localName,context:this.getAttribute("ctx")?.trim()||null,action:"list-change",property:"value",selectedCount:e.length,filteredCount:this.requireModel().filtered.length})}return this.result(r)}result(e){return{changed:e,selectedCount:this.model?.selected.length??0,filteredCount:this.model?.filtered.length??0}}onClick=e=>{e.target instanceof Element&&e.composedPath().find(t=>t instanceof i)===this&&St(e,this.ref.items)&&this.selectItem(e)};selectItem(e){if(e.defaultPrevented||this.handledEvents.has(e)||!this.isConnected||this.disposed||this.$.unavailable||!this.$.selectionEnabled)return this.result(!1);let t=e.target instanceof Element?e.target:null;for(;t&&t.parentElement!==this.ref.items;){let p=t.getRootNode();t=t.parentElement||(p instanceof ShadowRoot?p.host:null)}let r=t?[...this.ref.items.children].indexOf(t):-1,a=this.requireModel(),s=a.filtered[r];if(!s)return this.result(!1);this.handledEvents.add(e);let n=String(s[a.state.idKey]),o=e.target,l=e.type!=="webmcp"&&o instanceof HTMLInputElement&&(o.type==="checkbox"||o.type==="radio")?o.checked:a.state.selection==="single"||!a.selected.includes(n),d=new Set(a.state.selection==="single"&&l?[]:a.selected);return l?d.add(n):d.delete(n),this.edit([...d])}destroyCallback(){super.destroyCallback(),this.disposed=!0,this.ref.items.removeEventListener("click",this.onClick)}};D.bindAttributes(lt);D.template=Lt;D.rootStyles=dt;function Wr(i,e){T(i,"id"),E(e);let t=new Map(i.map(o=>[o.id,o])),r=new Map;for(let o of i){if(typeof o.label!="string"||o.label.length>u.text||o.parentId!==void 0&&typeof o.parentId!="string"||o.parentId&&(!t.get(o.parentId)?.branch||o.parentId===o.id)||["branch","loaded","loading","more","disabled"].some(p=>o[p]!==void 0&&typeof o[p]!="boolean")||["icon","message"].some(p=>o[p]!==void 0&&(typeof o[p]!="string"||o[p].length>u.text)))throw new Error("invalidRows");let l=o.parentId||"",d=r.get(l)||[];d.push(o),r.set(l,d)}let a=new Set(e),s=[],n=(o,l,d,p)=>{if(l>64)throw new Error("invalidRows");for(let g of r.get(o)||[]){let v=!!g.branch&&a.has(g.id);s.push({...g,depth:l,visible:d,open:v,disabled:p||g.disabled}),n(g.id,l+1,d&&v,p||!!g.disabled)}};if(n("",0,!0,!1),s.length!==i.length)throw new Error("invalidRows");return s}var Yr=h`
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
`;var Se=class extends D{defaultTemplate;constructor(){super(),Object.assign(this.init$,{expanded:[],selectBranches:void 0,request:null,toggle_node:new m({description:"Expand or collapse an explorer branch by ID. Returns change metadata without node contents.",deps:["unavailable"],when:()=>!this.$.unavailable,inputSchema:{type:"object",properties:{id:{type:"string"}},required:["id"],additionalProperties:!1},execute:({id:e})=>this.toggleNode(e)})})}resolveTemplate(){let e=super.resolveTemplate();return e||(this.defaultTemplate||(this.defaultTemplate=document.createElement("template"),this.defaultTemplate.innerHTML=Yr),this.defaultTemplate)}renderCallback(){super.renderCallback(),this.sub("expanded",()=>this.refresh()),this.sub("selectBranches",()=>this.refresh()),this.sub("attribute-select-branches",()=>this.refresh())}get selectsBranches(){return!!(this.$.selectBranches??this.hasAttribute("select-branches"))}stateInput(){return{...super.stateInput(),idKey:"id",selection:this.$.selection??this.getAttribute("selection")??"single"}}deriveModel(e){let t=Wr(e.rows,this.$.expanded),r=new Set(e.value),a=e.filteredIds===null?null:new Set(e.filteredIds);return super.deriveModel({...e,idKey:"id",value:e.value.filter(s=>t.some(n=>n.id===s&&(this.selectsBranches||!n.branch))),filteredIds:t.filter(s=>s.visible&&(!a||a.has(s.id))).map(s=>s.id),rows:t.map(s=>({...s,indent:`${s.depth}rem`,nodeDisabled:e.disabled||e.readonly||e.loading||!!e.error||!!s.disabled||!s.branch&&e.selection==="none",nodeExpanded:s.branch?String(s.open):null,nodeSelected:s.branch&&!this.selectsBranches?null:String(r.has(s.id)),nodeIcon:s.icon||(s.branch?s.open?"folder_open":"folder":"insert_drive_file"),actionLabel:[this.text(s.branch?s.open?"collapse":"expand":"select"),s.label].filter(Boolean).join(" "),moreLabel:this.text(s.message?"retry":"more"),showMore:s.open&&!s.loading&&(!!s.more||!!s.message&&s.loaded===!1),showMessage:!!s.message&&(!s.branch||s.open),activateNode:n=>{if(s.branch){let o=this.toggleNode(s.id);return this.selectsBranches&&this.selectItem(n),o}return this.selectItem(n)},loadMore:()=>this.requestNode(s.id,s.message&&s.loaded===!1?"retry":"more")}))})}edit(e){if(!Array.isArray(e))throw new Error(this.text("invalidState"));let t=this.requireModel();if(e.some(r=>t.state.rows.some(a=>a.id===r&&(a.branch&&!this.selectsBranches||a.disabled))))throw new Error(this.text("unavailable"));return super.edit(e)}toggleNode(e){let t=this.requireModel().state.rows.find(n=>n.id===e);if(this.$.unavailable||!t?.branch||t.disabled)throw new Error(this.text("unavailable"));let r=new Set(this.$.expanded),a=!r.has(e);a?r.add(e):r.delete(e),this.$.expanded=[...r];let s=this.getAttribute("expanded-pub-to")?.trim();return s&&(this.$[s]=this.$.expanded),a&&t.loaded===!1&&!t.loading&&this.requestNode(e,"expand"),{id:e,expanded:a,changed:!0}}requestNode(e,t){let r=this.requireModel().state.rows.find(n=>n.id===e);if(this.$.unavailable||!r?.branch||r.disabled||r.loading)throw new Error(this.text("unavailable"));let a={id:e,action:t};this.$.request=a;let s=this.getAttribute("request-pub-to")?.trim();s&&(this.$[s]=a)}};Se.bindAttributes({...lt,"select-branches":"attribute-select-branches"});Se.rootStyles=dt;var kt=5e3,$t=Object.freeze({info:{messageRole:"status",liveMode:"polite",iconName:"info"},success:{messageRole:"status",liveMode:"polite",iconName:"check_circle"},warning:{messageRole:"status",liveMode:"polite",iconName:"warning"},error:{messageRole:"alert",liveMode:"assertive",iconName:"error"},alert:{messageRole:"alert",liveMode:"assertive",iconName:"warning"}});var ut=new Set;function ct(){let i=0;for(let e of[...ut].reverse())e.style.setProperty("--agui-message-offset",`${i}px`),i+=e.getBoundingClientRect().height+8}function Jr(i){ut.delete(i),ut.add(i),ct()}function Xr(i){ut.delete(i),ct()}var Zr=h`
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
`;var Qr=b`
  @layer components {
    agui-message {
      position: fixed;
      z-index: 31;
      inset: auto max(.5rem, env(safe-area-inset-right)) calc(var(--agui-data-toolbar-height, 0px) + var(--agui-message-offset, 0px) + .5rem) auto;
      display: grid;
      grid-template-columns: auto minmax(0, 1fr) auto;
      align-items: center;
      gap: .75rem;
      box-sizing: border-box;
      width: fit-content;
      max-width: min(28rem, calc(100% - 1rem - env(safe-area-inset-left) - env(safe-area-inset-right)));
      max-height: 40dvh;
      overflow: auto;
      margin: 0;
      padding: .5rem;
      border: 0;
      border-radius: var(--agui-radius-inset);
      background: var(--agui-accent);
      color: var(--agui-on-accent);
      box-shadow: var(--agui-shadow-floating);
      pointer-events: none;
      opacity: 0;
      transform: translateY(.5rem);
    }
    agui-message[data-tone='success'] {
      background: var(--agui-success);
      color: var(--agui-on-success);
    }
    agui-message[data-tone='warning'] {
      background: var(--agui-warning);
      color: var(--agui-on-warning);
    }
    agui-message[data-tone='alert'],
    agui-message[data-tone='error'] {
      background: var(--agui-danger);
    }
    agui-message:not([hidden]):not([data-closing]) {
      opacity: 1;
      transform: translateY(0);
    }
    agui-message[hidden] {
      display: none;
    }
    agui-message[data-closing] {
      pointer-events: none;
    }
    .agui-message-text {
      margin: 0;
      white-space: pre-line;
      overflow-wrap: anywhere;
      font-size: .875rem;
    }
    agui-message .agui-message-dismiss {
      pointer-events: auto;
      color: inherit;
    }
    agui-message .agui-message-dismiss:hover:not(:disabled):not([aria-disabled='true']) {
      background: rgb(255 255 255 / 15%);
      color: inherit;
    }
    agui-message .agui-message-dismiss:focus-visible {
      outline-color: currentColor;
    }
    @media (prefers-reduced-motion: no-preference) {
      agui-message {
        transition-property: opacity, transform, display, overlay;
        transition-duration: 180ms;
        transition-timing-function: var(--agui-motion-ease);
        transition-behavior: allow-discrete;
      }
      @starting-style {
        agui-message:not([hidden]):not([data-closing]) {
          opacity: 0;
          transform: translateY(.5rem);
        }
      }
    }
    @media (prefers-reduced-motion: reduce) {
      agui-message {
        transform: none;
      }
    }
  }
`;var oe=class extends c{timer;sizeObserver;generation=0;disposed=!1;init$={message:"",tone:"info",timeout:kt,closeLabel:"",messageRole:"status",liveMode:"polite",iconName:"info",dismiss:()=>{this.hide()}};renderCallback(){this.hidden=!0,"showPopover"in HTMLElement.prototype&&this.setAttribute("popover","manual"),this.sizeObserver=new ResizeObserver(ct),this.sizeObserver.observe(this),this.sub("tone",e=>{let t=Object.hasOwn($t,String(e))?e:"info";this.setAttribute("data-tone",t),this.set$($t[t])}),this.sub("message",()=>this.show()),this.sub("timeout",()=>{this.hidden||this.show()})}show(){if(this.disposed)return;if(!String(this.$.message??"").trim()){this.hide();return}window.clearTimeout(this.timer),this.generation+=1,this.removeAttribute("data-closing"),this.hidden=!1,this.hasAttribute("popover")&&!this.matches(":popover-open")&&this.showPopover(),Jr(this);let e=Number(this.$.timeout);this.timer=window.setTimeout(()=>{this.hide()},Number.isFinite(e)&&e>0?e:kt)}async hide(e=!1){window.clearTimeout(this.timer),this.timer=void 0;let t=++this.generation;!e&&!this.hidden&&(this.setAttribute("data-closing",""),await Promise.allSettled(this.getAnimations().map(r=>r.finished))),t===this.generation&&(this.hasAttribute("popover")&&this.matches(":popover-open")&&this.hidePopover(),this.hidden=!0,this.removeAttribute("data-closing"),Xr(this))}destroyCallback(){super.destroyCallback(),this.disposed=!0,this.hide(!0),this.sizeObserver?.disconnect()}};oe.bindAttributes({message:"message",tone:"tone",timeout:"timeout","close-label":"closeLabel"});oe.template=Zr;oe.rootStyles=Qr;function Ta(i,e,t){let r=i.scrollHeight>i.clientHeight,a=i.scrollWidth>i.clientWidth;if(!r&&!a)return!1;let s=t.defaultView;if(!s)return!1;let n=s.getComputedStyle(i);if(n.scrollbarWidth==="none")return!1;let o=i===t.scrollingElement,l=i.getBoundingClientRect(),d=o?1:l.width/i.offsetWidth,p=o?1:l.height/i.offsetHeight,g=o?e.clientX:(e.clientX-l.left)/d,v=o?e.clientY:(e.clientY-l.top)/p,f=o?s.innerWidth:i.offsetWidth,x=o?s.innerHeight:i.offsetHeight,q=o?0:parseFloat(n.borderLeftWidth),_=o?0:parseFloat(n.borderRightWidth),He=o?0:parseFloat(n.borderTopWidth),ht=o?0:parseFloat(n.borderBottomWidth);if(g<q||g>=f-_||v<He||v>=x-ht)return!1;let Ct=f-q-_-i.clientWidth,ia=x-He-ht-i.clientHeight,It=Ct||10,ra=ia||10,aa=i.clientLeft>q||Ct===0&&n.direction==="rtl"?g<q+It:g>=f-_-It;return r&&(o||/^(auto|scroll|overlay)$/.test(n.overflowY))&&aa||a&&(o||/^(auto|scroll|overlay)$/.test(n.overflowX))&&v>=x-ht-ra}function ea(i,e){let t,r=s=>{s!==t&&(t?.removeAttribute("data-agui-scrollbar-hover"),t=s,t?.setAttribute("data-agui-scrollbar-hover",""))},a=s=>{if(s.pointerType!=="touch"){for(let n of s.composedPath()){let o=n===i?i.scrollingElement:n;if(!o||!("offsetWidth"in o))continue;let l=o;if(Ta(l,s,i)){r(l);return}}r(void 0)}};i.addEventListener("pointermove",a,{capture:!0,passive:!0,signal:e}),i.addEventListener("pointerout",s=>{s.relatedTarget||r(void 0)},{capture:!0,signal:e}),i.defaultView?.addEventListener("blur",()=>r(void 0),{signal:e}),e.addEventListener("abort",()=>r(void 0),{once:!0})}var _t=new WeakMap,Ea=900;function ta(i){let e=_t.get(i);if(e)return e;let t=new Map,r=n=>{let o=n.target,l=o===i?i.scrollingElement:o?.nodeType===1?o:null;l&&(t.has(l)||l.setAttribute("data-agui-scrolling",""),clearTimeout(t.get(l)),t.set(l,window.setTimeout(()=>{l.removeAttribute("data-agui-scrolling"),t.delete(l)},Ea)))},a=new AbortController;ea(i,a.signal);for(let n of["scroll","scrollend"])i.addEventListener(n,r,{capture:!0,passive:!0,signal:a.signal});let s=()=>{a.abort();for(let[n,o]of t)clearTimeout(o),n.removeAttribute("data-agui-scrolling");t.clear(),_t.delete(i)};return _t.set(i,s),s}function Op(i={}){let e={"agui-app":$e,"agui-sidebar":U,"agui-viewport":_e,"agui-tab-button":Ce,"agui-tab":H,"agui-tabs":V,"agui-dashboard":ke,"agui-panel":Ie,"agui-sidebar-block":K,"agui-header":he,"agui-footer":Me,"agui-toolbar":Oe,"agui-button":G,"agui-nav":z,"agui-breadcrumbs":me,"agui-field":Re,"agui-select":pe,"agui-toggle":ge,"agui-theme-toggle":i.themeToggle??be,"agui-theme-selector":i.themeSelector??W,"agui-preloader":J,"agui-steps":X,"agui-state":Y,"agui-dialog":ee,"agui-message":oe,"agui-icon":Q,"agui-table-cell":je,"agui-table-row":Be,"agui-table-heading":qe,"agui-filter-field":Ke,"agui-filter":ne,"agui-table":N,"agui-list":D,"agui-explorer":Se,"agui-chart-data":at,"agui-chart":te,"agui-map-data":st,"agui-map":ie,"agui-markdown":re,"agui-diagram":ae,"agui-kanban-card":Pe,"agui-kanban-column":De,"agui-kanban":se};for(let t of Object.values(Ut)){if(typeof t!="function"||!(t.prototype instanceof Ve))continue;let r=t;customElements.get(r.is)!==r&&customElements.define(r.is,r)}for(let[t,r]of Object.entries(e)){let a=customElements.get(t);a&&a!==r&&customElements.define(t,r)}i.assetBaseUrl&&zt(i.assetBaseUrl),Qe(document),ta(document);for(let[t,r]of Object.entries(e))r.reg(t)}export{ke as a,$e as b,U as c,K as d,_e as e,H as f,V as g,Ce as h,Ie as i,he as j,Me as k,Oe as l,Re as m,G as n,z as o,me as p,pe as q,be as r,W as s,ge as t,Y as u,J as v,X as w,Ze as x,Qe as y,Q as z,ee as A,te as B,N as C,at as D,ie as E,st as F,re as G,ae as H,se as I,De as J,Pe as K,Be as L,je as M,qe as N,ne as O,Ke as P,D as Q,Se as R,oe as S,Op as T};
