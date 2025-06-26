import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1750695474038 implements MigrationInterface {
    name = 'Migration1750695474038'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "box_range" ("id" SERIAL NOT NULL, "priceRange" character varying(255) NOT NULL, "boxType" character varying(255) NOT NULL, "gramPerBox" integer, CONSTRAINT "PK_9a0b18ca965e8fbd9fcff84a571" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "box_range"`);
    }

}
