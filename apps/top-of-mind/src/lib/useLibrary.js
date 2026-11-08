import { useEffect, useRef, useState } from "react";
import { topOfMindApi as api } from "./api/topOfMindApi";
const writes = new Map();
export function useLibrary(key, defaults) {
  const [value, setValue] = useState(defaults);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const live = useRef(true);
  useEffect(() => {
    live.current = true;
    api
      .getLibrary()
      .then((data) => {
        if (live.current) {
          setValue(data[key] ?? defaults);
          setReady(true);
        }
      })
      .catch((e) => {
        if (live.current) setError(e.message);
      });
    return () => {
      live.current = false;
    };
  }, [key]);
  useEffect(() => {
    if (!ready) return;
    const previous = writes.get(key) || Promise.resolve();
    const write = previous.catch(() => {}).then(() => api.saveLibrary(key, value));
    writes.set(key, write);
    write
      .then(() => {
        if (live.current) setError("");
      })
      .catch((e) => {
        if (live.current) setError(e.message);
      });
  }, [key, value, ready]);
  return [value, setValue, ready, error];
}
