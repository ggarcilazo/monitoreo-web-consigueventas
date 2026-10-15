# Manual de usuario

| | |
|---|---|
| **Sistema** | Monitor de sitios web y diagnóstico gratuito · ConsigueVentas |
| **Versión** | 1.0 |
| **Fecha** | 14/10/2026 |
| **Dirigido a** | Personal de la agencia (administradores y lectores) y visitantes del diagnóstico gratuito |

---

## 1. ¿Qué es este sistema?

Es una herramienta con dos partes:

- **El panel interno**, para el personal de la agencia. Muestra si los sitios web de los clientes están funcionando, cuánto tardan en responder y cuándo vence su certificado de seguridad (SSL). Cuando algo cambia, avisa por Telegram.
- **El diagnóstico gratuito**, una página abierta para cualquier persona. Quien escribe la dirección de su sitio recibe un puntaje de su estado y, si deja sus datos, un informe completo. Así la agencia consigue contactos de posibles clientes.

---

## 2. Acceso al panel

### 2.1 Cómo entrar

1. Abre la dirección de inicio de sesión que te entregó el administrador.
2. Escribe tu **correo electrónico** y tu **contraseña**. Con el icono del ojo puedes ver lo que escribes.
3. Pulsa **Ingresar**.

Si todo está bien, entrarás al **Panel**. Si ves un aviso en rojo, revisa el apartado de [solución de problemas](#8-solución-de-problemas).

> Las cuentas no se crean solas: las crea un administrador. Si necesitas acceso, pídeselo.

### 2.2 Cómo salir

Pulsa **Salir**, en la parte inferior del menú lateral.

### 2.3 Roles

En el menú lateral, sobre tu correo, aparece una etiqueta con tu rol:

| Etiqueta | Qué puedes hacer |
|---|---|
| **ADMINISTRADOR** | Ver el panel y administrar el sistema. |
| **LECTOR** | Ver el panel. |
| **SIN ACCESO** | Tu cuenta existe pero no tiene un rol asignado. Pide a un administrador que te lo asigne. |

---

## 3. El panel

### 3.1 Menú lateral

A la izquierda están las secciones:

- **Panel:** el estado de todos los sitios. Es la pantalla principal.
- **Sitios:** administración de los sitios monitoreados. *Próximamente.*
- **Incidentes:** historial de caídas y su duración. *Próximamente.*
- **Usuarios:** quién tiene acceso. *Próximamente.*

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

### 3.5 El detalle de un sitio

Pulsa sobre una fila (en cualquier parte menos el botón) para desplegar el detalle:

- **Disponibilidad:** el porcentaje de chequeos correctos en los últimos 30 días, y entre paréntesis el de 7 días. El anillo es verde si se acerca al 100 %, ámbar si baja del 99,5 % y rojo si baja del 95 %.
- **Tiempo de respuesta:** el promedio y un gráfico con la tendencia de los últimos chequeos.
- **Última caída:** hace cuánto fue la última vez que el sitio falló, o «Sin caídas» si nunca falló.
- **Tabla de historial:** los últimos 10 chequeos con fecha, estado, tiempo de respuesta y días de SSL.

Pulsa otra vez sobre la fila para cerrarlo.

---

## 4. Chequear los sitios

Los sitios se revisan solos todos los días. También puedes revisar cuando quieras:

- **Chequear ahora** (en una fila): revisa solo ese sitio y actualiza su estado.
- **Chequear todos** (arriba a la derecha): revisa todos los sitios activos. Puede tardar unos segundos.

> Un sitio puede aparecer como «Caído» aunque se abra en tu navegador. A veces el hosting rechaza las visitas automáticas. Si pasa, avisa al administrador técnico para revisar el caso.

---

## 5. Alertas por Telegram

El sistema envía mensajes al grupo o chat configurado. Solo avisa cuando **algo cambia**, para no llenar el chat de mensajes repetidos.

| Mensaje | Qué significa |
|---|---|
| **Monitor ConsigueVentas** con lista de «Cayeron» | Uno o más sitios dejaron de responder. Aparece el nombre y el código de error. |
| Lista de «Recuperados» | Sitios que estaban caídos y volvieron. |
| Lista de «SSL por vencer» | Sitios cuyo certificado vence en 15 días o menos. Hay que renovarlo. |
| **SITIO LENTO** | Un sitio tardó más de 3 segundos en responder (solo con «Chequear ahora»). |
| **NUEVO LEAD** | Alguien usó el diagnóstico gratuito y dejó sus datos. Incluye nombre, correo, teléfono, sitio y puntaje. |

Cuando no hay novedades, no llega ningún mensaje. Eso es buena señal.

---

## 6. El diagnóstico gratuito

### 6.1 Para quien analiza su sitio

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

El diagnóstico es automático e informativo: observa lo que cualquier visitante ve, no entra al interior de tu sitio ni lo modifica.

### 6.2 Límites de uso

Para evitar abusos hay un máximo de análisis por hora desde una misma conexión. Si aparece el aviso «Hiciste muchos análisis seguidos», espera un rato e inténtalo otra vez.

### 6.3 Para la agencia: dónde ver los leads

Cada persona que deja sus datos genera:

1. Un mensaje **NUEVO LEAD** en Telegram.
2. Un registro en la tabla `leads` de la base de datos (Supabase → **Table Editor** → `leads`).

*La sección Leads del panel, para verlos y darles seguimiento desde ahí, está en desarrollo.*

---

## 7. Tareas del administrador técnico

### 7.1 Crear un usuario y asignarle un rol

1. En Supabase, entra al proyecto del monitor, a **Authentication → Users → Add user → Create new user**.
2. Escribe el correo y una contraseña, y marca **Auto Confirm User**.
3. En el **SQL Editor** del mismo proyecto, asigna el rol (`admin` o `lector`):

```sql
UPDATE auth.users
SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || '{"rol": "lector"}'::jsonb
WHERE lower(email) = lower('correo@ejemplo.com');
```

4. Comprueba el resultado:

```sql
SELECT email, raw_app_meta_data->>'rol' AS rol FROM auth.users ORDER BY created_at;
```

El cambio de rol puede tardar hasta un minuto en notarse. Para quitar el acceso a alguien, elimina su usuario desde Supabase.

### 7.2 Encender o apagar el diagnóstico público

En el archivo `.env` del servidor, la variable `AUDITORIA_PUBLICA` vale `on` (encendido) u `off` (apagado). Después de cambiarla hay que volver a crear el contenedor del backend.

### 7.3 Cambiar la frecuencia de los chequeos automáticos

En el archivo `.github/workflows/chequeo-programado.yml` está la línea `cron`:

| Frecuencia | Valor |
|---|---|
| Diario, 08:00 UTC (03:00 en Lima) | `'0 8 * * *'` |
| Semanal, lunes | `'0 8 * * 1'` |
| Cada hora | `'0 * * * *'` |
| Cada 15 minutos | `'*/15 * * * *'` |

> En repositorios privados, GitHub ofrece una cantidad limitada de minutos gratuitos por mes. Las frecuencias muy altas pueden agotarla.

### 7.4 Agregar o eliminar sitios

Mientras la sección **Sitios** está en desarrollo, el alta, el ocultamiento y la eliminación de sitios los realiza el administrador técnico a través de la API (documentación en `/api/docs`).

---

## 8. Solución de problemas

| Qué ves | Qué significa | Qué hacer |
|---|---|---|
| «Correo o contraseña incorrectos» | Los datos no coinciden con una cuenta. | Revisa mayúsculas y que la cuenta exista. Si olvidaste la clave, pide al administrador que la restablezca. |
| «Tu cuenta no tiene acceso a este panel» | La cuenta existe, pero no tiene rol. | Pide a un administrador que te asigne un rol. |
| «No se pudo conectar con el servidor» | El panel no logra comunicarse con el servidor. | Recarga con Ctrl+F5. Si sigue, avisa al administrador técnico. |
| Un sitio sale «Caído» pero abre en el navegador | El hosting puede estar rechazando las visitas automáticas. | Avisa al administrador técnico. |
| «Hiciste muchos análisis seguidos» | Se alcanzó el límite del diagnóstico gratuito. | Espera un rato e inténtalo de nuevo. |
| «No pasaste la verificación de seguridad» | El control anti-bots no se completó. | Recarga la página y espera a que aparezca el visto. |
| «El análisis expiró» | Pasó más de una hora desde el análisis. | Analiza tu sitio otra vez. |
| «El diagnóstico gratuito no está disponible por el momento» | El administrador lo apagó. | Inténtalo más tarde. |

---

## 9. Glosario

| Término | Significado |
|---|---|
| **Disponibilidad (uptime)** | Porcentaje del tiempo en que un sitio respondió correctamente. |
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
