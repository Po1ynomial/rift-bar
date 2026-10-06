import * as Uebersicht from "uebersicht";
import * as DataWidget from "./data-widget.jsx";
import * as DataWidgetLoader from "./data-widget-loader.jsx";
import * as Icons from "../icons/icons.jsx";
import { SuspenseIcon } from "../icons/icon.jsx";
import useWidget from "../../hooks/use-widget.js";
import { mic as definition } from "../../widgets/system.js";
import WidgetStatus from "./widget-status.jsx";
import * as Utils from "../../utils";
import { useSimpleBarContext } from "../simple-bar-context.jsx";

const { React } = Uebersicht;

export { definition };
export { micStyles as styles } from "../../styles/components/data/mic";

/**
 * Mic widget component.
 * @returns {JSX.Element} The rendered mic widget.
 */
export const Widget = React.memo(() => {
  const { displayIndex, settings } = useSimpleBarContext();
  const config = settings.micWidgetOptions;
  const { showIcon } = config;
  const visible = Utils.isVisibleOnDisplay(displayIndex, config.showOnDisplay) && settings.widgets.micWidget;
  const { data: state, status, error, refresh: getMic } = useWidget(definition, visible, config);
  const loading = status === "idle" || status === "loading";
  const { volume: _volume } = state || {};
  const [volume, setVolume] = React.useState();
  const [dragging, setDragging] = React.useState(false);
  React.useEffect(() => {
    if (_volume !== undefined) setVolume(parseInt(_volume, 10));
  }, [_volume]);
  if (!visible) return null;
  if (!loading && state === undefined) return <WidgetStatus name="mic" status={status} error={error} onRetry={getMic} />;

  if (loading) return <DataWidgetLoader.Widget className="mic" />;
  if (!state || volume === undefined || _volume === "missing value")
    return null;

  const Icon = !volume ? Icons.MicOff : Icons.MicOn;

  /**
   * Handle volume change event.
   * @param {React.ChangeEvent<HTMLInputElement>} e - The change event.
   */
  const onChange = (e) => {
    const value = parseInt(e.target.value, 10);
    setVolume(value);
    if (!dragging) setMic(value);
  };

  /**
   * Handle mouse down event on the slider.
   */
  const onMouseDown = () => setDragging(true);

  /**
   * Handle mouse up event on the slider.
   */
  const onMouseUp = () => { setDragging(false); setMic(volume); };

  const formattedVolume = `${volume.toString().padStart(2, "0")}%`;

  const classes = Utils.classNames("mic", {
    "mic--dragging": dragging,
  });

  return (
    <DataWidget.Widget status={status} title={error?.message} classes={classes} disableSlider>
      <div className="mic__display">
        {showIcon && (
          <SuspenseIcon>
            <Icon />
          </SuspenseIcon>
        )}
        <span className="mic__value">{formattedVolume}</span>
      </div>
      <div className="mic__slider-container">
        <input
          type="range"
          min="0"
          max="100"
          step="1"
          value={volume}
          className="mic__slider"
          onMouseDown={onMouseDown}
          onMouseUp={onMouseUp}
          onChange={onChange}
        />
      </div>
    </DataWidget.Widget>
  );
});

Widget.displayName = "Mic";

/**
 * Set the microphone volume.
 * @param {number} volume - The volume level to set.
 */
function setMic(volume) {
  if (volume === undefined) return;
  Uebersicht.run(`osascript -e 'set volume input volume ${volume}'`);
}
