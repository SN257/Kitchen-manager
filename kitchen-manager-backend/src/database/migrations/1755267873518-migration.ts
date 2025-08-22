import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration1755267873518 implements MigrationInterface {
  name = 'Migration1755267873518';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "activity_logs" ("id" SERIAL NOT NULL, "userId" integer NOT NULL, "action" character varying NOT NULL, "details" text NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_f25287b6140c5ba18d38776a796" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "activity_logs" ADD CONSTRAINT "FK_597e6df96098895bf19d4b5ea45" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "activity_logs" DROP CONSTRAINT "FK_597e6df96098895bf19d4b5ea45"`,
    );
    await queryRunner.query(`DROP TABLE "activity_logs"`);
  }
}
