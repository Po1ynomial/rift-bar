export class WidgetUnavailable extends Error {
  constructor(message) {
    super(message);
    this.name = "WidgetUnavailable";
  }
}

export function defineWidget({ id, refreshFrequency, load, validate }) {
  if (
    !id ||
    typeof load !== "function" ||
    !Number.isFinite(refreshFrequency) ||
    refreshFrequency <= 0
  ) {
    throw new TypeError("A widget needs an ID, a loader, and a positive refresh frequency");
  }
  return Object.freeze({ id, refreshFrequency, load, validate });
}

export function widgetInterval(value, fallback) {
  const interval = Number(value);
  return Number.isFinite(interval) && interval > 0 ? Math.max(250, interval) : fallback;
}

/** One resource owns scheduling, state, and cancellation for one configuration. */
export function createWidgetResource(
  definition,
  config = {},
  { onChange = () => {}, timers = globalThis, timeoutMs = 15000, now = Date.now } = {},
) {
  const interval = widgetInterval(config.refreshFrequency, definition.refreshFrequency);
  let state = { status: "idle", data: undefined, error: undefined, updatedAt: undefined };
  let disposed = false;
  let scheduled, deadline, controller, running;
  let failures = 0;

  function publish(next) {
    if (disposed) return;
    state = { ...state, ...next };
    onChange(state);
  }

  function fail(error) {
    failures++;
    publish({
      status:
        state.data !== undefined
          ? "stale"
          : error instanceof WidgetUnavailable
            ? "unavailable"
            : "error",
      error,
    });
  }

  function refresh({ force = false } = {}) {
    if (disposed) return Promise.resolve();
    if (running) return running;
    timers.clearTimeout(scheduled);
    controller = new AbortController();
    const signal = controller.signal;
    let timedOut = false;
    publish({ status: state.data !== undefined ? "refreshing" : "loading" });
    deadline = timers.setTimeout(() => {
      timedOut = true;
      controller.abort();
      fail(new Error(`${definition.id} timed out`));
    }, timeoutMs);
    running = Promise.resolve()
      .then(() => {
        if (disposed || signal.aborted) return;
        return definition.load({ config, signal, force });
      })
      .then((data) => {
        if (disposed || signal.aborted) return;
        if (definition.validate && !definition.validate(data))
          throw new TypeError(`Invalid ${definition.id} snapshot`);
        failures = 0;
        publish({ status: "ready", data, error: undefined, updatedAt: now() });
      })
      .catch((error) => {
        if (!disposed && !timedOut) fail(error instanceof Error ? error : new Error(String(error)));
      })
      .finally(() => {
        timers.clearTimeout(deadline);
        running = undefined;
        if (disposed) return;
        const delay =
          state.error instanceof WidgetUnavailable
            ? interval
            : failures
              ? Math.min(interval, 60000, 1000 * 2 ** Math.min(failures - 1, 6))
              : interval;
        scheduled = timers.setTimeout(() => refresh({ force: failures > 0 }), delay);
      });
    return running;
  }

  return {
    get state() {
      return state;
    },
    refresh,
    stop() {
      disposed = true;
      timers.clearTimeout(scheduled);
      timers.clearTimeout(deadline);
      controller?.abort();
    },
  };
}
