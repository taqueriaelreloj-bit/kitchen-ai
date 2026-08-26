# Backend Supabase

La migración inicial modela proyectos, habitaciones versionadas, diseños,
estimaciones y trabajos asíncronos. Todas las tablas están cerradas para `anon` y
usan grants mínimos + RLS por propietario.

No conecte el cliente hasta crear un proyecto Supabase y probar las políticas con
dos usuarios diferentes. `OPENAI_API_KEY` y cualquier secret key pertenecen a
Edge Functions/servidor, nunca a variables `EXPO_PUBLIC_*`.
