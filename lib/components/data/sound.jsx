import * as Uebersicht from "uebersicht";
import * as DataWidget from "./data-widget.jsx";
import * as DataWidgetLoader from "./data-widget-loader.jsx";
import * as Icons from "../icons/icons.jsx";
import { SuspenseIcon } from "../icons/icon.jsx";
import useWidget from "../../hooks/use-widget.js";
import { sound as definition } from "../../widgets/system.js";
import WidgetStatus from "./widget-status.jsx";
import { useSimpleBarContext } from "../rift-bar-context.jsx";
import * as Utils from "../../utils";

export { definition };
export { soundStyles as styles } from "../../styles/components/data/sound";

const { React } = Uebersicht;

/**
 * Sound widget component.
 * @returns {JSX.Element|null} The sound widget.
 */
export const Widget = React.memo(() => {
  const { displayUuid, settings } = useSimpleBarContext();
  const config = settings.widgets.volume;
  const { show_icon } = config;
  const visible = Utils.isVisibleOnDisplay(displayUuid, config.displays) && config.enabled;
  const { data: state, status, error, refresh: getSound } = useWidget(definition, visible, config);
  const loading = status === "idle" || status === "loading";
  const { volume: _volume } = state || {};
  const [volume, setVolume] = React.useState();
  const [dragging, setDragging] = React.useState(false);
  React.useEffect(() => {
    if (_volume !== undefined) setVolume(parseInt(_volume, 10));
  }, [_volume]);
  if (!visible) return null;
  if (!loading && state === undefined)
    return <WidgetStatus name="sound" status={status} error={error} onRetry={getSound} />;

  if (loading) return <DataWidgetLoader.Widget className="sound" />;
  if (!state || volume === undefined) return null;

  const { muted } = state;
  if (_volume === "missing value" || muted === "missing value") return null;

  let Icon = Icons.VolumeHigh;
  if (volume < 50) Icon = Icons.VolumeLow;
  if (volume < 20) Icon = Icons.NoVolume;
  if (muted === "true" || !volume) Icon = Icons.VolumeMuted;

  /**
   * Handle volume change event.
   * @param {React.ChangeEvent<HTMLInputElement>} e - The change event.
   */
  const onChange = (e) => {
    const value = parseInt(e.target.value, 10);
    setVolume(value);
    if (!dragging) setSound(value);
  };

  const onMouseDown = () => setDragging(true);
  const onMouseUp = () => {
    setDragging(false);
    setSound(volume);
  };

  const formattedVolume = `${volume.toString().padStart(2, "0")}%`;

  const classes = Utils.classNames("sound", {
    "sound--dragging": dragging,
  });

  return (
    <DataWidget.Widget status={status} title={error?.message} classes={classes} disableSlider>
      <div className="sound__display">
        {show_icon && (
          <SuspenseIcon>
            <Icon />
          </SuspenseIcon>
        )}
        <span className="sound__value">{formattedVolume}</span>
      </div>
      <div className="sound__slider-container">
        <input
          type="range"
          min="0"
          max="100"
          step="1"
          value={volume}
          className="sound__slider"
          onMouseDown={onMouseDown}
          onMouseUp={onMouseUp}
          onChange={onChange}
        />
      </div>
    </DataWidget.Widget>
  );
});

Widget.displayName = "Sound";

/**
 * Set the system volume.
 * @param {number} volume - The volume to set.
 */
function setSound(volume) {
  if (volume === undefined) return;
  Uebersicht.run(`osascript -e 'set volume output volume ${volume}'`);
}
