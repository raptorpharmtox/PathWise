from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from storage import save_aop, get_all_aops

app = Flask(__name__)
CORS(app)

@app.route("/aops/create", methods=["POST"])
def create_aop():
    data = request.get_json()
    try:
        save_aop(data)
        return jsonify({"message": "AOP saved successfully!"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route("/aops", methods=["GET"])
def list_aops():
    return jsonify(get_all_aops())

if __name__ == "__main__":
    os.makedirs("data/aops", exist_ok=True)
    app.run(port=5001, debug=True)
