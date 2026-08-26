# Prompt maestro — Kitchen AI Enterprise

Usa este prompt para continuar el desarrollo con cualquier agente de ingeniería.

---

Trabaja exclusivamente en `taqueriaelreloj-bit/kitchen-ai`. Es una aplicación
nueva e independiente. Nunca modifiques ni copies código de `blueprint-3d-studio`,
no mezcles repositorios y no crees otro repositorio.

## Misión

Construye una aplicación móvil de calidad multinacional para remodelación de
cocinas cuya experiencia principal sea:

**SCAN KITCHEN → AI DESIGN → CHOOSE DESIGN → CUSTOMIZE → SEE PRICE**

Una persona de 70 años sin experiencia en diseño debe completar el recorrido sin
capacitación. Prioriza claridad, confianza, accesibilidad, privacidad y
recuperación ante errores sobre densidad de funciones.

## Plataformas aprobadas

- Expo SDK estable + React Native + TypeScript para el producto iOS/Android.
- EAS Build, Submit y Update con canales separados para preview y producción.
- RoomPlan/ARKit mediante módulo nativo en iPhone/iPad compatible con LiDAR.
- ARCore Depth mediante módulo nativo en Android compatible.
- Cámara guiada/fotogrametría como fallback universal.
- Supabase para Postgres, Auth, Storage privado y Edge Functions, siempre con
  grants mínimos y Row Level Security comprobada.
- OpenAI Responses/Image APIs únicamente desde Edge Functions o backend; jamás
  expongas claves en la aplicación móvil.
- Sentry para crashes y rendimiento sin adjuntar fotos, geometría ni PII.

## Reglas de arquitectura

1. Toda captura produce el mismo `RoomModel` versionado; la UI no conoce ARKit ni
   ARCore.
2. Conserva puertas, ventanas, plomería, electricidad y escala como restricciones
   duras en diseños y renders.
3. Los proveedores de reconstrucción, diseño, catálogo y precio implementan
   interfaces sustituibles y tienen fallback controlado.
4. Usa procesamiento local primero. Antes de subir fotos o geometría, muestra
   propósito, retención y consentimiento revocable.
5. RLS y grants protegen cada tabla/bucket; service keys solo viven en servidor.
6. Versiona esquemas, prompts, modelos y reglas de precio para reproducibilidad.
7. Ningún precio se presenta como cotización final sin catálogo, ubicación,
   impuestos, instalación y validación profesional.

## Calidad obligatoria

- WCAG 2.2 AA: texto escalable, contraste, lector de pantalla, targets ≥44×44,
  reduced motion y flujo usable sin color como única señal.
- Estados loading/empty/error/offline/retry en cada operación remota.
- Idempotencia, timeouts, cancelación y reintentos con backoff en trabajos IA.
- Tests unitarios de dominio, integración de adaptadores, flujos E2E críticos y
  pruebas de políticas RLS.
- Typecheck, tests, lint, Expo Doctor y build deben pasar antes de cada entrega.
- Métricas de negocio sin PII: finalización de escaneo, calidad, selección,
  abandono, latencia, costo IA y errores por dispositivo.
- Presupuestos: arranque <2.5 s en dispositivos objetivo, respuesta táctil <100 ms,
  crash-free sessions ≥99.8%, disponibilidad backend ≥99.9%.

## Método de trabajo

Antes de cambiar código inspecciona estado Git, roadmap, tests y arquitectura.
Conserva funciones útiles. Implementa vertical slices funcionales, no solo
pantallas. Después de cada incremento ejecuta typecheck, tests y build, corrige
errores, actualiza roadmap y crea un commit pequeño y descriptivo. No uses
servicios externos ni publiques datos sin autorización. Continúa autónomamente
mientras haya una tarea clara; detente únicamente cuando haga falta una cuenta,
credencial, dispositivo físico, instalación o decisión comercial del propietario.

## Orden de ejecución

1. Captura espacial y calibración confiable.
2. Modelo de cocina versionado con restricciones.
3. Backend seguro y trabajos IA asíncronos.
4. Diseños/renders que preservan geometría.
5. Personalización simple y catálogo real.
6. Precios localizados y cotización profesional.
7. Observabilidad, accesibilidad, E2E, privacidad y lanzamiento gradual.

Empieza por la primera tarea incompleta del roadmap y lleva el incremento hasta
un estado probado, documentado y desplegable.

---
