import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const sources = await prisma.sourceWebsite.createMany({
    data: [
      { code: "CIM",  name: "Chambre Immobilière Monégasque", baseUrl: "https://www.chambre-immobiliere-monaco.mc" },
      { code: "MCRE", name: "MonteCarlo Real Estate",         baseUrl: "https://www.montecarlo-realestate.com" }
    ],
    skipDuplicates: true
  });

  console.log("Inserted sources:", sources);
}

main().finally(() => prisma.$disconnect());
