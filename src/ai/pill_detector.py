#!/usr/bin/env python3
"""
Real ONNX YOLO Pill Detector
- Uses models/best.onnx
- Reads class names from data/ai_classes.txt
- Returns class, confidence, bbox, and all detections
"""

from pathlib import Path
import numpy as np
from PIL import Image


class PillDetector:
    def __init__(self, model_path=None, names_path=None, conf=0.35, iou=0.45):
        self.root = Path(__file__).resolve().parents[2]

        self.model_path = Path(model_path) if model_path else self.root / "models" / "best.onnx"
        self.names_path = Path(names_path) if names_path else self.root / "data" / "ai_classes.txt"

        self.conf = float(conf)
        self.iou = float(iou)

        self.session = None
        self.input_name = None
        self.input_size = 640
        self.names = []

        self._load_names()
        self._load_model()

    def _load_names(self):
        if self.names_path.exists():
            self.names = [
                line.strip()
                for line in self.names_path.read_text().splitlines()
                if line.strip()
            ]
        else:
            self.names = []

    def _load_model(self):
        import onnxruntime as ort

        if not self.model_path.exists():
            raise FileNotFoundError(f"Model not found: {self.model_path}")

        self.session = ort.InferenceSession(
            str(self.model_path),
            providers=["CPUExecutionProvider"]
        )

        inp = self.session.get_inputs()[0]
        self.input_name = inp.name

        # Input shape normally [1, 3, 640, 640]
        shape = inp.shape
        try:
            self.input_size = int(shape[-1])
        except Exception:
            self.input_size = 640

        out_shape = self.session.get_outputs()[0].shape
        print(f"✓ ONNX detector loaded: {self.model_path}")
        print(f"✓ Input: {shape}")
        print(f"✓ Output: {out_shape}")
        print(f"✓ Loaded class names: {len(self.names)}")

    def _preprocess(self, image_path):
        img = Image.open(image_path).convert("RGB")
        orig_w, orig_h = img.size

        resized = img.resize((self.input_size, self.input_size))
        arr = np.asarray(resized).astype(np.float32) / 255.0

        # HWC -> CHW
        arr = np.transpose(arr, (2, 0, 1))
        arr = np.expand_dims(arr, axis=0)

        return arr, orig_w, orig_h

    def _iou(self, box, boxes):
        x1 = np.maximum(box[0], boxes[:, 0])
        y1 = np.maximum(box[1], boxes[:, 1])
        x2 = np.minimum(box[2], boxes[:, 2])
        y2 = np.minimum(box[3], boxes[:, 3])

        inter = np.maximum(0, x2 - x1) * np.maximum(0, y2 - y1)

        area1 = max(0, box[2] - box[0]) * max(0, box[3] - box[1])
        area2 = np.maximum(0, boxes[:, 2] - boxes[:, 0]) * np.maximum(0, boxes[:, 3] - boxes[:, 1])

        union = area1 + area2 - inter + 1e-6
        return inter / union

    def _nms(self, boxes, scores):
        if len(boxes) == 0:
            return []

        idxs = np.argsort(scores)[::-1]
        keep = []

        while len(idxs) > 0:
            current = idxs[0]
            keep.append(current)

            if len(idxs) == 1:
                break

            rest = idxs[1:]
            ious = self._iou(boxes[current], boxes[rest])
            idxs = rest[ious < self.iou]

        return keep

    def detect_all(self, image_path):
        blob, orig_w, orig_h = self._preprocess(image_path)

        raw = self.session.run(None, {self.input_name: blob})[0]

        # YOLO ONNX often gives [1, C, N], example [1, 115, 8400]
        preds = raw[0]

        if preds.shape[0] < preds.shape[1]:
            preds = preds.T

        # Now expected shape: [N, 4 + classes]
        boxes_raw = preds[:, :4]
        scores_all = preds[:, 4:]

        num_classes = scores_all.shape[1]

        if self.names and len(self.names) != num_classes:
            print(f"⚠ Class count mismatch: model={num_classes}, names={len(self.names)}")
            print("⚠ Labels may be shifted if the names file does not match the trained model exactly.")

        class_ids = np.argmax(scores_all, axis=1)
        confs = scores_all[np.arange(len(scores_all)), class_ids]

        mask = confs >= self.conf

        boxes_raw = boxes_raw[mask]
        class_ids = class_ids[mask]
        confs = confs[mask]

        if len(confs) == 0:
            return []

        # YOLO xywh center format
        cx = boxes_raw[:, 0]
        cy = boxes_raw[:, 1]
        bw = boxes_raw[:, 2]
        bh = boxes_raw[:, 3]

        x1 = cx - bw / 2
        y1 = cy - bh / 2
        x2 = cx + bw / 2
        y2 = cy + bh / 2

        boxes = np.stack([x1, y1, x2, y2], axis=1)

        # If boxes are normalized 0-1, scale to model input size first
        if np.nanmax(boxes) <= 2.0:
            boxes[:, [0, 2]] *= self.input_size
            boxes[:, [1, 3]] *= self.input_size

        # Map resized 640x640 coordinates back to original image size
        scale_x = orig_w / self.input_size
        scale_y = orig_h / self.input_size

        boxes[:, [0, 2]] *= scale_x
        boxes[:, [1, 3]] *= scale_y

        # Clip to image bounds
        boxes[:, [0, 2]] = np.clip(boxes[:, [0, 2]], 0, orig_w - 1)
        boxes[:, [1, 3]] = np.clip(boxes[:, [1, 3]], 0, orig_h - 1)

        keep = self._nms(boxes, confs)

        detections = []

        for i in keep:
            cid = int(class_ids[i])
            label = self.names[cid] if cid < len(self.names) else f"cls_{cid}"

            detections.append({
                "class": label,
                "class_index": cid,
                "confidence": float(confs[i]),
                "bbox": [float(v) for v in boxes[i].tolist()]
            })

        detections.sort(key=lambda d: d["confidence"], reverse=True)
        return detections

    def detect(self, image_path):
        detections = self.detect_all(image_path)

        if not detections:
            return {
                "class": None,
                "confidence": 0.0,
                "bbox": None,
                "detections": []
            }

        top = detections[0]

        return {
            "class": top["class"],
            "confidence": top["confidence"],
            "bbox": top["bbox"],
            "detections": detections
        }


if __name__ == "__main__":
    import sys

    image = sys.argv[1] if len(sys.argv) > 1 else "/tmp/snap.jpg"

    d = PillDetector()
    print(d.detect(image))
