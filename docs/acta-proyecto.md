# Acta de constitución del proyecto

> Los datos marcados como **[COMPLETAR]** no se conocen todavía y deben llenarse antes de presentar el documento.

## 1. Datos generales

| | |
|---|---|
| **Nombre del proyecto** | Sistema web de diagnóstico y monitoreo de sitios web para optimizar el mantenimiento y la captación de clientes en una agencia de marketing digital, Lima 2026 |
| **Organización** | Grupo ConsigueVentas Inversiones E.I.R.L. (agencia de marketing digital, Lima) |
| **Gestor del proyecto (practicante)** | Giovanni Joaquín Garcilazo López |
| **Institución educativa** | Universidad César Vallejo · Ingeniería de Sistemas |
| **Modalidad** | Prácticas Preprofesionales II (PPP2) |
| **Marco de gestión** | PMI: Inicio, Planificación, Ejecución, Monitoreo y Control, Cierre |
| **Metodología de desarrollo** | Cascada, dentro de la fase de Ejecución |
| **Duración** | 12 semanas (3 meses) |
| **Fecha de inicio** | 22/09/2026 |
| **Fecha de cierre prevista** | 22/10/2026 |
| **Patrocinador / representante de la empresa** | Jhoel Fernandez Alvarado |
| **Supervisor en la empresa** | Martin Alonso Puertas Cuadros |
| **Docente asesor** | - |
| **Repositorio** | https://github.com/ggarcilazo/monitoreo-web-consigueventas |
| **Versión del documento** | 2.0 · 20/10/2026 |

---

## 2. Antecedentes y justificación

La agencia administra sitios web de sus clientes, en su mayoría construidos con WordPress sobre hosting compartido. Estos sitios pueden dejar de responder, volverse lentos o quedarse con el certificado de seguridad (SSL) vencido, y cada una de esas situaciones afecta a los clientes y a la reputación de la agencia. La agencia necesita un mecanismo **centralizado y automático** que revise el estado de esos sitios y avise a tiempo, en lugar de depender de que alguien lo note.

Además, la agencia busca captar nuevos clientes. Un **diagnóstico gratuito** del sitio web del prospecto, con un informe claro de lo que debe mejorar, es una herramienta comercial que genera contactos de forma natural.

El practicante trabajó previamente en la misma agencia, en el equipo de desarrollo web (PPP1), lo que facilita el conocimiento del entorno técnico y de las necesidades del equipo.

---

## 3. Descripción del proyecto

Sistema web compuesto por dos módulos:

1. **Panel interno de monitoreo.** Revisa periódicamente los sitios registrados (disponibilidad, certificado SSL y tiempo de respuesta), guarda el historial, calcula la disponibilidad y las caídas, y envía alertas por Telegram ante cambios de estado. Tiene acceso restringido por cuenta y por rol (administrador y lector) y permite administrar sitios, contactos, usuarios y ajustes, con un registro de la actividad.
2. **Diagnóstico público con captación de leads.** Página abierta en la que cualquier persona analiza su sitio y obtiene un puntaje en cinco categorías (disponibilidad, SSL, velocidad, seguridad, SEO y móvil). Para recibir el informe completo deja sus datos, que se registran como leads y se notifican a la agencia.

Todo el sistema opera con **costo cero**, sobre planes gratuitos, y realiza únicamente revisiones pasivas desde el exterior.

---

## 4. Objetivos

### 4.1 Objetivo general

Desarrollar e implementar un sistema web que permita diagnosticar y monitorear de forma continua sitios web de clientes, con alertas automáticas y captación de potenciales clientes, para optimizar el mantenimiento de los sitios y la captación de clientes en una agencia de marketing digital.

### 4.2 Objetivos específicos

1. Analizar los requerimientos de monitoreo y de captación de clientes de la agencia.
2. Diseñar una arquitectura de costo cero para el backend, la base de datos, el frontend, las alertas y el despliegue.
3. Implementar el monitoreo periódico de disponibilidad, SSL y tiempo de respuesta, con historial, incidentes y alertas por Telegram.
4. Implementar un panel web con autenticación, control de acceso por roles, gestión de sitios, contactos y usuarios, y registro de actividad.
5. Implementar el diagnóstico público con captación de leads y protecciones contra abuso.
6. Desplegar el sistema en línea y estabilizarlo, con automatización de los chequeos.
7. Verificar el funcionamiento con pruebas y documentar el sistema.

---

## 5. Alcance

### 5.1 Incluido

