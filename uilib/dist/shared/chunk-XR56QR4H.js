import{a as s}from"./chunk-2VRDLJ6Q.js";import{b as d}from"./chunk-ABNJEAG3.js";import{a as n}from"./chunk-2CNPZJO7.js";import{c as u}from"./chunk-2DUVGFZF.js";import{a as o,b as h}from"./chunk-6YJPLNFK.js";var c=u`
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
`;var g=0,p=Object.freeze(["value","label","aria-label","disabled","readonly","pub-to"]),m=Object.freeze(Object.fromEntries(p.map(l=>[l,`attribute-${l}`]))),r=class extends d{ready=!1;componentDescription=()=>JSON.stringify({id:this.id,label:this.$.selectorLabel});init$={value:void 0,label:void 0,texts:void 0,disabled:void 0,readonly:void 0,popupId:`agui-theme-palettes-${++g}`,selectorLabel:"",activeValue:"graphite",entries:[],unavailable:!0,saving:!1,saveState:"idle",statusMessage:"",statusClass:"",set_value:new n({description:"Apply a palette and publish its value without saving data.",inputSchema:{type:"object",properties:{value:{type:"string",enum:s}},required:["value"],additionalProperties:!1},execute:({value:e})=>this.commit(e)}),read_value:new n({description:"Read the selected palette and local saving state without returning application data.",execute:()=>({value:this.$.activeValue,saveState:this.$.saveState})})};renderCallback(){this.ready=!0;for(let e of p)e.includes("-")||this.sub(e,()=>this.refresh()),this.sub(`attribute-${e}`,()=>this.refresh());for(let e of["texts","saving","saveState"])this.sub(e,()=>this.refresh())}text(e){let t=this.$.texts;return String(t?.[e]??"")}get unavailable(){return!!(this.$.disabled??this.hasAttribute("disabled"))||!!(this.$.readonly??this.hasAttribute("readonly"))||!!this.$.saving||this.$.saveState==="unknown"}refresh(){if(!this.ready||!this.isConnected)return;let e=this.$.value??this.getAttribute("value")??"graphite";if(typeof e!="string"||!s.includes(e))throw new TypeError(this.text("invalidValue"));this.ownerDocument.body.dataset.palette=e;let t=String(this.$.saveState);e!==this.$.activeValue&&!this.$.saving&&t!=="unknown"&&(t="idle");let i=this.unavailable;this.set$({activeValue:e,saveState:t,unavailable:i,selectorLabel:String(this.getAttribute("aria-label")??this.$.label??this.getAttribute("label")??""),statusMessage:this.text(t),statusClass:["rejected","unknown","invalidTarget"].includes(t)?o.failure:o.idle,entries:s.map(a=>({value:a,label:this.text(a),selected:a===e,pressed:String(a===e),disabled:i,select:b=>this.choose(a,b)}))})}commit(e){if(this.$.unavailable)throw new Error(this.text("unavailable"));if(typeof e!="string"||!s.includes(e))throw new TypeError(this.text("invalidValue"));let t=e!==this.$.activeValue;if(t){this.$.value=e;let i=this.getAttribute("pub-to")?.trim();i&&!Object.is(this.$[i],e)&&(this.$[i]=e),this.announce("change",e)}return{value:e,changed:t}}async choose(e,t){this.commit(e)}destroyCallback(){super.destroyCallback(),this.ready=!1,this.ownerDocument.querySelector("agui-theme-selector")||delete this.ownerDocument.body.dataset.palette}};r.bindAttributes(m);r.template=h;r.rootStyles=c;export{m as a,r as b};
