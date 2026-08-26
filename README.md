# Kitchen AI

Aplicación móvil para convertir el escaneo guiado de una cocina en propuestas de
diseño personalizables con estimación de precio.

## Experiencia principal

**SCAN KITCHEN → AI DESIGN → CHOOSE DESIGN → CUSTOMIZE → SEE PRICE**

El producto se desarrolla como una aplicación independiente para iPhone y
Android. Consulta [ROADMAP.md](./ROADMAP.md) para ver el alcance, las decisiones
técnicas y el estado del MVP.

## Ejecutar localmente

Requiere Node.js 22.13 o posterior.

```bash
npm install
npm start
```

Escanee el código QR con Expo Go para probar la cámara en iPhone o Android. Para
validar el proyecto sin un teléfono:

```bash
npm run typecheck
npm test
npm run build:web
```

## Alcance actual

El MVP captura cuatro vistas reales con la cámara y completa todo el recorrido
del producto. La reconstrucción geométrica y las propuestas se implementan por
ahora con servicios locales deterministas: son contratos funcionales que serán
reemplazados por RoomPlan/ARCore y un backend multimodal en las siguientes fases.

La base nativa está en `modules/kitchen-spatial`: detecta soporte RoomPlan/LiDAR
en Apple y ARCore/Depth en Android, conserva cámara guiada como fallback y compila
en un development build real. Consulta `docs/ANDROID_SETUP.md` para reproducirlo.