- Backend (API) en Python con FastAPI, y base de datos PostgreSQL en Supabase con migraciones.
- Chequeos de disponibilidad, SSL y velocidad; historial; disponibilidad a 7 y 30 días; incidentes; programación automática.
- Alertas por Telegram con resumen único y solo ante cambios.
- Panel web con inicio de sesión, roles, búsqueda, filtros y detalle por sitio.
- Gestión desde el panel de sitios, leads (con exportación a Excel), usuarios y ajustes, y registro de actividad.
- Seguridad de la sesión: cierre seguro y cierre por inactividad.
- Página pública de diagnóstico con puntaje, informe completo para quien deja sus datos y protección contra bots.
- Despliegue con Docker y nginx con HTTPS en una VM de Oracle Cloud, y frontend en Cloudflare.
- Documentación: requerimientos, manual de usuario, plan de pruebas y esta acta.

### 5.2 Fuera del alcance

- Modificar, corregir o acceder al contenido interno de los sitios monitoreados.
- Un CRM completo para el seguimiento comercial de los leads.
- Aplicaciones móviles nativas.
- Contratación de dominios, servidores o servicios de pago.

### 5.3 Mejoras previstas

Política de privacidad, dominio propio, integración con PageSpeed Insights, revisión de seguridad del correo (SPF y DMARC), informe en PDF, revisión de enlaces rotos, pruebas automáticas con integración continua y actualización del sistema operativo del servidor.

---

## 6. Entregables

| N.° | Entregable | Estado |
|---|---|---|
| 1 | API de monitoreo y base de datos con migraciones | ✅ |
| 2 | Servicio de chequeos programados (GitHub Actions) | ✅ |
| 3 | Alertas por Telegram | ✅ |
| 4 | Panel web con autenticación, roles y secciones de administración | ✅ |
| 5 | Página pública de diagnóstico con captación de leads | ✅ |
| 6 | Despliegue en línea (Docker, nginx, HTTPS, Cloudflare) | ✅ |
| 7 | Documentación: requerimientos, manual de usuario y plan de pruebas | ✅ |
| 8 | Acta de constitución | 🟡 Faltan datos por completar |
| 9 | Informe final de prácticas | ⏳ |

---

## 7. Cronograma de hitos

El cronograma detallado (26 actividades en 12 semanas) se mantiene en el plan de prácticas. Los hitos principales siguen el marco PMI y las cinco etapas de la metodología Cascada:

| Fase PMI | Etapa en Cascada | Hito | Semanas |
|---|---|---|---|
| Inicio | — | Acta de proyecto aprobada | **[COMPLETAR]** |
| Planificación | — | Plan de prácticas y cronograma aprobados | **[COMPLETAR]** |
| Ejecución | 1. Análisis y requisitos | Requerimientos documentados | **[COMPLETAR]** |
| Ejecución | 2. Diseño | Arquitectura y modelo de datos definidos | **[COMPLETAR]** |
| Ejecución | 3. Implementación | Backend, panel y diagnóstico construidos | 3 semanas |
| Ejecución | 4. Integración y verificación | Pruebas funcionales y de seguridad | **[COMPLETAR]** |
| Ejecución | 5. Despliegue y estabilización | Sistema en línea y estable | **[COMPLETAR]** |
| Monitoreo y control | — | Seguimiento semanal de avance y riesgos | Todo el proyecto |
| Cierre | — | Informe final y sustentación | **[COMPLETAR]** |

**Por qué Cascada:** los requerimientos del sistema (qué revisar, qué alertar, qué mostrar) se pueden definir desde el inicio y cambian poco, y el proyecto tiene una sola persona a cargo y un plazo fijo de 12 semanas. Un flujo secuencial, con entregables claros al final de cada etapa, facilita la planificación y la evaluación.

---

## 8. Presupuesto

El proyecto no requiere inversión en licencias ni infraestructura.

| Recurso | Servicio | Costo |
|---|---|---|
| Servidor | Oracle Cloud, nivel Always Free | S/ 0 |
| Base de datos y autenticación | Supabase, plan Free | S/ 0 |
| Frontend y CAPTCHA | Cloudflare (Workers y Turnstile) | S/ 0 |
| Repositorio y automatización | GitHub y GitHub Actions | S/ 0 |
| Dominio y certificados | DuckDNS y Let's Encrypt | S/ 0 |
| Alertas | API de bots de Telegram | S/ 0 |
| **Total directo** | | **S/ 0** |

El recurso principal es el tiempo del practicante durante las 12 semanas.

---

## 9. Interesados

| Interesado | Interés | Rol |
|---|---|---|
| Gestor del proyecto (practicante) | Desarrollar, entregar y sustentar el sistema | Ejecuta |
| Representante de la empresa | Contar con una herramienta útil para el equipo | Patrocina y valida |
| Supervisor en la empresa | Seguimiento de las prácticas | Supervisa |
| Docente asesor | Calidad académica del proyecto | Asesora y evalúa |
| Equipo de la agencia (administradores y lectores) | Conocer el estado de los sitios y los leads | Usuarios internos |
| Clientes de la agencia | Que sus sitios estén disponibles y seguros | Beneficiarios indirectos |
| Prospectos | Conocer el estado de su sitio | Usuarios del diagnóstico público |

