import { MigrationInterface, QueryRunner } from 'typeorm';

export class AnnkutFoodSelectionDropGram1756300001000 implements MigrationInterface {
  name = 'AnnkutFoodSelectionDropGram1756300001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    try {
      await queryRunner.query(`ALTER TABLE "annkut_food_selection" DROP COLUMN "gram"`);
    } catch (e) {
      // Column may not exist in some environments
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    try {
      await queryRunner.query(`ALTER TABLE "annkut_food_selection" ADD "gram" double precision NOT NULL DEFAULT 0`);
    } catch (e) {
      // ignore
    }
  }
}
