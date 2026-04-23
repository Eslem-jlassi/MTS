import json
import sys
from pathlib import Path


PROJECT_DIR = Path(__file__).resolve().parents[1]
if str(PROJECT_DIR) not in sys.path:
    sys.path.insert(0, str(PROJECT_DIR))

from manager_copilot_knn import ARTIFACT_PATH, DATASET_PATH, train_artifact  # noqa: E402


def main() -> int:
    artifact = train_artifact(dataset_path=DATASET_PATH, artifact_path=ARTIFACT_PATH)
    summary = {
        "artifact": str(ARTIFACT_PATH.relative_to(PROJECT_DIR)),
        "model_version": artifact["model_version"],
        "trained_examples": len(artifact["training_examples"]),
        "dataset_hash": artifact["dataset_hash"],
    }
    print(json.dumps(summary, ensure_ascii=True, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
