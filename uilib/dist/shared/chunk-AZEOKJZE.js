import{b as It}from"./chunk-XR56QR4H.js";import{a as xt,b as wt,c as z,d as $t}from"./chunk-ICKZKRA6.js";import{b as tt,c as Zt}from"./chunk-NXKZZ2BA.js";import{a as rt,b as at}from"./chunk-IDZIK3UE.js";import{a as ve,b as re,c as ae,d as Nt,e as Pt}from"./chunk-LILKVDOZ.js";import{a as w}from"./chunk-NHYHGHQP.js";import{a as Qt}from"./chunk-5JTYUYYO.js";import{a as Jt}from"./chunk-4SPRZCFS.js";import{a as Kt,b as _}from"./chunk-5D4N457A.js";import{a as u,b as Ne,c as E,d as se}from"./chunk-F4UMY2T3.js";import{a as li}from"./chunk-4FOOESPW.js";import{a as _e}from"./chunk-PBBD7VQK.js";import{a as Dt,b as R,c as ie,d as De}from"./chunk-3O4JLZFH.js";import{a as Bt,b as Ht,c as Gt,d as $,e as oe}from"./chunk-UXZPCIVO.js";import{a as Xt,c as Ke}from"./chunk-XIWZWQEI.js";import{c as ye,d as Pe}from"./chunk-2CGKANOU.js";import{a as k,b as c}from"./chunk-ABNJEAG3.js";import{a as di}from"./chunk-LCMVWKEV.js";import{a as h}from"./chunk-2CNPZJO7.js";import{a as pt}from"./chunk-XLJZJ6NT.js";import{a as A}from"./chunk-V46SS3NM.js";import{c as m}from"./chunk-2DUVGFZF.js";import{d as ee,f as Xe,g as te,h as gt}from"./chunk-TM2O4CMX.js";import{a as et,b as Rt}from"./chunk-SPMNED7O.js";import{A as ri,B as ai,C as si,D as it,E as oi,F as ni,a as bt,b as ft,c as vt,d as yt,e as St,f as Tt,g as At,h as kt,i as Qe,j as Et,k as Lt,l as Ct,m as Mt,n as Ot,o as zt,p as _t,q as jt,r as qt,s as Ut,t as Ft,u as Vt,v as Wt,w as Yt,x as ei,y as ti,z as ii}from"./chunk-IXA6XBA2.js";import{a as O}from"./chunk-DB7X7MVE.js";var ui=m`
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
`;var xe=class extends c{processInnerHtml=!0};xe.rootStyles=ui;var ci=m`
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
`;var we=class extends c{processInnerHtml=!0};we.rootStyles=ci;function I(i,e){if(e.shadowRoot)return;let t=[...i.querySelectorAll("slot")];if(!t.length)return;let r={};t.forEach(a=>{let s=a.getAttribute("name")||O.DEFAULT_SLOT_KEY;r[s]={slot:a,fr:document.createDocumentFragment()}}),e.initChildren.forEach(a=>{let s=O.DEFAULT_SLOT_KEY;a instanceof Element&&a.hasAttribute("slot")&&(s=a.getAttribute("slot"),a.removeAttribute("slot")),r[s]?.fr.appendChild(a)}),Object.values(r).forEach(a=>{if(a.fr.childNodes.length)a.slot.parentNode.replaceChild(a.fr,a.slot);else if(a.slot.childNodes.length){let s=document.createDocumentFragment();s.append(...a.slot.childNodes),a.slot.parentNode.replaceChild(s,a.slot)}else a.slot.remove()})}var mi=m`
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
`;var Rr=0,hi=Object.freeze({value:"collapsed",label:"label",expandLabel:"expand-label",collapseLabel:"collapse-label",collapseEmpty:"collapse-empty",disabled:"disabled",readonly:"readonly"}),N=class extends c{desktopQuery;contentObserver;init$={value:void 0,label:void 0,expandLabel:void 0,collapseLabel:void 0,collapseEmpty:void 0,disabled:void 0,readonly:void 0,expanded:!0,expandedText:"true",sidebarLabel:"",toggleLabel:"",unavailable:!1,contentId:"",set_value:new h({description:"Expand or collapse this sidebar. Returns its value and change flag.",inputSchema:{type:"object",properties:{value:{type:"boolean"}},required:["value"],additionalProperties:!1},execute:({value:e})=>this.commit(e)}),read_value:new h({description:"Read whether this sidebar is expanded.",execute:()=>({value:this.$.expanded})}),toggle:new h({description:"Toggle this sidebar between expanded and collapsed.",execute:()=>this.commit(!this.$.expanded)})};constructor(){super(),this.templateProcessors.add(I)}renderCallback(){this.desktopQuery=matchMedia("(width >= 64rem)"),this.desktopQuery.addEventListener("change",this.refreshLayout);let e=this.attachInternals();e.role="complementary",this.hasAttribute("tabindex")||(this.tabIndex=-1),this.$.contentId=`agui-sidebar-content-${++Rr}`;for(let[t,r]of Object.entries(hi)){let a=()=>{this.refresh(),e.ariaLabel=String(this.$.sidebarLabel)};this.sub(t,a),this.sub(`attribute-${r}`,a)}}refreshLayout=()=>this.refresh();hasContent(e){return[...e.childNodes].some(t=>{if(t.nodeType===Node.TEXT_NODE)return!!t.textContent?.trim();if(!(t instanceof Element)||t.matches("template, script, style"))return!1;let r=getComputedStyle(t);return r.display==="none"||r.visibility==="hidden"||r.visibility==="collapse"?!1:t.matches('input, select, textarea, button, a[href], img, svg, canvas, video, audio, iframe, [contenteditable], [role="progressbar"]')?!0:this.hasContent(t)})}refresh(){let e=!!(this.$.collapseEmpty??this.hasAttribute("collapse-empty"));e&&!this.contentObserver&&(this.contentObserver=new MutationObserver(()=>this.refresh()),this.contentObserver.observe(this.ref.content,{childList:!0,subtree:!0,characterData:!0,attributes:!0,attributeFilter:["hidden","class","style"]}));let t=e&&!this.hasContent(this.ref.content),r=this.$.value??(!this.hasAttribute("collapsed")&&!!this.desktopQuery?.matches);if(typeof r!="boolean")throw new Error("Sidebar value must be a boolean.");r&&=!t;let a=String(this.$.label??this.getAttribute("label")??""),s=r?this.$.collapseLabel??this.getAttribute("collapse-label"):this.$.expandLabel??this.getAttribute("expand-label"),o=t||!!(this.$.disabled??this.hasAttribute("disabled"))||!!(this.$.readonly??this.hasAttribute("readonly"));!r&&this.ref.content.contains(document.activeElement)&&(o||this.ref.toggle.matches(":disabled")?this:this.ref.toggle).focus({preventScroll:!0}),this.set$({expanded:r,expandedText:String(r),sidebarLabel:a,toggleLabel:String(s??a),unavailable:o}),this.dataset.expanded=String(r)}commit(e){if(this.$.unavailable||this.ref.toggle.matches(":disabled"))throw new Error("This sidebar is disabled or read-only.");if(typeof e!="boolean")throw new Error("Sidebar value must be a boolean.");let t=!Object.is(this.$.expanded,e);if(t){this.$.value=e;let r=this.getAttribute("pub-to")?.trim();r&&!Object.is(this.$[r],e)&&(this.$[r]=e),this.announce("change",e)}return{value:e,changed:t}}destroyCallback(){super.destroyCallback(),this.contentObserver?.disconnect(),this.desktopQuery?.removeEventListener("change",this.refreshLayout)}};N.bindAttributes(Object.fromEntries(Object.values(hi).map(i=>[i,`attribute-${i}`])));N.template=bt;N.rootStyles=mi;function pi(i){return i==="true"?!0:i==="false"?!1:i}var gi=m`
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
`;var P=class extends c{init$={label:void 0,active:void 0,blockLabel:"",inactive:!1};constructor(){super(),this.templateProcessors.add(I)}renderCallback(){for(let e of["label","active","attribute-label","attribute-active"])this.sub(e,()=>this.refresh())}refresh(){let e=pi(this.$.active??this.getAttribute("active")??!0);if(e===""&&(e=!0),typeof e!="boolean")throw new TypeError("agui-sidebar-block active must be a boolean.");!e&&this.ref.content.contains(document.activeElement)&&this.ref.heading.focus({preventScroll:!0}),this.set$({blockLabel:String(this.$.label??this.getAttribute("label")??""),inactive:!e}),this.dataset.active=String(e)}};P.bindAttributes({label:"attribute-label",active:"attribute-active"});P.template=ft;P.rootStyles=gi;var bi=m`
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
`;var Se=class extends c{processInnerHtml=!0;renderCallback(){this.hasAttribute("role")||this.setAttribute("role","main"),this.hasAttribute("tabindex")||(this.tabIndex=0)}};Se.rootStyles=bi;var fi=0,vi=Object.freeze(["value","label","disabled"]),K=class extends c{processInnerHtml=!0;ready=!1;buttonId="";init$={value:void 0,label:void 0,disabled:void 0};renderCallback(){this.id||=`agui-tab-panel-${++fi}`,this.buttonId=`agui-tab-trigger-${++fi}`,this.setAttribute("role","tabpanel"),this.setAttribute("aria-labelledby",this.buttonId),this.hasAttribute("tabindex")||(this.tabIndex=0),this.ready=!0;for(let e of vi)this.sub(e,()=>this.refreshOwner()),this.sub(`attribute-${e}`,()=>this.refreshOwner())}get definition(){let e=this.$.value??this.getAttribute("value")??"";if(typeof e!="string")throw new Error("Tab values must be strings.");return{value:e,label:String(this.$.label??this.getAttribute("label")??""),disabled:!!(this.$.disabled??this.hasAttribute("disabled"))}}refreshOwner(){let e=this.parentElement?.closest("agui-tabs");e?.ready&&e.refresh()}destroyCallback(){super.destroyCallback(),this.ready=!1}};K.bindAttributes(Object.fromEntries(vi.map(i=>[i,`attribute-${i}`])));var yi=m`
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
`;var _r=Object.freeze({ArrowLeft:-1,ArrowRight:1}),Dr=Object.freeze({ArrowUp:-1,ArrowDown:1}),xi=Object.freeze(["value","label","orientation","disabled","readonly"]),j=class extends c{componentDescription=()=>JSON.stringify({id:this.id,label:String(this.$.label??this.getAttribute("label")??"")});ready=!1;focusValue="";panelObserver;init$={value:void 0,label:void 0,orientation:void 0,disabled:void 0,readonly:void 0,activeValue:"",buttons:[],listLabel:"",listOrientation:"horizontal",selectTab:e=>this.commit(e),set_value:new h({description:"Select an enabled tab by value. Returns only its effective value and change flag.",inputSchema:{type:"object",properties:{value:{type:"string",minLength:1,maxLength:ee}},required:["value"],additionalProperties:!1},execute:({value:e})=>this.commit(e)}),read_value:new h({description:"Read the effective active tab value, including any local fallback.",execute:()=>({value:this.$.activeValue})})};constructor(){super(),this.templateProcessors.add(I),this.templateProcessors.add(A)}renderCallback(){this.ready=!0,this.ref.list.addEventListener("keydown",this.onKeydown),this.ref.list.addEventListener("focusout",this.onFocusout),this.panelObserver=new MutationObserver(()=>this.refresh()),this.panelObserver.observe(this.ref.panels,{childList:!0});for(let e of xi)this.sub(e,()=>this.refresh()),this.sub(`attribute-${e}`,()=>this.refresh())}get panels(){return[...this.ref.panels.children].filter(e=>e instanceof K&&e.ready)}get unavailable(){return!!(this.$.disabled??this.hasAttribute("disabled"))||!!(this.$.readonly??this.hasAttribute("readonly"))}refresh(){if(!this.ready||!this.isConnected)return;let e=this.panels,t=e.map(d=>d.definition.value);if(t.some(d=>typeof d!="string"||!d.trim()||d.length>ee)||new Set(t).size!==t.length)throw new Error("Tabs require unique nonempty string values within the action size limit.");let r=e.filter(d=>!d.definition.disabled),a=this.$.value??this.getAttribute("value")??"",s=r.find(d=>d.definition.value===a)||r[0],o=s?.definition.value??"",n=this.$.orientation??this.getAttribute("orientation")??"horizontal";if(n!=="horizontal"&&n!=="vertical")throw new Error("Tabs orientation must be horizontal or vertical.");let l=e.some(d=>d!==s&&d.contains(document.activeElement));(this.$.activeValue!==o||!r.some(d=>d.definition.value===this.focusValue))&&(this.focusValue=o),this.set$({activeValue:o,listLabel:String(this.$.label??this.getAttribute("label")??""),listOrientation:n,buttons:e.map(d=>({id:d.buttonId,value:d.definition.value,label:d.definition.label,disabled:this.unavailable||d.definition.disabled,selected:String(d===s),tabIndex:!this.unavailable&&d.definition.value===this.focusValue?0:-1,panelId:d.id}))}),this.dataset.orientation=n,l&&(this.buttons.find(p=>p.value===o&&!p.disabled)||this.ref.list).focus(),this.ref.list.tabIndex=this.unavailable||!r.length?0:-1;for(let d of e)d.hidden=d!==s;this.syncWebMCPTools()}get buttons(){return[...this.ref.list.querySelectorAll('button[role="tab"]')]}commit(e){if(this.unavailable)throw new Error("These tabs are disabled or read-only.");if(!this.panels.find(a=>a.definition.value===e&&!a.definition.disabled)||typeof e!="string")throw new Error("Choose an enabled tab value.");let r=this.$.activeValue!==e;if(r){this.$.value=e;let a=this.getAttribute("pub-to")?.trim();a&&!Object.is(this.$[a],e)&&(this.$[a]=e),this.announce("change",e)}return{value:e,changed:r}}onKeydown=e=>{if(e.defaultPrevented||e.altKey||e.ctrlKey||e.metaKey||this.unavailable)return;let t=this.buttons.filter(l=>!l.disabled),r=t.indexOf(e.target);if(r<0)return;let a=this.$.listOrientation==="vertical",o=(a?Dr:_r)[e.key];!a&&getComputedStyle(this.ref.list).direction==="rtl"&&(o*=-1);let n=e.key==="Home"?0:e.key==="End"?t.length-1:o?(r+o+t.length)%t.length:void 0;n!==void 0&&(e.preventDefault(),this.focusValue=t[n].value,this.refresh(),t[n].focus())};onFocusout=e=>{e.relatedTarget instanceof Node&&this.ref.list.contains(e.relatedTarget)||(this.focusValue=String(this.$.activeValue),this.refresh())};destroyCallback(){super.destroyCallback(),this.ready=!1,this.panelObserver?.disconnect(),this.ref.list.removeEventListener("keydown",this.onKeydown),this.ref.list.removeEventListener("focusout",this.onFocusout)}};j.bindAttributes(Object.fromEntries(xi.map(i=>[i,`attribute-${i}`])));j.template=vt;j.rootStyles=yi;var Te=class extends c{componentDescription=()=>JSON.stringify({tabsId:this.closest("agui-tabs")?.id||"",value:this.$.value,label:this.$.label});init$={id:"",value:"",label:"",disabled:!1,selected:"false",tabIndex:-1,panelId:"",select:new h({description:"Select this tab without returning unrelated application state.",deps:["disabled","label","value"],when:()=>!this.$.disabled,execute:()=>{let e=this.$["^selectTab"];return e(this.$.value)}})}};Te.template=yt;var wi=m`
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
`;var Ae=class extends c{processInnerHtml=!0};Ae.rootStyles=wi;var Si=m`
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
`;var ne=class extends c{processInnerHtml=!0;sizeObserver;spacingTarget;renderCallback(){this.sizeObserver=new ResizeObserver(()=>this.updateSpacing()),this.sizeObserver.observe(this),this.sub("attribute-floating",()=>this.updateSpacing())}updateSpacing(){let e=this.closest("agui-dashboard")||this.nextElementSibling,t=this.closest("agui-viewport")||(e?.localName==="agui-dashboard"?e:void 0);this.spacingTarget!==t&&this.spacingTarget?.style.removeProperty("--agui-header-height"),this.spacingTarget=t instanceof HTMLElement?t:void 0,this.spacingTarget?.style.setProperty("--agui-header-height",`${this.hasAttribute("floating")?this.getBoundingClientRect().height:0}px`)}destroyCallback(){super.destroyCallback(),this.sizeObserver?.disconnect(),this.spacingTarget?.style.removeProperty("--agui-header-height")}};ne.bindAttributes({floating:"attribute-floating"});ne.rootStyles=Si;var Ti=m`
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
`;var ke=class extends c{processInnerHtml=!0;renderCallback(){this.hasAttribute("role")||this.setAttribute("role","contentinfo")}};ke.rootStyles=Ti;var Ai=m`
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
`;var Ee=class extends c{processInnerHtml=!0;renderCallback(){this.setAttribute("role","group"),!this.hasAttribute("aria-label")&&!this.hasAttribute("aria-labelledby")&&this.hasAttribute("label")&&this.setAttribute("aria-label",this.getAttribute("label")||"")}};Ee.rootStyles=Ai;var $e=class extends z{static observedAttributes=[...z.observedAttributes,"type","checked"];constructor(){super(),Object.assign(this.init$,{indeterminate:!1})}render(e,t){super.render(e??(this.getAttribute("type")==="textarea"?Tt:St),t)}renderCallback(){let e=this.ref.control;if(!(e instanceof HTMLInputElement||e instanceof HTMLTextAreaElement))throw new Error("agui-field requires its template control.");xt(this,e,Xe),this.sub("attribute-value",()=>{e.defaultValue=this.getAttribute("value")??"",e instanceof HTMLInputElement&&e.type==="radio"&&this.showValue(this.$.value)}),this.defineAccessor("type",t=>{let r=t||"text";if(e instanceof HTMLTextAreaElement){if(r!=="textarea")throw new Error("Recreate the field to change between textarea and input.");return}if(!gt.includes(r))throw new Error(`Unsupported agui-field input type: ${r}.`);e.type=r}),e instanceof HTMLInputElement&&this.defineAccessor("checked",t=>{e.defaultChecked=t!=null}),super.renderCallback(),this.sub("indeterminate",t=>{e instanceof HTMLInputElement&&(e.indeterminate=!!t)})}};$e.bindAttributes({...te,...Object.fromEntries(Xe.map(i=>[i,`attribute-${i}`]))});var st=Object.freeze(["value","loading"]),ot=new Set([...st,O.BIND_ATTR,O.CTX_NAME_ATTR,O.EL_REF_ATTR,O.USE_TPL_ATTR,"pub-map","slot"]),je=class extends c{control;attributeTarget(e){return ot.has(e.toLowerCase())?void 0:this.control}getAttribute(e){return this.attributeTarget(e)?.getAttribute(e)??super.getAttribute(e)}hasAttribute(e){return this.attributeTarget(e)?.hasAttribute(e)??super.hasAttribute(e)}setAttribute(e,t){let r=this.attributeTarget(e);r?r.setAttribute(e,t):super.setAttribute(e,t)}removeAttribute(e){let t=this.attributeTarget(e);t?t.removeAttribute(e):super.removeAttribute(e)}toggleAttribute(e,t){let r=this.attributeTarget(e);return r?t===void 0?r.toggleAttribute(e):r.toggleAttribute(e,t):t===void 0?super.toggleAttribute(e):super.toggleAttribute(e,t)}};var ki=m`
  @layer components {
    agui-button {
      display: contents;
    }
  }
`;var q=class extends je{disposed=!1;forwardedAttributes;controlObserver;componentDescription=()=>JSON.stringify({id:this.control?.id||"",label:this.control?.getAttribute("aria-label")??this.control?.textContent?.trim()??""});init$={value:void 0,loading:void 0,buttonLoading:!1,buttonBusy:"false",unavailable:!1,activate:new h({description:"Activate this native button, including its form or popover action, without returning application data.",deps:["unavailable"],when:()=>!this.unavailable,execute:()=>this.activate()})};constructor(){super(),this.templateProcessors.add(I)}get actionId(){return this.control?.id||super.actionId}get unavailable(){return this.disposed||!this.isConnected||!!this.$.buttonLoading||!this.control||this.control.matches(":disabled")||this.control.hasAttribute("readonly")||this.control.getAttribute("aria-disabled")==="true"}renderCallback(){this.control=this.ref.control,this.forwardedAttributes=wt(this,this.control,ot),this.control.addEventListener("click",this.blockLoadingClick,!0),this.controlObserver=new MutationObserver(()=>{this.$.unavailable=this.unavailable,this.syncWebMCPTools()}),this.controlObserver.observe(this.control,{attributes:!0,childList:!0,characterData:!0,subtree:!0});let e=()=>{let r=this.$.value??this.getAttribute("value");r==null?this.control?.removeAttribute("value"):this.control?.setAttribute("value",String(r))};this.sub("value",e),this.sub("attribute-value",e);let t=()=>{let r=!!(this.$.loading??this.hasAttribute("loading"));this.$.buttonLoading=r,this.$.buttonBusy=String(r),this.$.unavailable=this.unavailable};this.sub("loading",t),this.sub("attribute-loading",t),this.$.unavailable=this.unavailable}activate(){if(this.unavailable)throw new Error("This button is loading, disabled, read-only, or disconnected.");return this.control?.click(),{activated:!0}}blockLoadingClick=e=>{this.unavailable&&(e.preventDefault(),e.stopImmediatePropagation())};destroyCallback(){super.destroyCallback(),this.disposed=!0,this.forwardedAttributes?.disconnect(),this.controlObserver?.disconnect(),this.control?.removeEventListener("click",this.blockLoadingClick,!0)}};q.bindAttributes(Object.fromEntries(st.map(i=>[i,`attribute-${i}`])));q.template=At;q.rootStyles=ki;var Ei=m`
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
`;var $i=Object.freeze(["value","label","disabled","readonly","aria-label","aria-labelledby"]),L=class extends c{ready=!1;componentDescription=()=>JSON.stringify({id:this.id,label:this.$.navigationLabel});init$={items:[],routes:void 0,value:void 0,label:void 0,disabled:void 0,readonly:void 0,activeValue:"",section:"",sectionName:"",sectionIcon:"",sectionSrc:"",entries:[],navigationLabel:"",navigationLabelledBy:!1,set_value:new h({description:"Select an enabled navigation section and publish its value. Returns the value and change flag.",inputSchema:{type:"object",properties:{value:{type:"string",minLength:1,maxLength:ee}},required:["value"],additionalProperties:!1},execute:({value:e})=>this.commit(e)}),read_value:new h({description:"Read the current navigation section without returning application data.",execute:()=>({value:this.$.activeValue})})};renderCallback(){this.ready=!0,this.sub("items",()=>this.refresh()),this.sub("routes",()=>this.refresh());for(let e of $i)e.startsWith("aria-")||this.sub(e,()=>this.refresh()),this.sub(`attribute-${e}`,()=>this.refresh())}get unavailable(){return!this.ready||!this.isConnected||!!(this.$.disabled??this.hasAttribute("disabled"))||!!(this.$.readonly??this.hasAttribute("readonly"))}get defaultValue(){return""}get currentKind(){return"page"}get items(){let e=this.$.items,t=this.$.routes;if(t!=null){if(typeof t!="object"||Array.isArray(t))throw new TypeError("Navigation routes must be a route map.");e=Object.entries(t).filter(r=>!r[1].error).map(([r,a])=>({value:r,label:a.title??"",icon:a.icon,disabled:a.disabled,src:a.src}))}if(!Array.isArray(e)||e.some(r=>!r||typeof r.value!="string"||!r.value.trim()||r.value.length>ee||typeof r.label!="string"||r.icon!==void 0&&typeof r.icon!="string"||r.src!==void 0&&typeof r.src!="string"||r.disabled!==void 0&&typeof r.disabled!="boolean")||new Set(e.map(r=>r.value)).size!==e.length)throw new TypeError("Navigation items require unique nonempty string values, string labels, and optional icon and disabled fields.");return e}refresh(){if(!this.ready||!this.isConnected)return;let e=this.items,t=this.$.value??this.getAttribute("value")??this.defaultValue;if(typeof t!="string")throw new TypeError("Navigation value must be a string.");let r=e.find(a=>!a.disabled&&a.value===t);this.set$({activeValue:r?.value??"",section:r?.value??"",sectionName:r?.label??"",sectionIcon:r?.icon??"",sectionSrc:r?.src??"",navigationLabel:String(this.$.label??this.getAttribute("label")??this.getAttribute("aria-label")??""),navigationLabelledBy:this.getAttribute("aria-labelledby")||!1,entries:e.map(a=>({value:a.value,label:a.label,icon:a.icon??"",current:a===r?this.currentKind:!1,disabled:this.unavailable||!!a.disabled,select:()=>this.commit(a.value)}))})}commit(e){if(this.unavailable)throw new Error("This navigation is disabled or read-only.");if(typeof e!="string"||!this.items.some(r=>r.value===e&&!r.disabled))throw new Error("Choose an enabled navigation section.");let t=this.$.activeValue!==e;if(t){this.$.value=e;let r=this.getAttribute("pub-to")?.trim();r&&!Object.is(this.$[r],e)&&(this.$[r]=e),this.announce("change",e),this.setAttribute("value",e),this.dispatchEvent(new Event("change",{bubbles:!0}))}return{value:e,changed:t}}destroyCallback(){super.destroyCallback(),this.ready=!1}};L.bindAttributes(Object.fromEntries($i.map(i=>[i,`attribute-${i}`])));L.template=kt;L.rootStyles=Ei;var Ii=m`
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
`;var le=class extends L{render(e=Qe,t){super.render(e,t)}get defaultValue(){return this.items.at(-1)?.value??""}get currentKind(){return"location"}};le.template=Qe;le.rootStyles=Ii;var de=class extends z{constructor(){super(),Object.assign(this.init$,{options:[],placeholder:void 0})}renderCallback(){super.renderCallback(),this.watchControlState("placeholder",()=>this.getAttribute("placeholder")||"",()=>this.renderOptions()),this.sub("options",e=>{if(!Array.isArray(e)||e.some(t=>!t||typeof t.value!="string"||typeof t.label!="string"))throw new Error("agui-select options require string value and label properties.");this.renderOptions()})}renderOptions(){let e=this.control;if(!(e instanceof HTMLSelectElement))return;let t=String(this.$.placeholder??this.getAttribute("placeholder")??""),r=this.$.options,a=document.createDocumentFragment();t&&a.append(new Option(t,""));for(let s of r){let o=new Option(s.label,s.value);o.disabled=!!s.disabled,a.append(o)}e.replaceChildren(a),this.showValue(this.$.value)}commit(e){let t=this.$.options;if(e!==""&&!t.some(r=>r.value===e&&!r.disabled))throw new Error("Choose an enabled option value.");return super.commit(e)}};de.bindAttributes({...te,placeholder:"attribute-placeholder"});de.template=Et;var ue=class extends z{static observedAttributes=[...z.observedAttributes,"checked"];renderCallback(){let e=this.ref.control;this.defineAccessor("checked",t=>{e.defaultChecked=t!=null}),super.renderCallback()}};ue.bindAttributes(te);ue.template=Lt;var Li=Object.freeze(["ready","loading","empty","error"]);var Ci=m`
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
`;var U=class extends c{init$={status:void 0,message:void 0,retryLabel:void 0,stateHidden:!0,stateRole:"status",stateBusy:"false",stateMessage:"",stateRetryLabel:"",retryVisible:!1,stateLoading:!1,retry:new h({description:"Request retry for this error state. This does not claim the request has succeeded.",deps:["retryVisible"],when:()=>this.$.retryVisible===!0,execute:()=>({requested:this.announce("retry")})})};renderCallback(){for(let[e,t]of[["status","status"],["message","message"],["retryLabel","retry-label"]])this.sub(e,()=>this.refresh()),this.sub(`attribute-${t}`,()=>this.refresh())}refresh(){let e=String(this.$.status??this.getAttribute("status")??"ready");if(!Li.includes(e))throw new Error("agui-state status must be ready, loading, empty, or error.");let t=String(this.$.retryLabel??this.getAttribute("retry-label")??"");this.set$({stateHidden:e==="ready",stateRole:e==="error"?"alert":"status",stateBusy:String(e==="loading"),stateLoading:e==="loading",stateMessage:String(this.$.message??this.getAttribute("message")??""),stateRetryLabel:t,retryVisible:e==="error"&&!!t})}};U.bindAttributes({status:"attribute-status",message:"attribute-message","retry-label":"attribute-retry-label"});U.template=Ct;U.rootStyles=Ci;var Mi=m`
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
`;var F=class extends c{init$={label:void 0,progressLabel:"",progressLabelledBy:""};renderCallback(){for(let e of["label","attribute-label","attribute-aria-label","attribute-aria-labelledby"])this.sub(e,this.describe)}describe=()=>{this.set$({progressLabel:this.getAttribute("aria-label")||String(this.$.label??this.getAttribute("label")??""),progressLabelledBy:this.getAttribute("aria-labelledby")||""})}};F.bindAttributes({label:"attribute-label","aria-label":"attribute-aria-label","aria-labelledby":"attribute-aria-labelledby"});F.template=Mt;F.rootStyles=Mi;var Oi=m`
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
`;var zi=Object.freeze(["value","complete","label","aria-label","aria-labelledby"]),V=class extends c{init$={items:[],value:void 0,complete:void 0,label:void 0,texts:{},entries:[],progressLabel:"",progressLabelledBy:"",statusState:"ready",statusMessage:"","+renderInput":()=>[this.$.items,this.$.texts,this.$.value,this.$.complete,this.$.label,...zi.map(e=>this.$[`attribute-${e}`])]};renderCallback(){this.sub("+renderInput",()=>this.refresh())}text(e){return String(this.$.texts?.[e]??"")}refresh(){let e=this.$.items,t=this.$.value??this.getAttribute("value")??"",r=this.$.complete??this.hasAttribute("complete"),a="";!Array.isArray(e)||e.some(n=>!n||typeof n.value!="string"||!n.value.trim()||typeof n.label!="string")||new Set(e.map(n=>n.value)).size!==e.length?a="invalidItems":(typeof t!="string"||typeof r!="boolean"||!r&&t!==""&&!e.some(n=>n.value===t))&&(a="invalidValue");let s=a?[]:e,o=s.findIndex(n=>n.value===t);this.set$({progressLabel:String(this.getAttribute("aria-label")??this.$.label??this.getAttribute("label")??""),progressLabelledBy:this.getAttribute("aria-labelledby")||!1,statusState:a?"error":"ready",statusMessage:this.text(a),entries:s.map((n,l)=>{let d=r||l<o?"completed":l===o?"current":"pending";return{label:n.label,number:String(l+1),state:d,completed:d==="completed",current:d==="current"?"step":!1,statusLabel:this.text(d)}})})}};V.bindAttributes(Object.fromEntries(zi.map(i=>[i,`attribute-${i}`])));V.template=Ot;V.rootStyles=Oi;var Ri=m`
  @layer components {
    agui-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex: none;
      vertical-align: middle;
      overflow: hidden;
      font-family: '${Rt}';
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
`;var B=class extends c{init$={name:void 0,glyph:"",fontReady:!1};renderCallback(){let e=this.attachInternals();e.role="img";let t=()=>{e.ariaHidden=String(!this.getAttribute("aria-label")&&!this.getAttribute("aria-labelledby"))};this.sub("attribute-aria-label",t),this.sub("attribute-aria-labelledby",t),this.sub("name",this.refreshGlyph),this.sub("attribute-name",this.refreshGlyph),_e(this.ownerDocument).then(r=>{this.isConnected&&(this.$.fontReady=r)})}refreshGlyph=()=>{let e=String(this.$.name??this.getAttribute("name")??"");this.$.glyph=Object.hasOwn(et,e)?et[e]:""}};B.bindAttributes({name:"attribute-name","aria-label":"attribute-aria-label","aria-labelledby":"attribute-aria-labelledby"});B.template=zt;B.rootStyles=Ri;var _i=m`
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
`;var Nr=0,Di=Object.freeze({value:"open",label:"label",openLabel:"open-label",closeLabel:"close-label"}),H=class extends c{componentDescription=()=>JSON.stringify({id:this.id,label:String(this.$.dialogLabel)});disposed=!1;init$={value:void 0,label:void 0,openLabel:void 0,closeLabel:void 0,opened:!1,openedText:"false",surfaceId:"",dialogLabel:"",triggerLabel:"",dismissLabel:"",open:new h({description:"Open this modal dialog without saving or discarding draft values.",execute:()=>this.commit(!0)}),close:new h({description:"Close this dialog without saving or discarding draft values.",execute:()=>this.commit(!1)}),read_value:new h({description:"Read whether this dialog is open.",execute:()=>({value:this.$.opened})})};constructor(){super(),this.templateProcessors.add(I)}renderCallback(){this.$.surfaceId=`agui-dialog-surface-${++Nr}`,this.ref.dialog.addEventListener("close",this.onClose);for(let[e,t]of Object.entries(Di))this.sub(e,()=>this.refresh()),this.sub(`attribute-${t}`,()=>this.refresh())}refresh(){if(this.disposed||!this.isConnected)return;let e=this.$.value??this.hasAttribute("open");if(typeof e!="boolean")throw new TypeError("Dialog value must be a boolean.");let t=this.ref.dialog;this.set$({dialogLabel:String(this.$.label??this.getAttribute("label")??""),triggerLabel:String(this.$.openLabel??this.getAttribute("open-label")??""),dismissLabel:String(this.$.closeLabel??this.getAttribute("close-label")??"")}),e&&!t.open?t.showModal():!e&&t.open&&t.close(),this.set$({opened:t.open,openedText:String(t.open)}),this.syncWebMCPTools()}commit(e){let t=!Object.is(this.$.opened,e);if(t){this.$.value=e;let r=this.getAttribute("pub-to")?.trim();r&&!Object.is(this.$[r],e)&&(this.$[r]=e),this.announce("change",e)}return{value:e,changed:t}}onClose=()=>{this.isConnected&&!this.ref.dialog.open&&this.commit(!1)};destroyCallback(){super.destroyCallback(),this.disposed=!0;let e=this.ref.dialog;e.removeEventListener("close",this.onClose),e.open&&e.close()}};H.bindAttributes(Object.fromEntries(Object.values(Di).map(i=>[i,`attribute-${i}`])));H.template=_t;H.rootStyles=_i;var v=(i,e)=>typeof i=="string"&&!!i.trim()&&i.length<=e,S=i=>!!i&&typeof i=="object"&&!Array.isArray(i);function qe(i){if(!Array.isArray(i)||i.length>u.fields||new Set(i.map(e=>e?.key)).size!==i.length||i.some(e=>!S(e)||!/^[a-zA-Z_][\w-]*$/.test(e.key)||e.key.length>u.key||!v(e.label,u.text)||!["text","number","date","boolean","status"].includes(e.type)))throw new Error("invalidFields");for(let e of i)e.options!==void 0&&nt(e.options)}function nt(i){if(!Array.isArray(i)||i.length>u.options||new Set(i.map(e=>e?.value)).size!==i.length||i.some(e=>!S(e)||!v(e.value,u.text)||typeof e.label!="string"||e.label.length>u.text||e.tone!==void 0&&!["info","success","warning","danger"].includes(e.tone)))throw new Error("invalidFields")}function y(i,e){if(!v(e,u.key)||!Array.isArray(i)||i.length>u.rows||i.some(t=>!S(t)||!v(t[e],u.id))||new Set(i.map(t=>t[e])).size!==i.length)throw new Error("invalidRows")}function x(i){if(!Array.isArray(i)||i.length>u.rows||i.some(e=>!v(e,u.id))||new Set(i).size!==i.length)throw new Error("invalidState")}function ce(i){try{new Intl.Collator(i)}catch{throw new Error("invalidState")}}function Ni(i){if(y(i.rows,i.idKey),i.rows.length>R.rows)throw new Error("invalidRows");if(x(i.value),ce(i.locale),!["line","bar","donut"].includes(i.type)||!["none","single","multiple"].includes(i.selection)||!["text","number","date"].includes(i.xType)||!v(i.xKey,u.key)||!v(i.xLabel,u.text))throw new Error("invalidState");if(!Array.isArray(i.series)||!i.series.length||i.series.length>R.series||i.type==="donut"&&i.series.length!==1||new Set(i.series.map(s=>s?.key)).size!==i.series.length)throw new Error("invalidSeries");for(let s of i.series)if(!S(s)||!v(s.key,u.key)||!v(s.valueKey,u.key)||!v(s.label,u.text)||s.color!==void 0&&!De.includes(s.color)||s.format!==void 0&&!["number","currency","percent"].includes(s.format)||s.format==="currency"&&!/^[A-Z]{3}$/.test(s.currency??"")||s.digits!==void 0&&(!Number.isInteger(s.digits)||s.digits<0||s.digits>6)||s.unit!==void 0&&(typeof s.unit!="string"||s.unit.length>u.text))throw new Error("invalidSeries");if(i.type!=="donut"&&i.series.some(s=>(s.format??"number")!==(i.series[0].format??"number")||s.currency!==i.series[0].currency||s.unit!==i.series[0].unit))throw new Error("invalidSeries");let e;try{e=i.series.map(s=>Nt(s,i.locale))}catch{throw new Error("invalidSeries")}let t=i.rows.map(s=>{let o=i.series.map(n=>{let l=s[n.valueKey];if(l==null)return null;if(typeof l!="number"||!Number.isFinite(l)||i.type==="donut"&&l<0)throw new Error("invalidRows");return l});return{id:String(s[i.idKey]),x:Pt(s[i.xKey],i),values:o,formatted:o.map((n,l)=>n===null?"":`${e[l].format(n)}${i.series[l].unit?` ${i.series[l].unit}`:""}`)}}),r=new Set(t.map(s=>s.id)),a=i.selection==="none"?[]:i.value.filter(s=>r.has(s));return i.selection==="single"&&(a=a.slice(0,1)),{state:i,points:t,selected:a,hasData:t.some(s=>s.values.some(o=>o!==null&&(i.type!=="donut"||o>0)))}}function Pi(i,e){x(e);let t=new Set(i.points.map(r=>r.id));if(i.state.selection==="none"||i.state.selection==="single"&&e.length>1||e.some(r=>!t.has(r)))throw new Error("invalidState");return e.slice()}function lt(i){let e=i.stateInput(),t=i.model,r=n=>String(e.texts?.[n]??""),a=i.runtimeError?r(i.runtimeError):"",s=!i.$.runtimeReady||e.loading,o=!t||s||e.disabled||e.readonly||!!e.error||!!i.runtimeError;i.set$({modelValid:!!t,chartLabel:e.label,chartDescription:e.description,dataLabel:r("data"),dataTableId:`${i.id||i.domId}-data`,dataSelectionMode:e.selection,dataLoading:e.loading,dataError:e.error,dataDisabled:o,unavailable:o||e.selection==="none",plotHidden:!t?.hasData||s||!!e.error||!!i.runtimeError,statusState:e.error||i.runtimeError||i.issue?"error":s?"loading":t?.hasData?"ready":"empty",statusMessage:e.error||a||(i.issue?r(i.issue):s?r("loading"):t?.hasData?"":r("empty")),effectiveSelected:t?.selected??[],dataRows:t?.points.map(n=>({id:n.id,x:n.x,...Object.fromEntries(n.formatted.map((l,d)=>[`s${d}`,l]))}))??[],dataColumns:t?[{key:"x",label:e.xLabel,type:"text"},...e.series.map((n,l)=>({key:`s${l}`,label:n.label,type:"text"}))]:[]})}function Ki(i,e,t=0,r=20){let a=i.requireModel();if(!Number.isInteger(t)||t<0||t>R.rows||!Number.isInteger(r)||r<1||r>u.pageSize)throw new Error(i.text("invalidState"));let s=e?a.selected:a.state.loading||a.state.error?[]:a.points,o=[],n={offset:t,nextOffset:null,totalCount:s.length,items:o};for(let l=t;l<Math.min(s.length,t+r);l+=1){let d=s[l],p=typeof d=="string"?d:{id:d.id,x:d.x,values:Object.fromEntries(a.state.series.map((g,f)=>[g.key,d.formatted[f]]))};if(o.push(p),n.nextOffset=l+1<s.length?l+1:null,!(new TextEncoder().encode(JSON.stringify(n)).byteLength<=u.readBytes)){o.pop(),!o.length&&typeof p!="string"&&o.push({id:p.id,truncated:!0}),n.nextOffset=t+o.length<s.length?t+o.length:null;break}}return n}function ji(i){let e=t=>new h({description:t?"Read a bounded page of effective selected record IDs.":"Read bounded formatted chart data, excluding unrelated record fields. Follow nextOffset.",deps:["modelValid"],when:()=>!!i.$.modelValid,inputSchema:{type:"object",properties:{offset:{type:"integer",minimum:0,maximum:R.rows},limit:{type:"integer",minimum:1,maximum:u.pageSize}},additionalProperties:!1},execute:({offset:r,limit:a})=>Ki(i,t,r,a)});return{set_selection:new h({description:"Set source record IDs selected by this chart. Return bounded change/count metadata without records or full selections.",deps:["unavailable"],when:()=>!i.$.unavailable,inputSchema:{type:"object",properties:{ids:{type:"array",maxItems:R.rows,uniqueItems:!0,items:{type:"string",minLength:1,maxLength:u.id}}},required:["ids"],additionalProperties:!1},execute:({ids:t})=>i.setSelection(t)}),read_view:e(!1),read_selection:e(!0)}}var qi;function Ui(){let i=_(Dt);return qi??=import(i),qi}function Fi(i){let e=getComputedStyle(i),t=document.createElement("span");t.hidden=!0,i.append(t);let r=s=>(t.style.color=`var(--agui-${s})`,getComputedStyle(t).color),a={text:r("text"),muted:r("muted"),divider:r("divider"),surface:r("surface"),colors:Object.fromEntries(De.map(s=>[s,r(s)])),font:e.fontFamily,reducedMotion:matchMedia("(prefers-reduced-motion: reduce)").matches};return t.remove(),a}function Vi(i){let e=()=>i.schedulePaint(),t=new ResizeObserver(e);t.observe(i.ref.plot);let r=new MutationObserver(e);for(let s of[i,document.body,document.documentElement])r.observe(s,{attributes:!0,attributeFilter:["class","style","data-theme","data-palette"]});let a=[matchMedia("(prefers-color-scheme: dark)"),matchMedia("(prefers-reduced-motion: reduce)")];for(let s of a)s.addEventListener("change",e);return()=>{t.disconnect(),r.disconnect();for(let s of a)s.removeEventListener("change",e)}}var Bi=m`
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
`;var Pr=0,G=class extends c{domId=`agui-chart-${++Pr}`;componentDescription=()=>JSON.stringify({id:this.id,label:this.$.chartLabel});model;issue;runtimeError;runtime;renderer;stopWatching;disposed=!1;paintFrame=0;init$={rows:[],series:[],value:[],texts:{},...Object.fromEntries(Object.keys(ie).map(e=>[e,void 0])),runtimeReady:!1,unavailable:!0,modelValid:!1,plotHidden:!0,statusMessage:"",statusState:"ready",chartLabel:"",chartDescription:"",dataLabel:"",dataTableId:"",dataSelectionMode:"none",dataLoading:!1,dataError:"",dataDisabled:!0,dataRows:[],dataColumns:[],effectiveSelected:[],selectIds:e=>this.setSelection(e),...ji(this)};renderCallback(){for(let e of["rows","series","value","texts",...Object.keys(ie),...Object.values(ie).map(t=>`attribute-${t}`)])this.sub(e,()=>this.refresh());this.stopWatching=Vi(this),this.loadRuntime()}connectedCallback(){super.connectedCallback(),!(this.disposed||!this.runtime&&!this.runtimeError)&&(this.$.runtimeReady=!!this.runtime,this.refresh())}async loadRuntime(){try{let e=await Ui();if(this.disposed||(this.runtime=e,!this.isConnected))return;this.$.runtimeReady=!0}catch{if(this.disposed)return;this.runtimeError="loadFailed"}this.refresh()}stateInput(){let e=(t,r)=>this.$[t]??this.getAttribute(ie[t])??r;return{rows:this.$.rows,series:this.$.series,value:this.$.value,texts:this.$.texts,type:e("type","line"),selection:e("selection","none"),idKey:e("idKey","id"),xKey:e("xKey","label"),xLabel:e("xLabel",""),xType:e("xType","text"),locale:e("locale",document.documentElement.lang||navigator.language),label:String(e("label","")),description:String(e("description","")),error:String(e("error","")),loading:!!(this.$.loading??this.hasAttribute("loading")),disabled:!!(this.$.disabled??this.hasAttribute("disabled")),readonly:!!(this.$.readonly??this.hasAttribute("readonly"))}}refresh(){if(!(this.disposed||!this.isConnected)){this.issue=void 0;try{this.model=Ni(this.stateInput())}catch(e){this.model=void 0;let t=e instanceof Error?e.message:"";this.issue=t==="invalidRows"||t==="invalidSeries"?t:"invalidState"}lt(this),this.syncWebMCPTools(),this.schedulePaint()}}schedulePaint(){this.paintFrame||this.disposed||!this.isConnected||(this.paintFrame=requestAnimationFrame(()=>{this.paintFrame=0,this.paint()}))}paint(){if(this.disposed||!this.isConnected||!this.runtime||this.runtimeError)return;let e=this.model;if(this.$.plotHidden||!e){this.renderer?.dispose(),this.renderer=void 0;return}let t=this.ref.plot;if(!(!t.clientWidth||!t.clientHeight))try{this.renderer??=this.runtime.createChartRenderer(t,r=>{this.$.unavailable||this.selectPoint(r)}),this.renderer.render(e,Fi(this))}catch{this.renderer?.dispose(),this.renderer=void 0,this.runtimeError="renderFailed",lt(this),this.syncWebMCPTools()}}text(e){return String(this.$.texts?.[e]??"")}requireModel(){if(!this.model)throw new Error(this.text(this.issue??"invalidState"));return this.model}setSelection(e){let t=this.requireModel();if(this.disposed||!this.isConnected||this.$.unavailable)throw new Error(this.text("unavailable"));try{e=Pi(t,e)}catch{throw new Error(this.text("invalidState"))}let r=!w(t.selected.slice().sort(),e.slice().sort());if(r){this.$.value=e;let a=this.getAttribute("pub-to")?.trim();a&&(this.$[a]=e.slice());let s={widgetId:this.id||this.localName,context:this.getAttribute("ctx")?.trim()||null,action:"chart-change",selectedCount:e.length,totalCount:t.points.length};k(this,s)}return{changed:r,selectedCount:this.requireModel().selected.length,totalCount:t.points.length}}selectPoint(e){let t=this.requireModel(),r=new Set(t.state.selection==="single"&&!t.selected.includes(e)?[]:t.selected);return r.has(e)?r.delete(e):r.add(e),this.setSelection(Array.from(r))}destroyCallback(){super.destroyCallback(),this.disposed=!0,cancelAnimationFrame(this.paintFrame),this.stopWatching?.(),this.renderer?.dispose(),this.renderer=void 0}};G.bindAttributes(Object.fromEntries(Object.values(ie).map(i=>[i,`attribute-${i}`])));G.template=jt;G.rootStyles=Bi;function Hi(i){try{qe(i.columns)}catch{throw new Error("invalidColumns")}if(i.columns.some(t=>t.sortable!==void 0&&typeof t.sortable!="boolean"))throw new Error("invalidColumns");if(y(i.rows,i.idKey),x(i.value),i.filteredIds!==null&&x(i.filteredIds),!["none","single","multiple"].includes(i.selection)||!Number.isInteger(i.page)||i.page<1||!Number.isInteger(i.pageSize)||i.pageSize<1||i.pageSize>E.pageSize)throw new Error("invalidState");let e=i.sort;if(e!==null&&(!S(e)||!["ascending","descending"].includes(e.direction)||!i.columns.some(t=>t.key===e.key&&t.sortable)))throw new Error("invalidState");ce(i.locale)}function Ue(i,e){let t=new Set(i.rows.map(a=>String(a[i.idKey]))),r=i.selection==="none"?[]:e.filter(a=>t.has(a));return i.selection==="single"?r.slice(0,1):r}function Fe(i,e){if(i.selection==="none"||!Array.isArray(e)||e.some(r=>typeof r!="string")||new Set(e).size!==e.length||i.selection==="single"&&e.length>1)throw new Error("invalidState");let t=new Set(i.rows.map(r=>String(r[i.idKey])));if(e.some(r=>!t.has(r)))throw new Error("invalidState");return[...e]}function dt(i){Hi(i);let e=i.filteredIds===null?null:new Set(i.filteredIds),t=i.rows.filter(o=>!e||e.has(String(o[i.idKey])));if(i.sort){let o=i.columns.find(d=>d.key===i.sort?.key),n=i.sort.direction==="ascending"?1:-1,l=new Intl.Collator(i.locale,{sensitivity:"base",numeric:!0});t.sort((d,p)=>{let g=ve(d,o),f=ve(p,o);return g===null||f===null?g===f?0:g===null?1:-1:n*(typeof g=="number"&&typeof f=="number"?g-f:l.compare(String(g),String(f)))})}let r=Ue(i,i.value),a=Math.max(1,Math.ceil(t.length/i.pageSize)),s=Math.min(i.page,a);return{state:i,filtered:t,visible:t.slice((s-1)*i.pageSize,s*i.pageSize),selected:r,page:s,pageCount:a}}function Gi(i,e){return Fe(i.state,e)}function Wi(i){if(i.state.selection!=="multiple")throw new Error("invalidState");let e=i.filtered.map(a=>String(a[i.state.idKey])),t=new Set(i.selected),r=e.length>0&&e.every(a=>t.has(a));for(let a of e)r?t.delete(a):t.add(a);return[...t]}function Ji(i,e){let t=i.model,r=!t||e.disabled||e.readonly||e.loading||!!e.error,a=new Set(t?.selected),s=t?.filtered.map(b=>String(b[e.idKey]))??[],o=s.length>0&&s.every(b=>a.has(b)),n=e.selection!=="none",l=b=>String(e.texts?.[b]??""),d=b=>`${i.domId}-${b}`,p=t?e.columns:[],g={unavailable:r,groupName:i.domId,selectionType:e.selection==="single"?"radio":"checkbox"},f={id:"$selection",headingId:d("$selection"),columnKey:"",label:l("selection"),sortable:!1,ariaSort:!1,sortIcon:"sort",selectAll:e.selection==="multiple",selectAllLabel:l("selectAll"),selected:o,mixed:!o&&s.some(b=>a.has(b)),unavailable:r||!s.length};i.set$({unavailable:r,selectionEnabled:n&&!!t,modelValid:!!t,tableLabel:e.label,busyText:String(e.loading),surfaceHidden:!t||e.loading||!!e.error,statusState:e.loading?"loading":e.error||i.issue?"error":t?.filtered.length?"ready":"empty",statusMessage:e.loading?l("loading"):e.error||(i.issue?l(i.issue):t?.filtered.length?"":l("empty")),resultsLabel:l("results"),selectedLabel:l("selected"),pageLabel:l("page"),paginationLabel:l("pagination"),previousLabel:l("previous"),nextLabel:l("next"),totalCount:e.rows?.length??0,filteredCount:t?.filtered.length??0,selectedCount:a.size,effectivePage:t?.page??1,pageCount:t?.pageCount??1,paginationHidden:(t?.pageCount??1)<=1,previousDisabled:r||!t||t.page<=1,nextDisabled:r||!t||t.page>=t.pageCount,headings:[...n?[f]:[],...p.map(b=>({...f,id:b.key,headingId:d(b.key),columnKey:b.key,label:b.label,selectAll:!1,sortable:!!b.sortable,ariaSort:e.sort?.key===b.key?e.sort.direction:!1,sortIcon:e.sort?.key===b.key?e.sort.direction==="ascending"?"expand_less":"expand_more":"sort",unavailable:r}))],bodyRows:(e.loading||e.error?[]:t?.visible??[]).map(b=>{let T=String(b[e.idKey]),ht={...g,id:"$selection",rowId:T,headingId:d("$selection"),columnKey:"",text:"",cellClass:"",tone:!1,isSelection:!0,selected:a.has(T),selectLabel:`${l("selectRow")} ${T}`.trim()};return{id:T,rowId:T,selectionType:g.selectionType,selected:a.has(T),selectable:n&&!r,selectedText:n?String(a.has(T)):!1,tabIndex:n&&!r?0:-1,cells:[...n?[ht]:[],...p.map(D=>({...ht,id:D.key,headingId:d(D.key),columnKey:D.key,text:re(b,D,e),cellClass:D.type==="status"?"agui-chip":"",tone:D.options?.find(zr=>zr.value===b[D.key])?.tone??!1,isSelection:!1,selectionType:"checkbox",groupName:"",selected:!1}))]}})})}function Zi(i,e,t=0,r=20){let a=i.requireModel();if(!Number.isInteger(t)||t<0||!Number.isInteger(r)||r<1||r>E.pageSize)throw new Error(i.text("invalidState"));let s=a.state.loading||a.state.error?[]:a.visible,o=e?a.selected:s,n=Math.min(o.length,t+r),l=[],d={offset:t,nextOffset:null,page:a.page,pageCount:a.pageCount,totalCount:a.state.rows.length,filteredCount:a.filtered.length,selectedCount:a.selected.length,items:l},p=()=>new TextEncoder().encode(JSON.stringify(d)).byteLength;for(let g=t;g<n;g+=1){let f=s[g],b=e?a.selected[g]:{id:String(f[a.state.idKey]),selected:a.selected.includes(String(f[a.state.idKey])),cells:Object.fromEntries(a.state.columns.map(T=>[T.key,re(f,T,a.state)]))};if(l.push(b),d.nextOffset=g+1<o.length?g+1:null,!(p()<=E.readBytes)){l.pop(),!l.length&&typeof b!="string"&&l.push({id:b.id,selected:b.selected,truncated:!0}),d.nextOffset=t+l.length<o.length?t+l.length:null;break}}return d}function Yi(i){let e=(a,s,o)=>new h({description:`Set this table's ${o}. Return bounded change/count metadata, not records or the selection array.`,deps:["unavailable","selectionEnabled"],when:()=>!i.$.unavailable&&(o!=="value"||!!i.$.selectionEnabled),inputSchema:{type:"object",properties:{[a]:s},required:[a],additionalProperties:!1},execute:n=>i.edit(o,n[a])}),t=a=>new h({description:a?"Show the next local table page.":"Show the previous local table page.",deps:[a?"nextDisabled":"previousDisabled"],when:()=>!i.$[a?"nextDisabled":"previousDisabled"],execute:()=>i.edit("page",i.requireModel().page+(a?1:-1))}),r=a=>new h({description:a?"Read a bounded page of effective selected IDs. Follow nextOffset. No records are returned.":"Read a bounded page of currently visible formatted rows. Oversized rows return ID and truncated=true. Follow nextOffset.",deps:["modelValid"],when:()=>!!i.$.modelValid,inputSchema:{type:"object",properties:{offset:{type:"integer",minimum:0,maximum:E.rows},limit:{type:"integer",minimum:1,maximum:E.pageSize}},additionalProperties:!1},execute:({offset:s,limit:o})=>Zi(i,a,s,o)});return{set_selection:e("ids",{type:"array",maxItems:E.rows,uniqueItems:!0,items:{type:"string",minLength:1,maxLength:E.id}},"value"),set_sort:e("sort",{anyOf:[{type:"null"},{type:"object",properties:{key:{type:"string",maxLength:E.key},direction:{enum:["ascending","descending"]}},required:["key","direction"],additionalProperties:!1}]},"sort"),set_page:e("page",{type:"integer",minimum:1,maximum:E.rows},"page"),read_view:r(!1),read_selection:r(!0),previous_page:t(!1),next_page:t(!0)}}var Xi=m`
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
`;var Kr=0,C=class extends c{componentDescription=()=>JSON.stringify({id:this.id,label:this.$.tableLabel});domId=`agui-table-${++Kr}`;model;issue;disposed=!1;lastFilteredIds;init$={rows:[],columns:[],value:[],filteredIds:null,sort:null,texts:{},page:1,...Object.fromEntries(Object.keys(se).map(e=>[e,void 0])),unavailable:!0,modelValid:!1,selectionEnabled:!1,headings:[],bodyRows:[],tableLabel:"",busyText:"false",surfaceHidden:!0,statusMessage:"",statusState:"ready",resultsLabel:"",selectedLabel:"",pageLabel:"",paginationLabel:"",previousLabel:"",nextLabel:"",totalCount:0,filteredCount:0,selectedCount:0,effectivePage:1,pageCount:1,paginationHidden:!0,previousDisabled:!0,nextDisabled:!0,selectRow:(e,t)=>this.selectRow(e,t),sortColumn:e=>this.sortColumn(e),selectFiltered:()=>this.selectFiltered(),...Yi(this)};constructor(){super(),this.templateProcessors.add(A)}renderCallback(){for(let e of["rows","columns","value","filteredIds","sort","texts","page",...Object.keys(se),...Object.values(se).map(t=>`attribute-${t}`)])this.sub(e,()=>this.refresh())}stateInput(){let e=(t,r)=>this.$[t]??this.getAttribute(se[t])??r;return{rows:this.$.rows,columns:this.$.columns,value:this.$.value,filteredIds:this.$.filteredIds,sort:this.$.sort,texts:this.$.texts,page:this.$.page,pageSize:Number(e("pageSize",20)),idKey:e("idKey","id"),selection:e("selection","none"),locale:e("locale",document.documentElement.lang||navigator.language),label:String(e("label","")),error:String(e("error","")),loading:!!(this.$.loading??this.hasAttribute("loading")),disabled:!!(this.$.disabled??this.hasAttribute("disabled")),readonly:!!(this.$.readonly??this.hasAttribute("readonly"))}}refresh(){if(this.disposed)return;let e=this.stateInput();this.issue=void 0;try{if(this.model=dt(e),!w(e.filteredIds,this.lastFilteredIds)&&(this.lastFilteredIds=structuredClone(e.filteredIds),e.page!==1)){this.$.page=1;return}}catch(t){this.model=void 0;let r=t instanceof Error?t.message:"";this.issue=r==="invalidRows"||r==="invalidColumns"?r:"invalidState"}Ji(this,e),this.syncWebMCPTools()}text(e){return String(this.$.texts?.[e]??"")}requireModel(){if(!this.model)throw new Error(this.text(this.issue??"invalidState"));return this.model}edit(e,t){let r=this.requireModel();if(this.$.unavailable||this.disposed)throw new Error(this.text("unavailable"));if(e==="value")try{t=Gi(r,t)}catch{throw new Error(this.text("invalidState"))}let a={...r.state,[e]:t};try{dt(a)}catch{throw new Error(this.text("invalidState"))}if(e==="page"&&Number(t)>r.pageCount)throw new Error(this.text("invalidState"));let s=e==="value"?r.selected:e==="page"?r.page:r.state[e],o=e==="value"?!w([...s].sort(),[...t].sort()):!w(s,t);if(o){e==="sort"&&(this.$.page=1),this.$[e]=structuredClone(t);let l=e==="value"?"pub-to":`${e}-pub-to`,d=e==="page"?"":this.getAttribute(l)?.trim();d&&(this.$[d]=structuredClone(t));let p=this.requireModel(),g={widgetId:this.id||this.localName,context:this.getAttribute("ctx")?.trim()||null,action:"table-change",property:e,selectedCount:p.selected.length,filteredCount:p.filtered.length};k(this,g)}let n=this.requireModel();return{changed:o,selectedCount:n.selected.length,filteredCount:n.filtered.length,page:n.page}}selectRow(e,t){let r=this.requireModel();if(typeof t!="boolean"||!r.state.rows.some(s=>s[r.state.idKey]===e))throw new Error(this.text("invalidState"));let a=new Set(r.state.selection==="single"&&t?[]:r.selected);return t?a.add(e):a.delete(e),this.edit("value",[...a])}selectFiltered(){return this.edit("value",Wi(this.requireModel()))}sortColumn(e){let t=this.requireModel().state.sort;return this.edit("sort",t?.key!==e?{key:e,direction:"ascending"}:t.direction==="ascending"?{key:e,direction:"descending"}:null)}destroyCallback(){super.destroyCallback(),this.disposed=!0}};C.bindAttributes(Object.fromEntries(Object.values(se).map(i=>[i,`attribute-${i}`])));C.template=qt;C.rootStyles=Xi;var me=class extends C{edit(e,t){if(e!=="value")return super.edit(e,t);let r=this.$["^selectIds"],a=r(t),s=this.requireModel();return{changed:a.changed,selectedCount:a.selectedCount,filteredCount:s.filtered.length,page:s.page}}};var Ve=class extends me{};function er(i){return typeof i=="number"&&Number.isFinite(i)&&Math.abs(i)<=$.latitude}function tr(i){return typeof i=="number"&&Number.isFinite(i)&&Math.abs(i)<=180}function ut(i){if(!S(i)||!Array.isArray(i.center)||i.center.length!==2||!er(i.center[0])||!tr(i.center[1])||!Number.isInteger(i.zoom)||i.zoom<0||i.zoom>$.zoom)throw new Error("invalidState")}function Qi(i){try{let e=new URL(i);return e.protocol==="https:"&&!e.username&&!e.password&&!e.hash}catch{return!1}}function jr(i){if(i!==null&&(!S(i)||!v(i.url,2048)||!Qi(i.url)||!v(i.attribution,u.text)||i.attributionUrl!==void 0&&!Qi(i.attributionUrl)||!["{z}","{x}","{y}"].every(e=>i.url.includes(e))||/[{}]/.test(i.url.replace(/\{[zxy]\}/g,""))||!Number.isInteger(i.minZoom??0)||!Number.isInteger(i.maxZoom??19)||(i.minZoom??0)<0||(i.maxZoom??19)>$.zoom||(i.minZoom??0)>(i.maxZoom??19)))throw new Error("invalidTiles")}function ir(i){if(y(i.rows,i.idKey),x(i.value),ut(i.view),jr(i.tiles),i.rows.length>$.rows)throw new Error("invalidRows");if(!["none","single","multiple"].includes(i.selection)||![i.latitudeKey,i.longitudeKey,i.labelKey].every(a=>v(a,u.key)))throw new Error("invalidState");let e=i.rows.filter(a=>er(a[i.latitudeKey])&&tr(a[i.longitudeKey])).map(a=>({id:String(a[i.idKey]),label:String(a[i.labelKey]??a[i.idKey]),latitude:a[i.latitudeKey],longitude:a[i.longitudeKey]})),t=new Set(e.map(a=>a.id)),r=i.selection==="none"?[]:i.value.filter(a=>t.has(a));return{state:i,points:e,selected:i.selection==="single"?r.slice(0,1):r,skippedCount:i.rows.length-e.length}}function rr(i,e){x(e);let t=new Set(i.points.map(r=>r.id));if(i.state.selection==="none"||i.state.selection==="single"&&e.length>1||e.some(r=>!t.has(r)))throw new Error("invalidState");return e.slice()}function he(i){let e=i.stateInput(),t=i.model,r=o=>String(e.texts?.[o]??""),a=!i.$.runtimeReady||e.loading,s=!t||a||!i.$.rendererReady||e.disabled||e.readonly||!!e.error||!!i.runtimeError;i.set$({modelValid:!!t,viewReady:!!t&&!a&&!!i.$.rendererReady&&!e.error&&!i.runtimeError,mapLabel:e.label,mapDescription:e.description,attribution:t?.state.tiles?.attribution??"",attributionUrl:t?.state.tiles?.attributionUrl??"",skippedCount:t?.skippedCount??0,skippedLabel:r("skipped"),fitLabel:r("fit"),zoomInLabel:r("zoomIn"),zoomOutLabel:r("zoomOut"),dataLabel:r("data"),dataTableId:`${i.id||i.domId}-data`,dataSelectionMode:e.selection,dataDisabled:s,unavailable:s,selectionUnavailable:s||e.selection==="none",fitUnavailable:s||!t?.points.length,mapHidden:!t||a||!!e.error||!!i.runtimeError,statusState:e.error||i.runtimeError||i.issue?"error":a?"loading":i.tileError?"error":t?.points.length?"ready":"empty",statusMessage:e.error||(i.runtimeError?r(i.runtimeError):i.issue?r(i.issue):a?r("loading"):i.tileError?r("tileFailed"):t?.points.length?"":r("empty")),effectiveSelected:t?.selected??[],dataRows:t?.points.map(o=>({id:o.id,label:o.label,latitude:o.latitude,longitude:o.longitude}))??[],dataColumns:[{key:"label",label:r("point"),type:"text"},{key:"latitude",label:r("latitude"),type:"number"},{key:"longitude",label:r("longitude"),type:"number"}]})}function ar(i,e=0,t=20){if(!Number.isInteger(e)||e<0||e>$.rows||!Number.isInteger(t)||t<1||t>u.pageSize||!i.renderer)throw new Error(i.text("unavailable"));i.paint();let r=i.requireModel(),a=i.renderer.visibleIds(),s={view:i.renderer.view(),selectedCount:r.selected.length,skippedCount:r.skippedCount,totalCount:a.length,offset:e,items:[],nextOffset:null};for(let o of a.slice(e,e+t))if(s.items.push(o),s.nextOffset=e+s.items.length<a.length?e+s.items.length:null,!(new TextEncoder().encode(JSON.stringify(s)).byteLength<=u.readBytes)){s.items.pop(),s.nextOffset=e+s.items.length;break}return s}function sr(i){return{set_selection:new h({description:"Select valid marker source IDs without editing records.",deps:["selectionUnavailable"],when:()=>!i.$.selectionUnavailable,inputSchema:{type:"object",properties:{ids:{type:"array",maxItems:$.rows,uniqueItems:!0,items:{type:"string",minLength:1,maxLength:u.id}}},required:["ids"],additionalProperties:!1},execute:({ids:e})=>i.setSelection(e)}),set_view:new h({description:"Set map center and zoom; publish only a changed viewport.",deps:["unavailable"],when:()=>!i.$.unavailable,inputSchema:{type:"object",properties:{center:{type:"array",minItems:2,maxItems:2,items:{type:"number",minimum:-180,maximum:180}},zoom:{type:"integer",minimum:0,maximum:$.zoom}},required:["center","zoom"],additionalProperties:!1},execute:({center:e,zoom:t})=>i.setView({center:e,zoom:t})}),fit_records:new h({description:"Fit the viewport to all records with valid coordinates.",deps:["fitUnavailable"],when:()=>!i.$.fitUnavailable,execute:()=>i.fitRecords()}),read_view:new h({description:"Read the viewport, skipped count, and a bounded page of visible marker IDs. Follow nextOffset.",deps:["viewReady","mapLabel"],when:()=>!!i.$.viewReady,inputSchema:{type:"object",properties:{offset:{type:"integer",minimum:0,maximum:$.rows},limit:{type:"integer",minimum:1,maximum:u.pageSize}},additionalProperties:!1},execute:({offset:e,limit:t})=>ar(i,e,t)})}}var or;function nr(){let i=_(Bt);return or??=Promise.all([import(i),fetch(_(Ht)).then(async e=>{if(!e.ok)throw new Error;let t=new CSSStyleSheet,r=(await e.text()).replaceAll("url(images/",`url(${_(Gt)}`);t.replaceSync(`@layer base { ${r} }`),document.adoptedStyleSheets=[...document.adoptedStyleSheets,t]})]).then(([e])=>e),or}var lr=m`
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
`;var qr=0,W=class extends c{domId=`agui-map-${++qr}`;componentDescription=()=>JSON.stringify({id:this.id,label:this.$.mapLabel});model;issue;runtimeError;runtime;renderer;resizeObserver;disposed=!1;paintFrame=0;tileError=!1;init$={rows:[],value:[],view:{center:[0,0],zoom:2},tiles:null,texts:{},...Object.fromEntries(Object.keys(oe).map(e=>[e,void 0])),runtimeReady:!1,rendererReady:!1,viewReady:!1,unavailable:!0,selectionUnavailable:!0,fitUnavailable:!0,modelValid:!1,mapHidden:!0,statusMessage:"",statusState:"ready",mapLabel:"",mapDescription:"",attribution:"",attributionUrl:"",skippedCount:0,skippedLabel:"",fitLabel:"",zoomInLabel:"",zoomOutLabel:"",dataLabel:"",dataTableId:"",dataSelectionMode:"none",dataDisabled:!0,dataRows:[],dataColumns:[],effectiveSelected:[],selectIds:e=>this.setSelection(e),onFit:()=>this.fitRecords(),onZoomIn:()=>this.zoom(1),onZoomOut:()=>this.zoom(-1),...sr(this)};renderCallback(){for(let e of["rows","value","view","tiles","texts",...Object.keys(oe),...Object.values(oe).map(t=>`attribute-${t}`)])this.sub(e,()=>this.refresh());this.resizeObserver=new ResizeObserver(()=>this.schedulePaint()),this.resizeObserver.observe(this.ref.canvas),this.loadRuntime()}connectedCallback(){super.connectedCallback(),!(this.disposed||!this.runtime&&!this.runtimeError)&&(this.$.runtimeReady=!!this.runtime,this.refresh())}async loadRuntime(){try{let e=await nr();if(this.disposed||(this.runtime=e,!this.isConnected))return;this.$.runtimeReady=!0}catch{if(this.disposed)return;this.runtimeError="loadFailed"}this.refresh()}stateInput(){let e=(t,r)=>this.$[t]??this.getAttribute(oe[t])??r;return{rows:this.$.rows,value:this.$.value,view:this.$.view,tiles:this.$.tiles,texts:this.$.texts,selection:e("selection","multiple"),idKey:e("idKey","id"),latitudeKey:e("latitudeKey","latitude"),longitudeKey:e("longitudeKey","longitude"),labelKey:e("labelKey","label"),label:String(e("label","")),description:String(e("description","")),error:String(e("error","")),loading:!!(this.$.loading??this.hasAttribute("loading")),disabled:!!(this.$.disabled??this.hasAttribute("disabled")),readonly:!!(this.$.readonly??this.hasAttribute("readonly"))}}refresh(){if(!(this.disposed||!this.isConnected)){this.issue=void 0;try{this.model=ir(this.stateInput())}catch(e){this.model=void 0;let t=e instanceof Error?e.message:"";this.issue=t==="invalidRows"||t==="invalidTiles"?t:"invalidState"}he(this),this.schedulePaint()}}schedulePaint(){this.paintFrame||this.disposed||!this.isConnected||(this.paintFrame=requestAnimationFrame(()=>{this.paintFrame=0,this.paint()}))}paint(){if(this.disposed||!this.isConnected||!this.runtime||this.runtimeError)return;if(this.$.mapHidden||!this.model){this.renderer?.dispose(),this.renderer=void 0,this.$.rendererReady=!1,he(this);return}let e=this.ref.canvas;if(!(!e.clientWidth||!e.clientHeight))try{this.renderer??=this.runtime.createMapRenderer(e,{select:t=>{!this.disposed&&this.isConnected&&!this.$.selectionUnavailable&&this.selectPoint(t)},view:t=>{!this.disposed&&this.isConnected&&!this.$.unavailable&&this.setView(t)},tileError:t=>{this.disposed||(this.tileError=t,he(this))}}),this.$.rendererReady=!0,he(this),this.renderer.render(this.model,!!this.$.unavailable)}catch{this.renderer?.dispose(),this.renderer=void 0,this.$.rendererReady=!1,this.runtimeError="renderFailed",he(this)}}text(e){return String(this.$.texts?.[e]??"")}requireModel(){if(!this.model)throw new Error(this.text(this.issue??"invalidState"));return this.model}assertAvailable(e=!1){if(this.disposed||!this.isConnected||this.$.unavailable||e&&this.$.selectionUnavailable)throw new Error(this.text("unavailable"))}publish(e,t){this.$[e]=structuredClone(t);let r=this.getAttribute(e==="value"?"pub-to":"view-pub-to")?.trim();r&&(this.$[r]=structuredClone(t)),k(this,{widgetId:this.id||this.localName,context:this.getAttribute("ctx")?.trim()||null,action:e==="value"?"map-selection-change":"map-view-change",selectedCount:this.requireModel().selected.length,totalCount:this.requireModel().points.length})}setSelection(e){this.assertAvailable(!0);let t=this.requireModel();try{e=rr(t,e)}catch{throw new Error(this.text("invalidState"))}let r=!w(t.selected.slice().sort(),e.slice().sort());return r&&this.publish("value",e),{changed:r,selectedCount:this.requireModel().selected.length,totalCount:t.points.length}}selectPoint(e){let t=this.requireModel(),r=new Set(t.state.selection==="single"&&!t.selected.includes(e)?[]:t.selected);return r.has(e)?r.delete(e):r.add(e),this.setSelection(Array.from(r))}setView(e){this.assertAvailable();try{ut(e)}catch{throw new Error(this.text("invalidState"))}let t=this.requireModel().state.view,r=t.zoom!==e.zoom||e.center.some((a,s)=>Math.abs(a-t.center[s])>1e-7);return r&&this.publish("view",e),{changed:r,view:structuredClone(this.requireModel().state.view)}}fitRecords(){this.assertAvailable(),this.paint();let e=this.renderer?.fitView();if(!e)throw new Error(this.text("unavailable"));return this.setView(e)}zoom(e){this.assertAvailable(),this.paint(),this.renderer?.zoom(e)}destroyCallback(){super.destroyCallback(),this.disposed=!0,cancelAnimationFrame(this.paintFrame),this.resizeObserver?.disconnect(),this.renderer?.dispose(),this.renderer=void 0}};W.bindAttributes(Object.fromEntries(Object.values(oe).map(i=>[i,`attribute-${i}`])));W.template=Wt;W.rootStyles=lr;var Be=class extends me{};function dr(i,e,t){return Zt(i,e,ye,t)}var Ur=["string","comment","attr","attribute","function","variable","title","property","selector-class","keyword","tag","name","number","params","literal","type","built_in","meta","regexp","symbol"],ur=Ur.map((i,e)=>`
  .agui-markdown-content pre code .hljs-${i} {
    color: var(--agui-code-${i}, light-dark(hsl(${e*150}deg 85% 34%), hsl(${e*150}deg 85% 74%)));
  }
`).join(`
`);var cr=m`
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
    ${ur}
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
`;var Fr=0,J=class extends c{headingPrefix=`agui-md-${++Fr}`;runtime;loadFailed=!1;disposed=!1;revision=0;scheduled=!1;sourceUrl="";sourceBaseUrl="";sourceValue="";sourceIssue="";sourceLoading=!1;sourceController;init$={value:"",extensions:!0,texts:{},label:void 0,src:void 0,loading:void 0,error:void 0,statusMessage:"",statusState:"ready",documentLabel:"",busy:!1,contentHidden:!0};renderCallback(){for(let e of["value","extensions","texts",...Object.keys(Pe),...Object.values(Pe).map(t=>`attribute-${t}`)])this.sub(e,()=>this.refresh());this.loadRuntime()}connectedCallback(){super.connectedCallback(),(this.runtime||this.loadFailed)&&this.refresh()}disconnectedCallback(){super.disconnectedCallback(),this.stopSource()}async loadRuntime(){try{let e=await Jt();if(this.disposed)return;this.runtime=e}catch{if(this.disposed)return;this.loadFailed=!0}this.refresh()}text(e){return String(this.$.texts?.[e]??"")}refresh(){this.revision+=1,!(this.disposed||!this.isConnected||this.scheduled)&&(this.scheduled=!0,queueMicrotask(()=>{this.scheduled=!1,!this.disposed&&this.isConnected&&this.renderDocument(this.revision)}))}stopSource(){this.sourceController?.abort(),this.sourceController=void 0,this.sourceUrl="",this.sourceBaseUrl="",this.sourceValue="",this.sourceIssue="",this.sourceLoading=!1}async loadSource(e){this.stopSource(),this.sourceUrl=e,this.sourceLoading=!0;let t=new AbortController;this.sourceController=t;try{let r=await dr(e,t.signal,window.location.href);if(this.disposed||this.sourceController!==t)return;this.sourceValue=r.text,this.sourceBaseUrl=r.url}catch(r){if(this.disposed||this.sourceController!==t)return;this.sourceIssue=r instanceof Error&&r.message==="inputTooLarge"?"inputTooLarge":"fetchFailed"}this.sourceLoading=!1,this.refresh()}readSource(){let e=this.$.src??this.getAttribute("src")??"";if(typeof e!="string")return this.stopSource(),{value:"",issue:"invalidSrc",loading:!1};if(!e.trim())return this.stopSource(),{value:this.$.value,issue:"",loading:!1};let t;try{t=tt(e,document.baseURI)}catch{return this.stopSource(),{value:"",issue:"invalidSrc",loading:!1}}return t!==this.sourceUrl&&this.loadSource(t),{value:this.sourceValue,issue:this.sourceIssue,loading:this.sourceLoading}}async renderDocument(e){let t=this.readSource(),r=t.value,a=String(this.$.error??this.getAttribute("error")??""),s=t.loading||!!(this.$.loading??this.hasAttribute("loading")),o=t.issue||(typeof r!="string"||typeof this.$.extensions!="boolean"?"invalidValue":r.length>ye.inputBytes||new TextEncoder().encode(r).byteLength>ye.inputBytes?"inputTooLarge":r.trim()?this.loadFailed?"loadFailed":"":"empty"),n=!a&&(s||!o&&!this.runtime);if(this.ref.body.replaceChildren(),this.set$({documentLabel:String(this.$.label??this.getAttribute("label")??""),contentHidden:!0,busy:n,statusState:a?"error":s?"loading":o?o==="empty"?"empty":"error":n?"loading":"ready",statusMessage:a||this.text(s?"loading":o||(n?"loading":""))}),!(o||a||s||!this.runtime)){this.set$({busy:!0,statusState:"loading",statusMessage:this.text("loading")});try{let l=await this.runtime.renderMarkdown(String(r),this.headingPrefix,this.sourceBaseUrl||document.baseURI,this.$.extensions===!0);if(this.disposed||!this.isConnected||e!==this.revision)return;this.ref.body.replaceChildren(l),this.set$({busy:!1,contentHidden:!1,statusState:"ready",statusMessage:""})}catch(l){if(this.disposed||!this.isConnected||e!==this.revision)return;let d=l instanceof Error&&["loadFailed","outputTooLarge"].includes(l.message)?l.message:"renderFailed";this.set$({busy:!1,statusMessage:this.text(d),statusState:"error"})}}}destroyCallback(){super.destroyCallback(),this.stopSource(),this.disposed=!0,this.revision+=1}};J.bindAttributes(Object.fromEntries(Object.values(Pe).map(i=>[i,`attribute-${i}`])));J.template=Yt;J.rootStyles=cr;var mr;function hr(){let i=_(Xt);return mr??=import(i),mr}var pr=m`
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
`;var Vr=0,Z=class extends c{svgPrefix=`agui-diagram-${++Vr}-`;runtime;disposed=!1;loadFailed=!1;scheduled=!1;revision=0;init$={value:"",label:void 0,description:void 0,loading:void 0,error:void 0,texts:{},diagramLabel:"",diagramDescription:"",statusState:"ready",statusMessage:"",busyText:"false",plotHidden:!0,sourceLabel:"",sourceText:"",hasSource:!1};renderCallback(){for(let e of["value","texts",...Ke,...Ke.map(t=>`attribute-${t}`)])this.sub(e,()=>this.refresh());this.loadRuntime()}connectedCallback(){super.connectedCallback(),(this.runtime||this.loadFailed)&&this.refresh()}disconnectedCallback(){this.revision+=1,super.disconnectedCallback()}async loadRuntime(){try{let e=await hr();if(this.disposed)return;this.runtime=e}catch{if(this.disposed)return;this.loadFailed=!0}this.refresh()}text(e){let t=this.$.texts;return String(t?.[e]??"")}refresh(){this.revision+=1,!(this.disposed||!this.isConnected||this.scheduled)&&(this.scheduled=!0,queueMicrotask(()=>{this.scheduled=!1,!this.disposed&&this.isConnected&&this.draw(this.revision)}))}async draw(e){let t=this.$.value,r=Qt(t),a=String(this.$.error??this.getAttribute("error")??""),s=!!(this.$.loading??this.hasAttribute("loading")),o=!a&&(s||!r&&!this.runtime&&!this.loadFailed),n=r||(this.loadFailed?"loadFailed":"");if(this.ref.plot.replaceChildren(),this.set$({diagramLabel:String(this.$.label??this.getAttribute("label")??""),diagramDescription:String(this.$.description??this.getAttribute("description")??""),sourceLabel:this.text("source"),sourceText:!r||r==="empty"?String(t):"",hasSource:!r,plotHidden:!0,busyText:String(o),statusState:a?"error":o?"loading":n?n==="empty"?"empty":"error":"ready",statusMessage:a||this.text(o?"loading":n)}),!(r||a||s||!this.runtime))try{let l=await this.runtime.renderDiagram(String(t),this.svgPrefix);if(this.disposed||!this.isConnected||e!==this.revision)return;this.ref.plot.replaceChildren(l),this.set$({plotHidden:!1,busyText:"false",statusState:"ready",statusMessage:""})}catch(l){if(this.disposed||!this.isConnected||e!==this.revision)return;let d=l instanceof Error?l.message:"";this.set$({busyText:"false",statusState:"error",statusMessage:this.text(["invalidSource","unsupported","inputTooLarge","outputTooLarge","limitExceeded"].includes(d)?d:"renderFailed")})}}destroyCallback(){super.destroyCallback(),this.disposed=!0,this.revision+=1}};Z.bindAttributes(Object.fromEntries(Ke.map(i=>[i,`attribute-${i}`])));Z.template=ei;Z.rootStyles=pr;var pe=Object.freeze({idKey:"id-key",statusKey:"status-key",titleKey:"title-key",descriptionKey:"description-key",label:"label",disabled:"disabled",readonly:"readonly",loading:"loading",error:"error"});function gr(i){if(y(i.value,i.idKey),!v(i.statusKey,u.key)||i.statusKey===i.idKey||!v(i.titleKey,u.key)||typeof i.descriptionKey!="string"||i.descriptionKey.length>u.key)throw new Error("invalidState");try{nt(i.columns)}catch{throw new Error("invalidColumns")}if(!i.columns.length||i.columns.length>u.fields||i.columns.some(s=>!v(s.value,u.id)||!v(s.label,u.text)||s.disabled!==void 0&&typeof s.disabled!="boolean"))throw new Error("invalidColumns");let e=new Set(i.columns.map(s=>s.value)),t=i.columns.map(s=>({id:`status:${s.value}`,status:s.value,label:s.label,tone:s.tone,rows:[]})),r=new Map(t.map(s=>[s.status,s])),a=[];for(let s of i.value){let o=s[i.statusKey];typeof o=="string"&&e.has(o)?r.get(o)?.rows.push(s):a.push(s)}return a.length&&t.push({id:"unassigned",status:null,label:String(i.texts?.unassigned??""),rows:a}),{state:i,groups:t}}function br(i,e,t){let r=i.state,a=r.value.find(o=>o[r.idKey]===e);if(!a||!r.columns.some(o=>o.value===t&&!o.disabled))throw new Error("invalidState");let s=a[r.statusKey]!==t;return{changed:s,value:s?r.value.map(o=>o===a?{...o,[r.statusKey]:t}:o):r.value}}function ge(i){return typeof i=="string"||typeof i=="boolean"||typeof i=="number"&&Number.isFinite(i)?String(i):""}function fr(i,e){let t=i.model,r=o=>String(e.texts?.[o]??""),a=!t||e.disabled||e.readonly||e.loading||!!e.error||!e.columns.some(o=>!o.disabled),s=!t||e.loading||!!e.error;i.set$({unavailable:a,modelValid:!!t,boardLabel:e.label,moveHint:r("moveHint"),busyText:String(e.loading),surfaceHidden:s,statusState:e.loading?"loading":e.error||i.issue?"error":e.value.length?"ready":"empty",statusMessage:e.loading?r("loading"):e.error||(i.issue?r(i.issue):e.value.length?"":r("empty")),columnItems:(s?[]:t?.groups??[]).map(o=>({id:o.id,statusValue:o.status??!1,unassigned:o.status===null?"true":!1,label:o.label,tone:o.tone??!1,count:o.rows.length,countLabel:r("items"),empty:!o.rows.length,emptyLabel:r("emptyColumn"),cards:o.rows.map(n=>({id:String(n[e.idKey]),recordId:String(n[e.idKey]),title:ge(n[e.titleKey])||r("untitled"),description:e.descriptionKey?ge(n[e.descriptionKey]):"",moveHint:r("moveHint"),tabIndex:a?-1:0,disabledText:String(a),unavailable:a,unavailableMessage:r("unavailable")}))}))})}function vr(i,e,t=0,r=20){let a=i.requireModel(),s=a.state;if(!Number.isInteger(t)||t<0||t>u.rows||!Number.isInteger(r)||r<1||r>u.pageSize||e!==void 0&&e!==""&&!s.columns.some(p=>p.value===e))throw new Error(i.text("invalidState"));let o=e===void 0?s.value:a.groups.find(p=>p.status===(e||null))?.rows??[];(s.loading||s.error)&&(o=[]);let n=[],l={offset:t,nextOffset:null,totalCount:s.value.length,matchingCount:o.length,items:n},d=()=>new TextEncoder().encode(JSON.stringify(l)).byteLength;for(let p=t;p<Math.min(o.length,t+r);p+=1){let g=o[p],f=g[s.statusKey],b={id:String(g[s.idKey]),title:ge(g[s.titleKey])||i.text("untitled"),description:s.descriptionKey?ge(g[s.descriptionKey]):"",status:typeof f=="string"?f:null,unassigned:!s.columns.some(T=>T.value===f)};if(n.push(b),l.nextOffset=p+1<o.length?p+1:null,!(d()<=u.readBytes)){n.pop(),n.length||n.push({id:b.id,truncated:!0}),l.nextOffset=t+n.length<o.length?t+n.length:null;break}}return l}function yr(i){return{move_item:new h({description:"Move one record to an enabled status column. Preserve other fields and record order. Return bounded ID, status, and change/count metadata.",deps:["unavailable"],when:()=>!i.$.unavailable,inputSchema:{type:"object",properties:{id:{type:"string",minLength:1,maxLength:u.id},status:{type:"string",minLength:1,maxLength:u.id}},required:["id","status"],additionalProperties:!1},execute:({id:e,status:t})=>i.moveItem(e,t)}),read_view:new h({description:"Read a bounded page of card IDs, titles, descriptions, and statuses. Optional status selects a column; empty status selects unassigned cards. Follow nextOffset.",deps:["modelValid"],when:()=>!!i.$.modelValid,inputSchema:{type:"object",properties:{status:{type:"string",maxLength:u.id},offset:{type:"integer",minimum:0,maximum:u.rows},limit:{type:"integer",minimum:1,maximum:u.pageSize}},additionalProperties:!1},execute:({status:e,offset:t,limit:r})=>vr(i,e,t,r)})}}var xr=m`
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
`;var wr="application/x-symbiote-agui-kanban",He=class{drag;target;constructor(e){this.board=e,this.handlers={dragstart:this.onStart,dragover:this.onOver,dragleave:this.onLeave,drop:this.onDrop,dragend:this.cancel,keydown:this.onKey};for(let[t,r]of Object.entries(this.handlers))e.addEventListener(t,r)}element(e,t){let r=e.target instanceof Element?e.target.closest(t):null;return r instanceof HTMLElement&&r.closest("agui-kanban")===this.board?r:void 0}onStart=e=>{let t=this.element(e,".agui-kanban-card"),r=e.dataTransfer;if(!t||this.board.$.unavailable||!r){e.preventDefault();return}let a=t.dataset.recordId;if(!a){e.preventDefault();return}this.cancel(),this.drag={id:a,element:t},r.effectAllowed="move",r.setData(wr,a),t.setAttribute("data-dragging",""),t.focus()};destination(e){let t=this.element(e,".agui-kanban-column"),r=t?.dataset.status;return t&&r&&this.board.model?.state.columns.some(a=>a.value===r&&!a.disabled)?t:void 0}onOver=e=>{if(!this.drag||this.board.$.unavailable)return;let t=this.destination(e);this.target?.removeAttribute("data-drop-target"),this.target=t;let r=e.dataTransfer;r&&(r.dropEffect=t?"move":"none"),t&&(e.preventDefault(),t.setAttribute("data-drop-target",""))};onLeave=e=>{if(!this.target||this.element(e,".agui-kanban-column")!==this.target)return;let t=e.relatedTarget;t instanceof Node&&this.target.contains(t)||(this.target.removeAttribute("data-drop-target"),this.target=void 0)};onDrop=e=>{let t=this.drag,r=this.destination(e),a=e.dataTransfer,s=r?.dataset.status,o=t&&t.element.isConnected&&!this.board.$.unavailable&&s&&a?.getData(wr)===t.id;this.cancel(),!(!o||!t||!s)&&(e.preventDefault(),this.board.moveItem(t.id,s),this.board.focusItem(t.id))};onKey=e=>{let t=e;if(t.key==="Escape"){this.cancel();return}if(!t.altKey||t.ctrlKey||t.metaKey||t.shiftKey||t.key!=="ArrowLeft"&&t.key!=="ArrowRight")return;let r=this.element(e,".agui-kanban-card");if(!r||this.board.$.unavailable)return;e.preventDefault();let a=this.board.requireModel(),s=r.dataset.recordId,o=a.state.columns.filter(g=>!g.disabled),n=a.state.value.find(g=>g[a.state.idKey]===s);if(!n)return;let l=o.findIndex(g=>g.value===n?.[a.state.statusKey]),d=(t.key==="ArrowRight"?1:-1)*(getComputedStyle(this.board).direction==="rtl"?-1:1),p=l<0?d>0?o[0]:o.at(-1):o[l+d];!p||!s||(this.board.moveItem(s,p.value),this.board.focusItem(s))};cancel=()=>{this.drag?.element.removeAttribute("data-dragging"),this.target?.removeAttribute("data-drop-target"),this.drag=void 0,this.target=void 0};destroy(){this.cancel();for(let[e,t]of Object.entries(this.handlers))this.board.removeEventListener(e,t)}};var Y=class extends c{componentDescription=()=>JSON.stringify({id:this.id,label:this.$.boardLabel});model;issue;disposed=!1;interaction;init$={value:[],columns:[],texts:{},...Object.fromEntries(Object.keys(pe).map(e=>[e,void 0])),unavailable:!0,modelValid:!1,boardLabel:"",moveHint:"",busyText:"false",surfaceHidden:!0,statusMessage:"",statusState:"ready",columnItems:[],moveItem:(e,t)=>this.moveItem(e,t),...yr(this)};constructor(){super(),this.templateProcessors.add(A)}renderCallback(){this.interaction=new He(this);for(let e of["value","columns","texts",...Object.keys(pe),...Object.values(pe).map(t=>`attribute-${t}`)])this.sub(e,()=>this.refresh())}stateInput(){let e=(t,r)=>this.$[t]??this.getAttribute(pe[t])??r;return{value:this.$.value,columns:this.$.columns,texts:this.$.texts,idKey:e("idKey","id"),statusKey:e("statusKey","status"),titleKey:e("titleKey","title"),descriptionKey:e("descriptionKey",""),label:String(e("label","")),error:String(e("error","")),loading:!!(this.$.loading??this.hasAttribute("loading")),disabled:!!(this.$.disabled??this.hasAttribute("disabled")),readonly:!!(this.$.readonly??this.hasAttribute("readonly"))}}refresh(){if(this.disposed||!this.isConnected)return;this.interaction?.cancel();let e=this.stateInput();this.issue=void 0;try{this.model=gr(e)}catch(t){this.model=void 0;let r=t instanceof Error?t.message:"";this.issue=r==="invalidRows"||r==="invalidColumns"?r:"invalidState"}fr(this,e),this.syncWebMCPTools()}text(e){return String(this.$.texts?.[e]??"")}requireModel(){if(!this.model)throw new Error(this.text(this.issue??"invalidState"));return this.model}moveItem(e,t){let r=this.requireModel();if(this.$.unavailable||this.disposed||!this.isConnected)throw new Error(this.text("unavailable"));let a;try{a=br(r,e,t)}catch{throw new Error(this.text("invalidState"))}if(a.changed){this.$.value=a.value;let s=this.getAttribute("pub-to")?.trim();s&&(this.$[s]=a.value);let o={widgetId:this.id||this.localName,context:this.getAttribute("ctx")?.trim()||null,action:"kanban-change",recordId:e,status:t,totalCount:a.value.length};k(this,o)}return{changed:a.changed,recordId:e,status:t,totalCount:a.value.length}}focusItem(e){queueMicrotask(()=>{if(!(this.disposed||!this.isConnected))for(let t of this.querySelectorAll("agui-kanban-card")){let r=t;if(r.$.recordId===e){r.ref.card?.focus();break}}})}destroyCallback(){super.destroyCallback(),this.disposed=!0,this.interaction?.destroy()}};Y.bindAttributes(Object.fromEntries(Object.values(pe).map(i=>[i,`attribute-${i}`])));Y.template=ti;Y.rootStyles=xr;var Ie=class extends c{init$={id:"",label:"",statusValue:!1,unassigned:!1,tone:!1,count:0,countLabel:"",emptyLabel:"",empty:!0,cards:[]};constructor(){super(),this.templateProcessors.add(A)}};Ie.template=ii;var Le=class extends c{componentDescription=()=>JSON.stringify({boardId:this.closest("agui-kanban")?.id||"",recordId:this.$.recordId});init$={id:"",recordId:"",title:"",description:"",moveHint:"",tabIndex:-1,disabledText:"true",unavailable:!0,unavailableMessage:"",set_status:new h({description:"Set this card status to an enabled board column. Return only ID, status, and change/count metadata.",deps:["unavailable"],when:()=>!this.$.unavailable,inputSchema:{type:"object",properties:{status:{type:"string",minLength:1,maxLength:u.id}},required:["status"],additionalProperties:!1},execute:({status:e})=>this.edit(e)})};edit(e){if(!this.isConnected||this.$.unavailable)throw new Error(String(this.$.unavailableMessage));let t=this.$["^moveItem"];return t(String(this.$.recordId),e)}};Le.template=ri;function ct(i,e){let t=i.target;if(i.defaultPrevented||!(t instanceof Element)||t.closest('a, button, input, select, textarea, label, summary, [contenteditable], [role="button"], [role="link"]'))return!1;let r=window.getSelection();return!r||r.isCollapsed||!r.containsNode(e,!0)}function Sr(i,e,t){let r=s=>{!e()||!ct(s,i)||t()},a=s=>{s.defaultPrevented||s.repeat||s.target!==i||!e()||s.key!=="Enter"&&s.key!==" "||(s.preventDefault(),t())};return i.addEventListener("click",r),i.addEventListener("keydown",a),()=>{i.removeEventListener("click",r),i.removeEventListener("keydown",a)}}var Ce=class extends c{init$={id:"",rowId:"",cells:[],selectionType:"checkbox",selected:!1,selectable:!1,selectedText:!1,tabIndex:-1};constructor(){super(),this.templateProcessors.add(A)}renderCallback(){this.clearSelectionListeners=Sr(this.ref.row,()=>!!this.$.selectable,()=>this.select())}select(){if(!this.isConnected||!this.$.selectable)return;let e=this.$["^selectRow"];return e(String(this.$.rowId),this.$.selectionType==="radio"||!this.$.selected)}destroyCallback(){super.destroyCallback(),this.clearSelectionListeners?.()}};Ce.template=Ft;var Me=class extends c{componentDescription=()=>JSON.stringify({tableId:this.closest(Ne)?.id||"",recordId:this.$.rowId,column:this.$.columnKey});init$={id:"",rowId:"",columnKey:"",headingId:"",text:"",tone:!1,cellClass:"",isSelection:!1,selected:!1,selectionValue:!1,"+selectionValue":()=>this.$.selectionType==="radio"?this.$.selected?String(this.$.rowId):"":!!this.$.selected,selectionType:"checkbox",groupName:"",selectLabel:"",unavailable:!1,set_selected:new h({description:"Select or deselect this record by stable ID.",deps:["isSelection","unavailable"],when:()=>!!this.$.isSelection&&!this.$.unavailable,inputSchema:{type:"object",properties:{selected:{type:"boolean"}},required:["selected"],additionalProperties:!1},execute:({selected:e})=>this.select(e)})};renderCallback(){this.sub("+selectionValue",e=>{this.$.selectionValue=e}),this.sub("selectionValue",e=>{let t=this.$.selectionType==="radio"?e===String(this.$.rowId):e===!0;t!==this.$.selected&&this.select(t)})}select(e){let t=this.$["^selectRow"];return t(String(this.$.rowId),e)}};Me.template=Vt;var Oe=class extends c{componentDescription=()=>JSON.stringify({tableId:this.closest(Ne)?.id||"",column:this.$.columnKey,label:this.$.label});init$={id:"",headingId:"",columnKey:"",label:"",sortable:!1,ariaSort:!1,sortIcon:"sort",selectAll:!1,selectAllLabel:"",selected:!1,selectionValue:!1,mixed:!1,unavailable:!1,sort_column:new h({description:"Cycle this column through ascending, descending, and source order.",deps:["sortable","unavailable"],when:()=>!!this.$.sortable&&!this.$.unavailable,execute:()=>{let e=this.$["^sortColumn"];return e(String(this.$.columnKey))}}),select_filtered:new h({description:"Toggle selection of all filtered rows, including other pages. Preserve selections outside the filter.",deps:["selectAll","unavailable"],when:()=>!!this.$.selectAll&&!this.$.unavailable,execute:()=>this.selectFiltered()})};renderCallback(){this.sub("selected",e=>{this.$.selectionValue=e}),this.sub("selectionValue",e=>{e!==this.$.selected&&this.selectFiltered()})}selectFiltered(){let e=this.$["^selectFiltered"];return e()}};Oe.template=Ut;function Tr(i){qe(i.fields),y(i.rows,i.idKey),ce(i.locale);for(let e of i.fields){let t={text:["contains",...e.options?["equals"]:[]],number:["range"],date:["range"],boolean:["equals"],status:e.options?["equals"]:[]};if(e.filter!==void 0&&!t[e.type].includes(e.filter))throw new Error("invalidFields")}if(typeof i.query!="string"||i.query.length>u.text||!S(i.value)||Object.keys(i.value).length>u.fields)throw new Error("invalidState");for(let[e,t]of Object.entries(i.value)){let r=i.fields.find(a=>a.key===e&&a.filter);if(!r)throw new Error("invalidState");if(r.filter==="range"){if(!S(t)||Object.keys(t).some(n=>!["min","max"].includes(n)))throw new Error("invalidState");let a=t,s=ae(r,a.min),o=ae(r,a.max,!0);if(Number.isNaN(s)||Number.isNaN(o)||s!==null&&o!==null&&s>o)throw new Error("invalidState")}else{if(typeof t!="string"||t.length>u.text)throw new Error("invalidState");let a=r.type==="boolean"?["true","false"]:r.options?.filter(s=>!s.disabled).map(s=>s.value);if(r.filter==="equals"&&t&&!a?.includes(t))throw new Error("invalidState")}}}function mt(i){Tr(i);let e=a=>a.toLocaleLowerCase(i.locale),t=e(i.query.trim()),r=i.rows.filter(a=>t&&!i.fields.some(s=>e(re(a,s,i)).includes(t))?!1:Object.entries(i.value).every(([s,o])=>{let n=i.fields.find(g=>g.key===s),l=ve(a,n);if(typeof o=="string")return o?n.filter==="contains"?e(String(l??"")).includes(e(o)):l!==null&&(n.type==="boolean"?String(!!l):String(l))===o:!0;let d=ae(n,o.min),p=ae(n,o.max,!0);return d===null&&p===null||typeof l=="number"&&(d===null||l>=d)&&(p===null||l<=p)}));return{state:i,ids:r.map(a=>String(a[i.idKey]))}}function Ar(i,e){let t=a=>String(e.texts?.[a]??""),r=!i.model||e.disabled||e.readonly||e.loading||!!e.error;i.set$({unavailable:r,modelValid:!!i.model,queryLabel:t("search"),queryText:e.query,resultIds:e.loading||e.error?[]:i.model?.ids??[],statusState:e.loading?"loading":e.error||i.issue?"error":i.model?.ids.length?"ready":"empty",statusMessage:e.loading?t("loading"):e.error||(i.issue?t(i.issue):i.model?.ids.length?"":t("empty")),fieldItems:(i.model?e.fields:[]).filter(a=>a.filter).map(a=>({id:a.key,fieldKey:a.key,label:a.label,minLabel:t("minimum"),maxLabel:t("maximum"),allLabel:t("all"),isContains:a.filter==="contains",isEquals:a.filter==="equals",isRange:a.filter==="range",rangeType:a.type==="date"?"date":"number",filterValue:e.value[a.key]??"",options:a.type==="boolean"?[{value:"true",label:t("trueLabel")},{value:"false",label:t("falseLabel")}]:a.options??[],unavailable:r}))})}var Ge={anyOf:[{type:"string",maxLength:u.text},{type:"object",properties:Object.fromEntries(["min","max"].map(i=>[i,{anyOf:[{type:"number"},{type:"string",maxLength:u.text}]}])),additionalProperties:!1}]};function kr(i){let e=(t,r)=>new h({description:`Set this filter's ${t}. Return bounded change/count metadata, not records.`,deps:["unavailable"],when:()=>!i.$.unavailable,inputSchema:{type:"object",properties:{[t]:r},required:[t],additionalProperties:!1},execute:a=>i.edit(t,a[t])});return{set_value:e("value",{type:"object",maxProperties:u.fields,additionalProperties:Ge}),set_query:e("query",{type:"string",maxLength:u.text}),read_result:new h({description:"Read a bounded page of matching record IDs. Follow nextOffset. No records are returned.",deps:["modelValid"],when:()=>!!i.$.modelValid,inputSchema:{type:"object",properties:{offset:{type:"integer",minimum:0,maximum:u.rows},limit:{type:"integer",minimum:1,maximum:u.pageSize}},additionalProperties:!1},execute:({offset:t,limit:r})=>i.readResult(t,r)})}}var Er=m`
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
`;var ze=Object.freeze({idKey:"id-key",locale:"locale",label:"label",disabled:"disabled",readonly:"readonly",loading:"loading",error:"error"}),X=class extends c{componentDescription=()=>JSON.stringify({id:this.id,label:this.stateInput().label});model;issue;disposed=!1;init$={rows:[],fields:[],value:{},query:"",texts:{},...Object.fromEntries(Object.keys(ze).map(e=>[e,void 0])),unavailable:!0,modelValid:!1,resultIds:[],fieldItems:[],queryLabel:"",queryText:"",statusMessage:"",statusState:"ready",editField:(e,t)=>this.editField(e,t),...kr(this)};constructor(){super(),this.templateProcessors.add(A)}renderCallback(){this.sub("queryText",e=>{e!==this.$.query&&this.edit("query",e)},!1);for(let e of["rows","fields","value","query","texts",...Object.keys(ze),...Object.values(ze).map(t=>`attribute-${t}`),"attribute-results-to"])this.sub(e,()=>this.refresh())}stateInput(){let e=(t,r)=>this.$[t]??this.getAttribute(ze[t])??r;return{rows:this.$.rows,fields:this.$.fields,value:this.$.value,query:this.$.query,texts:this.$.texts,idKey:e("idKey","id"),locale:e("locale",document.documentElement.lang||navigator.language),label:String(e("label","")),error:String(e("error","")),loading:!!(this.$.loading??this.hasAttribute("loading")),disabled:!!(this.$.disabled??this.hasAttribute("disabled")),readonly:!!(this.$.readonly??this.hasAttribute("readonly"))}}refresh(){if(this.disposed||!this.isConnected)return;let e=this.stateInput();this.issue=void 0;try{this.model=mt(e)}catch(r){this.model=void 0;let a=r instanceof Error?r.message:"";this.issue=a==="invalidRows"||a==="invalidFields"?a:"invalidState"}Ar(this,e);let t=this.getAttribute("results-to")?.trim();t&&!w(this.$[t],this.$.resultIds)&&(this.$[t]=structuredClone(this.$.resultIds)),this.syncWebMCPTools()}text(e){return String(this.$.texts?.[e]??"")}requireModel(){if(!this.model)throw new Error(this.text(this.issue??"invalidState"));return this.model}edit(e,t){let r=this.requireModel();if(this.$.unavailable||this.disposed)throw new Error(this.text("unavailable"));try{mt({...r.state,[e]:t})}catch{throw new Error(this.text("invalidState"))}let a=!w(r.state[e],t);if(a){this.$[e]=structuredClone(t);let s=this.getAttribute(e==="value"?"pub-to":"query-pub-to")?.trim();s&&(this.$[s]=structuredClone(t));let o={widgetId:this.id||this.localName,context:this.getAttribute("ctx")?.trim()||null,action:"filter-change",property:e,resultCount:this.requireModel().ids.length};k(this,o)}return{changed:a,resultCount:this.requireModel().ids.length}}editField(e,t){let r={...this.requireModel().state.value};return t===""||t&&typeof t=="object"&&!Object.keys(t).length?delete r[e]:r[e]=t,this.edit("value",r)}readResult(e=0,t=20){if(this.requireModel(),!Number.isInteger(e)||e<0||e>u.rows||!Number.isInteger(t)||t<1||t>u.pageSize)throw new Error(this.text("invalidState"));let r=this.$.resultIds,a=r.slice(e,e+t),s=()=>({total:r.length,items:a,nextOffset:e+a.length<r.length?e+a.length:null});for(;new TextEncoder().encode(JSON.stringify(s())).byteLength>u.readBytes&&a.length;)a.pop();return s()}destroyCallback(){super.destroyCallback(),this.disposed=!0}};X.bindAttributes({...Object.fromEntries(Object.values(ze).map(i=>[i,`attribute-${i}`])),"results-to":"attribute-results-to"});X.template=ai;X.rootStyles=Er;var Re=class extends c{refreshing=!0;componentDescription=()=>JSON.stringify({filterId:this.closest("agui-filter")?.id||"",field:this.$.fieldKey,label:this.$.label});init$={id:"",fieldKey:"",label:"",minLabel:"",maxLabel:"",allLabel:"",isContains:!1,isEquals:!1,isRange:!1,rangeType:"number",filterValue:"",options:[],containsValue:"",equalsValue:"",minValue:"",maxValue:"",rangeStep:"any",selectOptions:[],unavailable:!1,set_filter:new h({description:"Set this filter field to text, an option value, or inclusive min/max bounds.",deps:["unavailable"],when:()=>!this.$.unavailable,inputSchema:{type:"object",properties:{value:Ge},required:["value"],additionalProperties:!1},execute:({value:e})=>this.edit(e)})};renderCallback(){for(let e of["filterValue","options","allLabel"])this.sub(e,()=>this.refresh());for(let e of["containsValue","equalsValue","minValue","maxValue"])this.sub(e,()=>{this.refreshing||this.onInput()});this.refreshing=!1}refresh(){let e=this.$.filterValue,t=e&&typeof e=="object"?e:{},r=this.$.options,a=typeof e=="string"?e:"",s=n=>n===void 0?"":String(n).slice(0,this.$.rangeType==="date"?10:void 0),o=this.refreshing;this.refreshing=!0;try{this.set$({containsValue:a,equalsValue:a,minValue:s(t.min),maxValue:s(t.max),rangeStep:this.$.rangeType==="date"?"1":"any",selectOptions:[{value:"",label:String(this.$.allLabel)},...r]})}finally{this.refreshing=o}}edit(e){let t=this.$["^editField"];return t(String(this.$.fieldKey),e)}onInput=()=>{if(this.$.isContains)this.edit(this.$.containsValue);else if(this.$.isEquals)this.edit(this.$.equalsValue);else{let e=this.ref.min.control,t=this.ref.max.control;if(!(e instanceof HTMLInputElement)||!(t instanceof HTMLInputElement)||!e.checkValidity()||!t.checkValidity())return;let r={};e.value&&(r.min=this.$.rangeType==="date"?e.value:Number(e.value)),t.value&&(r.max=this.$.rangeType==="date"?t.value:Number(t.value)),this.edit(r)}}};Re.template=si;var be=Object.freeze({label:"label",idKey:"id-key",selection:"selection",itemTemplate:"item-template",disabled:"disabled",readonly:"readonly",loading:"loading",error:"error"}),We=Object.fromEntries(Object.values(be).map(i=>[i,`attribute-${i}`]));function $r(i){if(y(i.rows,i.idKey),x(i.value),i.filteredIds!==null&&x(i.filteredIds),!["none","single","multiple"].includes(i.selection))throw new Error("invalidState");let e=i.filteredIds===null?null:new Set(i.filteredIds);return{state:i,filtered:i.rows.filter(t=>!e||e.has(String(t[i.idKey]))),selected:Ue(i,i.value)}}function Ir(i){return{set_selection:new h({description:"Select this list's items by stable ID. Returns change/count metadata without records.",deps:["unavailable","selectionEnabled"],when:()=>!i.$.unavailable&&!!i.$.selectionEnabled,inputSchema:{type:"object",properties:{ids:{type:"array",maxItems:u.rows,uniqueItems:!0,items:{type:"string",minLength:1,maxLength:u.id}}},required:["ids"],additionalProperties:!1},execute:({ids:e})=>i.edit(e)})}}var Je=m`
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
`;var M=class i extends c{inlineTemplate;itemTemplate;semantics;model;issue="";disposed=!1;handledEvents=new WeakSet;componentDescription=()=>JSON.stringify({id:this.id,label:this.stateInput().label});init$={items:[],value:[],filteredIds:null,texts:{},...Object.fromEntries(Object.keys(be).map(e=>[e,void 0])),itemsToRender:[],unavailable:!0,selectionEnabled:!1,selectItem:e=>this.selectItem(e),...Ir(this)};render(e,t){this.inlineTemplate=[...this.children].find(a=>a instanceof HTMLTemplateElement),this.itemTemplate=this.resolveTemplate();let r=document.createElement("template");r.innerHTML=it,r.content.querySelector("[itemize]")?.append(this.itemTemplate?.cloneNode(!0)??document.createElement("template")),this.replaceChildren(),super.render(r.content,t)}resolveTemplate(){let e=this.$.itemTemplate??this.getAttribute("item-template");if(!e)return this.inlineTemplate;try{let r=this.getRootNode().querySelector(String(e))||document.querySelector(String(e));return r instanceof HTMLTemplateElement?r:void 0}catch{return}}renderCallback(){this.semantics=this.attachInternals(),this.semantics.role="list",this.ref.items.addEventListener("click",this.onClick);for(let e of["items","value","filteredIds","texts",...Object.keys(be),...Object.values(be).map(t=>`attribute-${t}`)])this.sub(e,()=>this.refresh())}stateInput(){let e=(t,r)=>this.$[t]??this.getAttribute(be[t])??r;return{rows:this.$.items,value:this.$.value,filteredIds:this.$.filteredIds,texts:this.$.texts,idKey:e("idKey","id"),selection:e("selection","none"),label:String(e("label","")),error:String(e("error","")),loading:!!(this.$.loading??this.hasAttribute("loading")),disabled:!!(this.$.disabled??this.hasAttribute("disabled")),readonly:!!(this.$.readonly??this.hasAttribute("readonly"))}}refresh(){if(this.disposed)return;let e=this.stateInput();this.issue="";try{if(!this.itemTemplate||this.resolveTemplate()!==this.itemTemplate)throw new Error("invalidState");this.model=this.deriveModel(e)}catch(o){this.model=void 0,this.issue=o instanceof Error&&o.message==="invalidRows"?"invalidRows":"invalidState"}let t=this.model,r=!t||e.disabled||e.readonly||e.loading||!!e.error,a=new Set(t?.selected),s=e.selection!=="none";this.semantics&&(this.semantics.ariaLabel=e.label),this.setAttribute("aria-busy",String(e.loading)),this.dataset.state=e.loading?"loading":e.error||this.issue?"error":t?.filtered.length?"ready":"empty",this.dataset.message=e.loading?this.text("loading"):e.error||(this.issue?this.text(this.issue):t?.filtered.length?"":this.text("empty")),this.set$({unavailable:r,selectionEnabled:s&&!!t,itemsToRender:e.loading||e.error||!t?null:t.filtered.map(o=>({...o,_selected:a.has(String(o[e.idKey])),_selectionDisabled:r||!s}))}),this.syncWebMCPTools()}text(e){return String(this.$.texts?.[e]??"")}deriveModel(e){return $r(e)}requireModel(){if(!this.model)throw new Error(this.text(this.issue||"invalidState"));return this.model}edit(e){let t=this.requireModel();if(this.$.unavailable||this.disposed)throw new Error(this.text("unavailable"));try{e=Fe(t.state,e)}catch{throw new Error(this.text("invalidState"))}let r=!w([...t.selected].sort(),[...e].sort());if(r){this.$.value=[...e];let a=this.getAttribute("pub-to")?.trim();a&&(this.$[a]=[...e]),k(this,{widgetId:this.id||this.localName,context:this.getAttribute("ctx")?.trim()||null,action:"list-change",property:"value",selectedCount:e.length,filteredCount:this.requireModel().filtered.length})}return this.result(r)}result(e){return{changed:e,selectedCount:this.model?.selected.length??0,filteredCount:this.model?.filtered.length??0}}onClick=e=>{e.target instanceof Element&&e.composedPath().find(t=>t instanceof i)===this&&ct(e,this.ref.items)&&this.selectItem(e)};selectItem(e){if(e.defaultPrevented||this.handledEvents.has(e)||!this.isConnected||this.disposed||this.$.unavailable||!this.$.selectionEnabled)return this.result(!1);let t=e.target instanceof Element?e.target:null;for(;t&&t.parentElement!==this.ref.items;){let p=t.getRootNode();t=t.parentElement||(p instanceof ShadowRoot?p.host:null)}let r=t?[...this.ref.items.children].indexOf(t):-1,a=this.requireModel(),s=a.filtered[r];if(!s)return this.result(!1);this.handledEvents.add(e);let o=String(s[a.state.idKey]),n=e.target,l=e.type!=="webmcp"&&n instanceof HTMLInputElement&&(n.type==="checkbox"||n.type==="radio")?n.checked:a.state.selection==="single"||!a.selected.includes(o),d=new Set(a.state.selection==="single"&&l?[]:a.selected);return l?d.add(o):d.delete(o),this.edit([...d])}destroyCallback(){super.destroyCallback(),this.disposed=!0,this.ref.items.removeEventListener("click",this.onClick)}};M.bindAttributes(We);M.template=it;M.rootStyles=Je;function Lr(i,e){y(i,"id"),x(e);let t=new Map(i.map(n=>[n.id,n])),r=new Map;for(let n of i){if(typeof n.label!="string"||n.label.length>u.text||n.parentId!==void 0&&typeof n.parentId!="string"||n.parentId&&(!t.get(n.parentId)?.branch||n.parentId===n.id)||["branch","loaded","loading","more","disabled"].some(p=>n[p]!==void 0&&typeof n[p]!="boolean")||["icon","message"].some(p=>n[p]!==void 0&&(typeof n[p]!="string"||n[p].length>u.text)))throw new Error("invalidRows");let l=n.parentId||"",d=r.get(l)||[];d.push(n),r.set(l,d)}let a=new Set(e),s=[],o=(n,l,d,p)=>{if(l>64)throw new Error("invalidRows");for(let g of r.get(n)||[]){let f=!!g.branch&&a.has(g.id);s.push({...g,depth:l,visible:d,open:f,disabled:p||g.disabled}),o(g.id,l+1,d&&f,p||!!g.disabled)}};if(o("",0,!0,!1),s.length!==i.length)throw new Error("invalidRows");return s}var fe=class extends M{defaultTemplate;constructor(){super(),Object.assign(this.init$,{expanded:[],selectBranches:void 0,request:null,toggle_node:new h({description:"Expand or collapse an explorer branch by ID. Returns change metadata without node contents.",deps:["unavailable"],when:()=>!this.$.unavailable,inputSchema:{type:"object",properties:{id:{type:"string"}},required:["id"],additionalProperties:!1},execute:({id:e})=>this.toggleNode(e)})})}resolveTemplate(){let e=super.resolveTemplate();return e||(this.defaultTemplate||(this.defaultTemplate=document.createElement("template"),this.defaultTemplate.innerHTML=oi),this.defaultTemplate)}renderCallback(){super.renderCallback(),this.sub("expanded",()=>this.refresh()),this.sub("selectBranches",()=>this.refresh()),this.sub("attribute-select-branches",()=>this.refresh())}get selectsBranches(){return!!(this.$.selectBranches??this.hasAttribute("select-branches"))}stateInput(){return{...super.stateInput(),idKey:"id",selection:this.$.selection??this.getAttribute("selection")??"single"}}deriveModel(e){let t=Lr(e.rows,this.$.expanded),r=new Set(e.value),a=e.filteredIds===null?null:new Set(e.filteredIds);return super.deriveModel({...e,idKey:"id",value:e.value.filter(s=>t.some(o=>o.id===s&&(this.selectsBranches||!o.branch))),filteredIds:t.filter(s=>s.visible&&(!a||a.has(s.id))).map(s=>s.id),rows:t.map(s=>({...s,indent:`${s.depth}rem`,nodeDisabled:e.disabled||e.readonly||e.loading||!!e.error||!!s.disabled||!s.branch&&e.selection==="none",nodeExpanded:s.branch?String(s.open):null,nodeSelected:s.branch&&!this.selectsBranches?null:String(r.has(s.id)),nodeIcon:s.icon||(s.branch?s.open?"folder_open":"folder":"insert_drive_file"),actionLabel:[this.text(s.branch?s.open?"collapse":"expand":"select"),s.label].filter(Boolean).join(" "),moreLabel:this.text(s.message?"retry":"more"),showMore:s.open&&!s.loading&&(!!s.more||!!s.message&&s.loaded===!1),showMessage:!!s.message&&(!s.branch||s.open),activateNode:o=>{if(s.branch){let n=this.toggleNode(s.id);return this.selectsBranches&&this.selectItem(o),n}return this.selectItem(o)},loadMore:()=>this.requestNode(s.id,s.message&&s.loaded===!1?"retry":"more")}))})}edit(e){if(!Array.isArray(e))throw new Error(this.text("invalidState"));let t=this.requireModel();if(e.some(r=>t.state.rows.some(a=>a.id===r&&(a.branch&&!this.selectsBranches||a.disabled))))throw new Error(this.text("unavailable"));return super.edit(e)}toggleNode(e){let t=this.requireModel().state.rows.find(o=>o.id===e);if(this.$.unavailable||!t?.branch||t.disabled)throw new Error(this.text("unavailable"));let r=new Set(this.$.expanded),a=!r.has(e);a?r.add(e):r.delete(e),this.$.expanded=[...r];let s=this.getAttribute("expanded-pub-to")?.trim();return s&&(this.$[s]=this.$.expanded),a&&t.loaded===!1&&!t.loading&&this.requestNode(e,"expand"),{id:e,expanded:a,changed:!0}}requestNode(e,t){let r=this.requireModel().state.rows.find(o=>o.id===e);if(this.$.unavailable||!r?.branch||r.disabled||r.loading)throw new Error(this.text("unavailable"));let a={id:e,action:t};this.$.request=a;let s=this.getAttribute("request-pub-to")?.trim();s&&(this.$[s]=a)}};fe.bindAttributes({...We,"select-branches":"attribute-select-branches"});fe.rootStyles=Je;var Ze=new Set;function Ye(){let i=0;for(let e of[...Ze].reverse())e.style.setProperty("--agui-message-offset",`${i}px`),i+=e.getBoundingClientRect().height+8}function Cr(i){Ze.delete(i),Ze.add(i),Ye()}function Mr(i){Ze.delete(i),Ye()}var Or=m`
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
`;var Q=class extends c{timer;sizeObserver;generation=0;disposed=!1;init$={message:"",tone:"info",timeout:rt,closeLabel:"",messageRole:"status",liveMode:"polite",iconName:"info",dismiss:()=>{this.hide()}};renderCallback(){this.hidden=!0,"showPopover"in HTMLElement.prototype&&this.setAttribute("popover","manual"),this.sizeObserver=new ResizeObserver(Ye),this.sizeObserver.observe(this),this.sub("tone",e=>{let t=Object.hasOwn(at,String(e))?e:"info";this.setAttribute("data-tone",t),this.set$(at[t])}),this.sub("message",()=>this.show()),this.sub("timeout",()=>{this.hidden||this.show()})}show(){if(this.disposed)return;if(!String(this.$.message??"").trim()){this.hide();return}window.clearTimeout(this.timer),this.generation+=1,this.removeAttribute("data-closing"),this.hidden=!1,this.hasAttribute("popover")&&!this.matches(":popover-open")&&this.showPopover(),Cr(this);let e=Number(this.$.timeout);this.timer=window.setTimeout(()=>{this.hide()},Number.isFinite(e)&&e>0?e:rt)}async hide(e=!1){window.clearTimeout(this.timer),this.timer=void 0;let t=++this.generation;!e&&!this.hidden&&(this.setAttribute("data-closing",""),await Promise.allSettled(this.getAnimations().map(r=>r.finished))),t===this.generation&&(this.hasAttribute("popover")&&this.matches(":popover-open")&&this.hidePopover(),this.hidden=!0,this.removeAttribute("data-closing"),Mr(this))}destroyCallback(){super.destroyCallback(),this.disposed=!0,this.hide(!0),this.sizeObserver?.disconnect()}};Q.bindAttributes({message:"message",tone:"tone",timeout:"timeout","close-label":"closeLabel"});Q.template=ni;Q.rootStyles=Or;function nm(i={}){let e={"agui-app":we,"agui-sidebar":N,"agui-viewport":Se,"agui-tab-button":Te,"agui-tab":K,"agui-tabs":j,"agui-dashboard":xe,"agui-panel":Ae,"agui-sidebar-block":P,"agui-header":ne,"agui-footer":ke,"agui-toolbar":Ee,"agui-button":q,"agui-nav":L,"agui-breadcrumbs":le,"agui-field":$e,"agui-select":de,"agui-toggle":ue,"agui-theme-toggle":i.themeToggle??$t,"agui-theme-selector":i.themeSelector??It,"agui-preloader":F,"agui-steps":V,"agui-state":U,"agui-dialog":H,"agui-message":Q,"agui-icon":B,"agui-table-cell":Me,"agui-table-row":Ce,"agui-table-heading":Oe,"agui-filter-field":Re,"agui-filter":X,"agui-table":C,"agui-list":M,"agui-explorer":fe,"agui-chart-data":Ve,"agui-chart":G,"agui-map-data":Be,"agui-map":W,"agui-markdown":J,"agui-diagram":Z,"agui-kanban-card":Le,"agui-kanban-column":Ie,"agui-kanban":Y};for(let t of Object.values(di)){if(typeof t!="function"||!(t.prototype instanceof pt))continue;let r=t;customElements.get(r.is)!==r&&customElements.define(r.is,r)}for(let[t,r]of Object.entries(e)){let a=customElements.get(t);a&&a!==r&&customElements.define(t,r)}i.assetBaseUrl&&Kt(i.assetBaseUrl),_e(document),li(document);for(let[t,r]of Object.entries(e))r.reg(t)}export{xe as a,we as b,N as c,P as d,Se as e,K as f,j as g,Te as h,Ae as i,ne as j,ke as k,Ee as l,$e as m,q as n,L as o,le as p,de as q,ue as r,U as s,F as t,V as u,B as v,H as w,G as x,C as y,Ve as z,W as A,Be as B,J as C,Z as D,Y as E,Ie as F,Le as G,Ce as H,Me as I,Oe as J,X as K,Re as L,M,fe as N,Q as O,nm as P};
