from flask import Flask, request, render_template_string

app = Flask(__name__)

HTML_TEMPLATE = """
<!DOCTYPE html>
<html>
<head>
    <title>Custom Vulnerable Target App</title>
    <style>
        body { font-family: sans-serif; margin: 40px; background: #0f172a; color: #f8fafc; }
        .box { background: #1e293b; padding: 24px; border-radius: 8px; max-width: 600px; }
        input[type=text] { width: 80%; padding: 8px; border-radius: 4px; border: 1px solid #475569; }
        button { padding: 8px 16px; background: #3b82f6; color: white; border: none; border-radius: 4px; cursor: pointer; }
    </style>
</head>
<body>
    <div class="box">
        <h2>Custom Vulnerable Target Endpoint</h2>
        <p>This is a local dummy application intentionally lacking security headers and reflecting user inputs.</p>
        <form method="GET" action="/">
            <input type="text" name="q" placeholder="Enter query..." value="{{ query }}">
            <button type="submit">Search</button>
        </form>
        {% if query %}
            <p>Search Results for: <b>{{ query|safe }}</b></p>
        {% endif %}
    </div>
</body>
</html>
"""

@app.route("/", methods=["GET"])
def index():
    query = request.args.get("q", "")
    return render_template_string(HTML_TEMPLATE, query=query)

if __name__ == "__main__":
    print("[*] Running Custom Vuln App on http://127.0.0.1:5000")
    app.run(host="0.0.0.0", port=5000)
