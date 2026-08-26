# Kitchen AI — Roadmap

## Estado inicial (2026-08-25)

El repositorio contenía únicamente un `README.md`. No había aplicación,
dependencias, pruebas, CI, backend ni código reutilizable.

## Principios de producto

- Una sola acción principal, grande y explícita por pantalla.
- Lenguaje cotidiano, sin herramientas CAD ni controles técnicos.
- Texto legible, alto contraste, objetivos táctiles amplios y ayuda contextual.
- El usuario siempre puede volver, repetir un paso o continuar con valores seguros.
- El precio es una estimación transparente, desglosada y actualizada al instante.

## Arquitectura objetivo

- **Móvil:** Expo + React Native + TypeScript para iOS y Android.
- **Captura:** cámara guiada en el MVP; adaptadores nativos futuros para RoomPlan
  (iOS/LiDAR) y ARCore Depth (Android).
- **Modelo de cocina:** representación neutral tipada (`RoomModel`) para que el
  resto de la app no dependa del proveedor de captura.
- **Diseño IA:** interfaz `DesignService`; generador determinista local durante el
  MVP y backend multimodal sustituible después.
- **Precios:** motor local y auditable en el MVP; catálogo/reglas remotas después.
- **Privacidad:** procesar localmente cuando sea posible y pedir consentimiento
  explícito antes de subir imágenes o geometría.

## Fases

### Fase 1 — MVP navegable y verificable (en curso)

- [ ] Proyecto Expo/React Native ejecutable en iPhone, Android y web.
- [ ] Onboarding accesible y flujo lineal de cinco pasos.
- [ ] Escaneo real con cámara, guía visual, permiso y progreso.
- [ ] Reconstrucción de habitación mediante un adaptador desacoplado.
- [ ] Modelo tipado de cocina y validación de medidas.
- [ ] Generación de tres propuestas distintas.
- [ ] Selección, personalización simple y precio en tiempo real.
- [ ] Persistencia local del proyecto.
- [ ] Pruebas unitarias del modelo, diseños y precios.
- [ ] CI con typecheck y tests.

### Fase 2 — Reconstrucción espacial nativa

- [ ] RoomPlan en dispositivos Apple con LiDAR.
- [ ] ARCore Depth/Scene Semantics en Android compatible.
- [ ] Captura fotogramétrica como fallback universal.
- [ ] Detección de muros, puertas, ventanas, tomas y plomería.
- [ ] Editor de medidas asistido y control de calidad del escaneo.

### Fase 3 — Diseños IA realistas

- [ ] Servicio backend autenticado y trabajos asíncronos.
- [ ] Segmentación de la cocina y render condicionado por geometría.
- [ ] Reglas de seguridad y ergonomía (pasillos, triángulo de trabajo, aperturas).
- [ ] Variantes fotorealistas que preservan puertas, ventanas y escala.

### Fase 4 — Catálogo y cotización

- [ ] Catálogo real de gabinetes, cubiertas, herrajes y electrodomésticos.
- [ ] Disponibilidad y precios por ubicación.
- [ ] Lista de materiales, instalación, impuestos y rangos de contingencia.
- [ ] Exportación/compartir y solicitud de cotización profesional.

## Criterios de salida del MVP

Un usuario nuevo puede completar el flujo sin instrucciones externas, recuperar
un proyecto, cambiar estilo/materiales y entender cómo se calculó el precio. El
proyecto compila, pasa typecheck/tests y no requiere servicios de pago para la
demostración inicial.
