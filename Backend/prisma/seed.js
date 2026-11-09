import bcrypt from 'bcryptjs';
import 'dotenv/config';
import { prisma } from '../src/lib/prisma.js';

/*
 * Seed mínimo: solo crea (o asegura) la cuenta de administrador definida en .env.
 * Propiedades y estilos se cargan desde el panel de administración (/admin).
 */
async function main() {
  const email = (process.env.ADMIN_EMAIL || 'admin@hangar.studio').toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!password) throw new Error('Define ADMIN_PASSWORD en Backend/.env antes de correr el seed');
  // la contraseña se sincroniza en cada despliegue: la de ADMIN_PASSWORD siempre es la vigente
  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.upsert({
    where: { email },
    update: { role: 'ADMIN', passwordHash },
    create: { email, name: process.env.ADMIN_NAME || 'Administrador', role: 'ADMIN', passwordHash },
  });
  console.log(`✅ Administrador listo: ${email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
