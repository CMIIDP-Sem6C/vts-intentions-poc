import { useEffect, useRef } from 'react';

/**
 * Fires scenario events when elapsed time since resetKey change reaches trigger_time.
 * Events must be pre-sorted by trigger_time ascending (API guarantees this).
 */
export default function useScenarioEventEngine({
  events,
  resetKey,
  onSpawnShip,
  onHideIntention,
  onShowIntention,
}) {
  const startMsRef = useRef(null);
  const nextIndexRef = useRef(0);
  const handlersRef = useRef({ onSpawnShip, onHideIntention, onShowIntention });

  useEffect(() => {
    handlersRef.current = { onSpawnShip, onHideIntention, onShowIntention };
  }, [onSpawnShip, onHideIntention, onShowIntention]);

  useEffect(() => {
    startMsRef.current = performance.now();
    nextIndexRef.current = 0;
    if (!events?.length) return undefined;

    const tickMs = 100;
    const run = () => {
      const t0 = startMsRef.current;
      if (t0 == null) return;
      const elapsed = (performance.now() - t0) / 1000;
      const { onSpawnShip: spawn, onHideIntention: hide, onShowIntention: show } = handlersRef.current;

      while (nextIndexRef.current < events.length) {
        
        const ev = events[nextIndexRef.current];
        console.log("Engine checking event:", ev.type, "at time:", ev.trigger_time);
        if (ev.trigger_time > elapsed) break;
        nextIndexRef.current += 1;

        const sid = ev.subject_id != null ? String(ev.subject_id) : null;
        const st = (ev.subject_type || '').toLowerCase();

        switch (ev.type) {
          case 'SpawnShip':
            if (st === 'ship' && sid) spawn(sid);
            break;
          case 'HideIntention':
            if (st === 'ship' && sid) hide(sid);
            break;
          case 'ShowIntention':
            if (st === 'ship' && sid) show(sid);
            break;
          default:
            break;
        }
      }
    };

    run();
    const id = setInterval(run, tickMs);
    return () => clearInterval(id);
  }, [events, resetKey]);
}
