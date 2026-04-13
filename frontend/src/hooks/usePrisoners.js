import { useEffect, useState } from "react";

import { api } from "../services/api";

export function usePrisoners() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    api
      .get("/prisoners")
      .then((response) => {
        if (mounted) {
          setData(response.data);
        }
      })
      .catch(() => {
        if (mounted) {
          setData([]);
        }
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  return { data, loading };
}

