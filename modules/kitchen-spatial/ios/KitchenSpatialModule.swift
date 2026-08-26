import ExpoModulesCore
import RoomPlan

public class KitchenSpatialModule: Module {
  public func definition() -> ModuleDefinition {
    Name("KitchenSpatial")

    AsyncFunction("getCapabilities") { () -> [String: Any] in
      let supported = RoomCaptureSession.isSupported
      return [
        "provider": supported ? "roomplan" : "guided-camera",
        "roomPlanSupported": supported,
        "arCoreSupported": false,
        "depthSupported": supported,
        "status": supported ? "SUPPORTED" : "LIDAR_NOT_AVAILABLE"
      ]
    }
  }
}