---

## 10. Supuestos y restricciones

### 10.1 Supuestos

- La agencia autoriza el monitoreo de los sitios de sus clientes que se registran en el sistema (**[COMPLETAR: confirmación por escrito]**).
- La VM de Oracle Cloud permanece disponible las 24 horas.
- Los planes gratuitos mantienen sus condiciones durante el proyecto.
- La agencia aporta el contacto comercial para atender a los leads.

### 10.2 Restricciones

- **Costo cero** en todos los componentes.
- **Plazo de 12 semanas** y un solo desarrollador.
- Los sitios se revisan solo desde el exterior, sin acceso a su interior.
- Los límites de los planes gratuitos (memoria, almacenamiento y minutos de automatización).
- Los dominios gratuitos pueden ser marcados como sospechosos por algunos navegadores.

---

## 11. Riesgos

| Riesgo | Prob. | Impacto | Respuesta |
|---|---|---|---|
| Falsos positivos: hostings que bloquean las visitas automáticas | Alta | Media | Enviar cabeceras de navegador; distinguir «bloqueo» de «caída»; avisar al administrador. *Ocurrió y se corrigió.* |
| Abuso del diagnóstico público (bots, spam, uso del servidor para atacar terceros) | Media | Alta | CAPTCHA, límites por IP, bloqueo de direcciones internas, topes de descarga e interruptor para apagarlo desde el panel. |
| Dominios gratuitos marcados como «peligrosos» por el navegador | Media | Media | Un dominio propio de la agencia; mientras tanto, solicitar revisión a Google. |
| Tratamiento de datos personales sin cumplir la normativa | Media | Alta | Consentimiento explícito, datos mínimos, registro de actividad sin datos personales, eliminación de leads, política de privacidad y revisión con la agencia de la Ley N.° 29733. |
| Exposición accidental de secretos | Media | Alta | Secretos en variables de entorno y GitHub Secrets; rotación inmediata si se exponen. *Ocurrió una vez con la clave del proceso programado y se rotó.* |
| Acceso no autorizado al panel | Baja | Alta | Roles, suspensión de cuentas, cierre de sesión seguro y por inactividad, y registro de actividad. |
| Certificado del servidor vencido | Media | Alta | Renovación automática que reinicia nginx. *Ocurrió una vez y se corrigió.* |
| Sistema operativo del servidor sin soporte estándar (Ubuntu 20.04) | Media | Media | Aplicar las actualizaciones disponibles, evaluar Ubuntu Pro (ESM) y planificar la actualización de versión con una copia previa. |
| Agotar los límites de los planes gratuitos | Baja | Media | Chequeos diarios; revisar el consumo; opción de reducir la frecuencia. |
| Falla o cambio de IP del servidor | Baja | Alta | Reinicio automático del contenedor; DNS dinámico; documentación para reconstruir. |
| Pérdida de datos | Baja | Alta | Migraciones versionadas y copias periódicas de la base de datos. |
| Retrasos por tener un solo desarrollador | Media | Media | Cronograma en etapas, prioridades claras y entregas incrementales. |

---

## 12. Criterios de éxito

| Criterio | Indicador |
|---|---|
| El monitoreo detecta caídas y vencimientos de SSL | Cada sitio se chequea en el intervalo programado y se alerta ante cambios. |
| Las alertas son útiles | Un solo mensaje por ronda y ninguno si no hay novedades. |
| El panel es seguro | Todas las rutas internas exigen sesión y rol; sin rol no hay acceso; las acciones de escritura exigen administrador. |
| El diagnóstico es ágil | El análisis de un sitio se completa en menos de 10 segundos. |
| Se captan leads | Cada contacto queda registrado, notificado a la agencia y gestionable desde el panel. |
| Se puede auditar | Las acciones de administración quedan en el registro de actividad. |
| Costo cero | Ningún componente genera cargos. |
| Disponibilidad en línea | El sistema funciona sin depender del equipo del practicante. |
| Documentación y pruebas | Requerimientos, manual de usuario, plan de pruebas y acta entregados. |

---

## 13. Aprobaciones

| Nombre | Cargo | Firma | Fecha |
|---|---|---|---|
| Giovanni Joaquín Garcilazo López | Gestor del proyecto (practicante) | | |
| **[COMPLETAR]** | Representante de la empresa | | |
| **[COMPLETAR]** | Supervisor en la empresa | | |
| **[COMPLETAR]** | Docente asesor | | |
