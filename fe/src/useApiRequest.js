// useApiRequest.js
import { useState, useEffect } from 'react';
import axios from 'axios';

const useApiRequest = (endpoint, method = 'GET', body = null) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios({
          url: endpoint,
          method,
          data: body,
        });
        setData(response.data);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    fetchData();
  }, [endpoint, method, body]);

  return { data, loading, error };
};

export default useApiRequest;
