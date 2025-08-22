import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration1754116681172 implements MigrationInterface {
  name = 'Migration1754116681172';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "box_weight_entry" ADD "userId" integer NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "box_weight_entry" DROP COLUMN "totalBoxes"`,
    );
    await queryRunner.query(
      `ALTER TABLE "box_weight_entry" ADD "totalBoxes" integer NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "box_weight_entry" DROP COLUMN "totalBoxes"`,
    );
    await queryRunner.query(
      `ALTER TABLE "box_weight_entry" ADD "totalBoxes" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "box_weight_entry" DROP COLUMN "userId"`,
    );
  }
}
