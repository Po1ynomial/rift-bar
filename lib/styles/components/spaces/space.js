export const spaceStyles = /* css */ `
.space {
  position: relative;
  display: flex;
  align-items: center;
  animation: space-appearance 320ms var(--transition-easing);
}

@keyframes space-appearance {
  0% {
    opacity: 0;
  }
}
.space__inner {
  height: 100%;
  display: flex;
  align-items: center;
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
.simple-bar--spaces-background-color-as-foreground .space__inner {
  background-color: transparent;
  box-shadow: none;
}
.simple-bar--no-shadow .space__inner {
  box-shadow: none;
}
.space:first-of-type .space__inner {
  margin-left: 0;
}
.space:hover .space__inner {
  z-index: 1;
}
.space--focused .space__inner {
  color: var(--minor);
  background-color: var(--foreground);
}
.simple-bar--spaces-background-color-as-foreground .space--focused .space__inner {
  color: var(--foreground);
  background-color: transparent;
}
.space:not(.space--focused) .space__inner:hover {
  box-shadow: var(--light-shadow), var(--hover-ring);
}
.space:not(.space--focused) .space__inner:active {
  box-shadow: var(--light-shadow), var(--focus-ring);
}
.simple-bar--no-shadow .space:not(.space--focused) .space__inner:hover {
  box-shadow: var(--hover-ring);
}
.simple-bar--no-shadow .space:not(.space--focused) .space__inner:active {
  box-shadow: var(--focus-ring);
}
.space__icon {
  flex: 0 0 var(--font-size);
  width: var(--font-size);
  height: var(--font-size);
  margin-left: 6px;
  fill: currentColor;
  opacity: 0.5;
  transform: translateZ(0);
}
.space__icon--focused {
  opacity: 1;
}
`;
