// Styles for /lib/components/workspaces/process.jsx components
export const styles = /* css */ `
.process {
  display: flex;
  pointer-events: none;
  touch-action: none;
}
.process--centered {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%; 
}
.process:empty {
  display: none;
}
.process__container {
  display: flex;
  align-items: stretch;
  box-sizing: border-box;
  pointer-events: auto;
  touch-action: auto;
}
.process--centered .process__container {
  height: var(--bar-foreground-height);
  margin: 0 auto;
}
.rift-bar--no-bar-background .process__container:not(:empty) {
  padding: 4px 5px;
  background-color: var(--background);
  box-shadow: var(--light-shadow);
  border-radius: var(--bar-radius);
}
.process__window {
  display: flex;
  align-items: center;
  gap: 3px;
  margin: var(--item-outer-margin);
  padding: var(--item-inner-margin);
  color: currentColor;
  font-family: var(--font);
  font-size: var(--font-size);
  background-color: var(--minor);
  border-radius: var(--item-radius);
  border: 0;
  outline: none;
  box-shadow: var(--light-shadow);
  cursor: pointer;
  user-select: none;
  -webkit-user-select: none;
  transition: color 160ms var(--transition-easing), background-color 160ms var(--transition-easing), 
    border 160ms var(--transition-easing), box-shadow 160ms var(--transition-easing);
  z-index: 0;
}
.rift-bar--spaces-background-color-as-foreground .process__window {
  background-color: transparent;
  box-shadow: none;
}
.rift-bar--no-shadow .process__container,
.rift-bar--no-bar-background.rift-bar--no-shadow .process__container,
.rift-bar--no-shadow .process__window {
  box-shadow: none;
}
.process__window:only-child {
  margin: 0;
}
.process__window--only-current {
  background-color: var(--minor);
}
.process__window--focused {
  color: var(--minor);
  background-color: var(--foreground);
}
.rift-bar--spaces-background-color-as-foreground .process__window--focused {
  color: var(--foreground);
  background-color: transparent;
  box-shadow: var(--light-shadow), 0 0 0 1px var(--foreground);
}
.process__window:not(.process__window--only-current):not(.process__window--focused):is(:hover, :active) {
  box-shadow: var(--light-shadow), var(--hover-ring);
}
.process__icon {
  flex: 0 0 var(--font-size);
  width: var(--font-size);
  height: var(--font-size);
  fill: currentColor;
  transition: margin-right 160ms var(--transition-easing);
}
.process__window--only-current .process__icon,
.process__window--focused .process__icon,
.process__window--expanded .process__icon {
  margin-right: 6px;
}
.process__window--only-icon .process__icon {
  margin-right: 0;
}
.process__inner {
  max-width: 0;
  display: flex;
  flex-wrap: nowrap;
  overflow: hidden;
  transition: max-width 160ms var(--transition-easing);
}
.process__window--focused .process__inner,
.process__window--expanded .process__inner {
  max-width: var(--item-max-width);
}
.process__window--only-current .process__inner {
  max-width: 400px;
}
.process__name {
  margin-top: 2px;
  white-space: nowrap;
  transition: transform 160ms var(--transition-easing);
}
`;
