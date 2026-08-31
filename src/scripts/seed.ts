import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { organizationSettings, organizations, reservedSlugs, templates, userProfiles, organizationMembers } from "@/lib/db/schema";
import { RESERVED_SLUGS } from "@/lib/constants";
import { TEMPLATE_CATALOG } from "@/modules/templates/definitions";
import { hashPassword } from "@/lib/auth/password";

async function main() {
  for (const slug of RESERVED_SLUGS) {
    await db.insert(reservedSlugs).values({ slugNormalized: slug, reason: "system_reserved" }).onConflictDoNothing();
  }

  for (const template of TEMPLATE_CATALOG) {
    await db
      .insert(templates)
      .values({
        code: template.code,
        name: template.name,
        description: template.description,
        schemaJson: { code: template.code },
        isActive: true,
      })
      .onConflictDoNothing();
  }

  const orgName = process.env.SEED_ORG_NAME || "광고사명미정";
  const [existingOrg] = await db.select().from(organizations).limit(1);
  const org =
    existingOrg ??
    (
      await db
        .insert(organizations)
        .values({ name: orgName, slug: "default", status: "ACTIVE" })
        .returning()
    )[0];

  await db
    .insert(organizationSettings)
    .values({ organizationId: org.id, brandName: process.env.APP_NAME || "브랜드명미정" })
    .onConflictDoNothing();

  const loginId = (process.env.SEED_ADMIN_LOGIN || process.env.SEED_ADMIN_EMAIL || "teamadit").trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD || "!adit1017";
  const name = process.env.SEED_ADMIN_NAME || "시스템 관리자";
  const passwordHash = await hashPassword(password);

  const [byLogin] = await db.select().from(userProfiles).where(eq(userProfiles.email, loginId)).limit(1);
  const [legacy] =
    loginId !== "admin@example.com"
      ? await db.select().from(userProfiles).where(eq(userProfiles.email, "admin@example.com")).limit(1)
      : [];
  const existingUser = byLogin ?? legacy;

  const user = existingUser
    ? (
        await db
          .update(userProfiles)
          .set({
            email: loginId,
            name,
            passwordHash,
            status: "ACTIVE",
            updatedAt: new Date(),
          })
          .where(eq(userProfiles.id, existingUser.id))
          .returning()
      )[0]
    : (
        await db
          .insert(userProfiles)
          .values({
            email: loginId,
            name,
            passwordHash,
            status: "ACTIVE",
          })
          .returning()
      )[0];

  await db
    .insert(organizationMembers)
    .values({
      organizationId: org.id,
      userId: user.id,
      role: "SYSTEM_ADMIN",
      status: "ACTIVE",
    })
    .onConflictDoNothing();

  await db
    .update(organizationMembers)
    .set({ role: "SYSTEM_ADMIN", status: "ACTIVE", updatedAt: new Date() })
    .where(eq(organizationMembers.userId, user.id));

  console.info("Seed complete");
  console.info(`Admin login: ${loginId}`);
}

main().then(() => process.exit(0)).catch((error) => {
  console.error(error);
  process.exit(1);
});
