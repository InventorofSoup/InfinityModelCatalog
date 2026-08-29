export default function SculptCard({ record }) {
  const imageState = record.image?.state || "unverified";

  return (
    <article className="sculpt-card">
      <div className="image-frame">
        {record.image?.url ? (
          <img
            src={record.image.url}
            alt={record.sculptName || record.unitName}
          />
        ) : (
          <div className="image-placeholder">Image audit pending</div>
        )}

        <span className={`image-state ${imageState}`}>
          {imageState}
        </span>
      </div>

      <div className="sculpt-body">
        <p className="unit-name">{record.unitName}</p>

        <h3>
          {record.sculptName ||
            record.releaseName ||
            "Unnamed sculpt"}
        </h3>

        <div className="meta">
          {record.releaseYear ? <span>{record.releaseYear}</span> : null}

          {record.productCode ? (
            <span>{record.productCode}</span>
          ) : null}

          {record.releaseState ? (
            <span>{record.releaseState}</span>
          ) : null}
        </div>
      </div>
    </article>
  );
}
