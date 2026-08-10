import "./explore-field.css";

export default function ExploreLoading() {
  return (
    <div className="explore-field-shell" aria-busy="true" aria-label="Loading Explore frontier field">
      <div className="explore-field-header">
        <div className="explore-field-kicker"><span>FRONTIER RADAR / EXPLORE</span><span>SCANNING</span></div>
        <div className="explore-field-heading-row">
          <div>
            <h1>CURRENT FRONTIER</h1>
            <p>Retuning the bounded candidate field.</p>
          </div>
        </div>
      </div>
      <div className="explore-field-stage">
        <div className="explore-field-scan" aria-hidden />
      </div>
    </div>
  );
}
