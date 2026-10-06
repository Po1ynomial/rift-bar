// Styles for /lib/components/workspaces/*.jsx components
import { spaceStyles } from "./space";

export const styles = /* css */ `
.spaces {
  flex: 0 0 auto;
  display: flex;
  align-items: stretch;
}
.rift-bar--no-bar-background .spaces {
  padding: 4px 5px;
  background-color: var(--background);
  box-shadow: var(--light-shadow);
  border-radius: var(--bar-radius);
}
.rift-bar--no-bar-background.rift-bar--no-shadow .spaces {
  box-shadow: none;
}
.rift-bar--process-aligned-to-left .spaces {
  margin-right: 4px;
}
.spaces__separator {
  align-self: center;
  flex: 0 0 5px;
  width: 5px;
  height: 5px;
  margin: var(--item-outer-margin);
  background-color: var(--foreground);
  border-radius: 50%;
  opacity: 0.35;
}
${spaceStyles}
.spaces__end-separator {
  align-self: center;
  flex: 0 0 4px;
  width: 4px;
  height: 4px;
  margin: var(--item-outer-margin);
  background-color: var(--main-alt);
  border-radius: 50%;
  opacity: 0.35;
}
`;
