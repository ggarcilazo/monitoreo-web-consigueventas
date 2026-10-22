# Plan y registro de pruebas

| | |
|---|---|
| **Proyecto** | Sistema web de diagnóstico y monitoreo de sitios web · ConsigueVentas |
| **Autor** | Giovanni Joaquín Garcilazo López |
| **Versión** | 1.0 |
| **Fecha** | 20/10/2026 |
| **Fecha de ejecución** | 22/09/2026 |

> Los resultados de este documento corresponden a las pruebas manuales hechas durante el desarrollo, sobre el sistema en línea. Para cada caso conviene guardar una captura de la consola del navegador, de la terminal o de la pantalla como evidencia y anotarla en la columna correspondiente.

---

## 1. Objetivo y alcance

Comprobar que el sistema cumple los requerimientos funcionales y de seguridad descritos en `requerimientos.md`, y dejar constancia de los defectos encontrados y de cómo se corrigieron.

**Entorno de pruebas:** el sistema en producción: frontend en Cloudflare Workers, backend en una VM de Oracle Cloud detrás de nginx, base de datos y autenticación en Supabase.

**Herramientas:** navegador (pantallas y consola de desarrollo), `curl` desde el servidor, y consultas SQL en Supabase.

**Cuentas usadas:** una cuenta con rol administrador y una con rol lector. Para los casos de acceso, además, una cuenta sin rol y una suspendida.

---

## 2. Casos de prueba funcionales

| ID | Módulo | Caso | Resultado esperado | Estado |
|---|---|---|---|---|
| CP-01 | Acceso | Iniciar sesión con credenciales correctas | Entra al panel y se muestra su rol | Aprobado |
| CP-02 | Acceso | Iniciar sesión con contraseña incorrecta | Mensaje claro de credenciales incorrectas | Aprobado |
| CP-03 | Acceso | Ingresar con una cuenta sin rol | Aviso de que la cuenta no tiene acceso; la API responde 403 | Aprobado |
| CP-04 | Acceso | Ingresar con una cuenta de lector | Ve Panel, Sitios (lectura) e Incidentes; no ve Leads, Usuarios, Actividad ni Ajustes | Aprobado |
| CP-05 | Sesión | Pulsar «Salir» y luego «Atrás» | Queda en el inicio de sesión; la sesión se revoca | Aprobado |
| CP-06 | Sesión | Simular 31 minutos sin actividad | La sesión se cierra y se muestra el aviso de inactividad | Aprobado |
| CP-07 | Usuarios | Suspender una cuenta | No puede iniciar sesión y su sesión deja de funcionar en menos de un minuto | Aprobado |
| CP-08 | Monitoreo | «Chequear ahora» en un sitio | Se actualizan estado, tiempo de respuesta y SSL | Aprobado |
| CP-09 | Monitoreo | «Chequear todos» sin cambios de estado | Se chequean todos y no llega ningún mensaje a Telegram | Aprobado |
| CP-10 | Monitoreo | Registrar un sitio con un dominio inexistente y chequearlo | Aparece como incidente abierto y llega la alerta «sitio caído» | Aprobado |
| CP-11 | Monitoreo | Ronda con un sitio caído | Llega **un solo** mensaje resumen con el sitio caído | Aprobado |
| CP-12 | Monitoreo | Llamar al chequeo masivo con la clave de servicio | Responde 200 con los resultados | Aprobado |
| CP-13 | Monitoreo | Consultar la disponibilidad a 7 y 30 días | Devuelve 30 días por sitio con sus porcentajes | Aprobado |
| CP-14 | Panel | Buscar, filtrar por estado y ordenar | La lista responde a cada filtro | Aprobado |
| CP-15 | Panel | Desplegar el detalle de un sitio | Se ven disponibilidad, tendencia, última caída e historial | Aprobado |
| CP-16 | Sitios | Agregar, editar, pausar, ocultar y eliminar un sitio (administrador) | Cada acción se refleja en la tabla y en el Panel | Aprobado |
| CP-17 | Leads | Cambiar estado, anotar seguimiento, ver el informe y eliminar | Cambios guardados; el informe muestra los problemas del sitio | Aprobado |
| CP-18 | Leads | Exportar a Excel | Archivo con hojas Resumen y Contactos, formato y fechas correctas | Aprobado |
| CP-19 | Usuarios | Cambiar el rol de otra cuenta y restaurarlo | El rol cambia y se mantiene al recargar | Aprobado |
| CP-20 | Usuarios | Intentar modificar la propia cuenta | La API responde 400 y la interfaz lo impide | Aprobado |
| CP-21 | Incidentes | Consultar incidentes con distintos periodos y filtros | Lista y tarjetas coherentes con los chequeos | Aprobado |
| CP-22 | Actividad | Realizar acciones de administración y consultar el registro | Cada acción aparece con responsable, hora y descripción, sin datos personales de leads | Aprobado |
| CP-23 | Ajustes | Cambiar el umbral de SSL y volver al valor original | Se guarda y se mantiene al recargar | Aprobado |
| CP-24 | Ajustes | Apagar y encender el diagnóstico público | Apagado, la API pública responde que no está disponible; encendido, vuelve a funcionar | Aprobado |
| CP-25 | Ajustes | Enviar el mensaje de prueba a Telegram | Llega el mensaje al chat | Aprobado |
| CP-26 | Diagnóstico | Analizar un sitio válido | Puntaje global y cinco categorías en unos segundos | Aprobado |
| CP-27 | Diagnóstico | Analizar un dominio inexistente | Puntaje 0 con el motivo | Aprobado |
| CP-28 | Diagnóstico | Registrar un lead con consentimiento | Responde el informe completo, llega el aviso a Telegram y queda el registro | Aprobado |
| CP-29 | Diagnóstico | Registrar un lead sin consentimiento | La API responde 400 | Aprobado |
| CP-30 | Diagnóstico | Registrar un lead con un análisis inventado | La API responde 404 («el análisis expiró») | Aprobado |

