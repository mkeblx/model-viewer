import {html, LitElement, property} from '@polymer/lit-element';



export interface FidelityTestGoldenConfig {
  name: string;
  file: string;
}

export interface FidelityTestDimensions {
  width: number;
  height: number;
}

export interface FidelityScenarioConfig {
  slug: string;
  goldens: Array<{name: string; file: string;}>;
  dimensions: {width: number; height: number;}
}

export type FidelityTestConfig = Array<FidelityScenarioConfig>;

const DEFAULT_DIMENSIONS: FidelityTestDimensions = {
  width: 0,
  height: 0
};



class FidelityResult extends LitElement {
  @property({type: String}) slug: string = '';

  @property({type: Object}) golden: FidelityTestGoldenConfig|null = null;

  @property({type: Object})
  dimensions: FidelityTestDimensions = DEFAULT_DIMENSIONS;

  get basePath() {
    if (!this.slug || !this.golden) {
      return '';
    }

    return `./results/${this.slug}/${this.golden.name}`;
  }

  render() {
    const {basePath} = this;
    const {width} = this.dimensions;

    return html`
<style>
#container {
  display: flex;
  flex-direction: row;
  width: 100%;
  object-fit: contain;
  align-items: center;
}

#container img {
  max-width: 25%;
  flex: 1;
}
</style>
<div id="container">
  <img style="width:${width}px;"
      src="${basePath}/candidate.png">
  <img style="width:${width}px;"
      src="${basePath}/boolean.png">
  <img style="width:${width}px;"
      src="${basePath}/delta.png">
  <img style="width:${width}px;"
      src="${basePath}/golden.png">
</div>
    `;
  }
}

customElements.define('fidelity-result', FidelityResult);



class FidelityScenario extends LitElement {
  @property({type: String}) slug: string = '';

  @property({type: Array}) goldens: Array<FidelityTestGoldenConfig> = [];

  @property({type: Object})
  dimensions: FidelityTestDimensions = DEFAULT_DIMENSIONS;

  static get properties() {
    return {
      slug: {type: String},
      goldens: {type: Array},
      dimensions: {type: Object}
    };
  }

  render() {
    const results = this.goldens.map(golden => html`<fidelity-result
        .slug="${this.slug}"
        .golden="${golden}"
        .dimensions="${this.dimensions}"></fidelity-result>`);

    return html`<h1>${this.slug}</h1>${results}`;
  }
}

customElements.define('fidelity-scenario', FidelityScenario);



class FidelityResults extends LitElement {
  @property({type: String}) src: string = '';

  @property({type: Object}) config: FidelityTestConfig = [];

  update(changedProperties: Map<any, any>) {
    super.update(changedProperties);

    if (changedProperties.has('src')) {
      this.loadConfig();
    }
  }

  private async loadConfig() {
    this.config = await (await fetch(this.src)).json();
  }

  render() {
    const {config} = this;

    if (this.config == null) {
      return html`loading`;
    }

    const scenarios = config.map((scenario) => html`<fidelity-scenario
            .slug="${scenario.slug}"
            .goldens="${scenario.goldens}"
            .dimensions="${scenario.dimensions}"></fidelity-scenario>`);

    return html`${scenarios}`;
  }
};

customElements.define('fidelity-results', FidelityResults);
