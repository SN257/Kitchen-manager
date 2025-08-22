import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration1755800000000 implements MigrationInterface {
  name = 'Migration1755800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop old columns
    await queryRunner.query(
      `ALTER TABLE "vasan" DROP COLUMN IF EXISTS "foodName"`,
    );
    await queryRunner.query(
      `ALTER TABLE "vasan" DROP COLUMN IF EXISTS "totalWeight"`,
    );
    await queryRunner.query(
      `ALTER TABLE "vasan" DROP COLUMN IF EXISTS "totalVasan"`,
    );
    // Add description column
    await queryRunner.query(
      `ALTER TABLE "vasan" ADD COLUMN IF NOT EXISTS "description" character varying(500)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "vasan" DROP COLUMN IF EXISTS "description"`,
    );
    await queryRunner.query(
      `ALTER TABLE "vasan" ADD COLUMN "foodName" character varying NOT NULL DEFAULT ''`,
    );
    await queryRunner.query(
      `ALTER TABLE "vasan" ADD COLUMN "totalWeight" double precision NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE "vasan" ADD COLUMN "totalVasan" integer NOT NULL DEFAULT 0`,
    );
  }
}
