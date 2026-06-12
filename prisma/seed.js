const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log("Iniciando sembrado de la base de datos (Seeding)...");

  // Verificar si ya existen usuarios
  const userCount = await prisma.user.count();

  if (userCount === 0) {
    console.log("No se encontraron usuarios. Creando administrador por defecto...");
    
    // Hash de la contraseña "AlgodonAdmin2026"
    const hashedPassword = await bcrypt.hash("AlgodonAdmin2026", 10);

    const admin = await prisma.user.create({
      data: {
        name: "Administrador",
        email: "admin@algodon.xyz",
        password: hashedPassword,
        role: "ADMIN",
        color: "#FF7900", // Naranja corporativo
      },
    });

    console.log(`Usuario administrador creado con éxito: ${admin.email}`);
  } else {
    console.log(`La base de datos ya contiene ${userCount} usuario(s). Se omite la creación del usuario por defecto.`);
  }

  // Verificar si existen sub-estados por defecto
  const subStatusCount = await prisma.subStatus.count();
  if (subStatusCount === 0) {
    console.log("Creando sub-estados por defecto...");
    await prisma.subStatus.createMany({
      data: [
        { name: "Sin acceso a fachada", color: "#6b7280" },
        { name: "Caja rota/dañada", color: "#ef4444" },
        { name: "Sin señal/potencia", color: "#f59e0b" },
        { name: "Falta acometida", color: "#3b82f6" },
        { name: "Correcto", color: "#10b981" },
      ],
    });
    console.log("Sub-estados creados.");
  }
}

main()
  .catch((e) => {
    console.error("Error durante el sembrado de la base de datos:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
