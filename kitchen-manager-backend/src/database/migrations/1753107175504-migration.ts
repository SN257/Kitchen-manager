import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1753107175504 implements MigrationInterface {
    name = 'Migration1753107175504'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "box_weight_entry" ADD "eventId" integer`);
        await queryRunner.query(`ALTER TABLE "box_weight_entry" ADD CONSTRAINT "FK_0c43bdfd0901de0ca5fd702afb5" FOREIGN KEY ("eventId") REFERENCES "event"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "box_weight_entry" DROP CONSTRAINT "FK_0c43bdfd0901de0ca5fd702afb5"`);
        await queryRunner.query(`ALTER TABLE "box_weight_entry" DROP COLUMN "eventId"`);
    }

}
