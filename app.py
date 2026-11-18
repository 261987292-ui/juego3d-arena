from flask import Flask, jsonify, render_template, request

app = Flask(__name__)

_scores = []


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/status")
def status():
    return jsonify({
        "status": "online",
        "service": "juego3d-arena",
        "targets": 10,
    })


@app.route("/api/scores", methods=["GET", "POST"])
def scores():
    if request.method == "POST":
        data = request.get_json(silent=True) or {}
        score = {
            "name": str(data.get("name", "Jugador"))[:20],
            "score": max(0, int(data.get("score", 0))),
        }
        _scores.append(score)
        _scores.sort(key=lambda item: item["score"], reverse=True)
        del _scores[10:]
        return jsonify({"ok": True, "scores": _scores}), 201

    return jsonify({"scores": _scores})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
