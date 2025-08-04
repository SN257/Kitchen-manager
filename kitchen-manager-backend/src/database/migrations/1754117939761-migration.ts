import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1754117939761 implements MigrationInterface {
    name = 'Migration1754117939761'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "weight_calculation_entry" ADD "eventId" integer NOT NULL`);
        await queryRunner.query(`ALTER TABLE "weight_calculation_entry" ADD "userId" integer NOT NULL`);
        await queryRunner.query(`ALTER TABLE "weight_calculation_entry" ADD "updatedAt" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "weight_calculation_entry" DROP COLUMN "entries"`);
        await queryRunner.query(`ALTER TABLE "weight_calculation_entry" ADD "entries" json NOT NULL`);
        await queryRunner.query(`ALTER TABLE "weight_calculation_entry" ADD CONSTRAINT "FK_288615072a71119708a4fb08f4f" FOREIGN KEY ("eventId") REFERENCES "event"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "weight_calculation_entry" DROP CONSTRAINT "FK_288615072a71119708a4fb08f4f"`);
        await queryRunner.query(`ALTER TABLE "weight_calculation_entry" DROP COLUMN "entries"`);
        await queryRunner.query(`ALTER TABLE "weight_calculation_entry" ADD "entries" jsonb NOT NULL`);
        await queryRunner.query(`ALTER TABLE "weight_calculation_entry" DROP COLUMN "updatedAt"`);
        await queryRunner.query(`ALTER TABLE "weight_calculation_entry" DROP COLUMN "userId"`);
        await queryRunner.query(`ALTER TABLE "weight_calculation_entry" DROP COLUMN "eventId"`);
    }

}
