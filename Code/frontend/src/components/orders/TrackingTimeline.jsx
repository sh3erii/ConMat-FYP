import { CheckCircle, Clock } from 'lucide-react';
import './TrackingTimeline.css';

export default function TrackingTimeline({ events = [] }) {
  return (
    <section className="tracking-timeline">
      {events.map((event, index) => (
        <article className="tracking-timeline__item" key={event.id || event.status}>
          <div className={`tracking-timeline__marker ${event.completed ? 'tracking-timeline__marker--done' : ''}`}>
            {event.completed ? <CheckCircle /> : <Clock />}
          </div>
          {index < events.length - 1 && <span className="tracking-timeline__line" />}
          <div className="tracking-timeline__content">
            <div>
              <h3>{event.status}</h3>
              <p>{event.description}</p>
            </div>
            <time>{event.createdAt}</time>
          </div>
        </article>
      ))}
    </section>
  );
}
