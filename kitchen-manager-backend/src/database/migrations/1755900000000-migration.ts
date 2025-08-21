import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration1755900000000 implements MigrationInterface {
  name = 'Migration1755900000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "vasan_fill_plan" ("id" SERIAL NOT NULL, "vasanId" integer NOT NULL, "eventId" integer, "foodName" character varying(200) NOT NULL, "fillWeightKg" double precision NOT NULL, "userId" integer NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_vasan_fill_plan" PRIMARY KEY ("id"))`);
    await queryRunner.query(`ALTER TABLE "vasan_fill_plan" ADD CONSTRAINT "FK_vasan_fill_plan_vasan" FOREIGN KEY ("vasanId") REFERENCES "vasan"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "vasan_fill_plan" ADD CONSTRAINT "FK_vasan_fill_plan_event" FOREIGN KEY ("eventId") REFERENCES "event"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "vasan_fill_plan" DROP CONSTRAINT "FK_vasan_fill_plan_event"`);
    await queryRunner.query(`ALTER TABLE "vasan_fill_plan" DROP CONSTRAINT "FK_vasan_fill_plan_vasan"`);
    await queryRunner.query(`DROP TABLE "vasan_fill_plan"`);
  }
}
