import React from "react";

export default function KEInputBlock({ ke, onChange, index }) {
  return (
    <div className="border p-2 mb-2 rounded">
      <h4>Key Event {index + 1}</h4>
      <input placeholder="ID (e.g., KE:1)" value={ke.id} onChange={e => onChange(index, 'id', e.target.value)} />
      <input placeholder="Title" value={ke.title} onChange={e => onChange(index, 'title', e.target.value)} />
      <input placeholder="Description" value={ke.description} onChange={e => onChange(index, 'description', e.target.value)} />
      <label>
        MIE:
        <input type="checkbox" checked={ke.mie} onChange={e => onChange(index, 'mie', e.target.checked)} />
      </label>
      <label>
        Adverse Outcome:
        <input type="checkbox" checked={ke.adverse_outcome} onChange={e => onChange(index, 'adverse_outcome', e.target.checked)} />
      </label>
    </div>
  );
}
