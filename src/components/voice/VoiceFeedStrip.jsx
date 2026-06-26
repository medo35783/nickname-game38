import { useEffect, useState } from 'react';
import {
  subscribePlatformNews,
  formatVoiceNewsDate,
  mergeNewsWithFallback,
} from '../../core/platformNews';

/**
 * شريط فاخر مدمج — آخر الأخبار + اقتراحات المجتمع (تبويب واحد يختصر الصفحة)
 */
export default function VoiceFeedStrip({ communitySuggestions = [] }) {
  const hasCommunity = communitySuggestions.length > 0;
  const [tab, setTab] = useState('news');
  const [news, setNews] = useState(() => mergeNewsWithFallback([]));

  useEffect(() => {
    const unsub = subscribePlatformNews(setNews);
    return unsub;
  }, []);

  return (
    <section className="voice-feed" aria-label="آخر الأخبار والمجتمع">
      <div className="voice-feed__head">
        <div className="voice-feed__tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'news'}
            className={`voice-feed__tab${tab === 'news' ? ' voice-feed__tab--on' : ''}`}
            onClick={() => setTab('news')}
          >
            🔔 آخر الأخبار
          </button>
          {hasCommunity ? (
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'community'}
              className={`voice-feed__tab${tab === 'community' ? ' voice-feed__tab--on' : ''}`}
              onClick={() => setTab('community')}
            >
              💡 المجتمع
              <span className="voice-feed__count">{communitySuggestions.length}</span>
            </button>
          ) : null}
        </div>
      </div>

      {tab === 'news' ? (
        <div className="voice-feed__track" role="tabpanel">
          {!news.length ? (
            <p className="voice-feed__empty">لا توجد أخبار حالياً — تابعنا قريباً.</p>
          ) : null}
          {news.map((n) => (
            <article
              key={n.id}
              className={`voice-feed__card${n.isNew ? ' voice-feed__card--new' : ''}`}
            >
              <div className="voice-feed__card-top">
                <time className="voice-feed__date" dateTime={n.date}>
                  {formatVoiceNewsDate(n.date)}
                </time>
                {n.isNew ? <span className="voice-feed__pill">جديد</span> : null}
              </div>
              <h3 className="voice-feed__title">{n.title}</h3>
              <p className="voice-feed__body">{n.body}</p>
            </article>
          ))}
        </div>
      ) : (
        <div className="voice-feed__track voice-feed__track--community" role="tabpanel">
          {communitySuggestions.map((s) => (
            <article key={s.id} className="voice-feed__card voice-feed__card--suggest">
              <div className="voice-feed__card-top">
                <span className="voice-feed__cat">{s.cat}</span>
                {s.date ? (
                  <time className="voice-feed__date" dateTime={s.date}>
                    {s.date}
                  </time>
                ) : null}
              </div>
              <p className="voice-feed__body">{s.text}</p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
