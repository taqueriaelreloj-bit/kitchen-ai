package com.taqueriaelreloj.kitchenspatial

import com.google.ar.core.ArCoreApk
import com.google.ar.core.Config
import com.google.ar.core.Session
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class KitchenSpatialModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("KitchenSpatial")

    AsyncFunction("getCapabilities") {
      val context = requireNotNull(appContext.reactContext)
      val availability = ArCoreApk.getInstance().checkAvailability(context)
      var depthSupported = false
      if (availability.isSupported && availability == ArCoreApk.Availability.SUPPORTED_INSTALLED) {
        depthSupported = try {
          val session = Session(context)
          try {
            session.isDepthModeSupported(Config.DepthMode.AUTOMATIC)
          } finally {
            session.close()
          }
        } catch (_: Exception) {
          false
        }
      }
      mapOf(
        "provider" to if (depthSupported) "arcore-depth" else "guided-camera",
        "roomPlanSupported" to false,
        "arCoreSupported" to availability.isSupported,
        "depthSupported" to depthSupported,
        "status" to availability.name
      )
    }
  }
}
