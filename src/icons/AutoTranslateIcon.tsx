import { Component, ComponentProps } from "solid-js";

type Props = ComponentProps<"svg"> & { enabled?: boolean };

const AutoTranslateIcon: Component<Props> = (props) => (
  <svg fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" {...props}>
    <defs>
      <linearGradient id="paint0_linear_16_596" gradientUnits="userSpaceOnUse" x1="12.2" x2="12.2" y1=".1" y2="22.9">
        <stop offset="0" stop-color="#ce9ffc" />
        <stop offset=".979167" stop-color="#7367f0" />
      </linearGradient>
    </defs>
    <path
      d="m5 15v2c-.00016.5046.19041.9906.5335 1.3605.34309.37.81334.5967 1.3165.6345l.15.005h3v2h-3c-1.06087 0-2.07828-.4214-2.82843-1.1716-.75014-.7501-1.17157-1.7675-1.17157-2.8284v-2zm13-5 4.4 11h-2.155l-1.201-3h-4.09l-1.199 3h-2.154l4.399-11zm-1 2.885-1.247 3.115h2.492zm-9-10.885v2h4v7h-4v3h-2v-3h-4v-7h4v-2zm9 1c1.0609 0 2.0783.42143 2.8284 1.17157.7502.75015 1.1716 1.76756 1.1716 2.82843v2h-2v-2c0-.53043-.2107-1.03914-.5858-1.41421-.3751-.37508-.8838-.58579-1.4142-.58579h-3v-2zm-11 3h-2v3h2zm4 0h-2v3h2z"
      fill={props.enabled ? "url(#paint0_linear_16_596)" : "currentColor"}
    />
  </svg>
);

export default AutoTranslateIcon;
