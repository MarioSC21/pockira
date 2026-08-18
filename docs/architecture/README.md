# Arquitectura de Pockira

Este directorio contiene las decisiones técnicas reutilizables y los límites estructurales del proyecto. La arquitectura debe aplicarse junto con las especificaciones del producto, pero cada documento conserva una responsabilidad distinta.

## Documentos relacionados

| Documento | Responsabilidad |
| --- | --- |
| [Arquitectura modular por features](./modular-feature-architecture.md) | Define la organización del frontend, los límites entre módulos y las reglas de dependencias dentro de `src` |
| [Especificación funcional](../spec/README.md) | Define el comportamiento esperado de Pockira, el alcance del MVP, los flujos y las reglas del producto |
| [Especificación del backend](../spec-backend/README.md) | Traduce el dominio a tablas, relaciones, autorización RLS y decisiones de persistencia |
| [Modelo de tablas](../spec-backend/tables.md) | Detalla columnas, restricciones, índices, permisos y eventos Realtime |
| [Diagrama entidad-relación](../spec-backend/database-er-diagram.svg) | Presenta visualmente las entidades y sus relaciones principales |

## Orden de consulta

1. Consultar la especificación funcional para entender qué debe hacer la aplicación.
2. Consultar esta arquitectura para decidir dónde vive cada responsabilidad en el frontend.
3. Consultar la especificación del backend para conocer el modelo persistente y las reglas de autorización.
4. Volver a la especificación funcional cuando una decisión técnica pueda modificar el comportamiento del producto.

La arquitectura no reemplaza la especificación funcional, y el esquema del backend no debe convertirse en la estructura de módulos del frontend. Los módulos representan capacidades del producto; las tablas representan persistencia y relaciones de datos.
