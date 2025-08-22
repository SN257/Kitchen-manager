import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration1755240892029 implements MigrationInterface {
  name = 'Migration1755240892029';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "sections" ("id" SERIAL NOT NULL, "sectionName" character varying(255) NOT NULL, "description" text, "eventId" integer NOT NULL, "userId" integer NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_f9749dd3bffd880a497d007e450" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "sections" ADD CONSTRAINT "FK_41fbf19e3b5759039a22cb2e569" FOREIGN KEY ("eventId") REFERENCES "event"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "sections" DROP CONSTRAINT "FK_41fbf19e3b5759039a22cb2e569"`,
    );
    await queryRunner.query(`DROP TABLE "sections"`);
  }
}
