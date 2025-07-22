import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1753105268253 implements MigrationInterface {
    name = 'Migration1753105268253'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "box_range" ADD "eventId" integer`);
        await queryRunner.query(`ALTER TABLE "box_range" ADD "createdAt" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "box_range" DROP COLUMN "priceRange"`);
        await queryRunner.query(`ALTER TABLE "box_range" ADD "priceRange" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "box_range" DROP COLUMN "boxType"`);
        await queryRunner.query(`ALTER TABLE "box_range" ADD "boxType" text NOT NULL`);
        await queryRunner.query(`ALTER TABLE "box_range" DROP COLUMN "gramPerBox"`);
        await queryRunner.query(`ALTER TABLE "box_range" ADD "gramPerBox" double precision NOT NULL`);
        await queryRunner.query(`ALTER TABLE "box_range" ADD CONSTRAINT "FK_667d00f0e65839f5cf174fe649c" FOREIGN KEY ("eventId") REFERENCES "event"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "box_range" DROP CONSTRAINT "FK_667d00f0e65839f5cf174fe649c"`);
        await queryRunner.query(`ALTER TABLE "box_range" DROP COLUMN "gramPerBox"`);
        await queryRunner.query(`ALTER TABLE "box_range" ADD "gramPerBox" integer`);
        await queryRunner.query(`ALTER TABLE "box_range" DROP COLUMN "boxType"`);
        await queryRunner.query(`ALTER TABLE "box_range" ADD "boxType" jsonb NOT NULL`);
        await queryRunner.query(`ALTER TABLE "box_range" DROP COLUMN "priceRange"`);
        await queryRunner.query(`ALTER TABLE "box_range" ADD "priceRange" character varying(255) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "box_range" DROP COLUMN "createdAt"`);
        await queryRunner.query(`ALTER TABLE "box_range" DROP COLUMN "eventId"`);
    }

}
