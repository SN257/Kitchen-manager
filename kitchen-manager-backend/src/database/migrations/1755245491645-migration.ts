import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1755245491645 implements MigrationInterface {
    name = 'Migration1755245491645'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "sections" ADD "rows" integer NOT NULL`);
        await queryRunner.query(`ALTER TABLE "sections" ADD "columns" integer NOT NULL`);
        await queryRunner.query(`ALTER TABLE "sections" DROP COLUMN "sectionName"`);
        await queryRunner.query(`ALTER TABLE "sections" ADD "sectionName" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "sections" DROP COLUMN "description"`);
        await queryRunner.query(`ALTER TABLE "sections" ADD "description" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "sections" DROP COLUMN "description"`);
        await queryRunner.query(`ALTER TABLE "sections" ADD "description" text`);
        await queryRunner.query(`ALTER TABLE "sections" DROP COLUMN "sectionName"`);
        await queryRunner.query(`ALTER TABLE "sections" ADD "sectionName" character varying(255) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "sections" DROP COLUMN "columns"`);
        await queryRunner.query(`ALTER TABLE "sections" DROP COLUMN "rows"`);
    }

}
