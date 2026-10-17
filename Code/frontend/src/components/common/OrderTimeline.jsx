import './OrderTimeline.css';

export default function OrderTimeline({ steps = [] }) {
  if (!steps.length) {
    return (
      <div className="order-timeline-empty">
        No order progress has been recorded yet.
      </div>
    );
  }

  return (
    <div className="order-timeline">
      {steps.map((step, index) => (
        <div className="order-timeline__item" key={`${step.title}-${index}`}>
          <div className="order-timeline__marker">
            <span>{index + 1}</span>
          </div>
          <div className="order-timeline__content">
            <div className="order-timeline__head">
              <h4>{step.title}</h4>
              <time>{step.date}</time>
            </div>
            <p>{step.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
