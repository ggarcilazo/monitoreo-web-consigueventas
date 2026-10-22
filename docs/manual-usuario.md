# Manual de usuario

| | |
|---|---|
| **Sistema** | Monitor de sitios web y diagnóstico gratuito · ConsigueVentas |
| **Versión** | 2.0 |
| **Fecha** | 20/10/2026 |
| **Dirigido a** | Personal de la agencia (administradores y lectores) y visitantes del diagnóstico gratuito |

---

## 1. ¿Qué es este sistema?

Es una herramienta con dos partes:

- **El panel interno**, para el personal de la agencia. Muestra si los sitios web de los clientes están funcionando, cuánto tardan en responder y cuándo vence su certificado de seguridad (SSL). Cuando algo cambia, avisa por Telegram. También permite administrar los sitios, los contactos que llegan del diagnóstico, las cuentas de usuario y los ajustes.
- **El diagnóstico gratuito**, una página abierta para cualquier persona. Quien escribe la dirección de su sitio recibe un puntaje de su estado y, si deja sus datos, un informe completo. Así la agencia consigue contactos de posibles clientes.

---

## 2. Acceso al panel

### 2.1 Cómo entrar

1. Abre la dirección de inicio de sesión que te entregó el administrador.
2. Escribe tu **correo electrónico** y tu **contraseña**. Con el icono del ojo puedes ver lo que escribes.
3. Pulsa **Ingresar**.

