# ADR 0001: Plataforma empresarial

**Estado:** aceptada · **Fecha:** 2026-08-26

## Decisión

Mantener Expo/React Native como capa de producto, añadir captura espacial mediante
módulos nativos específicos y centralizar datos/servicios en un backend Supabase.
La generación de imágenes se ejecutará desde servidor con OpenAI. EAS administrará
compilaciones/distribución y Sentry la observabilidad.

## Motivos

- Apple RoomPlan usa cámara y LiDAR para producir modelos paramétricos con paredes,
  puertas, ventanas, objetos y dimensiones; es la opción de mayor fidelidad en
  hardware Apple compatible.
- ARCore Depth combina profundidad por movimiento y sensores ToF disponibles; es
  la alternativa oficial con mayor cobertura Android, aunque requiere fallback.
- Expo permite compartir interfaz y dominio sin impedir módulos nativos, y EAS
  ofrece builds iOS/Android, firma, distribución interna y canales de actualización.
- Supabase reúne Postgres, Auth, Storage y funciones con control granular mediante
  grants y RLS. Su arquitectura evita encerrar el modelo de negocio en una base no
  relacional propietaria.
- Las claves y solicitudes OpenAI deben residir en servidor para aplicar límites,
  moderación, versionado, auditoría y control de costos.

## Alternativas descartadas

- **Unity como aplicación completa:** potente para 3D, pero aumenta peso y
  complejidad para una experiencia principalmente móvil/formularios.
- **Solo cámara/IA monocular:** mayor cobertura, pero no ofrece precisión espacial
  comparable a sensores nativos.
- **Firebase como backend principal:** sólido, pero Postgres + RLS se ajustan mejor
  a proyectos, catálogos, versiones, cotizaciones y reporting relacional.
- **Claves IA en el cliente:** inaceptable por seguridad y control de costos.

## Fuentes oficiales

- [Apple RoomPlan](https://developer.apple.com/augmented-reality/roomplan/)
- [Google ARCore Depth](https://developers.google.com/ar/develop/depth)
- [Expo EAS Build](https://docs.expo.dev/build/)
- [Expo EAS Update](https://docs.expo.dev/build/updates/)
- [Supabase Architecture](https://supabase.com/docs/guides/getting-started/architecture)
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Expo + Sentry](https://docs.expo.dev/guides/using-sentry/)
