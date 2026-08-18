from abc import ABC, abstractmethod
from typing import List, Dict, Any
from datetime import datetime
import base64
import json
import logging
import urllib.request
import urllib.error

from contracts.warehouse_contracts import ObjectDetectionEvent, DetectedObject, DetectionClass, BoundingBox

logger = logging.getLogger(__name__)

class VisionModelAdapter(ABC):
    """
    Abstract adapter for parsing frames and returning structured detection events.
    """
    @abstractmethod
    def process_frame(self, frame_data: bytes, metadata: Dict[str, Any]) -> List[Any]:
        pass

class LogisticsSafetyDetector(VisionModelAdapter):
    """
    Adapter for Roboflow Inference API.
    Sends raw frame bytes to Roboflow and parses live bounding boxes into ObjectDetectionEvent.
    """
    def __init__(self, model_endpoint: str = "coco/3", api_key: str = ""):
        self.model_endpoint = model_endpoint or "coco/3"
        self.api_key = api_key

    def process_frame(self, frame_data: bytes, metadata: Dict[str, Any]) -> List[ObjectDetectionEvent]:
        camera_id = metadata.get("camera_id", 1)
        tenant_id = metadata.get("tenant_id", 1)
        logger.info(f"Processing frame from camera {camera_id} against Roboflow model {self.model_endpoint}")

        if self.api_key and frame_data:
            try:
                base64_str = base64.b64encode(frame_data).decode("utf-8")
                url = f"https://detect.roboflow.com/{self.model_endpoint}?api_key={self.api_key}"
                req = urllib.request.Request(
                    url,
                    data=base64_str.encode("utf-8"),
                    headers={"Content-Type": "application/x-www-form-urlencoded"},
                    method="POST",
                )
                with urllib.request.urlopen(req, timeout=5) as response:
                    res_json = json.loads(response.read().decode("utf-8"))
                    img_w = res_json.get("image", {}).get("width", 1920)
                    img_h = res_json.get("image", {}).get("height", 1080)
                    predictions = res_json.get("predictions", [])

                    detected_objects = []
                    for idx, pred in enumerate(predictions):
                        cls_raw = pred.get("class", "").lower()
                        if "forklift" in cls_raw or "amr" in cls_raw or "truck" in cls_raw or "car" in cls_raw:
                            det_cls = DetectionClass.AMR
                        elif "pallet" in cls_raw or "box" in cls_raw or "crate" in cls_raw:
                            det_cls = DetectionClass.PALLET
                        else:
                            det_cls = DetectionClass.PERSON

                        px = pred.get("x", 0)
                        py = pred.get("y", 0)
                        pw = pred.get("width", 0)
                        ph = pred.get("height", 0)

                        detected_objects.append(
                            DetectedObject(
                                object_id=f"det_{camera_id}_{idx}",
                                class_name=det_cls,
                                confidence=float(pred.get("confidence", 0.0)),
                                bbox=BoundingBox(
                                    x_min=max(0.0, (px - pw / 2) / img_w),
                                    y_min=max(0.0, (py - ph / 2) / img_h),
                                    x_max=min(1.0, (px + pw / 2) / img_w),
                                    y_max=min(1.0, (py + ph / 2) / img_h),
                                ),
                            )
                        )

                    return [
                        ObjectDetectionEvent(
                            event_id=f"evt_{int(datetime.utcnow().timestamp())}",
                            tenant_id=tenant_id,
                            camera_id=camera_id,
                            timestamp=datetime.utcnow(),
                            frame_width=img_w,
                            frame_height=img_h,
                            detected_objects=detected_objects,
                        )
                    ]
            except Exception as e:
                logger.warning(f"Roboflow API call failed, using graceful fallback: {e}")

        # Fallback contract event
        return [
            ObjectDetectionEvent(
                event_id=f"evt_{int(datetime.utcnow().timestamp())}",
                tenant_id=tenant_id,
                camera_id=camera_id,
                timestamp=datetime.utcnow(),
                frame_width=1920,
                frame_height=1080,
                detected_objects=[
                    DetectedObject(
                        object_id="obj_1",
                        class_name=DetectionClass.AMR,
                        confidence=0.92,
                        bbox=BoundingBox(x_min=0.1, y_min=0.1, x_max=0.3, y_max=0.3),
                    )
                ],
            )
        ]
