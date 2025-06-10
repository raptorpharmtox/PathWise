import React, { useState } from "react";
import KEInputBlock from "./KEInputBlock";
import { submitAOP } from "../utils/api";

export default function AOPForm() {
  const [title, setTitle] = useState("");
  const [keyEvents, setKeyEvents] = useState([]);
  const [relationships, setRelationships] = useState([]);
  const [keCount, setKeCount] = useState(1);
  const [relCount, setRelCount] = useState(1);

  const addKE = () => {
    setKeyEvents([...keyEvents, {
      id: `KE:${keCount}`,
      title: "",
      description: "",
      mie: false,
      adverse_outcome: false
    }]);
    setKeCount(keCount + 1);
  };

  const deleteKE = (index) => {
    const idToDelete = keyEvents[index].id;
    const updatedKEs = keyEvents.filter((_, i) => i !== index);
    setKeyEvents(updatedKEs);
    setRelationships(relationships.filter(rel => rel.source !== idToDelete && rel.target !== idToDelete));
    setKeCount(prev => prev - 1);
    };

  const updateKE = (index, field, value) => {
    const copy = [...keyEvents];
    copy[index][field] = value;
    setKeyEvents(copy);
  };

  const addRelationship = () => {
    setRelationships([...relationships, {
      id: `KER:${relCount}`,
      source: "",
      target: "",
      relationship: [""]
    }]);
    setRelCount(relCount + 1);
  };

  const deleteRelationship = (index) => {
    setRelationships(relationships.filter((_, i) => i !== index));
    setRelCount(prev => prev - 1);
  };


  const updateRelationship = (index, field, value) => {
    const copy = [...relationships];
    if (field === "relationship") {
      copy[index][field] = value.split(",").map(s => s.trim());
    } else {
      copy[index][field] = value;
    }
    setRelationships(copy);
  };

  const resetForm = () => {
    setTitle("");
    setKeyEvents([]);
    setRelationships([]);
    setKeCount(1);
    setRelCount(1);
  };

  const validateAOP = () => {
    if (keyEvents.length === 0) return "You must define at least one Key Event.";
    if (relationships.length === 0) return "You must define at least one relationship.";

    const keIds = keyEvents.map(ke => ke.id);
    const involved = new Set();
    relationships.forEach(rel => {
      involved.add(rel.source);
      involved.add(rel.target);
    });

    const missing = keIds.filter(id => !involved.has(id));
    if (missing.length > 0) {
      return `Each Key Event must be involved in at least one relationship. Missing: ${missing.join(", ")}`;
    }
    return null;
  };

  const handleSubmit = async () => {
    const error = validateAOP();
    if (error) {
      alert(error);
      return;
    }

    const aop = {
      title,
      key_events: keyEvents,
      key_event_relationships: relationships
    };

    const res = await submitAOP(aop);
    alert(res.message);
    resetForm();
  };

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Create Pathway</h1>
      <input className="block mb-4 w-full" placeholder="AOP Title" value={title} onChange={e => setTitle(e.target.value)} />

      <h2 className="text-xl mb-2">Key Events</h2>
      {keyEvents.map((ke, i) => (
        <div key={i} className="border p-2 mb-2 rounded relative">
          <KEInputBlock ke={ke} onChange={updateKE} index={i} />
          <button onClick={() => deleteKE(i)} className="absolute top-2 right-2 text-red-600">X</button>
        </div>
      ))}
      <button onClick={addKE} className="bg-blue-500 text-white px-4 py-2 rounded mb-4">Add Key Event</button>

      <h2 className="text-xl mb-2">Key Event Relationships</h2>
      {relationships.map((r, i) => (
        <div key={i} className="border p-2 mb-2 rounded relative">
          <button onClick={() => deleteRelationship(i)} className="absolute top-2 right-2 text-red-600">X</button>
          <input disabled value={r.id} />
          <input placeholder="Source KE ID" value={r.source} onChange={e => updateRelationship(i, "source", e.target.value)} />
          <input placeholder="Target KE ID" value={r.target} onChange={e => updateRelationship(i, "target", e.target.value)} />
          <input placeholder='Relationship (e.g., activated/inhibited)' value={r.relationship.join(", ")} onChange={e => updateRelationship(i, "relationship", e.target.value)} />
        </div>
      ))}
      <button onClick={addRelationship} className="bg-green-500 text-white px-4 py-2 rounded mb-12">Add Relationship</button>

      <div className="flex justify-end">
        <button onClick={handleSubmit} className="bg-purple-600 text-white px-6 py-3 rounded shadow-md">Save AOP</button>
      </div>
    </div>
  );
}
