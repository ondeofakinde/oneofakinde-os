import { migratePostgresPersistence } from "../lib/bff/persistence";

async function main(): Promise<void> {
  await migratePostgresPersistence();
  console.log("postgres migrations applied for bff persistence");
}

main().catch((error) => {
  console.error("failed to apply postgres migrations");
  console.error(error);
  process.exit(1);
});