---

## 3. Pruebas de seguridad

| ID | Caso | Resultado esperado | Estado |
|---|---|---|---|
| CS-01 | Consultar la lista de sitios sin sesión | 401 «No autenticado» | Aprobado |
| CS-02 | Con un lector, intentar crear un sitio | 403 «Se requiere rol de administrador» | Aprobado |
| CS-03 | Con un lector, consultar leads, usuarios, actividad y ajustes | 403 | Aprobado |
| CS-04 | Analizar `http://127.0.0.1:8001` | Rechazado (solo se admiten los puertos 80 y 443) | Aprobado |
| CS-05 | Analizar `http://169.254.169.254/...` (metadatos de la nube) | 400 «Esa dirección no es pública» | Aprobado |
| CS-06 | Analizar `localhost` | Rechazado | Aprobado |
| CS-07 | Superar el límite de análisis desde una IP | 429 | Aprobado |
| CS-08 | Analizar sin el token del CAPTCHA | 400 «Completa la verificación de seguridad» | Aprobado |
| CS-09 | Analizar con un token falso | 400 «No pasaste la verificación de seguridad» | Aprobado |
| CS-10 | Cambiar el estado de un lead a un valor inválido | 422 | Aprobado |
| CS-11 | Valor fuera de rango en el umbral de SSL | 422 | Aprobado |
| CS-12 | Todas las tablas con RLS activado | Consulta del catálogo muestra `rowsecurity = true` | Aprobado |
| CS-13 | Un nombre con forma de fórmula en la exportación a Excel | Se guarda como texto | Aprobado |
| CS-14 | El certificado servido por nginx coincide con el renovado | Las fechas de `openssl s_client` coinciden con las del disco | Aprobado |
| CS-15 | Ejecutar el aviso de renovación manualmente | Reinicia nginx sin errores | Aprobado |

---

## 4. Rendimiento

