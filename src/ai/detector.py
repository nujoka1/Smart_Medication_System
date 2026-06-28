import logging, numpy as np
from pathlib import Path
log = logging.getLogger(__name__)

class PillDetector:
    def __init__(self, model_path, conf=0.5, iou=0.45, imgsz=320):
        self.conf, self.iou, self.imgsz = conf, iou, imgsz
        self._interp, self._names = None, []
        self._in_idx = self._out_idx = None

        if not Path(model_path).exists():
            log.warning(f"Model not found: {model_path} — simulation mode")
            return
        try:
            from ai_edge_litert.interpreter import Interpreter
            self._interp = Interpreter(model_path=str(model_path), num_threads=4)
            self._interp.allocate_tensors()
            self._in_idx  = self._interp.get_input_details()[0]["index"]
            self._out_idx = self._interp.get_output_details()[0]["index"]
            shape = self._interp.get_input_details()[0]["shape"]
            self.imgsz = int(shape[1])
            log.info(f"TFLite loaded: {model_path} imgsz={self.imgsz}")
        except Exception as e:
            log.error(f"TFLite load failed: {e}")

    def _pre(self, path):
        import cv2
        img = cv2.resize(
            cv2.cvtColor(cv2.imread(path), cv2.COLOR_BGR2RGB),
            (self.imgsz, self.imgsz))
        return np.expand_dims(img.astype(np.float32) / 255.0, 0)

    def _nms(self, boxes, scores):
        idx = np.argsort(scores)[::-1]; keep = []
        while len(idx):
            i = idx[0]; keep.append(i)
            if len(idx) == 1: break
            b = boxes[idx[1:]]
            x1=np.maximum(boxes[i,0],b[:,0]); y1=np.maximum(boxes[i,1],b[:,1])
            x2=np.minimum(boxes[i,2],b[:,2]); y2=np.minimum(boxes[i,3],b[:,3])
            inter=np.maximum(0,x2-x1)*np.maximum(0,y2-y1)
            union=((boxes[i,2]-boxes[i,0])*(boxes[i,3]-boxes[i,1])+
                   (b[:,2]-b[:,0])*(b[:,3]-b[:,1])-inter)
            idx = idx[1:][inter/(union+1e-6) < self.iou]
        return keep

    def detect(self, image_path):
        if not self._interp:
            log.warning("[SIM] dummy detection")
            return [{"class":"aspirin_ultra_500_mg","confidence":0.99,"bbox":[0,0,320,320]}]
        blob = self._pre(image_path)
        self._interp.set_tensor(self._in_idx, blob)
        self._interp.invoke()
        raw   = self._interp.get_tensor(self._out_idx)
        preds = raw[0]
        boxes = preds[:, :4]
        scores= preds[:, 4:]
        cids  = np.argmax(scores, 1)
        conf  = scores[np.arange(len(scores)), cids]
        mask  = conf >= self.conf
        boxes, cids, conf = boxes[mask], cids[mask], conf[mask]
        if not len(conf):
            log.info("No pills detected")
            return []
        cx,cy,w,h = boxes[:,0],boxes[:,1],boxes[:,2],boxes[:,3]
        xyxy = np.stack([cx-w/2, cy-h/2, cx+w/2, cy+h/2], 1)
        keep = self._nms(xyxy, conf)
        out  = [{"class": self._names[cids[i]] if self._names else f"cls_{cids[i]}",
                 "confidence": float(conf[i]),
                 "bbox": xyxy[i].tolist()} for i in keep]
        log.info(f"Detected {len(out)} pill(s): {[d['class'] for d in out]}")
        return out

    def load_class_names(self, yaml_path):
        import yaml
        with open(yaml_path) as f:
            self._names = yaml.safe_load(f).get("names", [])
        log.info(f"Loaded {len(self._names)} class names")

    def verify(self, image_path, expected_classes):
        dets  = self.detect(image_path)
        found = {d["class"] for d in dets}
        exp   = set(expected_classes)
        return {"pass": found >= exp, "detections": dets,
                "missing": list(exp-found), "unexpected": list(found-exp)}
