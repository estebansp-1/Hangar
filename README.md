# HANGAR — Arquitectura · Interiores · Inmobiliaria

Estudio que **plantea, diseña y construye**: vende propiedades (apartamentos, casas, penthouses, lofts y edificios) y paquetes de **diseño de interiores por estilo**, con un recorrido 3D guiado por el scroll.

```
Zapatos/
├── Frontend/   React 18 + Vite · Three.js (React Three Fiber) · GSAP ScrollTrigger/SplitText · Motion · Lenis
└── Backend/    Express · Prisma (PostgreSQL) · JWT · bcrypt · Brevo · Cloudinary · Zod
```

## Arrancar en local

La base de datos es PostgreSQL. Para desarrollo usa una rama `dev` de tu proyecto en Neon (gratis), así no tocas los datos reales.

```bash
cd Backend
npm install
cp .env.example .env      # DATABASE_URL / DIRECT_URL de Neon, JWT_SECRET y ADMIN_PASSWORD
npm run build             # genera Prisma, crea las tablas y el administrador
npm run dev               # http://localhost:4000/api
```

```bash
cd Frontend
npm install
cp .env.example .env      # VITE_API_URL=http://localhost:4000/api
npm run dev               # http://localhost:5173
```

Sin `CLOUDINARY_URL` las fotos se guardan en `Backend/uploads`; sin `BREVO_API_KEY` ni `SMTP_HOST` los correos van a Ethereal (la consola muestra el enlace).

## Desplegar gratis

| Parte | Servicio | Plan |
| --- | --- | --- |
| Frontend | Cloudflare Pages | Gratis, sin límite de tráfico, permite uso comercial |
| Backend | Render | Gratis; se duerme tras 15 min sin visitas (la primera petición tarda ~1 min) |
| Base de datos | Neon (PostgreSQL) | Gratis, 0,5 GB |
| Fotos | Cloudinary | Gratis |
| Correos | Brevo | Gratis, 300 correos al día |

1. **Neon** (neon.tech): crea un proyecto en la región *AWS US East (N. Virginia)*. En *Connect* copia dos cadenas: la que tiene `-pooler` → `DATABASE_URL`, y la misma sin `-pooler` → `DIRECT_URL`.
2. **Cloudinary** (cloudinary.com): en el *Dashboard* copia la *API environment variable* (`cloudinary://…`) → `CLOUDINARY_URL`.
3. **Brevo** (brevo.com): en *Senders* verifica el correo remitente; en *SMTP & API → API Keys* crea una clave → `BREVO_API_KEY`. `MAIL_FROM` = `HANGAR Estudio <tu-correo-verificado>`.
4. **Render** (render.com): *New → Blueprint* → elige este repositorio. Lee `render.yaml` y pide las variables: las de los pasos anteriores, `ADMIN_EMAIL`, `ADMIN_PASSWORD` y `CLIENT_URL` (pon un valor temporal; se corrige en el paso 6). `JWT_SECRET` se genera solo. El build crea las tablas y el administrador.
5. **Cloudflare Pages** (dash.cloudflare.com → *Workers & Pages → Create → Pages → Connect to Git*): directorio raíz `Frontend`, comando `npm run build`, salida `dist`. Variable `VITE_API_URL` = `https://<tu-servicio>.onrender.com/api`.
6. De vuelta en Render, cambia `CLIENT_URL` por la dirección de Pages (`https://<tu-proyecto>.pages.dev`) para que el navegador permita las peticiones y los enlaces de los correos apunten bien.

Cada `git push` a `main` vuelve a desplegar ambos automáticamente.

No hay datos de prueba: la base arranca vacía y todo el contenido se carga desde **/admin** (ingresa con la cuenta del seed).

1. **Estilos** → «Nuevo estilo»: textos ES/EN, paleta, colores del recorrido 3D, fotos y precio por m².
2. **Publicar propiedad**: fotos, precio, unidades, estado y estilo interior.

Mientras no haya estilos o propiedades publicadas, el inicio oculta esas secciones y el recorrido 3D usa una paleta neutra.

## Lo que hay

- **Residence 01 (inicio):** construcción procedural guiada por scroll (cimentación → nivel 1 → nivel 2 → rooftop), con HUD, riel de progreso, fichas técnicas, plano 2D por nivel y tres modos: Render, Plano y Wireframe.
- **Planos 3D (/recorrido):** la cámara entra al piso 7 de una torre, recorre sala y cocina y termina en vista de planta; el estilo interior recolorea los materiales en tiempo real.
- **Render 3D:** geometría con aristas redondeadas, texturas procedurales (duela, madera, concreto, mármol, tela, pasto), mobiliario detallado, árboles por racimos, sombras suaves y oclusión ambiental (N8AO). Todo en `Frontend/src/components/three/kit.jsx`, sin modelos externos.
- **Tema claro / oscuro** (la escena pasa de día a noche) e **idiomas ES / EN** (interfaz, catálogo y correos).
- **Navegación:** barra con enlaces de texto y punto lima en la sección activa; en celular, panel inferior deslizable. Menú de cuenta con iniciales.
- **Acceso (/acceso):** página propia con formulario y fotografía; Ingresar / Crear cuenta / Recuperar con código de 6 dígitos.
- **Proyectos, Estilos, Servicios** (cotizador), **Cuenta** (favoritos, solicitudes, perfil) y **Admin** (resumen, propiedades, estilos, solicitudes, usuarios).

## API (`/api`)

| Método | Ruta | Descripción |
| --- | --- | --- |
| POST | `/auth/register` · `/auth/login` | Registro / login (JWT) |
| GET/PATCH | `/auth/me` | Perfil (nombre, teléfono, idioma) |
| POST | `/auth/forgot-password` → `/auth/verify-code` → `/auth/reset-password` | Recuperación por código al correo + correo de confirmación |
| GET | `/properties` · `/properties/meta` · `/properties/:slug` | Catálogo con filtros |
| GET | `/styles` · `/styles/:slug` | Estilos de interiorismo |
| GET/POST | `/me/favorites` · `/me/favorites/toggle` | Favoritos |
| GET/POST | `/me/requests` · `/me/requests/:id/cancel` | Visitas y cotizaciones |
| * | `/admin/...` | stats, properties, styles, requests, users, uploads (rol ADMIN) |

Correos (bienvenida, código, contraseña actualizada, solicitud recibida) en `Backend/src/emails/templates.js`, en español e inglés. Sin SMTP configurado se usa Ethereal y la consola muestra el enlace de vista previa; `npm run email:preview` genera los HTML.

## Créditos
- Fotos: Unsplash (licencia libre). Detalle en [Frontend/public/img/CREDITS.md](Frontend/public/img/CREDITS.md).
- Las maquetas 3D son procedurales (Three.js), sin modelos externos.