Si todo está bien, entrarás al **Panel**. Si ves un aviso en rojo, revisa el apartado de [solución de problemas](#9-solución-de-problemas).

> Las cuentas no se crean solas: las crea un administrador. Si necesitas acceso, pídeselo.

### 2.2 Cómo salir

Pulsa **Salir**, en la parte inferior del menú lateral. La sesión se cierra por completo y no se puede recuperar con el botón «Atrás» del navegador.

**Cierre automático:** si pasas **30 minutos sin usar el panel**, la sesión se cierra sola por seguridad y verás un aviso en la pantalla de inicio de sesión.

### 2.3 Roles

En el menú lateral, sobre tu correo, aparece una etiqueta con tu rol:

| Etiqueta | Qué puedes hacer |
|---|---|
| **ADMINISTRADOR** | Ver el panel y los incidentes, y administrar sitios, contactos, usuarios, ajustes y consultar la actividad. |
| **LECTOR** | Ver el panel (estado de los sitios) y los incidentes. |
| **SIN ACCESO** | Tu cuenta existe pero no tiene un rol asignado, o está suspendida. Pide a un administrador que lo resuelva. |

El menú muestra solo las secciones que te corresponden.

---

## 3. El panel

### 3.1 Menú lateral

| Sección | Quién la ve | Para qué sirve |
|---|---|---|
| **Panel** | Todos | Estado de todos los sitios. Es la pantalla principal. |
| **Sitios** | Todos ven la lista; solo administradores la modifican | Administrar los sitios monitoreados. |
| **Leads** | Administradores | Contactos que llegan del diagnóstico gratuito. |
| **Incidentes** | Todos | Historial de caídas y su duración. |
| **Usuarios** | Administradores | Cuentas y roles. |
| **Actividad** | Administradores | Registro de quién hizo qué. |
| **Ajustes** | Administradores | Alertas, diagnóstico público e información del sistema. |

Abajo aparecen tu rol, tu correo y el botón **Salir**.

### 3.2 Tarjetas de resumen

Arriba hay tres tarjetas:

- **Sitios registrados:** cuántos sitios se muestran.
- **Disponibles:** cuántos respondieron bien en su último chequeo.
- **Caídos:** cuántos no respondieron o devolvieron un error.

Si pulsas **Disponibles** o **Caídos**, la lista se filtra. Pulsa **Sitios registrados** para ver todos de nuevo.

### 3.3 Buscar, filtrar y ordenar

Sobre la lista tienes:

- **Buscador:** escribe parte del nombre del cliente o de la dirección.
- **Todos / Disponibles / Caídos:** filtra por estado.
- **Ordenar:** por nombre, caídos primero, más lentos primero o SSL por vencer.
- **Último chequeo:** la fecha y la hora de la revisión más reciente.

### 3.4 La lista de sitios

Cada fila muestra:

- Un **punto de color**: verde si está disponible, rojo si está caído.
- El **nombre del cliente** y su dirección.
- El **estado** (Disponible o Caído).
- **Resp:** cuánto tardó en responder, en milisegundos. Menos es mejor.
- **SSL:** cuántos días faltan para que venza el certificado.
- El botón **Chequear ahora**.

Los sitios **en pausa** y los **ocultos** no aparecen en el Panel.

### 3.5 El detalle de un sitio

Pulsa sobre una fila (en cualquier parte menos el botón) para desplegar el detalle:

- **Disponibilidad:** el porcentaje de chequeos correctos en los últimos 30 días y, junto a él, el de 7 días. El anillo es verde si se acerca al 100 %, ámbar si baja del 99,5 % y rojo si baja del 95 %.
- **Tiempo de respuesta:** el promedio y un gráfico con la tendencia de los últimos chequeos.
- **Última caída:** hace cuánto fue la última vez que el sitio falló, o «Sin caídas» si nunca falló.
- **Tabla de historial:** los últimos 10 chequeos con fecha, estado, tiempo de respuesta y días de SSL.

Pulsa otra vez sobre la fila para cerrarlo.

---

## 4. Chequear los sitios

Los sitios se revisan solos según la programación configurada (hoy, una vez al día). También puedes revisar cuando quieras:

- **Chequear ahora** (en una fila): revisa solo ese sitio y actualiza su estado.
- **Chequear todos** (arriba a la derecha): revisa todos los sitios activos. Puede tardar unos segundos.

> Un sitio puede aparecer como «Caído» aunque se abra en tu navegador. A veces el hosting rechaza las visitas automáticas. Si pasa, avisa al administrador técnico para revisar el caso.

---

## 5. Administrar sitios (solo administradores)

En **Sitios** ves todos los sitios registrados, incluidos los ocultos y los que están en pausa.

| Columna | Valores |
|---|---|
| **Monitoreo** | *Monitoreado* o *En pausa* |
| **Visibilidad** | *Visible* u *Oculto* |

**Agregar un sitio:** pulsa **+ Agregar sitio**, escribe el nombre del cliente y la dirección (por ejemplo, `tusitio.com`) y guarda. El sistema hace el primer chequeo solo.

**Acciones de cada fila:**

- **Editar:** cambia el nombre o la dirección.
- **Pausar / Reanudar:** un sitio en pausa deja de chequearse y desaparece del Panel.
- **Ocultar / Mostrar:** un sitio oculto sigue chequeándose y avisando por Telegram, pero no aparece en el Panel.
- **Eliminar:** borra el sitio y todo su historial. Pide confirmación y no se puede deshacer.

> Si pausas un sitio mientras está caído, su incidente queda abierto hasta que lo reanudes.

---

## 6. Leads: contactos del diagnóstico gratuito (solo administradores)

En **Leads** aparecen las personas que usaron el diagnóstico gratuito y dejaron sus datos.

**Tarjetas:** total de contactos, nuevos, de los últimos 7 días y puntaje promedio.

**Tabla:** fecha, contacto (nombre, correo y teléfono), sitio analizado, puntaje (verde, ámbar o rojo), **estado** y acciones.

**Estados de seguimiento:** *Nuevo*, *Contactado*, *En proceso*, *Ganado* y *Descartado*. Se cambian directamente desde el menú de cada fila.

**Iconos de acción:**

| Icono | Qué hace |
|---|---|
| Ojo | Abre el **detalle**: notas de seguimiento y el informe con **los problemas encontrados en su sitio**, útil para preparar la llamada. |
| Mensaje | Abre **WhatsApp** con un mensaje ya escrito (solo si dejó teléfono). |
| Sobre | Abre tu programa de **correo** con un mensaje ya escrito. |
| Papelera | **Elimina** el contacto y sus datos personales. Pide confirmación. |

**Buscar y filtrar:** por nombre, correo, teléfono o sitio, y por estado.

**Exportar Excel:** descarga un archivo con dos hojas: **Resumen** (fecha, filtro aplicado, cantidad, puntaje promedio y conteo por estado) y **Contactos** (todas las columnas, con colores por puntaje y estado y filtros en cada columna). Exporta lo que esté filtrado en pantalla.

---

## 7. Incidentes, usuarios, actividad y ajustes

### 7.1 Incidentes (todos los roles)

Un **incidente** es una caída: una racha de chequeos fallidos seguidos de un sitio.

- **Tarjetas:** incidentes del periodo, abiertos ahora, recuperación promedio y el sitio con más caídas.
- **Filtros:** periodo (7, 30 o 90 días), sitio y estado (abiertos o resueltos).
- **Tabla:** sitio, inicio, fin, duración, código de error, chequeos fallidos y estado. Los abiertos llevan un borde rojo y la leyenda «y contando».

La duración es aproximada: va del primer chequeo fallido al primer chequeo correcto, así que su precisión depende de cada cuánto se revisan los sitios.

### 7.2 Usuarios (solo administradores)

Muestra las cuentas con su rol, su estado (*Activo*, *Suspendido* o *Sin confirmar*), su último acceso y su fecha de creación.

- **Cambiar el rol:** con el menú de la fila (Administrador, Lector o Sin acceso). Puede tardar hasta un minuto en aplicarse.
- **Suspender / Reactivar:** una cuenta suspendida no puede iniciar sesión y sus sesiones dejan de funcionar en menos de un minuto.
- **Tu propia cuenta** aparece marcada con «tú» y no se puede modificar desde aquí.

**Cómo agregar a una persona nueva:**

1. En Supabase, entra al proyecto del monitor, a **Authentication → Users → Add user → Create new user**, con **Auto Confirm User** marcado (el botón *Abrir Supabase* de la pantalla te lleva ahí).
2. La cuenta aparecerá en Usuarios **sin rol**.
3. Asígnale **Administrador** o **Lector**.

### 7.3 Actividad (solo administradores)

Una línea de tiempo con las acciones de administración: sitios agregados, modificados o eliminados, contactos actualizados o eliminados, cambios de rol y suspensiones, cambios de ajustes y los nuevos contactos del diagnóstico. Cada evento muestra quién lo hizo y a qué hora.

- **Filtros:** periodo, tipo (sitios, leads, usuarios, ajustes) y buscador.
- Los contactos se registran solo por su número, sin datos personales.

### 7.4 Ajustes (solo administradores)

- **Diagnóstico público:** interruptor para encender o apagar la página de análisis gratuito. Si está apagada, la página avisa que el servicio no está disponible.
- **Alertas por Telegram:** el número de días de aviso del certificado SSL (de 1 a 60, por defecto 15) y el botón **Enviar mensaje de prueba**, para comprobar que las alertas llegan.
- **Sistema:** versión, estado de la verificación anti-bots, cómo se programan los chequeos y el tiempo de cierre por inactividad.

---

## 8. Alertas por Telegram y diagnóstico gratuito

### 8.1 Alertas por Telegram

El sistema envía mensajes al grupo o chat configurado. Solo avisa cuando **algo cambia**, para no llenar el chat de mensajes repetidos.

| Mensaje | Qué significa |
|---|---|
| **Monitor ConsigueVentas** con lista de «Cayeron» | Uno o más sitios dejaron de responder. Aparece el nombre y el código de error. |
| Lista de «Recuperados» | Sitios que estaban caídos y volvieron. |
| Lista de «SSL por vencer» | Sitios cuyo certificado vence en los días configurados o menos. Hay que renovarlo. |
| **SITIO LENTO** | Un sitio tardó más de 3 segundos en responder (en el chequeo individual). |
| **NUEVO LEAD** | Alguien usó el diagnóstico gratuito y dejó sus datos. Incluye nombre, correo, teléfono, sitio y puntaje. |
| **Mensaje de prueba** | Enviado desde Ajustes para comprobar que las alertas llegan. |

Cuando no hay novedades, no llega ningún mensaje. Eso es buena señal.

### 8.2 El diagnóstico gratuito, para quien analiza su sitio

1. Escribe la dirección de tu sitio (por ejemplo, `tusitio.com`).
2. Espera a que el recuadro de verificación de Cloudflare muestre el visto.
3. Pulsa **Analizar mi sitio**. Tarda unos segundos.
4. Verás tu **puntaje de 0 a 100** y cinco tarjetas:

| Categoría | Qué revisa |
|---|---|
| **Disponibilidad** | Que el sitio responda correctamente. |
| **Certificado SSL** | Que use conexión segura y cuándo vence el certificado. |
| **Velocidad** | Tiempo de respuesta del servidor, compresión, caché y peso de la página. |
| **Seguridad** | Protecciones básicas del navegador y si expone versiones de software. |
| **SEO y móvil** | Título, descripción, adaptación al celular, cómo se ve al compartirlo, `robots.txt` y mapa del sitio. |

Cada tarjeta se marca como **Bien** (80 o más), **Mejorable** (50 a 79) o **Crítico** (menos de 50).

5. Para ver el **informe completo**, deja tu nombre, tu correo y, si quieres, tu teléfono o WhatsApp, y acepta el uso de tus datos. Verás cada punto revisado y, en los que fallan, **por qué importa** y **cómo corregirlo**.

El diagnóstico es automático e informativo: observa lo que cualquier visitante ve, no entra al interior de tu sitio ni lo modifica. Hay un máximo de análisis por hora desde una misma conexión; si aparece el aviso «Hiciste muchos análisis seguidos», espera un rato e inténtalo otra vez.

---

## 9. Solución de problemas

| Qué ves | Qué significa | Qué hacer |
|---|---|---|
| «Correo o contraseña incorrectos» | Los datos no coinciden con una cuenta. | Revisa mayúsculas y que la cuenta exista. Si olvidaste la clave, pide al administrador que la restablezca. |
| «Tu cuenta está suspendida» | Un administrador suspendió la cuenta. | Contacta a un administrador. |
| «Tu sesión se cerró por inactividad» | Pasaron 30 minutos sin usar el panel. | Vuelve a ingresar. |
| «Tu sesión expiró» | La sesión ya no es válida. | Vuelve a ingresar. |
| «Tu cuenta no tiene acceso a este panel» | La cuenta existe, pero no tiene rol. | Pide a un administrador que te asigne un rol. |
| «Solo los administradores pueden ver…» | Tu rol no permite ver esa sección. | Pide el acceso a un administrador si lo necesitas. |
| «No se pudo conectar con el servidor» | El panel no logra comunicarse con el servidor. | Recarga con Ctrl+F5. Si sigue, avisa al administrador técnico. |
| Un sitio sale «Caído» pero abre en el navegador | El hosting puede estar rechazando las visitas automáticas. | Avisa al administrador técnico. |
| «Hiciste muchos análisis seguidos» | Se alcanzó el límite del diagnóstico gratuito. | Espera un rato e inténtalo de nuevo. |
| «No pasaste la verificación de seguridad» | El control anti-bots no se completó. | Recarga la página y espera a que aparezca el visto. |
| «El análisis expiró» | Pasó más de una hora desde el análisis. | Analiza tu sitio otra vez. |
| «El diagnóstico gratuito no está disponible por el momento» | Un administrador lo apagó. | Inténtalo más tarde. |

---

## 10. Tareas del administrador técnico

### 10.1 Cambiar la frecuencia de los chequeos automáticos

En el archivo `.github/workflows/chequeo-programado.yml` está la línea `cron`:

| Frecuencia | Valor |
|---|---|
| Diario, 08:00 UTC (03:00 en Lima) | `'0 8 * * *'` |
| Semanal, lunes | `'0 8 * * 1'` |
| Cada hora | `'0 * * * *'` |
| Cada 15 minutos | `'*/15 * * * *'` |

> En repositorios privados, GitHub ofrece una cantidad limitada de minutos gratuitos por mes. Las frecuencias muy altas pueden agotarla.

### 10.2 Actualizar el servidor

Después de subir cambios al repositorio, en la VM:

```bash
cd ~/monitoreo-web-consigueventas && git pull && cd backend
docker build -t monitoreo-backend .
docker rm -f monitoreo-backend
docker run -d --name monitoreo-backend --restart unless-stopped --memory="200m" --memory-swap="400m" -p 127.0.0.1:8001:8000 --env-file .env -e ROOT_PATH=/api monitoreo-backend
```

Si el cambio incluye una migración de base de datos, se aplica antes desde el equipo de desarrollo con `alembic upgrade head`.

### 10.3 Variables de entorno

Los nombres de las variables están en `backend/.env.example`. Los valores reales viven solo en el archivo `.env` del servidor, que no se sube al repositorio.

### 10.4 Certificado del servidor

Certbot renueva el certificado de forma automática y, al terminar, reinicia nginx para aplicarlo. Para comprobar el estado: `sudo certbot certificates`.

---

## 11. Glosario

| Término | Significado |
|---|---|
| **Disponibilidad (uptime)** | Porcentaje del tiempo en que un sitio respondió correctamente. |
| **Incidente** | Caída de un sitio: una racha de chequeos fallidos seguidos. |
| **HTTP / código de respuesta** | Número con el que un sitio contesta una visita. 200 es correcto; 403 es acceso rechazado; 500 es error del sitio. |
| **SSL / HTTPS** | Cifrado que protege la conexión y muestra el candado en el navegador. El certificado vence y hay que renovarlo. |
| **Tiempo de respuesta** | Lo que tarda el sitio en empezar a contestar. |
| **Caché** | Memoria que evita volver a descargar lo mismo en cada visita. |
| **Cabeceras de seguridad** | Instrucciones que el sitio le da al navegador para protegerse de ataques comunes. |
| **SEO** | Conjunto de buenas prácticas para aparecer mejor en Google. |
| **Open Graph** | Etiquetas que definen cómo se ve un enlace al compartirlo en redes. |
| **Sitemap / robots.txt** | Archivos que le indican a Google qué páginas puede revisar. |
| **Lead** | Persona interesada que deja sus datos para que la agencia la contacte. |
| **Rol** | Permiso que define lo que cada usuario puede hacer en el panel. |
| **Suspender** | Bloquear una cuenta sin borrarla; se puede reactivar. |
