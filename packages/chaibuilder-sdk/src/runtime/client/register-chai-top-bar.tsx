import { useMemo } from "react";

const DefaultTopBar = () => {
  return <div></div>;
};

const TOP_BAR: { component: React.ComponentType } = {
  component: DefaultTopBar,
};

export const registerChaiTopBar = (component: React.ComponentType) => {
  TOP_BAR.component = component;
};

export const useTopBarComponent = () => {
  return useMemo(() => TOP_BAR.component, []);
};
