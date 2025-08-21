import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration1755700000000 implements MigrationInterface {
  name = 'Migration1755700000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "vasan_nos_calculation_entry" ("id" SERIAL NOT NULL, "eventId" integer NOT NULL, "userId" integer NOT NULL, "entries" json NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_vasan_nos_calc_entry" PRIMARY KEY ("id"))`);
    await queryRunner.query(`ALTER TABLE "vasan_nos_calculation_entry" ADD CONSTRAINT "FK_event_vasan_nos_calc" FOREIGN KEY ("eventId") REFERENCES "event"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "vasan_nos_calculation_entry" DROP CONSTRAINT "FK_event_vasan_nos_calc"`);
    await queryRunner.query(`DROP TABLE "vasan_nos_calculation_entry"`);
  }
}
