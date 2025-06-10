import os
import json

AOP_DIR = "data/aops"

def save_aop(aop_json):
    mies = [ke["title"] for ke in aop_json["key_events"] if ke.get("mie")]
    aos = [ke["title"] for ke in aop_json["key_events"] if ke.get("adverse_outcome")]

    if not mies or not aos:
        raise Exception("Must include at least one MIE and one Adverse Outcome.")

    aop_id = f"{mies[0].strip().lower().replace(' ', '_')}@{aos[0].strip().lower().replace(' ', '_')}"
    aop_json["aop_id"] = aop_id

    path = os.path.join(AOP_DIR, f"{aop_id}.json")
    if os.path.exists(path):
        raise Exception(f"AOP with ID '{aop_id}' already exists.")
    with open(path, "w") as f:
        json.dump(aop_json, f, indent=2)


def get_all_aops():
    out = []
    for fname in os.listdir(AOP_DIR):
        with open(os.path.join(AOP_DIR, fname)) as f:
            out.append(json.load(f))
    return out
