import json
import argparse
from pathlib import Path
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier
from sklearn.pipeline import Pipeline
import joblib

STRESS_MAP = {
    "happy": 0,
    "neutral": 1,
    "sad": 2,
    "stressed": 3,
    "anxious": 4
}

def load_rows(path: Path):
    text = Path(path).read_text(encoding="utf-8")
    data = json.loads(text)

    if isinstance(data, dict):
        raise ValueError("features.json must be a list of rows, not a single object")

    X = []
    y = []

    for r in data:
        if not isinstance(r, dict):
            continue

        label = (r.get("label_mood") or "").lower()
        if label not in STRESS_MAP:
            continue

        try:
            features = [
                float(r.get("avgScreenTime", 0)),
                float(r.get("numNotifications", 0)),
                float(r.get("mentalScore", 0))
            ]
        except:
            continue

        X.append(features)
        y.append(STRESS_MAP[label])

    if not X:
        raise ValueError("No valid rows found. Check your JSON labels and feature names.")

    return X, y

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    X, y = load_rows(Path(args.input))

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    pipe = Pipeline([
        ("scaler", StandardScaler()),
        ("model", RandomForestClassifier(n_estimators=100, random_state=42))
    ])

    pipe.fit(X_train, y_train)
    score = pipe.score(X_test, y_test)

    print(f"✅ Model trained successfully! Accuracy: {score:.2f}")
    joblib.dump(pipe, args.output)
    print(f"✅ Model saved to: {args.output}")

if __name__ == "__main__":
    main()
