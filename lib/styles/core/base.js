// rift-bar' global styles
const baseStyles = /* css */ `
.rift-bar {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  z-index: 0;
  display: flex;
  align-items: stretch;
  padding: var(--bar-inner-margin);
  box-sizing: border-box;
  color: var(--bar-foreground);
  font-size: var(--font-size);
  font-family: var(--font);
  background-color: var(--bar-background);
  border: var(--bar-border);
  box-shadow: var(--light-shadow);
}
@media only screen and (-webkit-min-device-pixel-ratio: 2),
  only screen and (min-device-pixel-ratio: 2),
  only screen and (min-resolution: 192dpi),
  only screen and (min-resolution: 2dppx) {
  .rift-bar {
    -webkit-font-smoothing: antialiased;
  }
}
.rift-bar--floating {
  top: var(--bar-outer-margin, 5px);
  left: var(--bar-outer-margin, 5px);
  width: calc(100% - (var(--bar-outer-margin, 5px) * 2));
  border-radius: var(--bar-radius);
}
.rift-bar--no-bar-background,
.rift-bar--no-bar-shadow {
  box-shadow: none;
}
.rift-bar--focused,
.rift-bar--no-shadow.rift-bar--focused {
  box-shadow: inset 0 0 0 1px var(--red);
}
.rift-bar--no-bar-background {
  background-color: transparent;
}
.rift-bar__foreground {
  position: relative;
  display: flex;
  align-items: stretch;
  flex: 1;
  min-width: 0;
  height: var(--bar-foreground-height);
  box-sizing: border-box;
}
.rift-bar--empty .rift-bar__foreground {
  align-items: center;
}
.rift-bar--empty {
  z-index: 2;
}
.rift-bar--empty .rift-bar__foreground > span {
  position: relative;
  display: flex;
  align-items: center;
  color: var(--foreground);
}
.rift-bar--empty .rift-bar__foreground > span::before {
  content: "";
  width: 6px;
  height: 6px;
  margin-right: 7px;
  background-color: var(--red);
  border-radius: 50%;
}
.rift-bar--empty.rift-bar--loading .rift-bar__foreground > span::before {
  background-color: var(--green);
}
.rift-bar__data {
  position: relative;
  display: flex;
  align-items: stretch;
  margin-left: auto;
}
.rift-bar__data:empty {
  display: none;
}
.rift-bar--no-color-in-data .rift-bar__data {
  color: var(--white);
}
.rift-bar--no-bar-background .rift-bar__data {
  padding: 4px 5px 4px 0;
  background-color: var(--background);
  box-shadow: var(--light-shadow);
  border-radius: var(--bar-radius);
}
.rift-bar--no-bar-background.rift-bar--no-shadow .rift-bar__data {
  box-shadow: none;
}
.rift-bar-icon-loader {
  flex: 0 0 10px;
  width: 10px;
  height: 10px;
  margin-right: 7px;
  background-color: currentColor;
  border-radius: 50%;
}
#rift-bar-click-effect {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
  touch-action: none;
  background-color: var(--click-effect);
  z-index: 2147483647;
}
`;

export { baseStyles as styles };