| ID | Caso | Resultado |
|---|---|---|
| CR-01 | Duración del análisis del diagnóstico público | 7,8 segundos en la prueba medida con `time` (objetivo: menos de 10) |
| CR-02 | Consumo del contenedor del backend | Dentro del límite de 200 MB |

---

## 5. Defectos encontrados y corregidos

Esta tabla documenta los problemas reales que aparecieron durante el desarrollo y su solución.

| ID | Defecto | Causa | Corrección |
|---|---|---|---|
| D-01 | Sitios que abrían bien aparecían como «Caídos» (HTTP 403) | El monitor enviaba solo el User-Agent y el firewall del hosting rechazaba las peticiones sin las cabeceras `Accept` y `Accept-Language` | Se agregaron esas cabeceras; una prueba comparativa mostró 403 sin ellas y 200 con ellas |
| D-02 | Las migraciones de Alembic fallaban con un error de interpolación | La contraseña de la base de datos contenía `%` y `configparser` lo interpreta | Se escapó el símbolo (`%` → `%%`) en la configuración de Alembic |
| D-03 | Telegram recibía un mensaje por cada sitio | El aviso se enviaba dentro del bucle de chequeo | Un solo mensaje resumen por ronda, solo con novedades |
| D-04 | El aviso de SSL por vencer se repetía en cada ronda | No se comparaba con el chequeo anterior | Solo avisa cuando cambia el número de días |
| D-05 | Un sitio recién agregado generaba un aviso de «recuperado» sin haber caído | El primer chequeo contaba como cambio de estado | El primer chequeo solo alerta si el sitio está caído |
| D-06 | El contenedor no arrancaba al agregar variables nuevas al `.env` | La configuración rechazaba variables que no conocía | Se configuró para ignorar las variables adicionales |
| D-07 | El servicio devolvía 502 tras un despliegue | Un error tipográfico en una constante de estado HTTP hacía caer el contenedor al iniciar | Se corrigió el nombre y se revisaron los logs antes de probar |
| D-08 | El panel no cargaba datos aunque el inicio de sesión funcionaba (403) | El frontend y el backend usaban proyectos de Supabase distintos para los usuarios | Se unificó el proyecto de autenticación y se asignaron los roles allí |
| D-09 | El rol lector podía registrar y eliminar sitios por la API | Esas rutas solo exigían estar autenticado | Las rutas de escritura exigen rol administrador |
| D-10 | El certificado del servidor venció aunque la renovación existía | nginx no tomaba el certificado nuevo con una recarga | El aviso de renovación ahora reinicia nginx, y se verificó con `openssl` |
| D-11 | El formulario del diagnóstico recargaba la página sin hacer nada | El script no llegaba a ejecutarse en el navegador | Se evitó el envío tradicional del formulario y se aisló el script |
| D-12 | La sesión parecía seguir abierta después de salir | Salir solo borraba los datos del navegador, y el botón «Atrás» mostraba el panel guardado | Revocación de la sesión en el servidor, redirección sin historial y cierre por inactividad |
| D-13 | La exportación a CSV se veía desordenada en Excel | El formato dependía de la configuración regional y no admite estilos | Exportación a Excel con dos hojas, colores y filtros, con CSV de respaldo |
| D-14 | La tabla de Leads desbordaba el ancho disponible | Cuatro botones de texto apilados y celdas sin salto de línea | Columnas proporcionales y acciones con iconos |

---

## 6. Pruebas pendientes

| Prueba | Motivo |
|---|---|
| Pruebas automáticas con pytest (puntajes del diagnóstico, formato de alertas, reglas de roles) | Dar repetibilidad y activar la integración continua en GitHub Actions |
| Verificación en celulares y en otros navegadores | Completar la compatibilidad (RNF-17) |
| Prueba de carga del diagnóstico público | Confirmar el comportamiento de los límites con varios visitantes a la vez |
| Revisión de accesibilidad básica (teclado y lectores de pantalla) | Complementar la usabilidad |
