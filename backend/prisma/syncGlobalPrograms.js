import {
  GLOBAL_PROGRAM_NAMES,
  GLOBAL_PROGRAMS,
} from "../src/constants/firing.constants.js";

export async function syncGlobalPrograms(prismaClient) {
  const existing = await prismaClient.program.findMany({
    where: { userId: null },
    orderBy: { programId: "asc" },
  });
  const unexpected = existing.filter(
    ({ name }) => !GLOBAL_PROGRAM_NAMES.includes(name),
  );
  if (unexpected.length > 0) {
    throw new Error(
      `Programas globales inesperados: ${unexpected.map(({ name }) => name).join(", ")}`,
    );
  }

  for (const definition of GLOBAL_PROGRAMS) {
    const matches = existing.filter(({ name }) => name === definition.name);
    if (matches.length > 1) {
      throw new Error(`Programa global duplicado: ${definition.name}`);
    }
    if (matches.length === 1) {
      await prismaClient.program.update({
        where: { programId: matches[0].programId },
        data: {
          description: definition.description,
          configuration: definition.configuration,
        },
      });
      continue;
    }
    await prismaClient.program.create({
      data: { ...definition, userId: null },
    });
  }
}
