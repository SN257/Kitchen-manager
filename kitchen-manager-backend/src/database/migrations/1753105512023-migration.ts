import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1753105512023 implements MigrationInterface {
    name = 'Migration1753105512023'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "box_range" DROP COLUMN "createdAt"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "box_range" ADD "createdAt" TIMESTAMP NOT NULL DEFAULT now()`);
    }

}
