import { useState, useEffect } from 'react';
import { fetchGameQuestions } from './qbank.helpers';

// const { questions, loading } = useQuestions({ gameType: 'qumayri', count: 15 });
// const { questions, loading } = useQuestions({ gameType: 'qumayri', category: 'religious', difficulty_level: 'medium', count: 10 });

export function useQuestions({ gameType, category, difficulty_level, audience, count = 10 } = {}) {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [refetchKey, setRefetchKey] = useState(0);

  useEffect(() => {
    let isActive = true;

    async function loadQuestions() {
      if (gameType == null) {
        setQuestions([]);
        setLoading(false);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const nextQuestions = await fetchGameQuestions({
          gameType,
          category,
          difficulty_level,
          audience,
          count,
        });

        if (isActive) {
          setQuestions(nextQuestions);
        }
      } catch (fetchError) {
        if (isActive) {
          setQuestions([]);
          setError(fetchError);
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    }

    loadQuestions();

    return () => {
      isActive = false;
    };
  }, [gameType, category, difficulty_level, audience, count, refetchKey]);

  function refetch() {
    setRefetchKey((key) => key + 1);
  }

  return { questions, loading, error, refetch };
}
