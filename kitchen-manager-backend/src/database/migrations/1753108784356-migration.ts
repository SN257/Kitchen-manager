import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1753108784356 implements MigrationInterface {
    name = 'Migration1753108784356'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "weight_calculation_entries" ("id" SERIAL NOT NULL, "entries" jsonb NOT NULL, "eventId" integer, CONSTRAINT "PK_7484506ca276603e46904d9195c" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "weight_calculation_entries" ADD CONSTRAINT "FK_f33d1569a77c734cb5b87b41d22" FOREIGN KEY ("eventId") REFERENCES "event"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "weight_calculation_entries" DROP CONSTRAINT "FK_f33d1569a77c734cb5b87b41d22"`);
        await queryRunner.query(`DROP TABLE "weight_calculation_entries"`);
    }

}
