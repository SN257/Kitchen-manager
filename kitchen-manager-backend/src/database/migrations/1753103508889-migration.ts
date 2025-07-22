import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1753103508889 implements MigrationInterface {
    name = 'Migration1753103508889'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "weight_entry" ADD "eventId" integer`);
        await queryRunner.query(`ALTER TABLE "weight_entry" ADD CONSTRAINT "FK_5b9e49664a5477da59fa1dabb10" FOREIGN KEY ("eventId") REFERENCES "event"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "weight_entry" DROP CONSTRAINT "FK_5b9e49664a5477da59fa1dabb10"`);
        await queryRunner.query(`ALTER TABLE "weight_entry" DROP COLUMN "eventId"`);
    }

}
