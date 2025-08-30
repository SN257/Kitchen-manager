import { MigrationInterface, QueryRunner } from 'typeorm';

export class AnnkutFoodSelection1756300000000 implements MigrationInterface {
  name = 'AnnkutFoodSelection1756300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "annkut_food_selection" (
        "id" SERIAL NOT NULL,
        "foodItemId" integer,
        "vangiName" character varying NOT NULL,
        "gram" double precision NOT NULL,
        "eventId" integer,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "userId" integer NOT NULL,
        CONSTRAINT "PK_annkut_food_selection_id" PRIMARY KEY ("id")
      )`,
    );

    await queryRunner.query(
      `ALTER TABLE "annkut_food_selection" ADD CONSTRAINT "FK_annkut_food_selection_event" FOREIGN KEY ("eventId") REFERENCES "event"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );

    // foodItemId is optional and may not exist in all DBs; add FK if table exists
    try {
      await queryRunner.query(
        `ALTER TABLE "annkut_food_selection" ADD CONSTRAINT "FK_annkut_food_selection_fooditem" FOREIGN KEY ("foodItemId") REFERENCES "food_item"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
      );
    } catch (e) {
      // ignore if food_item table name differs in this DB; entity still works without FK
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    try {
      await queryRunner.query(
        `ALTER TABLE "annkut_food_selection" DROP CONSTRAINT "FK_annkut_food_selection_fooditem"`,
      );
    } catch {}
    await queryRunner.query(
      `ALTER TABLE "annkut_food_selection" DROP CONSTRAINT "FK_annkut_food_selection_event"`,
    );
    await queryRunner.query(`DROP TABLE "annkut_food_selection"`);
  }
}
