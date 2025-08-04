import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1754116126993 implements MigrationInterface {
    name = 'Migration1754116126993'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "box_range" ADD "userId" integer NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "box_range" DROP COLUMN "userId"`);
    }

}
