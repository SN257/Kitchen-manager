import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration1755600000000 implements MigrationInterface {
  name = 'Migration1755600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "vasan" ("id" SERIAL NOT NULL, "vasanName" character varying NOT NULL, "foodName" character varying NOT NULL, "totalWeight" double precision NOT NULL, "totalVasan" integer NOT NULL, "eventId" integer, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "userId" integer NOT NULL, CONSTRAINT "PK_9bc3c0fbd07a3a564f9f4b81108" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "vasan" ADD CONSTRAINT "FK_event_vasan" FOREIGN KEY ("eventId") REFERENCES "event"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "vasan" DROP CONSTRAINT "FK_event_vasan"`,
    );
    await queryRunner.query(`DROP TABLE "vasan"`);
  }
}
